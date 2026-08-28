# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.236** |
| **v4.3.236** | 🎨 **Ẩn/Hiện Chế Độ Sửa Định Mức Bảo Dưỡng Bằng Nút "Thay Đổi" (v4.3.236)**: Ẩn các nút "Thay đổi" từng dòng và nút "Tối ưu bằng AI" ở chế độ xem mặc định của phần Định mức bảo dưỡng xe; Thay bằng 1 nút *"Thay đổi"* ở tiêu đề, khi bấm vào sẽ hiển thị đầy đủ nút "Tối ưu bằng AI" và các nút thay đổi từng phụ tùng để người dùng thao tác. |
| **v4.3.235** | 🎛️ **Ẩn Mặc Định Thẻ "Chăm Sóc Xe" & Bật/Tắt Linh Hoạt Trong Cài Đặt (v4.3.235)**: Thiết lập ẩn thẻ Chăm sóc xe mặc định ở trang chủ chính. Thêm công tắc *"Hiển thị thẻ 'Chăm sóc xe' ở trang chủ chính"* trong Cài đặt -> Tùy chỉnh chức năng, hỗ trợ lưu trạng thái cục bộ, mã hóa E2EE và tự động đồng bộ thời gian thực đa thiết bị. |
| **v4.3.234** | 🎯 **Sửa Lỗi Ghi Đè Đồng Bộ Định Mức Bảo Dưỡng AI & Lưu Batch 1 Lần (v4.3.234)**: Bổ sung phương thức `Presets.saveAllForVehicle` lưu hàng loạt định mức AI trong 1 giao dịch duy nhất, đồng thời sửa logic hợp nhất đồng bộ trên đám mây (`performSync`) để ưu tiên giữ lại các định mức mới sửa tại máy cục bộ, ngăn chặn tình trạng định mức vừa áp dụng bị dữ liệu đám mây cũ ghi đè ngược lại. |
| **v4.3.233** | 🐛 **Khắc Phục Lỗi Duplicate Export Trong Module MotoCare (v4.3.233)**: Chuẩn hóa câu lệnh export cho hàm `initMotoCare` trong file `motocare.js`, triệt tiêu hoàn toàn lỗi cú pháp JavaScript ES Modules `Duplicate export of 'initMotoCare'` khi trình duyệt nạp module. |
| **v4.3.232** | 🧹 **Tối Ưu Khởi Tạo Module MotoCare & Dọn Dẹp Cảnh Báo Console (v4.3.232)**: Loại bỏ khối code tự động chạy sớm không cần thiết ở cấp độ module `motocare.js`, để router của `app.js` toàn quyền quản lý vòng đời khởi tạo chính xác khi chuyển tab `#chamsocxe`, loại bỏ hoàn toàn thông báo lỗi console `[MotoCare Auto Init Error]`. |