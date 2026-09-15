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

    // Lắng nghe sự kiện đổi hash
    window.addEventListener('hashchange', handleRoute);

    // Xử lý các click vào bottom nav
    setupNav();

    // Điều hướng lần đầu
    if (!window.location.hash) {
      window.location.hash = '#home';
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
    const [path, queryStr] = rawHash.split('?');
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

    // Xử lý tham số query (ví dụ: ?date=YYYY-MM-DD)
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
    } else {
      pageHandler.render(contentContainer);
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
