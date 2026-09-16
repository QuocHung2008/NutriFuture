/**
 * NutriFuture — Motion helpers (bổ sung hiệu ứng, không đổi logic ứng dụng)
 * 1. Ripple lan tỏa khi bấm nút / thẻ tương tác.
 * 2. Hiệu ứng xuất hiện so le (stagger reveal) mỗi khi một trang mới được render.
 */
(function () {
  'use strict';

  // ── 1. Ripple effect ──────────────────────────────────────────────
  function attachRipple(el, evt) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (evt.clientX - rect.left - size / 2) + 'px';
    span.style.top = (evt.clientY - rect.top - size / 2) + 'px';
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn, .quick-card, .camera-btn, .nav-btn');
    if (!target) return;
    const style = getComputedStyle(target);
    if (style.position === 'static') target.style.position = 'relative';
    target.style.overflow = target.style.overflow || 'hidden';
    attachRipple(target, e);
  });

  // ── 2. Stagger reveal on render ───────────────────────────────────
  const REVEAL_SELECTOR = [
    '.page__body > *', '.quick-grid > *', '.metric-grid > *',
    '.nutrient-grid > *', '.chart-legend > *', '.diary-entry',
    '.lookup-history__item', '.history-date-card', '.meal-plan-card'
  ].join(', ');

  function runReveal(root) {
    const els = root.querySelectorAll(REVEAL_SELECTOR);
    els.forEach((el, i) => {
      el.classList.add('reveal-pop');
      const delay = Math.min(i * 45, 480);
      setTimeout(() => el.classList.add('is-visible'), 20 + delay);
    });
  }

  const contentRoot = document.getElementById('app-content');
  if (contentRoot) {
    const observer = new MutationObserver(() => {
      runReveal(contentRoot);
    });
    observer.observe(contentRoot, { childList: true });
  }
})();
