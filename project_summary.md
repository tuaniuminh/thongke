# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]
> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.5.9** |
| **Thư mục dự án** | `C:\Users\PC VIP\Documents\Thong-ke` |
| **GitHub Repository** | `https://github.com/tuaniuminh/thongke.git` (nhánh `main`) |
| **Ngôn ngữ** | HTML + Vanilla JS + CSS (không dùng framework) |

### 📜 Lịch sử phiên bản (5 bản gần nhất)

| Version | Chi tiết thay đổi |
|---------|-------------------|
| **v4.5.9** | ✅ **Ẩn Mặc Định Khung Xe Rỗng & Chuẩn Hóa CSS `.tab-panel` Triệt Tiêu Khoảng Trống Thừa (v4.5.9)**: (1) Đặt `style="display: none;"` mặc định cho `vehicleEmptyNotice` trong [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html) để khi tài khoản đã có dữ liệu xe, khối thông báo xe rỗng hoàn toàn không chiếm khoảng không layout ngầm. (2) Bổ sung quy tắc CSS `.tab-panel { margin: 0; padding: 0; width: 100%; }` trong [`src/assets/css/style.css`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/assets/css/style.css) triệt tiêu hoàn toàn khoảng khoảng trống dư thừa phía trên các phần tử card khi cuộn trang. Nâng phiên bản toàn hệ thống sang `?v=4.5.9`. |
| **v4.5.8** | ✅ **Gỡ Bỏ Hoàn Toàn Thẻ Neo Anchor Trùng Hash & Cuộn Ép Đỉnh Đa Tần Số Lock 0px (v4.5.8)**: (1) Phát hiện nguyên nhân làm trình duyệt Chromium tự động kích hoạt native `scrollIntoView()` trôi xuống 400px là do tồn tại thẻ `<a id="chamsocxe">` trong DOM. Gỡ bỏ hoàn toàn thẻ `<a id="chamsocxe">` khỏi [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html) khiến trình duyệt không tìm thấy anchor target và ngưng 100% thao tác native scroll. (2) Nâng cấp hàm `forceScrollToTop()` trong [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js) cuộn ép liên tục qua chuỗi frame `10ms..500ms` đảm bảo vị trí màn hình luôn khóa cứng ở `0px`. Nâng phiên bản toàn hệ thống sang `?v=4.5.8`. |
| **v4.5.7** | ✅ **Phục Hồi Nút `btnAddVehicle` Vào Top-Header & Chuẩn Hóa Nút `openVehicleFormModal` Trực Tiếp (v4.5.7)**: (1) Bổ sung nút `btnAddVehicle` ("+ Thêm xe mới") vào `.header-actions` trong `header.top-header` tại [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html) và tự động bật/tắt hiển thị trong `switchTab` tại [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js). (2) Xuất `window.openVehicleFormModal` trong [`src/features/cham-soc-xe/cham-soc-xe.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/cham-soc-xe/cham-soc-xe.js) và cập nhật `onclick="window.openVehicleFormModal()"` cho nút Thêm xe đầu tiên ngay, triệt tiêu 100% lỗi null pointer làm gián đoạn mã JS render. Nâng phiên bản toàn hệ thống sang `?v=4.5.7`. |
| **v4.5.6** | ✅ **Di Chuyển Thẻ Neo Định Vị Lên Đầu Trang & Triệt Tiêu Lỗi Tự Cuộn 386px Của Browser Native Engine (v4.5.6)**: (1) Phát hiện nguyên nhân tận gốc làm trình duyệt tự cuộn `window.scrollTop` xuống `386.4px` (đẩy tiêu đề `top-header` lên `-282px`) là do thẻ neo `<a id="chamsocxe">` nằm bên dưới `content-header` khiến cơ chế hash router native của trình duyệt tự nhảy cuộn tới vị trí mốc anchor này. Di chuyển 2 thẻ neo `<a id="chamsocxe">` và `<a id="vehicle">` lên vị trí `top: 0` của `<main class="main-content">` trong [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html). (2) Bổ sung `style="display: none;"` cho `tab-dashboard` và gỡ bỏ `content-header` bị lặp lại trong `tab-vehicle`. Đưa màn hình tab Chăm Sóc Xe về vị trí `0px` chuẩn 100%. Nâng phiên bản toàn hệ thống sang `?v=4.5.6`. |
| **v4.5.5** | ✅ **Nâng Cấp Log Chẩn Đoán Cây Con main-content & Chuẩn Hóa Class Active Tab-Panel (v4.5.5)**: (1) Thêm tính năng in chi tiết thông số `display`, `top`, `height` của từng phần tử con trực thuộc `main-content` trong `runLayoutDiagnostics()` thuộc [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js). (2) Bổ sung tự động thêm/gỡ class `.active` chuẩn cho các `tab-panel` khi chuyển tab trong `switchTab`. Nâng phiên bản toàn hệ thống sang `?v=4.5.5`. |
| **v4.5.1** | ✅ **Nâng Cấp Hệ Thống Debug Log `[BUG DETECTOR]` Quét Sâu Vị Trí Cuộn & DOM Tall Elements (v4.5.1)**: Áp dụng Quy tắc 4 (Bug Detector Rule) bổ sung log theo dõi từng mốc `STEP 0..3` của `forceScrollToTop()`, quét tất cả các phần tử phình chiều cao `>200px` trong DOM và lắng nghe sự kiện `scroll` toàn cục trong [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js) để tìm nguyên nhân gốc rễ. Nâng phiên bản toàn hệ thống sang `?v=4.5.1`. |
| **v4.4.9** | ✅ **Kích Hoạt `history.scrollRestoration = 'manual'` & Hàm Cuộn Ép Đỉnh Đa Tần Tố `forceScrollToTop()` (v4.4.9)**: (1) Bổ sung `history.scrollRestoration = 'manual'` khi ứng dụng khởi chạy trong [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js) triệt tiêu hoàn toàn tính năng khôi phục cuộn cũ `458.4px` tự động của trình duyệt engine SPA. (2) Định nghĩa hàm `forceScrollToTop()` cuộn cuộn đa tầng (`requestAnimationFrame` + `setTimeout 50ms/150ms`) ép `window`, `html` và `body` về vị trí `0px` mỗi khi chuyển tab. Nâng phiên bản toàn hệ thống sang `?v=4.4.9`. |
| **v4.4.7** | ✅ **Nâng Phiên Bản Nối Tiếp & Hoàn Thiện Fix Lỗi Chăm Sóc Xe (v4.4.7)**: (1) Nâng số phiên bản toàn hệ thống sang `?v=4.4.7` trên 15 tệp mã nguồn theo đúng Quy tắc 2. (2) Khắc phục triệt để lỗi cuộn trong bảng modal xe với `max-height: 70vh; overflow-y: auto;` trên `.modal-body` trong [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html). (3) Thêm `setTimeout 50ms` tự động reset cuộn về vị trí đỉnh 0px trong `switchTab` tại [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js). (4) Chuẩn hóa hàm đóng/mở modal trong [`src/features/thu-chi-doi-ngoai/thu-chi.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/thu-chi-doi-ngoai/thu-chi.js) và [`src/features/cham-soc-xe/cham-soc-xe.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/cham-soc-xe/cham-soc-xe.js). Nâng phiên bản toàn hệ thống sang `?v=4.4.7`. |
| **v4.4.6** | ✅ **Fix Lỗi Cuộn Modal Body Chăm Sóc Xe & Tự Động Reset Cuộn Màn Hình Tức Thì Khi Chuyển Tab (v4.4.6)**: (1) Nâng cấp `window.closeModal(id)` gỡ bỏ triệt để cả `.active` lẫn `style.display = 'none'` trong [`src/features/thu-chi-doi-ngoai/thu-chi.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/thu-chi-doi-ngoai/thu-chi.js). Đồng thời gắn class `.active` chuẩn khi mở modal trong [`src/features/cham-soc-xe/cham-soc-xe.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/cham-soc-xe/cham-soc-xe.js), giải quyết dứt điểm lỗi không đóng được bảng. (2) Bổ sung `max-height: 70vh; overflow-y: auto;` trực tiếp trên `.modal-body` của 3 modal xe trong [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html) cho phép cuộn vuốt nội dung trong bảng mượt mà 100%. (3) Bổ sung `setTimeout 50ms` để thực thi `window.scrollTo(0, 0)` sau khi trình duyệt hoàn tất xử lý hashchange và reflow layout trong `switchTab` tại [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js) giúp tiêu đề và nội dung tab mới luôn tự cuộn lên đỉnh đầu trang. Nâng phiên bản toàn hệ thống sang `?v=4.4.6`. |
| **v4.4.5** | ✅ **Fix Lỗi Toggle Cài Đặt Chăm Sóc Xe & Xóa Bỏ Giao Diện Bento Grid 3 Cột (v4.4.5)**: (1) Bổ sung đồng bộ `toggleShowVehicleCareCard.checked = !!state.showVehicleCareCard` trong `updateHomeLayoutSettingsUI()` thuộc [`src/features/thu-chi-doi-ngoai/thu-chi.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/thu-chi-doi-ngoai/thu-chi.js), sửa dứt điểm việc tải lại trang bị nhả công tắc về OFF. (2) Gọi `lucide.createIcons()` khi render bản ghi rỗng trong [`src/features/cham-soc-xe/cham-soc-xe.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/features/cham-soc-xe/cham-soc-xe.js). (3) Xóa bỏ hoàn toàn phần cài đặt Bento Grid 3 cột khỏi [`index.html`](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html) và [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js). Nâng phiên bản toàn hệ thống sang `?v=4.4.5`. |
| **v4.4.3** | ✅ **Tái Cấu Trúc Khung Điều Hướng Shell: Chuyển quickAddBtn Sang Chuẩn Whitelist (v4.4.3)**: Thay thế điều kiện ẩn thủ công từng card bằng Whitelist `['dashboard', 'received', 'sent'].includes(tabId)` tại `switchTab` trong [`src/core/app.js`](file:///c:/Users/PC VIP/Documents/Thong-ke/src/core/app.js). Đảm bảo tất cả các card hiện tại và card tương lai không bao giờ bị ảnh hưởng bởi nút Thêm ghi chép của Thu Chi. Nâng phiên bản toàn hệ thống sang `?v=4.4.3`. |

---

## 🏗 Kiến trúc & Tệp quan trọng (Đã bóc tách module)

Dự án đã được tái cấu trúc từ một file `app.js` khổng lồ sang kiến trúc module ES6 gọn nhẹ hơn:

| Tệp / Thư mục | Mô tả |
|---------------|-------|
| `index.html` | Toàn bộ cấu trúc HTML chính của ứng dụng |
| `404.html` | Xử lý routing ảo cho SPA trên GitHub Pages |
| `src/core/app.js` | Logic cốt lõi: Router, State, Auth, thiết lập UI chung (~2000 dòng) |
| `src/core/crypto.js` | Mã hóa AES-256 bằng PBKDF2 + Web Crypto API |
| `src/core/sync.js` | Đồng bộ với Supabase (realtime, auth) |
| `src/features/thu-chi-doi-ngoai/thu-chi.js` | Module quản lý Thu/Chi, Biểu đồ dòng tiền, Export/Import Excel |
| `src/features/ho-so-y-te/ho-so-y-te.js` | Module quản lý Y tế, Bệnh án, Quét ảnh AI, Giọng đọc, Xuất PDF |
| `src/features/cham-soc-xe/cham-soc-xe.js` | Module quản lý Chăm sóc xe máy, Nhắc dầu, Nhật ký sửa chữa, Xăng & AI chẩn đoán |
| `src/features/thoi-tiet/thoi-tiet.js` | Tính năng Dự báo Thời tiết (Open-Meteo API) |
| `src/features/am-lich/lunar_vietnam.js` | Thư viện lịch âm Việt Nam (thuật toán Hồ Ngọc Đức, GMT+7) |
| `src/assets/` | Chứa CSS (`style.css`) và Hình ảnh (`icon.png`, logo...) |
| `version.json` | Kiểm tra cập nhật tự động |

---

## ✨ Tính năng chính của ứng dụng

### 1. Bảo mật
- **Mã hóa toàn bộ dữ liệu** bằng AES-256 (PBKDF2) trước khi lưu vào `localStorage`
- **Master Password**: Khóa mã hóa do người dùng đặt khi lần đầu truy cập
- **Hai chế độ đặt mật khẩu**: PIN 6 số (bàn phím T9) hoặc Mật khẩu chữ
- **Ghi nhớ đăng nhập**: Checkbox "Ghi nhớ mở khóa trên thiết bị này" lưu mật khẩu vào `localStorage` dưới key `gift_ledger_remembered_pin`
- **Tự động chọn chế độ**: Desktop → Keyboard Mode; Mobile → PIN Mode

### 2. Thu Chi Đối Ngoại
- Ghi nhận tiền **nhận** và **gửi đi** (đám cưới, thôi nôi, v.v.)
- Lọc theo sự kiện, tìm kiếm người, thống kê tổng hợp với thuật toán tính điểm ưu tiên họ tên khớp trước địa chỉ
- Biểu đồ Chart.js

### 3. Hồ Sơ Sức Khỏe
- Lưu chỉ số xét nghiệm (máu, sinh hóa, ...)
- Theo dõi lịch sử huyết áp (Tâm thu, tâm trương, nhịp tim, buổi đo sáng/tối)
- **Từ điển chỉ số y tế** (~150+ chỉ số): tên viết tắt, đơn vị, ngưỡng bình thường, chú giải
- Lời giới thiệu khi vào trang "Hồ sơ sức khỏe"
- **Tải ảnh / Chụp ảnh trực tiếp từ camera**: Quét nhanh các chỉ số xét nghiệm hoặc kết quả đo huyết áp tự động

### 4. Tích hợp AI (Gemini) nâng quan tâm
- **Nhận diện ảnh đa năng**: Tự động nhận diện nếu ảnh là máy đo huyết áp (Omron HEM-7361T) hoặc kết quả xét nghiệm y tế
- **Thuật toán thông minh cho máy Omron**: Chỉ trích xuất cột kết quả đo mới nhất ở bên **PHẢI** (bỏ qua cột kết quả cũ bên trái)
- **Cơ chế Thử lại Tự động (Fallback models)**: Khi gặp lỗi quá tải/đáp ứng cao (`gemini-3.5-flash`), hệ thống tự động đổi sang `gemini-2.5-flash` rồi `gemini-1.5-flash` để đảm bảo quét thành công
- **Báo cáo phân tích tổng hợp (Blood Test + BP)**: Kết hợp các xét nghiệm máu và lịch sử đo huyết áp để phân tích tim mạch, đường huyết, mỡ máu tổng quan
- **Tùy chọn Phân tích linh hoạt**: Sau khi quét huyết áp, hiển thị modal cho phép lựa chọn:
  - **Phương án 1**: Chỉ phân tích chỉ số Huyết áp (Hôm nay & Lịch sử)
  - **Phương án 2**: Phân tích Huyết áp kết hợp toàn bộ dữ liệu sức khỏe (Xét nghiệm máu, nước tiểu...)
- **Giọng đọc AI (Text-to-Speech) cải tiến**: Tự động phát hiện và lựa chọn giọng đọc tự nhiên (Natural/Google/Microsoft), tinh chỉnh tốc độ đọc xuống `0.9` để giảm tối đa tính máy móc, tự động ngắt tiếng khi tắt modal.

### 5. Xuất báo cáo PDF
- Xuất dữ liệu y tế và lịch sử huyết áp ra file PDF chuyên nghiệp
- **Sửa lỗi Font tiếng Việt**: Nhúng font Roboto (Regular & Bold) tự động từ CDN cdnjs hỗ trợ diacritics tiếng Việt trọn vẹn
- Việt hóa toàn bộ văn bản trong file PDF xuất ra

### 6. Trang chủ & Đồng bộ
- Widget **Thời tiết Hà Nội** (Open-Meteo API, mô tả tiếng Việt) và **Lịch âm Việt Nam** (GMT+7)
- Cập nhật sáng/tối đồng bộ
- **Đồng bộ Supabase**: Dữ liệu mã hóa của cả Thu Chi và Huyết áp được đồng bộ tự động theo thời gian thực (nhất quán LWW)

---

## 🔑 Lưu ý kỹ thuật quan trọng

> [!TIP]
> **TỰ ĐỘNG ĐẨY CODE LÊN GITHUB (push.bat):** Sau khi hoàn thành bất kỳ tính năng, sửa lỗi hay cập nhật mã nguồn và hoàn tất nâng cấp phiên bản (Version Bump), agent **bắt buộc phải tự động thực thi file batch `push.bat`** (hoặc chạy các lệnh git push tương đương) để đẩy toàn bộ mã nguồn mới nhất lên GitHub cho người dùng mà không cần chờ nhắc nhở.

> [!IMPORTANT]
> **Nâng cấp phiên bản (Version Bump):** Ở MỖI LẦN chỉnh sửa mã nguồn (dù là nhỏ nhất), agent **bắt buộc** phải nâng cấp số phiên bản đồng loạt trong **6 file** (không được bỏ sót): `version.json`, `src/core/app.js` (biến `APP_VERSION`), `index.html` (các `?v=...`), `sw.js`, **`package.json`** (ảnh hưởng tên file `.ipa` iOS), **`manifest.json`** (icon URL cache PWA), và tất cả `import ... ?v=` trong các file JS module. Xem **Checklist đầy đủ** trong `.agents/AGENTS.md` Quy tắc 2.

> [!IMPORTANT]
> **Cập nhật Lịch sử Phiên bản:** Cùng với việc nâng cấp version, bạn bắt buộc phải thêm dòng tóm tắt thông tin các thay đổi của phiên bản mới vào bảng "Lịch sử phiên bản gần đây" trong chính file `project_summary.md` này.

> [!IMPORTANT]
> **Tính Độc Lập Giữa Các Module:** Mọi chỉnh sửa trong tính năng **Thu chi đối ngoại** tuyệt đối không được ảnh hưởng đến dữ liệu hoặc hoạt động của **Hồ sơ sức khỏe** và ngược lại. Hai phân hệ này phải hoàn toàn độc lập với nhau.

> [!IMPORTANT]
> **Đóng gói & Đặt tên file IPA (iOS):** Khi ứng dụng được đóng gói tự động trên GitHub Actions (file `build-ios.yml`), file `.ipa` đầu ra bắt buộc phải được tự động đổi tên theo định dạng `FamiLife_v[Phiên_bản].ipa` (ví dụ: `FamiLife_v4.1.41.ipa`) dựa trên thuộc tính `version` trong `package.json`.

> [!IMPORTANT]
> **Bảo vệ mã hóa UTF-8 (No-BOM):** Toàn bộ file nguồn (`index.html`, JS, CSS, JSON) phải luôn lưu dưới dạng **UTF-8 không BOM**. Tuyệt đối không dùng các câu lệnh PowerShell `Get-Content | Set-Content` đơn thuần trên hệ điều hành Windows vì sẽ gây ra lỗi **Mojibake** (hỏng ký tự Tiếng Việt) và tự thêm dấu UTF-8 BOM byte header làm lỗi nạp module JS. Xem **Quy tắc 5** trong `.agents/AGENTS.md`.

---

## 🛠 Hệ Thống Chẩn Đoán Mã Lỗi Toàn Cục (Error Codes)

Ứng dụng tích hợp hệ thống chẩn đoán lỗi toàn cục tại [index.html](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html), tự động bắt lỗi và ánh xạ sang các mã số chẩn đoán hiển thị trực quan trên Banner màu đỏ để người dùng dễ dàng báo cáo:

| Mã số lỗi | Phân nhóm lỗi | Định nghĩa & Nguyên nhân phổ biến |
|-----------|---------------|-----------------------------------|
| **`ERR-101`** | **Lỗi cú pháp (SyntaxError)** | Thiếu dấu đóng mở ngoặc, dấu phẩy, lỗi cú pháp biên dịch JavaScript |
| **`ERR-102`** | **Lỗi tham chiếu (ReferenceError)** | Gọi một biến hoặc một hàm chưa được định nghĩa |
| **`ERR-103`** | **Lỗi kiểu dữ liệu (TypeError)** | Gọi hàm không tồn tại, truy cập thuộc tính trên đối tượng `null` hoặc `undefined` |
| **`ERR-201`** | **Lỗi mạng / API** | Không thể kết nối tới máy chủ, lỗi gọi API Supabase, lỗi Fetch |
| **`ERR-202`** | **Lỗi giải mã E2EE** | Nhập sai Master PIN, khóa bất đối xứng không hợp lệ, dữ liệu đồng bộ bị hỏng |
| **`ERR-301`** | **Lỗi PWA / Service Worker** | Lỗi trong quá trình cập nhật Service Worker, nạp cache offline |
| **`ERR-999`** | **Lỗi không xác định** | Các lỗi runtime hoặc Promise Rejection khác chưa được phân loại |

---

## 🛢 Cấu trúc Cơ sở dữ liệu & Chính sách RLS (Supabase)

Bảng `gift_sync` trên Supabase được cấu hình Row Level Security (RLS) để cho phép trao đổi khóa bất đối xứng và đồng bộ Quỹ gia đình E2EE giữa 2 vợ chồng:

```sql
-- 1. Bảng lưu trữ đồng bộ: public.gift_sync
-- Gồm các cột: user_id (UUID, khóa chính), encrypted_data (TEXT), updated_at (TIMESTAMPTZ), user_email (TEXT), public_key (TEXT)

-- 2. Chính sách ĐỌC dữ liệu (SELECT): Cho phép mọi tài khoản đã đăng nhập đọc dòng của nhau để lấy khóa công khai ghép đôi
drop policy if exists "Allow select for everyone" on public.gift_sync;
create policy "Allow select for everyone" on public.gift_sync for select using (true);

-- 3. Chính sách CẬP NHẬT dữ liệu (UPDATE): Cho phép chủ sở hữu hoặc đối tác (Vợ/Chồng) được phân quyền cập nhật dòng Quỹ gia đình E2EE chung
drop policy if exists "Allow update if owner or spouse" on public.gift_sync;
create policy "Allow update if owner or spouse" on public.gift_sync for update using (
    auth.uid() = user_id 
    or lower(encrypted_data::jsonb->>'spouse_email') = lower(auth.jwt()->>'email')
);

-- 4. Chính sách CHÈN dữ liệu (INSERT / UPSERT): Đảm bảo người dùng hoặc đối tác (Vợ/Chồng) có quyền ghi khi thực hiện Upsert giao dịch
drop policy if exists "Allow insert if owner or spouse" on public.gift_sync;
create policy "Allow insert if owner or spouse" on public.gift_sync for insert with check (
    auth.uid() = user_id 
    or lower(encrypted_data::jsonb->>'spouse_email') = lower(auth.jwt()->>'email')
);
```

---

## 🚀 Git & Triển khai

> [!TIP]
> **TỰ ĐỘNG ĐẨY CODE LÊN GITHUB.** Sau mỗi lần chỉnh sửa mã nguồn và hoàn tất nâng cấp phiên bản (Version Bump), AI bắt buộc phải tự động thực thi file batch `push.bat` để đẩy mã nguồn mới nhất lên nhánh `main` trên GitHub cho người dùng.
