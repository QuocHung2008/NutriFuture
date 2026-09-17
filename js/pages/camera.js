/**
 * NutriFuture — Camera AI Page (Toàn màn hình)
 * Nhận diện món ăn thời gian thực qua Camera hoặc Tải ảnh lên bằng Google Gemini Vision API
 */
const NF_PageCamera = (() => {
  'use strict';

  let currentStream = null;
  let capturedBase64 = null;
  let lastAnalysisResult = null;
  let currentFacingMode = 'environment'; // 'environment' = camera sau, 'user' = camera trước

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    document.body.classList.remove('camera-active');
  }

  function render(container) {
    // Dừng camera cũ nếu đang chạy
    stopCamera();
    capturedBase64 = null;
    lastAnalysisResult = null;
    currentFacingMode = 'environment';

    // Bật chế độ toàn màn hình: ẩn header/thanh điều hướng
    document.body.classList.add('camera-active');

    const hasApiKey = NF_Gemini.isConfigured();

    container.innerHTML = `
      <div class="page page--camera">
        <div class="camera-stage" id="camera-viewport">
          <video id="camera-video" playsinline autoplay muted style="display:none;"></video>
          <img id="camera-preview" style="display:none;" alt="Captured preview" />

          <!-- Placeholder when camera is inactive -->
          <div class="camera-placeholder" id="camera-placeholder">
            <div class="camera-placeholder__icon">
              <i class="fa-solid fa-camera"></i>
            </div>
            <p>Bật camera hoặc tải ảnh đĩa thức ăn lên để AI phân tích</p>
            ${!hasApiKey ? `
              <button class="btn btn--primary" id="btn-quick-config-api" style="margin-top:var(--sp-3);">
                <i class="fa-solid fa-key"></i> Nhập API Key Gemini
              </button>
            ` : ''}
          </div>

          <!-- Scanning animation overlay -->
          <div class="scanner-overlay hidden" id="scanner-overlay">
            <div class="scanner-overlay__bg"></div>
            <div class="scanner-line"></div>
            <div class="scanner-info">
              <span><i class="fa-solid fa-brain"></i> Gemini Vision đang phân tích...</span>
              <span class="loading-spinner loading-spinner--sm"></span>
            </div>
          </div>

          <!-- Hidden canvas for capture -->
          <canvas id="camera-canvas" style="display:none;"></canvas>

          <!-- Thanh trên: quay lại + tiêu đề + lật camera -->
          <div class="camera-topbar">
            <button class="camera-icon-btn" id="btn-camera-back" title="Quay lại">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="camera-topbar__title">Camera AI</div>
            <button class="camera-icon-btn hidden" id="btn-flip-camera" title="Lật camera trước/sau">
              <i class="fa-solid fa-rotate"></i>
            </button>
          </div>

          <!-- Thanh dưới: điều khiển nổi trên video -->
          <div class="camera-bottombar" id="camera-controls-start">
            <div class="btn--start-group">
              <button class="camera-btn camera-btn--primary" id="btn-start-camera">
                <i class="fa-solid fa-video"></i> Mở Camera
              </button>
              <button class="camera-btn camera-btn--secondary" id="btn-upload-file">
                <i class="fa-solid fa-image"></i> Tải ảnh lên
              </button>
              <input type="file" id="file-input-image" accept="image/*" style="display:none;" />
            </div>
          </div>

          <div class="camera-bottombar hidden" id="camera-controls-live">
            <button class="camera-icon-btn" id="btn-cancel-camera" title="Hủy">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button class="shutter-btn" id="btn-capture-shot" title="Chụp ngay" aria-label="Chụp ảnh"></button>
            <button class="camera-icon-btn" id="btn-flip-camera-live" title="Lật camera trước/sau">
              <i class="fa-solid fa-rotate"></i>
            </button>
          </div>

          <div class="camera-bottombar hidden" id="camera-controls-retake">
            <div class="btn--start-group">
              <button class="camera-btn camera-btn--secondary" id="btn-retake">
                <i class="fa-solid fa-rotate-left"></i> Chụp lại
              </button>
              <button class="camera-btn camera-btn--primary" id="btn-reanalyze">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Phân tích lại
              </button>
            </div>
          </div>

          <!-- Kết quả phân tích: trượt lên như bottom sheet -->
          <div class="camera-result-sheet" id="camera-result-container"></div>
        </div>
      </div>
    `;

    setupEvents(container);
  }

  function setupEvents(container) {
    const video = container.querySelector('#camera-video');
    const previewImg = container.querySelector('#camera-preview');
    const placeholder = container.querySelector('#camera-placeholder');
    const canvas = container.querySelector('#camera-canvas');
    const scannerOverlay = container.querySelector('#scanner-overlay');

    const controlsStart = container.querySelector('#camera-controls-start');
    const controlsLive = container.querySelector('#camera-controls-live');
    const controlsRetake = container.querySelector('#camera-controls-retake');

    const btnStartCamera = container.querySelector('#btn-start-camera');
    const btnCancelCamera = container.querySelector('#btn-cancel-camera');
    const btnCaptureShot = container.querySelector('#btn-capture-shot');
    const btnUploadFile = container.querySelector('#btn-upload-file');
    const fileInput = container.querySelector('#file-input-image');
    const btnRetake = container.querySelector('#btn-retake');
    const btnReanalyze = container.querySelector('#btn-reanalyze');
    const btnQuickConfig = container.querySelector('#btn-quick-config-api');
    const btnBack = container.querySelector('#btn-camera-back');
    const btnFlipTop = container.querySelector('#btn-flip-camera');
    const btnFlipLive = container.querySelector('#btn-flip-camera-live');

    if (btnQuickConfig) {
      btnQuickConfig.onclick = showApiKeyModal;
    }

    btnBack.onclick = () => { location.hash = '#home'; };

    async function openCamera() {
      try {
        stopCameraStreamOnly();
        placeholder.style.display = 'none';
        previewImg.style.display = 'none';
        video.style.display = 'block';

        const constraints = {
          video: {
            facingMode: { ideal: currentFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        video.srcObject = stream;
        await video.play();

        // Camera trước thường được xem như gương -> lật ngang cho tự nhiên.
        // Camera sau giữ nguyên chiều thật của khung cảnh.
        video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';

        controlsStart.classList.add('hidden');
        controlsLive.classList.remove('hidden');
        controlsRetake.classList.add('hidden');
        btnFlipTop.classList.remove('hidden');
      } catch (err) {
        console.error('Camera error:', err);
        placeholder.style.display = 'flex';
        video.style.display = 'none';
        NF_UI.showToast('Không thể truy cập camera. Hãy cấp quyền hoặc tải ảnh lên từ thư viện.', 'warning');
      }
    }

    function stopCameraStreamOnly() {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
    }

    // Mở Camera stream
    btnStartCamera.onclick = openCamera;

    // Lật camera trước/sau (giữ phiên đang mở)
    const flipCamera = () => {
      currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      NF_UI.showToast(currentFacingMode === 'user' ? 'Đã chuyển sang camera trước' : 'Đã chuyển sang camera sau', 'info');
      openCamera();
    };
    btnFlipTop.onclick = flipCamera;
    btnFlipLive.onclick = flipCamera;

    // Hủy camera
    btnCancelCamera.onclick = () => {
      stopCameraStreamOnly();
      video.style.display = 'none';
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';

      controlsStart.classList.remove('hidden');
      controlsLive.classList.add('hidden');
      controlsRetake.classList.add('hidden');
      btnFlipTop.classList.add('hidden');
    };

    // Chụp từ camera
    btnCaptureShot.onclick = () => {
      if (!video.videoWidth || !video.videoHeight) {
        NF_UI.showToast('Camera chưa sẵn sàng. Vui lòng thử lại.', 'warning');
        return;
      }

      // Giới hạn độ phân giải để upload nhanh
      const maxDim = 1024;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Nếu đang dùng camera trước (đã lật hiển thị), lật lại khi lưu ảnh
      // để ảnh gửi cho AI đúng chiều thật, không bị ngược chữ/ vật thể.
      if (currentFacingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);

      capturedBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // Hiển thị ảnh chụp và dừng camera
      stopCameraStreamOnly();
      video.style.display = 'none';
      previewImg.src = capturedBase64;
      previewImg.style.display = 'block';
      previewImg.style.transform = 'none';

      controlsLive.classList.add('hidden');
      controlsRetake.classList.remove('hidden');
      btnFlipTop.classList.add('hidden');

      // Tự động phân tích
      analyzeCurrentPhoto(container);
    };

    // Tải ảnh từ máy
    btnUploadFile.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // Chặn sớm file quá lớn (ảnh RAW/HEIC gốc vài chục MB) TRƯỚC khi đọc vào bộ nhớ
      // qua FileReader — tránh treo trình duyệt trên máy yếu/điện thoại cũ.
      const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
      if (file.size > MAX_UPLOAD_BYTES) {
        NF_UI.showToast(
          `Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ảnh dưới 20MB.`,
          'warning'
        );
        fileInput.value = '';
        return;
      }

      stopCameraStreamOnly();
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          capturedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          placeholder.style.display = 'none';
          video.style.display = 'none';
          previewImg.src = capturedBase64;
          previewImg.style.display = 'block';
          previewImg.style.transform = 'none';

          controlsStart.classList.add('hidden');
          controlsLive.classList.add('hidden');
          controlsRetake.classList.remove('hidden');
          btnFlipTop.classList.add('hidden');

          analyzeCurrentPhoto(container);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    // Nút chụp lại
    btnRetake.onclick = () => {
      capturedBase64 = null;
      lastAnalysisResult = null;
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';

      const resultBox = container.querySelector('#camera-result-container');
      if (resultBox) {
        resultBox.innerHTML = '';
        resultBox.classList.remove('is-open');
      }

      controlsRetake.classList.add('hidden');
      controlsStart.classList.remove('hidden');
    };

    // Phân tích lại
    btnReanalyze.onclick = () => {
      if (capturedBase64) {
        analyzeCurrentPhoto(container);
      }
    };
  }

  async function analyzeCurrentPhoto(container) {
    const scannerOverlay = container.querySelector('#scanner-overlay');
    const resultBox = container.querySelector('#camera-result-container');

    if (!NF_Gemini.isConfigured()) {
      showApiKeyModal();
      return;
    }

    if (!capturedBase64) {
      NF_UI.showToast('Vui lòng chụp hoặc chọn ảnh trước.', 'warning');
      return;
    }

    scannerOverlay.classList.remove('hidden');
    resultBox.classList.remove('is-open');
    resultBox.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">Gemini Vision AI đang nhận diện món ăn & ước tính dinh dưỡng...</p>
      </div>
    `;
    requestAnimationFrame(() => resultBox.classList.add('is-open'));

    try {
      const data = await NF_Gemini.analyzeImage(capturedBase64);
      lastAnalysisResult = data;
      scannerOverlay.classList.add('hidden');
      renderResult(resultBox, data);
      NF_UI.showToast(`Đã nhận diện thành công: ${NF_UI.escapeHtml(data.name)}!`, 'success');
    } catch (err) {
      console.error('Analyze error:', err);
      scannerOverlay.classList.add('hidden');
      const msg = NF_Gemini.getErrorMessage(err);
      resultBox.innerHTML = `
        <div class="advice-box advice-box--warning">
          <div style="font-weight:700; margin-bottom:var(--sp-1);">
            <i class="fa-solid fa-triangle-exclamation"></i> Không thể phân tích ảnh
          </div>
          <p>${msg}</p>
          <div style="margin-top:var(--sp-3); display:flex; gap:var(--sp-2); flex-wrap:wrap;">
            <button class="btn btn--outline btn--sm" id="btn-retry-err">
              <i class="fa-solid fa-rotate-right"></i> Thử lại
            </button>
            <button class="btn btn--outline btn--sm" id="btn-open-config-err">
              <i class="fa-solid fa-key"></i> Kiểm tra API Key
            </button>
          </div>
        </div>
      `;

      const retryBtn = resultBox.querySelector('#btn-retry-err');
      if (retryBtn) retryBtn.onclick = () => analyzeCurrentPhoto(container);

      const configBtn = resultBox.querySelector('#btn-open-config-err');
      if (configBtn) configBtn.onclick = showApiKeyModal;
    }
  }

  function renderResult(targetEl, data) {
    const defaultMealType = getDefaultMealType();

    targetEl.innerHTML = `
      <div class="result-card" style="border:none; background:transparent; padding:0;">
        <div class="result-card__header">
          <div>
            <span class="result-card__badge">
              <i class="fa-solid fa-sparkles"></i> AI Phân Tích
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

        <!-- 3 Macronutrients + Fiber -->
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

        <!-- Micronutrients & Food Group -->
        <div style="display:flex; flex-direction:column; gap:var(--sp-2); margin-bottom:var(--sp-3);">
          ${data.foodGroup ? `
            <div class="text-xs text-muted" style="overflow-wrap:break-word;">
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
              <strong>Lời khuyên học đường:</strong> ${NF_UI.escapeHtml(data.advice)}
            </div>
          ` : ''}
        </div>

        <!-- Save to Diary Action -->
        <div class="card card--glass" style="background:var(--white); border:1px solid var(--slate-200); padding:var(--sp-3);">
          <div style="font-weight:700; font-size:var(--fs-sm); margin-bottom:var(--sp-2);">
            Lưu món ăn này vào nhật ký hôm nay
          </div>
          <div style="display:flex; gap:var(--sp-2); align-items:center; flex-wrap:wrap;">
            <select id="save-meal-type-select" class="search-bar__input" style="padding:0.5rem var(--sp-2); width:auto; flex:1; min-width:9rem;">
              <option value="Bữa Sáng" ${defaultMealType === 'Bữa Sáng' ? 'selected' : ''}>🌅 Bữa Sáng</option>
              <option value="Bữa Trưa" ${defaultMealType === 'Bữa Trưa' ? 'selected' : ''}>☀️ Bữa Trưa</option>
              <option value="Bữa Tối" ${defaultMealType === 'Bữa Tối' ? 'selected' : ''}>🌙 Bữa Tối</option>
              <option value="Bữa Phụ" ${defaultMealType === 'Bữa Phụ' ? 'selected' : ''}>🍎 Bữa Phụ</option>
            </select>
            <button class="btn btn--primary" id="btn-save-to-diary" style="white-space:nowrap;">
              <i class="fa-solid fa-bookmark"></i> Lưu vào nhật ký
            </button>
          </div>
        </div>
      </div>
    `;

    const btnSave = targetEl.querySelector('#btn-save-to-diary');
    const mealSelect = targetEl.querySelector('#save-meal-type-select');

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
          source: 'camera',
          time: NF_UI.getTimeNow(),
        };

        NF_Storage.addDiaryEntry(entry, NF_Storage.getToday());
        NF_UI.showToast(`Đã lưu "${NF_UI.escapeHtml(data.name)}" vào ${mealType} hôm nay!`, 'success');
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu';
      };
    }
  }

  function getDefaultMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'Bữa Sáng';
    if (hour >= 10 && hour < 14) return 'Bữa Trưa';
    if (hour >= 14 && hour < 17) return 'Bữa Phụ';
    return 'Bữa Tối';
  }

  function showApiKeyModal() {
    const currentKey = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE')
      ? GEMINI_CONFIG.apiKey
      : (localStorage.getItem('nf_gemini_api_key') || '');

    const html = `
      <div style="padding:var(--sp-2);">
        <h3 style="font-size:var(--fs-xl); font-weight:800; margin-bottom:var(--sp-2);">
          <i class="fa-solid fa-key" style="color:var(--primary-600);"></i> Cấu hình Google Gemini API Key
        </h3>
        <p class="text-sm text-muted" style="margin-bottom:var(--sp-3); line-height:1.5;">
          Khóa API được lưu trữ an toàn trong trình duyệt cục bộ của bạn để phục vụ việc phân tích hình ảnh và tra cứu.
        </p>
        
        <div style="margin-bottom:var(--sp-3);">
          <label class="card__label" for="input-modal-api-key">GEMINI API KEY</label>
          <input type="password" id="input-modal-api-key" class="search-bar__input" 
                 value="${currentKey}" placeholder="AIzaSy..." style="padding-left:var(--sp-3);" />
          <div style="display:flex; justify-content:space-between; margin-top:0.25rem; flex-wrap:wrap; gap:0.25rem;">
            <span class="text-xs text-muted">Lấy key miễn phí tại:</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="text-xs text-bold">
              Google AI Studio <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>

        <div style="display:flex; gap:var(--sp-2); justify-content:flex-end; margin-top:var(--sp-4);">
          <button class="btn btn--outline" id="btn-modal-cancel-key">Hủy</button>
          <button class="btn btn--primary" id="btn-modal-save-key">Lưu cấu hình</button>
        </div>
      </div>
    `;

    NF_UI.showModal(html);

    document.getElementById('btn-modal-cancel-key').onclick = NF_UI.closeModal;
    document.getElementById('btn-modal-save-key').onclick = () => {
      const keyVal = document.getElementById('input-modal-api-key').value.trim();
      if (!keyVal) {
        NF_UI.showToast('Vui lòng nhập API key hợp lệ', 'warning');
        return;
      }
      localStorage.setItem('nf_gemini_api_key', keyVal);
      if (typeof GEMINI_CONFIG !== 'undefined') {
        GEMINI_CONFIG.apiKey = keyVal;
      }
      NF_UI.closeModal();
      NF_UI.showToast('Đã lưu API Key thành công!', 'success');
      // Re-render current page
      const content = document.getElementById('app-content');
      if (content) render(content);
    };
  }

  return {
    render,
    stopCamera,
    showApiKeyModal
  };
})();