# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]
> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

> [!IMPORTANT]
> **QUY TẮC ĐỘC LẬP GIỮA CÁC CARD TÍNH NĂNG (CARD ISOLATION RULE)**: Mọi chỉnh sửa, sửa lỗi hoặc thêm tính năng ở bất kỳ card/module tính năng nào (Thu chi đối ngoại, Hồ sơ y tế, Quỹ gia đình, We Love... hoặc các card tính năng mới trong tương lai) tuyệt đối **KHÔNG** được gây lỗi, làm ảnh hưởng hoặc làm thay đổi dữ liệu, giao diện, logic hoạt động của các card/module khác.

---

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.3.125** |
| **v4.3.125** | ✅ **Sửa Triệt Để Lỗi 3-4 Toast "Đối tác đã hủy" Xuất Hiện Khi Chồng Kết Nối Thành Công (v4.3.125)**: Nguyên nhân từ log F12: Khi vợ vừa nhập mã, máy chồng nhận tín hiệu WebSocket và chạy `checkForSharedFamilyFund`. Ban đầu `state.spouseEmail` của chồng rỗng, khi chạy hết các dòng thì trong Case D máy chồng tự động gán `state.spouseEmail = wifeEmail`. Khi hàm chạy xong, điều kiện `if (state.spouseEmail && !husbandRowFound)` kiểm tra `husbandRowFound` (vốn bằng `false` do ban đầu `spouseEmail` rỗng), dẫn đến việc máy chồng vừa kết nối xong thì lập tức tự kích hoạt auto-unlink và bắn toast! Fix: (1) Đặt `husbandRowFound = true` ngay khi Case D nhận diện đối tác ghép đôi thành công. (2) Thắt chặt điều kiện auto-unlink chỉ kiểm tra khi `state.spouseStatus === 'accepted'` và `!state.pairingCode`. Triệt tiêu hoàn toàn lỗi toast lặp. Nâng phiên bản toàn hệ thống sang `?v=4.3.125`. |
| **v4.3.124** | ✅ **Sửa Lỗi CSP WebSocket & Thêm Auto-Unlink Khi Dòng Của Chồng Bị Xóa/Không Tìm Thấy (v4.3.124)**: Qua log F12 phát hiện 2 vấn đề: (1) Trình duyệt chặn kết nối WebSocket do CSP trong `index.html` thiếu `wss://*.supabase.co wss:`. Fix: Bổ sung `wss://*.supabase.co wss:` vào `connect-src` CSP. (2) Khi chồng hủy liên kết và xóa/dọn sạch dòng của chồng trên Supabase, hàm quét trên máy vợ `checkForSharedFamilyFund` đọc được 1 dòng (chỉ có dòng của vợ), dẫn đến việc vòng lặp `for (const row of data)` không khớp được email chồng và không bao giờ kích hoạt auto-unlink. Fix: Thêm cờ `husbandRowFound`. Sau khi quét xong toàn bộ danh sách, nếu máy vợ đang lưu `spouseEmail` nhưng `husbandRowFound === false`, máy vợ sẽ tự động thực hiện auto-unlink ngay lập tức và đưa giao diện về trạng thái Chưa kết nối! Nâng phiên bản toàn hệ thống sang `?v=4.3.124`. |
| **v4.3.123** | ✅ **Nâng Cấp Hệ Thống Kết Nối Gia Đình Sang Supabase Realtime WebSockets (v4.3.123)**: Tích hợp công nghệ truyền tin thời gian thực **Supabase Realtime Broadcast Channels** (`familife_pairing_room`). (1) Khi vợ nhập mã ghép đôi 6 số, ứng dụng phát ngay sự kiện `PAIR_ACCEPTED` qua WebSocket, màn hình máy chồng tức thì chuyển sang "Đã kết nối thành công" (độ trễ 0.1s). (2) Khi một bên hủy liên kết, sự kiện `PAIR_UNLINKED` được phát đi tức thì giúp thiết bị còn lại tự xóa kết nối ngay lập tức mà không bao giờ bị trễ hay lặp toast. (3) Hoàn toàn không cần cấu hình SQL backend, hoạt động tức thì trên ứng dụng. Nâng phiên bản toàn hệ thống sang `?v=4.3.123`. |
| **v4.3.122** | ✅ **Sửa Triệt Để Lỗi Auto-Unlink Nhầm Khi Vợ Vừa Nhập Mã Ghép Đôi (v4.3.122)**: Qua log F12 phát hiện nguyên nhân gốc rễ: khi chồng mới tạo mã ghép đôi, dòng của chồng có `spouse_email = ''` và `spouse_status = ''`. Thuật toán v4.3.121 trên máy vợ kiểm tra điều kiện `(!remoteSpouseEmail && remoteSpouseStatus !== 'accepted')`, dẫn đến việc ngay khi vợ vừa nhập mã xong thì hàm polling kiểm tra dòng của chồng (chưa kịp nhận diện vợ) và kích hoạt auto-unlink lập tức! Fix: (1) Sửa điều kiện auto-unlink trong [`ket-noi.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/ket-noi-gia-dinh/ket-noi.js) chỉ kích hoạt khi `remoteSpouseStatus === 'left'` hoặc `remoteSpouseEmail` trỏ tới người khác. (2) Tinh chỉnh `isLocalUnlinked` trong [`app.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/app.js) để không làm gián đoạn tiến trình tạo/nhập mã ghép đôi mới (`!state.pairingCode && !state.pairingCodeAccepted`). Nâng phiên bản toàn hệ thống sang `?v=4.3.122`. |
| **v4.3.121** | ✅ **Sửa Triệt Để Lỗi Toast Lặp & Tự Động Nhận Diện Hủy Liên Kết Phía Vợ (v4.3.121)**: (1) Sửa lỗi toast "Đối tác đã hủy..." lặp vô tận: Thêm kiểm tra `hadSpouse` trước khi xóa biến local, chỉ bắn toast đúng 1 lần khi chuyển từ có sang không còn kết nối, và gọi `await performSync(true)` đồng bộ ngay lập tức để làm sạch bản ghi của vợ trên Supabase. (2) Sửa lỗi `performSync()` khôi phục `spouseEmail`: Nếu local state chưa có spouse (`!state.spouseEmail`), `performSync` sẽ chủ động làm sạch `remoteData` và đẩy bản ghi rỗng lên Supabase thay vì bị khôi phục từ Cloud. (3) Tự động kích hoạt `checkForSharedFamilyFund()` ngay khi module `ket-noi.js` nạp xong để phía vợ tự nhận diện ngay khi vừa mở app mà không cần bấm thủ công. Nâng phiên bản toàn hệ thống sang `?v=4.3.121`. |
| **Thư mục dự án** | `C:\Users\PC VIP\Documents\Thong-ke` |
| **GitHub Repository** | `https://github.com/tuaniuminh/thongke.git` (nhánh `main`) |
| **Ngôn ngữ & Kiến trúc** | HTML5 + Vanilla JS (ES6 Modules) + CSS3 (Zero framework, Zero build tool heavy dependency) |

