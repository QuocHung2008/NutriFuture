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
    DIARY_INDEX: 'nf_diary_dates_index',
    WATER_INDEX: 'nf_water_dates_index',
    GAME: 'nf_game',
  };

  /* Giới hạn hợp lệ của hồ sơ (đối tượng: học sinh 15–22 tuổi theo yêu cầu đề tài) */
  const PROFILE_LIMITS = {
    age: { min: 15, max: 22, label: 'Tuổi' },
    height: { min: 120, max: 220, label: 'Chiều cao (cm)' },
    weight: { min: 30, max: 150, label: 'Cân nặng (kg)' },
  };

  /** Phát sự kiện toàn cục để module khác (game...) lắng nghe mà không cần móc vào từng nơi gọi. */
  function _emit(name, detail) {
    try {
      if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
      }
    } catch (e) { /* không để lỗi sự kiện làm hỏng việc lưu dữ liệu */ }
  }

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
    _emit('nf:profile', {});
  }

  /**
   * Kiểm tra dữ liệu hồ sơ. Trả về { ok, errors: { field: 'thông báo' } }.
   * Dùng chung cho form Hồ sơ (báo lỗi từng ô) và cổng chặn (hasValidProfile).
   */
  function validateProfile(p) {
    const errors = {};
    p = p || {};
    if (p.gender !== 'male' && p.gender !== 'female') errors.gender = 'Vui lòng chọn giới tính';
    ['age', 'height', 'weight'].forEach((f) => {
      const lim = PROFILE_LIMITS[f];
      const v = Number(p[f]);
      if (p[f] === '' || p[f] == null || !isFinite(v) || v < lim.min || v > lim.max) {
        errors[f] = `${lim.label} phải từ ${lim.min} đến ${lim.max}`;
      }
    });
    return { ok: Object.keys(errors).length === 0, errors };
  }

  /** Hồ sơ đã lưu có hợp lệ và đã tính đủ chỉ số (tdee > 0) không — cổng chặn dùng hàm này, KHÔNG dùng cờ. */
  function hasValidProfile() {
    const p = getProfile();
    return !!p && validateProfile(p).ok && Number(p.tdee) > 0;
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

  /**
   * Index các ngày có dữ liệu (diary/water), tránh phải duyệt tuyến tính toàn bộ
   * localStorage mỗi lần gọi getAllDiaryDates()/exportAll() — quan trọng khi dùng
   * app lâu dài qua nhiều tháng thi, số lượng ngày lưu trữ sẽ tăng dần.
   * Tự "rebuild" 1 lần duy nhất nếu người dùng nâng cấp từ bản chưa có index.
   */
  function _getIndex(indexKey, prefix, isNonEmpty) {
    const idx = _get(indexKey);
    if (idx && Array.isArray(idx)) return idx;
    return _rebuildIndex(indexKey, prefix, isNonEmpty);
  }

  function _rebuildIndex(indexKey, prefix, isNonEmpty) {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const date = key.replace(prefix, '');
        if (isNonEmpty(key)) dates.push(date);
      }
    }
    dates.sort();
    _set(indexKey, dates);
    return dates;
  }

  function _updateIndex(indexKey, prefix, isNonEmpty, date) {
    const idx = _getIndex(indexKey, prefix, isNonEmpty);
    const pos = idx.indexOf(date);
    const shouldBeIn = isNonEmpty(prefix + date);

    if (shouldBeIn && pos === -1) {
      idx.push(date);
      idx.sort();
      _set(indexKey, idx);
    } else if (!shouldBeIn && pos !== -1) {
      idx.splice(pos, 1);
      _set(indexKey, idx);
    }
  }

  function _diaryIndexPredicate(key) {
    const entries = _get(key);
    return Array.isArray(entries) && entries.length > 0;
  }

  function _waterIndexPredicate(key) {
    return (parseFloat(localStorage.getItem(key)) || 0) > 0;
  }

  /* ─── Diary (theo ngày) ─── */

  function getDiary(date) {
    const key = KEYS.DIARY_PREFIX + _dateKey(date);
    return _get(key) || [];
  }

  function saveDiary(date, entries) {
    const dateStr = _dateKey(date);
    const key = KEYS.DIARY_PREFIX + dateStr;
    _set(key, entries);
    _updateIndex(KEYS.DIARY_INDEX, KEYS.DIARY_PREFIX, _diaryIndexPredicate, dateStr);
  }

  function addDiaryEntry(entry, date) {
    const d = date || new Date();
    const entries = getDiary(d);
    entry.id = Date.now() + Math.random();
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveDiary(d, entries);
    _emit('nf:diary', { action: 'add', date: _dateKey(d), entry });
    return entry;
  }

  function removeDiaryEntry(entryId, date) {
    const d = date || new Date();
    let entries = getDiary(d);
    entries = entries.filter(e => e.id !== entryId);
    saveDiary(d, entries);
    _emit('nf:diary', { action: 'remove', date: _dateKey(d) });
  }

  /* ─── Water Tracking (theo ngày) ─── */

  function getWater(date) {
    const key = KEYS.WATER_PREFIX + _dateKey(date);
    return parseFloat(localStorage.getItem(key)) || 0;
  }

  function addWater(amountMl, date) {
    const d = date || new Date();
    const dateStr = _dateKey(d);
    const key = KEYS.WATER_PREFIX + dateStr;
    const current = getWater(d);
    const newVal = current + amountMl;
    localStorage.setItem(key, String(newVal));
    _updateIndex(KEYS.WATER_INDEX, KEYS.WATER_PREFIX, _waterIndexPredicate, dateStr);
    _emit('nf:water', { date: dateStr });
    return newVal;
  }

  function setWater(amountMl, date) {
    const dateStr = _dateKey(date || new Date());
    const key = KEYS.WATER_PREFIX + dateStr;
    localStorage.setItem(key, String(amountMl));
    _updateIndex(KEYS.WATER_INDEX, KEYS.WATER_PREFIX, _waterIndexPredicate, dateStr);
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
    _emit('nf:lookup', { name: item && item.name });
  }

  /** Cập nhật mục tra cứu mới nhất (dùng khi nhận xét AI đến sau khi kết quả đã hiển thị/lưu). */
  function updateLatestLookup(patch) {
    const history = getLookupHistory();
    if (!history.length) return;
    history[0] = { ...history[0], ...patch, searchedAt: history[0].searchedAt };
    _set(KEYS.LOOKUP_HISTORY, history);
  }

  /* ─── Game (điểm, huy hiệu, chuỗi ngày, câu đố) — được sanitize lại khi đọc ở NF_Game ─── */

  function getGame() { return _get(KEYS.GAME); }
  function saveGame(state) { _set(KEYS.GAME, state); }

  /* ─── Lấy tất cả ngày có dữ liệu diary (đọc từ index — O(1) thay vì quét toàn bộ localStorage) ─── */

  function getAllDiaryDates() {
    return _getIndex(KEYS.DIARY_INDEX, KEYS.DIARY_PREFIX, _diaryIndexPredicate).slice().sort().reverse();
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
      game: getGame(),
      diary: {},
      water: {}
    };

    // Đọc từ index thay vì quét toàn bộ localStorage — nhanh hơn nhiều khi dữ liệu
    // đã tích lũy qua nhiều tháng thi.
    _getIndex(KEYS.DIARY_INDEX, KEYS.DIARY_PREFIX, _diaryIndexPredicate).forEach((date) => {
      data.diary[date] = getDiary(date);
    });
    _getIndex(KEYS.WATER_INDEX, KEYS.WATER_PREFIX, _waterIndexPredicate).forEach((date) => {
      data.water[date] = getWater(date);
    });

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

  /**
   * Nhập dữ liệu backup theo cơ chế switch-case theo version, cho phép mở rộng
   * hỗ trợ nhiều định dạng backup cũ mà không cần đổi hàm gọi ở nơi khác.
   * Thêm định dạng mới trong tương lai: thêm 1 case + hàm _importVN() riêng.
   */
  function importData(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const version = data.version;

      switch (version) {
        case 2:
          return _importV2(data);
        case 1:
          return _importV1Backup(data);
        default:
          throw new Error(
            `Phiên bản backup không được hỗ trợ (version=${version ?? 'không xác định'}). ` +
            `Vui lòng dùng file backup được xuất từ chính ứng dụng NutriFuture.`
          );
      }
    } catch (e) {
      console.error('[Storage] Import error:', e);
      return { success: false, error: e.message };
    }
  }

  /** Định dạng backup hiện tại (v2): dữ liệu diary/water tách theo từng ngày */
  function _importV2(data) {
    if (data.profile) saveProfile(data.profile);
    if (data.onboarded) setOnboarded();
    if (data.lookupHistory) _set(KEYS.LOOKUP_HISTORY, data.lookupHistory);

    if (data.game && typeof data.game === 'object') _set(KEYS.GAME, data.game);

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
    // Ghi thẳng vào localStorage ở trên không đi qua saveDiary/addWater nên index ngày không
    // được cập nhật → Lịch sử/Báo cáo sẽ "mất" dữ liệu vừa nhập. Dựng lại index sau khi nhập.
    _rebuildIndex(KEYS.DIARY_INDEX, KEYS.DIARY_PREFIX, _diaryIndexPredicate);
    _rebuildIndex(KEYS.WATER_INDEX, KEYS.WATER_PREFIX, _waterIndexPredicate);

    return { success: true, migratedFrom: 2 };
  }

  /**
   * Định dạng backup v1 (bản mobile cũ trước khi tách diary theo ngày):
   * { version: 1, user: {...}, diary: [...] } — không có nước uống theo ngày.
   * Toàn bộ món ăn trong backup sẽ được gộp vào ngày hôm nay lúc import.
   */
  function _importV1Backup(data) {
    if (data.user) {
      saveProfile({
        name: data.user.name || '',
        age: data.user.age || 17,
        gender: data.user.gender || 'male',
        height: data.user.height || 0,
        weight: data.user.weight || 0,
        activity: data.user.activity || 1.55,
        bmi: data.user.bmi || 0,
        tdee: data.user.tdee || 0,
        waterMl: data.user.waterTarget ? Math.round(data.user.waterTarget * 1000) : 2000,
      });
      setOnboarded();
    }

    if (Array.isArray(data.diary) && data.diary.length > 0) {
      const today = _dateKey();
      const existing = getDiary(today);
      data.diary.forEach((item) => {
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
          source: 'imported_v1',
          createdAt: new Date().toISOString(),
        });
      });
      saveDiary(today, existing);
    }

    return {
      success: true,
      migratedFrom: 1,
      note: 'Backup v1 không có phân chia theo ngày — toàn bộ món ăn đã được gộp vào hôm nay.',
    };
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
    validateProfile,
    hasValidProfile,
    PROFILE_LIMITS,
    // Game
    getGame,
    saveGame,
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
    updateLatestLookup,
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
