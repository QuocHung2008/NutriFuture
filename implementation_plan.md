# Tái Cấu Trúc Toàn Diện NutriFuture

**Đề tài KHKT:** "Ứng dụng AI trong phân tích và tư vấn dinh dưỡng học đường cho học sinh THPT"

**Bối cảnh:** Chuyển từ monolith 1 file HTML (~1457 dòng) với dữ liệu hardcoded và AI giả lập → Static site modular, deploy GitHub Pages, tích hợp Gemini AI thật.

---

## User Review Required

> [!IMPORTANT]
> **API Key trên client-side**: Do ràng buộc static hosting (GitHub Pages), API key Gemini sẽ nằm trong browser. Giảm thiểu rủi ro bằng:
> - Giới hạn key theo HTTP referrer = `QuocHung2008.github.io`
> - Chỉ bật API `Generative Language API`
> - Đặt quota thấp (vd: 100 requests/ngày)
> - Key lưu riêng trong `js/config.js` + `.gitignore`

> [!WARNING]
> **Breaking change**: Toàn bộ dữ liệu cũ trong `localStorage` key `nutrifuture_mobile_v1` sẽ không tương thích. App mới sẽ dùng key mới và có migration tự động.

---

## Proposed Changes

### Tổng quan kiến trúc mới

```
NutriFuture/
├── index.html                  # Entry point duy nhất (SPA-like)
├── css/
│   └── style.css               # Vanilla CSS design system
├── js/
│   ├── config.js               # ⚠️ API key (gitignored)
│   ├── config.example.js       # Template cho người fork
│   ├── app.js                  # App init, router, global state
│   ├── storage.js              # localStorage/IndexedDB + export/import
│   ├── gemini.js               # Gemini API wrapper (text + vision)
│   ├── ui.js                   # Toast, modal, animations helper
│   ├── pages/
│   │   ├── home.js             # Trang chủ dashboard
│   │   ├── camera.js           # Camera AI (Gemini Vision)
│   │   ├── lookup.js           # Tra cứu dinh dưỡng (Gemini Text)
│   │   ├── profile.js          # Cá nhân hóa + BMI/TDEE calculator
│   │   ├── diary.js            # Nhật ký dinh dưỡng + biểu đồ
│   │   └── history.js          # Lịch sử & thống kê dài hạn
├── assets/
│   └── icons/                  # SVG icons (nếu cần)
├── .gitignore                  # Bao gồm js/config.js
├── README.md                   # Hướng dẫn deploy + bảo mật API key
└── LICENSE
```

---

### 1. Tính năng được GIỮ LẠI (nâng cấp)

| # | Tính năng | Thay đổi chính |
|---|-----------|----------------|
| 1 | **Tra cứu dinh dưỡng** | Bỏ CSDL hardcoded → Gọi Gemini Text API để tra cứu real-time |
| 2 | **Camera AI** | Bỏ giả lập → Gemini Vision API thật (chụp ảnh → base64 → API) |
| 3 | **Cá nhân hóa (BMI/TDEE)** | Bỏ giá trị mẫu → Form trống, người dùng tự nhập, máy tính tự động |
| 4 | **Nhật ký dinh dưỡng** | Nâng cấp biểu đồ, lưu theo ngày, export/import JSON |
| 5 | **Dashboard** | Thiết kế lại hoàn toàn, hiển thị dữ liệu thật từ người dùng |

### 2. Tính năng bị LOẠI BỎ

| Tính năng | Lý do loại bỏ |
|-----------|---------------|
| **Gamification (XP/Huy hiệu/Quiz)** | Không phù hợp tính khoa học của đề tài KHKT. Không có backend nên XP không có ý nghĩa thực tế |
| **Thực đơn gợi ý hardcoded** | Thay bằng Gemini AI gợi ý thực đơn dựa trên TDEE và chỉ số cá nhân |
| **Demo "Mẫu thử" ảnh** | Không cần khi có AI thật |

### 3. Tính năng MỚI

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **AI Tư vấn thực đơn** | Dựa trên chỉ số BMI/TDEE đã nhập → Gemini gợi ý thực đơn phù hợp |
| 2 | **Lịch sử & Thống kê** | Xem lại nhật ký theo tuần/tháng, biểu đồ xu hướng calo/macro |
| 3 | **Export/Import dữ liệu** | Nút backup JSON, khôi phục khi đổi thiết bị/xóa cache |
| 4 | **Onboarding Flow** | Lần đầu mở app → hướng dẫn nhập thông tin cá nhân trước |
| 5 | **Dark/Light theme** | Toggle chế độ tối, lưu preference |

