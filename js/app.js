/**
 * NutriFuture — App Controller & Router
 * Điều phối định tuyến (Hash-based router), vòng đời ứng dụng và trạng thái toàn cục.
 */
const NF_App = (() => {
  'use strict';

  const routes = {
    '#home': NF_PageHome,
    '#camera': NF_PageCamera,
    '#lookup': NF_PageLookup,
    '#profile': NF_PageProfile,
    '#diary': NF_PageDiary,
    '#history': NF_PageHistory,
  };

  let currentRoute = null;

  function init() {
    console.log('[NutriFuture] Initializing application...');

    // Tự động di chuyển dữ liệu cũ v1 nếu có
    NF_Storage.migrateFromV1();

    // Đồng bộ icon + gắn sự kiện cho nút chuyển giao diện sáng/tối
    NF_UI.initThemeToggle();

    // Khởi động vòng lặp nhắc nhở (uống nước / ghi nhật ký) nếu người dùng đã bật
    if (typeof NF_Notifications !== 'undefined') {
      NF_Notifications.init();
    }

    // Lắng nghe sự kiện đổi hash
    window.addEventListener('hashchange', handleRoute);

    // Xử lý các click vào bottom nav
    setupNav();

    // Điều hướng lần đầu — người dùng CHƯA nhập hồ sơ (onboarding) sẽ luôn được
    // đưa vào tab Hồ sơ trước, không cho vào các tab khác cho đến khi lưu thông tin
    if (!window.location.hash) {
      window.location.hash = NF_Storage.isOnboarded() ? '#home' : '#profile?onboarding=1';
    } else {
      handleRoute();
    }

    // Modal close on ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        NF_UI.closeModal();
      }
    });
  }

  function handleRoute() {
    const rawHash = window.location.hash || '#home';
    let [path, queryStr] = rawHash.split('?');

    // Chặn điều hướng sang trang khác nếu chưa hoàn tất onboarding (nhập hồ sơ lần đầu)
    if (!NF_Storage.isOnboarded() && path !== '#profile') {
      window.location.hash = '#profile?onboarding=1';
      return;
    }

    const pageHandler = routes[path] || routes['#home'];
    const contentContainer = document.getElementById('app-content');

    if (!contentContainer) return;

    // Dừng camera nếu rời khỏi trang camera
    if (currentRoute === '#camera' && path !== '#camera') {
      if (NF_PageCamera && typeof NF_PageCamera.stopCamera === 'function') {
        NF_PageCamera.stopCamera();
      }
    }

    currentRoute = path;
    updateNavActive(path);

    // Xử lý tham số query (ví dụ: ?date=YYYY-MM-DD hoặc ?onboarding=1)
    let queryParams = {};
    if (queryStr) {
      const pairs = queryStr.split('&');
      pairs.forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) queryParams[k] = decodeURIComponent(v);
      });
    }

    // Cuộn lên đầu trang khi chuyển tab
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Render trang tương ứng
    if (path === '#diary') {
      pageHandler.render(contentContainer, queryParams.date || null);
    } else if (path === '#profile') {
      pageHandler.render(contentContainer, { onboarding: queryParams.onboarding === '1' });
    } else {
      pageHandler.render(contentContainer);
    }

    // Hiệu ứng vào trang (GSAP entrance + ScrollTrigger reveal) — an toàn nếu thư viện
    // chưa tải xong hoặc bị chặn mạng, NF_Motion tự bỏ qua.
    if (window.NF_Motion) {
      NF_Motion.animatePage(contentContainer);
    }
  }

  function setupNav() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetHash = btn.getAttribute('data-target');
        if (targetHash) {
          window.location.hash = targetHash;
        }
      });
    });
  }

  function updateNavActive(path) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      const targetHash = btn.getAttribute('data-target');
      if (targetHash === path) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  return {
    init
  };
})();

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', NF_App.init);
