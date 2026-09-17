/**
 * NutriFuture — Lookup Page (Tra cứu Dinh Dưỡng AI)
 * Tra cứu thông tin calo, macro, vi chất và lời khuyên dinh dưỡng bằng Gemini Text API
 */
const NF_PageLookup = (() => {
  'use strict';

  let currentResult = null;

  function render(container) {
    currentResult = null;
    const history = NF_Storage.getLookupHistory();
    const hasApiKey = NF_Gemini.isConfigured();

    const popularChips = [
      'Phở bò tái',
      'Cơm tấm sườn bì',
      'Bánh mì kẹp thịt',
      'Bún chả Hà Nội',
      'Canh chua cá lóc',
      'Trà sữa trân châu',
      'Trứng ốp la 2 quả',
      'Sữa tươi 200ml'
    ];

    container.innerHTML = `
      <div class="page page--lookup">
        <div class="page__header">
          <div class="section-label">Cơ sở Dữ liệu Tri thức AI</div>
          <h1 class="page-title">Tra cứu Dinh dưỡng</h1>
          <p class="text-sm text-muted">Hỏi AI thành phần dinh dưỡng chuẩn xác của mọi món ăn Việt Nam</p>
        </div>

        <div class="page__body">
          ${!hasApiKey ? `
            <div class="card setup-card" style="margin-bottom:var(--sp-4);">
              <div class="setup-card__icon"><i class="fa-solid fa-key" style="color:var(--amber-600);"></i></div>
              <h3 class="setup-card__title">Cần Google Gemini API Key</h3>
              <p class="setup-card__desc">
                Tính năng tra cứu cần API Key để kết nối với Gemini AI.
              </p>
              <button class="btn btn--primary" id="btn-quick-config-lookup">
                <i class="fa-solid fa-gear"></i> Nhập API Key ngay
              </button>
            </div>
          ` : ''}

          <!-- Grid Layout -->
          <div class="grid-2-desktop">
            <!-- Cột trái: Tìm kiếm & Kết quả -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <!-- Search Bar -->
          <div class="card" style="padding:var(--sp-3);">
            <form id="form-search-food" class="search-bar" onsubmit="return false;">
              <i class="fa-solid fa-magnifying-glass search-bar__icon"></i>
              <input 
                type="text" 
                id="input-food-query" 
                class="search-bar__input" 
                placeholder="Nhập tên món ăn (vd: Phở bò, Cơm gà...)" 
                autocomplete="off"
              />
              <button type="submit" class="search-bar__btn" id="btn-submit-search">
                <i class="fa-solid fa-sparkles"></i> Tra cứu
              </button>
            </form>

            <!-- Popular Suggestion Chips -->
            <div style="margin-top:var(--sp-3);">
              <div class="card__label">GỢI Ý TÌM KIẾM NHANH</div>
              <div style="display:flex; flex-wrap:wrap; gap:var(--sp-2); margin-top:0.25rem;">
                ${popularChips.map(chip => `
                  <button type="button" class="tag tag--primary chip-btn" data-query="${chip}" style="cursor:pointer; border:none; padding:0.25rem 0.625rem;">
                    ${chip}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Result Container -->
          <div id="lookup-result-area"></div>

            </div> <!-- Close left column -->

            <!-- Cột phải: Lịch sử -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <!-- History Section -->
              <div class="card" id="lookup-history-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-3);">
              <div class="section-label" style="margin-bottom:0;">LỊCH SỬ TRA CỨU GẦN ĐÂY</div>
              ${history.length > 0 ? `
                <button class="btn btn--outline btn--sm" id="btn-clear-history" style="font-size:var(--fs-xs); padding:0.125rem 0.5rem;">
                  <i class="fa-solid fa-trash-can"></i> Xóa lịch sử
                </button>
              ` : ''}
            </div>

            <div id="lookup-history-list" class="lookup-history">
              ${history.length > 0 ? history.map((item, idx) => `
                <div class="lookup-history__item" data-idx="${idx}">
                  <div>
                    <div style="font-weight:700; color:var(--slate-900);">${NF_UI.escapeHtml(item.name)}</div>
                    <div class="text-xs text-muted">${NF_UI.escapeHtml(item.serving || '1 phần')} • ${NF_UI.escapeHtml(item.foodGroup || 'Dinh dưỡng')}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:800; color:var(--primary-700);">${item.calories} kcal</div>
                    <span class="text-xs text-muted"><i class="fa-solid fa-chevron-right"></i></span>
                  </div>
                </div>
              `).join('') : `
                <div style="text-align:center; padding:var(--sp-4) 0; color:var(--slate-400);">
                  <p class="text-xs">Chưa có lịch sử tra cứu nào.</p>
                </div>
              `}
            </div>
              </div>
            </div> <!-- Close right column -->
          </div> <!-- Close grid-2-desktop -->
        </div>
      </div>
    `;

    setupEvents(container, history);
  }

  function setupEvents(container, history) {
    const form = container.querySelector('#form-search-food');
    const input = container.querySelector('#input-food-query');
    const btnSubmit = container.querySelector('#btn-submit-search');
    const resultArea = container.querySelector('#lookup-result-area');
    const chips = container.querySelectorAll('.chip-btn');
    const historyItems = container.querySelectorAll('.lookup-history__item');
    const btnClearHistory = container.querySelector('#btn-clear-history');
    const btnQuickConfig = container.querySelector('#btn-quick-config-lookup');

    if (btnQuickConfig) {
      btnQuickConfig.onclick = NF_PageCamera.showApiKeyModal;
    }

    // Submit handler
    const doSearch = async (query) => {
      const q = (query || input.value || '').trim();
      if (!q) {
        NF_UI.showToast('Vui lòng nhập tên món ăn cần tra cứu', 'warning');
        return;
      }

      if (!NF_Gemini.isConfigured()) {
        NF_PageCamera.showApiKeyModal();
        return;
      }

      input.value = q;
      NF_UI.showInlineLoading(btnSubmit);
      resultArea.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Gemini AI đang tra cứu dữ liệu dinh dưỡng cho "${NF_UI.escapeHtml(q)}"...</p>
        </div>
      `;

      try {
        const data = await NF_Gemini.searchFood(q);
        currentResult = data;
        NF_UI.hideInlineLoading(btnSubmit);
        renderResult(resultArea, data);

        // Lưu vào history
        NF_Storage.addLookupHistory(data);
        NF_UI.showToast(`Đã tìm thấy thông tin cho "${NF_UI.escapeHtml(data.name)}"`, 'success');
      } catch (err) {
        console.error('Search error:', err);
        NF_UI.hideInlineLoading(btnSubmit);
        const msg = NF_Gemini.getErrorMessage(err);
        resultArea.innerHTML = `
          <div class="advice-box advice-box--warning" style="margin-top:var(--sp-3);">
            <div style="font-weight:700; margin-bottom:var(--sp-1);">
              <i class="fa-solid fa-triangle-exclamation"></i> Không thể tra cứu món ăn
            </div>
            <p>${msg}</p>
            <div style="margin-top:var(--sp-3);">
              <button class="btn btn--outline btn--sm" id="btn-retry-search">
                <i class="fa-solid fa-rotate-right"></i> Thử lại
              </button>
            </div>
          </div>
        `;
        const retryBtn = resultArea.querySelector('#btn-retry-search');
        if (retryBtn) retryBtn.onclick = () => doSearch(q);
      }
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      doSearch();
    };

    chips.forEach(chip => {
      chip.onclick = () => {
        const q = chip.dataset.query;
        doSearch(q);
      };
    });

    historyItems.forEach(item => {
      item.onclick = () => {
        const idx = parseInt(item.dataset.idx, 10);
        if (history[idx]) {
          currentResult = history[idx];
          renderResult(resultArea, history[idx]);
          // Scroll smoothly to result
          resultArea.scrollIntoView({ behavior: 'smooth' });
        }
      };
    });

    if (btnClearHistory) {
      btnClearHistory.onclick = async () => {
        const confirmed = await NF_UI.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu?');
        if (confirmed) {
          localStorage.removeItem('nf_lookup_history');
          render(container);
          NF_UI.showToast('Đã xóa lịch sử tra cứu', 'info');
        }
      };
    }
  }

  function renderResult(targetEl, data) {
    const hour = new Date().getHours();
    let defaultMeal = 'Bữa Trưa';
    if (hour >= 5 && hour < 10) defaultMeal = 'Bữa Sáng';
    else if (hour >= 10 && hour < 14) defaultMeal = 'Bữa Trưa';
    else if (hour >= 14 && hour < 17) defaultMeal = 'Bữa Phụ';
    else defaultMeal = 'Bữa Tối';

    targetEl.innerHTML = `
      <div class="result-card" style="margin-top:var(--sp-3); animation:fadeIn var(--duration-normal) var(--ease-out);">
        <div class="result-card__header">
          <div>
            <span class="result-card__badge" style="background:var(--blue-50); color:var(--blue-700); border-color:var(--blue-200);">
              <i class="fa-solid fa-sparkles"></i> Dữ liệu Gemini AI
            </span>
            <h2 class="result-card__name" style="margin-top:0.25rem;">${NF_UI.escapeHtml(data.name)}</h2>
            <div class="result-card__serving">
              <i class="fa-solid fa-bowl-food"></i> Khẩu phần: ${NF_UI.escapeHtml(data.serving)}
            </div>
          </div>
          <div style="text-align:right;">
            <div class="result-card__calories">${data.calories}</div>
            <span class="result-card__cal-unit">kcal / phần</span>
          </div>
        </div>

        <!-- Nutrient Grid -->
        <div class="nutrient-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:var(--sp-3);">
          <div class="nutrient-box">
            <div class="nutrient-box__label">Carb</div>
            <div class="nutrient-box__value" style="color:var(--blue-600);">${data.carb}g</div>
          </div>
          <div class="nutrient-box">
            <div class="nutrient-box__label">Protein</div>
            <div class="nutrient-box__value" style="color:var(--primary-600);">${data.protein}g</div>
          </div>
          <div class="nutrient-box">
            <div class="nutrient-box__label">Fat</div>
            <div class="nutrient-box__value" style="color:var(--amber-600);">${data.fat}g</div>
          </div>
          <div class="nutrient-box">
            <div class="nutrient-box__label">Chất xơ</div>
            <div class="nutrient-box__value" style="color:var(--primary-700);">${data.fiber}g</div>
          </div>
        </div>

        <!-- Details -->
        <div style="display:flex; flex-direction:column; gap:var(--sp-2); margin-bottom:var(--sp-3);">
          ${data.foodGroup ? `
            <div class="text-xs text-muted">
              <strong>Nhóm thực phẩm:</strong> ${NF_UI.escapeHtml(data.foodGroup)}
            </div>
          ` : ''}

          ${(data.vitamins && data.vitamins.length > 0) || (data.minerals && data.minerals.length > 0) ? `
            <div class="micro-info">
              <i class="fa-solid fa-apple-whole"></i>
              ${data.vitamins && data.vitamins.length ? `<strong>Vitamin:</strong> ${NF_UI.escapeHtml(data.vitamins.join(', '))}. ` : ''}
              ${data.minerals && data.minerals.length ? `<strong>Khoáng chất:</strong> ${NF_UI.escapeHtml(data.minerals.join(', '))}.` : ''}
            </div>
          ` : ''}

          ${data.advice ? `
            <div class="advice-box advice-box--success">
              <i class="fa-solid fa-lightbulb"></i>
              <strong>Lời khuyên cho học sinh:</strong> ${NF_UI.escapeHtml(data.advice)}
            </div>
          ` : ''}
        </div>

        <!-- Save Action -->
        <div class="card card--glass" style="background:var(--white); border:1px solid var(--slate-200); padding:var(--sp-3);">
          <div style="font-weight:700; font-size:var(--fs-sm); margin-bottom:var(--sp-2);">
            Lưu món ăn này vào nhật ký hôm nay
          </div>
          <div style="display:flex; gap:var(--sp-2); align-items:center;">
            <select id="lookup-meal-select" class="search-bar__input" style="padding:0.5rem var(--sp-2); width:auto; flex:1;">
              <option value="Bữa Sáng" ${defaultMeal === 'Bữa Sáng' ? 'selected' : ''}>🌅 Bữa Sáng</option>
              <option value="Bữa Trưa" ${defaultMeal === 'Bữa Trưa' ? 'selected' : ''}>☀️ Bữa Trưa</option>
              <option value="Bữa Tối" ${defaultMeal === 'Bữa Tối' ? 'selected' : ''}>🌙 Bữa Tối</option>
              <option value="Bữa Phụ" ${defaultMeal === 'Bữa Phụ' ? 'selected' : ''}>🍎 Bữa Phụ</option>
            </select>
            <button class="btn btn--primary" id="btn-save-lookup-diary" style="white-space:nowrap;">
              <i class="fa-solid fa-bookmark"></i> Lưu vào nhật ký
            </button>
          </div>
        </div>
      </div>
    `;

    const btnSave = targetEl.querySelector('#btn-save-lookup-diary');
    const mealSelect = targetEl.querySelector('#lookup-meal-select');

    if (btnSave) {
      btnSave.onclick = () => {
        const mealType = mealSelect ? mealSelect.value : 'Bữa ăn';
        const entry = {
          name: data.name,
          serving: data.serving,
          calories: data.calories,
          protein: data.protein,
          fat: data.fat,
          carb: data.carb,
          fiber: data.fiber,
          mealType: mealType,
          source: 'lookup',
          time: NF_UI.getTimeNow(),
        };

        NF_Storage.addDiaryEntry(entry, NF_Storage.getToday());
        NF_UI.showToast(`Đã lưu "${NF_UI.escapeHtml(data.name)}" vào ${mealType} hôm nay!`, 'success');
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu';
      };
    }
  }

  return {
    render
  };
})();
