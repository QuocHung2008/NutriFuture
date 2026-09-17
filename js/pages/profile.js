/**
 * NutriFuture — Profile Page (Hồ sơ cá nhân & Tính toán Chỉ số Thể trạng)
 * Tính toán tự động BMI, BMR, TDEE, nhu cầu nước và Macro chuẩn khoa học (WHO, Mifflin-St Jeor)
 * Tích hợp AI Gemini tư vấn thực đơn cá nhân hóa dựa trên chỉ số thật.
 */
const NF_PageProfile = (() => {
  'use strict';

  function calculateMetrics(data) {
    const age = parseFloat(data.age);
    const height = parseFloat(data.height); // cm
    const weight = parseFloat(data.weight); // kg
    const gender = data.gender;
    const activity = parseFloat(data.activity) || 1.375;

    if (!age || !height || !weight || !gender || height <= 0 || weight <= 0) {
      return null;
    }

    const heightM = height / 100;
    const bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;

    // BMR (Mifflin - St Jeor)
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    bmr = Math.round(bmr);

    // TDEE = BMR * Activity Factor
    const tdee = Math.round(bmr * activity);

    // Nhu cầu nước: 33ml / kg thể trọng
    const waterMl = Math.round(weight * 33);

    // Phân bổ Macro theo Viện Dinh Dưỡng VN cho học sinh THPT:
    // Carb: 55% TDEE (1g carb = 4 kcal)
    // Protein: 18% TDEE (1g protein = 4 kcal)
    // Fat: 27% TDEE (1g fat = 9 kcal)
    const carbGrams = Math.round((tdee * 0.55) / 4);
    const proteinGrams = Math.round((tdee * 0.18) / 4);
    const fatGrams = Math.round((tdee * 0.27) / 9);

    return {
      bmi,
      bmr,
      tdee,
      waterMl,
      carbGrams,
      proteinGrams,
      fatGrams,
    };
  }

  function render(container, options = {}) {
    const isOnboarding = !!options.onboarding;
    const profile = NF_Storage.getProfile() || {};
    const hasData = !!(profile.weight && profile.height && profile.age);
    const hasApiKey = NF_Gemini.isConfigured();
    const selectedModel = NF_Gemini.getSelectedModel();
    const modelOptionsHtml = NF_Gemini.MODEL_OPTIONS.map(opt =>
      `<option value="${opt.value}" ${selectedModel === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    const notifSupported = NF_Notifications.isSupported();
    const notifPermission = NF_Notifications.getPermission();
    const notifEnabled = NF_Notifications.isEnabled();
    const notifInterval = NF_Notifications.getIntervalHours();

    container.innerHTML = `
      <div class="page page--profile">
        <div class="page__header">
          <div class="section-label">Cá nhân hóa Dinh dưỡng</div>
          <h1 class="page-title">Hồ sơ & Chỉ số Thể trạng</h1>
          <p class="text-sm text-muted">Nhập thông tin thể chất của bạn — máy sẽ tự động tính toán chỉ số chuẩn y khoa</p>
        </div>

        <div class="page__body grid-2-desktop">
          ${isOnboarding ? `
            <div class="advice-box advice-box--info" style="grid-column:1 / -1;">
              <i class="fa-solid fa-hand-sparkles"></i>
              <strong>Chào mừng bạn đến với NutriFuture!</strong>
              Trước khi bắt đầu, hãy nhập thông tin thể chất bên dưới để hệ thống tính toán chỉ số dinh dưỡng cá nhân hóa (BMI, TDEE, nhu cầu nước...) — chỉ mất khoảng 30 giây, và bạn chỉ cần làm 1 lần duy nhất.
            </div>
          ` : ''}
          <!-- Cột trái: Form nhập -->
          <div>
            <!-- Profile Form Card -->
            <div class="card card--glass">
            <h3 style="font-size:var(--fs-lg); font-weight:800; margin-bottom:var(--sp-3);">
              <i class="fa-solid fa-id-card" style="color:var(--primary-600); margin-right:var(--sp-1);"></i> Thông tin cá nhân
            </h3>

            <form id="form-user-profile" onsubmit="return false;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-3); margin-bottom:var(--sp-3);">
                <div>
                  <label class="card__label" for="prof-name">HỌ VÀ TÊN</label>
                  <input type="text" id="prof-name" class="search-bar__input" 
                         value="${NF_UI.escapeHtml(profile.name || '')}" placeholder="Ví dụ: Nguyễn Văn A" style="padding-left:var(--sp-3);" />
                </div>
                <div>
                  <label class="card__label" for="prof-gender">GIỚI TÍNH</label>
                  <select id="prof-gender" class="search-bar__input" style="padding-left:var(--sp-3);">
                    <option value="" disabled ${!profile.gender ? 'selected' : ''}>-- Chọn giới tính --</option>
                    <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Nam</option>
                    <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Nữ</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--sp-2); margin-bottom:var(--sp-3);">
                <div>
                  <label class="card__label" for="prof-age">TUỔI</label>
                  <input type="number" id="prof-age" class="search-bar__input" min="10" max="30"
                         value="${profile.age || ''}" placeholder="vd: 16" style="padding-left:var(--sp-3);" />
                </div>
                <div>
                  <label class="card__label" for="prof-height">CHIỀU CAO (CM)</label>
                  <input type="number" id="prof-height" class="search-bar__input" min="100" max="230" step="0.5"
                         value="${profile.height || ''}" placeholder="vd: 165" style="padding-left:var(--sp-3);" />
                </div>
                <div>
                  <label class="card__label" for="prof-weight">CÂN NẶNG (KG)</label>
                  <input type="number" id="prof-weight" class="search-bar__input" min="20" max="180" step="0.5"
                         value="${profile.weight || ''}" placeholder="vd: 55" style="padding-left:var(--sp-3);" />
                </div>
              </div>

              <div style="margin-bottom:var(--sp-4);">
                <label class="card__label" for="prof-activity">MỨC ĐỘ HOẠT ĐỘNG THỂ CHẤT</label>
                <select id="prof-activity" class="search-bar__input" style="padding-left:var(--sp-3);">
                  <option value="1.2" ${profile.activity == 1.2 ? 'selected' : ''}>Ít vận động (học sinh ít chơi thể thao, chủ yếu ngồi học)</option>
                  <option value="1.375" ${(!profile.activity || profile.activity == 1.375) ? 'selected' : ''}>Vận động nhẹ (đi bộ, thể dục 1-3 ngày/tuần)</option>
                  <option value="1.55" ${profile.activity == 1.55 ? 'selected' : ''}>Vừa phải (tập thể thao, đạp xe 3-5 ngày/tuần)</option>
                  <option value="1.725" ${profile.activity == 1.725 ? 'selected' : ''}>Năng động (chơi bóng đá, bơi lội 6-7 ngày/tuần)</option>
                  <option value="1.9" ${profile.activity == 1.9 ? 'selected' : ''}>Cực kỳ năng động (vận động viên học đường, tập luyện nặng)</option>
                </select>
              </div>

              <div style="display:flex; gap:var(--sp-2);">
                <button type="button" class="btn btn--primary" id="btn-save-profile" style="flex:1;">
                  <i class="fa-solid fa-floppy-disk"></i> Lưu thông tin & Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div> <!-- Close left column -->
          <!-- Cột phải: Chỉ số & Các khối chức năng khác -->
          <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
            <!-- Real-time Computed Physical Metrics Card -->
            <div class="card" id="profile-metrics-display">
              <!-- Populated dynamically -->
            </div>

          <!-- AI Meal Plan Recommendation Section -->
          <div class="card card--glass" id="profile-ai-meal-plan-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--sp-3);">
              <div>
                <span class="tag tag--primary" style="margin-bottom:var(--sp-1);">AI Gemini Flash</span>
                <h3 style="font-size:var(--fs-lg); font-weight:800;">Tư vấn Thực đơn 1 Ngày</h3>
                <p class="text-xs text-muted">Gợi ý 4 bữa ăn thuần Việt phù hợp chỉ số TDEE cá nhân của bạn</p>
              </div>
            </div>

            <button class="btn btn--primary" id="btn-get-ai-meal-plan" style="width:100%;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> AI Lập Thực Đơn Cho Tôi
            </button>

            <div id="ai-meal-plan-output" style="margin-top:var(--sp-3);"></div>
          </div>

          <!-- Notifications / Reminders Card -->
          <div class="card" style="border:1px solid var(--slate-200);">
            <h4 style="font-size:var(--fs-md); font-weight:800; margin-bottom:var(--sp-2);">
              <i class="fa-solid fa-bell" style="color:var(--slate-600); margin-right:var(--sp-1);"></i> Nhắc nhở
            </h4>

            ${!notifSupported ? `
              <p class="text-xs text-muted" style="line-height:1.5;">
                ⚠️ Trình duyệt này không hỗ trợ thông báo (Notification API). Tính năng nhắc nhở sẽ không khả dụng.
              </p>
            ` : `
              <p class="text-xs text-muted" style="margin-bottom:var(--sp-3); line-height:1.5;">
                Nhắc uống nước định kỳ và nhắc ghi nhật ký bữa ăn nếu đến tối mà chưa ghi gì.
                <em>Chỉ hoạt động khi ứng dụng đang mở trên trình duyệt/máy của bạn.</em>
              </p>

              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--sp-3); padding:var(--sp-2) var(--sp-3); background:var(--slate-50); border-radius:var(--radius-lg);">
                <label for="toggle-notifications" style="font-weight:700; font-size:var(--fs-sm); cursor:pointer;">
                  Bật nhắc nhở
                </label>
                <input type="checkbox" id="toggle-notifications" ${notifEnabled && notifPermission === 'granted' ? 'checked' : ''} style="width:1.25rem; height:1.25rem; cursor:pointer;" />
              </div>

              <div style="margin-bottom:var(--sp-2);">
                <label class="card__label" for="select-notif-interval">NHẮC UỐNG NƯỚC MỖI</label>
                <select id="select-notif-interval" class="search-bar__input" style="padding-left:var(--sp-3);">
                  <option value="1" ${notifInterval == 1 ? 'selected' : ''}>1 giờ / lần</option>
                  <option value="2" ${notifInterval == 2 ? 'selected' : ''}>2 giờ / lần</option>
                  <option value="3" ${notifInterval == 3 ? 'selected' : ''}>3 giờ / lần</option>
                </select>
              </div>

              <div id="notif-permission-status" class="text-xs" style="margin-top:var(--sp-2);">
                ${notifPermission === 'denied'
                  ? '<span style="color:var(--red-600, #dc2626);">🚫 Bạn đã chặn thông báo cho trang này — vào cài đặt trình duyệt để bật lại.</span>'
                  : notifPermission === 'granted'
                    ? '<span style="color:var(--green-600, #16a34a);">✅ Đã cấp quyền thông báo.</span>'
                    : '<span class="text-muted">Chưa cấp quyền — bật công tắc ở trên để yêu cầu quyền thông báo.</span>'}
              </div>
            `}
          </div>

          <!-- Gemini Model Config Card -->
          <div class="card" style="border:1px solid var(--slate-200);">
            <h4 style="font-size:var(--fs-md); font-weight:800; margin-bottom:var(--sp-2);">
              <i class="fa-solid fa-brain" style="color:var(--slate-600); margin-right:var(--sp-1);"></i> Cấu hình AI Gemini
            </h4>
            <p class="text-xs text-muted" style="margin-bottom:var(--sp-3); line-height:1.5;">
              ${hasApiKey
                ? 'API Key đã được cấu hình sẵn cho ứng dụng — bạn chỉ cần chọn model AI muốn dùng bên dưới.'
                : '⚠️ Chưa cấu hình API Key trong js/config.js. Liên hệ người quản trị ứng dụng.'}
            </p>

            <div style="margin-bottom:var(--sp-3);">
              <label class="card__label" for="select-gemini-model">MODEL GEMINI SỬ DỤNG</label>
              <select id="select-gemini-model" class="search-bar__input" style="padding-left:var(--sp-3);">
                ${modelOptionsHtml}
              </select>
            </div>

            <!-- Connection test row -->
            <div style="display:flex; gap:var(--sp-2); align-items:center; margin-bottom:var(--sp-2);">
              <button class="btn btn--outline btn--sm" id="btn-test-connection" style="flex:1;">
                <i class="fa-solid fa-plug-circle-check"></i> Kiểm tra kết nối
              </button>
              <button class="btn btn--outline btn--sm" id="btn-reset-model-cache" title="Xóa cache model đã lưu để thử lại">
                <i class="fa-solid fa-rotate"></i> Làm mới
              </button>
            </div>

            <!-- Status output -->
            <div id="api-test-result" style="display:none; padding:var(--sp-2) var(--sp-3); border-radius:var(--radius-lg); font-size:var(--fs-xs); line-height:1.6;"></div>

            <div style="margin-top:var(--sp-2);">
              <span class="text-xs text-muted" id="api-current-model" style="font-style:italic;">
                Model đang dùng: <strong>${NF_Gemini.getModel()}</strong>
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>
    `;

    setupEvents(container, isOnboarding);
    updateMetricsDisplay(container);
  }

  function getFormData(container) {
    return {
      name: container.querySelector('#prof-name').value.trim(),
      gender: container.querySelector('#prof-gender').value,
      age: container.querySelector('#prof-age').value,
      height: container.querySelector('#prof-height').value,
      weight: container.querySelector('#prof-weight').value,
      activity: container.querySelector('#prof-activity').value,
    };
  }

  function updateMetricsDisplay(container) {
    const displayEl = container.querySelector('#profile-metrics-display');
    if (!displayEl) return;

    const data = getFormData(container);
    const metrics = calculateMetrics(data);

    if (!metrics) {
      displayEl.innerHTML = `
        <div style="text-align:center; padding:var(--sp-4) 0; color:var(--slate-400);">
          <i class="fa-solid fa-calculator" style="font-size:1.75rem; margin-bottom:var(--sp-2); display:block; opacity:0.6;"></i>
          <div style="font-weight:700; color:var(--slate-600); margin-bottom:0.25rem;">Chưa đủ thông tin tính toán</div>
          <p class="text-xs">Vui lòng nhập đầy đủ Tuổi, Giới tính, Chiều cao và Cân nặng ở trên để máy tự động tính toán chỉ số.</p>
        </div>
      `;
      return;
    }

    const bmiInfo = NF_UI.getBMIClass(metrics.bmi);

    displayEl.innerHTML = `
      <div class="section-label" style="margin-bottom:var(--sp-2);">KẾT QUẢ TÍNH TOÁN KHOA HỌC</div>
      <div class="metric-grid" style="margin-bottom:var(--sp-3);">
        <div class="metric-card metric-card--bmi">
          <div class="metric-card__label">Chỉ số BMI (WHO)</div>
          <div class="metric-card__value">${metrics.bmi}</div>
          <div class="metric-card__extra">
            <span class="bmi-badge bmi-badge--${bmiInfo.color}">
              <i class="fa-solid ${bmiInfo.icon}"></i> ${bmiInfo.label}
            </span>
          </div>
        </div>

        <div class="metric-card metric-card--tdee">
          <div class="metric-card__label">TDEE (Năng lượng)</div>
          <div class="metric-card__value">${metrics.tdee}</div>
          <div class="metric-card__extra" style="color:var(--amber-700);">kcal / ngày</div>
        </div>

        <div class="metric-card metric-card--water">
          <div class="metric-card__label">Nhu cầu Nước</div>
          <div class="metric-card__value">${(metrics.waterMl / 1000).toFixed(1)}</div>
          <div class="metric-card__extra" style="color:var(--sky-700);">Lít / ngày</div>
        </div>
      </div>

      <!-- Macro split recommendations -->
      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-xl); padding:var(--sp-3);">
        <div class="card__label" style="margin-bottom:var(--sp-2);">PHÂN BỔ DINH DƯỠNG KHUYẾN NGHỊ (THEO VIỆN DINH DƯỠNG VN)</div>
        <div class="nutrient-grid" style="grid-template-columns:repeat(3, 1fr);">
          <div class="nutrient-box">
            <div class="nutrient-box__label">Carb (55%)</div>
            <div class="nutrient-box__value" style="color:var(--blue-600);">${metrics.carbGrams}g</div>
            <div class="text-xs text-muted" style="font-size:0.625rem; margin-top:0.125rem;">~${Math.round(metrics.tdee * 0.55)} kcal</div>
          </div>
          <div class="nutrient-box">
            <div class="nutrient-box__label">Protein (18%)</div>
            <div class="nutrient-box__value" style="color:var(--primary-600);">${metrics.proteinGrams}g</div>
            <div class="text-xs text-muted" style="font-size:0.625rem; margin-top:0.125rem;">~${Math.round(metrics.tdee * 0.18)} kcal</div>
          </div>
          <div class="nutrient-box">
            <div class="nutrient-box__label">Fat (27%)</div>
            <div class="nutrient-box__value" style="color:var(--amber-600);">${metrics.fatGrams}g</div>
            <div class="text-xs text-muted" style="font-size:0.625rem; margin-top:0.125rem;">~${Math.round(metrics.tdee * 0.27)} kcal</div>
          </div>
        </div>
      </div>

      <div class="text-xs text-muted" style="margin-top:var(--sp-2); font-style:italic;">
        * BMR tính theo phương trình Mifflin-St Jeor (1990). TDEE tính theo khuyến nghị vận động học đường ACSM.
      </div>
    `;
  }

  function setupEvents(container, isOnboarding = false) {
    const inputs = container.querySelectorAll('#form-user-profile input, #form-user-profile select');
    inputs.forEach(input => {
      input.addEventListener('input', () => updateMetricsDisplay(container));
      input.addEventListener('change', () => updateMetricsDisplay(container));
    });

    // Nút Lưu Profile
    const btnSave = container.querySelector('#btn-save-profile');
    btnSave.onclick = () => {
      const data = getFormData(container);
      const metrics = calculateMetrics(data);

      if (!metrics) {
        NF_UI.showToast('Vui lòng điền đầy đủ các thông tin bắt buộc (Tuổi, Chiều cao, Cân nặng, Giới tính)', 'warning');
        return;
      }

      const fullProfile = {
        ...data,
        ...metrics,
        age: Number(data.age),
        height: Number(data.height),
        weight: Number(data.weight),
        activity: Number(data.activity),
      };

      NF_Storage.saveProfile(fullProfile);
      NF_Storage.setOnboarded();
      NF_UI.showToast('Đã lưu hồ sơ dinh dưỡng cá nhân thành công!', 'success');
      updateMetricsDisplay(container);

      // Lần đầu onboarding: sau khi lưu xong, đưa người dùng vào Trang chủ để bắt đầu dùng app
      if (isOnboarding) {
        setTimeout(() => { window.location.hash = '#home'; }, 900);
      }
    };

    // Toggle Bật/Tắt nhắc nhở (yêu cầu quyền thông báo nếu cần)
    const toggleNotif = container.querySelector('#toggle-notifications');
    const notifStatusEl = container.querySelector('#notif-permission-status');
    if (toggleNotif) {
      toggleNotif.onchange = async () => {
        if (toggleNotif.checked) {
          const perm = await NF_Notifications.requestPermission();
          if (perm !== 'granted') {
            toggleNotif.checked = false;
            NF_UI.showToast('Bạn cần cấp quyền thông báo để bật tính năng này', 'warning');
            if (notifStatusEl) {
              notifStatusEl.innerHTML = perm === 'denied'
                ? '<span style="color:var(--red-600, #dc2626);">🚫 Bạn đã chặn thông báo cho trang này — vào cài đặt trình duyệt để bật lại.</span>'
                : '<span class="text-muted">Chưa cấp quyền — bật công tắc ở trên để yêu cầu quyền thông báo.</span>';
            }
            return;
          }
          NF_Notifications.setEnabled(true);
          if (notifStatusEl) notifStatusEl.innerHTML = '<span style="color:var(--green-600, #16a34a);">✅ Đã cấp quyền thông báo.</span>';
          NF_UI.showToast('Đã bật nhắc nhở!', 'success');
        } else {
          NF_Notifications.setEnabled(false);
          NF_UI.showToast('Đã tắt nhắc nhở', 'info');
        }
      };
    }

    const selectNotifInterval = container.querySelector('#select-notif-interval');
    if (selectNotifInterval) {
      selectNotifInterval.onchange = () => {
        NF_Notifications.setIntervalHours(Number(selectNotifInterval.value));
        NF_UI.showToast('Đã cập nhật tần suất nhắc uống nước!', 'success');
      };
    }

    // Dropdown chọn Model Gemini
    const selectModel = container.querySelector('#select-gemini-model');
    const apiCurrentModel = container.querySelector('#api-current-model');
    if (selectModel) {
      selectModel.onchange = () => {
        NF_Gemini.setSelectedModel(selectModel.value);
        if (apiCurrentModel) {
          apiCurrentModel.innerHTML = `Model đang dùng: <strong>${NF_Gemini.getModel()}</strong>`;
        }
        NF_UI.showToast('Đã lưu lựa chọn model!', 'success');
      };
    }

    // Nút Kiểm tra kết nối (dùng API Key đã cấu hình sẵn trong js/config.js)
    const btnTestConn = container.querySelector('#btn-test-connection');
    const apiTestResult = container.querySelector('#api-test-result');

    if (btnTestConn && apiTestResult) {
      btnTestConn.onclick = async () => {
        if (!NF_Gemini.isConfigured()) {
          apiTestResult.style.display = 'block';
          apiTestResult.style.background = '#fff3cd';
          apiTestResult.style.border = '1px solid #ffc107';
          apiTestResult.style.color = '#856404';
          apiTestResult.innerHTML = '⚠️ Ứng dụng chưa được cấu hình API Key (js/config.js). Liên hệ người quản trị.';
          return;
        }

        NF_UI.showInlineLoading(btnTestConn);
        apiTestResult.style.display = 'block';
        apiTestResult.style.background = 'var(--slate-50)';
        apiTestResult.style.border = '1px solid var(--slate-200)';
        apiTestResult.style.color = 'var(--slate-700)';
        apiTestResult.innerHTML = '<span class="loading-spinner loading-spinner--sm" style="display:inline-block; vertical-align:middle; margin-right:0.25rem;"></span> Đang gọi Google API để lấy danh sách model...';

        try {
          const result = await NF_Gemini.testConnection();
          NF_UI.hideInlineLoading(btnTestConn);

          if (result.ok) {
            apiTestResult.style.background = '#d1fae5';
            apiTestResult.style.border = '1px solid #a7f3d0';
            apiTestResult.style.color = '#065f46';
            apiTestResult.innerHTML = `
              ✅ <strong>Kết nối thành công!</strong><br>
              Đã tìm thấy <strong>${result.models ? result.models.length : '?'}</strong> model khả dụng.<br>
              Model đang dùng: <strong style="font-family:monospace;">${NF_Gemini.getModel()}</strong><br>
              <em style="font-size:0.6rem; color:#047857;">Danh sách đầy đủ: ${(result.models || []).slice(0, 6).join(', ')}...</em>
            `;
            if (apiCurrentModel) {
              apiCurrentModel.innerHTML = `Model đang dùng: <strong>${NF_Gemini.getModel()}</strong>`;
            }
            NF_UI.showToast('Kết nối Gemini AI thành công!', 'success');
          } else {
            apiTestResult.style.background = '#fee2e2';
            apiTestResult.style.border = '1px solid #fca5a5';
            apiTestResult.style.color = '#991b1b';
            apiTestResult.innerHTML = `
              ❌ <strong>Kết nối thất bại:</strong> ${result.message}
              <br><em style="font-size:0.6rem; margin-top:0.25rem; display:block;">Hãy kiểm tra lại API Key trong js/config.js hoặc đảm bảo API "Generative Language API" đã được bật trong Google Cloud Console.</em>
            `;
          }
        } catch (e) {
          NF_UI.hideInlineLoading(btnTestConn);
          apiTestResult.style.background = '#fee2e2';
          apiTestResult.style.border = '1px solid #fca5a5';
          apiTestResult.style.color = '#991b1b';
          apiTestResult.innerHTML = `❌ <strong>Lỗi khi kiểm tra:</strong> ${e.message}`;
        }
      };
    }

    // Nút Làm mới (xóa cache model tự động, giữ nguyên lựa chọn thủ công nếu có)
    const btnResetCache = container.querySelector('#btn-reset-model-cache');
    if (btnResetCache) {
      btnResetCache.onclick = () => {
        localStorage.removeItem('nf_working_model');
        localStorage.removeItem('nf_working_version');
        if (apiCurrentModel) {
          apiCurrentModel.innerHTML = `Model đang dùng: <strong>${NF_Gemini.getModel()}</strong>`;
        }
        if (apiTestResult) {
          apiTestResult.style.display = 'none';
          apiTestResult.innerHTML = '';
        }
        NF_UI.showToast('Đã xóa cache model. Lần gọi tiếp theo sẽ tự động tìm model tốt nhất.', 'info');
      };
    }


    const btnGetMealPlan = container.querySelector('#btn-get-ai-meal-plan');
    const mealPlanOutput = container.querySelector('#ai-meal-plan-output');

    btnGetMealPlan.onclick = async () => {
      const data = getFormData(container);
      const metrics = calculateMetrics(data);

      if (!metrics) {
        NF_UI.showToast('Vui lòng nhập hồ sơ thể trạng để AI có căn cứ xây dựng thực đơn chính xác', 'warning');
        return;
      }

      if (!NF_Gemini.isConfigured()) {
        NF_PageCamera.showApiKeyModal();
        return;
      }

      NF_UI.showInlineLoading(btnGetMealPlan);
      mealPlanOutput.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Gemini AI đang tính toán thực đơn tối ưu cho chỉ số TDEE ${metrics.tdee} kcal...</p>
        </div>
      `;

      try {
        const fullProfile = {
          ...data,
          ...metrics
        };

        const plan = await NF_Gemini.suggestMealPlan(fullProfile);
        NF_UI.hideInlineLoading(btnGetMealPlan);
        renderMealPlan(mealPlanOutput, plan);
        NF_UI.showToast('AI đã hoàn thành gợi ý thực đơn!', 'success');
      } catch (err) {
        console.error('Meal plan error:', err);
        NF_UI.hideInlineLoading(btnGetMealPlan);
        const msg = NF_Gemini.getErrorMessage(err);
        mealPlanOutput.innerHTML = `
          <div class="advice-box advice-box--warning">
            <p><strong>Lỗi:</strong> ${msg}</p>
          </div>
        `;
      }
    };
  }

  function renderMealPlan(targetEl, plan) {
    const mealCardClasses = {
      'Bữa Sáng': 'meal-plan-card--morning',
      'Bữa Trưa': 'meal-plan-card--lunch',
      'Bữa Tối': 'meal-plan-card--dinner',
      'Bữa Phụ': 'meal-plan-card--snack',
    };

    targetEl.innerHTML = `
      <div style="animation:fadeIn var(--duration-normal) var(--ease-out); display:flex; flex-direction:column; gap:var(--sp-3);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-size:var(--fs-md); font-weight:800; color:var(--slate-900);">${NF_UI.escapeHtml(plan.planName)}</h4>
          <span class="tag tag--primary">${plan.totalCalories} kcal</span>
        </div>

        ${(plan.meals || []).map((m, idx) => `
          <div class="meal-plan-card ${mealCardClasses[m.type] || 'meal-plan-card--lunch'}">
            <div class="meal-plan-card__header">
              <span class="meal-plan-card__type">${NF_UI.getMealIcon(m.type)} ${m.type}</span>
              <span class="meal-plan-card__cal">${m.calories} kcal</span>
            </div>
            <div class="meal-plan-card__name">${NF_UI.escapeHtml(m.name)}</div>
            <div class="meal-plan-card__macros">
              Carb: ${m.carb}g • Protein: ${m.protein}g • Fat: ${m.fat}g
            </div>
            ${m.description ? `<div class="meal-plan-card__desc">${NF_UI.escapeHtml(m.description)}</div>` : ''}
            <button class="btn btn--outline btn--sm btn-add-plan-meal" data-idx="${idx}" 
                    style="margin-top:var(--sp-2); font-size:var(--fs-xs); background:var(--white); padding:0.25rem 0.5rem;">
              <i class="fa-solid fa-plus"></i> Thêm vào nhật ký hôm nay
            </button>
          </div>
        `).join('')}

        ${plan.advice ? `
          <div class="advice-box advice-box--success">
            <i class="fa-solid fa-lightbulb"></i>
            <strong>Lời khuyên từ AI:</strong> ${NF_UI.escapeHtml(plan.advice)}
          </div>
        ` : ''}
      </div>
    `;

    // Event listener cho nút thêm từng món từ thực đơn vào nhật ký
    const addBtns = targetEl.querySelectorAll('.btn-add-plan-meal');
    addBtns.forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const m = plan.meals[idx];
        if (!m) return;

        const entry = {
          name: m.name,
          serving: '1 khẩu phần',
          calories: m.calories,
          protein: m.protein,
          fat: m.fat,
          carb: m.carb,
          fiber: 2,
          mealType: m.type,
          source: 'ai_plan',
          time: NF_UI.getTimeNow(),
        };

        NF_Storage.addDiaryEntry(entry, NF_Storage.getToday());
        NF_UI.showToast(`Đã thêm "${NF_UI.escapeHtml(m.name)}" (${m.type}) vào nhật ký!`, 'success');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã thêm';
      };
    });
  }

  return {
    render,
    calculateMetrics
  };
})();
