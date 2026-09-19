# 🌿 NutriFuture — Ứng Dụng AI Dinh Dưỡng Học Đường Cho Học Sinh THPT

> **Đề tài Cuộc thi Nghiên cứu Khoa học Kỹ thuật (KHKT) cấp THPT**  
> *"Ứng dụng Trí tuệ Nhân tạo trong Phân tích và Tư vấn Dinh dưỡng Học đường cho Học sinh THPT"*

NutriFuture là ứng dụng web di động (Mobile Web App) được thiết kế hiện đại, khoa học và hoàn toàn tĩnh (Static Single Page Application), tích hợp công nghệ **Google Gemini 2.0 AI (Vision & Text)** để hỗ trợ học sinh THPT theo dõi dinh dưỡng, nhận diện khẩu phần ăn thời gian thực và xây dựng lối sống lành mạnh.

---

## 🚀 Các Tính Năng Nổi Bật

| # | Tính năng | Chi tiết kỹ thuật & Tính khoa học |
|---|-----------|-----------------------------------|
| 1 | 📷 **Camera AI Nhận Diện Món Ăn** | Chụp ảnh món ăn trực tiếp từ camera hoặc tải ảnh lên. Mô hình **Gemini 2.0 Flash Vision** phân tích thị giác máy tính, nhận diện tên món, khẩu phần, ước tính calo, đạm, béo, tinh bột, chất xơ và đưa ra lời khuyên dinh dưỡng học đường. |
| 2 | 🔍 **Tra Cứu Dinh Dưỡng (CSDL nội bộ ẩn + AI)** | Nhập **đúng tên** một món trong CSDL nội bộ (`js/data/foods.js`, không hiển thị ở bất kỳ đâu trên giao diện) → số liệu lấy từ CSDL, **AI chỉ bổ sung nhận xét** (số calo/đạm/béo/carb của CSDL không bao giờ bị AI ghi đè; nhận xét được lưu đệm để không tốn quota, và món trong CSDL vẫn hiện số liệu khi mất mạng/hết quota/không có key). Món ngoài CSDL → **Gemini Text API** phân tích hoàn toàn. Khớp "đúng" = bằng nhau hoàn toàn sau chuẩn hóa (hoa/thường, khoảng trắng, dấu), không khớp gần đúng. |
| 3 | ⚖️ **Cá Nhân Hóa Chỉ Số Thể Trạng** | **Không dùng số liệu mẫu**: Người dùng tự nhập Tuổi, Giới tính, Chiều cao, Cân nặng và Mức độ vận động. Máy tính toán tự động theo công thức y khoa chuẩn quốc tế: **BMI (WHO)**, **BMR (Mifflin - St Jeor)**, **TDEE (ACSM)**, **Nhu cầu Nước** và **Tỷ lệ Macro khuyến nghị của Viện Dinh Dưỡng Quốc Gia VN**. |
| 4 | 💡 **AI Tư Vấn Thực Đơn 1 Ngày + "Đổi thực đơn khác"** | Dựa trên chỉ số thể trạng và TDEE thực tế, Gemini lập thực đơn 4 bữa (3 chính + 1 phụ) thuần Việt. Nút **Đổi thực đơn khác** sinh thực đơn mới, tránh món của tối đa 3 thực đơn gần nhất; kết quả được kiểm tra (tổng kcal ±10% TDEE, có rau xanh và trái cây) và tự thử lại 1 lần nếu chưa đạt. |
| 5 | 📖 **Nhật Ký Dinh Dưỡng & Biểu Đồ Macro** | Ghi nhận bữa ăn theo ngày, hiển thị tỷ lệ % Calo nạp vào so với TDEE, biểu đồ Doughnut Chart phân tích 3 chất đa lượng (Carb - Protein - Fat) bằng **Chart.js**. |
| 6 | 📈 **Lịch Sử, Thống Kê & Sao Lưu JSON** | Biểu đồ cột theo dõi xu hướng calo 7 ngày, danh sách ngày đã ghi nhận và tính năng **Xuất (Export) / Khôi phục (Import) tệp JSON** giúp bảo toàn dữ liệu trên thiết bị, hỗ trợ khôi phục cả file backup định dạng cũ (migration theo version). |
| 7 | 📴 **PWA — Cài đặt & Chạy Offline** | Có `manifest.json` + Service Worker: cài được lên màn hình chính như app thật, giao diện vẫn hoạt động khi mất mạng (dữ liệu vốn local-first); riêng các lệnh gọi Gemini AI luôn cần mạng thật. |
| 8 | 🔔 **Nhắc Nhở Uống Nước & Ghi Nhật Ký** | Dùng Notification API nhắc uống nước theo chu kỳ tùy chỉnh và nhắc ghi nhật ký nếu đến tối chưa ghi bữa nào — bật/tắt và tùy chỉnh trong tab Hồ sơ. |
| 9 | ⚠️ **Cảnh Báo Cân Bằng Năng Lượng Theo TDEE** | Ngay trong Nhật ký, hệ thống so sánh calo đã nạp với TDEE mục tiêu và đưa ra nhận định tức thời (dư/thiếu/cân đối) để hỗ trợ điều chỉnh bữa ăn tiếp theo. |
| 10 | 🌗 **Giao Diện Sáng/Tối (Dark Mode)** | Chuyển đổi nhanh qua nút trên header, tự nhớ lựa chọn và tôn trọng cài đặt hệ thống (`prefers-color-scheme`) trong lần mở đầu tiên. |
| 12 | 🎮 **Học Mà Chơi (Gamification)** | Điểm, chuỗi ngày, huy hiệu, 5 câu đố dinh dưỡng mỗi ngày (ngân hàng câu hỏi đã kiểm duyệt + câu do AI sinh khi có key) và thử thách tuần. Điểm được tính lại từ nhật ký thật (chỉ món ghi đúng ngày mới tính chuỗi/thử thách), có giới hạn theo ngày để chống "cày điểm". Lối vào là thẻ trên Trang chủ. |
| 11 | 👋 **Onboarding Lần Đầu** | Người dùng mới (hoặc hồ sơ không hợp lệ: tuổi 15–22, cao 120–220 cm, nặng 30–150 kg) bắt buộc phải nhập hồ sơ thể trạng trước khi có thể vào các tab khác — cổng chặn kiểm tra dữ liệu thật chứ không chỉ dựa vào cờ, đảm bảo mọi chỉ số (TDEE, cảnh báo dinh dưỡng...) đều chính xác ngay từ đầu. |

