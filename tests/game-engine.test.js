const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');
const { NF_GameFactory: G, NF_QUIZ_BANK: BANK } =
  load(['js/data/quiz.js', 'js/game-engine.js'], ['NF_GameFactory', 'NF_QUIZ_BANK'], { module: { exports: {} } });

/* ─── Dựng môi trường giả ─── */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Mảng/đối tượng tạo trong vm khác prototype → so sánh qua JSON để deepStrictEqual không báo lệch giả
const plain = (x) => JSON.parse(JSON.stringify(x));
const deepEq = (a, b, m) => assert.deepStrictEqual(plain(a), plain(b), m);
const key = (d) => G.dateKey(d);
const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h, 0, 0);

function env(opts = {}) {
  let game = null;
  let clock = opts.now || at(2026, 9, 16);      // Thứ Tư
  const diary = {}, water = {};
  const profile = opts.profile === undefined ? { gender: 'male', age: 17, height: 170, weight: 60, tdee: 2000, waterMl: 2000 } : opts.profile;
  const awards = [];
  const storage = {
    getGame: () => game, saveGame: (s) => { game = JSON.parse(JSON.stringify(s)); },
    getProfile: () => profile, hasValidProfile: () => !!profile,
    getDiary: (d) => diary[d] || [], getWater: (d) => water[d] || 0,
  };
  const g = G.create({ storage, bank: opts.bank || BANK, now: () => clock, random: mulberry32(opts.seed || 7),
    onAward: (r) => awards.push(r), canUseAI: () => !!opts.ai, generateQuiz: opts.ai });
  // Ghi món như app thật: entry.createdAt = thời điểm ghi; ngày nhật ký có thể khác (bù ngày)
  const add = (dateKey, entry, createdAt) => {
    (diary[dateKey] = diary[dateKey] || []).push({ id: Math.random(), createdAt: (createdAt || clock).toISOString(), ...entry });
  };
  return { g, storage, diary, water, awards, add, setNow: (d) => { clock = d; }, state: () => game, profile };
}
const food = (over = {}) => ({ name: 'Món', calories: 300, tags: [], ...over });

/* ─── Ngày giờ ─── */
test('khóa tuần ISO-8601 (tuần bắt đầu thứ Hai)', () => {
  assert.strictEqual(G.isoWeekKey('2026-01-01'), '2026-W01');
  assert.strictEqual(G.isoWeekKey('2024-12-30'), '2025-W01');
  assert.strictEqual(G.isoWeekKey('2027-01-03'), '2026-W53');
  assert.strictEqual(G.isoWeekKey('2026-09-14'), '2026-W38'); // thứ Hai
  assert.strictEqual(G.isoWeekKey('2026-09-20'), '2026-W38'); // Chủ nhật vẫn thuộc tuần đó
  assert.strictEqual(G.isoWeekKey('2026-09-21'), '2026-W39');
});

/* ─── Điểm thưởng & giới hạn ─── */
test('tra cứu: +2/lần, tối đa 5 lần/ngày, cùng món chỉ tính 1 lần', () => {
  const { g } = env();
  g.award('lookup', { name: 'Cơm trắng' });
  g.award('lookup', { name: 'com trang' });           // trùng (khác dấu/hoa thường) → không tính
  assert.strictEqual(g._load().points, 2);
  for (let i = 0; i < 8; i++) g.award('lookup', { name: 'Món ' + i });
  assert.strictEqual(g._load().daily.lookups, 5);     // 6 lần tra cứu → chỉ 5 lần được cộng
  assert.strictEqual(g._load().points, 10);
});

test('nhật ký: +5/lần, tối đa 4 lần/ngày, chỉ khi ghi vào đúng ngày hôm nay', () => {
  const e = env();
  const today = key(at(2026, 9, 16));
  for (let i = 0; i < 6; i++) e.g.award('diary', { date: today });
  assert.strictEqual(e.g._load().points, 20);
  e.g.award('diary', { date: '2026-09-10' });          // ghi bù ngày cũ → không cộng
  assert.strictEqual(e.g._load().points, 20);
});

test('sang ngày mới: bộ đếm theo ngày được đặt lại', () => {
  const e = env();
  e.g.award('lookup', { name: 'a' });
  e.setNow(at(2026, 9, 17));
  e.g.award('lookup', { name: 'a' });                  // cùng món nhưng là ngày khác → tính lại
  assert.strictEqual(e.g._load().points, 4);
});

