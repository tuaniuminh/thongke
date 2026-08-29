# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.248** |
| **v4.3.248** | 🔍 **Hiển Thị Trực Quan Tên Mô Hình Gemini AI Trên Toàn Ứng Dụng (v4.3.248)**: Bổ sung huy hiệu và thông báo hiển thị chính xác phiên bản Gemini AI đang được sử dụng (ví dụ: *Gemini 3.7 Flash*, *Gemini 3.6 Flash*, *Gemini 2.5 Flash*) trên tất cả các tính năng: quét ảnh y tế/InBody/huyết áp, báo cáo sức khỏe Markdown, nhận xét tài chính Quỹ gia đình, chẩn đoán Bác sĩ Xe MotoCare và tạo định mức bảo dưỡng. |
| **v4.3.247** | 🤖 **Nâng Cấp Hệ Thống Model Gemini AI & Loại Bỏ Model Cũ (v4.3.247)**: Loại bỏ hoàn toàn `gemini-1.5-flash` và `gemini-3.5-flash` khỏi hệ thống; Bổ sung `gemini-3.7-flash` và `gemini-3.6-flash` vào chuỗi fallback đa phương thức cho tính năng quét ảnh y tế/chỉ số cơ thể InBody, đảm bảo tốc độ phân tích siêu nhanh và tương thích hoàn hảo với Google AI Studio. |
| **v4.3.246** | 🏷️ **Loại Bỏ Emoji Xe Máy Khỏi Tiêu Đề Header Mobile Cho Chăm Sóc Xe (v4.3.246)**: Xóa biểu tượng `🏍️` trên thanh tiêu đề `Chăm Sóc Xe` ở navbar mobile và desktop header, giúp tiêu đề sạch sẽ, trang nhã và đồng bộ với các tab khác của FamiLife. |
| **v4.3.245** | 📱 **Đồng Bộ Bố Cục Tiêu Đề Dàn Ngang Toàn Diện Cho Tất Cả Tab MotoCare (v4.3.245)**: Áp dụng chuẩn thiết kế tiêu đề dàn ngang 1 dòng và đưa các nút chức năng xuống dòng dưới cho cả tab Đổ xăng ("Nhật ký tiêu thụ xăng") và tab Quản lý ("Quản lý Chăm Sóc Xe", "Định mức bảo dưỡng"), tạo sự nhất quán, thoáng đãng và dễ thao tác trên điện thoại. |
| **v4.3.244** | 📱 **Tối Ưu Tiêu Đề Dàn Ngang & Chuẩn Hóa Bảng Báo Cáo Mobile Cho MotoCare (v4.3.244)**: Chuyển tiêu đề *"Lịch sử bảo dưỡng & sửa chữa"* hiển thị trọn vẹn 1 hàng ngang trên điện thoại, đưa 2 nút "Chỉnh sửa" & "Thêm bảo dưỡng" xuống dòng dưới; Cấu hình bảng lịch sử hiển thị dạng bảng tính (Table view) chuẩn đẹp như trên máy tính thay vì dạng thẻ dọc. |