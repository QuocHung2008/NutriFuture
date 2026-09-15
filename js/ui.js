/**
 * NutriFuture — UI Utilities
 * Toast notifications, modals, loading states, number animations.
 */
const NF_UI = (() => {
  'use strict';

  let toastTimer = null;

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

    if (options.closeOnOverlay !== false) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
      };
    }
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
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

  function showInlineLoading(btn) {
    if (!btn) return;
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="loading-spinner loading-spinner--sm"></div>`;
  }

  function hideInlineLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
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
    if (bmi < 16) return { label: 'Gầy độ III', color: 'danger', icon: 'fa-arrow-down' };
    if (bmi < 17) return { label: 'Gầy độ II', color: 'warning', icon: 'fa-arrow-down' };
    if (bmi < 18.5) return { label: 'Thiếu cân', color: 'warning', icon: 'fa-arrow-down' };
    if (bmi < 25) return { label: 'Bình thường', color: 'success', icon: 'fa-check' };
    if (bmi < 30) return { label: 'Thừa cân', color: 'warning', icon: 'fa-arrow-up' };
    if (bmi < 35) return { label: 'Béo phì I', color: 'danger', icon: 'fa-arrow-up' };
    if (bmi < 40) return { label: 'Béo phì II', color: 'danger', icon: 'fa-arrow-up' };
    return { label: 'Béo phì III', color: 'danger', icon: 'fa-arrow-up' };
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

  return {
    showToast,
    showModal,
    closeModal,
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
  };
})();