/* ─── Ngày ăn lành mạnh ─── */
test('ngày ăn lành mạnh: cần rau + trái cây + 80–110% TDEE, cộng đúng 1 lần', () => {
  const e = env();
  const t = key(at(2026, 9, 16));
  e.add(t, food({ name: 'Cơm', calories: 1000 }));
  e.add(t, food({ name: 'Rau muống', calories: 100, tags: ['veg'] }));
  e.g.award('healthyCheck');
  assert.strictEqual(e.g._load().points, 0, 'thiếu trái cây và chưa đủ kcal');
  e.add(t, food({ name: 'Chuối', calories: 600, tags: ['fruit'] }));     // 1700/2000 = 85%
  e.g.award('healthyCheck');
  assert.strictEqual(e.g._load().points, 10);
  e.g.award('healthyCheck'); e.g.award('sync');
  assert.strictEqual(e.g._load().points, 10, 'không cộng lặp');
  deepEq(e.g._load().healthyDates, [t]);
});

test('ngày ăn lành mạnh: quá thấp (<80%) hoặc quá cao (>110%) hoặc thiếu nhóm thì không được', () => {
  for (const [kcal, tags, ok] of [[1500, ['veg', 'fruit'], false], [2300, ['veg', 'fruit'], false], [1700, ['veg'], false], [2200, ['veg', 'fruit'], true], [1600, ['veg', 'fruit'], true]]) {
    const e = env();
    e.add(key(at(2026, 9, 16)), food({ calories: kcal, tags }));
    e.g.award('healthyCheck');
    assert.strictEqual(e.g._load().points === 10, ok, `${kcal} ${tags}`);
  }
});

/* ─── Streak ─── */
test('streak: chỉ tính món ghi ĐÚNG ngày; bù ngày cũ không tạo chuỗi', () => {
  const e = env();
  for (const d of [12, 13, 14, 15, 16]) e.add(key(at(2026, 9, d)), food(), at(2026, 9, d));
  assert.strictEqual(e.g.getSummary().streak, 5);
  // 7 ngày "bù" hôm nay cho các ngày trước đó nhưng createdAt là hôm nay → không tính
  const f = env();
  for (const d of [8, 9, 10, 11, 12, 13, 14, 15, 16]) f.add(key(at(2026, 9, d)), food(), at(2026, 9, 16));
  assert.strictEqual(f.g.getSummary().streak, 1);
});

test('streak: chưa ghi hôm nay mà hôm qua có ghi → chuỗi vẫn còn; bỏ lỡ 1 ngày → 0', () => {
  const e = env();
  e.add(key(at(2026, 9, 14)), food(), at(2026, 9, 14));
  e.add(key(at(2026, 9, 15)), food(), at(2026, 9, 15));
  deepEq([e.g.getSummary().streak, e.g.getSummary().todayLogged], [2, false]);
  e.setNow(at(2026, 9, 17));                            // bỏ lỡ ngày 16
  assert.strictEqual(e.g.getSummary().streak, 0);
});

test('huy hiệu "7 ngày liên tục" và "Người mới"', () => {
  const e = env();
  for (let d = 10; d <= 16; d++) e.add(key(at(2026, 9, d)), food(), at(2026, 9, d));
  e.g.award('sync');
  assert.ok(e.g._load().badges.includes('streak7'));
  assert.ok(e.g._load().badges.includes('rookie'));
  const n = env({ profile: null });
  n.g.award('sync');
  assert.ok(!n.g._load().badges.includes('rookie'));
});

test('huy hiệu "Ăn uống lành mạnh" sau đủ 3 ngày (tích lũy)', () => {
  const e = env();
  for (const d of [14, 15, 16]) {
    e.setNow(at(2026, 9, d));
    e.add(key(at(2026, 9, d)), food({ calories: 2000, tags: ['veg', 'fruit'] }), at(2026, 9, d));
    e.g.award('healthyCheck');
  }
  assert.ok(e.g._load().badges.includes('healthy3'));
  assert.strictEqual(e.g._load().points, 30);
});

/* ─── Thử thách tuần ─── */
test('thử thách tuần xoay vòng theo tuần, không cần nhớ tuần trước', () => {
  const e = env();
  const ids = [];
  for (const d of [14, 21, 28]) { e.setNow(at(2026, 9, d)); e.g.award('sync'); ids.push(e.g._load().weekly.challengeId); }
  assert.strictEqual(new Set(ids).size, 3);
  e.setNow(at(2026, 10, 5)); e.g.award('sync');
  assert.strictEqual(e.g._load().weekly.challengeId, ids[0]);   // vòng lặp 3 tuần: tuần 14/9 ≡ 5/10
});

