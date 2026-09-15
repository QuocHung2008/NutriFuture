/**
 * NutriFuture — Cấu hình API Key
 * 
 * HƯỚNG DẪN:
 * 1. Copy file này thành "config.js" (cùng thư mục)
 * 2. Thay 'YOUR_GEMINI_API_KEY_HERE' bằng API key thật
 * 3. KHÔNG commit file config.js lên GitHub (đã có trong .gitignore)
 * 
 * Lấy API key tại: https://aistudio.google.com/apikey
 * 
 * BẢO MẬT:
 * - Vào Google Cloud Console → API & Services → Credentials
 * - Chọn key → Application restrictions → HTTP referrers
 * - Thêm: QuocHung2008.github.io/*
 * - API restrictions → Chỉ chọn "Generative Language API"
 * - Đặt quota: 100 requests/ngày
 */
const GEMINI_CONFIG = {
  apiKey: 'YOUR_GEMINI_API_KEY_HERE',
  model: 'gemini-2.5-flash',
  maxTokens: 2048,
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
};
