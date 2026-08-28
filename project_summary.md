# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.224** |
| **v4.3.224** | ✨ **Tối Ưu Định Mức Bảo Dưỡng Riêng Biệt Cho Từng Mẫu Xe Qua Gemini AI (v4.3.224)**: Ra mắt tính năng "Tối ưu bằng AI" trong mục Định mức bảo dưỡng. AI tự động nhận diện chính xác dòng xe, động cơ và phân tích điều kiện vận hành tại Việt Nam để đề xuất bảng so sánh định mức chuẩn hãng (Km & Tháng), cho phép áp dụng 1 chạm trực tiếp vào xe. |
| **v4.3.223** | ⚡ **Sửa Lỗi Cập Nhật ODO & Hiển Thị Thông Báo Toast Toast Popup (v4.3.223)**: Cho phép điều chỉnh số Km ODO linh hoạt (hỗ trợ sửa lại số khi gõ nhầm ODO), phơi bày hàm `window.showToast` toàn cục giúp hiển thị popup thông báo góc màn hình, và thêm hiệu ứng phản hồi nút `✓ Đã lưu!` màu xanh lá tức thì khi bấm Lưu ODO. |
| **v4.3.222** | 🎨 **Phục Hồi Trọn Vẹn 100% Vòng Tròn Phần Trăm & Thẻ Hao Mòn Phụ Tùng MotoCare (v4.3.222)**: Bổ sung toàn bộ hệ thống CSS vòng tròn tiến độ SVG Radial Progress (`fill: none`, viền stroke tròn mềm mại với hiệu ứng phát sáng neon theo màu trạng thái Xanh/Vàng/Đỏ), số % nằm giữa tâm vòng tròn, badge trạng thái viên thuốc bo tròn và nút "Thay phụ tùng" chuẩn xác như app MotoCare gốc. |
| **v4.3.221** | 🔑 **Sửa Lỗi Xác Thực Gemini API Bác Sĩ Xe Máy AI (v4.3.221)**: Khắc phục triệt để lỗi "invalid authentication credentials" khi gọi AI Doctor bằng cách đồng bộ trực tiếp `state.geminiApiKey` trong bộ nhớ giải mã E2EE của FamiLife, gán `window._famiLifeGeminiKey` ngay khi load state, và mã hóa tham số `key` trong URL gọi Google API. |
| **v4.3.220** | 🤖 **Dùng Trực Tiếp Gemini API Key Của FamiLife & Đổi Tên Tab "Quản lý" (v4.3.220)**: Tích hợp đồng bộ khóa Google Gemini API Key từ Cài đặt chung của FamiLife sang Bác sĩ Xe máy AI (loại bỏ hoàn toàn ô nhập key thừa trong MotoCare), đồng thời đổi tên tab con "Cài đặt" thành "Quản lý" trên cả Navbar Desktop, Mobile và giao diện quản lý nhà xe. |