---

## 🏗 Kiến trúc Module ES6 & Cấu trúc Thư mục

Dự án tuân thủ kiến trúc ES6 Module tách biệt rõ ràng giữa Core (Lõi) và Features (Card tính năng):

| Tệp / Thư mục | Mô tả & Chức năng |
|-----|-------|
| [`index.html`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/index.html) | Khung cấu trúc HTML chính, tích hợp Banner Error Diagnostic và import các module |
| [`404.html`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/404.html) | Xử lý routing ảo cho SPA khi chạy trên GitHub Pages |
| [`src/core/app.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/app.js) | Core Router, State Management toàn ứng dụng, Authentication, UI Setup, Trigger Sync |
| [`src/core/crypto.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/crypto.js) | Module mã hóa E2EE: AES-256-GCM, PBKDF2, RSA-OAEP Keypair |
| [`src/core/sync.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/sync.js) | Module kết nối và đồng bộ Supabase (Realtime Auth, Upsert, GetSyncData) |
| [`src/features/thu-chi-doi-ngoai/thu-chi.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/thu-chi-doi-ngoai/thu-chi.js) | Module Thu/Chi đối ngoại, Biểu đồ dòng tiền, Excel Export/Import, Thuật toán ưu tiên tìm kiếm |
| [`src/features/ho-so-y-te/ho-so-y-te.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/ho-so-y-te/ho-so-y-te.js) | Module Y tế, Gemini OCR, Thuật toán Omron, Cascade Fallback AI, TTS, Báo cáo PDF |
| [`src/features/ket-noi-gia-dinh/ket-noi.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/ket-noi-gia-dinh/ket-noi.js) | Module Ghép đôi gia đình E2EE, Trao đổi khóa RSA, Vòng đời Hủy liên kết & Guard Safety |
| [`src/features/quy-gia-dinh/quy-gia-dinh.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/quy-gia-dinh/quy-gia-dinh.js) | Module Quản lý Quỹ gia đình E2EE (Thu/Chi chung vợ chồng) |
| [`src/features/quy-gia-dinh/bao-cao-thang.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/quy-gia-dinh/bao-cao-thang.js) | Báo cáo thống kê quỹ gia đình theo tháng |
| [`src/features/we-love/we-love.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/we-love/we-love.js) | Feature card "We Love" (Kỷ niệm gia đình, đếm ngày yêu, sự kiện chung) |
| [`src/features/am-lich/lunar_vietnam.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/am-lich/lunar_vietnam.js) | Thư viện lịch âm Việt Nam chuẩn thuật toán Hồ Ngọc Đức (GMT+7) |
| [`src/features/thoi-tiet/thoi-tiet.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/thoi-tiet/thoi-tiet.js) | Widget dự báo thời tiết Open-Meteo |
| [`version.json`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/version.json) | Tệp kiểm tra phiên bản cập nhật tự động |

---

## 🛡 Kiến Trúc Bảo Mật & Mã Hóa E2EE (Zero-Knowledge)

Dự án áp dụng nguyên tắc **Zero-Knowledge**: Server (Supabase) chỉ lưu trữ các chuỗi đã được mã hóa (`encrypted_data`), máy chủ tuyệt đối không nắm giữ khóa bí mật hay dữ liệu dạng rõ (plain text).

### 1. Mã Hóa Đối Xứng (Symmetric Encryption - Client Data)
- **Thuật toán**: `AES-256-GCM` thông qua Web Crypto API (`window.crypto.subtle`).
- **Khóa Mã Hóa (Key Derivation)**: Sử dụng `PBKDF2` với `SHA-512` và **600,000 vòng lặp (iterations)**. Mỗi lần mã hóa tạo ra Salt ngẫu nhiên 16 bytes và Vector khởi tạo (IV) ngẫu nhiên 12 bytes.
- **Định dạng Chuỗi Mã Hóa**: `${saltHex}:${ivHex}:${encryptedHex}`.
- **Thuật toán Thử nghiệm Giải mã Dự phòng (Fallback Candidates)**:
  Để đảm bảo tính tương thích ngược trọn vẹn (backward compatibility) cho dữ liệu backup hoặc máy khách từ các phiên bản cũ, hàm `decrypt` trong [`crypto.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/crypto.js) tự động thử lần lượt 4 cấu hình key derivation:
  1. `SHA-512` / 600,000 iterations (Mặc định chuẩn hiện tại)
  2. `SHA-256` / 100,000 iterations (Bản cũ v4.3.87)
  3. `SHA-256` / 600,000 iterations
  4. `SHA-512` / 100,000 iterations

