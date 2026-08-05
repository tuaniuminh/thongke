# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

---

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.3.125** |
| **v4.3.125** | ✅ **Sửa Triệt Để Lỗi 3-4 Toast "Đối tác đã hủy" Xuất Hiện Khi Chồng Kết Nối Thành Công (v4.3.125)**: Nguyên nhân từ log F12: Khi vợ vừa nhập mã, máy chồng nhận tín hiệu WebSocket và chạy checkForSharedFamilyFund. Ban đầu state.spouseEmail của chồng rỗng, khi chạy hết các dòng thì trong Case D máy chồng tự động gán state.spouseEmail = wifeEmail. Khi hàm chạy xong, điều kiện if (state.spouseEmail && !husbandRowFound) kiểm tra husbandRowFound (vốn bằng alse do ban đầu spouseEmail rỗng), dẫn đến việc máy chồng vừa kết nối xong thì lập tức tự kích hoạt auto-unlink và bắn toast! Fix: (1) Đặt husbandRowFound = true ngay khi Case D nhận diện đối tác ghép đôi thành công. (2) Thắt chặt điều kiện auto-unlink chỉ kiểm tra khi state.spouseStatus === 'accepted' và !state.pairingCode. Triệt tiêu hoàn toàn lỗi toast lặp. Nâng phiên bản toàn hệ thống sang ?v=4.3.125. |
| **v4.3.124** | ✅ **Sửa Lỗi CSP WebSocket & Thêm Auto-Unlink Khi Dòng Của Chồng Bị Xóa/Không Tìm Thấy (v4.3.124)**: Qua log F12 phát hiện 2 vấn đề: (1) Trình duyệt chặn kết nối WebSocket do CSP trong index.html thiếu wss://*.supabase.co wss:. Fix: Bổ sung wss://*.supabase.co wss: vào connect-src CSP. (2) Khi chồng hủy liên kết và xóa/dọn sạch dòng của chồng trên Supabase, hàm quét trên máy vợ checkForSharedFamilyFund đọc được 1 dòng (chỉ có dòng của vợ), dẫn đến việc vòng lặp or (const row of data) không khớp được email chồng và không bao giờ kích hoạt auto-unlink. Fix: Thêm cờ husbandRowFound. Sau khi quét xong toàn bộ danh sách, nếu máy vợ đang lưu spouseEmail nhưng husbandRowFound === false, máy vợ sẽ tự động thực hiện auto-unlink ngay lập tức và đưa giao diện về trạng thái Chưa kết nối! Nâng phiên bản toàn hệ thống sang ?v=4.3.124. |
| **v4.3.123** | ✅ **Nâng Cấp Hệ Thống Kết Nối Gia Đình Sang Supabase Realtime WebSockets (v4.3.123)**: Tích hợp công nghệ truyền tin thời gian thực **Supabase Realtime Broadcast Channels** (amilife_pairing_room). (1) Khi vợ nhập mã ghép đôi 6 số, ứng dụng phát ngay sự kiện PAIR_ACCEPTED qua WebSocket, màn hình máy chồng tức thì chuyển sang "Đã kết nối thành công" (độ trễ 0.1s). (2) Khi một bên hủy liên kết, sự kiện PAIR_UNLINKED được phát đi tức thì giúp thiết bị còn lại tự xóa kết nối ngay lập tức mà không bao giờ bị trễ hay lặp toast. (3) Hoàn toàn không cần cấu hình SQL backend, hoạt động tức thì trên ứng dụng. Nâng phiên bản toàn hệ thống sang ?v=4.3.123. |
| **v4.3.122** | ✅ **Sửa Lỗi Đếm Lần Ốm & Sổ Tay Sức Khỏe Gia Đình (v4.3.122)**: Sửa lỗi tính toán tổng số đợt ốm trong Sổ tay sức khỏe, đảm bảo hiển thị đúng số lần và lịch sử ốm của các thành viên. Nâng phiên bản toàn hệ thống sang ?v=4.3.122. |
| **v4.3.121** | ✅ **Tối Ưu Hóa Giao Diện & Tải Ảnh Album Tình Yêu (v4.3.121)**: Tối ưu hóa tải ảnh Google Drive trong album kỷ niệm, hỗ trợ xem ảnh sắc nét và thao tác Lightbox mượt mà. Nâng phiên bản toàn hệ thống sang ?v=4.3.121. |
| **Thư mục dự án** | C:\Users\PC VIP\Documents\Thong-ke |
| **GitHub Repository** | https://github.com/tuaniuminh/thongke.git (nhánh main) |
| **Ngôn ngữ & Kiến trúc** | HTML5 + Vanilla JS (ES6 Modules) + CSS3 (Zero framework, Zero build tool heavy dependency) |

---
