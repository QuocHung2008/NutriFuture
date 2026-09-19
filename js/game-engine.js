/**
 * NutriFuture — NF_Game: engine "Học mà chơi" (điểm, huy hiệu, chuỗi ngày, thử thách tuần, câu đố).
 *
 * Nguyên tắc thiết kế (dữ liệu nằm hoàn toàn trên máy → chống "cày điểm" ở mức hợp lý, không phải chống gian lận):
 *  - Logic thuần, tách khỏi giao diện; phụ thuộc (kho dữ liệu, đồng hồ, random, AI) được truyền vào để kiểm thử.
 *  - Streak / thử thách tuần / "ngày ăn lành mạnh" được TÍNH LẠI từ nhật ký thật (idempotent) thay vì cộng dồn bằng
 *    bộ đếm → nhập/xuất backup, xóa rồi thêm món, tải lại trang đều không làm sai điểm.
 *  - Chỉ món được ghi ĐÚNG NGÀY (createdAt cùng ngày với ngày của nhật ký) mới tính cho streak/thử thách →
 *    không thể "bù" 7 ngày liên tục bằng cách thêm món vào các ngày đã qua.
 *  - Mọi thứ đọc từ localStorage/AI đều được sanitize.
 */
const NF_GameFactory = (() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const QUIZ_SIZE = 5;
  const RECENT_WINDOW = 25;          // số câu gần nhất không được lặp lại (bank cần lớn hơn đáng kể)
  const QUIZ_USE_AI = true;          // false = chỉ dùng ngân hàng câu hỏi đã kiểm duyệt
  const POINTS = { lookup: 2, diary: 5, healthy: 10, weekly: 30, quiz: 10 };
  const CAPS = { lookup: 5, diary: 4 };
  const HEALTHY_BAND = { min: 0.8, max: 1.1 }; // 80–110% TDEE

  // Cấp độ suy ra thuần túy từ điểm tích lũy (không lưu riêng → luôn nhất quán, không thể lệch trạng thái).
  // tier quyết định mức độ trang trí/hiệu ứng hiển thị ở giao diện (xem CSS .level-badge[data-tier]).
  const LEVELS = [
    { level: 1, minPoints: 0,    name: 'Người mới',       icon: 'fa-seedling',        color: 'green',  tier: 'starter' },
    { level: 2, minPoints: 60,   name: 'Học viên chăm chỉ', icon: 'fa-leaf',           color: 'sky',    tier: 'starter' },
    { level: 3, minPoints: 150,  name: 'Người theo dõi',   icon: 'fa-fire',            color: 'amber',  tier: 'rising' },
    { level: 4, minPoints: 300,  name: 'Chuyên gia nhí',   icon: 'fa-star',            color: 'primary',tier: 'rising' },
    { level: 5, minPoints: 500,  name: 'Cao thủ dinh dưỡng', icon: 'fa-medal',         color: 'rose',   tier: 'elite' },
    { level: 6, minPoints: 800,  name: 'Bậc thầy sức khỏe', icon: 'fa-crown',          color: 'purple', tier: 'elite' },
    { level: 7, minPoints: 1200, name: 'Huyền thoại NutriFuture', icon: 'fa-trophy',   color: 'gold',   tier: 'legend' },
  ];

  /** Tính thông tin cấp độ hiện tại + tiến độ tới cấp kế tiếp từ tổng điểm (hàm thuần, dễ test). */
  function getLevelInfo(points) {
    const p = Math.max(0, Number(points) || 0);
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) { if (p >= LEVELS[i].minPoints) idx = i; }
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    const span = next ? next.minPoints - cur.minPoints : 1;
    const into = next ? p - cur.minPoints : 1;
    return {
      ...cur,
      points: p,
      nextMinPoints: next ? next.minPoints : null,
      nextName: next ? next.name : null,
      pointsToNext: next ? next.minPoints - p : 0,
      progressPct: next ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 100,
      isMax: !next,
    };
  }

  const BADGES = {
    rookie: { id: 'rookie', name: 'Người mới', icon: 'fa-seedling', desc: 'Hoàn tất hồ sơ cá nhân' },
    healthy3: { id: 'healthy3', name: 'Ăn uống lành mạnh', icon: 'fa-apple-whole', desc: 'Đủ 3 ngày ăn lành mạnh' },
    streak7: { id: 'streak7', name: '7 ngày liên tục', icon: 'fa-fire', desc: 'Ghi nhật ký 7 ngày liên tiếp' },
    sage: { id: 'sage', name: 'Nhà thông thái', icon: 'fa-graduation-cap', desc: 'Đúng 5/5 câu đố trong lượt tính điểm' },
  };

  const WEEKLY = [
    { id: 'veg5', title: 'Ăn 5 loại rau củ khác nhau', target: 5, unit: 'loại', kind: 'distinctVeg' },
    { id: 'log5', title: 'Ghi nhật ký 5 ngày', target: 5, unit: 'ngày', kind: 'logDays' },
    { id: 'water5', title: 'Uống đủ nước 5 ngày', target: 5, unit: 'ngày', kind: 'waterDays' },
  ];

  /* ─── Ngày giờ (theo giờ địa phương) ─── */

  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function mondayOf(k) { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }

  /** Khóa tuần ISO-8601 dạng YYYY-Www (tuần bắt đầu thứ Hai). */
  function isoWeekKey(k) {
    const d = parseKey(k);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // thứ Năm của tuần này
    const week1 = new Date(d.getFullYear(), 0, 4);
    const wk = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${pad(wk)}`;
  }

  /** Chỉ số tuần tăng dần (dùng để xoay vòng thử thách một cách xác định, không cần lưu "thử thách trước"). */
  function weekIndex(k) {
    return Math.round((mondayOf(k) - new Date(2024, 0, 1)) / (7 * 86400000));
  }

  const weekDays = (k) => { const m = dateKey(mondayOf(k)); return Array.from({ length: 7 }, (_, i) => addDays(m, i)); };

  /* ─── Tiện ích chuỗi ─── */

  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || 0));

  /* ─── Câu hỏi: kiểm tra, làm sạch, xáo đáp án ─── */

  /** Trả về câu hỏi đã làm sạch hoặc null nếu không hợp lệ (dùng cho cả ngân hàng lẫn câu do AI sinh). */
  function sanitizeQuestion(raw, origin) {
    if (!raw || typeof raw !== 'object') return null;
    const q = typeof raw.q === 'string' ? raw.q.trim() : '';
    if (!q || q.length > 220) return null;
    if (!Array.isArray(raw.options) || raw.options.length !== 4) return null;
    const options = raw.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
    if (options.some((o) => !o || o.length > 140)) return null;
    if (new Set(options.map(norm)).size !== 4) return null;        // đáp án trùng nhau
    const answer = Number(raw.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
    const explain = typeof raw.explain === 'string' ? raw.explain.trim().slice(0, 400) : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 60) : `ai-${hash(norm(q))}`,
      q, options, answer, explain,
      origin: origin === 'ai' ? 'ai' : 'bank',
    };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Xáo thứ tự đáp án và tính lại chỉ số đáp án đúng (tránh thiên lệch vị trí đáp án của AI/ngân hàng). */
  function shuffleOptions(item, rng) {
    const order = shuffle([0, 1, 2, 3], rng);
    return { ...item, options: order.map((i) => item.options[i]), answer: order.indexOf(item.answer) };
  }

  /**
   * Chọn `count` câu cho 1 lượt: ưu tiên câu do AI sinh (đã hợp lệ, không trùng), thiếu thì bù từ ngân hàng
   * (không nằm trong recentIds; nếu ngân hàng cạn thì lấy các câu cũ nhất). Luôn trả đủ `count` nếu ngân hàng đủ.
   */
  function composeQuestions({ aiRaw = [], bank = [], recentIds = [], exclude = [], count = QUIZ_SIZE, rng = Math.random }) {
    const banned = new Set([...recentIds, ...exclude]);
    const picked = [];
    const seen = new Set();
    const take = (item) => {
      if (!item || picked.length >= count || seen.has(item.id) || seen.has(norm(item.q))) return;
      seen.add(item.id); seen.add(norm(item.q));
      picked.push(shuffleOptions(item, rng));
    };

    (Array.isArray(aiRaw) ? aiRaw : []).forEach((r) => {
      const item = sanitizeQuestion(r, 'ai');
      if (item && !banned.has(item.id)) take(item);
    });

    const cleanBank = bank.map((r) => sanitizeQuestion(r, 'bank')).filter(Boolean);
    const fresh = shuffle(cleanBank.filter((b) => !banned.has(b.id)), rng);
    fresh.forEach(take);
    if (picked.length < count) {
      // Ngân hàng cạn: lấy các câu ít mới nhất (đứng đầu recentIds = cũ nhất) nhưng vẫn loại câu đang loại trừ
      const oldest = recentIds.map((id) => cleanBank.find((b) => b.id === id)).filter(Boolean)
        .filter((b) => !exclude.includes(b.id));
      oldest.forEach(take);
    }
    return picked;
  }

  /* ─── Trạng thái ─── */

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      points: 0,
      badges: [],
      streak: 0,
      bestStreak: 0,
      healthyDates: [],
      quiz: { date: '', questions: [], answers: [], score: 0, awarded: false, recentIds: [], recentTexts: [] },
      weekly: { weekKey: '', challengeId: '', progress: 0, done: false },
      daily: { date: '', lookups: 0, lookedUp: [], diary: 0, healthyAwarded: false },
    };
  }

  /** Làm sạch trạng thái đọc từ localStorage/backup (có thể bị sửa tay hoặc hỏng). */
  function sanitizeState(raw) {
    const st = emptyState();
    if (!raw || typeof raw !== 'object') return st;
    st.points = clampInt(raw.points, 0, 1000000);
    st.badges = [...new Set((Array.isArray(raw.badges) ? raw.badges : []).filter((b) => BADGES[b]))];
    st.streak = clampInt(raw.streak, 0, 4000);
    st.bestStreak = clampInt(raw.bestStreak, 0, 4000);
    st.healthyDates = [...new Set((Array.isArray(raw.healthyDates) ? raw.healthyDates : []).filter(isKey))].sort().slice(-400);

    const q = raw.quiz || {};
    if (isKey(q.date)) {
      const questions = (Array.isArray(q.questions) ? q.questions : [])
        .map((x) => sanitizeQuestion(x, x && x.origin)).filter(Boolean).slice(0, QUIZ_SIZE);
      if (questions.length === QUIZ_SIZE) {
        st.quiz.date = q.date;
        st.quiz.questions = questions;
        st.quiz.answers = (Array.isArray(q.answers) ? q.answers : []).slice(0, QUIZ_SIZE)
          .map((a) => clampInt(a, 0, 3));
        st.quiz.score = st.quiz.answers.reduce((n, a, i) => n + (a === questions[i].answer ? 1 : 0), 0);
        st.quiz.awarded = st.quiz.answers.length === QUIZ_SIZE;
      }
    }
    st.quiz.recentIds = (Array.isArray(q.recentIds) ? q.recentIds : []).filter((x) => typeof x === 'string')
      .map((x) => x.slice(0, 60)).slice(-RECENT_WINDOW);
    st.quiz.recentTexts = (Array.isArray(q.recentTexts) ? q.recentTexts : []).filter((x) => typeof x === 'string')
      .map((x) => x.slice(0, 90)).slice(-15);

    const w = raw.weekly || {};
    if (typeof w.weekKey === 'string' && /^\d{4}-W\d{2}$/.test(w.weekKey) && WEEKLY.some((c) => c.id === w.challengeId)) {
      st.weekly = { weekKey: w.weekKey, challengeId: w.challengeId, progress: clampInt(w.progress, 0, 100), done: !!w.done };
    }

    const d = raw.daily || {};
    if (isKey(d.date)) {
      st.daily = {
        date: d.date,
        lookups: clampInt(d.lookups, 0, CAPS.lookup),
        lookedUp: (Array.isArray(d.lookedUp) ? d.lookedUp : []).filter((x) => typeof x === 'string').slice(0, CAPS.lookup),
        diary: clampInt(d.diary, 0, CAPS.diary),
        healthyAwarded: !!d.healthyAwarded,
      };
    }
    return st;
  }

  /* ─── Nhà máy: gắn với kho dữ liệu / đồng hồ / AI cụ thể ─── */

  function create(deps) {
    const storage = deps.storage;
    const now = deps.now || (() => new Date());
    const rng = deps.random || Math.random;
    const bank = deps.bank || [];
    const today = () => dateKey(now());

    let quizPromise = null;

    function load() { return sanitizeState(storage.getGame()); }
    function save(st) { storage.saveGame(st); }

    /** Qua ngày/tuần mới thì đặt lại phần theo ngày/tuần (thử thách tuần được chọn xoay vòng xác định). */
    function rollover(st, t) {
      if (st.daily.date !== t) st.daily = { date: t, lookups: 0, lookedUp: [], diary: 0, healthyAwarded: false };
      const wk = isoWeekKey(t);
      if (st.weekly.weekKey !== wk) {
        st.weekly = { weekKey: wk, challengeId: WEEKLY[((weekIndex(t) % 3) + 3) % 3].id, progress: 0, done: false };
      }
      return st;
    }

    const isSameDayLogged = (entry, key) => {
      if (!entry.createdAt) return true; // dữ liệu cũ chưa có createdAt
      const c = new Date(entry.createdAt);
      return !isNaN(c) && dateKey(c) === key;
    };
    const genuineEntries = (key) => (storage.getDiary(key) || []).filter((e) => isSameDayLogged(e, key));
    const hasLog = (key) => genuineEntries(key).length > 0;

    /** Chuỗi ngày ghi nhật ký (đúng ngày). Chưa ghi hôm nay mà hôm qua có ghi → chuỗi vẫn còn, tính đến hôm qua. */
    function computeStreak(t) {
      let cursor = t;
      const todayLogged = hasLog(cursor);
      if (!todayLogged) cursor = addDays(cursor, -1);
      let n = 0;
      while (n < 400 && hasLog(cursor)) { n++; cursor = addDays(cursor, -1); }
      return { streak: n, todayLogged };
    }

    function isHealthyDay(entries, tdee) {
      if (!(tdee > 0)) return false;
      const total = entries.reduce((s, e) => s + (Number(e.calories) || 0), 0);
      const ratio = total / tdee;
      const has = (tag) => entries.some((e) => Array.isArray(e.tags) && e.tags.includes(tag));
      return ratio >= HEALTHY_BAND.min && ratio <= HEALTHY_BAND.max && has('veg') && has('fruit');
    }

    function waterTarget() {
      const p = storage.getProfile() || {};
      return Number(p.waterMl) || (Number(p.waterTarget) ? Number(p.waterTarget) * 1000 : 0);
    }

    function weeklyProgress(challenge, t) {
      const days = weekDays(t);
      if (challenge.kind === 'distinctVeg') {
        const names = new Set();
        days.forEach((k) => genuineEntries(k).forEach((e) => {
          if (Array.isArray(e.tags) && e.tags.includes('veg')) names.add(norm(e.name));
        }));
        names.delete('');
        return names.size;
      }
      if (challenge.kind === 'logDays') return days.filter(hasLog).length;
      if (challenge.kind === 'waterDays') {
        const target = waterTarget();
        return target > 0 ? days.filter((k) => storage.getWater(k) >= target).length : 0;
      }
      return 0;
    }

    /* Ghi điểm + nhãn hiển thị */
    function gain(res, st, points, label) {
      st.points = Math.min(1000000, st.points + points);
      res.points += points;
      if (label) res.labels.push(label);
    }
    function grantBadge(res, st, id) {
      if (st.badges.includes(id)) return;
      st.badges.push(id);
      res.badges.push(id);
    }

    /** Đánh giá lại mọi thứ suy ra được từ dữ liệu thật — an toàn khi gọi lặp lại nhiều lần. */
    function evaluate(st, res, t) {
      // Ngày ăn lành mạnh (chỉ xét hôm nay, cộng 1 lần/ngày)
      if (!st.daily.healthyAwarded) {
        const p = storage.getProfile() || {};
        if (isHealthyDay(storage.getDiary(t) || [], Number(p.tdee))) {
          st.daily.healthyAwarded = true;
          if (!st.healthyDates.includes(t)) st.healthyDates.push(t);
          st.healthyDates = st.healthyDates.sort().slice(-400);
          gain(res, st, POINTS.healthy, 'Ngày ăn lành mạnh');
        }
      }

      // Thử thách tuần
      const ch = WEEKLY.find((c) => c.id === st.weekly.challengeId);
      if (ch) {
        st.weekly.progress = Math.min(ch.target, weeklyProgress(ch, t));
        if (!st.weekly.done && st.weekly.progress >= ch.target) {
          st.weekly.done = true;
          gain(res, st, POINTS.weekly, 'Hoàn thành thử thách tuần');
        }
      }

      // Chuỗi ngày
      const { streak } = computeStreak(t);
      st.streak = streak;
      st.bestStreak = Math.max(st.bestStreak, streak);

      // Huy hiệu
      if (storage.hasValidProfile()) grantBadge(res, st, 'rookie');
      if (st.healthyDates.length >= 3) grantBadge(res, st, 'healthy3');
      if (st.bestStreak >= 7) grantBadge(res, st, 'streak7');
    }

    const newResult = () => ({ points: 0, labels: [], badges: [] });

    function finish(res) {
      if (typeof deps.onAward === 'function' && (res.points || res.badges.length)) deps.onAward(res);
      return res;
    }

    /**
     * Cộng điểm cho 1 hoạt động rồi đánh giá lại các mục suy ra được.
     *   'lookup'  payload {name}  — +2, tối đa 5 lần/ngày, mỗi món tính 1 lần/ngày
     *   'diary'   payload {date}  — +5, tối đa 4 lần/ngày, chỉ khi ghi vào ĐÚNG ngày hôm nay
     *   'healthyCheck' | 'sync'   — chỉ đánh giá lại (sau khi xóa món, đổi hồ sơ, uống nước...)
     */
    function award(kind, payload = {}) {
      const t = today();
      const st = rollover(load(), t);
      const res = newResult();

      if (kind === 'lookup') {
        const key = norm(payload.name);
        if (key && st.daily.lookups < CAPS.lookup && !st.daily.lookedUp.includes(key)) {
          st.daily.lookups++;
          st.daily.lookedUp.push(key);
          gain(res, st, POINTS.lookup, 'Tra cứu');
        }
      } else if (kind === 'diary') {
        if (payload.date === t && st.daily.diary < CAPS.diary) {
          st.daily.diary++;
          gain(res, st, POINTS.diary, 'Ghi nhật ký');
        }
      }

      evaluate(st, res, t);
      save(st);
      return finish(res);
    }

    /* ─── Tóm tắt (chỉ đọc) ─── */

    function getSummary() {
      const t = today();
      const st = rollover(load(), t);
      const { streak, todayLogged } = computeStreak(t);
      const ch = WEEKLY.find((c) => c.id === st.weekly.challengeId) || WEEKLY[0];
      const progress = Math.min(ch.target, weeklyProgress(ch, t));
      return {
        points: st.points,
        level: getLevelInfo(st.points),
        streak,
        todayLogged,
        badges: st.badges.slice(),
        weekly: { challenge: ch, progress, done: st.weekly.done || progress >= ch.target, weekKey: st.weekly.weekKey },
        daily: { ...st.daily },
        quizDoneToday: st.quiz.date === t && st.quiz.awarded,
      };
    }

    /* ─── Câu đố ─── */

    function quizView(st, t) {
      const q = st.quiz;
      const has = q.date === t && q.questions.length === QUIZ_SIZE;
      return {
        ready: has,
        questions: has ? q.questions : [],
        answers: has ? q.answers : [],
        score: has ? q.score : 0,
        done: has && q.answers.length === QUIZ_SIZE,
        awarded: has && q.awarded,
      };
    }

    function getQuiz() { return quizView(load(), today()); }

    function startQuiz(questions) {
      const t = today();
      const st = rollover(load(), t);
      const clean = (questions || []).map((x) => sanitizeQuestion(x, x && x.origin)).filter(Boolean);
      if (clean.length !== QUIZ_SIZE) throw new Error('QUIZ_INVALID');
      st.quiz.date = t;
      st.quiz.questions = clean;
      st.quiz.answers = [];
      st.quiz.score = 0;
      st.quiz.awarded = false;
      st.quiz.recentIds = [...st.quiz.recentIds, ...clean.map((c) => c.id)].slice(-RECENT_WINDOW);
      st.quiz.recentTexts = [...st.quiz.recentTexts, ...clean.map((c) => c.q.slice(0, 90))].slice(-15);
      save(st);
      return quizView(st, t);
    }

    /**
     * Tạo bộ 5 câu của hôm nay (1 lần/ngày, lưu lại → tải lại trang không đổi câu).
     * Có AI + key: thử để AI sinh câu mới; lỗi/thiếu key/không đủ hợp lệ → bù từ ngân hàng.
     */
    function ensureDailyQuiz() {
      const t = today();
      const cur = quizView(load(), t);
      if (cur.ready) return Promise.resolve(cur);
      if (quizPromise) return quizPromise;

      quizPromise = (async () => {
        const st = load();
        let aiRaw = [];
        if (QUIZ_USE_AI && typeof deps.generateQuiz === 'function' && deps.canUseAI && deps.canUseAI()) {
          try { aiRaw = await deps.generateQuiz(QUIZ_SIZE, { avoid: st.quiz.recentTexts }); } catch (e) { aiRaw = []; }
        }
        const questions = composeQuestions({ aiRaw, bank, recentIds: st.quiz.recentIds, count: QUIZ_SIZE, rng });
        return startQuiz(questions);
      })().finally(() => { quizPromise = null; });

      return quizPromise;
    }

    /** Bộ câu luyện tập ("Chơi thêm"): không lưu, không cộng điểm, không trùng bộ hôm nay. */
    function practiceSet() {
      const st = load();
      const todayIds = quizView(st, today()).questions.map((q) => q.id);
      return composeQuestions({ bank, recentIds: [], exclude: todayIds, count: QUIZ_SIZE, rng });
    }

    /** Trả lời câu tiếp theo của lượt tính điểm hôm nay. Mỗi câu chỉ trả lời 1 lần (lưu ngay, tải lại không đổi được). */
    function answerQuestion(index, choice) {
      const t = today();
      const st = rollover(load(), t);
      const view = quizView(st, t);
      if (!view.ready || view.done) throw new Error('QUIZ_NOT_ACTIVE');
      if (index !== st.quiz.answers.length) throw new Error('QUIZ_OUT_OF_ORDER');
      const c = Number(choice);
      if (!Number.isInteger(c) || c < 0 || c > 3) throw new Error('QUIZ_BAD_CHOICE');

      const q = st.quiz.questions[index];
      const correct = c === q.answer;
      const res = newResult();
      st.quiz.answers.push(c);
      if (correct) { st.quiz.score++; gain(res, st, POINTS.quiz, null); }

      const done = st.quiz.answers.length === QUIZ_SIZE;
      if (done) {
        st.quiz.awarded = true;
        if (st.quiz.score === QUIZ_SIZE) grantBadge(res, st, 'sage');
      }
      evaluate(st, res, t);
      save(st);
      // Điểm của chính câu đố hiện ngay trên trang câu đố → không đưa vào toast; chỉ báo phần thưởng phát sinh thêm
      finish({ points: res.points - (correct ? POINTS.quiz : 0), labels: res.labels, badges: res.badges });
      return { correct, correctIndex: q.answer, explain: q.explain, gained: correct ? POINTS.quiz : 0, done, score: st.quiz.score, newBadges: res.badges };
    }

    return {
      award, getSummary, getQuiz, ensureDailyQuiz, startQuiz, practiceSet, answerQuestion,
      // Chỉ để kiểm thử/hiển thị
      _load: load,
      BADGES, WEEKLY, QUIZ_SIZE, POINTS, CAPS, LEVELS, getLevelInfo,
    };
  }

  return {
    create, sanitizeState, sanitizeQuestion, composeQuestions, shuffleOptions, isoWeekKey, weekIndex, weekDays,
    dateKey, addDays, norm, emptyState, BADGES, WEEKLY, QUIZ_SIZE, RECENT_WINDOW, POINTS, CAPS, LEVELS, getLevelInfo,
  };
})();

/* ─── Gắn vào ứng dụng (trình duyệt) ─── */
const NF_Game = (() => {
  'use strict';
  if (typeof window === 'undefined' || typeof NF_Storage === 'undefined') return null;

  // Toast thưởng điểm được trì hoãn 1.8s & gộp lại để không đè lên toast "Đã lưu…" của thao tác vừa làm
  let pending = { points: 0, labels: [], badges: [] };
  let timer = null;

  function flush() {
    timer = null;
    const p = pending;
    pending = { points: 0, labels: [], badges: [] };
    const parts = [];
    if (p.points) parts.push(`⭐ +${p.points} điểm`);
    p.labels.forEach((l) => parts.push(l));
    p.badges.forEach((id) => parts.push(`🏅 Huy hiệu mới: ${NF_GameFactory.BADGES[id].name}`));
    if (parts.length) NF_UI.showToast(parts.join(' • '), 'success');
  }

  function onAward(res) {
    try { window.dispatchEvent(new CustomEvent('nf:game-award', { detail: res })); } catch (e) { /* bỏ qua */ }
    pending.points += res.points;
    pending.labels.push(...res.labels.filter((l) => l !== 'Tra cứu' && l !== 'Ghi nhật ký'));
    pending.badges.push(...res.badges);
    if (!timer) timer = setTimeout(flush, 1800);
  }

  const game = NF_GameFactory.create({
    storage: NF_Storage,
    bank: (typeof NF_QUIZ_BANK !== 'undefined') ? NF_QUIZ_BANK : [],
    canUseAI: () => typeof NF_Gemini !== 'undefined' && NF_Gemini.isConfigured(),
    generateQuiz: (n, o) => NF_Gemini.generateQuiz(n, o),
    onAward,
  });

  // Móc trung tâm: lắng nghe sự kiện từ NF_Storage → không bỏ sót chỗ nào ghi nhật ký (Tra cứu, Camera, Thực đơn, Thủ công)
  const safe = (fn) => (e) => { try { fn(e); } catch (err) { console.warn('[Game]', err); } };
  window.addEventListener('nf:lookup', safe((e) => game.award('lookup', { name: e.detail && e.detail.name })));
  window.addEventListener('nf:diary', safe((e) => {
    const d = e.detail || {};
    game.award(d.action === 'add' ? 'diary' : 'healthyCheck', { date: d.date });
  }));
  window.addEventListener('nf:profile', safe(() => game.award('sync')));
  window.addEventListener('nf:water', safe(() => game.award('sync')));

  return game;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { NF_GameFactory };
