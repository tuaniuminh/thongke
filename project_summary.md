# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.214** |
| **v4.3.214** | ✅ **Khắc Phục Triệt Để Lỗi Bị Nhảy Về Tab Tổng Quan Khi Đang Ở Cài Đặt / Đổ Xăng (v4.3.214)**: Sửa logic trong `switchTab` khi chạy từ đồng bộ ngầm hoặc kiểm tra hash route `#chamsocxe`. Không còn tự động gán `targetMotocareSubView = dashboard` khi card MotoCare đang hiển thị, duy trì tuyệt đối vị trí view người dùng đang xem (`window._currentMotocareView`) kể cả khi có tiến trình đồng bộ dữ liệu Realtime. |
| **v4.3.213** | ✅ **Chuyển Đổi Hoàn Toàn 5 Modal MotoCare Sang Kiến Trúc Modal Gốc FamiLife (v4.3.213)**: Tái cấu trúc toàn bộ 5 modal sang kiến trúc chuẩn (`.modal-overlay`, `.modal-container`, `.form-input`, `.form-select`, `.modal-footer`, `.btn-primary`, `.btn-outline`), tích hợp đóng modal khi nhấp ra ngoài nền mờ (Backdrop click), đảm bảo 100% đồng nhất giao diện và màu sắc cả chế độ Sáng/Tối mà không phụ thuộc vào cache CSS riêng. |
| **v4.3.212** | ✅ **Chuẩn Hóa Toàn Bộ Giao Diện Modal Overlay & Form Nhập Liệu MotoCare (v4.3.212)**: Bổ sung bộ quy tắc CSS độc lập đầy đủ cho `.mc-modal-overlay` bao gồm nền card thẻ trắng/tối (`var(--bg-secondary)`), viền trên xanh cyan nổi bật, hiệu ứng đổ bóng 45px và scale-in mượt mà, định dạng input/select chuẩn giao diện, nút bấm bo góc hiện đại và căn giữa màn hình hoàn hảo trên cả điện thoại lẫn máy tính. |
| **v4.3.211** | ✅ **Sửa Triệt Để Lỗi Null Check Xe Máy & Cố Định Modal Overlay MotoCare Ra Cấp Body (v4.3.211)**: Khắc phục lỗi runtime `TypeError: Cannot read properties of null (reading name)` khi click Thay dầu nhanh lúc chưa chọn xe. Di chuyển toàn bộ 5 modal của MotoCare ra khỏi thẻ section nội dung xuống cấp body cố định (`position: fixed; z-index: 100000`), bổ sung logic mở/đóng modal tiêu chuẩn và tự động nhắc nhở thêm xe mới khi người dùng click Đổ xăng/Bảo dưỡng. |
| **v4.3.210** | ✅ **Sửa Triệt Để Lỗi Thừa Thẻ Đóng HTML & Đồng Bộ Hóa Module Imports (v4.3.210)**: Dùng bộ phân tích cây DOM phát hiện và loại bỏ thẻ đóng thừa `</div>` tại dòng 1776 và cuối file `index.html` làm vỡ cấu trúc `<main>` của toàn bộ các card phía dưới. Đồng thời cập nhật đồng loạt chuỗi phiên bản `?v=4.3.210` tại tất cả các câu lệnh `import` của các module JS (`we-love.js`, `ho-so-y-te.js`, `quy-gia-dinh.js`, `ket-noi.js`), loại bỏ hoàn toàn tình trạng nạp 2 phiên bản `state` song song gây trắng màn hình. |