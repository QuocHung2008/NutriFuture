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

### Bước 2: Đưa API Key vào ứng dụng (Chọn 1 trong 2 cách)

#### Cách 1: Nhập trực tiếp trên giao diện ứng dụng (Đơn giản nhất, khuyên dùng)
- Mở ứng dụng NutriFuture trên trình duyệt.
- Vào tab **Hồ sơ** (hoặc bấm nút *"Cần thiết lập API Key Gemini"* tại màn hình Camera AI/Tra cứu).
- Dán khóa API vào ô **Cài đặt Google Gemini API Key** và bấm **"Lưu Key"**.
- 🔒 *Khóa sẽ được lưu trữ an toàn trong `localStorage` của trình duyệt bạn và không bị lộ ra ngoài.*

#### Cách 2: Tạo file `js/config.js` (Dành cho lập trình viên khi chạy local)
1. Trong thư mục dự án, copy file `js/config.example.js` thành `js/config.js`:
   ```bash
   cp js/config.example.js js/config.js
   ```
2. Mở file `js/config.js` và dán API Key của bạn vào:
   ```javascript
   const GEMINI_CONFIG = {
     apiKey: 'AIzaSy_THAY_THE_BANG_KEY_THAT_CUA_BAN',
     apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
     model: 'gemini-2.0-flash',
     visionModel: 'gemini-2.0-flash',
     maxTokens: 2048,
   };
   ```
3. File `js/config.js` đã được cấu hình trong `.gitignore`, đảm bảo **không bao giờ bị đẩy lên GitHub**.

---

### 🛡️ Khuyến nghị bảo mật API Key khi Deploy lên GitHub Pages
Do kiến trúc Static Web App chạy trực tiếp trên trình duyệt, để bảo vệ API Key khỏi việc bị lạm dụng:
1. Vào [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Nhấp vào khóa API bạn đã tạo.
3. Tại mục **Set application restrictions**: Chọn **Websites (HTTP referrers)**:
   - Thêm URL trang web GitHub Pages của bạn (ví dụ: `https://QuocHung2008.github.io/*`).
4. Tại mục **API restrictions**: Chọn **Restrict key** -> Chỉ tích chọn duy nhất **Generative Language API**.
5. Nhấp **Save**. Khóa API của bạn giờ đây chỉ có thể được gọi từ chính trang web của bạn!

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

2. **Kích hoạt GitHub Pages**:
   - Truy cập vào Repository trên GitHub: `Settings` -> `Pages`.
   - Tại mục **Build and deployment** -> **Source**: Chọn `Deploy from a branch`.
   - Tại mục **Branch**: Chọn nhánh `main` và thư mục `/ (root)`.
   - Bấm **Save**.

3. Sau 1-2 phút, trang web sẽ online tại địa chỉ:
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
├── index.html                  # Giao diện chính (SPA Shell, semantic HTML5)
├── css/
│   └── style.css               # Design System Vanilla CSS, tokens & glassmorphism
├── js/
│   ├── config.example.js       # File mẫu cấu hình Gemini API
│   ├── storage.js              # Quản lý LocalStorage & Xuất/Nhập JSON
│   ├── gemini.js               # Wrapper gọi Google Gemini 2.0 API (Text & Vision)
│   ├── ui.js                   # Tiện ích giao diện: Toast, Modal, Skeleton, Format
│   ├── app.js                  # Điều phối Router Hash & Vòng đời ứng dụng
│   └── pages/
│       ├── home.js             # Trang chủ: Tổng quan calo, nước uống, thống kê
│       ├── camera.js           # Camera AI: Chụp ảnh trực tiếp & phân tích thị giác
│       ├── lookup.js           # Tra cứu AI: Tìm kiếm món ăn & gợi ý thông minh
│       ├── profile.js          # Cá nhân hóa: Tính BMI, BMR, TDEE & Tư vấn thực đơn
│       ├── diary.js            # Nhật ký: Ghi nhận bữa ăn & biểu đồ Macro Doughnut
│       └── history.js          # Lịch sử: Biểu đồ xu hướng 7 ngày & sao lưu dữ liệu
├── .gitignore                  # Bỏ qua js/config.js và file tạm hệ thống
└── README.md                   # Tài liệu hướng dẫn chi tiết
```

---

## 👥 Tác Giả & Bản Quyền

- **Học sinh thực hiện đề tài**: Đề tài KHKT Dinh Dưỡng Học Đường Dành Cho Học Sinh THPT.
- **Giấy phép**: MIT License — Được tự do sử dụng và phát triển cho mục đích giáo dục và nghiên cứu khoa học.
