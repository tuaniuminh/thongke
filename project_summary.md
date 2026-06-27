# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.0.30** |
| **v4.0.30** | ✅ **Tối ưu hóa Bố cục Thành viên:** Căn lề trái hoàn chỉnh cho danh sách thành viên sử dụng cấu trúc Flex Row; Di chuyển nút "Xóa" trực tiếp ra ngoài danh sách khi bật chế độ Sửa; Di chuyển nút "Sao lưu" và "Đồng bộ" lên trên cùng của Modal Sửa thể trạng, bổ sung viền màu nổi bật; Loại bỏ hoàn toàn nút Xóa khỏi modal footer. |
| **Thư mục dự án** | `C:\Users\PC VIP\Downloads\Thong-ke` |
| **GitHub Repository** | `https://github.com/tuaniuminh/thongke.git` (nhánh `main`) |
| **Ngôn ngữ** | HTML + Vanilla JS + CSS (không dùng framework) |

---

## 🏗 Kiến trúc & Tệp quan trọng (Đã bóc tách module)

Dự án đã được tái cấu trúc từ một file `app.js` khổng lồ sang kiến trúc module ES6 gọn nhẹ hơn:

| Tệp / Thư mục | Mô tả |
|-----|-------|
| `index.html` | Toàn bộ cấu trúc HTML chính của ứng dụng |
| `404.html` | Xử lý routing ảo cho SPA trên GitHub Pages |
| `src/core/app.js` | Logic cốt lõi: Router, State, Auth, thiết lập UI chung (~2000 dòng) |
| `src/core/crypto.js` | Mã hóa AES-256 bằng PBKDF2 + Web Crypto API |
| `src/core/sync.js` | Đồng bộ với Supabase (realtime, auth) |
| `src/features/thu-chi-doi-ngoai/thu-chi.js` | Module quản lý Thu/Chi, Biểu đồ dòng tiền, Export/Import Excel |
| `src/features/ho-so-y-te/ho-so-y-te.js` | Module quản lý Y tế, Bệnh án, Quét ảnh AI, Giọng đọc, Xuất PDF |
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

> [!CAUTION]
> **KHÔNG tự động tải lên GitHub.** Sau khi hoàn thành tính năng hoặc sửa lỗi, agent **chỉ được phép** `git add` + `git commit` (nếu người dùng yêu cầu rõ ràng). Việc `git push` lên GitHub **do người dùng tự thực hiện** trên cuộc trò chuyện riêng. Không được tự ý push code.

> [!IMPORTANT]
> **Nâng cấp phiên bản (Version Bump):** Ở MỖI LẦN chỉnh sửa mã nguồn (dù là nhỏ nhất), agent **bắt buộc** phải nâng cấp số phiên bản (ví dụ từ `v4.0.18` lên `v4.0.23`) đồng loạt trong 3 file: `version.json`, `src/core/app.js` (biến `APP_VERSION`), và `index.html` (các tham số `?v=...` ở CSS/JS/Images). Việc này là cực kỳ quan trọng để đảm bảo trình duyệt tự động xóa bộ đệm (cache) và nạp code mới nhất.

> [!IMPORTANT]
> **Cập nhật Lịch sử Phiên bản:** Cùng với việc nâng cấp version, bạn bắt buộc phải thêm dòng tóm tắt thông tin các thay đổi của phiên bản mới vào bảng "Lịch sử phiên bản gần đây" trong chính file `project_summary.md` này.

---

## 📜 Lịch sử phiên bản gần đây

