/**
 * NutriFuture — UI Utilities
 * Toast notifications, modals, loading states, number animations.
 */
const NF_UI = (() => {
  'use strict';

  let toastTimer = null;
  let modalPersistent = false;

  /* ─── Toast Notification ─── */

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const iconMap = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };

    toast.className = `toast toast--${type} toast--show`;
    toast.innerHTML = `
      <i class="fa-solid ${iconMap[type] || iconMap.info} toast__icon"></i>
      <span class="toast__msg">${message}</span>
    `;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('toast--show');
    }, 3500);
  }

  /* ─── Modal ─── */

  function showModal(contentHTML, options = {}) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    content.innerHTML = contentHTML;
    overlay.classList.remove('hidden');
    overlay.classList.add('modal--show');
    document.body.style.overflow = 'hidden';

    // persistent: không đóng được bằng bấm nền hay phím ESC (chỉ đóng bằng nút trong modal)
    modalPersistent = !!options.persistent;
    overlay.onclick = null;
    if (options.closeOnOverlay !== false && !modalPersistent) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
      };
    }
  }

  function isModalPersistent() {
    return modalPersistent;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    modalPersistent = false;
    overlay.classList.remove('modal--show');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ─── Loading States ─── */

  function showLoading(targetEl, text = 'Đang xử lý...') {
    if (typeof targetEl === 'string') {
      targetEl = document.getElementById(targetEl);
    }
    if (!targetEl) return;

    targetEl.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">${text}</p>
      </div>
    `;
  }

  /**
   * Trạng thái "đang xử lý" của nút: giữ nguyên kích thước, hiện spinner + chữ ngắn
   * (không xóa trắng nội dung nút → không nhấp nháy). Gọi lặp khi đang loading sẽ bị bỏ qua.
   */
  function showInlineLoading(btn, label) {
    if (!btn || btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner loading-spinner--sm loading-spinner--light"></span>` +
      (label ? `<span>${escapeHtml(label)}</span>` : '');
  }

  function hideInlineLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.loading === '1') btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    delete btn.dataset.loading;
  }

  /** Ép về số hữu hạn (dữ liệu từ AI/localStorage luôn coi là không tin cậy trước khi đưa vào HTML). */
  function num(v, fallback = 0) {
    const n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  /* ─── Skeleton Loading ─── */

  function createSkeleton(lines = 3) {
    let html = '<div class="skeleton-container">';
    for (let i = 0; i < lines; i++) {
      const w = 60 + Math.random() * 40;
      html += `<div class="skeleton" style="width:${w}%"></div>`;
    }
    html += '</div>';
    return html;
  }

  /* ─── Number Animation ─── */

  function animateNumber(element, from, to, duration = 800) {
    if (!element) return;
    const start = performance.now();
    const diff = to - from;

    function update(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      
      if (Number.isInteger(to)) {
        element.textContent = Math.round(current).toLocaleString('vi-VN');
      } else {
        element.textContent = current.toFixed(1);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /* ─── Format Helpers ─── */

  function formatNumber(n) {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString('vi-VN');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const todayStr = NF_Storage.getToday();
    
    if (dateStr === todayStr) return 'Hôm nay';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (dateStr === yStr) return 'Hôm qua';

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`;
  }

  function getTimeNow() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  }

  /* ─── Confirm Dialog ─── */

  function confirm(message) {
    return new Promise((resolve) => {
      showModal(`
        <div class="confirm-dialog">
          <div class="confirm-dialog__icon">
            <i class="fa-solid fa-circle-question"></i>
          </div>
          <p class="confirm-dialog__msg">${message}</p>
          <div class="confirm-dialog__actions">
            <button class="btn btn--outline" id="confirm-cancel">Hủy</button>
            <button class="btn btn--danger" id="confirm-ok">Xác nhận</button>
          </div>
        </div>
      `);
      document.getElementById('confirm-ok').onclick = () => { closeModal(); resolve(true); };
      document.getElementById('confirm-cancel').onclick = () => { closeModal(); resolve(false); };
    });
  }

  /* ─── BMI Classification (WHO) ─── */

  function getBMIClass(bmi) {
    // Ngưỡng phân loại BMI dành riêng cho người châu Á (WHO Western Pacific
    // Region, 2000) — chính xác hơn ngưỡng chuẩn phương Tây (25/30) cho thể
    // trạng học sinh Việt Nam, vốn có nguy cơ chuyển hóa cao hơn ở cùng mức BMI.
    if (bmi < 16) return { label: 'Gầy độ III', color: 'danger', icon: 'fa-arrow-down' };
    if (bmi < 17) return { label: 'Gầy độ II', color: 'warning', icon: 'fa-arrow-down' };
    if (bmi < 18.5) return { label: 'Thiếu cân', color: 'warning', icon: 'fa-arrow-down' };
    if (bmi < 23) return { label: 'Bình thường', color: 'success', icon: 'fa-check' };
    if (bmi < 25) return { label: 'Thừa cân (nguy cơ)', color: 'warning', icon: 'fa-arrow-up' };
    if (bmi < 30) return { label: 'Béo phì độ I', color: 'danger', icon: 'fa-arrow-up' };
    if (bmi < 35) return { label: 'Béo phì độ II', color: 'danger', icon: 'fa-arrow-up' };
    return { label: 'Béo phì độ III', color: 'danger', icon: 'fa-arrow-up' };
  }

  /* ─── Meal Type Icons ─── */

  function getMealIcon(type) {
    const map = {
      'Bữa Sáng': '🌅',
      'Bữa Trưa': '☀️',
      'Bữa Tối': '🌙',
      'Bữa Phụ': '🍎',
    };
    return map[type] || '🍽️';
  }

  /**
   * Escape HTML — BẮT BUỘC dùng cho mọi dữ liệu không đáng tin cậy trước khi
   * chèn vào innerHTML: nội dung người dùng tự gõ (ô tìm kiếm...) VÀ nội dung
   * do Gemini AI trả về (tên món ăn, lời khuyên...). AI có thể vô tình hoặc bị
   * "prompt injection" trả về text chứa thẻ HTML/script — nếu không escape,
   * nội dung đó sẽ được trình duyệt thực thi như mã thật (XSS), kể cả khi đã
   * được lưu vào localStorage (lịch sử tra cứu, nhật ký) và chạy lại mỗi lần mở app.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ─── Dark / Light Theme Toggle ─── */

  const THEME_KEY = 'nf_theme';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1c1814' : '#054fd4');
    }
    _updateThemeIcon(theme);
  }

  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  function _updateThemeIcon(theme) {
    const icon = document.getElementById('theme-toggle-icon');
    if (!icon) return;
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  /** Gọi 1 lần lúc khởi động app: đồng bộ icon + gắn sự kiện cho nút toggle trên header */
  function initThemeToggle() {
    _updateThemeIcon(getTheme());
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.onclick = () => {
        const next = toggleTheme();
        showToast(next === 'dark' ? 'Đã bật giao diện tối 🌙' : 'Đã bật giao diện sáng ☀️', 'info');
      };
    }
  }

  return {
    showToast,
    showModal,
    closeModal,
    isModalPersistent,
    num,
    showLoading,
    showInlineLoading,
    hideInlineLoading,
    createSkeleton,
    animateNumber,
    formatNumber,
    formatDate,
    getTimeNow,
    confirm,
    getBMIClass,
    getMealIcon,
    escapeHtml,
    getTheme,
    setTheme,
    toggleTheme,
    initThemeToggle,
  };
})();
