/**
 * NutriFuture — Gemini API Wrapper
 * Gọi Google Gemini API (Text + Vision) trực tiếp từ browser.
 * Hỗ trợ tự động fallback model, kiểm tra kết nối và chẩn đoán lỗi chi tiết.
 */
const NF_Gemini = (() => {
  'use strict';

  /* ─── Lấy API Key (được trim sạch khoảng trắng) ─── */

  function getApiKey() {
    let key = '';
    if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      key = GEMINI_CONFIG.apiKey;
    } else {
      key = localStorage.getItem('nf_gemini_api_key') || '';
    }
    return (key || '').trim();
  }

  const CANDIDATE_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  const API_VERSIONS = ['v1beta', 'v1'];

  function getModel() {
    const cached = localStorage.getItem('nf_working_model');
    if (cached) return cached;
    if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.model) {
      return GEMINI_CONFIG.model;
    }
    return 'gemini-1.5-flash';
  }

  function getApiVersion() {
    return localStorage.getItem('nf_working_version') || 'v1beta';
  }

  function isConfigured() {
    const key = getApiKey();
    return !!(key && key.length > 10 && key !== 'YOUR_GEMINI_API_KEY_HERE');
  }

  function _getApiUrl(model, version) {
    const m = model || getModel();
    const ver = version || getApiVersion();
    const key = encodeURIComponent(getApiKey());
    return `https://generativelanguage.googleapis.com/${ver}/models/${m}:generateContent?key=${key}`;
  }

  /* ─── Thực thi gọi API với 1 model & version cụ thể ─── */

  async function _executeRequest(model, body, version = 'v1beta') {
    const url = _getApiUrl(model, version);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn(`[Gemini API] Request failed (${version}/${model}):`, response.status, errData);
      
      const googleMsg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(googleMsg);
      err.status = response.status;
      err.details = errData;
      err.model = model;
      err.version = version;
      throw err;
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('EMPTY_RESPONSE');

    // Lưu lại model & version hoạt động tốt
    localStorage.setItem('nf_working_model', model);
    localStorage.setItem('nf_working_version', version);
    return text;
  }

  /* ─── Gọi API chung với cơ chế Auto-Fallback thông minh ─── */

  async function _call(prompt, base64Image = null) {
    if (!isConfigured()) {
      throw new Error('API_NOT_CONFIGURED');
    }

    const parts = [];
    parts.push({ text: prompt });

    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: cleanBase64
        }
      });
    }

    const body = {
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.maxTokens) ? GEMINI_CONFIG.maxTokens : 2048,
        temperature: 0.3,
      }
    };

    const primaryModel = getModel();
    const primaryVer = getApiVersion();

    try {
      return await _executeRequest(primaryModel, body, primaryVer);
    } catch (err) {
      // Nếu gặp lỗi 404 (model không tìm thấy), thử tự động tìm model khả dụng
      if (err.status === 404) {
        console.info(`[Gemini API] Model "${primaryModel}" (${primaryVer}) trả về 404. Đang thử các tổ hợp model/version dự phòng...`);
        
        for (const ver of API_VERSIONS) {
          for (const candidate of CANDIDATE_MODELS) {
            if (candidate === primaryModel && ver === primaryVer) continue;
            try {
              console.info(`[Gemini API] Thử kết nối: ${ver}/${candidate}`);
              const text = await _executeRequest(candidate, body, ver);
              console.info(`[Gemini API] Kết nối thành công với: ${ver}/${candidate}!`);
              return text;
            } catch (retryErr) {
              if (retryErr.status === 404) continue;
              throw retryErr;
            }
          }
        }
      }

      throw err;
    }
  }

  /* ─── Chẩn đoán & Kiểm tra kết nối API Key ─── */

  async function testConnection(keyOverride) {
    const key = (keyOverride || getApiKey()).trim();
    if (!key) {
      return { ok: false, message: 'Chưa nhập API Key.' };
    }

    let lastError = null;

    for (const ver of API_VERSIONS) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          const models = (data.models || [])
            .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''));
          
          // Tự động tìm model tốt nhất để lưu
          for (const p of CANDIDATE_MODELS) {
            if (models.includes(p)) {
              localStorage.setItem('nf_working_model', p);
              localStorage.setItem('nf_working_version', ver);
              break;
            }
          }

          return {
            ok: true,
            version: ver,
            models: models,
            message: `Kết nối thành công (${ver})! Đã tìm thấy ${models.length} model khả dụng: ${models.slice(0, 4).join(', ')}...`
          };
        } else {
          lastError = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return {
      ok: false,
      message: lastError || 'Không thể kết nối đến máy chủ Google.'
    };
  }

  /* ─── Parse JSON từ response (xử lý markdown code blocks) ─── */

  function _parseJSON(text) {
    let cleaned = text.trim();
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          throw new Error('PARSE_ERROR');
        }
      }
      throw new Error('PARSE_ERROR');
    }
  }

  /* ─── Thông báo lỗi tiếng Việt chi tiết ─── */

  function getErrorMessage(error) {
    const msg = error?.message || String(error);
    const detail = error?.details?.error?.message;
    const fullDetail = detail ? `"${detail}"` : (msg ? `"${msg}"` : '');

    if (msg === 'API_NOT_CONFIGURED') {
      return 'Chưa cấu hình API key. Vui lòng vào mục Hồ sơ để nhập API key.';
    }

    if (error?.status === 401 || error?.status === 403 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('permission')) {
      return `Lỗi xác thực API Key (${error?.status || 403}): ${fullDetail}. Hãy kiểm tra lại API key hoặc bỏ giới hạn HTTP Referrer trong Google Cloud Console khi chạy thử nghiệm trên localhost.`;
    }

    if (error?.status === 404 || msg.includes('404')) {
      return `Lỗi 404 từ Google: ${fullDetail}. Nguyên nhân thường gặp:\n1. API key chưa được bật API "Generative Language API" trên Google Cloud Console.\n2. Key bị dán sai ký tự.\n3. Bạn có thể bấm "Kiểm tra kết nối" trong Hồ sơ để xem chi tiết.`;
    }

    if (error?.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      return `Đã vượt giới hạn lượt gọi miễn phí của Google (429): ${fullDetail}. Vui lòng thử lại sau vài giây.`;
    }

    if (msg === 'NO_FOOD_DETECTED') {
      return 'Không nhận diện được món ăn trong ảnh. Hãy chụp rõ hơn hoặc tải ảnh đĩa thức ăn góc chính diện.';
    }

    if (msg === 'PARSE_ERROR') {
      return 'AI phản hồi dữ liệu không đúng cấu trúc. Vui lòng bấm thử lại.';
    }

    if (msg === 'NETWORK_ERROR' || msg.toLowerCase().includes('failed to fetch')) {
      return 'Lỗi kết nối mạng hoặc trình duyệt chặn CORS. Hãy kiểm tra kết nối internet.';
    }

    return `Lỗi từ Gemini AI: ${fullDetail || msg}`;
  }

  /* ─── API: Nhận diện ảnh món ăn (Gemini Vision) ─── */

  async function analyzeImage(base64Image) {
    const prompt = `Bạn là chuyên gia dinh dưỡng Việt Nam. Phân tích hình ảnh món ăn này và ước tính thành phần dinh dưỡng cho 1 khẩu phần.

CHỈ trả về JSON thuần (không có text ngoài JSON), theo đúng format:
{
  "name": "Tên món ăn bằng tiếng Việt",
  "serving": "Mô tả khẩu phần (vd: 1 đĩa ~350g)",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carb": 0,
  "fiber": 0,
  "vitamins": ["tên vitamin chính"],
  "minerals": ["tên khoáng chất chính"],
  "foodGroup": "Nhóm thực phẩm chính (Tinh bột / Chất đạm / Chất béo / Vitamin & Khoáng chất)",
  "advice": "1 câu lời khuyên dinh dưỡng ngắn cho học sinh THPT (15-18 tuổi)"
}

Nếu KHÔNG nhận diện được thức ăn trong hình, trả về:
{"error": "NO_FOOD_DETECTED"}

Lưu ý: Giá trị dinh dưỡng phải là số (không có đơn vị). Ước tính dựa trên khẩu phần trung bình tại Việt Nam.`;

    const text = await _call(prompt, base64Image);
    const data = _parseJSON(text);
    
    if (data.error === 'NO_FOOD_DETECTED') {
      throw new Error('NO_FOOD_DETECTED');
    }

    return {
      name: data.name || 'Món ăn không xác định',
      serving: data.serving || 'Ước tính',
      calories: Math.round(Number(data.calories)) || 0,
      protein: Math.round(Number(data.protein) * 10) / 10 || 0,
      fat: Math.round(Number(data.fat) * 10) / 10 || 0,
      carb: Math.round(Number(data.carb) * 10) / 10 || 0,
      fiber: Math.round(Number(data.fiber) * 10) / 10 || 0,
      vitamins: Array.isArray(data.vitamins) ? data.vitamins : [],
      minerals: Array.isArray(data.minerals) ? data.minerals : [],
      foodGroup: data.foodGroup || '',
      advice: data.advice || '',
      source: 'camera'
    };
  }

  /* ─── API: Tra cứu món ăn bằng text ─── */

  async function searchFood(query) {
    const prompt = `Bạn là chuyên gia dinh dưỡng Việt Nam. Cung cấp thông tin dinh dưỡng cho món ăn: "${query}"

CHỈ trả về JSON thuần (không có text ngoài JSON), theo đúng format:
{
  "name": "Tên đầy đủ của món ăn (tiếng Việt)",
  "serving": "Khẩu phần tiêu chuẩn (vd: 1 tô ~400g)",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carb": 0,
  "fiber": 0,
  "vitamins": ["vitamin chính"],
  "minerals": ["khoáng chất chính"],
  "foodGroup": "Nhóm thực phẩm (Tinh bột / Chất đạm / Chất béo / Vitamin & Khoáng chất)",
  "advice": "1 câu lời khuyên dinh dưỡng cho học sinh THPT (15-18 tuổi)"
}

Lưu ý: Giá trị phải là số. Ước tính dựa trên khẩu phần trung bình tại Việt Nam.`;

    const text = await _call(prompt);
    const data = _parseJSON(text);

    return {
      name: data.name || query,
      serving: data.serving || 'Ước tính',
      calories: Math.round(Number(data.calories)) || 0,
      protein: Math.round(Number(data.protein) * 10) / 10 || 0,
      fat: Math.round(Number(data.fat) * 10) / 10 || 0,
      carb: Math.round(Number(data.carb) * 10) / 10 || 0,
      fiber: Math.round(Number(data.fiber) * 10) / 10 || 0,
      vitamins: Array.isArray(data.vitamins) ? data.vitamins : [],
      minerals: Array.isArray(data.minerals) ? data.minerals : [],
      foodGroup: data.foodGroup || '',
      advice: data.advice || '',
      source: 'lookup'
    };
  }

  /* ─── API: Gợi ý thực đơn AI ─── */

  async function suggestMealPlan(profile) {
    const genderVi = profile.gender === 'male' ? 'Nam' : 'Nữ';
    const prompt = `Bạn là chuyên gia dinh dưỡng Việt Nam. Gợi ý thực đơn 1 ngày cho học sinh THPT:
- Giới tính: ${genderVi}
- Tuổi: ${profile.age} tuổi
- TDEE: ${profile.tdee} kcal/ngày
- BMI: ${profile.bmi}

Yêu cầu:
- Cân đối 4 nhóm chất: tinh bột (50-55%), chất đạm (15-20%), chất béo (25-30%), vitamin/khoáng chất
- Món ăn Việt Nam phổ biến, dễ tìm
- 3 bữa chính + 1 bữa phụ
- Tổng calo xấp xỉ TDEE

CHỈ trả về JSON thuần:
{
  "planName": "Tên thực đơn mô tả",
  "meals": [
    {
      "type": "Bữa Sáng",
      "name": "Tên món",
      "calories": 0,
      "protein": 0,
      "fat": 0,
      "carb": 0,
      "description": "Mô tả ngắn"
    }
  ],
  "totalCalories": 0,
  "advice": "1-2 câu lời khuyên dinh dưỡng chung"
}`;

    const text = await _call(prompt);
    const data = _parseJSON(text);

    return {
      planName: data.planName || 'Thực đơn AI',
      meals: (data.meals || []).map(m => ({
        type: m.type || 'Bữa ăn',
        name: m.name || '',
        calories: Math.round(Number(m.calories)) || 0,
        protein: Math.round(Number(m.protein) * 10) / 10 || 0,
        fat: Math.round(Number(m.fat) * 10) / 10 || 0,
        carb: Math.round(Number(m.carb) * 10) / 10 || 0,
        description: m.description || '',
      })),
      totalCalories: Math.round(Number(data.totalCalories)) || 0,
      advice: data.advice || '',
    };
  }

  return {
    isConfigured,
    analyzeImage,
    searchFood,
    suggestMealPlan,
    getErrorMessage,
    testConnection,
  };
})();
