# Nâng Cấp NutriFuture — Giai Đoạn 2: Hiệu Năng, Độ Ổn Định & Bảo Mật

**Đề tài KHKT:** "Ứng dụng AI trong phân tích và tư vấn dinh dưỡng học đường cho học sinh THPT"

**Bối cảnh:** Giai đoạn 1 (đã hoàn thành) chuyển NutriFuture từ monolith 1 file HTML sang static site modular (`index.html` + `css/` + `js/`), tích hợp Gemini AI thật, deploy GitHub Pages. Giai đoạn 2 này **không đổi kiến trúc tổng thể** (vẫn zero-backend, deploy hoàn toàn trên GitHub) mà siết chặt ba mặt: hiệu năng, độ ổn định và bảo mật, để hồ sơ dự thi thể hiện được mức độ chín chắn kỹ thuật cao hơn.

---

## User Review Required

> **API key vẫn nằm phía client.** Đây là giới hạn cố hữu của deploy 100% trên GitHub Pages (không backend). Giai đoạn này giảm _thiệt hại tối đa_ nếu key bị lộ (CSP, giới hạn referrer, quota thấp) chứ không giấu được key tuyệt đối. Cần nêu rõ trade-off này trong phần hạn chế của báo cáo KHKT thay vì khẳng định "an toàn tuyệt đối".

> **Breaking change dữ liệu:** thêm field `schemaVersion` vào cấu trúc JSON lưu trong `localStorage` và file export. Cần chạy hàm `migrateLegacyData()` một lần để dữ liệu cũ (chưa có version) không bị mất khi người dùng cập nhật app.

> **CSP có thể chặn nhầm nếu cấu hình sai domain CDN.** Sau khi thêm Content-Security-Policy, bắt buộc kiểm thử thủ công toàn bộ 6 trang trước khi merge vào `main`, vì CSP lỗi sẽ khiến Chart.js hoặc Gemini API bị chặn âm thầm (không có lỗi UI rõ ràng, chỉ có lỗi trong Console).

---

## Proposed Changes

### Kiến trúc thư mục cập nhật

```
NutriFuture/
├── .github/
│   └── workflows/
│       └── deploy.yml          # [NEW] CI/CD: gitleaks scan → build → deploy Pages
├── index.html                  # [MODIFY] + CSP meta tag, SRI cho script CDN
├── css/
│   └── style.css
├── js/
│   ├── config.js               # (gitignored)
│   ├── config.example.js
│   ├── app.js                  # [MODIFY] lazy-load trang qua dynamic import()
│   ├── storage.js              # [MODIFY] schemaVersion + migration + QuotaExceededError handling
│   ├── gemini.js               # [MODIFY] retry/backoff + validate response schema
│   ├── ui.js                   # [MODIFY] thêm sanitize() dùng trước khi render nội dung AI
│   ├── sw.js                   # [NEW] Service Worker — cache App Shell, hỗ trợ offline
│   └── pages/
│       ├── home.js
│       ├── camera.js           # [MODIFY] nén/resize ảnh trước khi gửi Gemini Vision
│       ├── lookup.js           # [MODIFY] debounce 500ms
│       ├── profile.js
│       ├── diary.js            # [MODIFY] destroy() Chart.js instance khi rời trang
│       └── history.js
├── .gitignore
├── README.md
└── implementation_plan.md
```

---

## 1. Nhóm Hiệu Năng (Performance)

| #   | Hạng mục                         | File                                       | Nội dung thay đổi                                                                                                          |
| --- | -------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Lazy-load trang                  | `js/app.js`                                | Thay import tĩnh toàn bộ `js/pages/*.js` bằng dynamic `import()` gọi khi router chuyển route, giảm thời gian tải trang chủ |
| 1.2 | Nén ảnh trước khi gửi Vision API | `js/pages/camera.js`                       | Dùng `canvas.toBlob(quality=0.7)`, giới hạn cạnh dài ảnh ≤ 1024px trước khi convert base64 gửi Gemini                      |
| 1.3 | Debounce tra cứu                 | `js/pages/lookup.js`                       | Thêm debounce ≥ 500ms sau khi người dùng ngừng gõ mới gọi API, tránh gọi thừa                                              |
| 1.4 | Debounce ghi localStorage        | `js/storage.js`                            | Debounce ~300ms khi ghi liên tục từ form Hồ sơ/Nhật ký                                                                     |
| 1.5 | Vòng đời biểu đồ                 | `js/pages/diary.js`, `js/pages/history.js` | Gọi `chartInstance.destroy()` trong hàm `unmount()` của mỗi trang để tránh rò rỉ bộ nhớ khi qua lại nhiều lần              |
| 1.6 | SRI + pin version CDN            | `index.html`                               | Thêm `integrity` + `crossorigin="anonymous"` cho `<script>` Chart.js, pin đúng version thay vì `@latest`                   |
| 1.7 | Cache-busting asset tĩnh         | `.github/workflows/deploy.yml`             | Bước build thêm hash vào tên file `css/style.css`, `js/*.js` khi publish lên Pages                                         |