| Phiên bản | Tính năng |
|-----------|-----------|
| v4.0.10 | ✅ Tối ưu giọng đọc AI (nâng giọng đọc Natural/Google, tốc độ 0.9); Thêm tùy chọn Phân tích chỉ số Huyết áp. |
| **v4.0.18** | ✅ **Tái cấu trúc (Refactoring) toàn diện:** Bóc tách file `app.js` (8000 dòng) thành các file module riêng biệt trong thư mục `src/features/` (Y tế, Thu chi). Khắc phục lỗi Import và cấu trúc lại thư mục dự án gọn gàng. |
| **v4.0.19** | ✅ **Bóc tách Thời tiết:** Di dời logic xử lý Open-Meteo API sang `src/features/thoi-tiet/thoi-tiet.js` để sẵn sàng nâng cấp. |
| **v4.0.21** | ✅ **Sửa lỗi giao diện:** Sửa lỗi popover nhập Key Gemini AI trong Hồ sơ y tế bị cắt xén (hiển thị ẩn) do thuộc tính overflow của CSS. |
| **v4.0.23** | ✅ **Sửa lỗi giao diện:** Khắc phục lỗi menu popover Gemini bị văng ra ngoài màn hình trên giao diện điện thoại (đổi `right: 0` thành `left: 0`). |
| **v4.0.24** | ✅ **Nâng cấp Quản lý thành viên & Sửa lỗi:** Thêm trường Giới tính (Nam/Nữ) và chi tiết thể trạng y tế cho thành viên; Sửa lỗi khởi tạo khiến nút "Gemini AI" và nút "Sửa" không hoạt động. |
| **v4.0.25** | ✅ **Nâng cấp Cực mạnh Cache Busting:** Áp dụng tham số truy vấn phiên bản `?v=4.0.25` cho tất cả các câu lệnh `import` mô-đun nội bộ nhằm cưỡng chế trình duyệt xóa sạch cache cũ và nạp ngay mã nguồn mới nhất. |
| **v4.0.26** | ✅ **Tinh chỉnh giao diện y tế:** Sửa lỗi tràn/đè phần tử nhập liệu Tiền sử bệnh lý lên các nút lưu của Modal thông tin thành viên; Khắc phục viền thừa (double border) trên các hộp chọn Google dịch/Tốc độ đọc; Tối ưu hóa cỡ chữ & padding cho các ô nhập liệu giúp giao diện hài hòa, cao cấp hơn. |
| **v4.0.27** | ✅ **Nâng cấp Trải nghiệm Người dùng:** Chặn cuộn nền trang (scroll lock) bằng MutationObserver khi bất kỳ modal nào đang mở; Cấu trúc lại danh sách thành viên trong Quản lý thành viên (ẩn nút 'Sửa thể trạng' khi chưa bật chế độ sửa; hiển thị nút kèm chữ rõ ràng cho 'Sao lưu' và 'Đồng bộ' khi bật sửa; xóa nút sửa tên cũ do đã tích hợp sửa tên trực tiếp trong modal chi tiết thể trạng). |
| **v4.0.28** | ✅ **Sửa lỗi đơ màn hình (Freeze Fix):** Gỡ bỏ MutationObserver trong JS để tránh vòng lặp tuần hoàn (layout loop) gây treo trình duyệt trên di động; Thay thế bằng giải pháp thuần CSS sử dụng bộ chọn giả `:has` (`body:has(.modal-overlay[style*="display: flex"])`) giúp chặn cuộn nền mượt mà, hiệu năng cao và tuyệt đối không gây đơ máy. |
| **v4.0.29** | ✅ **Nâng cấp Giao diện & Tính năng:** Chặn cuộn nền di động iOS khi vuốt ở viền modal (iOS touchmove scroll lock); Sửa lỗi căn giữa danh sách thành viên (căn lề trái thẳng hàng như Bản thân); Di chuyển nút Sao lưu, Đồng bộ, Xóa vào modal Sửa thể trạng; Nâng cấp thuật toán Sao lưu/Đồng bộ để bao gồm 100% dữ liệu (các chỉ số xét nghiệm, lịch sử huyết áp, và thông tin thể trạng). |
| **v4.0.30** | ✅ **Tối ưu hóa Bố cục Thành viên:** Căn lề trái hoàn chỉnh cho danh sách thành viên sử dụng cấu trúc Flex Row; Di chuyển nút "Xóa" trực tiếp ra ngoài danh sách khi bật chế độ Sửa; Di chuyển nút "Sao lưu" và "Đồng bộ" lên trên cùng của Modal Sửa thể trạng, bổ sung viền màu nổi bật; Loại bỏ hoàn toàn nút Xóa khỏi modal footer. |

---

## 🚀 Git & Triển khai

> [!CAUTION]
> **KHÔNG tự động đẩy lên GitHub.** AI tuyệt đối không chạy lệnh `git push`. Người dùng tự đẩy code sau. Chỉ dùng `git add` và `git commit` khi được yêu cầu.

