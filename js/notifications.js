/**
 * NutriFuture — Notifications Module
 * Nhắc uống nước định kỳ + nhắc ghi nhật ký bữa ăn cuối ngày, dùng Notification API.
 *
 * GIỚI HẠN QUAN TRỌNG (vì đây là static site không có server push):
 * - Thông báo chỉ hoạt động khi app đang MỞ trên trình duyệt/thiết bị (tab nền vẫn OK
 *   trên desktop Chrome/Edge, nhưng khi đóng hẳn app hoặc tắt màn hình trên điện thoại
 *   thì sẽ KHÔNG có thông báo nào được gửi — do không có Web Push server đứng sau).
 * - Trên iOS Safari, Notification API chỉ khả dụng khi đã "Thêm vào MH chính" (PWA)
 *   từ iOS 16.4 trở lên; các trình duyệt/di động khác nhìn chung hỗ trợ tốt hơn.
 */
const NF_Notifications = (() => {
  'use strict';

  const KEYS = {
    ENABLED: 'nf_notif_enabled',
    INTERVAL_HOURS: 'nf_notif_water_interval_h',
    LAST_WATER_NOTIF: 'nf_notif_last_water_at',
    LAST_DIARY_NOTIF_DATE: 'nf_notif_last_diary_date',
  };

  const DEFAULT_INTERVAL_HOURS = 2;
  const ACTIVE_HOUR_START = 6;   // Không làm phiền trước 6h sáng
  const ACTIVE_HOUR_END = 22;    // và sau 22h đêm
  const DIARY_REMINDER_HOUR = 20; // 20h nhắc ghi nhật ký nếu chưa ghi gì

  let tickTimer = null;

  /* ─── Trạng thái bật/tắt & cấu hình ─── */

  function isSupported() {
    return typeof Notification !== 'undefined';
  }

  function isEnabled() {
    return localStorage.getItem(KEYS.ENABLED) === 'true';
  }

  function setEnabled(val) {
    localStorage.setItem(KEYS.ENABLED, val ? 'true' : 'false');
    if (val) start();
    else stop();
  }

  function getPermission() {
    return isSupported() ? Notification.permission : 'unsupported';
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (e) {
      console.warn('[Notifications] requestPermission error:', e);
      return 'denied';
    }
  }

  function getIntervalHours() {
    return parseFloat(localStorage.getItem(KEYS.INTERVAL_HOURS)) || DEFAULT_INTERVAL_HOURS;
  }

  function setIntervalHours(hours) {
    localStorage.setItem(KEYS.INTERVAL_HOURS, String(hours));
  }

  /* ─── Gửi thông báo (ưu tiên qua Service Worker để có icon đẹp hơn) ─── */

  async function _send(title, body, tag) {
    if (!isSupported() || Notification.permission !== 'granted') return;

    const options = {
      body,
      tag,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      renotify: false,
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, options);
          return;
        }
      }
      new Notification(title, options);
    } catch (e) {
      console.warn('[Notifications] Gửi thất bại:', e);
    }
  }

  function _isWithinActiveHours() {
    const h = new Date().getHours();
    return h >= ACTIVE_HOUR_START && h < ACTIVE_HOUR_END;
  }

  /* ─── Kiểm tra định kỳ (chạy mỗi phút) ─── */

  function _checkWaterReminder() {
    if (!_isWithinActiveHours()) return;

    const intervalMs = getIntervalHours() * 60 * 60 * 1000;
    const lastAt = parseInt(localStorage.getItem(KEYS.LAST_WATER_NOTIF), 10) || 0;
    const now = Date.now();

    if (now - lastAt < intervalMs) return;

    localStorage.setItem(KEYS.LAST_WATER_NOTIF, String(now));
    _send(
      '💧 Đến giờ uống nước rồi!',
      'Uống 1 ly nước (~250ml) giúp bạn tỉnh táo hơn để học tập nhé.',
      'nf-water-reminder'
    );
  }

  function _checkDiaryReminder() {
    const now = new Date();
    if (now.getHours() < DIARY_REMINDER_HOUR) return;

    const todayStr = NF_Storage.getToday();
    const lastNotifDate = localStorage.getItem(KEYS.LAST_DIARY_NOTIF_DATE);
    if (lastNotifDate === todayStr) return; // đã nhắc hôm nay rồi

    const summary = NF_Storage.getDiarySummary(todayStr);
    if (summary.count > 0) {
      // Đã ghi rồi thì không cần nhắc, nhưng vẫn đánh dấu để khỏi kiểm tra lại nhiều lần trong ngày
      localStorage.setItem(KEYS.LAST_DIARY_NOTIF_DATE, todayStr);
      return;
    }

    localStorage.setItem(KEYS.LAST_DIARY_NOTIF_DATE, todayStr);
    _send(
      '📝 Bạn chưa ghi nhật ký hôm nay',
      'Đừng quên ghi lại các bữa ăn trong ngày để theo dõi dinh dưỡng chính xác nhé!',
      'nf-diary-reminder'
    );
  }

  function _tick() {
    if (!isEnabled() || getPermission() !== 'granted') return;
    _checkWaterReminder();
    _checkDiaryReminder();
  }

  /* ─── Vòng đời ─── */

  function start() {
    if (tickTimer) return; // đã chạy rồi
    if (!isSupported()) return;
    // Kiểm tra ngay 1 lần rồi lặp lại mỗi phút — đủ mịn cho khoảng nhắc theo giờ
    _tick();
    tickTimer = setInterval(_tick, 60 * 1000);
  }

  function stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function init() {
    if (isEnabled() && getPermission() === 'granted') {
      start();
    }
  }

  return {
    isSupported,
    isEnabled,
    setEnabled,
    getPermission,
    requestPermission,
    getIntervalHours,
    setIntervalHours,
    init,
    start,
    stop,
  };
})();