---

### Chi tiết từng component

---

#### [NEW] `css/style.css` — Design System Vanilla CSS

- Design tokens: colors, spacing, typography, border-radius
- Responsive mobile-first (breakpoints 640px, 768px, 1024px)
- Glassmorphism cards, smooth animations, gradient accents
- Dark mode via `[data-theme="dark"]` selector
- Font: Inter (Google Fonts)
- Icons: Font Awesome 6 (CDN)
- Bỏ hoàn toàn TailwindCSS CDN

---

#### [NEW] `js/config.js` (gitignored) + `js/config.example.js`

```js
// config.example.js — Copy thành config.js và thêm API key
const GEMINI_CONFIG = {
  apiKey: 'YOUR_GEMINI_API_KEY_HERE',
  model: 'gemini-2.0-flash',
  visionModel: 'gemini-2.0-flash',
  maxTokens: 2048,
};
```

---

#### [NEW] `js/gemini.js` — Gemini API Wrapper

- `analyzeImage(base64)` → Gọi Gemini Vision, parse JSON nutrition data
- `searchFood(query)` → Gọi Gemini Text, trả về thông tin dinh dưỡng
- `suggestMealPlan(profile)` → Gọi Gemini Text, gợi ý thực đơn theo TDEE
- Error handling: mạng lỗi, ảnh mờ, không nhận diện được
- Rate limiting client-side (debounce 1s)
- Structured prompt engineering cho kết quả JSON chuẩn

---

#### [NEW] `js/storage.js` — Local Storage Manager

- `saveProfile(data)` / `getProfile()` — Thông tin cá nhân
- `saveDiaryEntry(entry)` / `getDiary(date)` — Nhật ký theo ngày
- `exportAllData()` → Download file JSON
- `importData(file)` → Parse và restore
- Migration từ format cũ (`nutrifuture_mobile_v1`)

---

#### [NEW] `js/ui.js` — UI Utilities

- `showToast(message, type)` — Toast notifications
- `showModal(content)` / `closeModal()` — Modal system
- `showLoading()` / `hideLoading()` — Loading spinner cho API calls
- `animateNumber(element, from, to)` — Số đếm animation
- Theme toggle logic

---

#### [NEW] `js/app.js` — App Controller

- Router: hash-based navigation (`#home`, `#camera`, `#lookup`, `#profile`, `#diary`, `#history`)
- Init: check onboarding status, load profile, render active page
- Event delegation cho bottom nav
- Service Worker registration (optional, cho PWA)

---

#### [MODIFY] `index.html` — Entry Point

- Chỉ chứa shell HTML (header, main container, bottom nav, modals)
- Không chứa nội dung page — render bởi JS modules
- SEO meta tags đầy đủ
- Preconnect Google Fonts, CDN links
- Script tags load từ `/js/`

---

#### [NEW] `js/pages/home.js` — Trang chủ

- Hero banner tinh gọn với tên đề tài KHKT
- Cards hiển thị: Calo hôm nay vs TDEE, Nước uống, BMI hiện tại
- Quick actions: Camera AI, Tra cứu, Nhật ký
- Dữ liệu real-time từ profile + diary (không hardcoded)
- Nếu chưa có profile → hiển thị CTA "Bắt đầu nhập thông tin"

---

#### [NEW] `js/pages/camera.js` — Camera AI (Gemini Vision)

Flow chi tiết:
1. Mở camera (MediaDevices API, `facingMode: environment`)
2. Hiển thị live preview
3. Nút "Chụp" → capture frame từ `<canvas>`
4. Convert canvas → base64 JPEG
5. Gọi `gemini.analyzeImage(base64)` với prompt:
   ```
   Phân tích hình ảnh món ăn này. Trả về JSON:
   {
     "name": "Tên món ăn",
     "serving": "Khẩu phần",
     "calories": number,
     "protein": number,
     "fat": number,
     "carb": number,
     "fiber": number,
     "vitamins": ["..."],
     "minerals": ["..."],
     "advice": "Lời khuyên dinh dưỡng cho học sinh THPT"
   }
   ```
6. Hiển thị kết quả với animation
7. Nút "Lưu vào nhật ký" → `storage.saveDiaryEntry()`
8. Xử lý lỗi: ảnh mờ, không phải thức ăn, mạng lỗi

Cũng hỗ trợ: Upload ảnh từ gallery (file input)

---

#### [NEW] `js/pages/lookup.js` — Tra cứu AI

