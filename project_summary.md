# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.260** |
| **v4.3.260** | ⚡ **Tối Ưu Đồng Bộ Sự Kiện Tiến Trình Tải File Trên Main Queue & WebKit UI (v4.3.260)**: Chuyển toàn bộ delegate URLSession và notifyListeners sang Main Queue giúp WebKit nhận % tiến trình và tốc độ MB/s mượt mà theo thời gian thực. |
| **v4.3.259** | 🚀 **Bản Phát Hành Kiểm Thử OTA In-App Cập Nhật Đa Nền Tảng (v4.3.259)**: Phát hành bản thử nghiệm kiểm tra tính năng tải trực tiếp và gỡ lỗi log Capacitor Native Bridge. |
| **v4.3.258** | 🐞 **Nâng Cấp Hệ Thống Debug Log [BUG DETECTOR] & Cơ Chế Đa Cầu Nối Capacitor Native Bridge (v4.3.258)**: Tích hợp hàm callNativeCapacitorPlugin hỗ trợ 4 cơ chế gọi plugin song song (registerPlugin, Plugins object, nativePromise, toNative) kèm nhật ký vết chi tiết giúp gỡ lỗi và kích hoạt tải trực tiếp trên iOS và Android. |
| **v4.3.257** | 🚀 **Phát Hành Bản Thử Nghiệm Kiểm Tra Cập Nhật Đa Nền Tảng OTA (v4.3.257)**: Bản phát hành kiểm thử toàn diện cập nhật trực tiếp trong ứng dụng cho iOS (IPA TrollStore), Android (APK) và Windows (MSI). |
| **v4.3.256** | ⚡ **Khắc Phục Lỗi Build Android Debug APK, Sửa Lỗi Layout Nút Phiên Bản & Tối Ưu Native Swift (v4.3.256)**: Sửa lỗi ngoại lệ IOException trong AppUpdatePlugin.java giúp build Android APK thành công 100%; Sửa lỗi CSS position của nút phiên bản để luôn giữ đúng vị trí góc trên và không bị xuống dòng; Tinh chỉnh nhúng LiveActivityPlugin vào AppDelegate.swift cho iOS. |