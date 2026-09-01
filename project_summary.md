# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.270** |
| **v4.3.270** | 🚀 **Bản Phát Hành Kiểm Thử OTA In-App Cập Nhật Đa Nền Tảng (v4.3.270)**: Phát hành bản thử nghiệm kiểm tra tính năng tải trực tiếp và tự động khởi chạy gói cài đặt trên Windows MSI, Android APK và iOS IPA. |
| **v4.3.269** | 🛠️ **Tích Hợp Cầu Nối Tauri Native HTTP Fallback Cho Bản Windows MSI (v4.3.269)**: Tự động chuyển đổi sang tauri.http.fetch khi browser fetch gặp chặn CORS / 302 cross-origin redirect từ GitHub CDN, đảm bảo tải gói cài đặt MSI ổn định tuyệt đối. |
| **v4.3.268** | 🚀 **Bản Phát Hành Kiểm Thử OTA In-App Cập Nhật Đa Nền Tảng (v4.3.268)**: Phát hành bản thử nghiệm kiểm tra tính năng tải trực tiếp và tự động khởi chạy gói cài đặt trên Windows MSI, Android APK và iOS IPA. |
| **v4.3.267** | ⚡ **Khắc Phục Lỗi tempDir & Tối Ưu Lưu/Khởi Chạy Gói Cài Đặt MSI Windows (v4.3.267)**: Tương thích hoàn hảo API tempdir / BaseDirectory.Temp của Tauri v1, đảm bảo tải trực tiếp và mở installer MSI trơn tru 100%. |
| **v4.3.266** | 🔒 **Tích Hợp Khóa Ứng Dụng Bằng Sinh Trắc Học & Hoàn Thiện Lịch Âm Rằm/Hoàng Đạo (v4.3.266)**: Thêm tính năng khóa app bằng FaceID/TouchID/Windows Hello/PIN; Sửa hiển thị ngày Rằm thành số 15 đỏ son và bổ sung thanh chú thích ý nghĩa ngày Hoàng Đạo/Hắc Đạo. |