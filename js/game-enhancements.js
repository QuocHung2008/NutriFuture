/* NutriFuture — Level FX / Infinite Progression Enhancement
 * Loaded after js/game-engine.js and before page modules.
 * No existing game data schema is changed. Existing levels 1–7 remain intact;
 * higher levels are derived from the same accumulated points without a hard cap.
 *
 * GIAO DIỆN (looks): 9 giao diện, mở khóa gần như mỗi cấp một cái (cấp 1 → 9).
 * Mặc định giao diện tự đổi theo cấp; người chơi cũng có thể chọn thủ công một giao diện ĐÃ mở khóa
 * (lưu ở localStorage 'nf_look'), hoặc "xem thử" giao diện chưa mở trong vài giây.
 */
(() => {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__NF_LEVEL_FX__) return;
  if (typeof NF_Game === 'undefined' || !NF_Game || typeof NF_Game.getSummary !== 'function') return;

  const RAW_GET_SUMMARY = NF_Game.getSummary.bind(NF_Game);
  const BASE_LEVEL_MAX_POINTS = 1200;
  const EXTENSION_CAP = 1000000;
  const LOOK_KEY = 'nf_look';          // 'auto' | id giao diện đã mở khóa
  const REALM_CACHE_KEY = 'nf_realm';  // giao diện đang dùng — để index.html áp dụng ngay khi tải (không bị chớp)
  const PREVIEW_MS = 5000;

  // minLevel: cấp cần đạt để mở khóa (đã rút ngắn: 9 giao diện trong 9 cấp đầu, trước đây cần tới cấp 25)
  // Mỗi giao diện có "chữ ký" riêng về nền, hạt chuyển động, thẻ, nút, huy hiệu (css/looks.css + js/fx.js).
  const LOOKS = [
    { id: 'fresh',        name: 'Khởi Đầu Xanh',      minLevel: 1, swatch: ['#054fd4', '#0f6fe6', '#1a96ff'], dark: false, desc: 'Bong bóng nhẹ nổi lên' },
    { id: 'radiant',      name: 'Rạng Đông',          minLevel: 2, swatch: ['#f59e0b', '#ff5fb3', '#6d4cff'], dark: false, desc: 'Tia nắng ban mai' },
    { id: 'celestial',    name: 'Thiên Lam',          minLevel: 3, swatch: ['#0a55dd', '#0879c4', '#4df0ff'], dark: false, desc: 'Mây trôi, sóng nước' },
    { id: 'nebula',       name: 'Cực Quang',          minLevel: 4, swatch: ['#304be8', '#8a45f5', '#ef58ba'], dark: false, desc: 'Dải sáng bảy sắc' },
    { id: 'cosmic',       name: 'Hành Tinh',          minLevel: 5, swatch: ['#183bc9', '#604dff', '#18cfff'], dark: false, desc: 'Quỹ đạo & màn hình HUD' },
    { id: 'royal',        name: 'Hoàng Kim',          minLevel: 6, swatch: ['#3f2fd0', '#8a4ff0', '#e58f0a'], dark: false, desc: 'Bụi vàng rơi, khung son' },
    { id: 'divine',       name: 'Thần Quang',         minLevel: 7, swatch: ['#5d34e6', '#8a4cf0', '#ffcf55'], dark: true,  desc: 'Thánh quang, lông vũ' },
    { id: 'eternal',      name: 'Vĩnh Hằng',          minLevel: 8, swatch: ['#a3160c', '#d4400a', '#ffb020'], dark: true,  desc: 'Lửa bất diệt' },
    { id: 'transcendent', name: 'Chư Thiên Tinh Đấu', minLevel: 9, swatch: ['#22d3ee', '#a05cff', '#ff6bb5'], dark: true,  desc: 'Ngân hà · Bắc Đẩu · sao băng' },
  ];
  const LOOK_BY_ID = LOOKS.reduce((m, l) => { m[l.id] = l; return m; }, {});
  // Biểu tượng chỉ dùng cho các cấp mở rộng (từ cấp 8); cấp 1–7 dùng biểu tượng gốc trong game-engine.js.
  // (Chỉ dùng biểu tượng có trong Font Awesome Free — biểu tượng "sparkles" là bản Pro nên sẽ hiện ô trống.)
  const ICONS = {
    eternal: 'fa-infinity',
    transcendent: 'fa-wand-magic-sparkles',
  };
  const TITLES = {
    8: 'Tinh Tú',
    9: 'Tinh Hải',
    10: 'Ngân Hà',
    11: 'Chu Thiên',
    12: 'Tinh Đấu',
    13: 'Hoàng Kim',
    14: 'Vương Giả',
    15: 'Đế Tinh',
    16: 'Thiên Vực',
    17: 'Vũ Trụ',
    18: 'Hỗn Độn',
    19: 'Thái Sơ',
    20: 'Vĩnh Hằng',
    21: 'Vô Cực',
    22: 'Chí Tôn',
    23: 'Siêu Tân Tinh',
    24: 'Thần Vực',
    25: 'Thiên Ngoại',
    26: 'Tinh Quân',
    27: 'Thiên Đế',
    28: 'Đại Đạo',
    29: 'Hồng Mông',
    30: 'Siêu Thoát',
  };
  const HIGH_TITLES = ['Tinh Hải Vô Tận', 'Chu Thiên Cực Cảnh', 'Hoàng Gia Thiên Vực', 'Vũ Trụ Chí Tôn', 'Hỗn Độn Thần Vực', 'Vĩnh Hằng Bất Diệt'];

  const levelSpan = (level) => 220 + Math.max(0, level - 8) * 35;

  function minPointsForLevel(level) {
    if (level <= 1) return 0;
    if (level === 2) return 60;
    if (level === 3) return 150;
    if (level === 4) return 300;
    if (level === 5) return 500;
    if (level === 6) return 800;
    if (level === 7) return 1200;
    let points = BASE_LEVEL_MAX_POINTS;
    for (let lv = 8; lv <= level; lv++) points += levelSpan(lv);
    return points;
  }

  function titleForLevel(level) {
    if (TITLES[level]) return TITLES[level];
    const cycle = HIGH_TITLES[(level - 31) % HIGH_TITLES.length];
    const cycleNo = Math.floor((level - 31) / HIGH_TITLES.length) + 1;
    return `${cycle} ${cycleNo}`;
  }

  function lookIndexForLevel(level) {
    let idx = 0;
    for (let i = 0; i < LOOKS.length; i++) { if (level >= LOOKS[i].minLevel) idx = i; }
    return idx;
  }

  function realmForLevel(level) {
    return LOOKS[lookIndexForLevel(level)].id;
  }

  /** "Power" 1–9 = thứ tự của giao diện: quyết định số sao lấp lánh, aurora, sao băng (js/fx.js + CSS). */
  function powerForLevel(level) {
    return lookIndexForLevel(level) + 1;
  }

  function extendedLevelInfo(points) {
    const p = Math.max(0, Math.min(EXTENSION_CAP, Number(points) || 0));
    const base = RAW_GET_SUMMARY().level;
    if (p < BASE_LEVEL_MAX_POINTS) return { ...base, realm: realmForLevel(base.level), power: powerForLevel(base.level) };

    let level = 7;
    let min = BASE_LEVEL_MAX_POINTS;
    while (p >= minPointsForLevel(level + 1) && level < 9999) level++;
    min = minPointsForLevel(level);
    const nextMin = minPointsForLevel(level + 1);
    const span = Math.max(1, nextMin - min);
    const into = Math.max(0, p - min);
    const realm = realmForLevel(level);
    // Cấp 7 (1200–1419 điểm) vẫn là cấp gốc "Huyền thoại NutriFuture": giữ tên/biểu tượng gốc
    // (trước đây rơi vào nhánh mở rộng nên hiện tên sai "Tinh Hải Vô Tận -3").
    const isBase = level <= 7;
    return {
      ...base,
      level,
      minPoints: min,
      name: isBase ? base.name : titleForLevel(level),
      icon: isBase ? base.icon : (ICONS[realm] || 'fa-star'),
      color: isBase ? base.color : 'primary',
      tier: isBase ? base.tier : realm,
      realm,
      power: powerForLevel(level),
      points: p,
      nextMinPoints: nextMin,
      nextName: titleForLevel(level + 1),
      pointsToNext: Math.max(0, nextMin - p),
      progressPct: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
      isMax: false,
    };
  }

  function levelFromPoints(points) {
    const p = Number(points) || 0;
    if (p < BASE_LEVEL_MAX_POINTS) return RAW_GET_SUMMARY().level.level;
    let level = 7;
    while (level < 9999 && p >= minPointsForLevel(level + 1)) level++;
    return level;
  }

  let lastLevel = null;
  try {
    const current = RAW_GET_SUMMARY();
    lastLevel = levelFromPoints(current.points);
  } catch (_) {}

  /* ─── Chọn giao diện (looks) ─── */

  let previewId = null;
  let previewTimer = null;
  let firstDecorate = true;

  function readChoice() {
    try {
      const v = localStorage.getItem(LOOK_KEY);
      return v && LOOK_BY_ID[v] ? v : 'auto';
    } catch (_) { return 'auto'; }
  }

  function currentLevel() {
    try { return NF_Game.getSummary().level.level; } catch (_) { return 1; }
  }

  /** Giao diện thực sự được áp dụng: xem thử > lựa chọn thủ công (đã mở khóa) > theo cấp. */
  function effectiveRealm(level, ignorePreview) {
    if (!ignorePreview && previewId && LOOK_BY_ID[previewId]) return previewId;
    const choice = readChoice();
    if (choice !== 'auto' && level >= LOOK_BY_ID[choice].minLevel) return choice;
    return realmForLevel(level);
  }

  function looks() {
    const level = currentLevel();
    const choice = readChoice();
    const active = effectiveRealm(level, true);
    return LOOKS.map((l, i) => ({
      id: l.id, name: l.name, desc: l.desc, minLevel: l.minLevel, swatch: l.swatch, dark: l.dark, power: i + 1,
      unlocked: level >= l.minLevel,
      active: l.id === active,
      auto: choice === 'auto',
    }));
  }

  function getLookChoice() { return readChoice(); }

  /** id = 'auto' (theo cấp) hoặc id giao diện đã mở khóa. Trả về true nếu áp dụng được. */
  function setLook(id) {
    const level = currentLevel();
    if (id !== 'auto' && (!LOOK_BY_ID[id] || level < LOOK_BY_ID[id].minLevel)) return false;
    try { localStorage.setItem(LOOK_KEY, id); } catch (_) { /* chế độ riêng tư: chỉ áp dụng trong phiên */ }
    previewId = null;
    decorateRoot();
    return true;
  }

  /** Xem thử một giao diện CHƯA mở khóa trong vài giây (không lưu). */
  function previewLook(id) {
    if (!LOOK_BY_ID[id]) return false;
    previewId = id;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { previewId = null; decorateRoot(); }, PREVIEW_MS);
    decorateRoot();
    return true;
  }

  function decorateRoot() {
    let summary;
    try { summary = NF_Game.getSummary(); } catch (_) { return; }
    if (!summary || !summary.level) return;
    const level = summary.level.level;
    const realm = effectiveRealm(level);
    const power = LOOKS.findIndex((l) => l.id === realm) + 1;
    const root = document.documentElement;
    const changed = root.dataset.nfRealm !== realm;

    root.dataset.nfLevel = String(level);
    root.dataset.nfRealm = realm;
    root.dataset.nfPower = String(power);

    if (changed) {
      if (!previewId) { try { localStorage.setItem(REALM_CACHE_KEY, realm); } catch (_) { /* bỏ qua */ } }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', LOOK_BY_ID[realm].dark ? '#0d1020' : LOOK_BY_ID[realm].swatch[0]);
      // Lần vẽ đầu tiên khi tải trang: không chớp. Từ lần sau (đổi giao diện) mới có hiệu ứng.
      if (!firstDecorate && typeof NF_Fx !== 'undefined' && NF_Fx && NF_Fx.lookChanged) NF_Fx.lookChanged();
    }
    firstDecorate = false;

    document.querySelectorAll('.level-badge').forEach((badge) => {
      const stamp = `${level}|${realm}`;
      badge.dataset.nfRealm = realm;
      badge.dataset.nfPower = String(power);
      badge.dataset.level = String(level);
      // Chỉ phát hiệu ứng "bật" khi huy hiệu mới xuất hiện hoặc cấp/giao diện đổi
      // (trước đây phát lại mỗi lần DOM đổi, ví dụ mỗi lần trả lời một câu đố).
      if (badge.dataset.nfStamp !== stamp) {
        badge.dataset.nfStamp = stamp;
        badge.classList.remove('nf-level-live');
        void badge.offsetWidth;
        badge.classList.add('nf-level-live');
      }
    });
  }

  function escapeText(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span.innerHTML;
  }

  let celebration = null;
  let celebrationTimer = null;
  let particlesFrame = null;

  function makeCelebration() {
    if (celebration) return celebration;
    const root = document.createElement('div');
    root.id = 'nf-level-celebration';
    root.className = 'nf-level-celebration';
    root.setAttribute('aria-live', 'assertive');
    root.innerHTML = `
      <canvas class="nf-level-celebration__canvas" aria-hidden="true"></canvas>
      <div class="nf-level-celebration__aurora" aria-hidden="true"></div>
      <div class="nf-level-celebration__content">
        <div class="nf-level-celebration__eyebrow"><i class="fa-solid fa-wand-magic-sparkles"></i> THĂNG CẤP</div>
        <div class="nf-level-celebration__ring"><div class="nf-level-celebration__icon"><i class="fa-solid fa-star"></i></div></div>
        <div class="nf-level-celebration__level"></div>
        <div class="nf-level-celebration__title"></div>
        <div class="nf-level-celebration__desc"></div>
        <div class="nf-level-celebration__unlock" hidden></div>
        <div class="nf-level-celebration__xp"></div>
      </div>`;
    root.addEventListener('click', () => hideCelebration());
    document.body.appendChild(root);
    celebration = root;
    return root;
  }

  function randomBetween(a, b) { return a + Math.random() * (b - a); }

  function burstParticles(canvas, power) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(230, 80 + power * 20);
    const palette = ['#ffffff', '#3fc5ff', '#5c8dff', '#8f6cff', '#ff68b2', '#ffd45a', '#7fffd4'];
    const cx = w / 2;
    const cy = h * 0.42;
    const particles = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const speed = randomBetween(2.5, 10 + power * 0.7);
      return {
        x: cx, y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - randomBetween(1, 4),
        size: randomBetween(1.2, 4.8),
        life: randomBetween(45, 95),
        max: 95,
        rot: Math.random() * Math.PI,
        spin: randomBetween(-0.25, 0.25),
        color: palette[(Math.random() * palette.length) | 0],
      };
    });

    const start = performance.now();
    const draw = (now) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.life -= 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.992;
        p.rot += p.spin;
        const alpha = Math.max(0, p.life / p.max);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.7);
        ctx.restore();
      }
      if (elapsed < 1800 && alive) particlesFrame = requestAnimationFrame(draw);
      else { ctx.clearRect(0, 0, w, h); particlesFrame = null; }
    };
    cancelAnimationFrame(particlesFrame || 0);
    particlesFrame = requestAnimationFrame(draw);
  }

  function showCelebration(fromLevel, toLevel, summary) {
    const root = makeCelebration();
    clearTimeout(celebrationTimer);
    const icon = root.querySelector('.nf-level-celebration__icon i');
    const levelEl = root.querySelector('.nf-level-celebration__level');
    const titleEl = root.querySelector('.nf-level-celebration__title');
    const descEl = root.querySelector('.nf-level-celebration__desc');
    const xpEl = root.querySelector('.nf-level-celebration__xp');
    const unlockEl = root.querySelector('.nf-level-celebration__unlock');
    const stepCount = Math.max(1, toLevel - fromLevel);
    const realm = summary.level.realm || realmForLevel(toLevel);
    const power = summary.level.power || powerForLevel(toLevel);
    root.dataset.nfRealm = realm;
    root.dataset.nfPower = String(power);
    icon.className = `fa-solid ${summary.level.icon || ICONS[realm] || 'fa-star'}`;
    // Giao diện mới mở khóa ở lần lên cấp này (nếu có)
    const unlocked = LOOKS.filter((l) => l.minLevel > fromLevel && l.minLevel <= toLevel);
    if (unlockEl) {
      if (unlocked.length) {
        unlockEl.textContent = `🎨 Mở khóa giao diện «${unlocked[unlocked.length - 1].name}»`;
        unlockEl.hidden = false;
      } else {
        unlockEl.hidden = true;
      }
    }
    levelEl.textContent = stepCount > 1 ? `Cấp ${fromLevel}  →  Cấp ${toLevel}` : `Cấp ${toLevel}`;
    titleEl.textContent = summary.level.name;
    descEl.textContent = stepCount > 1 ? `Bạn vừa vượt ${stepCount} cảnh giới trong một lần.` : 'Mỗi điểm nhỏ hôm nay đã biến thành một cột mốc mới.';
    xpEl.textContent = `⭐ ${typeof NF_UI !== 'undefined' && NF_UI && NF_UI.formatNumber ? NF_UI.formatNumber(summary.points) : summary.points} điểm tích lũy`;
    root.classList.remove('is-show');
    void root.offsetWidth;
    root.classList.add('is-show');
    burstParticles(root.querySelector('canvas'), power);
    celebrationTimer = setTimeout(hideCelebration, Math.max(3200, Math.min(6200, 3200 + power * 240)));
  }

  function hideCelebration() {
    if (!celebration) return;
    celebration.classList.remove('is-show');
    if (particlesFrame) cancelAnimationFrame(particlesFrame);
    celebrationTimer = setTimeout(() => {
      if (celebration && celebration.parentNode) celebration.remove();
      celebration = null;
    }, 420);
  }

  NF_Game.getSummary = function enhancedGetSummary() {
    const summary = RAW_GET_SUMMARY();
    const currentLevel = extendedLevelInfo(summary.points);
    return { ...summary, level: currentLevel };
  };

  window.__NF_LEVEL_FX__ = {
    refresh: decorateRoot,
    showCelebration,
    minPointsForLevel,
    levelFromPoints,
    // Giao diện
    LOOKS,
    looks,
    getLookChoice,
    setLook,
    previewLook,
    realmForLevel,
  };

  window.addEventListener('nf:game-award', () => {
    let summary;
    try { summary = NF_Game.getSummary(); } catch (_) { return; }
    const newLevel = summary.level.level;
    const oldLevel = lastLevel == null ? newLevel : lastLevel;
    decorateRoot();
    if (newLevel > oldLevel) showCelebration(oldLevel, newLevel, summary);
    lastLevel = newLevel;
  });

  const observerTarget = document.getElementById('app-content') || document.body;
  let raf = 0;
  const mo = new MutationObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(decorateRoot);
  });
  mo.observe(observerTarget, { childList: true, subtree: true });

  window.addEventListener('load', decorateRoot, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) decorateRoot();
  });
  decorateRoot();
})();
