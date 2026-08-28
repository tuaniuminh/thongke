# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.205** |
| **v4.3.205** | ✅ **Khắc Phục Lỗi Hiển Thị Subview & Tối Ưu Cuộn Trang Cho WeLove (v4.3.205)**: Sửa thuộc tính `overflow` và `justify-content` của `.memory-page` trong `we-love.css` từ `center / hidden` sang `flex-start / visible`, loại bỏ hiện tượng nội dung form Thiết lập và Lời nhắc bị đẩy lệch khỏi viewport và không cuộn được trên di động. Đồng bộ logic kiểm tra quyền chỉnh sửa `canEdit` và fallback subview trong Mobile Navbar. |
| **v4.3.204** | ✅ **Khắc Phục Lỗi Trắng Màn Hình & Tối Ưu Giao Diện Di Động Cho Card Chăm Sóc Xe (v4.3.204)**: Sửa lỗi thẻ `<section id="tab-motocare">` bị đặt nhầm bên ngoài thẻ `<main class="main-content">` dẫn đến toàn bộ nội dung bị đẩy xuống dưới viewport tạo khoảng trắng toàn màn hình trên điện thoại. Bổ sung class `.two-line` cho thanh Mobile Navbar giúp hiển thị đầy đủ 4 tab chức năng (Tổng quan, Đổ xăng, Lịch sử, Cài đặt) và đồng bộ trạng thái active mượt mà. Ẩn thanh subnav trùng lặp trên thiết bị di động. |
| **v4.3.203** | ✅ **Mã Hóa Đầu Cuối (E2EE) & Đồng Bộ Đám Mây Tự Động Cho MotoCare (v4.3.203)**: Tích hợp toàn diện dữ liệu Chăm Sóc Xe (thông tin xe, ODO, nhật ký đổ xăng, lịch sử bảo dưỡng, định mức chu kỳ) vào hệ sinh thái mã hóa AES-256 E2EE của FamiLife. Dữ liệu được lưu trữ mã hóa cục bộ trong `gift_ledger_db` bằng Master PIN và tự động đồng bộ thời gian thực qua Supabase giống các sổ khác. Xóa bỏ hoàn toàn tính năng sao lưu/phục hồi thủ công (JSON export/import) trong card MotoCare, chuyển sang cơ chế tự động đồng bộ hóa toàn diện. |
| **v4.3.202** | ✅ **Tích hợp MotoCare - Chăm Sóc Xe Máy vào FamiLife (v4.3.202)**: Tích hợp hoàn toàn ứng dụng MotoCare thành module nội bộ của FamiLife theo kiến trúc tab-panel (không dùng iframe). Tạo 4 module JS (`presets.js`, `db.js`, `ui.js`, `motocare.js`) trong `src/features/motocare/`, CSS scoped trong `motocare.css`. Thêm card "Chăm sóc xe" trên trang chủ, nav item sidebar, sub-navigation nội bộ với 4 view (Tổng quan, Đổ xăng, Lịch sử, Cài đặt). Tất cả ID DOM được prefixed bằng `mc-`. Gemini AI tích hợp fallback từ FamiLife. |
| **v4.3.201** | ✅ **Khắc Phục Lỗi Đè Lên Status Bar Trên Điện Thoại (WeLove & Hồ Sơ Y Tế) (v4.3.201)**: Đặt giới hạn `@media (min-width: 769px)` cho các quy tắc điều chỉnh `top-header` và `padding-top` của Desktop. Giúp thanh tiêu đề trên điện thoại (PWA / iOS / Android) tự động thụt vào đúng vị trí an toàn (`env(safe-area-inset-top)`), không còn bị kéo sát mép trên hay đè lên đồng hồ / biểu tượng mạng của hệ thống. |