### 2. Mã Hóa Bất Đối Xứng & Ghép Đôi Gia Đình (Asymmetric E2EE Key Exchange)
- **Cặp Khóa**: `RSA-OAEP 4096-bit` với `SHA-512` (nâng cấp từ 2048-bit / SHA-256).
- **Thuật toán Tự Phát Hiện Hash (`_detectRsaHash`)**:
  Hàm mã hóa/giải mã asymmetric đọc thuộc tính `alg` trong JWK:
  - Nếu `alg === 'RSA-OAEP-512'` -> Dùng `SHA-512` (Keypair mới).
  - Khác / Mặc định -> Fallback sang `SHA-256` (Keypair 2048-bit cũ).
  -> Đảm bảo 2 thiết bị vợ chồng ở các phiên bản khác nhau vẫn trao đổi khóa an toàn tuyệt đối.

### 3. Vòng Đời Ghép Đôi & Hủy Liên Kết Gia Đình (Unlink Lifecycle & Guard Rules)
- **Tiến trình Ghép Đôi**: Vợ/Chồng tạo mã pairing 6 ký tự. Khi người kia nhập mã, khóa công khai RSA được trao đổi trên Supabase `gift_sync`, sau đó khóa đối xứng của Quỹ gia đình được mã hóa RSA và chia sẻ qua cột `fund_shared_keys`.
- **Cơ chế Chống Tự Kết Nối Lại Khi Hủy (`window._isUnlinking`)**:
  Để triệt tiêu lỗi tự động phục hồi kết nối trong lúc hủy liên kết, hệ thống sử dụng cờ toàn cục `window._isUnlinking`:
  - Trong [`ket-noi.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/ket-noi-gia-dinh/ket-noi.js): Dừng toàn bộ hàm polling `checkForSharedFamilyFund` nếu `window._isUnlinking === true`.
  - Trong [`app.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/core/app.js): Hàm `performSync` kiểm tra cờ `window._isUnlinking`, bỏ qua việc tải và phục hồi `pairingCode` hoặc `spouseStatus` từ Supabase khi đang hủy.