test('thử thách "5 loại rau củ khác nhau": đếm tên món rau không trùng, +30 một lần', () => {
  const e = env();
  const monday = at(2026, 9, 14);
  // đảm bảo tuần này là thử thách rau
  let week = monday; while (true) { e.setNow(week); e.g.award('sync'); if (e.g._load().weekly.challengeId === 'veg5') break; week = at(2026, 9, week.getDate() + 7); }
  const mk = (d) => { const dd = new Date(week); dd.setDate(week.getDate() + d); return dd; };
  ['Rau muống', 'Cải xanh', 'Cà rốt', 'rau muống', 'Rau  MUỐNG'].forEach((n, i) => { e.setNow(mk(i % 3)); e.add(key(mk(i % 3)), food({ name: n, tags: ['veg'] }), mk(i % 3)); });
  e.setNow(mk(3)); e.g.award('sync');
  assert.strictEqual(e.g.getSummary().weekly.progress, 3, 'trùng tên không tính');
  ['Bắp cải', 'Cà chua'].forEach((n) => { e.add(key(mk(3)), food({ name: n, tags: ['veg'] }), mk(3)); });
  const before = e.g._load().points;
  e.g.award('sync');
  assert.strictEqual(e.g._load().weekly.done, true);
  assert.strictEqual(e.g._load().points - before, 30);
  e.g.award('sync');
  assert.strictEqual(e.g._load().points - before, 30, 'chỉ 1 lần/tuần');
});

/* ─── Câu đố ─── */
test('ngân hàng câu đố: ≥ 30 câu, hợp lệ, id không trùng, không câu nào trùng nội dung', () => {
  assert.ok(BANK.length >= 30);
  const clean = BANK.map((q) => G.sanitizeQuestion(q, 'bank'));
  assert.ok(clean.every(Boolean));
  assert.strictEqual(new Set(BANK.map((q) => q.id)).size, BANK.length);
  assert.strictEqual(new Set(BANK.map((q) => G.norm(q.q))).size, BANK.length);
});

test('bộ 5 câu hôm nay được lưu: tải lại không đổi câu; không thể trả lời lại', async () => {
  const e = env();
  const a = await e.g.ensureDailyQuiz();
  const b = await e.g.ensureDailyQuiz();
  deepEq(a.questions.map((q) => q.id), b.questions.map((q) => q.id));
  assert.strictEqual(a.questions.length, 5);
  const r0 = e.g.answerQuestion(0, a.questions[0].answer);
  assert.strictEqual(r0.correct, true);
  assert.throws(() => e.g.answerQuestion(0, 0), /OUT_OF_ORDER/, 'không trả lời lại câu đã làm');
  assert.strictEqual(e.g.getQuiz().answers.length, 1);
});

test('điểm câu đố: +10/câu đúng, chỉ lượt đầu trong ngày; đúng 5/5 → huy hiệu Nhà thông thái', async () => {
  const e = env();
  const q = await e.g.ensureDailyQuiz();
  q.questions.forEach((x, i) => e.g.answerQuestion(i, x.answer));
  assert.strictEqual(e.g._load().points, 50);
  assert.ok(e.g._load().badges.includes('sage'));
  assert.throws(() => e.g.answerQuestion(0, 0), /QUIZ_NOT_ACTIVE/);
  const p1 = e.g.practiceSet();                        // "Chơi thêm": không lưu, không điểm
  assert.strictEqual(p1.length, 5);
  assert.strictEqual(e.g._load().points, 50);
  const todayIds = new Set(q.questions.map((x) => x.id));
  assert.ok(p1.every((x) => !todayIds.has(x.id)), 'không trùng bộ hôm nay');
});

test('sai câu nào thì không được điểm câu đó; không có huy hiệu khi < 5/5', async () => {
  const e = env();
  const q = await e.g.ensureDailyQuiz();
  q.questions.forEach((x, i) => e.g.answerQuestion(i, i < 3 ? x.answer : (x.answer + 1) % 4));
  assert.strictEqual(e.g._load().points, 30);
  assert.ok(!e.g._load().badges.includes('sage'));
});

