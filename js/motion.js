/**
 * NutriFuture — NF_Motion: chuyển động card khi vào trang.
 * CHỈ dùng CSS + JS thuần (không thư viện). Module này chỉ gắn class; toàn bộ hiệu ứng nằm trong css/main.css (mục 22).
 *
 *  - Card ở trong màn hình: hiện dần lệch nhịp (--i × 45 ms, tối đa 8 card).
 *  - Card ở dưới màn hình (danh sách dài: Nhật ký, Lịch sử): ẩn tới khi cuộn tới rồi hiện MỘT lần (IntersectionObserver).
 *  - Chỉ animate phần tử ngoài cùng (card lồng nhau không bị animate chồng).
 *  - Tôn trọng prefers-reduced-motion: tắt toàn bộ.
 */
const NF_Motion = (() => {
  'use strict';

  const SEL = '.card, .bento-card, .quick-card, .metric-card, .result-card, .meal-plan-card, .diary-entry, .history-date-card';
  let observer = null;

  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function getObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.style.setProperty('--i', 0);
        el.classList.remove('motion-pending');
        el.classList.add('motion-in');
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    return observer;
  }

  function animatePage(root) {
    if (!root || reduced()) return;
    if (observer) { observer.disconnect(); observer = null; }

    const vh = window.innerHeight || 800;
    const canObserve = 'IntersectionObserver' in window;
    const cards = Array.from(root.querySelectorAll(SEL)).filter((el) => !el.parentElement.closest(SEL));

    let i = 0;
    cards.forEach((el) => {
      if (!canObserve || el.getBoundingClientRect().top < vh) {
        el.style.setProperty('--i', i++);
        el.classList.add('motion-in');
      } else {
        el.classList.add('motion-pending');
        getObserver().observe(el);
      }
    });

    root.querySelectorAll('.progress-bar__fill').forEach((bar) => bar.classList.add('motion-fill'));
  }

  return { animatePage };
})();