---

## 🧮 Các Thuật Toán Quan Trọng Trong Dự Án

### 1. Thuật Toán Gemini AI OCR & Xử Lý Ảnh Y Tế
- **Mô Hình Dự Phòng Đa Tầng (Cascade Fallback Models Algorithm)**:
  Khi thực hiện quét kết quả xét nghiệm hoặc huyết áp, ứng dụng gọi Gemini API theo cơ chế dự phòng tự động:
  `gemini-3.5-flash` ➡️ (Lỗi / Overloaded) ➡️ `gemini-2.5-flash` ➡️ (Lỗi) ➡️ `gemini-1.5-flash`.
- **Thuật Toán Trích Xuất Cột Phải Cho Máy Đo Huyết Áp Omron (HEM-7361T)**:
  Các máy đo huyết áp cao cấp như Omron HEM-7361T hiển thị 2 cột số trên màn hình (cột bên trái là dữ liệu bộ nhớ cũ, cột bên phải là kết quả đo mới nhất). Prompt và logic phân tích AI ép buộc mô hình **chỉ lấy kết quả ở cột bên PHẢI**, bỏ qua hoàn toàn cột bên trái để không ghi nhận sai chỉ số.
- **Từ Điển & Phân Loại Chỉ Số Y Tế**:
  Ánh xạ tên chỉ số quét được với từ điển `HEALTH_INDICATORS_DICTIONARY` (~150+ chỉ số) để đưa ra đơn vị chuẩn, ngưỡng bình thường và đánh giá mức độ rủi ro (Huyết áp: Bình thường, Tiền cao huyết áp, Độ 1, Độ 2, Nguy cơ cấp cứu).