---

## 🔑 Hướng Dẫn Lấy API Key Gemini & Cách Sử Dụng

NutriFuture sử dụng API Google Gemini để phân tích hình ảnh và tra cứu dinh dưỡng. Bạn có thể nhận **API Key hoàn toàn miễn phí** từ Google.

### Bước 1: Lấy API Key miễn phí từ Google AI Studio
1. Truy cập trang tạo key: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấp vào nút **"Create API Key"** (hoặc **"Tạo khóa API"**).
4. Chọn project có sẵn hoặc tạo mới, sau đó sao chép (copy) chuỗi khóa API (bắt đầu bằng `AIzaSy...`).

---

### Bước 2: Cấu hình 1 API Key dùng chung — KHÔNG lộ trong mã nguồn (dùng GitHub Actions Secret)

Phiên bản hiện tại dùng **1 API Key duy nhất do chủ dự án cấu hình**, người dùng cuối **không cần** tự nhập key nữa. Key được lưu trong **GitHub Secrets** (không nằm trong source code, không nằm trong git history) và chỉ được GitHub Actions "nạp" vào lúc build/deploy lên GitHub Pages.

1. Vào repo trên GitHub → `Settings` → `Secrets and variables` → `Actions` → **New repository secret**.
2. Đặt tên: `GEMINI_API_KEY`, giá trị: dán API Key thật của bạn (dạng `AIzaSy...`) → **Add secret**.
3. Vào `Settings` → `Pages` → mục **Build and deployment** → **Source**: đổi từ `Deploy from a branch` sang **`GitHub Actions`**.
4. Push code lên nhánh `main` (hoặc vào tab **Actions** → chọn workflow → **Run workflow** để chạy thủ công). GitHub Actions sẽ tự động:
   - Sinh ra `js/config.js` từ `js/config.template.js`, thay `__GEMINI_API_KEY__` bằng giá trị Secret.
   - Deploy toàn bộ site (đã có key) lên GitHub Pages.
5. Trong tab **Hồ sơ**, người dùng có thể chọn model Gemini muốn dùng (Tự động / Flash / Flash-Lite / Pro...) qua ô **Model Gemini sử dụng** — không cần đụng đến key.

