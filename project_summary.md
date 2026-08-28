# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.243** |
| **v4.3.243** | 🎯 **Tách Biệt Ghi Nhận Đa Hạng Mục (Batch Checklist) & Ghi Nhận Riêng Từng Phụ Tùng (Single Mode) (v4.3.243)**: Tối ưu trải nghiệm: Khi bấm nút "Bảo dưỡng" chung sẽ mở Checklist để tick chọn nhiều mục; Khi bấm nút "Thay phụ tùng" ở từng thẻ phụ tùng cụ thể dưới Dashboard sẽ chỉ mở form ghi nhận riêng đúng mục đó. |
| **v4.3.242** | 🔋 **Bổ Sung Hạng Mục "Bình Ắc Quy Xe Máy" (v4.3.242)**: Thêm hạng mục định mức *"Bình ắc quy"* (`battery`) với chu kỳ chuẩn 25.000 Km / 24 tháng; Tích hợp đầy đủ vào thẻ đo hao mòn Dashboard, checklist ghi nhận bảo dưỡng nhanh, bộ lọc lịch sử và thuật toán AI. |
| **v4.3.241** | ⚡ **Ghi Nhận Bảo Dưỡng Hàng Loạt Bằng Checklist Tick Chọn (v4.3.241)**: Nâng cấp biểu mẫu ghi nhận bảo dưỡng thành dạng Checklist thông minh; Cho phép người dùng tick chọn nhiều hạng mục bảo dưỡng/thay thế phụ tùng cùng một lúc, tự động điền chi phí từng món, tính tổng tiền hóa đơn và lưu toàn bộ chỉ trong 1 lần nhấn duy nhất. |
| **v4.3.240** | 🔧 **Bổ Sung Hạng Mục "Bảo Dưỡng Toàn Bộ Xe" (v4.3.240)**: Thêm hạng mục định mức *"Bảo dưỡng toàn bộ xe"* (`full_service`) với chu kỳ chuẩn 10.000 Km / 12 tháng (gói bảo dưỡng tổng thể HEAD/hãng); Tích hợp vào thẻ đo hao mòn Dashboard, bảng Thêm/Sửa bảo dưỡng, bộ lọc và thuật toán Gemini AI. |
| **v4.3.239** | 🏍️ **Tách Hạng Mục Má Phanh Trước & Má Phanh Sau (v4.3.239)**: Phân tách rõ ràng hạng mục má phanh chung thành 2 mục riêng biệt *"Má phanh trước"* (`brake_front`) và *"Má phanh sau"* (`brake_rear`) trong toàn bộ hệ thống định mức bảo dưỡng, bộ lọc lịch sử, bảng thêm/sửa bảo dưỡng và thuật toán tối ưu AI. |