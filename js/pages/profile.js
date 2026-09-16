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

  function render(container) {
    const profile = NF_Storage.getProfile() || {};
    const hasData = !!(profile.weight && profile.height && profile.age);
    const currentApiKey = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE')
      ? GEMINI_CONFIG.apiKey
      : (localStorage.getItem('nf_gemini_api_key') || '');

    container.innerHTML = `
      <div class="page page--profile">
        <div class="page__header">
          <div class="section-label">Cá nhân hóa Dinh dưỡng</div>
          <h1 class="page-title">Hồ sơ & Chỉ số Thể trạng</h1>
          <p class="text-sm text-muted">Nhập thông tin thể chất của bạn — máy sẽ tự động tính toán chỉ số chuẩn y khoa</p>
        </div>

        <div class="page__body grid-2-desktop">
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
                         value="${profile.name || ''}" placeholder="Ví dụ: Nguyễn Văn A" style="padding-left:var(--sp-3);" />
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

          <!-- API Key Config Card -->
          <div class="card" style="border:1px solid var(--slate-200);">
            <h4 style="font-size:var(--fs-md); font-weight:800; margin-bottom:var(--sp-2);">
              <i class="fa-solid fa-key" style="color:var(--slate-600); margin-right:var(--sp-1);"></i> Cài đặt Google Gemini API Key
            </h4>
            <p class="text-xs text-muted" style="margin-bottom:var(--sp-3); line-height:1.5;">
              Khóa API dùng để kích hoạt Camera AI và Tra cứu dinh dưỡng. Được lưu an toàn trên trình duyệt của bạn.
            </p>
            <div style="display:flex; gap:var(--sp-2); margin-bottom:var(--sp-2);">
              <input type="password" id="input-profile-api-key" class="search-bar__input" 
                     value="${currentApiKey}" placeholder="Nhập Gemini API Key từ Google AI Studio..." style="padding-left:var(--sp-3); flex:1;" />
              <button class="btn btn--outline" id="btn-save-profile-api-key" style="white-space:nowrap;">
                <i class="fa-solid fa-floppy-disk"></i> Lưu
              </button>
            </div>

            <!-- Connection test row -->
            <div style="display:flex; gap:var(--sp-2); align-items:center; margin-bottom:var(--sp-2);">
              <button class="btn btn--outline btn--sm" id="btn-test-connection" style="flex:1;">
                <i class="fa-solid fa-plug-circle-check"></i> Kiểm tra kết nối & Tìm model khả dụng
              </button>
              <button class="btn btn--outline btn--sm" id="btn-reset-model-cache" title="Xóa cache model đã lưu để thử lại">
                <i class="fa-solid fa-rotate"></i> Làm mới
              </button>
            </div>

            <!-- Status output -->
            <div id="api-test-result" style="display:none; padding:var(--sp-2) var(--sp-3); border-radius:var(--radius-lg); font-size:var(--fs-xs); line-height:1.6;"></div>

            <div style="margin-top:var(--sp-2); display:flex; justify-content:space-between; align-items:center;">
              <span class="text-xs text-muted" id="api-current-model" style="font-style:italic;">
                Model đang dùng: <strong>${localStorage.getItem('nf_working_model') || 'gemini-2.5-flash (mặc định)'}</strong>
              </span>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="text-xs text-bold" style="color:var(--primary-600);">
                Lấy API key miễn phí <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>
          </div>
        </div>
      </div>
    `;

    setupEvents(container);
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

  function setupEvents(container) {
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
    };

    // Nút Lưu API Key
    const btnSaveApiKey = container.querySelector('#btn-save-profile-api-key');
    const inputApiKey = container.querySelector('#input-profile-api-key');
    btnSaveApiKey.onclick = () => {
      const val = inputApiKey.value.trim();
      if (!val) {
        NF_UI.showToast('Vui lòng nhập API Key', 'warning');
        return;
      }
      localStorage.setItem('nf_gemini_api_key', val);
      if (typeof GEMINI_CONFIG !== 'undefined') {
        GEMINI_CONFIG.apiKey = val;
      }
      // Xóa cache model cũ để kết nối lại với key mới
      localStorage.removeItem('nf_working_model');
      localStorage.removeItem('nf_working_version');
      NF_UI.showToast('Đã lưu API Key! Đang tìm model khả dụng...', 'success');

      // Tự động kiểm tra kết nối sau khi lưu key mới
      setTimeout(() => {
        const testBtn = container.querySelector('#btn-test-connection');
        if (testBtn) testBtn.click();
      }, 500);
    };

    // Nút Kiểm tra kết nối
    const btnTestConn = container.querySelector('#btn-test-connection');
    const apiTestResult = container.querySelector('#api-test-result');
    const apiCurrentModel = container.querySelector('#api-current-model');

    if (btnTestConn && apiTestResult) {
      btnTestConn.onclick = async () => {
        const keyVal = inputApiKey ? inputApiKey.value.trim() : '';

        if (!keyVal || keyVal.length < 10) {
          apiTestResult.style.display = 'block';
          apiTestResult.style.background = '#fff3cd';
          apiTestResult.style.border = '1px solid #ffc107';
          apiTestResult.style.color = '#856404';
          apiTestResult.innerHTML = '⚠️ Vui lòng nhập API Key trước khi kiểm tra kết nối.';
          return;
        }

        NF_UI.showInlineLoading(btnTestConn);
        apiTestResult.style.display = 'block';
        apiTestResult.style.background = 'var(--slate-50)';
        apiTestResult.style.border = '1px solid var(--slate-200)';
        apiTestResult.style.color = 'var(--slate-700)';
        apiTestResult.innerHTML = '<span class="loading-spinner loading-spinner--sm" style="display:inline-block; vertical-align:middle; margin-right:0.25rem;"></span> Đang gọi Google API để lấy danh sách model...';

        try {
          const result = await NF_Gemini.testConnection(keyVal);
          NF_UI.hideInlineLoading(btnTestConn);

          if (result.ok) {
            apiTestResult.style.background = '#d1fae5';
            apiTestResult.style.border = '1px solid #a7f3d0';
            apiTestResult.style.color = '#065f46';
            apiTestResult.innerHTML = `
              ✅ <strong>Kết nối thành công!</strong><br>
              Đã tìm thấy <strong>${result.models ? result.models.length : '?'}</strong> model khả dụng.<br>
              Model tối ưu đã chọn: <strong style="font-family:monospace;">${localStorage.getItem('nf_working_model') || 'gemini-2.5-flash'}</strong><br>
              <em style="font-size:0.6rem; color:#047857;">Danh sách đầy đủ: ${(result.models || []).slice(0, 6).join(', ')}...</em>
            `;
            if (apiCurrentModel) {
              apiCurrentModel.innerHTML = `Model đang dùng: <strong>${localStorage.getItem('nf_working_model') || 'gemini-2.5-flash'}</strong>`;
            }
            NF_UI.showToast('Kết nối Gemini AI thành công!', 'success');
          } else {
            apiTestResult.style.background = '#fee2e2';
            apiTestResult.style.border = '1px solid #fca5a5';
            apiTestResult.style.color = '#991b1b';
            apiTestResult.innerHTML = `
              ❌ <strong>Kết nối thất bại:</strong> ${result.message}
              <br><em style="font-size:0.6rem; margin-top:0.25rem; display:block;">Hãy kiểm tra lại API Key hoặc đảm bảo API "Generative Language API" đã được bật trong Google Cloud Console.</em>
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

    // Nút Làm mới (xóa cache model)
    const btnResetCache = container.querySelector('#btn-reset-model-cache');
    if (btnResetCache) {
      btnResetCache.onclick = () => {
        localStorage.removeItem('nf_working_model');
        localStorage.removeItem('nf_working_version');
        if (apiCurrentModel) {
          apiCurrentModel.innerHTML = 'Model đang dùng: <strong>gemini-2.5-flash (mặc định)</strong>';
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
          <h4 style="font-size:var(--fs-md); font-weight:800; color:var(--slate-900);">${plan.planName}</h4>
          <span class="tag tag--primary">${plan.totalCalories} kcal</span>
        </div>

        ${(plan.meals || []).map((m, idx) => `
          <div class="meal-plan-card ${mealCardClasses[m.type] || 'meal-plan-card--lunch'}">
            <div class="meal-plan-card__header">
              <span class="meal-plan-card__type">${NF_UI.getMealIcon(m.type)} ${m.type}</span>
              <span class="meal-plan-card__cal">${m.calories} kcal</span>
            </div>
            <div class="meal-plan-card__name">${m.name}</div>
            <div class="meal-plan-card__macros">
              Carb: ${m.carb}g • Protein: ${m.protein}g • Fat: ${m.fat}g
            </div>
            ${m.description ? `<div class="meal-plan-card__desc">${m.description}</div>` : ''}
            <button class="btn btn--outline btn--sm btn-add-plan-meal" data-idx="${idx}" 
                    style="margin-top:var(--sp-2); font-size:var(--fs-xs); background:var(--white); padding:0.25rem 0.5rem;">
              <i class="fa-solid fa-plus"></i> Thêm vào nhật ký hôm nay
            </button>
          </div>
        `).join('')}

        ${plan.advice ? `
          <div class="advice-box advice-box--success">
            <i class="fa-solid fa-lightbulb"></i>
            <strong>Lời khuyên từ AI:</strong> ${plan.advice}
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
        NF_UI.showToast(`Đã thêm "${m.name}" (${m.type}) vào nhật ký!`, 'success');
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