### 2. Thuật Toán Ưu Tiên Tìm Kiếm & Chấm Điểm Thu Chi
Trong [`thu-chi.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/thu-chi-doi-ngoai/thu-chi.js), hàm tìm kiếm áp dụng thuật toán tính điểm ưu tiên (Priority Scoring):
- Khớp **Tên người nhận/gửi** = **2 điểm** (Ưu tiên hiển thị hàng đầu).
- Khớp **Địa chỉ / Ghi chú / Sự kiện** = **1 điểm**.
- Không khớp = **0 điểm** (Bị lọc bỏ).
- Kết quả tìm kiếm được sắp xếp giảm dần theo điểm số (`b.score - a.score`). Khi không tìm kiếm, danh sách tự động chuyển về sắp xếp theo ngày gần nhất.

### 3. Thuật Toán Lịch Âm Việt Nam (GMT+7)
Trong [`lunar_vietnam.js`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/src/features/am-lich/lunar_vietnam.js), thuật toán Hồ Ngọc Đức tính toán chính xác ngày/tháng âm lịch, xác định tháng nhuận và 24 tiết khí dựa trên tọa độ thiên văn được hiệu chỉnh chuẩn theo múi giờ Việt Nam (UTC+7 / ICT).

### 4. Thuật Toán Xuất Báo Cáo PDF & Nhúng Font Tiếng Việt
Ứng dụng sử dụng `jsPDF` + `jspdf-autotable`. Để tránh lỗi font tiếng Việt (thành các ô vuông `□`), hệ thống tự động nạp font UTF-8 `Roboto-Regular` và `Roboto-Medium` dưới dạng Base64/ArrayBuffer từ CDN, đảm bảo hiển thị trọn vẹn dấu tiếng Việt trên mọi thiết bị.

---

## 🛢 Cấu Trúc Cơ Sở Dữ Liệu & Chính Sách RLS (Supabase)

Bảng `gift_sync` trên Supabase được cấu hình Row Level Security (RLS) để cho phép trao đổi khóa bất đối xứng và đồng bộ dữ liệu E2EE giữa 2 vợ chồng:

```sql
-- 1. Bảng lưu trữ đồng bộ: public.gift_sync
-- Gồm các cột: user_id (UUID, khóa chính), encrypted_data (TEXT), updated_at (TIMESTAMPTZ), user_email (TEXT), public_key (TEXT)

-- 2. Chính sách ĐỌC dữ liệu (SELECT): Cho phép mọi tài khoản đã đăng nhập đọc dòng của nhau để lấy khóa công khai ghép đôi
drop policy if exists "Allow select for everyone" on public.gift_sync;
create policy "Allow select for everyone" on public.gift_sync
    for select using (true);

-- 3. Chính sách CẬP NHẬT dữ liệu (UPDATE): Cho phép chủ sở hữu hoặc đối tác (Vợ/Chồng) được phân quyền cập nhật dòng Quỹ gia đình E2EE chung
drop policy if exists "Allow update if owner or spouse" on public.gift_sync;
create policy "Allow update if owner or spouse" on public.gift_sync
    for update using (
        auth.uid() = user_id 
        or lower(encrypted_data::jsonb->>'spouse_email') = lower(auth.jwt()->>'email')
    );

-- 4. Chính sách CHÈN dữ liệu (INSERT / UPSERT): Đảm bảo người dùng hoặc đối tác (Vợ/Chồng) có quyền ghi khi thực hiện Upsert giao dịch
drop policy if exists "Allow insert if owner or spouse" on public.gift_sync;
create policy "Allow insert if owner or spouse" on public.gift_sync
    for insert with check (
        auth.uid() = user_id 
        or lower(encrypted_data::jsonb->>'spouse_email') = lower(auth.jwt()->>'email')
    );
```

---

## 🛠 Hệ Thống Chẩn Đoán Mã Lỗi Toàn Cục (Diagnostic Error Codes)

Ứng dụng tích hợp hệ thống chẩn đoán lỗi toàn cục tại [`index.html`](file:///c:/Users/PC%20VIP/Documents/Thong-ke/index.html), tự động bắt lỗi runtime và ánh xạ sang các mã số chẩn đoán hiển thị trực quan trên Banner màu đỏ:

| Mã số lỗi | Phân nhóm lỗi | Định nghĩa & Nguyên nhân phổ biến |
|---|---|---|
| **`ERR-101`** | **Lỗi cú pháp (SyntaxError)** | Thiếu dấu đóng mở ngoặc, dấu phẩy, lỗi cú pháp biên dịch JavaScript |
| **`ERR-102`** | **Lỗi tham chiếu (ReferenceError)** | Gọi một biến hoặc một hàm chưa được định nghĩa |
| **`ERR-103`** | **Lỗi kiểu dữ liệu (TypeError)** | Gọi hàm không tồn tại, truy cập thuộc tính trên đối tượng `null` hoặc `undefined` |
| **`ERR-201`** | **Lỗi mạng / API** | Không thể kết nối tới máy chủ, lỗi gọi API Supabase, lỗi Fetch |
| **`ERR-202`** | **Lỗi giải mã E2EE** | Nhập sai Master PIN, khóa bất đối xứng không hợp lệ, dữ liệu đồng bộ bị hỏng |
| **`ERR-301`** | **Lỗi PWA / Service Worker** | Lỗi trong quá trình cập nhật Service Worker, nạp cache offline |
| **`ERR-999`** | **Lỗi không xác định** | Các lỗi runtime hoặc Promise Rejection khác chưa được phân loại |

---

## 🔑 Quy Định Quản Lý Mã Nguồn & Triển Khai

> [!CAUTION]
> **KHÔNG tự động tải lên GitHub.** Agent tuyệt đối **KHÔNG** tự ý chạy các lệnh Git (`git push`, `git add`, `git commit`...) trừ khi có yêu cầu trực tiếp và rõ ràng từ người dùng. Việc push code do người dùng tự thực hiện.

> [!IMPORTANT]
> **Nâng cấp phiên bản (Version Bump & Cache Busting):** Ở MỖI LẦN chỉnh sửa mã nguồn, agent **bắt buộc** phải nâng cấp số phiên bản đồng loạt trong 3 file: `version.json`, `src/core/app.js` (biến `APP_VERSION`), và `index.html` (các tham số `?v=...` ở CSS/JS/Images). Đồng thời cập nhật tham số `?v=<phiên_bản_mới>` ở tất cả các câu lệnh `import` nội bộ trong file JS.

> [!IMPORTANT]
> **Giới hạn Lịch sử Phiên bản:** Bảng "🗂 Thông tin dự án" trong `project_summary.md` này **chỉ lưu tối đa 5 phiên bản gần nhất**. Khi thêm phiên bản mới, bắt buộc xóa dòng phiên bản cũ nhất.

> [!IMPORTANT]
> **Đóng gói & Đặt tên file IPA (iOS):** Khi ứng dụng được đóng gói tự động trên GitHub Actions (`build-ios.yml`), file `.ipa` đầu ra bắt buộc phải được tự động đổi tên theo định dạng `FamiLife_v[Phiên_bản].ipa` dựa trên thuộc tính `version` trong `package.json`.
