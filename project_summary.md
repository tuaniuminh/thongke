# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.202** |
| **v4.3.202** | ✅ **Tích hợp MotoCare - Chăm Sóc Xe Máy vào FamiLife (v4.3.202)**: Tích hợp hoàn toàn ứng dụng MotoCare thành module nội bộ của FamiLife theo kiến trúc tab-panel (không dùng iframe). Tạo 4 module JS (`presets.js`, `db.js`, `ui.js`, `motocare.js`) trong `src/features/motocare/`, CSS scoped trong `motocare.css`. Thêm card "Chăm sóc xe" trên trang chủ, nav item sidebar, sub-navigation nội bộ với 4 view (Tổng quan, Đổ xăng, Lịch sử, Cài đặt). Tất cả ID DOM được prefixed bằng `mc-`. Gemini AI tích hợp fallback từ FamiLife. |
| **v4.3.201** | ✅ **Khắc Phục Lỗi Đè Lên Status Bar Trên Điện Thoại (WeLove & Hồ Sơ Y Tế) (v4.3.201)**: Đặt giới hạn `@media (min-width: 769px)` cho các quy tắc điều chỉnh `top-header` và `padding-top` của Desktop. Giúp thanh tiêu đề trên điện thoại (PWA / iOS / Android) tự động thụt vào đúng vị trí an toàn (`env(safe-area-inset-top)`), không còn bị kéo sát mép trên hay đè lên đồng hồ / biểu tượng mạng của hệ thống. |
| **v4.3.200** | ✅ **Sửa Triệt Để Lỗi Xóa onclick Trên Thẻ Trang Chủ & Nâng Cấp BUG DETECTOR (v4.3.200)**: Phát hiện nguyên nhân gốc rễ: hàm `updateHomeLayoutUI` trong `thu-chi.js` vô tình thực thi `card.onclick = null` đối với các thẻ card trên trang chủ. Đã loại bỏ hoàn toàn đoạn mã này, đồng thời gắn listener trực tiếp từ `app.js` kèm log `[BUG DETECTOR]` khi người dùng bấm vào từng card. |
| **v4.3.199** | ✅ **Kích Hoạt switchTab Trực Tiếp Cho Thẻ Trang Chủ (v4.3.199)**: Chuyển toàn bộ các thẻ card Thu Chi, Hồ Sơ Y Tế, Quỹ Gia Đình trên trang chủ sang gọi trực tiếp `switchTab('...')` (đồng nhất tuyệt đối với WeLove và Cài Đặt), xuất `window.switchTab` ngay khi hàm được khởi tạo để đảm bảo phản hồi ngay lập tức khi bấm vào bất kỳ card nào từ trang chủ. |
| **v4.3.198** | ✅ **Đồng Bộ Điều Hướng Trực Tiếp Bằng navigateToTab & Khử Triệt Để Nhấp Nháy Tab Trang Chủ (v4.3.198)**: Chuyển toàn bộ các thẻ card trên trang chủ (Thu chi đối ngoại, Hồ sơ y tế, Quỹ gia đình) từ thẻ liên kết anchor sang cơ chế gọi hàm trực tiếp `window.navigateToTab(...)` tương tự WeLove và Cài Đặt, loại bỏ độ trễ và nhấp nháy chuyển trạng thái hash của trình duyệt. Khóa vĩnh viễn nút "Trang chủ" khỏi việc nhận class `.active` khi điều hướng, giúp giao diện tab hiển thị tức thì, mượt mà và không còn hiện tượng nhảy active sang Trang chủ. |