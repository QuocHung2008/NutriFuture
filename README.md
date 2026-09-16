# 🌿 NutriFuture — Ứng Dụng AI Dinh Dưỡng Học Đường Cho Học Sinh THPT

> **Đề tài Cuộc thi Nghiên cứu Khoa học Kỹ thuật (KHKT) cấp THPT**  
> *"Ứng dụng Trí tuệ Nhân tạo trong Phân tích và Tư vấn Dinh dưỡng Học đường cho Học sinh THPT"*

NutriFuture là ứng dụng web di động (Mobile Web App) được thiết kế hiện đại, khoa học và hoàn toàn tĩnh (Static Single Page Application), tích hợp công nghệ **Google Gemini 2.0 AI (Vision & Text)** để hỗ trợ học sinh THPT theo dõi dinh dưỡng, nhận diện khẩu phần ăn thời gian thực và xây dựng lối sống lành mạnh.

---

## 🚀 Các Tính Năng Nổi Bật

| # | Tính năng | Chi tiết kỹ thuật & Tính khoa học |
|---|-----------|-----------------------------------|
| 1 | 📷 **Camera AI Nhận Diện Món Ăn** | Chụp ảnh món ăn trực tiếp từ camera hoặc tải ảnh lên. Mô hình **Gemini 2.0 Flash Vision** phân tích thị giác máy tính, nhận diện tên món, khẩu phần, ước tính calo, đạm, béo, tinh bột, chất xơ và đưa ra lời khuyên dinh dưỡng học đường. |
| 2 | 🔍 **Tra Cứu Dinh Dưỡng AI** | Không phụ thuộc vào cơ sở dữ liệu hardcoded cố định. Sử dụng **Gemini Text API** tra cứu tức thì thành phần dinh dưỡng của mọi món ăn Việt Nam kèm phân tích vi chất và lịch sử tìm kiếm. |
| 3 | ⚖️ **Cá Nhân Hóa Chỉ Số Thể Trạng** | **Không dùng số liệu mẫu**: Người dùng tự nhập Tuổi, Giới tính, Chiều cao, Cân nặng và Mức độ vận động. Máy tính toán tự động theo công thức y khoa chuẩn quốc tế: **BMI (WHO)**, **BMR (Mifflin - St Jeor)**, **TDEE (ACSM)**, **Nhu cầu Nước** và **Tỷ lệ Macro khuyến nghị của Viện Dinh Dưỡng Quốc Gia VN**. |
| 4 | 💡 **AI Tư Vấn Thực Đơn 1 Ngày** | Dựa trên chỉ số thể trạng và TDEE thực tế của người dùng, Gemini AI tự động lập thực đơn 4 bữa thuần Việt cân đối các nhóm chất và cho phép thêm trực tiếp vào nhật ký. |
| 5 | 📖 **Nhật Ký Dinh Dưỡng & Biểu Đồ Macro** | Ghi nhận bữa ăn theo ngày, hiển thị tỷ lệ % Calo nạp vào so với TDEE, biểu đồ Doughnut Chart phân tích 3 chất đa lượng (Carb - Protein - Fat) bằng **Chart.js**. |
| 6 | 📈 **Lịch Sử, Thống Kê & Sao Lưu JSON** | Biểu đồ cột theo dõi xu hướng calo 7 ngày, danh sách ngày đã ghi nhận và tính năng **Xuất (Export) / Khôi phục (Import) tệp JSON** giúp bảo toàn dữ liệu trên thiết bị. |

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

Phiên bản hiện tại dùng **1 API Key duy nhất do chủ dự án cấu hình**, người dùng cuối **không cần** tự nhập key nữa (mục nhập key trong Hồ sơ/Camera/Tra cứu sẽ tự ẩn). Key được lưu trong **GitHub Secrets** (không nằm trong source code, không nằm trong git history) và chỉ được GitHub Actions "nạp" vào lúc build/deploy lên GitHub Pages.

1. Vào repo trên GitHub → `Settings` → `Secrets and variables` → `Actions` → **New repository secret**.
2. Đặt tên: `GEMINI_API_KEY`, giá trị: dán API Key thật của bạn (dạng `AIzaSy...`) → **Add secret**.
3. Vào `Settings` → `Pages` → mục **Build and deployment** → **Source**: đổi từ `Deploy from a branch` sang **`GitHub Actions`**.
4. Push code (đã kèm sẵn workflow `.github/workflows/deploy.yml` trong dự án) lên nhánh `main`. GitHub Actions sẽ tự động:
   - Sinh ra `js/config.js` từ `js/config.template.js`, thay `__GEMINI_API_KEY__` bằng giá trị Secret.
   - Deploy toàn bộ site (đã có key) lên GitHub Pages.