---

## 2. Nhóm Độ Ổn Định (Reliability)

| #   | Hạng mục                           | File                           | Nội dung thay đổi                                                                                                                                                                         |
| --- | ---------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Retry + backoff cho Gemini API     | `js/gemini.js`                 | Bọc `fetch()` trong `try/catch`, retry tối đa 2–3 lần với exponential backoff khi gặp lỗi mạng, 429, 5xx                                                                                  |
| 2.2 | Validate schema phản hồi AI        | `js/gemini.js`                 | Kiểm tra field bắt buộc (`name`, `calories`, `protein`, `fat`, `carb`...) trước khi ghi vào state; nếu thiếu field → fallback thông báo lỗi rõ ràng thay vì crash UI                      |
| 2.3 | Service Worker — App Shell offline | `js/sw.js`, `index.html`       | Cache `index.html`, `css/style.css`, `js/*.js` (không cache request tới Gemini API); khi mất mạng vẫn mở được app, xem lại Nhật ký/Lịch sử cũ; các nút cần AI hiển thị "Cần kết nối mạng" |
| 2.4 | Migration schema dữ liệu           | `js/storage.js`                | Thêm field `schemaVersion` vào object export/localStorage; hàm `migrateLegacyData()` chạy 1 lần khi phát hiện dữ liệu chưa có version (từ key cũ `nutrifuture_mobile_v1`)                 |
| 2.5 | Bắt lỗi Quota localStorage         | `js/storage.js`                | `try/catch` quanh `localStorage.setItem`, bắt riêng `QuotaExceededError`, gợi ý người dùng Export rồi xoá bớt dữ liệu cũ                                                                  |
| 2.6 | Fallback Camera API                | `js/pages/camera.js`           | Kiểm tra `navigator.mediaDevices` trước khi gọi `getUserMedia`; nếu không hỗ trợ → tự chuyển sang chế độ "Tải ảnh lên"                                                                    |
| 2.7 | CI kiểm thử trước deploy           | `.github/workflows/deploy.yml` | Thêm job `eslint` + kiểm tra HTML hợp lệ (`html-validate`), chặn merge nếu fail                                                                                                           |

---

## 3. Nhóm Bảo Mật (Security)

| #   | Hạng mục                           | File                                 | Nội dung thay đổi                                                                                                                   |
| --- | ---------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Content-Security-Policy            | `index.html`                         | Thêm meta CSP: chỉ cho `script-src`/`style-src` từ domain CDN đã dùng, `connect-src` chỉ tới `generativelanguage.googleapis.com`    |
| 3.2 | Chống XSS nội dung AI              | `js/ui.js` + toàn bộ `js/pages/*.js` | Thêm hàm `sanitize()` (dựa trên `textContent` hoặc DOMPurify), thay mọi chỗ đang dùng `innerHTML` với text từ Gemini                |
| 3.3 | Quét secret trong CI               | `.github/workflows/deploy.yml`       | Thêm job `gitleaks/gitleaks-action` chạy trước bước build, chặn merge nếu phát hiện API key bị commit nhầm                          |
| 3.4 | Giới hạn API key trên Google Cloud | Ngoài code (Google Cloud Console)    | HTTP referrer restriction đúng domain Pages, chỉ bật `Generative Language API`, đặt quota thấp (100 request/ngày), bật budget alert |
| 3.5 | Branch protection                  | Ngoài code (GitHub Settings)         | Bật rule: PR review + CI pass bắt buộc trước khi merge vào `main`                                                                   |
| 3.6 | Dependabot                         | `.github/dependabot.yml`             | Theo dõi version CDN/npm nếu về sau chuyển sang bundler, tự tạo PR khi có bản vá lỗ hổng                                            |
| 3.7 | Enforce HTTPS                      | Ngoài code (GitHub Settings → Pages) | Bật tuỳ chọn "Enforce HTTPS" (thường mặc định bật, xác nhận lại)                                                                    |

