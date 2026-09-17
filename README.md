# 🌿 NutriFuture — Ứng Dụng AI Dinh Dưỡng Học Đường Cho Học Sinh THPT

> **Đề tài Cuộc thi Nghiên cứu Khoa học Kỹ thuật (KHKT) cấp THPT**
> _"Ứng dụng Trí tuệ Nhân tạo trong Phân tích và Tư vấn Dinh dưỡng Học đường cho Học sinh THPT"_

NutriFuture là ứng dụng web di động (Mobile Web App) thiết kế hiện đại, khoa học, **hoàn toàn tĩnh (Static SPA)** — không backend, không database server — tích hợp **Google Gemini 2.0 AI (Vision & Text)** để hỗ trợ học sinh THPT theo dõi dinh dưỡng, nhận diện khẩu phần ăn thời gian thực và xây dựng lối sống lành mạnh. Toàn bộ vòng đời phát triển → kiểm thử → triển khai chạy hoàn toàn trên hạ tầng GitHub (Repository, Actions, Pages).

[![Deploy to GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-2ea44f)](#-hướng-dẫn-deploy-lên-github-pages-cicd-bằng-github-actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#-tác-giả--bản-quyền)

---

## 📑 Mục lục

- [Tính năng nổi bật](#-các-tính-năng-nổi-bật)
- [Kiến trúc & nguyên tắc thiết kế](#-kiến-trúc--nguyên-tắc-thiết-kế)
- [Lấy API Key & cấu hình](#-hướng-dẫn-lấy-api-key-gemini--cách-sử-dụng)
- [Deploy lên GitHub Pages](#-hướng-dẫn-deploy-lên-github-pages-cicd-bằng-github-actions)
- [Hiệu năng](#-hiệu-năng-performance)
- [Độ ổn định](#-độ-ổn-định-reliability)
- [Bảo mật](#-bảo-mật-security)
- [Giới hạn kiến trúc cần lưu ý trung thực](#-giới-hạn-kiến-trúc--minh-bạch-với-người-dùng)
- [Cơ sở khoa học](#-cơ-sở-khoa-học--công-thức-y-khoa-ứng-dụng)
- [Cấu trúc mã nguồn](#-cấu-trúc-mã-nguồn-modular-architecture)
- [Tác giả & bản quyền](#-tác-giả--bản-quyền)

---

## 🚀 Các Tính Năng Nổi Bật

| #   | Tính năng                                 | Chi tiết kỹ thuật & Tính khoa học                                                                                                                                                                                              |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 📷 **Camera AI Nhận Diện Món Ăn**         | Chụp ảnh món ăn từ camera hoặc tải ảnh lên. Mô hình **Gemini Vision** phân tích thị giác máy tính, nhận diện tên món, khẩu phần, ước tính calo, đạm, béo, tinh bột, chất xơ và đưa lời khuyên dinh dưỡng học đường.            |
| 2   | 🔍 **Tra Cứu Dinh Dưỡng AI**              | Không phụ thuộc cơ sở dữ liệu hardcoded. Dùng **Gemini Text API** tra cứu tức thì thành phần dinh dưỡng mọi món ăn Việt Nam, kèm phân tích vi chất và lịch sử tìm kiếm.                                                        |
| 3   | ⚖️ **Cá Nhân Hóa Chỉ Số Thể Trạng**       | Người dùng tự nhập Tuổi, Giới tính, Chiều cao, Cân nặng, Mức độ vận động. Tính tự động: **BMI (WHO)**, **BMR (Mifflin–St Jeor)**, **TDEE (ACSM)**, Nhu cầu nước, Tỷ lệ Macro theo khuyến nghị của Viện Dinh Dưỡng Quốc Gia VN. |
| 4   | 💡 **AI Tư Vấn Thực Đơn 1 Ngày**          | Dựa trên TDEE thực tế, Gemini AI lập thực đơn 4 bữa thuần Việt, cân đối nhóm chất, cho phép thêm trực tiếp vào nhật ký.                                                                                                        |
| 5   | 📖 **Nhật Ký Dinh Dưỡng & Biểu Đồ Macro** | Ghi nhận bữa ăn theo ngày, % Calo nạp so với TDEE, biểu đồ Doughnut phân tích Carb–Protein–Fat bằng **Chart.js**.                                                                                                              |
| 6   | 📈 **Lịch Sử, Thống Kê & Sao Lưu JSON**   | Biểu đồ cột xu hướng calo 7 ngày, danh sách ngày đã ghi nhận, **Export/Import JSON** để bảo toàn dữ liệu trên thiết bị.                                                                                                        |

---

## 🏗 Kiến Trúc & Nguyên Tắc Thiết Kế

```
Trình duyệt người dùng
   │
   ├─ index.html (SPA shell) ── css/style.css
   │
   ├─ js/app.js (Hash Router) ─┬─ js/pages/*.js (6 màn hình)
   │                           ├─ js/gemini.js  (gọi Gemini API trực tiếp từ client)
   │                           ├─ js/storage.js (LocalStorage + Export/Import JSON)
   │                           └─ js/ui.js      (Toast, Modal, Skeleton)
   │
   └─ Gọi thẳng REST API → generativelanguage.googleapis.com (Google Gemini)
```

Đây là kiến trúc **zero-backend**: không có server trung gian nào của bạn xử lý dữ liệu người dùng — toàn bộ tính toán và lưu trữ diễn ra trên máy khách. Điều này tối đa hoá tính riêng tư (dữ liệu ăn uống không rời khỏi thiết bị, trừ ảnh/câu hỏi gửi tới Gemini) nhưng cũng đặt ra các ràng buộc bảo mật đặc thù được nêu ở phần [Bảo mật](#-bảo-mật-security) và [Giới hạn kiến trúc](#-giới-hạn-kiến-trúc--minh-bạch-với-người-dùng).

---

## 🔑 Hướng Dẫn Lấy API Key Gemini & Cách Sử Dụng

### Bước 1: Lấy API Key miễn phí từ Google AI Studio

1. Truy cập <https://aistudio.google.com/apikey>
2. Đăng nhập bằng tài khoản Google.
3. Nhấp **"Create API Key"**.
4. Chọn project có sẵn hoặc tạo mới, sao chép chuỗi khóa (bắt đầu bằng `AIzaSy...`).

### Bước 2: Đưa API Key vào ứng dụng

**Cách 1 — Nhập trực tiếp trên giao diện (khuyên dùng cho người dùng cuối)**
Vào tab **Hồ sơ** → dán khóa vào ô **Cài đặt Google Gemini API Key** → **Lưu Key**. Khóa được lưu trong `localStorage` của trình duyệt — xem lưu ý ở phần [Bảo mật](#-bảo-mật-security) về giới hạn của phương pháp này.

**Cách 2 — File `js/config.js` (khi chạy local để phát triển)**

```bash
cp js/config.example.js js/config.js
```

```js
const GEMINI_CONFIG = {
  apiKey: "AIzaSy_THAY_THE_BANG_KEY_THAT_CUA_BAN",
  apiUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  model: "gemini-2.0-flash",
  maxTokens: 2048,
};
```

`js/config.js` đã có trong `.gitignore` — **không bao giờ commit file này**.

### 🛡️ Bắt buộc: giới hạn API Key trên Google Cloud Console

Vì đây là ứng dụng client-side thuần túy, khóa API **luôn** có thể bị người dùng đọc được từ DevTools. Phòng vệ duy nhất khả thi là giới hạn phạm vi sử dụng của khóa, không phải giấu khóa:

1. Vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Chọn khóa API đã tạo.
3. **Application restrictions** → **Websites (HTTP referrers)** → thêm đúng domain Pages của bạn, ví dụ `https://quochung2008.github.io/NutriFuture/*` (không dùng wildcard rộng hơn mức cần thiết).
4. **API restrictions** → **Restrict key** → chỉ tích **Generative Language API**.
5. Vào [Google Cloud Console → Quotas](https://console.cloud.google.com/apis/dashboard) đặt **quota/ngày** thấp vừa đủ nhu cầu thực tế, để nếu khóa bị lấy trộm thì thiệt hại tối đa bị chặn ở mức quota, không phải hoá đơn không giới hạn.
6. Bật **cảnh báo chi phí (budget alert)** trên Google Cloud dù đang dùng gói miễn phí, để phát hiện sớm nếu có lạm dụng bất thường.

---

## 🌐 Hướng Dẫn Deploy Lên GitHub Pages (CI/CD bằng GitHub Actions)

Thay vì deploy trực tiếp từ nhánh `main` (Deploy from a branch), khuyến nghị dùng **GitHub Actions** để có một bước kiểm tra/build trước khi lên Pages — chặt chẽ hơn và vẫn 100% chạy trên GitHub, miễn phí với repo public.

1. Tạo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Kiểm tra không có secret bị commit nhầm
        uses: gitleaks/gitleaks-action@v2

      - name: Chuẩn bị thư mục build
        run: |
          mkdir -p dist
          cp -r css js index.html dist/
          # Loại trừ file cấu hình local nếu vô tình còn sót
          rm -f dist/js/config.js

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

2. Trong repo: `Settings → Pages → Build and deployment → Source: GitHub Actions`.
3. Push lên `main` → Actions tự chạy → trang online tại:

```
https://quochung2008.github.io/NutriFuture/
```

**Vì sao chọn Actions thay vì "Deploy from a branch"?**

- Có bước quét secret (`gitleaks`) chặn merge nếu ai đó lỡ commit `config.js` chứa API key thật.
- Có chỗ để chèn bước tối ưu hoá (minify, cache-busting) trước khi publish mà không cần đổi nhánh nguồn.
- Artifact publish là bản build cô lập, không phải toàn bộ lịch sử repo (giảm bề mặt lộ file không cần thiết).

---

## ⚡ Hiệu Năng (Performance)

| Hạng mục                              | Khuyến nghị                                                                                                                                                          | Lý do                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Tải Chart.js & thư viện ngoài**     | Dùng CDN có `defer` + [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity), pin đúng version thay vì `@latest` | Tránh chặn render, tránh thư viện đổi version âm thầm làm hỏng UI |
| **Ảnh chụp món ăn gửi Gemini Vision** | Resize/compress phía client (canvas `toBlob` chất lượng ~0.7, giới hạn cạnh dài ~1024px) trước khi gửi                                                               | Giảm độ trễ upload, giảm token ảnh tiêu tốn, tiết kiệm quota API  |
| **Router & trang**                    | Lazy-load module từng trang trong `js/pages/*.js` bằng dynamic `import()` khi người dùng điều hướng tới, thay vì nạp hết lúc khởi động                               | Giảm thời gian tải trang chủ (First Contentful Paint)             |
| **LocalStorage**                      | Debounce ghi (~300ms) khi người dùng nhập liên tục ở Hồ sơ/Nhật ký                                                                                                   | Tránh ghi đĩa liên tục gây giật trên thiết bị yếu                 |
| **Gọi API Gemini**                    | Debounce/throttle ô tìm kiếm ở trang Tra cứu (≥500ms sau khi ngừng gõ)                                                                                               | Giảm số lệnh gọi API thừa, tiết kiệm quota, tăng cảm giác mượt    |
| **Static assets**                     | Bật cache header dài hạn cho `css/`, `js/` qua tên file có hash (cache-busting) khi build                                                                            | Trình duyệt cache tài nguyên tĩnh, giảm tải lần truy cập sau      |
| **Biểu đồ**                           | Chỉ khởi tạo `Chart.js` instance khi trang đó thực sự hiển thị, `destroy()` khi rời trang                                                                            | Tránh rò rỉ bộ nhớ khi qua lại nhiều lần giữa các trang           |

---

## 🧱 Độ Ổn Định (Reliability)

| Hạng mục                                | Khuyến nghị                                                                                                                                                    | Lý do                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Gọi Gemini API**                      | Bọc mọi lời gọi trong `try/catch`, có **retry với exponential backoff** (tối đa 2–3 lần) cho lỗi mạng/429/5xx                                                  | API bên ngoài có thể timeout hoặc rate-limit tạm thời                                 |
| **Phản hồi AI dạng JSON**               | Luôn validate schema phản hồi (kiểm tra field bắt buộc) trước khi ghi vào state/UI, không `JSON.parse` mù                                                      | Gemini đôi khi trả text lẫn markdown quanh JSON, parse trực tiếp dễ crash             |
| **Offline / mất mạng**                  | Đăng ký Service Worker cache asset tĩnh (App Shell) để trang vẫn mở được, xem lịch sử/nhật ký cũ khi mất mạng; tính năng cần AI hiển thị rõ "cần kết nối mạng" | UX nhất quán, không hiển thị trang trắng khi offline                                  |
| **LocalStorage đầy/lỗi**                | Bắt lỗi `QuotaExceededError` khi ghi, cảnh báo người dùng export/dọn dữ liệu cũ                                                                                | Tránh mất dữ liệu âm thầm                                                             |
| **Schema dữ liệu Export/Import JSON**   | Gắn field `"schemaVersion"` vào file export; khi Import, kiểm tra version và có hàm migrate nếu khác                                                           | Cho phép nâng cấp cấu trúc dữ liệu về sau mà không hỏng file người dùng đã sao lưu cũ |
| **Trình duyệt không hỗ trợ Camera API** | Kiểm tra `navigator.mediaDevices` trước khi gọi, fallback về nút "Tải ảnh lên"                                                                                 | Một số trình duyệt/thiết bị cũ không có camera API                                    |
| **Kiểm thử trước deploy**               | Thêm CI job chạy `eslint` + kiểm tra HTML hợp lệ trước khi cho phép merge vào `main`                                                                           | Ngăn lỗi cú pháp/logic lọt ra bản production                                          |

---

## 🔒 Bảo Mật (Security)

| Hạng mục                             | Khuyến nghị                                                                                                                                                                                                                                                                                                                                                                            | Lý do                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content-Security-Policy**          | Thêm meta tag CSP trong `index.html`, chỉ cho phép script/connect tới domain CDN đã dùng và `generativelanguage.googleapis.com`:<br>`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://generativelanguage.googleapis.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'">` | Giảm mạnh rủi ro XSS bằng cách chặn script/kết nối tới domain lạ, ngay cả khi có lỗ hổng chèn mã                                                     |
| **Subresource Integrity (SRI)**      | Thêm `integrity="sha384-..."` và `crossorigin="anonymous"` cho thẻ `<script>` tải Chart.js từ CDN                                                                                                                                                                                                                                                                                      | Đảm bảo file tải về đúng là file gốc, chống tấn công CDN bị xâm nhập                                                                                 |
| **Chống XSS khi render nội dung AI** | Không dùng `innerHTML` với text Gemini trả về; dùng `textContent` hoặc sanitize bằng thư viện như DOMPurify trước khi chèn HTML                                                                                                                                                                                                                                                        | Phản hồi AI là dữ liệu không tin cậy — chèn thẳng vào DOM có thể bị lợi dụng chèn script                                                             |
| **API Key phía client**              | Không thể giấu tuyệt đối khóa trong ứng dụng tĩnh — bắt buộc kết hợp giới hạn HTTP referrer + API restriction + quota thấp trên Google Cloud (xem mục trên). Không log khóa ra console kể cả khi debug                                                                                                                                                                                 | Đây là giới hạn cố hữu của kiến trúc "toàn bộ chạy trên GitHub Pages, không backend"                                                                 |
| **`.gitignore` & quét secret**       | Giữ `js/config.js` trong `.gitignore`; thêm bước `gitleaks`/`trufflehog` vào GitHub Actions để chặn commit lộ secret                                                                                                                                                                                                                                                                   | Ngăn rò rỉ khóa thật vào lịch sử Git công khai                                                                                                       |
| **Dependabot**                       | Bật `Settings → Security → Dependabot alerts` + tạo `.github/dependabot.yml` theo dõi phiên bản CDN/npm nếu về sau chuyển sang bundler                                                                                                                                                                                                                                                 | Tự động cảnh báo khi thư viện dùng có lỗ hổng đã biết                                                                                                |
| **Nhánh `main` được bảo vệ**         | Bật **Branch protection rule**: yêu cầu PR review + CI pass trước khi merge vào `main` (nhánh dùng để deploy)                                                                                                                                                                                                                                                                          | Tránh thay đổi trực tiếp không qua kiểm tra lên bản production                                                                                       |
| **HTTPS**                            | Không cần cấu hình thêm — GitHub Pages tự động phục vụ qua HTTPS, có thể bật "Enforce HTTPS" trong Settings → Pages                                                                                                                                                                                                                                                                    | Mã hoá toàn bộ traffic giữa người dùng và trang, bao gồm cả khi gõ API key vào form                                                                  |
| **Dữ liệu sức khỏe cá nhân**         | Toàn bộ chỉ số thể trạng/nhật ký ăn uống chỉ lưu `localStorage` trên máy người dùng, không gửi lên server nào của dự án                                                                                                                                                                                                                                                                | Giảm rủi ro rò rỉ dữ liệu nhạy cảm — nhưng cũng đồng nghĩa dữ liệu mất nếu người dùng xoá cache/đổi thiết bị, nên nhắc dùng tính năng Export định kỳ |

---

## ⚠️ Giới Hạn Kiến Trúc — Minh Bạch Với Người Dùng

Vì yêu cầu là "deploy hoàn toàn trên GitHub" (không backend riêng), có vài giới hạn bảo mật **không thể loại bỏ hoàn toàn**, chỉ có thể giảm thiểu — nên trình bày trung thực trong hồ sơ dự thi KHKT thay vì khẳng định "tuyệt đối an toàn":

- **API key luôn lộ diện phía client**: ai mở DevTools cũng xem được khóa đang dùng trong `localStorage` hoặc file JS. Giới hạn referrer + quota thấp chỉ giảm _thiệt hại tối đa_, không ngăn được _việc đọc khóa_.
- **Không có xác thực người dùng thật (không backend)**: không thể phân biệt "người dùng hợp lệ" theo tài khoản, mọi kiểm soát chỉ ở mức trình duyệt/thiết bị.
- **Nếu cần bảo mật khóa API tuyệt đối**, giải pháp đúng là thêm một proxy server nhỏ (ví dụ Cloudflare Workers/Vercel Edge Function) đứng giữa app và Gemini API để giữ khóa phía server — nhưng khi đó không còn là "deploy hoàn toàn trên GitHub Pages" nữa. Đây là **trade-off nên nêu rõ trong phần hạn chế của báo cáo KHKT**, thể hiện nhóm hiểu đúng bản chất vấn đề thay vì bỏ qua.

---

## 🔬 Cơ Sở Khoa Học & Công Thức Y Khoa Ứng Dụng

| Chỉ số           | Phương pháp & Công thức tính                         | Nguồn tài liệu tham khảo                 |
| ---------------- | ---------------------------------------------------- | ---------------------------------------- |
| **BMI**          | BMI = Cân nặng (kg) / Chiều cao (m)²                 | Tổ chức Y tế Thế giới (WHO)              |
| **BMR**          | Nam: 10W + 6.25H − 5A + 5 Nữ: 10W + 6.25H − 5A − 161 | Phương trình Mifflin–St Jeor (1990)      |
| **TDEE**         | TDEE = BMR × Hệ số hoạt động (1.2–1.9)               | Hiệp hội Y học Thể thao Hoa Kỳ (ACSM)    |
| **Nhu cầu nước** | Nước (ml) = Cân nặng (kg) × 33 ml                    | Cơ quan An toàn Thực phẩm Châu Âu (EFSA) |
| **Tỷ lệ Macro**  | Carb 50–55% · Protein 15–20% · Fat 25–30% TDEE       | Viện Dinh Dưỡng Quốc Gia Việt Nam        |

---

## 📁 Cấu Trúc Mã Nguồn (Modular Architecture)

```
NutriFuture/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: quét secret, build, deploy Pages
├── index.html                  # Giao diện chính (SPA Shell)
├── css/
│   └── style.css               # Design System, tokens & glassmorphism
├── js/
│   ├── config.example.js       # File mẫu cấu hình Gemini API
│   ├── storage.js              # LocalStorage & Export/Import JSON (có schemaVersion)
│   ├── gemini.js                # Wrapper gọi Gemini API (retry, validate response)
│   ├── ui.js                   # Toast, Modal, Skeleton, Format
│   ├── app.js                   # Router Hash & vòng đời ứng dụng
│   └── pages/
│       ├── home.js
│       ├── camera.js
│       ├── lookup.js
│       ├── profile.js
│       ├── diary.js
│       └── history.js
├── .gitignore                  # Bỏ qua js/config.js
└── README.md
```

---

## 👥 Tác Giả & Bản Quyền

- **Học sinh thực hiện đề tài**: Đề tài KHKT Dinh Dưỡng Học Đường Dành Cho Học Sinh THPT.
- **Giấy phép**: MIT License — tự do sử dụng, chỉnh sửa cho mục đích giáo dục và nghiên cứu khoa học.
