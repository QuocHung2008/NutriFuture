/**
 * NutriFuture — Motion Layer (NF_Motion)
 * Lớp hiệu ứng chuyển động toàn app: GSAP + ScrollTrigger (vào trang, cuộn trang),
 * AOS (phần khung tĩnh của index.html), canvas-confetti (khoảnh khắc ăn mừng),
 * particles.js (nền hạt "hologram" trôi nổi phía sau nội dung).
 *
 * Thiết kế để AN TOÀN với kiến trúc vanilla-JS hiện có:
 * - Mọi hàm đều tự kiểm tra thư viện có tồn tại (window.gsap, window.AOS, ...) trước
 *   khi dùng — nếu một CDN lỗi/bị chặn mạng, phần còn lại của app vẫn chạy bình thường.
 * - KHÔNG đụng vào NF_UI.animateNumber() (đã có sẵn, đang hoạt động tốt) — chỉ bổ sung
 *   hiệu ứng xuất hiện (entrance), cuộn trang (scroll reveal) và ăn mừng (celebration).
 */
const NF_Motion = (() => {
  'use strict';

  let particlesReady = false;
  let tiltAttached = false;

  const ENTRANCE_SELECTORS = [
    '.card', '.quick-card', '.metric-card', '.result-card',
    '.diary-entry', '.history-date-card', '.meal-plan-card',
    '.nutrient-box', '.chart-legend__item', '.lookup-history__item',
  ].join(', ');

  const TILT_SELECTOR = '.card--glass, .metric-card, .quick-card, .result-card, .meal-plan-card';

  /* ─── Khởi tạo thư viện (gọi 1 lần khi app load) ─── */

  function initLibraries() {
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (window.AOS) {
      AOS.init({
        duration: 650,
        easing: 'ease-out-cubic',
        once: false,
        mirror: false,
        offset: 24,
      });
    }

    initParticles();
    attachTilt();
    attachRippleButtons();
  }

  /* ─── Nền hạt "hologram" trôi nổi phía sau nội dung ─── */

  function initParticles() {
    if (particlesReady || !window.particlesJS) return;
    let holder = document.getElementById('nf-particles');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'nf-particles';
      document.body.insertBefore(holder, document.body.firstChild);
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const dotColor = isDark ? '#2be8d4' : '#049e91';
    const lineColor = isDark ? '#6ba3ff' : '#4f8cff';

    try {
      particlesJS('nf-particles', {
        particles: {
          number: { value: 42, density: { enable: true, value_area: 900 } },
          color: { value: dotColor },
          shape: { type: 'circle' },
          opacity: { value: 0.45, random: true },
          size: { value: 2.6, random: true },
          line_linked: {
            enable: true, distance: 140, color: lineColor, opacity: 0.22, width: 1,
          },
          move: {
            enable: true, speed: 0.7, direction: 'none', random: true,
            straight: false, out_mode: 'out', bounce: false,
          },
        },
        interactivity: {
          detect_on: 'window',
          events: {
            onhover: { enable: true, mode: 'grab' },
            onclick: { enable: false },
            resize: true,
          },
          modes: { grab: { distance: 130, line_linked: { opacity: 0.4 } } },
        },
        retina_detect: true,
      });
      particlesReady = true;
    } catch (e) { /* an toàn: nếu particles.js lỗi, bỏ qua nền hạt */ }
  }

  /* ─── Hiệu ứng vào trang: gọi sau mỗi lần router render nội dung mới ─── */

  function animatePage(container) {
    if (!container) return;

    if (window.gsap) {
      const page = container.querySelector('.page') || container;
      gsap.killTweensOf(page);
      gsap.fromTo(page, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });

      const groups = container.querySelectorAll(ENTRANCE_SELECTORS);
      if (groups.length) {
        gsap.killTweensOf(groups);
        gsap.fromTo(groups,
          { opacity: 0, y: 20, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.55, ease: 'back.out(1.7)',
            stagger: { each: 0.055, from: 'start' },
            delay: 0.04,
            clearProps: 'transform',
          }
        );
      }

      // Thanh tiến trình: chạy từ 0 đến độ rộng thực khi vào trang
      container.querySelectorAll('.progress-bar__fill').forEach((bar) => {
        const target = bar.style.width || '0%';
        gsap.fromTo(bar, { width: '0%' }, { width: target, duration: 0.9, ease: 'power2.out', delay: 0.1 });
      });
    }

    attachTilt(container);

    if (window.ScrollTrigger) {
      // Làm mới ScrollTrigger để các mục nằm dưới màn hình (ví dụ danh sách nhật ký dài)
      // tự nhận đúng vị trí và hiện ra khi người dùng cuộn tới.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    if (window.AOS) {
      setTimeout(() => AOS.refreshHard(), 80);
    }
  }

  /* ─── Nghiêng nhẹ theo con trỏ chuột (tilt 3D) cho các thẻ nổi bật ─── */

  function attachTilt() {
    if (tiltAttached || !window.gsap || window.matchMedia('(pointer: coarse)').matches) return;
    tiltAttached = true;

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest ? e.target.closest(TILT_SELECTOR) : null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: py * -5,
        rotateY: px * 6,
        transformPerspective: 700,
        duration: 0.35,
        ease: 'power2.out',
      });
    });

    document.addEventListener('mouseout', (e) => {
      const card = e.target.closest ? e.target.closest(TILT_SELECTOR) : null;
      if (!card) return;
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power3.out' });
    });
  }

  /* ─── Hiệu ứng gợn sóng (ripple) khi bấm nút chính ─── */

  function attachRippleButtons() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest ? e.target.closest('.btn--primary, .search-bar__btn') : null;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.cssText = `
        position:absolute; left:${e.clientX - rect.left - size / 2}px; top:${e.clientY - rect.top - size / 2}px;
        width:${size}px; height:${size}px; border-radius:50%;
        background:rgba(255,255,255,0.45); pointer-events:none; transform:scale(0);
      `;
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      if (window.gsap) {
        gsap.to(ripple, { scale: 1, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => ripple.remove() });
      } else {
        setTimeout(() => ripple.remove(), 600);
      }
    });
  }

  /* ─── Ăn mừng: pháo giấy màu thương hiệu cho các khoảnh khắc quan trọng ─── */

  function celebrate() {
    if (!window.confetti) return;
    const brandColors = ['#12d6c4', '#4f8cff', '#7c5cff', '#22c55e', '#ff5d8f'];
    confetti({ particleCount: 70, spread: 68, startVelocity: 36, origin: { y: 0.65 }, colors: brandColors });
    setTimeout(() => {
      confetti({ particleCount: 40, spread: 100, startVelocity: 28, origin: { y: 0.55 }, colors: brandColors });
    }, 180);
  }

  return { initLibraries, animatePage, celebrate };
})();

document.addEventListener('DOMContentLoaded', NF_Motion.initLibraries);
