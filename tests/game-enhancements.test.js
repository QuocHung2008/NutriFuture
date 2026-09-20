// Kiểm thử logic giao diện (looks) & cấp mở rộng trong js/game-enhancements.js (chạy trong Node, không cần trình duyệt).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = [
  { level: 1, minPoints: 0, name: 'Người mới bắt đầu', icon: 'fa-seedling', color: 'green', tier: 'starter' },
  { level: 2, minPoints: 60, name: 'Học viên chăm chỉ', icon: 'fa-leaf', color: 'sky', tier: 'starter' },
  { level: 3, minPoints: 150, name: 'Người theo dõi', icon: 'fa-fire', color: 'amber', tier: 'rising' },
  { level: 4, minPoints: 300, name: 'Chiến binh dinh dưỡng', icon: 'fa-star', color: 'blue', tier: 'rising' },
  { level: 5, minPoints: 500, name: 'Chuyên gia', icon: 'fa-medal', color: 'violet', tier: 'elite' },
  { level: 6, minPoints: 800, name: 'Bậc thầy', icon: 'fa-crown', color: 'gold', tier: 'elite' },
  { level: 7, minPoints: 1200, name: 'Huyền thoại NutriFuture', icon: 'fa-trophy', color: 'gold', tier: 'legend' },
];

function boot() {
  const store = {};
  const ctx = {
    console, Math, JSON, Date, Number, String, Object, Array,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, setTimeout, clearTimeout,
    MutationObserver: class { observe() {} },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  ctx.document = {
    documentElement: { dataset: {} },
    body: {},
    hidden: false,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  const state = { points: 0 };
  ctx.NF_Game = {
    getSummary() {
      let lv = BASE[0];
      for (const b of BASE) if (state.points >= b.minPoints) lv = b;
      const next = BASE[lv.level] || null;
      return { points: state.points, level: { ...lv, points: state.points, nextMinPoints: next ? next.minPoints : null, pointsToNext: next ? next.minPoints - state.points : 0, progressPct: 0, isMax: !next, nextName: next ? next.name : null } };
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'game-enhancements.js'), 'utf8'), ctx);
  return { fx: ctx.window.__NF_LEVEL_FX__, game: ctx.NF_Game, state, store, root: ctx.document.documentElement };
}

test('9 giao diện mở khóa lần lượt từ cấp 1 đến cấp 9', () => {
  const { fx } = boot();
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 100].map((l) => fx.realmForLevel(l));
  assert.deepStrictEqual(ids, ['fresh', 'radiant', 'celestial', 'nebula', 'cosmic', 'royal', 'divine', 'eternal', 'transcendent', 'transcendent', 'transcendent', 'transcendent']);
  assert.strictEqual(fx.LOOKS.length, 9);
  assert.ok(fx.LOOKS.every((l, i) => l.minLevel === i + 1), 'minLevel phải là 1..9');
});

test('cấp 7 (1200–1419 điểm) giữ tên gốc, không còn tên sai', () => {
  const { game, state } = boot();
  for (const p of [1200, 1300, 1419]) {
    state.points = p;
    const lv = game.getSummary().level;
    assert.strictEqual(lv.level, 7, `p=${p}`);
    assert.strictEqual(lv.name, 'Huyền thoại NutriFuture', `p=${p}`);
    assert.strictEqual(lv.icon, 'fa-trophy', `p=${p}`);
  }
  state.points = 1200;
  assert.strictEqual(game.getSummary().level.isMax, false, 'tại đúng 1200 điểm vẫn còn cấp tiếp theo');
  state.points = 1420;
  assert.strictEqual(game.getSummary().level.level, 8);
});

test('cấp mở rộng không dùng biểu tượng Font Awesome Pro (fa-sparkles)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'game-enhancements.js'), 'utf8');
  assert.ok(!/['"`]fa-sparkles|fa-solid fa-sparkles/.test(src), 'fa-sparkles không có trong bản Free');
  const { game, state } = boot();
  for (const p of [1420, 2000, 5000, 20000]) {
    state.points = p;
    const lv = game.getSummary().level;
    assert.ok(/^fa-[a-z-]+$/.test(lv.icon), lv.icon);
    assert.ok(!/undefined|NaN|-\d/.test(lv.name), `tên cấp lạ: ${lv.name}`);
  }
});

test('chọn giao diện: chỉ được chọn cái đã mở khóa; auto theo cấp; lưu localStorage', () => {
  const { fx, state, store, root } = boot();
  state.points = 150;                                   // cấp 3
  fx.refresh();
  assert.strictEqual(root.dataset.nfRealm, 'celestial');
  assert.strictEqual(fx.setLook('nebula'), false, 'cấp 4 chưa mở');
  assert.strictEqual(fx.setLook('radiant'), true);
  assert.strictEqual(store.nf_look, 'radiant');
  assert.strictEqual(root.dataset.nfRealm, 'radiant');
  assert.strictEqual(fx.looks().find((l) => l.active).id, 'radiant');
  assert.strictEqual(fx.setLook('auto'), true);
  assert.strictEqual(root.dataset.nfRealm, 'celestial');
  assert.strictEqual(store.nf_realm, 'celestial', 'giao diện đang dùng được nhớ để áp dụng ngay khi tải trang');
});

test('giá trị nf_look hỏng/đã khóa → quay về giao diện theo cấp', () => {
  const { fx, state, store, root } = boot();
  state.points = 60;                                    // cấp 2
  store.nf_look = 'transcendent';                       // chưa mở
  fx.refresh();
  assert.strictEqual(root.dataset.nfRealm, 'radiant');
  store.nf_look = 'khong-ton-tai';
  fx.refresh();
  assert.strictEqual(root.dataset.nfRealm, 'radiant');
});

test('xem thử giao diện chưa mở khóa không làm đổi lựa chọn đã lưu', () => {
  const { fx, state, store, root } = boot();
  state.points = 0;
  assert.strictEqual(fx.previewLook('eternal'), true);
  assert.strictEqual(root.dataset.nfRealm, 'eternal');
  assert.strictEqual(fx.looks().find((l) => l.active).id, 'fresh', 'trạng thái "đang dùng" không tính xem thử');
  assert.ok(!('nf_look' in store), 'không lưu khi xem thử');
  assert.strictEqual(fx.previewLook('khong-co'), false);
});