- Input tên món ăn → Gọi Gemini Text API
- Cùng format output như Camera AI
- Lịch sử tra cứu gần đây (localStorage)
- Debounce 1 giây khi gõ
- Loading skeleton animation

---

#### [NEW] `js/pages/profile.js` — Cá nhân hóa

- Form nhập: Tên, Tuổi, Giới tính, Chiều cao (cm), Cân nặng (kg), Mức vận động
- **Không có giá trị mặc định** — placeholder text hướng dẫn
- Tính toán:
  - **BMI** = cân nặng / (chiều cao m)² — Phân loại theo WHO
  - **BMR** = Mifflin-St Jeor equation
  - **TDEE** = BMR × Activity Factor
  - **Nhu cầu nước** = cân nặng × 0.033 (L/ngày)
  - **Phân bổ macro**: Carb 50-55%, Protein 15-20%, Fat 25-30% (theo khuyến nghị VN)
- Hiển thị kết quả bằng gauge charts
- Nút "AI Tư vấn thực đơn" → Gemini gợi ý dựa trên chỉ số

---

#### [NEW] `js/pages/diary.js` — Nhật ký dinh dưỡng

- Chọn ngày (date picker)
- Thêm món thủ công (tên, calo, macro)
- Thêm từ kết quả Camera AI / Tra cứu
- Biểu đồ doughnut Macro (Chart.js)
- Biểu đồ bar Calo thực tế vs TDEE mục tiêu
- Tổng kết cuối ngày: thiếu/thừa chất gì
- Nút xóa từng món

---

#### [NEW] `js/pages/history.js` — Lịch sử & Thống kê

- Xem nhật ký các ngày trước
- Biểu đồ line 7 ngày gần nhất (calo/protein/fat/carb)
- Trung bình calo/tuần
- Nút Export JSON / Import JSON

---

#### [MODIFY] `README.md` — Hướng dẫn đầy đủ

Bao gồm:
1. Giới thiệu đề tài KHKT
2. Kiến trúc static site
3. Hướng dẫn lấy API key Gemini (Google AI Studio)
4. Hướng dẫn cấu hình + deploy GitHub Pages
5. Giải thích bảo mật API key (trade-off static hosting)
6. Công thức khoa học sử dụng (BMI, Mifflin-St Jeor, TDEE)
7. Tài liệu tham khảo khoa học

---

#### [NEW] `.gitignore`

```
js/config.js
.DS_Store
node_modules/
```

---

## Tính khoa học

Các công thức được sử dụng (trích dẫn trong README + code comments):

| Chỉ số | Công thức | Nguồn |
|--------|-----------|-------|
| **BMI** | W / H² (kg/m²) | WHO, 2000 |
| **BMR (Nam)** | 10W + 6.25H - 5A + 5 | Mifflin-St Jeor, 1990 |
| **BMR (Nữ)** | 10W + 6.25H - 5A - 161 | Mifflin-St Jeor, 1990 |
| **TDEE** | BMR × Activity Factor | ACSM Guidelines |
| **Nhu cầu nước** | 33ml/kg/ngày | EFSA, 2010 |
| **Phân bổ macro** | Carb 50-55%, Protein 15-20%, Fat 25-30% | Viện Dinh Dưỡng Quốc Gia VN |

---

## Verification Plan

### Automated Tests
- Không có unit test framework (static site thuần) — kiểm tra thủ công

### Manual Verification
1. Mở `index.html` trực tiếp trên trình duyệt → tất cả trang hoạt động
2. Test Camera AI trên điện thoại (HTTPS required → dùng GitHub Pages)
3. Test Tra cứu AI → nhập tên món → nhận kết quả từ Gemini
4. Test BMI/TDEE calculator → nhập số liệu → kết quả đúng công thức
5. Test Export/Import JSON → backup → xóa → restore
6. Test Dark/Light theme toggle
7. Test responsive trên mobile (Chrome DevTools)
8. Deploy lên GitHub Pages → verify tất cả tính năng hoạt động

---

## Hướng dẫn lấy API Key Gemini

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey)
2. Đăng nhập tài khoản Google
3. Click "Create API Key" → chọn project hoặc tạo mới
4. Copy API key
5. Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Chọn API key vừa tạo → Edit
   - **Application restrictions**: HTTP referrers → Thêm `QuocHung2008.github.io/*`
   - **API restrictions**: Restrict key → Chỉ chọn "Generative Language API"
   - Đặt quota: Queries per day = 100
6. Tạo file `js/config.js` từ `js/config.example.js`, paste API key vào

