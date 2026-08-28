# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.238** |
| **v4.3.238** | ✏️ **Chế Độ Chỉnh Sửa & Nút Sửa/Xóa Cho Lịch Sử Bảo Dưỡng (v4.3.238)**: Bổ sung nút *"Chỉnh sửa"* ở tiêu đề Lịch sử bảo dưỡng; Ẩn các thao tác ở chế độ xem mặc định và chỉ hiển thị nút Sửa/Xóa khi bấm Chỉnh sửa; Hỗ trợ mở modal chỉnh sửa toàn diện thông tin bảo dưỡng và lưu cập nhật thời gian thực. |
| **v4.3.237** | 🧹 **Dọn Dẹp Cài Đặt MotoCare, Sửa Active Nav "Quản Lý" & Chuẩn Hóa Responsive Bảng Mobile (v4.3.237)**: Xóa 2 thẻ không cần thiết "Đồng bộ & Bảo mật E2EE" và "Khu vực nguy hiểm"; Sửa lỗi nút subnav "Quản lý" không sáng khung active trên mobile; Bổ sung thuộc tính `data-label` cho toàn bộ các cột bảng Đổ xăng và Lịch sử bảo dưỡng để hiển thị dạng thẻ responsive chuẩn đẹp trên điện thoại. |
| **v4.3.236** | 🎨 **Ẩn/Hiện Chế Độ Sửa Định Mức Bảo Dưỡng Bằng Nút "Thay Đổi" (v4.3.236)**: Ẩn các nút "Thay đổi" từng dòng và nút "Tối ưu bằng AI" ở chế độ xem mặc định của phần Định mức bảo dưỡng xe; Thay bằng 1 nút *"Thay đổi"* ở tiêu đề, khi bấm vào sẽ hiển thị đầy đủ nút "Tối ưu bằng AI" và các nút thay đổi từng phụ tùng để người dùng thao tác. |
| **v4.3.235** | 🎛️ **Ẩn Mặc Định Thẻ "Chăm Sóc Xe" & Bật/Tắt Linh Hoạt Trong Cài Đặt (v4.3.235)**: Thiết lập ẩn thẻ Chăm sóc xe mặc định ở trang chủ chính. Thêm công tắc *"Hiển thị thẻ 'Chăm sóc xe' ở trang chủ chính"* trong Cài đặt -> Tùy chỉnh chức năng, hỗ trợ lưu trạng thái cục bộ, mã hóa E2EE và tự động đồng bộ thời gian thực đa thiết bị. |
| **v4.3.234** | 🎯 **Sửa Lỗi Ghi Đè Đồng Bộ Định Mức Bảo Dưỡng AI & Lưu Batch 1 Lần (v4.3.234)**: Bổ sung phương thức `Presets.saveAllForVehicle` lưu hàng loạt định mức AI trong 1 giao dịch duy nhất, đồng thời sửa logic hợp nhất đồng bộ trên đám mây (`performSync`) để ưu tiên giữ lại các định mức mới sửa tại máy cục bộ, ngăn chặn tình trạng định mức vừa áp dụng bị dữ liệu đám mây cũ ghi đè ngược lại. |