5. Trong tab **Hồ sơ** của ứng dụng, người dùng có thể chọn model Gemini muốn dùng (Tự động / Flash / Flash-Lite / Pro...) qua ô **Model Gemini sử dụng** — không cần đụng đến key.

📌 **Chạy thử ở máy local?** Copy `js/config.template.js` thành `js/config.js` (đã có trong `.gitignore`, không bao giờ bị commit), thay `__GEMINI_API_KEY__` bằng key thật để test — file này chỉ nằm trên máy bạn.

---

### 🛡️ Lưu ý về rủi ro khi dùng 1 key dùng chung
Vì đây là Static Web App (không backend), **key vẫn hiển thị được** nếu ai đó mở DevTools/xem Network request trên **trang web đã deploy** — cách trên chỉ ngăn key bị lộ trong **source code trên GitHub** (git history, bot quét repo công khai), chứ không thể giấu key khỏi trình duyệt người xem trang. Với key **miễn phí, chỉ dùng ngắn hạn cho kỳ thi**, đây là mức đánh đổi hợp lý. Nếu muốn giảm rủi ro thêm (không bắt buộc):
1. Vào [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Nhấp vào khóa API bạn đã tạo.
3. Tại mục **Set application restrictions**: Chọn **Websites (HTTP referrers)**:
   - Thêm URL trang web GitHub Pages của bạn (ví dụ: `https://QuocHung2008.github.io/*`).
4. Tại mục **API restrictions**: Chọn **Restrict key** -> Chỉ tích chọn duy nhất **Generative Language API**.
5. Nhấp **Save**. Khóa API của bạn giờ đây chỉ có thể được gọi từ chính trang web của bạn!

---

## 🌐 Hướng Dẫn Deploy Lên GitHub Pages (qua GitHub Actions)

Dự án sử dụng công nghệ web tĩnh thuần túy (HTML5, Vanilla CSS, Vanilla JavaScript ES6), không cần cài đặt Node.js hay build phức tạp ở máy bạn — toàn bộ được GitHub Actions xử lý.

1. **Đẩy mã nguồn lên GitHub Repository**:
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
   - Vào tab `Actions`, chạy lại workflow **"Deploy NutriFuture to GitHub Pages"** nếu nó chưa tự chạy (hoặc push thêm 1 commit bất kỳ để kích hoạt).

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
├── css/
│   └── style.css               # Design System Vanilla CSS, tokens & glassmorphism
├── js/
│   ├── config.template.js      # Mẫu cấu hình Gemini API (commit lên Git, KHÔNG chứa key thật)
│   ├── config.js                # Sinh tự động lúc deploy (chứa key thật) — KHÔNG commit, đã trong .gitignore
│   ├── storage.js              # Quản lý LocalStorage & Xuất/Nhập JSON
│   ├── gemini.js               # Wrapper gọi Google Gemini API (Text & Vision) + chọn model
│   ├── ui.js                   # Tiện ích giao diện: Toast, Modal, Skeleton, Format
│   ├── app.js                  # Điều phối Router Hash & Vòng đời ứng dụng
│   └── pages/
│       ├── home.js             # Trang chủ: Tổng quan calo, nước uống, thống kê
│       ├── camera.js           # Camera AI: Chụp ảnh trực tiếp & phân tích thị giác
│       ├── lookup.js           # Tra cứu AI: Tìm kiếm món ăn & gợi ý thông minh
│       ├── profile.js          # Cá nhân hóa: BMI/BMR/TDEE, Tư vấn thực đơn, chọn Model Gemini
│       ├── diary.js            # Nhật ký: Ghi nhận bữa ăn & biểu đồ Macro Doughnut
│       └── history.js          # Lịch sử: Biểu đồ xu hướng 7 ngày & sao lưu dữ liệu
├── .gitignore                  # Bỏ qua js/config.js (key thật) và file tạm hệ thống
└── README.md                   # Tài liệu hướng dẫn chi tiết
```

---

## 👥 Tác Giả & Bản Quyền

- **Học sinh thực hiện đề tài**: Đề tài KHKT Dinh Dưỡng Học Đường Dành Cho Học Sinh THPT.
- **Giấy phép**: MIT License — Được tự do sử dụng và phát triển cho mục đích giáo dục và nghiên cứu khoa học.
