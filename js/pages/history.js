/**
 * NutriFuture — History & Statistics Page
 * Thống kê xu hướng dinh dưỡng dài hạn, biểu đồ 7 ngày và quản lý sao lưu / khôi phục dữ liệu JSON
 */
const NF_PageHistory = (() => {
  'use strict';

  let lineChartInstance = null;

  function render(container) {
    const profile = NF_Storage.getProfile() || {};
    const tdee = profile.tdee || 2000;
    const allDates = NF_Storage.getAllDiaryDates();

    // Lấy dữ liệu 7 ngày gần nhất để vẽ biểu đồ
    const recentDays = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateNum}`;

      const summary = NF_Storage.getDiarySummary(dateStr);
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      recentDays.push({
        dateStr,
        label: `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth()+1})`,
        calories: summary.totalCalories,
        entriesCount: summary.count,
        carb: summary.totalCarb,
        protein: summary.totalProtein,
        fat: summary.totalFat,
      });
    }

    const recordedDays = recentDays.filter(d => d.calories > 0);
    const avgCalories = recordedDays.length > 0
      ? Math.round(recordedDays.reduce((sum, d) => sum + d.calories, 0) / recordedDays.length)
      : 0;

    container.innerHTML = `
      <div class="page page--history">
        <div class="page__header">
          <div class="section-label">Thống kê & Dữ liệu</div>
          <h1 class="page-title">Lịch sử & Báo cáo</h1>
          <p class="text-sm text-muted">Theo dõi tiến trình dinh dưỡng theo thời gian và quản lý dữ liệu</p>
        </div>

        <div class="page__body">
          <div class="grid-2-desktop">
            <!-- Cột trái: Biểu đồ & Thống kê chung -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <!-- 7-Day Trend Chart Card -->
              <div class="card card--glass">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2);">
              <div>
                <div class="card__label">XU HƯỚNG NĂNG LƯỢNG 7 NGÀY GẦN NHẤT</div>
                <h3 style="font-size:var(--fs-lg); font-weight:800;">Lượng Calo Nạp vào (kcal)</h3>
              </div>
              <div style="text-align:right;">
                <span class="text-xs text-muted">Trung bình</span>
                <div style="font-weight:900; color:var(--primary-700); font-size:var(--fs-md);">${avgCalories} kcal</div>
              </div>
            </div>

            <div style="position:relative; width:100%; height:220px; margin-top:var(--sp-2);">
              <canvas id="history-trend-chart"></canvas>
            </div>
            
            <div style="display:flex; justify-content:center; gap:var(--sp-4); margin-top:var(--sp-2); font-size:var(--fs-xs);">
              <span style="display:flex; align-items:center; gap:0.25rem;">
                <span style="width:12px; height:3px; background:#1b2a4a; display:inline-block; border-radius:2px;"></span> Calo thực tế
              </span>
              <span style="display:flex; align-items:center; gap:0.25rem;">
                <span style="width:12px; height:2px; border-top:2px dashed #a8873f; display:inline-block;"></span> Mục tiêu TDEE (${tdee})
              </span>
            </div>
          </div>

          <!-- Quick Stats 7 days -->
          <div class="metric-grid">
            <div class="metric-card metric-card--bmi">
              <div class="metric-card__label">Ngày ghi nhận</div>
              <div class="metric-card__value">${recordedDays.length} / 7</div>
              <div class="metric-card__extra" style="color:var(--primary-700);">ngày trong tuần</div>
            </div>

            <div class="metric-card metric-card--tdee">
              <div class="metric-card__label">Tổng số món</div>
              <div class="metric-card__value">${recentDays.reduce((sum, d) => sum + d.entriesCount, 0)}</div>
              <div class="metric-card__extra" style="color:var(--amber-700);">món ăn đã ghi</div>
            </div>

            <div class="metric-card metric-card--water">
              <div class="metric-card__label">Đạt chuẩn TDEE</div>
              <div class="metric-card__value">
                ${recentDays.filter(d => d.calories > 0 && Math.abs(d.calories - tdee) <= 300).length}
              </div>
              <div class="metric-card__extra" style="color:var(--sky-700);">ngày chuẩn mục tiêu</div>
            </div>
          </div>

            </div> <!-- Close left column -->

            <!-- Cột phải: Danh sách ngày & Backup -->
            <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
              <!-- All Recorded Dates List -->
              <div class="card">
            <div class="section-label" style="margin-bottom:var(--sp-3);">CÁC NGÀY ĐÃ GHI NHẬN (${allDates.length})</div>
            <div style="display:flex; flex-direction:column; gap:var(--sp-2);">
              ${allDates.length > 0 ? allDates.slice(0, 15).map(dateStr => {
                const daySummary = NF_Storage.getDiarySummary(dateStr);
                return `
                  <div class="history-date-card btn-view-diary-date" data-date="${dateStr}">
                    <div>
                      <div class="history-date-card__date">
                        <i class="fa-solid fa-calendar-day" style="color:var(--primary-600); margin-right:var(--sp-1);"></i>
                        ${NF_UI.formatDate(dateStr)} (${dateStr})
                      </div>
                      <div class="history-date-card__summary">
                        ${daySummary.count} món ăn • C: ${daySummary.totalCarb}g | P: ${daySummary.totalProtein}g | F: ${daySummary.totalFat}g
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div class="history-date-card__cal">${daySummary.totalCalories} kcal</div>
                      <span class="text-xs text-muted">Chi tiết <i class="fa-solid fa-chevron-right"></i></span>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div style="text-align:center; padding:var(--sp-4) 0; color:var(--slate-400);">
                  <i class="fa-solid fa-folder-open" style="font-size:1.75rem; margin-bottom:var(--sp-2); display:block; opacity:0.6;"></i>
                  <p class="text-xs">Chưa có dữ liệu nhật ký của các ngày trước.<br>Hãy bắt đầu ghi nhận các bữa ăn hôm nay!</p>
                </div>
              `}
            </div>
          </div>

          <!-- Backup & Restore Data Card -->
          <div class="card card--glass">
            <h3 style="font-size:var(--fs-md); font-weight:800; margin-bottom:var(--sp-2);">
              <i class="fa-solid fa-shield-halved" style="color:var(--primary-600); margin-right:var(--sp-1);"></i> Quản lý & Sao lưu Dữ liệu
            </h3>
            <p class="text-xs text-muted" style="margin-bottom:var(--sp-3); line-height:1.5;">
              Toàn bộ dữ liệu hồ sơ và nhật ký được lưu trong trình duyệt của bạn. Bạn có thể xuất file JSON để lưu trữ hoặc chuyển sang điện thoại / máy tính khác bất kỳ lúc nào.
            </p>

            <div style="display:flex; flex-direction:column; gap:var(--sp-2);">
              <button class="btn btn--primary" id="btn-export-json">
                <i class="fa-solid fa-download"></i> Tải về bản sao lưu (Export JSON)
              </button>

              <button class="btn btn--outline" id="btn-trigger-import-json">
                <i class="fa-solid fa-upload"></i> Khôi phục dữ liệu từ file (Import JSON)
              </button>
              <input type="file" id="file-import-json" accept=".json,application/json" style="display:none;" />

              <button class="btn btn--danger btn--outline btn--sm" id="btn-reset-all-data" style="margin-top:var(--sp-2);">
                <i class="fa-solid fa-triangle-exclamation"></i> Xóa toàn bộ dữ liệu ứng dụng
              </button>
            </div>
              </div>
            </div> <!-- Close right column -->
          </div> <!-- Close grid-2-desktop -->
        </div>
      </div>
    `;

    setupEvents(container);
    renderTrendChart(recentDays, tdee);
  }

  function renderTrendChart(days, tdee) {
    const canvas = document.getElementById('history-trend-chart');
    if (!canvas) return;

    if (lineChartInstance) {
      lineChartInstance.destroy();
      lineChartInstance = null;
    }

    if (typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const labels = days.map(d => d.label);
    const dataCal = days.map(d => d.calories);
    const targetLine = days.map(() => tdee);

    lineChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Mục tiêu TDEE',
            data: targetLine,
            borderColor: '#a8873f',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            order: 1
          },
          {
            type: 'bar',
            label: 'Calo tiêu thụ',
            data: dataCal,
            backgroundColor: dataCal.map(c => c > tdee ? '#6b2d3c' : '#1b2a4a'),
            borderRadius: 6,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#e4ded2' },
            ticks: { font: { size: 10, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: 'Inter' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${item.raw} kcal`
            }
          }
        }
      }
    });
  }

  function setupEvents(container) {
    // Click on date card -> Go to diary of that date
    const dateCards = container.querySelectorAll('.btn-view-diary-date');
    dateCards.forEach(card => {
      card.onclick = () => {
        const date = card.dataset.date;
        location.hash = `#diary?date=${date}`;
      };
    });

    // Export JSON
    const btnExport = container.querySelector('#btn-export-json');
    if (btnExport) {
      btnExport.onclick = () => {
        NF_Storage.downloadExport();
        NF_UI.showToast('Đã tải xuống tệp sao lưu dữ liệu!', 'success');
      };
    }

    // Import JSON
    const btnImport = container.querySelector('#btn-trigger-import-json');
    const fileInput = container.querySelector('#file-import-json');
    if (btnImport && fileInput) {
      btnImport.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = NF_Storage.importData(event.target.result);
          if (res.success) {
            NF_UI.showToast(res.note || 'Khôi phục dữ liệu thành công!', 'success');
            render(container);
          } else {
            NF_UI.showToast(`Khôi phục thất bại: ${res.error}`, 'error');
          }
        };
        reader.readAsText(file);
      };
    }

    // Reset All Data
    const btnReset = container.querySelector('#btn-reset-all-data');
    if (btnReset) {
      btnReset.onclick = async () => {
        const ok = await NF_UI.confirm('CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu hồ sơ và nhật ký trên thiết bị này. Bạn có chắc chắn muốn tiếp tục?');
        if (ok) {
          localStorage.clear();
          NF_UI.showToast('Đã xóa toàn bộ dữ liệu ứng dụng.', 'info');
          setTimeout(() => {
            location.hash = '#home';
            location.reload();
          }, 800);
        }
      };
    }
  }

  return {
    render
  };
})();
