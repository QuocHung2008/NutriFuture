/**
 * NutriFuture — Gemini API Wrapper
 * Gọi Google Gemini API (Text + Vision) trực tiếp từ browser.
 * 
 * LƯU Ý: API key nằm client-side do ràng buộc static hosting.
 * Đã giảm thiểu rủi ro bằng HTTP referrer restriction + quota thấp.
 */
const NF_Gemini = (() => {
  'use strict';

  /* ─── Kiểm tra cấu hình ─── */

  function getApiKey() {
    if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      return GEMINI_CONFIG.apiKey;
    }
    return localStorage.getItem('nf_gemini_api_key') || '';
  }

  const CANDIDATE_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro'
  ];

  function getModel() {
    const cached = localStorage.getItem('nf_working_model');
    if (cached) return cached;
    if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.model) {
      return GEMINI_CONFIG.model;
    }
    return 'gemini-1.5-flash';
  }

  function isConfigured() {
    const key = getApiKey();
    return !!(key && key.trim().length > 10 && key !== 'YOUR_GEMINI_API_KEY_HERE');
  }

  function _getApiUrl(model) {
    const m = model || getModel();
    const key = getApiKey();
    return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
  }

  /* ─── Thực thi gọi API với 1 model cụ thể ─── */

  async function _executeRequest(model, body) {
    const url = _getApiUrl(model);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn(`[Gemini API] Request failed for model ${model}:`, response.status, errData);
      const err = new Error(`API_ERROR_${response.status}`);
      err.status = response.status;
      err.details = errData;
      throw err;
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('EMPTY_RESPONSE');

    // Lưu lại model đã kiểm chứng hoạt động thành công
    localStorage.setItem('nf_working_model', model);
    return text;
  }

  /* ─── Gọi API chung với cơ chế Auto-Fallback khi gặp lỗi 404 ─── */

  async function _call(prompt, base64Image = null) {
    if (!isConfigured()) {
      throw new Error('API_NOT_CONFIGURED');
    }

    const parts = [];

    // Thêm text prompt
    parts.push({ text: prompt });

    // Thêm ảnh nếu có (Vision)
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
        temperature: 0.3, // Thấp để kết quả nhất quán hơn cho dữ liệu dinh dưỡng
      }
    };

    // Thử với model ưu tiên trước
    const primaryModel = getModel();
    try {
      return await _executeRequest(primaryModel, body);
    } catch (err) {
      // Nếu gặp 404 (model không tìm thấy trên API key này), tự động thử các model khả thi khác
      if (err.status === 404) {
        console.info(`[Gemini API] Model "${primaryModel}" trả về 404. Đang tự động thử các model dự phòng...`);
        for (const candidate of CANDIDATE_MODELS) {
          if (candidate === primaryModel) continue;
          try {
            console.info(`[Gemini API] Đang thử kết nối model: "${candidate}"`);
            const text = await _executeRequest(candidate, body);
            console.info(`[Gemini API] Kết nối thành công với model: "${candidate}"!`);
            return text;
          } catch (retryErr) {
            if (retryErr.status === 404) continue;
            throw retryErr;
          }
        }
      }

      if (err.status === 400) throw new Error('INVALID_REQUEST');
      if (err.status === 401 || err.status === 403) throw new Error('INVALID_API_KEY');
      if (err.status === 429) throw new Error('RATE_LIMITED');
      if (err.status === 500 || err.status === 503) throw new Error('SERVER_ERROR');

      throw err;
    }
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

  /* ─── Thông báo lỗi tiếng Việt ─── */

  function getErrorMessage(error) {
    const msg = error.message || error;
    const map = {
      'API_NOT_CONFIGURED': 'Chưa cấu hình API key. Vui lòng xem hướng dẫn trong phần Hồ sơ.',
      'INVALID_API_KEY': 'API key không hợp lệ hoặc đã bị khóa. Kiểm tra lại trên Google AI Studio.',
      'RATE_LIMITED': 'Đã vượt giới hạn API miễn phí. Vui lòng thử lại sau vài giây.',
      'SERVER_ERROR': 'Lỗi máy chủ Google. Vui lòng thử lại sau.',
      'INVALID_REQUEST': 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
      'API_ERROR_404': 'Mô hình AI không tìm thấy hoặc tài khoản chưa kích hoạt phiên bản model này (404).',
      'EMPTY_RESPONSE': 'Không nhận được phản hồi từ AI. Thử lại.',
      'PARSE_ERROR': 'Không thể xử lý kết quả AI. Thử lại.',
      'NETWORK_ERROR': 'Lỗi kết nối mạng hoặc trình duyệt chặn CORS. Kiểm tra kết nối internet.',
      'NO_FOOD_DETECTED': 'Không nhận diện được thức ăn trong hình. Thử chụp rõ hơn góc chụp chính diện.',
    };
    return map[msg] || `Đã xảy ra lỗi: ${msg}`;
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

    try {
      const text = await _call(prompt, base64Image);
      const data = _parseJSON(text);
      
      if (data.error === 'NO_FOOD_DETECTED') {
        throw new Error('NO_FOOD_DETECTED');
      }

      // Validate và chuẩn hóa dữ liệu
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
    } catch (error) {
      if (error.message === 'NO_FOOD_DETECTED' || error.message.startsWith('API_') || error.message === 'PARSE_ERROR') {
        throw error;
      }
      throw new Error('NETWORK_ERROR');
    }
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

    try {
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
    } catch (error) {
      if (error.message.startsWith('API_') || error.message === 'PARSE_ERROR') throw error;
      throw new Error('NETWORK_ERROR');
    }
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

    try {
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
    } catch (error) {
      if (error.message.startsWith('API_') || error.message === 'PARSE_ERROR') throw error;
      throw new Error('NETWORK_ERROR');
    }
  }

  return {
    isConfigured,
    analyzeImage,
    searchFood,
    suggestMealPlan,
    getErrorMessage,
  };
})();
