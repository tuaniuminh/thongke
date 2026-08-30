# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.251** |
| **v4.3.251** | ⚡ **Tối Ưu Hóa & Hiện Đại Hóa GitHub Actions Workflows (v4.3.251)**: Chuyển đổi toàn bộ các GitHub Actions chính thức sang nhánh `@main` (`actions/checkout`, `actions/setup-java`, `actions/upload-artifact`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) và loại bỏ bước `actions/setup-node` thừa trên các runners; triệt tiêu cảnh báo Node.js 20 deprecation trên CI/CD. |
| **v4.3.250** | 🚀 **Quét Hóa Đơn Sửa Xe Bằng AI Trong MotoCare & Sổ Tiêm Chủng - Lịch Khám Định Kỳ (v4.3.250)**: Bổ sung tính năng quét bóc tách hóa đơn / phiếu bảo dưỡng xe máy HEAD bằng Gemini AI tự động điền phụ tùng và chi phí; Ra mắt phân hệ Sổ Tiêm Chủng Điện Tử & Nhắc Lịch Khám Định Kỳ chuyên nghiệp trong Hồ Sơ Y Tế kèm đếm ngược ngày hẹn, phân loại vaccine và hỗ trợ quét AI phiếu tiêm chủng. |
| **v4.3.249** | 🛠️ **Sửa Lỗi Duplicate Export Trong app.js (v4.3.249)**: Xóa khai báo trùng lặp `formatGeminiModelName` ở lệnh `export { ... }` cuối file `src/core/app.js`, loại bỏ triệt để lỗi SyntaxError [ERR-101] và đảm bảo các module import hoạt động hoàn hảo. |
| **v4.3.248** | 🔍 **Hiển Thị Trực Quan Tên Mô Hình Gemini AI Trên Toàn Ứng Dụng (v4.3.248)**: Bổ sung huy hiệu và thông báo hiển thị chính xác phiên bản Gemini AI đang được sử dụng (ví dụ: *Gemini 3.7 Flash*, *Gemini 3.6 Flash*, *Gemini 2.5 Flash*) trên tất cả các tính năng: quét ảnh y tế/InBody/huyết áp, báo cáo sức khỏe Markdown, nhận xét tài chính Quỹ gia đình, chẩn đoán Bác sĩ Xe MotoCare và tạo định mức bảo dưỡng. |
| **v4.3.247** | 🤖 **Nâng Cấp Hệ Thống Model Gemini AI & Loại Bỏ Model Cũ (v4.3.247)**: Loại bỏ hoàn toàn `gemini-1.5-flash` và `gemini-3.5-flash` khỏi hệ thống; Bổ sung `gemini-3.7-flash` và `gemini-3.6-flash` vào chuỗi fallback đa phương thức cho tính năng quét ảnh y tế/chỉ số cơ thể InBody, đảm bảo tốc độ phân tích siêu nhanh và tương thích hoàn hảo với Google AI Studio. |