📌 **Chạy thử ở máy local?** Copy `js/config.template.js` thành `js/config.js` (đã có trong `.gitignore`, không bao giờ bị commit), thay `__GEMINI_API_KEY__` bằng key thật để test — file này chỉ nằm trên máy bạn.

---

### 🛡️ Khuyến nghị bảo mật & giới hạn rủi ro API Key khi Deploy lên GitHub Pages

> ⚠️ **Cảnh báo quan trọng:** Vì đây là Static Web App chạy 100% trên trình duyệt (không có backend), **API Key CHẮC CHẮN sẽ hiển thị được** nếu ai đó mở DevTools/xem Network request trên trang web đã deploy — kể cả khi đã dùng GitHub Actions Secret ở Bước 2 (cách đó chỉ ngăn key bị lộ trong **source code trên GitHub**, không thể giấu key khỏi trình duyệt người xem trang). Với key **miễn phí, chỉ dùng ngắn hạn cho kỳ thi KHKT**, đây là mức đánh đổi được chấp nhận — nhưng **bắt buộc** làm theo các bước dưới đây để giới hạn thiệt hại nếu key bị người khác lấy được:

1. Vào [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials) → nhấp vào khóa API bạn đã tạo.
2. **Set application restrictions** → chọn **Websites (HTTP referrers)** → thêm URL GitHub Pages của bạn (ví dụ: `https://QuocHung2008.github.io/*`).
3. **API restrictions** → chọn **Restrict key** → chỉ tích chọn duy nhất **Generative Language API**.
4. **Đặt Quota thấp (quan trọng nhất — làm ngay):** vào [Google Cloud Console → APIs & Services → Generative Language API → Quotas](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas) → giới hạn **Requests per day** và **Requests per minute** ở mức vừa đủ cho việc demo/thi (ví dụ 100-200 request/ngày). Nếu key bị lộ và bị lạm dụng, thiệt hại tối đa chỉ dừng ở mức quota đã đặt, không thể bị "vét cạn" âm thầm.
5. Theo dõi mục **Kiểm tra kết nối** trong tab Hồ sơ định kỳ trong những ngày thi — nếu thấy lỗi 429 (hết hạn mức) bất thường dù bạn không dùng nhiều, khả năng cao key đã bị người khác lấy được từ DevTools — hãy **thu hồi (Delete) key cũ và tạo key mới** ngay tại Google AI Studio, sau đó cập nhật lại Secret `GEMINI_API_KEY` trên GitHub.
6. Ứng dụng đã tự giới hạn tối đa 3 lần thử model dự phòng (thay vì 22 lần) khi gặp lỗi, kèm nghỉ giữa các lần thử khi bị 429 — giúp không "đốt" quota nhanh hơn mức cần thiết ngay cả khi key hết hạn mức.

> **Về việc giấu key qua backend/proxy riêng (Cloudflare Worker, Vercel Function...):** đây là cách "đúng" duy nhất để key thực sự không lộ ra trình duyệt. Dự án hiện **cố tình không dùng** cách này để giữ kiến trúc 100% GitHub (Pages + Actions), không phụ thuộc dịch vụ thứ ba nào khác — phù hợp mục tiêu thi ngắn hạn. Nếu muốn triển khai, đây là điểm cần bàn kỹ trước (đổi kiến trúc, thêm dịch vụ ngoài GitHub) chứ không phải một bản vá nhỏ.

### 🔒 Chống XSS (Cross-Site Scripting)

Toàn bộ dữ liệu không đáng tin cậy — nội dung người dùng gõ (ô tìm kiếm, hồ sơ cá nhân) và dữ liệu do Gemini AI trả về (tên món ăn, lời khuyên, thực đơn...) — đều được escape qua `NF_UI.escapeHtml()` trước khi chèn vào giao diện, kể cả khi đã lưu vào `localStorage` (lịch sử tra cứu, nhật ký) và hiển thị lại ở lần mở app sau. Đây là lớp phòng thủ chính chống XSS của ứng dụng.

Đã thêm **Content-Security-Policy** trong `index.html` để giới hạn script/style/font/ảnh/kết nối mạng chỉ tới các nguồn đã biết trước. Lưu ý quan trọng: CSP này vẫn phải bật `'unsafe-inline'` cho `script-src` vì giao diện dùng thuộc tính `onclick="..."` trực tiếp trong HTML ở rất nhiều nơi — nên **không** chặn được việc một payload XSS thực thi qua thuộc tính inline; lớp phòng thủ thật sự nằm ở việc escape dữ liệu nói trên. Giá trị của CSP ở đây là chặn **exfiltration**: dù có payload chạy được, nó cũng không tải được script từ domain lạ hay gửi dữ liệu ra ngoài qua domain không nằm trong `connect-src`/`img-src`.

