/**
 * NutriFuture — Storage Module
 * Quản lý lưu trữ cục bộ (localStorage) cho toàn bộ dữ liệu ứng dụng.
 * Hỗ trợ export/import JSON để backup dữ liệu.
 */
const NF_Storage = (() => {
  'use strict';

  const KEYS = {
    PROFILE: 'nf_profile_v2',
    DIARY_PREFIX: 'nf_diary_',
    WATER_PREFIX: 'nf_water_',
    LOOKUP_HISTORY: 'nf_lookup_history',
    ONBOARDED: 'nf_onboarded',
  };

  /* ─── Helpers ─── */

  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Storage] Parse error for key:', key, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] Save error for key:', key, e);
    }
  }

  /** Trả về chuỗi ngày dạng YYYY-MM-DD */
  function _dateKey(date) {
    if (!date) date = new Date();
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /* ─── Profile ─── */

  function saveProfile(data) {
    data.updatedAt = new Date().toISOString();
    _set(KEYS.PROFILE, data);
  }

  function getProfile() {
    return _get(KEYS.PROFILE);
  }

  /* ─── Onboarding ─── */

  function isOnboarded() {
    return localStorage.getItem(KEYS.ONBOARDED) === 'true';
  }

  function setOnboarded() {
    localStorage.setItem(KEYS.ONBOARDED, 'true');
  }

  /* ─── Diary (theo ngày) ─── */

  function getDiary(date) {
    const key = KEYS.DIARY_PREFIX + _dateKey(date);
    return _get(key) || [];
  }

  function saveDiary(date, entries) {
    const key = KEYS.DIARY_PREFIX + _dateKey(date);
    _set(key, entries);
  }

  function addDiaryEntry(entry, date) {
    const d = date || new Date();
    const entries = getDiary(d);
    entry.id = Date.now() + Math.random();
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveDiary(d, entries);
    return entry;
  }

  function removeDiaryEntry(entryId, date) {
    const d = date || new Date();
    let entries = getDiary(d);
    entries = entries.filter(e => e.id !== entryId);
    saveDiary(d, entries);
  }

  /* ─── Water Tracking (theo ngày) ─── */

  function getWater(date) {
    const key = KEYS.WATER_PREFIX + _dateKey(date);
    return parseFloat(localStorage.getItem(key)) || 0;
  }

  function addWater(amountMl, date) {
    const d = date || new Date();
    const key = KEYS.WATER_PREFIX + _dateKey(d);
    const current = getWater(d);
    const newVal = current + amountMl;
    localStorage.setItem(key, String(newVal));
    return newVal;
  }

  function setWater(amountMl, date) {
    const key = KEYS.WATER_PREFIX + _dateKey(date || new Date());
    localStorage.setItem(key, String(amountMl));
  }

  /* ─── Lookup History ─── */

  function getLookupHistory() {
    return _get(KEYS.LOOKUP_HISTORY) || [];
  }

  function addLookupHistory(item) {
    const history = getLookupHistory();
    // Giới hạn 20 mục gần nhất
    history.unshift({ ...item, searchedAt: new Date().toISOString() });
    if (history.length > 20) history.pop();
    _set(KEYS.LOOKUP_HISTORY, history);
  }

  /* ─── Lấy tất cả ngày có dữ liệu diary ─── */

  function getAllDiaryDates() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEYS.DIARY_PREFIX)) {
        dates.push(key.replace(KEYS.DIARY_PREFIX, ''));
      }
    }
    return dates.sort().reverse();
  }

  /* ─── Diary summary cho 1 ngày ─── */

  function getDiarySummary(date) {
    const entries = getDiary(date);
    const water = getWater(date);
    let totalCal = 0, totalP = 0, totalF = 0, totalC = 0, totalFiber = 0;
    entries.forEach(e => {
      totalCal += e.calories || 0;
      totalP += e.protein || 0;
      totalF += e.fat || 0;
      totalC += e.carb || 0;
      totalFiber += e.fiber || 0;
    });
    return {
      date: _dateKey(date),
      entries,
      count: entries.length,
      totalCalories: Math.round(totalCal),
      totalProtein: Math.round(totalP * 10) / 10,
      totalFat: Math.round(totalF * 10) / 10,
      totalCarb: Math.round(totalC * 10) / 10,
      totalFiber: Math.round(totalFiber * 10) / 10,
      waterMl: water
    };
  }

  /* ─── Export / Import ─── */

  function exportAll() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      onboarded: isOnboarded(),
      lookupHistory: getLookupHistory(),
      diary: {},
      water: {}
    };

    // Thu thập tất cả diary entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEYS.DIARY_PREFIX)) {
        const date = key.replace(KEYS.DIARY_PREFIX, '');
        data.diary[date] = _get(key);
      }
      if (key && key.startsWith(KEYS.WATER_PREFIX)) {
        const date = key.replace(KEYS.WATER_PREFIX, '');
        data.water[date] = parseFloat(localStorage.getItem(key)) || 0;
      }
    }

    return data;
  }

  function downloadExport() {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrifuture_backup_${_dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      
      if (data.version !== 2) {
        throw new Error('Phiên bản backup không tương thích');
      }

      if (data.profile) saveProfile(data.profile);
      if (data.onboarded) setOnboarded();
      if (data.lookupHistory) _set(KEYS.LOOKUP_HISTORY, data.lookupHistory);

      if (data.diary) {
        Object.entries(data.diary).forEach(([date, entries]) => {
          _set(KEYS.DIARY_PREFIX + date, entries);
        });
      }
      if (data.water) {
        Object.entries(data.water).forEach(([date, amount]) => {
          localStorage.setItem(KEYS.WATER_PREFIX + date, String(amount));
        });
      }

      return { success: true };
    } catch (e) {
      console.error('[Storage] Import error:', e);
      return { success: false, error: e.message };
    }
  }

  /* ─── Migration từ v1 ─── */

  function migrateFromV1() {
    const oldData = _get('nutrifuture_mobile_v1');
    if (!oldData) return false;

    try {
      // Migrate profile
      if (oldData.user) {
        saveProfile({
          name: oldData.user.name || '',
          age: oldData.user.age || 17,
          gender: oldData.user.gender || 'male',
          height: oldData.user.height || 0,
          weight: oldData.user.weight || 0,
          activity: oldData.user.activity || 1.55,
          bmi: oldData.user.bmi || 0,
          tdee: oldData.user.tdee || 0,
          waterTarget: oldData.user.waterTarget || 2.0,
        });
        setOnboarded();
      }

      // Migrate diary entries (lưu vào ngày hôm nay)
      if (oldData.diary && oldData.diary.length > 0) {
        const today = _dateKey();
        const existing = getDiary(today);
        oldData.diary.forEach(item => {
          existing.push({
            id: item.id || Date.now() + Math.random(),
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            fat: item.fat || 0,
            carb: item.carb || 0,
            fiber: 0,
            mealType: item.mealType || 'Khác',
            time: item.time || '',
            source: 'migrated',
            createdAt: new Date().toISOString()
          });
        });
        saveDiary(today, existing);
      }

      // Đánh dấu đã migrate
      localStorage.removeItem('nutrifuture_mobile_v1');
      console.log('[Storage] Migration from v1 complete');
      return true;
    } catch (e) {
      console.error('[Storage] Migration error:', e);
      return false;
    }
  }

  /* ─── Public API ─── */

  return {
    // Profile
    saveProfile,
    getProfile,
    // Onboarding
    isOnboarded,
    setOnboarded,
    // Diary
    getDiary,
    saveDiary,
    addDiaryEntry,
    removeDiaryEntry,
    getDiarySummary,
    getAllDiaryDates,
    // Water
    getWater,
    addWater,
    setWater,
    // Lookup
    getLookupHistory,
    addLookupHistory,
    // Export/Import
    exportAll,
    downloadExport,
    importData,
    // Migration
    migrateFromV1,
    // Utility
    getToday: () => _dateKey(),
  };
})();
