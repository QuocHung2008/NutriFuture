/**
 * NutriFuture — NF_Fx: hiệu ứng lấp lánh & chuyển động (chỉ trang trí, không đụng tới dữ liệu).
 *
 *  - Lớp sao lấp lánh (#nf-sparkles): số lượng tăng theo "power" của giao diện (cấp độ) — 9 mức.
 *  - Lớp aurora (#nf-aurora) từ giao diện Tinh Vân trở lên; sao băng từ giao diện Vĩnh Hằng trở lên.
 *  - Nổ sao nhỏ khi bấm nút / thẻ; đếm số chạy khi vào trang; hiệu ứng chớp khi đổi giao diện.
 *
 * An toàn:
 *  - Tất cả phần tử tạo ra đều pointer-events:none, aria-hidden, chỉ animate transform/opacity (xem css/level-fx-add.css).
 *  - Tôn trọng "Reduce motion": không tạo gì cả (và gỡ hết nếu người dùng bật giữa chừng).
 *  - Tạm dừng khi tab bị ẩn; ẩn ở trang Camera (để không che khung hình).
 *  - Mọi thao tác được bọc try/catch — lỗi hiệu ứng không bao giờ làm hỏng app.
 */
const NF_Fx = (() => {
  'use strict';

  const BURST_TARGETS = '.btn, .nav-btn, .quick-card, .chip-btn, .quiz-option, .header-date, .look-tile, .water-tracker__btn, .shutter-btn';
  const COUNT_TARGETS = '.stat-card__value, .metric-card__value, .water-tracker__value';
  const MAX_BURSTS = 6;

  let layer = null;
  let aurora = null;
  let rebuildTimer = 0;
  let activeBursts = 0;
  let lookTimer = 0;
  const counting = new WeakSet();

  const rand = (a, b) => a + Math.random() * (b - a);
  const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const reduced = () => mq('(prefers-reduced-motion: reduce)').matches;
  const power = () => Math.max(1, Math.min(9, Number(document.documentElement.dataset.nfPower) || 1));

  /* ─── Sao lấp lánh · aurora · sao băng ─── */

  function ensureLayers() {
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'nf-sparkles';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    if (!aurora) {
      aurora = document.createElement('div');
      aurora.id = 'nf-aurora';
      aurora.setAttribute('aria-hidden', 'true');
      aurora.innerHTML = '<div class="nf-aurora__blob nf-aurora__blob--a"></div><div class="nf-aurora__blob nf-aurora__blob--b"></div>';
      document.body.appendChild(aurora);
    }
  }

  function removeLayers() {
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    if (aurora && aurora.parentNode) aurora.parentNode.removeChild(aurora);
    layer = null;
    aurora = null;
  }

  function buildSparkles() {
    try {
      if (reduced()) { removeLayers(); return; }
      ensureLayers();
      const p = power();
      const small = window.innerWidth < 640;
      const count = Math.round((8 + p * 3) * (small ? 0.65 : 1));
      const colors = ['var(--nf-s1)', 'var(--nf-s2)', 'var(--nf-s3)'];
      const frag = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.className = 'nf-spark';
        el.style.setProperty('--x', rand(2, 96).toFixed(1) + '%');
        el.style.setProperty('--y', rand(4, 94).toFixed(1) + '%');
        el.style.setProperty('--s', rand(7, 17).toFixed(1) + 'px');
        el.style.setProperty('--d', rand(3.2, 6.6).toFixed(2) + 's');
        el.style.setProperty('--dl', '-' + rand(0, 6).toFixed(2) + 's');   // trễ âm: mỗi sao bắt đầu ở một pha khác nhau
        el.style.setProperty('--o', rand(0.6, 0.95).toFixed(2));
        el.style.setProperty('--dr', '-' + rand(8, 26).toFixed(0) + 'px');
        el.style.setProperty('--c', colors[i % colors.length]);
        frag.appendChild(el);
      }

      // Sao băng: chỉ từ giao diện Vĩnh Hằng (8) trở lên
      if (p >= 8) {
        for (let i = 0; i < 3; i++) {
          const s = document.createElement('span');
          s.className = 'nf-shoot';
          s.style.setProperty('--x', rand(0, 55).toFixed(0) + '%');
          s.style.setProperty('--y', rand(2, 45).toFixed(0) + '%');
          s.style.setProperty('--d', rand(7, 11).toFixed(1) + 's');
          s.style.setProperty('--dl', '-' + rand(0, 8).toFixed(1) + 's');
          frag.appendChild(s);
        }
      }

      layer.textContent = '';
      layer.appendChild(frag);
    } catch (e) { console.warn('[NF_Fx] sparkles:', e); }
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(buildSparkles, 120);
  }

  /* ─── Nổ sao khi bấm ─── */

  function burst(x, y) {
    try {
      if (reduced() || activeBursts >= MAX_BURSTS) return;
      const root = document.createElement('div');
      root.className = 'nf-burst';
      root.setAttribute('aria-hidden', 'true');
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      const n = 7 + Math.min(power(), 7);
      const colors = ['var(--nf-s1)', 'var(--nf-s2)', 'var(--nf-s3)', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-0.3, 0.3);
        const r = rand(26, 64);
        const st = document.createElement('i');
        st.style.setProperty('--tx', (Math.cos(a) * r).toFixed(1) + 'px');
        st.style.setProperty('--ty', (Math.sin(a) * r).toFixed(1) + 'px');
        st.style.setProperty('--s', rand(6, 13).toFixed(1) + 'px');
        st.style.setProperty('--c', colors[i % colors.length]);
        root.appendChild(st);
      }
      document.body.appendChild(root);
      activeBursts++;
      setTimeout(() => { if (root.parentNode) root.parentNode.removeChild(root); activeBursts = Math.max(0, activeBursts - 1); }, 760);
    } catch (e) { /* bỏ qua */ }
  }

  function onPointerDown(e) {
    try {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target && e.target.closest ? e.target.closest(BURST_TARGETS) : null;
      if (!t || t.disabled) return;
      burst(e.clientX, e.clientY);
    } catch (err) { /* bỏ qua */ }
  }

  /* ─── Đếm số chạy khi vào trang ─── */

  function parseInteger(text) {
    const t = (text || '').trim();
    if (/^\d{1,6}$/.test(t)) return { value: Number(t), grouped: false };
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      const v = Number(t.replace(/\./g, ''));
      // chỉ nhận nếu đúng định dạng vi-VN của chính số đó (tránh nhầm số thập phân như "2.500")
      if (typeof NF_UI !== 'undefined' && NF_UI.formatNumber && NF_UI.formatNumber(v) === t) return { value: v, grouped: true };
    }
    return null;
  }

  function countUp(el) {
    if (counting.has(el)) return;
    const parsed = parseInteger(el.textContent);
    if (!parsed || parsed.value < 3) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > (window.innerHeight || 800)) return;   // ngoài màn hình: khỏi chạy
    counting.add(el);

    const target = parsed.value;
    const fmt = (n) => (parsed.grouped && typeof NF_UI !== 'undefined' ? NF_UI.formatNumber(n) : String(n));
    const finalText = el.textContent;
    const duration = 750;
    const t0 = performance.now();
    let lastWritten = null;

    function frame(now) {
      // Dừng nếu phần tử đã bị gỡ khỏi trang, hoặc nội dung bị nơi khác cập nhật trong lúc đếm
      if (!el.isConnected || (lastWritten !== null && el.textContent !== lastWritten)) { counting.delete(el); return; }
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      if (p >= 1) { el.textContent = finalText; counting.delete(el); return; }
      lastWritten = fmt(Math.round(target * eased));
      el.textContent = lastWritten;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function enhancePage(root) {
    try {
      if (!root || reduced()) return;
      root.querySelectorAll(COUNT_TARGETS).forEach(countUp);
    } catch (e) { /* bỏ qua */ }
  }

  /* ─── Đổi giao diện: chớp sáng + chuyển màu mượt ─── */

  function lookChanged() {
    try {
      if (reduced()) return;
      const html = document.documentElement;
      html.classList.add('nf-look-switching');
      const flash = document.createElement('div');
      flash.className = 'nf-look-flash';
      flash.setAttribute('aria-hidden', 'true');
      document.body.appendChild(flash);
      setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 760);
      clearTimeout(lookTimer);
      lookTimer = setTimeout(() => html.classList.remove('nf-look-switching'), 800);
      const r = document.documentElement.getBoundingClientRect();
      burst(Math.round(r.width / 2), Math.round((window.innerHeight || 800) * 0.35));
    } catch (e) { /* bỏ qua */ }
  }

  /* ─── Khởi tạo ─── */

  function syncRoute() {
    document.documentElement.dataset.nfRoute = ((window.location.hash || '#home').split('?')[0] || '#home').slice(1);
  }

  function init() {
    try {
      syncRoute();
      window.addEventListener('hashchange', syncRoute);
      document.addEventListener('pointerdown', onPointerDown, { passive: true });

      // Số sao phụ thuộc "power" của giao diện → dựng lại khi thuộc tính đổi
      new MutationObserver(scheduleRebuild).observe(document.documentElement, { attributes: true, attributeFilter: ['data-nf-power'] });

      // Người dùng bật/tắt "Reduce motion" giữa chừng
      const m = mq('(prefers-reduced-motion: reduce)');
      if (m.addEventListener) m.addEventListener('change', buildSparkles);

      // Tab bị ẩn → tạm dừng lấp lánh (đỡ tốn pin)
      document.addEventListener('visibilitychange', () => {
        if (layer) layer.classList.toggle('is-paused', document.hidden);
        if (aurora) aurora.classList.toggle('is-paused', document.hidden);
      });

      buildSparkles();
    } catch (e) { console.warn('[NF_Fx] init:', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { enhancePage, burst, lookChanged, rebuild: buildSparkles };
})();