---

## Tính Khoa Học (không đổi so với Giai đoạn 1)

| Chỉ số            | Công thức                               | Nguồn                       |
| ----------------- | --------------------------------------- | --------------------------- |
| **BMI**           | W / H² (kg/m²)                          | WHO, 2000                   |
| **BMR (Nam)**     | 10W + 6.25H − 5A + 5                    | Mifflin-St Jeor, 1990       |
| **BMR (Nữ)**      | 10W + 6.25H − 5A − 161                  | Mifflin-St Jeor, 1990       |
| **TDEE**          | BMR × Activity Factor                   | ACSM Guidelines             |
| **Nhu cầu nước**  | 33ml/kg/ngày                            | EFSA, 2010                  |
| **Phân bổ macro** | Carb 50–55%, Protein 15–20%, Fat 25–30% | Viện Dinh Dưỡng Quốc Gia VN |

---

## Thứ Tự Triển Khai Đề Xuất (chia theo PR để dễ review)

1. **PR 1 — CI/CD nền tảng**: `.github/workflows/deploy.yml` (gitleaks + build + deploy), bật Branch protection, chuyển Pages source sang "GitHub Actions".
2. **PR 2 — Bảo mật client**: CSP meta tag, SRI cho Chart.js, hàm `sanitize()` thay toàn bộ `innerHTML` nguy hiểm.
3. **PR 3 — Độ ổn định gọi API**: retry/backoff + validate schema trong `js/gemini.js`.
4. **PR 4 — Dữ liệu & offline**: `schemaVersion` + migration trong `storage.js`, Service Worker `sw.js`.
5. **PR 5 — Hiệu năng**: lazy-load trang, nén ảnh camera, debounce tra cứu/ghi localStorage, dọn vòng đời Chart.js.

Triển khai theo thứ tự này để mỗi PR có thể kiểm thử độc lập, giảm rủi ro một thay đổi lớn làm hỏng nhiều tính năng cùng lúc.

---

## Verification Plan

### Automated (CI)

- `gitleaks` — chặn merge nếu lộ secret.
- `eslint` — chặn merge nếu lỗi cú pháp/logic rõ ràng.
- `html-validate` — chặn merge nếu `index.html` không hợp lệ.

### Manual Verification

1. Mở từng trong 6 trang sau khi thêm CSP — xác nhận Chart.js và Gemini API vẫn hoạt động (kiểm tra Console không có lỗi CSP violation).
2. Test Camera AI trên điện thoại thật qua URL GitHub Pages (HTTPS bắt buộc cho `getUserMedia`).
3. Ngắt mạng (DevTools → Network → Offline) → xác nhận App Shell vẫn mở, Nhật ký/Lịch sử cũ vẫn xem được, các nút gọi AI hiển thị thông báo "Cần kết nối mạng".
4. Test migration: tạo dữ liệu giả ở format cũ (không có `schemaVersion`) → mở app mới → xác nhận dữ liệu được migrate, không mất.
5. Test retry: giả lập lỗi mạng tạm thời (throttle trong DevTools) khi gọi Gemini → xác nhận app tự retry thay vì báo lỗi ngay lần đầu.
6. Test giới hạn API key: gọi thử API key từ domain khác ngoài GitHub Pages đã khai báo → xác nhận bị Google từ chối (referrer restriction hoạt động).
7. Deploy qua GitHub Actions → xác nhận toàn bộ 7 mục trên vẫn đúng trên bản production thật (không chỉ local).

---

## Hướng Dẫn Lấy API Key Gemini (giữ nguyên từ Giai đoạn 1)

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey), đăng nhập, tạo API key.
2. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → chọn key vừa tạo:
   - **Application restrictions**: HTTP referrers → `QuocHung2008.github.io/*`
   - **API restrictions**: Restrict key → chỉ chọn **Generative Language API**
   - Đặt quota: Queries per day ≈ 100 (điều chỉnh theo nhu cầu thực tế)
   - Bật budget alert dù đang dùng gói miễn phí
3. Copy API key vào `js/config.js` (đã gitignored) hoặc nhập trực tiếp trong tab Hồ sơ của app.
