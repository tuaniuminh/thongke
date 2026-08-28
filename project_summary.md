# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.208** |
| **v4.3.208** | ✅ **Sửa Triệt Để Lỗi Thoát Về Trang Chủ Khi Cuộn Trang Trong Card Chăm Sóc Xe (v4.3.208)**: Phát hiện nguyên nhân từ file log: hash `#chamsocxe` / `#motocare` chưa được khai báo trong `tabHashMapping` và `tabIdToHash`, khiến bộ định tuyến `handleHashRoute` không nhận diện được route và tự động fallback về `#trangchu`. Đã đăng ký đầy đủ ánh xạ hash route cho MotoCare giúp người dùng cuộn trang và tương tác ổn định tuyệt đối. |
| **v4.3.207** | ✅ **Tích Hợp Đầy Đủ 4 Tab Điều Hướng Cho Desktop Sidebar Card Chăm Sóc Xe (v4.3.207)**: Thêm 4 mục chuyển view (*Tổng quan, Đổ xăng, Lịch sử, Cài đặt*) vào Sidebar máy tính khi mở card MotoCare, đồng bộ đăng ký trong `CARD_NAV_REGISTRY` và xử lý chuyển view `switchMotocareView` mượt mà khi người dùng click vào từng tab trên cả máy tính lẫn điện thoại. |
| **v4.3.206** | ✅ **Xóa Tab Trùng Lặp & Khắc Phục Triệt Để Khoảng Trắng Trên Giao Diện Chăm Sóc Xe (v4.3.206)**: Loại bỏ hoàn toàn thanh `motocare-subnav` trong phần nội dung vì các tab chuyển view đã có sẵn trên Mobile Navbar và Sidebar. Bổ sung style fixed toàn màn hình cho modal overlay (`.mc-modal-overlay`), cố định kích thước biểu tượng Bác sĩ AI (24px), ẩn `top-header` rỗng khi mở card Chăm Sóc Xe và nâng cấp debug log `[BUG DETECTOR]` khi chuyển đổi view. |
| **v4.3.205** | ✅ **Khắc Phục Lỗi Hiển Thị Subview & Tối Ưu Cuộn Trang Cho WeLove (v4.3.205)**: Sửa thuộc tính `overflow` và `justify-content` của `.memory-page` trong `we-love.css` từ `center / hidden` sang `flex-start / visible`, loại bỏ hiện tượng nội dung form Thiết lập và Lời nhắc bị đẩy lệch khỏi viewport và không cuộn được trên di động. Đồng bộ logic kiểm tra quyền chỉnh sửa `canEdit` và fallback subview trong Mobile Navbar. |
| **v4.3.204** | ✅ **Khắc Phục Lỗi Trắng Màn Hình & Tối Ưu Giao Diện Di Động Cho Card Chăm Sóc Xe (v4.3.204)**: Sửa lỗi thẻ `<section id="tab-motocare">` bị đặt nhầm bên ngoài thẻ `<main class="main-content">` dẫn đến toàn bộ nội dung bị đẩy xuống dưới viewport tạo khoảng trắng toàn màn hình trên điện thoại. Bổ sung class `.two-line` cho thanh Mobile Navbar giúp hiển thị đầy đủ 4 tab chức năng (Tổng quan, Đổ xăng, Lịch sử, Cài đặt) và đồng bộ trạng thái active mượt mà. Ẩn thanh subnav trùng lặp trên thiết bị di động. |