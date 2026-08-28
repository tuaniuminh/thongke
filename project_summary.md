# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.221** |
| **v4.3.221** | 🔑 **Sửa Lỗi Xác Thực Gemini API Bác Sĩ Xe Máy AI (v4.3.221)**: Khắc phục triệt để lỗi "invalid authentication credentials" khi gọi AI Doctor bằng cách đồng bộ trực tiếp `state.geminiApiKey` trong bộ nhớ giải mã E2EE của FamiLife, gán `window._famiLifeGeminiKey` ngay khi load state, và mã hóa tham số `key` trong URL gọi Google API. |
| **v4.3.220** | 🤖 **Dùng Trực Tiếp Gemini API Key Của FamiLife & Đổi Tên Tab "Quản lý" (v4.3.220)**: Tích hợp đồng bộ khóa Google Gemini API Key từ Cài đặt chung của FamiLife sang Bác sĩ Xe máy AI (loại bỏ hoàn toàn ô nhập key thừa trong MotoCare), đồng thời đổi tên tab con "Cài đặt" thành "Quản lý" trên cả Navbar Desktop, Mobile và giao diện quản lý nhà xe. |
| **v4.3.219** | ✨ **Tối Ưu Layout Thanh Tiêu Đề & Canh Phải Nút Hành Động MotoCare (v4.3.219)**: Bổ sung định dạng Flexbox `justify-content: space-between` cho `.section-header`, canh nút "+ Nhập đổ xăng", "+ Thêm bảo dưỡng", "+ Thêm xe mới" sang góc phải ngang hàng với tiêu đề trang cực kỳ thoáng đãng, hiện đại và cân đối trên cả PC lẫn Mobile. |
| **v4.3.218** | 🎯 **Phát Hiện & Khắc Phục Lỗi Gốc CSS 404 Bằng Con Bọ Debug (v4.3.218)**: Dựa vào log chẩn đoán computed style từ con bọ, phát hiện file `src/assets/css/motocare.css` bị chặn push bởi dòng `assets/` trong `.gitignore` dẫn đến lỗi 404 trên GitHub Pages. Đã sửa `.gitignore` thành `/assets/`, chính thức đưa file `motocare.css` lên Git, nạp trọn vẹn 100% giao diện Card bóng mờ, thẻ chào xanh và Bác sĩ AI tím. |
| **v4.3.217** | ✅ **Nâng Cấp Con Bọ Debug Detector & Tối Ưu Nút Sao Chép Log (v4.3.217)**: Loại bỏ triệt để popup alert khi bấm sao chép log trong Bug Console (thay bằng hiệu ứng phản hồi nút màu xanh "Đã sao chép" 1.5s mượt mà), đồng thời bổ sung hệ thống chẩn đoán computed style chuyên sâu cho MotoCare (`mcMain`, `welcomeCard`, `btnCard`, `aiCard`) và nạp bộ CSS cưỡng chế độ ưu tiên cao nhất cho giao diện Chăm Sóc Xe. |