test('mỗi ngày bộ câu mới, không trùng các ngày gần đây', async () => {
  const e = env();
  const seen = [];
  for (let d = 0; d < 8; d++) {
    e.setNow(at(2026, 9, 16 + d));
    const q = await e.g.ensureDailyQuiz();
    seen.push(q.questions.map((x) => x.id));
  }
  // 8 ngày × 5 = 40 câu, ngân hàng 45 câu và cửa sổ tránh lặp 25 → 5 ngày liền không được trùng nhau
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < Math.min(seen.length, i + 5); j++) {
    assert.strictEqual(seen[i].filter((id) => seen[j].includes(id)).length, 0, `ngày ${i} và ${j} trùng câu`);
  }
});

test('đáp án đúng luôn khớp sau khi xáo thứ tự (không lệch chỉ số)', () => {
  const src = BANK[0];
  const correctText = src.options[src.answer];
  for (let s = 1; s < 50; s++) {
    const sh = G.shuffleOptions(G.sanitizeQuestion(src, 'bank'), mulberry32(s));
    assert.strictEqual(sh.options[sh.answer], correctText);
  }
});

test('câu do AI: hợp lệ thì dùng, sai cấu trúc bị loại, thiếu thì bù từ ngân hàng', async () => {
  const good = (i) => ({ q: `Câu AI số ${i}?`, options: ['a' + i, 'b' + i, 'c' + i, 'd' + i], answer: i % 4, explain: 'ok' });
  const bad = [
    null, 'x', { q: '', options: ['a', 'b', 'c', 'd'], answer: 0 },
    { q: 'thiếu đáp án', options: ['a', 'b', 'c'], answer: 0 },
    { q: 'đáp án ngoài khoảng', options: ['a', 'b', 'c', 'd'], answer: 4 },
    { q: 'đáp án không nguyên', options: ['a', 'b', 'c', 'd'], answer: 1.5 },
    { q: 'đáp án trùng', options: ['a', 'a', 'c', 'd'], answer: 0 },
    { q: 'chuỗi dài'.repeat(50), options: ['a', 'b', 'c', 'd'], answer: 0 },
  ];
  const e = env({ ai: async () => [...bad, good(1), good(2), good(2)] });   // 2 câu hợp lệ (1 câu trùng)
  const q = await e.g.ensureDailyQuiz();
  assert.strictEqual(q.questions.length, 5);
  assert.strictEqual(q.questions.filter((x) => x.origin === 'ai').length, 2);
  q.questions.forEach((x) => assert.ok(x.answer >= 0 && x.answer <= 3));

  const f = env({ ai: async () => { throw new Error('quota'); } });          // AI lỗi → toàn bộ từ ngân hàng
  const q2 = await f.g.ensureDailyQuiz();
  assert.strictEqual(q2.questions.length, 5);
  assert.ok(q2.questions.every((x) => x.origin === 'bank'));
});

test('sanitizeState chịu được dữ liệu hỏng / bị sửa tay / backup lạ', () => {
  const junk = G.sanitizeState({ points: 'abc', badges: ['sage', 'hack', 5], streak: -9, healthyDates: ['x', '2026-09-01'], quiz: { date: '2026-09-16', questions: [1, 2] },
    weekly: { weekKey: 'zzz', challengeId: 'nope' }, daily: { date: 'bad' } });
  assert.strictEqual(junk.points, 0);
  deepEq(junk.badges, ['sage']);
  assert.strictEqual(junk.streak, 0);
  deepEq(junk.healthyDates, ['2026-09-01']);
  assert.strictEqual(junk.quiz.questions.length, 0);
  assert.strictEqual(G.sanitizeState(null).schemaVersion, 1);
  assert.strictEqual(G.sanitizeState({ points: 1e12 }).points, 1000000);
});

test('xuất rồi nhập lại: điểm, huy hiệu, câu đố còn nguyên', async () => {
  const e = env();
  const q = await e.g.ensureDailyQuiz();
  q.questions.forEach((x, i) => e.g.answerQuestion(i, x.answer));
  const exported = JSON.parse(JSON.stringify(e.state()));            // như exportAll() → JSON → importData()
  const f = env();
  f.storage.saveGame(exported);
  assert.strictEqual(f.g._load().points, 50);
  assert.ok(f.g._load().badges.includes('sage'));
  assert.strictEqual(f.g.getQuiz().done, true);
});
