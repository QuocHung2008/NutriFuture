/**
 * NutriFuture — Mẫu cấu hình Gemini API
 *
 * File này ĐƯỢC commit lên GitHub — nhưng KHÔNG chứa key thật.
 * GitHub Actions (xem .github/workflows/deploy.yml) sẽ tự động thay thế
 * __GEMINI_API_KEY__ bằng giá trị lấy từ repo Secret "GEMINI_API_KEY"
 * và xuất ra js/config.js lúc build/deploy — key thật KHÔNG bao giờ
 * nằm trong mã nguồn hay lịch sử git, chỉ tồn tại trong Secrets của GitHub
 * và trong file đã build (deploy) trên GitHub Pages.
 *
 * Chạy local để thử nghiệm? Copy file này thành js/config.js (đã bị
 * .gitignore, sẽ không bị commit) rồi dán key thật của bạn vào.
 */
const GEMINI_CONFIG = {
  apiKey: '__GEMINI_API_KEY__',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  // Model mặc định khi người dùng chọn "Tự động" trong Hồ sơ.
  // Có thể đổi sang bất kỳ giá trị nào trong NF_Gemini.MODEL_OPTIONS (js/gemini.js).
  model: 'gemini-2.5-flash',
  maxTokens: 2048,
};