**Chưa làm — cần tự bổ sung nếu muốn:** Subresource Integrity (SRI) cho Chart.js. Font Awesome đã có `integrity="..."` sẵn, nhưng Chart.js (tải từ `cdn.jsdelivr.net`) thì chưa, vì môi trường tạo bản vá này không truy cập được `jsdelivr.net` để tính hash chính xác — **dán liều một hash sai sẽ khiến Chart.js không tải được, hỏng cả trang Nhật ký/Lịch sử**, nên mình để trống thay vì đoán. Tự làm theo 2 bước:
```bash
# 1. Tải file và tính hash SHA-384 (chạy trên máy bạn, có mạng ra ngoài)
curl -s https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js -o chart.umd.min.js
openssl dgst -sha384 -binary chart.umd.min.js | openssl base64 -A
```
```html
<!-- 2. Dán kết quả vào index.html, thay thế thẻ <script> hiện tại của Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
        integrity="sha384-<KẾT QUẢ Ở BƯỚC 1>"
        crossorigin="anonymous"></script>
```

---

## 🌐 Hướng Dẫn Deploy Lên GitHub Pages

Dự án sử dụng công nghệ web tĩnh thuần túy (HTML5, Vanilla CSS, Vanilla JavaScript ES6), không cần cài đặt Node.js hay build phức tạp. Bạn có thể deploy lên GitHub Pages trong 3 phút:

1. **Khởi tạo và đẩy mã nguồn lên GitHub Repository**:
   ```bash
   git init
   git add .
   git commit -m "NutriFuture: Tái cấu trúc toàn diện với Gemini AI"
   git branch -M main
   git remote add origin https://github.com/QuocHung2008/NutriFuture.git
   git push -u origin main
   ```

2. **Thiết lập Secret** (xem Bước 2 ở trên): `Settings` → `Secrets and variables` → `Actions` → thêm `GEMINI_API_KEY`.

3. **Kích hoạt GitHub Pages qua Actions**:
   - `Settings` → `Pages` → **Build and deployment** → **Source**: chọn **`GitHub Actions`** (không chọn "Deploy from a branch").
   - Vào tab `Actions`, chạy lại workflow **"Deploy NutriFuture to GitHub Pages"** nếu nó chưa tự chạy (hoặc bấm **Run workflow** để chạy thủ công).

4. Sau 1-2 phút, trang web sẽ online tại địa chỉ:
   ```
   https://QuocHung2008.github.io/NutriFuture/
   ```

---

## 🔬 Cơ Sở Khoa Học & Công Thức Y Khoa Ứng Dụng

Ứng dụng tuân thủ nghiêm ngặt các hướng dẫn y khoa và dinh dưỡng học đường:

| Chỉ số | Phương pháp & Công thức tính | Nguồn tài liệu tham khảo |
|--------|------------------------------|--------------------------|
| **BMI** (Body Mass Index) | $\text{BMI} = \frac{\text{Cân nặng (kg)}}{\text{Chiều cao (m)}^2}$ | Tổ chức Y tế Thế giới (WHO) |
| **BMR** (Basal Metabolic Rate) | **Nam**: $10W + 6.25H - 5A + 5$<br>**Nữ**: $10W + 6.25H - 5A - 161$ | Phương trình Mifflin-St Jeor (1990) — Chuẩn độ chính xác cao nhất cho thanh thiếu niên |
| **TDEE** (Total Daily Energy Expenditure) | $\text{TDEE} = \text{BMR} \times \text{Hệ số hoạt động (1.2 - 1.9)}$ | Hiệp hội Y học Thể thao Hoa Kỳ (ACSM) |
| **Nhu cầu Nước** | $\text{Nước (ml)} = \text{Cân nặng (kg)} \times 33\text{ ml}$ | Cơ quan An toàn Thực phẩm Châu Âu (EFSA) |
| **Tỷ lệ 3 Chất Đa Lượng (Macro)** | • Tinh bột (Carb): 50 - 55% TDEE<br>• Đạm (Protein): 15 - 20% TDEE<br>• Chất béo (Fat): 25 - 30% TDEE | Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam (Viện Dinh Dưỡng Quốc Gia) |

