# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.256** |
| **v4.3.256** | ⚡ **Khắc Phục Lỗi Build Android Debug APK, Sửa Lỗi Layout Nút Phiên Bản & Tối Ưu Native Swift (v4.3.256)**: Sửa lỗi ngoại lệ IOException trong AppUpdatePlugin.java giúp build Android APK thành công 100%; Sửa lỗi CSS position của nút phiên bản để luôn giữ đúng vị trí góc trên và không bị xuống dòng; Tinh chỉnh nhúng LiveActivityPlugin vào AppDelegate.swift cho iOS. |
| **v4.3.255** | 🛠️ **Sửa Lỗi Đồng Bộ Package Android APK & Tự Động Xuất Bản GitHub Releases (v4.3.255)**: Cấu hình đúng namespace package vn.familife.thongke cho AppUpdatePlugin và FileProvider; Bổ sung script update-android-config.py tự động đồng bộ mã phiên bản và quyền cài đặt APK trong AndroidManifest. |
| **v4.3.254** | 🎨 **Hoàn Thiện Giao Diện Sáng/Tối In-App Updater, Đèn Báo Cập Nhật & Fix Native iOS Share Sheet (v4.3.254)**: Thiết kế lại Modal cập nhật chuẩn theme Sáng/Tối theo biến CSS hệ thống; Loại bỏ hoàn toàn toast thông báo ngầm và thay bằng dấu chấm đỏ nhấp nháy trên nút số phiên bản khi có bản mới; Nhúng Native Swift Plugin vào AppDelegate để tải trực tiếp trên iOS và mở TrollStore Share Sheet. |
| **v4.3.253** | 🚀 **Phát Hành Bản Thử Nghiệm Kiểm Tra Cập Nhật Trực Tiếp Trong Ứng Dụng (In-App OTA Updater v4.3.253)**: Bản phát hành phục vụ kiểm thử tính năng tự động phát hiện bản mới, tải ngầm có thanh tiến trình %/tốc độ MB/s và kích hoạt cài đặt trên iOS (IPA), Android (APK), Windows (MSI). |
| **v4.3.252** | 🚀 **Tích Hợp Hệ Thống Tự Động Xuất Bản GitHub Releases CI/CD & In-App OTA Updater Đa Nền Tảng (v4.3.252)**: Triển khai In-App OTA Updater hiện đại hỗ trợ đầy đủ IPA (iOS qua Native Swift Plugin mở Share Sheet/TrollStore), APK (Android qua Package Installer), MSI (Windows qua Tauri FS/HTTP có thanh tiến trình % và tốc độ MB/s); Tự động xuất bản Release Assets lên GitHub Releases khi git push. |