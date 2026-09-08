# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.278** |
| **v4.3.278** | 📊 **Hệ Thống Hiển Thị Tiến Trình AI Thông Minh Đa Giai Đoạn (Smart AI Progress Stepper & Timer) (v4.3.278)**: Thay thế hoàn toàn vòng xoay tròn đơn điệu bằng bảng theo dõi tiến trình trực quan với thanh % tiến độ phát sáng tự động tăng dần, đồng hồ đếm thời gian thực (⏱️ 00:03s), danh sách từng giai đoạn bóc tách/suy luận rõ ràng (Checklist Stepper ✓), hiển thị huy hiệu mô hình Gemini 3.8 Flash và nút hủy an toàn trên toàn bộ các tính năng AI (OCR hóa đơn sửa xe, Bác sĩ xe máy AI, Tối ưu định mức MotoCare, Quét xét nghiệm y tế/huyết áp/InBody, Bác sĩ gia đình và Báo cáo tài chính Quỹ chung). |
| **v4.3.277** | 🤖 **Tích Hợp & Ưu Tiên Mặc Định Mô Hình AI Thế Hệ Mới Google Gemini 3.8 Flash (v4.3.277)**: Nâng cấp mô hình `gemini-3.8-flash` lên vị trí ưu tiên số 1 trên toàn bộ các tính năng AI trong FamiLife (Bác sĩ xe máy & OCR hóa đơn MotoCare, Bóc tách xét nghiệm/huyết áp/InBody & Bác sĩ gia đình trong Hồ sơ y tế, Cố vấn tài chính Báo cáo tháng trong Quỹ gia đình); duy trì chuỗi dự phòng fallback mượt mà (3.8 -> 3.7 -> 3.6 -> 2.5 -> 2.0). |
| **v4.3.276** | ⚡ **Khắc Phục Lỗi Cú Pháp SyntaxError Trong db.js Gây Treo Ứng Dụng Khởi Động (v4.3.276)**: Escape đúng các ký tự backtick bên trong chuỗi template literal hướng dẫn định dạng JSON của Gemini AI trong db.js, khắc phục hoàn toàn lỗi Unexpected identifier 'json' (ERR-101) giúp ứng dụng nạp mượt mà. |
| **v4.3.275** | 📱 **Khắc Phục Lỗi Nền Đen Khi Cuộn Nảy (Bounce/Overscroll) Trên iOS Trong MotoCare (v4.3.275)**: Sửa triệt để hiện tượng lộ nền đen WKWebView khi cuộn kéo vượt đỉnh trang ở card Chăm sóc xe; loại bỏ thuộc tính body transparent mặc định và bổ sung active-tab-motocare vào bộ quy tắc gán màu nền đồng nhất (#f3f4f6 light / #090d16 dark) cho html và body trên toàn hệ thống. |
| **v4.3.274** | 🏍️ **Bổ Sung Hạng Mục Theo Dõi Dầu Giảm Xóc (Phuộc Nhún) Trong MotoCare (v4.3.274)**: Thêm preset định mức bảo dưỡng 20.000 Km / 24 tháng cho phuộc nhún xe máy, tự động tính toán vòng tròn tiến trình hao mòn ODO/thời gian, tích hợp vào checklist bảo dưỡng hàng loạt, bộ lọc lịch sử và mô hình nhận diện Gemini AI OCR hóa đơn sửa xe. |