---

## 📁 Cấu Trúc Mã Nguồn (Modular Architecture)

```
NutriFuture/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions: nạp GEMINI_API_KEY từ Secret & deploy Pages
├── index.html                  # Giao diện chính (SPA Shell, semantic HTML5)
├── manifest.json                # PWA: tên, icon, chế độ standalone
├── sw.js                        # Service Worker: cache offline (không cache lệnh gọi Gemini AI)
├── icons/                       # Icon PWA (192x192, 512x512)
├── css/
│   └── main.css                 # Design System Vanilla CSS, tokens & glassmorphism
├── js/
│   ├── config.template.js      # Mẫu cấu hình Gemini API (commit lên Git, KHÔNG chứa key thật)
│   ├── config.js                # Sinh tự động lúc deploy (chứa key thật) — KHÔNG commit, đã trong .gitignore
│   ├── storage.js              # Quản lý LocalStorage, index ngày, kiểm tra hồ sơ, Xuất/Nhập JSON có migration version
│   ├── data/
│   │   ├── foods.js            # CSDL dinh dưỡng nội bộ (ẨN) — sinh bằng tools/build-foods.py
│   │   └── quiz.js             # Ngân hàng câu đố dinh dưỡng — sinh bằng tools/build-quiz.py
│   ├── foods.js                # NF_Foods: khớp tên món "đúng" với CSDL (không lộ danh sách ra giao diện)
│   ├── gemini.js               # Wrapper Gemini (Text & Vision): tra cứu, nhận xét món CSDL, thực đơn, sinh câu đố
│   ├── game-engine.js          # NF_Game: điểm, huy hiệu, streak, thử thách tuần, câu đố (logic thuần, có unit test)
│   ├── motion.js               # Chuyển động card (chỉ gắn class; hiệu ứng nằm trong CSS)
│   ├── ui.js                   # Tiện ích giao diện: Toast, Modal (persistent), Skeleton, Format
│   ├── notifications.js        # Nhắc uống nước & ghi nhật ký (Notification API)
│   ├── app.js                  # Router Hash, cổng nhập hồ sơ, vòng đời ứng dụng
│   └── pages/
│       ├── home.js             # Trang chủ: Tổng quan calo, nước uống, thống kê
│       ├── camera.js           # Camera AI: Chụp ảnh trực tiếp & phân tích thị giác (resize trước khi gửi)
│       ├── lookup.js           # Tra cứu: CSDL nội bộ (ẩn) + nhận xét AI, hoặc hoàn toàn AI
│       ├── profile.js          # Cá nhân hóa: BMI/BMR/TDEE, chọn Model Gemini, cài đặt Nhắc nhở
│       ├── diary.js            # Nhật ký: Ghi nhận bữa ăn, cảnh báo TDEE, biểu đồ Macro (cache Chart.js instance)
│       ├── history.js          # Lịch sử: Biểu đồ xu hướng 7 ngày & sao lưu dữ liệu
│       └── game.js             # Học mà chơi: câu đố, thử thách tuần, huy hiệu
├── tests/                      # Unit test (node --test) cho CSDL, khớp tên và engine game — KHÔNG deploy
├── tools/                      # Script sinh dữ liệu & kiểm tra CSDL (build-foods.py, audit-foods.js) — KHÔNG deploy
├── .gitignore                  # Bỏ qua js/config.js (key thật, sinh tự động) và file tạm hệ thống
└── README.md                   # Tài liệu hướng dẫn chi tiết
```

---

## 🧪 Kiểm thử

```bash
node --test tests/*.test.js     # 27 test: CSDL, khớp tên, điểm/streak/huy hiệu/thử thách tuần/câu đố
node tools/audit-foods.js       # đối chiếu kcal ghi trong CSDL với kcal tính từ macro (4-4-9)
```

Sau mỗi thay đổi: mở DevTools kiểm tra Console không có lỗi CSP, thử offline (DevTools → Network → Offline) và thử trên điện thoại thật qua HTTPS.

---

## 👥 Tác Giả & Bản Quyền

- **Học sinh thực hiện đề tài**: Đề tài KHKT Dinh Dưỡng Học Đường Dành Cho Học Sinh THPT.
- **Giấy phép**: MIT License — Được tự do sử dụng và phát triển cho mục đích giáo dục và nghiên cứu khoa học.
