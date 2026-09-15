/**
 * NutriFuture — Diary Page (Nhật ký dinh dưỡng)
 * Theo dõi chi tiết các bữa ăn theo ngày, tính tổng calo và cân đối 3 nhóm đa lượng
 */
const NF_PageDiary = (() => {
  'use strict';

  let selectedDate = null;
  let macroChartInstance = null;

  function render(container, date = null) {
    selectedDate = date || selectedDate || NF_Storage.getToday();
    const profile = NF_Storage.getProfile() || {};
    const tdee = profile.tdee || 2000;
    const summary = NF_Storage.getDiarySummary(selectedDate);

    const mealTypes = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Phụ'];

    container.innerHTML = `
      <div class="page page--diary">
        <div class="page__header">
          <div class="section-label">Nhật ký & Cân bằng Năng lượng</div>
          <h1 class="page-title">Nhật ký Dinh dưỡng</h1>
          <p class="text-sm text-muted">Theo dõi và kiểm soát calo từng bữa ăn trong ngày</p>
        </div>

        <div class="page__body">
          <!-- Date Navigator Card -->
          <div class="card card--glass" style="padding:var(--sp-3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <button class="btn btn--outline btn--sm" id="btn-prev-day" title="Ngày trước">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              
              <div style="display:flex; align-items:center; gap:var(--sp-2);">
                <i class="fa-solid fa-calendar-day" style="color:var(--primary-600);"></i>
                <input type="date" id="diary-date-picker" value="${selectedDate}" 
                       style="border:1px solid var(--slate-300); border-radius:var(--radius-md); padding:0.375rem 0.5rem; font-family:var(--font-family); font-weight:700; font-size:var(--fs-sm);" />
              </div>

              <button class="btn btn--outline btn--sm" id="btn-next-day" title="Ngày sau">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>

          <!-- Day Summary & Chart Card -->
          <div class="card card--glass">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-3);">
              <div>
                <div class="card__label">${NF_UI.formatDate(selectedDate).toUpperCase()}</div>
                <div style="display:flex; align-items:baseline; gap:0.25rem;">
                  <span class="stat-card__value" id="diary-total-cal">${summary.totalCalories}</span>
                  <span class="stat-card__unit">/ ${tdee} kcal</span>
                </div>
              </div>
              <span class="tag ${summary.totalCalories > tdee ? 'tag--amber' : 'tag--primary'}">
                ${Math.round((summary.totalCalories / tdee) * 100)}% TDEE
              </span>
            </div>

            <!-- Canvas Chart Container -->
            <div style="margin:var(--sp-3) 0; display:flex; justify-content:center;">
              <div style="position:relative; width:180px; height:180px;">
                <canvas id="diary-macro-chart"></canvas>
              </div>
            </div>

            <!-- Macro Legend Breakdown -->
            <div class="chart-legend">
              <div class="chart-legend__item chart-legend__item--carb">
                <span class="chart-legend__label">Carb (Bột đường)</span>
                <span class="chart-legend__value">${summary.totalCarb}g</span>
                <span class="text-xs text-muted" style="display:block; font-size:0.625rem;">${Math.round(summary.totalCarb * 4)} kcal</span>
              </div>
              <div class="chart-legend__item chart-legend__item--protein">
                <span class="chart-legend__label">Protein (Đạm)</span>
                <span class="chart-legend__value">${summary.totalProtein}g</span>
                <span class="text-xs text-muted" style="display:block; font-size:0.625rem;">${Math.round(summary.totalProtein * 4)} kcal</span>
              </div>
              <div class="chart-legend__item chart-legend__item--fat">
                <span class="chart-legend__label">Fat (Chất béo)</span>
                <span class="chart-legend__value">${summary.totalFat}g</span>
                <span class="text-xs text-muted" style="display:block; font-size:0.625rem;">${Math.round(summary.totalFat * 9)} kcal</span>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons for adding meals -->
          <div style="display:flex; gap:var(--sp-2);">
            <button class="btn btn--primary" id="btn-open-manual-add" style="flex:1;">
              <i class="fa-solid fa-plus"></i> Thêm món thủ công
            </button>
            <button class="btn btn--outline" onclick="location.hash='#camera'" style="flex:1;">
              <i class="fa-solid fa-camera"></i> Chụp Camera AI
            </button>
          </div>

          <!-- Meals Grouped by Type -->
          <div id="diary-meals-container" style="display:flex; flex-direction:column; gap:var(--sp-3);">
            ${mealTypes.map(type => {
              const meals = (summary.entries || []).filter(e => e.mealType === type);
              const mealCal = meals.reduce((sum, item) => sum + (item.calories || 0), 0);

              return `
                <div class="card" style="padding:var(--sp-3);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2);">
                    <div style="font-weight:800; font-size:var(--fs-md); color:var(--slate-800);">
                      ${NF_UI.getMealIcon(type)} ${type}
                      <span class="text-xs text-muted" style="font-weight:600; margin-left:0.25rem;">(${meals.length} món)</span>
                    </div>
                    <span class="tag tag--primary" style="font-size:var(--fs-xs);">${mealCal} kcal</span>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:var(--sp-2);">
                    ${meals.length > 0 ? meals.map(item => `
                      <div class="diary-entry">
                        <div class="diary-entry__info">
                          <div class="diary-entry__name">${item.name}</div>
                          <div class="diary-entry__meta">
                            <span>${item.serving || '1 phần'}</span>
                            <span>•</span>
                            <span>C: ${item.carb || 0}g</span>
                            <span>P: ${item.protein || 0}g</span>
                            <span>F: ${item.fat || 0}g</span>
                            ${item.time ? `<span>• ${item.time}</span>` : ''}
                          </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:var(--sp-2);">
                          <div class="diary-entry__cal">${item.calories} kcal</div>
                          <button class="diary-entry__delete btn-delete-entry" data-id="${item.id}" title="Xóa món này">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    `).join('') : `
                      <div style="padding:var(--sp-2) 0; color:var(--slate-400); font-size:var(--fs-xs); font-style:italic;">
                        Chưa có món nào cho ${type}.
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    setupEvents(container);
    renderMacroChart(summary);
  }

  function renderMacroChart(summary) {
    const canvas = document.getElementById('diary-macro-chart');
    if (!canvas) return;

    if (macroChartInstance) {
      macroChartInstance.destroy();
      macroChartInstance = null;
    }

    const c = summary.totalCarb || 0;
    const p = summary.totalProtein || 0;
    const f = summary.totalFat || 0;
    const hasData = (c + p + f) > 0;

    const dataValues = hasData ? [c, p, f] : [1, 1, 1];
    const dataColors = hasData 
      ? ['#3b82f6', '#10b981', '#f59e0b']
      : ['#e2e8f0', '#e2e8f0', '#e2e8f0'];

    if (typeof Chart !== 'undefined') {
      const ctx = canvas.getContext('2d');
      macroChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Carb (g)', 'Protein (g)', 'Fat (g)'],
          datasets: [{
            data: dataValues,
            backgroundColor: dataColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: hasData,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw}g`
              }
            }
          }
        }
      });
    }
  }

  function setupEvents(container) {
    const datePicker = container.querySelector('#diary-date-picker');
    const btnPrev = container.querySelector('#btn-prev-day');
    const btnNext = container.querySelector('#btn-next-day');
    const btnManualAdd = container.querySelector('#btn-open-manual-add');

    datePicker.onchange = (e) => {
      selectedDate = e.target.value;
      render(container, selectedDate);
    };

    btnPrev.onclick = () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() - 1);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      selectedDate = `${y}-${m}-${d}`;
      render(container, selectedDate);
    };

    btnNext.onclick = () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() + 1);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      selectedDate = `${y}-${m}-${d}`;
      render(container, selectedDate);
    };

    btnManualAdd.onclick = () => showManualAddModal(container);

    // Delete meal buttons
    const deleteBtns = container.querySelectorAll('.btn-delete-entry');
    deleteBtns.forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const ok = await NF_UI.confirm('Bạn có muốn xóa món ăn này khỏi nhật ký?');
        if (ok) {
          NF_Storage.removeDiaryEntry(id, selectedDate);
          NF_UI.showToast('Đã xóa món ăn', 'info');
          render(container, selectedDate);
        }
      };
    });
  }

  function showManualAddModal(container) {
    const modalHtml = `
      <div style="padding:var(--sp-2);">
        <h3 style="font-size:var(--fs-lg); font-weight:800; margin-bottom:var(--sp-3);">
          <i class="fa-solid fa-pen-to-square" style="color:var(--primary-600);"></i> Thêm món ăn thủ công
        </h3>

        <form id="form-manual-meal" onsubmit="return false;">
          <div style="margin-bottom:var(--sp-3);">
            <label class="card__label" for="manual-name">TÊN MÓN ĂN (*)</label>
            <input type="text" id="manual-name" class="search-bar__input" placeholder="vd: Cơm sườn nướng, Chuối tiêu..." required />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-2); margin-bottom:var(--sp-3);">
            <div>
              <label class="card__label" for="manual-meal-type">BỮA ĂN</label>
              <select id="manual-meal-type" class="search-bar__input">
                <option value="Bữa Sáng">🌅 Bữa Sáng</option>
                <option value="Bữa Trưa" selected>☀️ Bữa Trưa</option>
                <option value="Bữa Tối">🌙 Bữa Tối</option>
                <option value="Bữa Phụ">🍎 Bữa Phụ</option>
              </select>
            </div>
            <div>
              <label class="card__label" for="manual-cal">CALO (KCAL) (*)</label>
              <input type="number" id="manual-cal" class="search-bar__input" placeholder="vd: 450" required />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--sp-2); margin-bottom:var(--sp-4);">
            <div>
              <label class="card__label" for="manual-carb">CARB (G)</label>
              <input type="number" id="manual-carb" class="search-bar__input" placeholder="0" step="0.5" />
            </div>
            <div>
              <label class="card__label" for="manual-protein">PROTEIN (G)</label>
              <input type="number" id="manual-protein" class="search-bar__input" placeholder="0" step="0.5" />
            </div>
            <div>
              <label class="card__label" for="manual-fat">FAT (G)</label>
              <input type="number" id="manual-fat" class="search-bar__input" placeholder="0" step="0.5" />
            </div>
          </div>

          <div style="display:flex; gap:var(--sp-2); justify-content:flex-end;">
            <button type="button" class="btn btn--outline" id="btn-cancel-manual">Hủy</button>
            <button type="button" class="btn btn--primary" id="btn-save-manual">Thêm món</button>
          </div>
        </form>
      </div>
    `;

    NF_UI.showModal(modalHtml);

    document.getElementById('btn-cancel-manual').onclick = NF_UI.closeModal;
    document.getElementById('btn-save-manual').onclick = () => {
      const name = document.getElementById('manual-name').value.trim();
      const cal = Number(document.getElementById('manual-cal').value);
      const mealType = document.getElementById('manual-meal-type').value;
      const carb = Number(document.getElementById('manual-carb').value) || 0;
      const protein = Number(document.getElementById('manual-protein').value) || 0;
      const fat = Number(document.getElementById('manual-fat').value) || 0;

      if (!name || isNaN(cal) || cal <= 0) {
        NF_UI.showToast('Vui lòng nhập tên món và lượng calo hợp lệ', 'warning');
        return;
      }

      const entry = {
        name,
        serving: 'Thủ công',
        calories: Math.round(cal),
        carb: Math.round(carb * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: 0,
        mealType,
        source: 'manual',
        time: NF_UI.getTimeNow(),
      };

      NF_Storage.addDiaryEntry(entry, selectedDate);
      NF_UI.closeModal();
      NF_UI.showToast(`Đã thêm "${name}" vào ${mealType}!`, 'success');
      render(container, selectedDate);
    };
  }

  return {
    render
  };
})();
