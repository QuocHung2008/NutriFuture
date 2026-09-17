/**
 * NutriFuture — Diary Page (Nhật ký dinh dưỡng)
 * Theo dõi chi tiết các bữa ăn theo ngày, tính tổng calo và cân đối 3 nhóm đa lượng
 *
 * Tối ưu hiệu suất: khung trang (renderShell) chỉ dựng 1 lần khi vào trang.
 * Các thao tác đổi ngày / thêm / xóa món chỉ gọi refresh() để cập nhật đúng phần
 * dữ liệu thay đổi (text, chart.update()) — không innerHTML lại toàn bộ trang và
 * không destroy/recreate Chart.js mỗi lần, tránh giật trên máy yếu.
 */
const NF_PageDiary = (() => {
  'use strict';

  let selectedDate = null;
  let macroChartInstance = null;
  let currentContainer = null;

  const mealTypes = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Phụ'];

  function getTdeeAdvice(consumed, tdee) {
    if (!tdee || tdee <= 0) return null;

    const diff = consumed - tdee;
    const overThreshold = tdee * 0.1;
    const underThreshold = tdee * 0.3;

    if (diff > overThreshold) {
      return {
        type: 'warning',
        icon: 'fa-triangle-exclamation',
        html: `Hôm nay bạn đã ăn dư <strong>${Math.round(diff)} kcal</strong> so với TDEE (${tdee} kcal). Hãy cân nhắc vận động thêm hoặc giảm khẩu phần bữa tiếp theo.`,
      };
    }
    if (diff < -underThreshold && consumed > 0) {
      return {
        type: 'info',
        icon: 'fa-circle-info',
        html: `Bạn còn thiếu <strong>${Math.round(Math.abs(diff))} kcal</strong> so với mục tiêu TDEE (${tdee} kcal) hôm nay. Đừng bỏ bữa để đảm bảo đủ năng lượng học tập!`,
      };
    }
    if (consumed === 0) return null;

    return {
      type: 'success',
      icon: 'fa-circle-check',
      html: `Mức năng lượng hôm nay đang cân đối tốt với mục tiêu TDEE (${tdee} kcal).`,
    };
  }

  /* ─── Khung trang: chỉ dựng 1 lần khi vào trang / đổi trang ─── */

  function render(container, date = null) {
    currentContainer = container;
    selectedDate = date || selectedDate || NF_Storage.getToday();

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

          <div class="grid-2-desktop">
            <!-- Cột trái: Chart và thao tác -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <!-- Day Summary & Chart Card -->
              <div class="card card--glass">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-3);">
              <div>
                <div class="card__label" id="diary-date-label"></div>
                <div style="display:flex; align-items:baseline; gap:0.25rem;">
                  <span class="stat-card__value" id="diary-total-cal">0</span>
                  <span class="stat-card__unit" id="diary-tdee-unit"></span>
                </div>
              </div>
              <span class="tag" id="diary-tdee-tag"></span>
            </div>

            <!-- Canvas Chart Container -->
            <div style="margin:var(--sp-3) 0; display:flex; justify-content:center;">
              <div style="position:relative; width:180px; height:180px;">
                <canvas id="diary-macro-chart"></canvas>
              </div>
            </div>

            <div id="diary-tdee-advice"></div>

            <!-- Macro Legend Breakdown -->
            <div class="chart-legend">
              <div class="chart-legend__item chart-legend__item--carb">
                <span class="chart-legend__label">Carb (Bột đường)</span>
                <span class="chart-legend__value" id="diary-carb-val">0g</span>
                <span class="text-xs text-muted" id="diary-carb-kcal" style="display:block; font-size:0.625rem;">0 kcal</span>
              </div>
              <div class="chart-legend__item chart-legend__item--protein">
                <span class="chart-legend__label">Protein (Đạm)</span>
                <span class="chart-legend__value" id="diary-protein-val">0g</span>
                <span class="text-xs text-muted" id="diary-protein-kcal" style="display:block; font-size:0.625rem;">0 kcal</span>
              </div>
              <div class="chart-legend__item chart-legend__item--fat">
                <span class="chart-legend__label">Fat (Chất béo)</span>
                <span class="chart-legend__value" id="diary-fat-val">0g</span>
                <span class="text-xs text-muted" id="diary-fat-kcal" style="display:block; font-size:0.625rem;">0 kcal</span>
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

            </div> <!-- Close left column -->

            <!-- Cột phải: Danh sách bữa ăn -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <div id="diary-meals-container" style="display:flex; flex-direction:column; gap:var(--sp-3);"></div>
            </div> <!-- Close right column -->
          </div> <!-- Close grid-2-desktop -->
        </div>
      </div>
    `;

    bindShellEvents(container);
    refresh();
  }

  /* ─── Cập nhật dữ liệu động (KHÔNG innerHTML lại toàn trang) ─── */

  function refresh() {
    const container = currentContainer;
    if (!container) return;

    const profile = NF_Storage.getProfile() || {};
    const tdee = profile.tdee || 2000;
    const summary = NF_Storage.getDiarySummary(selectedDate);
    const tdeeAdvice = getTdeeAdvice(summary.totalCalories, tdee);

    // Date picker + label
    const datePicker = container.querySelector('#diary-date-picker');
    if (datePicker) datePicker.value = selectedDate;
    const dateLabel = container.querySelector('#diary-date-label');
    if (dateLabel) dateLabel.textContent = NF_UI.formatDate(selectedDate).toUpperCase();

    // Tổng calo + tag %
    const totalCalEl = container.querySelector('#diary-total-cal');
    if (totalCalEl) totalCalEl.textContent = summary.totalCalories;
    const unitEl = container.querySelector('#diary-tdee-unit');
    if (unitEl) unitEl.textContent = `/ ${tdee} kcal`;
    const tagEl = container.querySelector('#diary-tdee-tag');
    if (tagEl) {
      tagEl.className = `tag ${summary.totalCalories > tdee ? 'tag--amber' : 'tag--primary'}`;
      tagEl.textContent = `${Math.round((summary.totalCalories / tdee) * 100)}% TDEE`;
    }

    // Cảnh báo TDEE
    const adviceEl = container.querySelector('#diary-tdee-advice');
    if (adviceEl) {
      adviceEl.innerHTML = tdeeAdvice ? `
        <div class="advice-box advice-box--${tdeeAdvice.type}" style="margin-bottom:var(--sp-3);">
          <i class="fa-solid ${tdeeAdvice.icon}"></i>
          ${tdeeAdvice.html}
        </div>
      ` : '';
    }

    // Macro legend
    const setText = (id, val) => { const el = container.querySelector(id); if (el) el.textContent = val; };
    setText('#diary-carb-val', `${summary.totalCarb}g`);
    setText('#diary-carb-kcal', `${Math.round(summary.totalCarb * 4)} kcal`);
    setText('#diary-protein-val', `${summary.totalProtein}g`);
    setText('#diary-protein-kcal', `${Math.round(summary.totalProtein * 4)} kcal`);
    setText('#diary-fat-val', `${summary.totalFat}g`);
    setText('#diary-fat-kcal', `${Math.round(summary.totalFat * 9)} kcal`);

    // Danh sách món ăn theo bữa (đổi phần này thôi, không đụng phần chart/canvas)
    const mealsContainer = container.querySelector('#diary-meals-container');
    if (mealsContainer) {
      mealsContainer.innerHTML = renderMealsListHtml(summary);
      bindMealListEvents(container);
    }

    updateMacroChart(summary);
  }

  function renderMealsListHtml(summary) {
    return mealTypes.map(type => {
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
                  <div class="diary-entry__name">${NF_UI.escapeHtml(item.name)}</div>
                  <div class="diary-entry__meta">
                    <span>${NF_UI.escapeHtml(item.serving || '1 phần')}</span>
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
    }).join('');
  }

  function bindMealListEvents(container) {
    const deleteBtns = container.querySelectorAll('.btn-delete-entry');
    deleteBtns.forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const ok = await NF_UI.confirm('Bạn có muốn xóa món ăn này khỏi nhật ký?');
        if (ok) {
          NF_Storage.removeDiaryEntry(id, selectedDate);
          NF_UI.showToast('Đã xóa món ăn', 'info');
          refresh();
        }
      };
    });
  }

  /* ─── Chart.js: tạo 1 lần, các lần sau chỉ update data (không destroy/recreate) ─── */

  function updateMacroChart(summary) {
    const canvas = document.getElementById('diary-macro-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const c = summary.totalCarb || 0;
    const p = summary.totalProtein || 0;
    const f = summary.totalFat || 0;
    const hasData = (c + p + f) > 0;

    const dataValues = hasData ? [c, p, f] : [1, 1, 1];
    const dataColors = hasData
      ? ['#3b82f6', '#10b981', '#f59e0b']
      : ['#e2e8f0', '#e2e8f0', '#e2e8f0'];

    if (macroChartInstance) {
      // Chỉ cập nhật dữ liệu + màu, không destroy/recreate → mượt hơn, đỡ tốn CPU/GPU
      macroChartInstance.data.datasets[0].data = dataValues;
      macroChartInstance.data.datasets[0].backgroundColor = dataColors;
      macroChartInstance.options.plugins.tooltip.enabled = hasData;
      macroChartInstance.update();
      return;
    }

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

  /* ─── Sự kiện của khung trang (chỉ bind 1 lần) ─── */

  function bindShellEvents(container) {
    const datePicker = container.querySelector('#diary-date-picker');
    const btnPrev = container.querySelector('#btn-prev-day');
    const btnNext = container.querySelector('#btn-next-day');
    const btnManualAdd = container.querySelector('#btn-open-manual-add');

    datePicker.onchange = (e) => {
      selectedDate = e.target.value;
      refresh();
    };

    btnPrev.onclick = () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() - 1);
      selectedDate = _fmtDate(cur);
      refresh();
    };

    btnNext.onclick = () => {
      const cur = new Date(selectedDate + 'T00:00:00');
      cur.setDate(cur.getDate() + 1);
      selectedDate = _fmtDate(cur);
      refresh();
    };

    btnManualAdd.onclick = () => showManualAddModal(container);
  }

  function _fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
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
      refresh();
    };
  }

  return {
    render
  };
})();
