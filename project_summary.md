# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.267** |
| **v4.3.267** | ⚡ **Khắc Phục Lỗi tempDir & Tối Ưu Lưu/Khởi Chạy Gói Cài Đặt MSI Windows (v4.3.267)**: Tương thích hoàn hảo API tempdir / BaseDirectory.Temp của Tauri v1, đảm bảo tải trực tiếp và mở installer MSI trơn tru 100%. |
| **v4.3.266** | 🔒 **Tích Hợp Khóa Ứng Dụng Bằng Sinh Trắc Học & Hoàn Thiện Lịch Âm Rằm/Hoàng Đạo (v4.3.266)**: Thêm tính năng khóa app bằng FaceID/TouchID/Windows Hello/PIN; Sửa hiển thị ngày Rằm thành số 15 đỏ son và bổ sung thanh chú thích ý nghĩa ngày Hoàng Đạo/Hắc Đạo. |
| **v4.3.265** | 🛠️ **Cấp Quyền fs.all & Mở Rộng Scope Cho Tauri Windows MSI Installer (v4.3.265)**: Kích hoạt fs.all và writeBinaryFile trong tauri.conf.json, bổ sung fallback BaseDirectory.Temp giúp tải và ghi file cài đặt MSI an toàn. |
| **v4.3.264** | 🎨 **Đồng Bộ Logo Thanh Tiêu Đề Desktop Windows Theo Theme Sáng/Tối (v4.3.264)**: Tự động hoán đổi icon-light.png và icon.png trên thanh tiêu đề tùy biến Desktop Tauri, đảm bảo tính thẩm mỹ hoàn hảo khi ở giao diện sáng. |
| **v4.3.263** | 🪟 **Mở Rộng Phạm Vi HTTP Scope Cho Tauri Windows MSI Installer (v4.3.263)**: Khai báo đầy đủ HTTP scope trong tauri.conf.json và ưu tiên fetch chuẩn để kiểm tra GitHub Releases API mượt mà trên bản cài đặt Windows MSI. |