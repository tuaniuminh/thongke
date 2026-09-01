# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.263** |
| **v4.3.263** | 🪟 **Mở Rộng Phạm Vi HTTP Scope Cho Tauri Windows MSI Installer (v4.3.263)**: Khai báo đầy đủ HTTP scope trong tauri.conf.json và ưu tiên fetch chuẩn để kiểm tra GitHub Releases API mượt mà trên bản cài đặt Windows MSI. |
| **v4.3.262** | 🛠️ **Khắc Phục Triệt Để Lỗi DataCloneError & Đồng Bộ Trực Tiếp CustomEvent Tiến Trình Tải File (v4.3.262)**: Dispatch CustomEvent trực tiếp từ WKWebView/WebView của iOS/Android lên window; Loại bỏ cap.addListener gây DataCloneError giúp thanh tiến trình % và tốc độ cập nhật mượt mà. |
| **v4.3.261** | 🚀 **Tự Động Cập Nhật Trực Tiếp Cho Bản PWA / Web (In-App PWA Cache Busting v4.3.261)**: Thay vì chuyển hướng ra GitHub, bản PWA khi bấm Cập nhật ngay sẽ tự động dọn dẹp Cache Storage, unregister Service Worker cũ và nạp lại trang với phiên bản mới nhất ngay lập tức. |
| **v4.3.260** | ⚡ **Tối Ưu Đồng Bộ Sự Kiện Tiến Trình Tải File Trên Main Queue & WebKit UI (v4.3.260)**: Chuyển toàn bộ delegate URLSession và notifyListeners sang Main Queue giúp WebKit nhận % tiến trình và tốc độ MB/s mượt mà theo thời gian thực. |
| **v4.3.259** | 🚀 **Bản Phát Hành Kiểm Thử OTA In-App Cập Nhật Đa Nền Tảng (v4.3.259)**: Phát hành bản thử nghiệm kiểm tra tính năng tải trực tiếp và gỡ lỗi log Capacitor Native Bridge. |