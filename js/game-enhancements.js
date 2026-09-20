/* NutriFuture — Level FX / Infinite Progression Enhancement
 * Loaded after js/game-engine.js and before page modules.
 * No existing game data schema is changed. Existing levels 1–7 remain intact;
 * higher levels are derived from the same accumulated points without a hard cap.
 */
(() => {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__NF_LEVEL_FX__) return;
  if (typeof NF_Game === 'undefined' || !NF_Game || typeof NF_Game.getSummary !== 'function') return;

  const RAW_GET_SUMMARY = NF_Game.getSummary.bind(NF_Game);
  const BASE_LEVEL_MAX_POINTS = 1200;
  const EXTENSION_CAP = 1000000;
  const REALMS = ['celestial', 'nebula', 'cosmic', 'royal', 'divine', 'eternal', 'transcendent'];
  const ICONS = {
    celestial: 'fa-sparkles',
    nebula: 'fa-meteor',
    cosmic: 'fa-atom',
    royal: 'fa-crown',
    divine: 'fa-gem',
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

  function realmForLevel(level) {
    if (level <= 7) return level >= 7 ? 'royal' : (level >= 5 ? 'radiant' : 'fresh');
    if (level <= 9) return 'celestial';
    if (level <= 11) return 'nebula';
    if (level <= 14) return 'cosmic';
    if (level <= 17) return 'royal';
    if (level <= 20) return 'divine';
    if (level <= 24) return 'eternal';
    return 'transcendent';
  }

  function powerForLevel(level) {
    return Math.max(1, Math.min(8, 1 + Math.floor((level - 1) / 3)));
  }

  function extendedLevelInfo(points) {
    const p = Math.max(0, Math.min(EXTENSION_CAP, Number(points) || 0));
    const base = RAW_GET_SUMMARY().level;
    if (p <= BASE_LEVEL_MAX_POINTS) return { ...base, realm: realmForLevel(base.level), power: powerForLevel(base.level) };

    let level = 7;
    let min = BASE_LEVEL_MAX_POINTS;
    while (p >= minPointsForLevel(level + 1) && level < 9999) level++;
    min = minPointsForLevel(level);
    const nextMin = minPointsForLevel(level + 1);
    const span = Math.max(1, nextMin - min);
    const into = Math.max(0, p - min);
    const realm = REALMS.includes(realmForLevel(level)) ? realmForLevel(level) : 'transcendent';
    return {
      ...base,
      level,
      minPoints: min,
      name: titleForLevel(level),
      icon: ICONS[realm] || 'fa-star',
      color: realm === 'royal' ? 'gold' : 'primary',
      tier: realm,
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
    if (p <= BASE_LEVEL_MAX_POINTS) return RAW_GET_SUMMARY().level.level;
    let level = 7;
    while (level < 9999 && p >= minPointsForLevel(level + 1)) level++;
    return level;
  }

  let lastLevel = null;
  try {
    const current = RAW_GET_SUMMARY();
    lastLevel = levelFromPoints(current.points);
  } catch (_) {}

  function decorateRoot() {
    let summary;
    try { summary = NF_Game.getSummary(); } catch (_) { return; }
    if (!summary || !summary.level) return;
    const level = summary.level.level;
    const realm = summary.level.realm || realmForLevel(level);
    const power = summary.level.power || powerForLevel(level);
    document.documentElement.dataset.nfLevel = String(level);
    document.documentElement.dataset.nfRealm = realm;
    document.documentElement.dataset.nfPower = String(power);

    document.querySelectorAll('.level-badge').forEach((badge) => {
      badge.dataset.nfRealm = realm;
      badge.dataset.nfPower = String(power);
      badge.dataset.level = String(level);
      badge.classList.remove('nf-level-live');
      void badge.offsetWidth;
      badge.classList.add('nf-level-live');
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
        <div class="nf-level-celebration__eyebrow"><i class="fa-solid fa-sparkles"></i> THĂNG CẤP</div>
        <div class="nf-level-celebration__ring"><div class="nf-level-celebration__icon"><i class="fa-solid fa-star"></i></div></div>
        <div class="nf-level-celebration__level"></div>
        <div class="nf-level-celebration__title"></div>
        <div class="nf-level-celebration__desc"></div>
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
    const stepCount = Math.max(1, toLevel - fromLevel);
    const realm = summary.level.realm || realmForLevel(toLevel);
    const power = summary.level.power || powerForLevel(toLevel);
    root.dataset.nfRealm = realm;
    root.dataset.nfPower = String(power);
    icon.className = `fa-solid ${ICONS[realm] || 'fa-star'}`;
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
