# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

> [!IMPORTANT]

> **QUY TẮC PHÁT HIỆN LỖI (BUG DETECTOR RULE)**: Đối với các lỗi đã sửa/fix từ 2 lần trở lên mà vẫn không fix thành công, bắt buộc phải nâng cấp hệ thống debug log / in ra vết chi tiết (tiền tố `[BUG DETECTOR]`) tại các điểm nghi ngờ để tìm ra chính xác lỗi nằm ở đâu trước khi thực hiện chỉnh sửa tiếp theo.

## 🗂 Thông tin dự án

| Mục | Chi tiết |

|-----|----------|

| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |

| **Phiên bản hiện tại** | **v4.3.159** |
| **v4.3.159** | ✅ **Loại Bỏ Giao Diện Bento Grid 3 Cột Khỏi Cài Đặt (v4.3.159)**: Xóa hoàn toàn card cấu hình bố cục trang chủ Desktop (`desktopHomeLayoutCard`) khỏi cài đặt trong `index.html`. Trong `src/core/app.js`, vô hiệu hóa tính năng Bento Grid thử nghiệm, mặc định ép giao diện Desktop luôn hiển thị chế độ 1 cột (`list`) truyền thống và dọn dẹp các lớp class liên quan để giao diện luôn nhất quán và sạch sẽ. Nâng phiên bản toàn hệ thống sang `?v=4.3.159`. |
| **v4.3.158** | ✅ **Sửa Lỗi Layout Admin & Thiết Lập Căn Giữa Desktop (v4.3.158)**: Sửa lỗi Grid lồng làm co hẹp chiều ngang hai cột Admin lời nhắc trên Desktop khiến chữ bị xuống hàng dọc kỳ lạ. Thêm thuộc tính `grid-column: span 2 !important` cho container Admin và container Thiết lập để chúng trải rộng toàn bộ 2 cột của Grid cha `.memory-page.layout-modern`, giúp giao diện hiển thị rộng rãi, cân xứng và căn giữa hoàn hảo. Nâng phiên bản toàn hệ thống sang `?v=4.3.158`. |
| **v4.3.157** | ✅ **Nâng Cấp Layout 2 Cột Cho Giao Diện Lời Nhắc Desktop (v4.3.157)**: Tái cấu trúc tab Admin (Đặt Lịch Lời Nhắc) trên Desktop thành bố cục 2 cột song song. Đưa form nhập Đặt lịch lời nhắc sang cột trái và chuyển danh sách lời nhắc đã lên lịch sang cột phải thành một bảng card riêng biệt có chiều cao kéo giãn bằng cột trái. Giao diện Mobile tự động co về 1 cột xếp chồng dọc. Nâng phiên bản toàn hệ thống sang `?v=4.3.157`. |
| **v4.3.156** | ✅ **Khắc Phục Lỗi Dấu Tiếng Việt Bị Che Khuất (Clipping Fix) (v4.3.156)**: Sửa lỗi dấu hỏi của chữ "Ảnh" trong tiêu đề bị cắt đứt phẳng mép trên khi zoom trang hoặc hiển thị trên màn hình lớn. Bổ sung `line-height: 1.45 !important`, `padding-top` và `overflow: visible !important` cho `.welove-title` để đảm bảo trình duyệt hiển thị dấu tiếng Việt nhô cao trọn vẹn 100%. Nâng phiên bản toàn hệ thống sang `?v=4.3.156`. |
| **v4.3.155** | ✅ **Nâng Cấp Cỡ Chữ & Sửa Phông Chữ Tiêu Đề Chống Lẹm Dấu (v4.3.155)**: Thiết lập font-family của `.welove-title` sang phông chữ "Outfit" và "Be Vietnam Pro" hỗ trợ tiếng Việt cực chuẩn, sửa đổi hiện tượng lẹm dấu hỏi của chữ "Ảnh" trong tiêu đề. Nâng cỡ chữ của tiêu đề, subtitle, timeline item, thống kê ốm, nhãn input và câu trích dẫn tiếng Việt trên Desktop để dễ đọc hơn trên màn hình lớn. Nâng phiên bản toàn hệ thống sang `?v=4.3.155`. |
| **Thư mục dự án** | `C:\Users\PC VIP\Documents\Thong-ke` |

| **GitHub Repository** | `https://github.com/tuaniuminh/thongke.git` (nhánh `main`) |

| **Ngôn ngữ** | HTML + Vanilla JS + CSS (không dùng framework) |

---

---

## 🏗 Kiến trúc & Tệp quan trọng (Đã bóc tách module)

Dự án đã được tái cấu trúc từ một file `app.js` khổng lồ sang kiến trúc module ES6 gọn nhẹ hơn:

| Tệp / Thư mục | Mô tả |

|-----|-------|

| `index.html` | Toàn bộ cấu trúc HTML chính của ứng dụng |

| `404.html` | Xử lý routing ảo cho SPA trên GitHub Pages |

| `src/core/app.js` | Logic cốt lõi: Router, State, Auth, thiết lập UI chung (~2000 dòng) |

| `src/core/crypto.js` | Mã hóa AES-256 bằng PBKDF2 + Web Crypto API |

| `src/core/sync.js` | Đồng bộ với Supabase (realtime, auth) |

| `src/features/thu-chi-doi-ngoai/thu-chi.js` | Module quản lý Thu/Chi, Biểu đồ dòng tiền, Export/Import Excel |

| `src/features/ho-so-y-te/ho-so-y-te.js` | Module quản lý Y tế, Bệnh án, Quét ảnh AI, Giọng đọc, Xuất PDF |

| `src/features/thoi-tiet/thoi-tiet.js` | Tính năng Dự báo Thời tiết (Open-Meteo API) |

| `src/features/am-lich/lunar_vietnam.js` | Thư viện lịch âm Việt Nam (thuật toán Hồ Ngọc Đức, GMT+7) |

| `src/assets/` | Chứa CSS (`style.css`) và Hình ảnh (`icon.png`, logo...) |

| `version.json` | Kiểm tra cập nhật tự động |

---

## ✨ Tính năng chính của ứng dụng

### 1. Bảo mật

- **Mã hóa toàn bộ dữ liệu** bằng AES-256 (PBKDF2) trước khi lưu vào `localStorage`

- **Master Password**: Khóa mã hóa do người dùng đặt khi lần đầu truy cập

- **Hai chế độ đặt mật khẩu**: PIN 6 số (bàn phím T9) hoặc Mật khẩu chữ

- **Ghi nhớ đăng nhập**: Checkbox "Ghi nhớ mở khóa trên thiết bị này" lưu mật khẩu vào `localStorage` dưới key `gift_ledger_remembered_pin`

- **Tự động chọn chế độ**: Desktop → Keyboard Mode; Mobile → PIN Mode

### 2. Thu Chi Đối Ngoại

- Ghi nhận tiền **nhận** và **gửi đi** (đám cưới, thôi nôi, v.v.)

- Lọc theo sự kiện, tìm kiếm người, thống kê tổng hợp với thuật toán tính điểm ưu tiên họ tên khớp trước địa chỉ

- Biểu đồ Chart.js

### 3. Hồ Sơ Sức Khỏe

- Lưu chỉ số xét nghiệm (máu, sinh hóa, ...)

- Theo dõi lịch sử huyết áp (Tâm thu, tâm trương, nhịp tim, buổi đo sáng/tối)

- **Từ điển chỉ số y tế** (~150+ chỉ số): tên viết tắt, đơn vị, ngưỡng bình thường, chú giải

- Lời giới thiệu khi vào trang "Hồ sơ sức khỏe"

- **Tải ảnh / Chụp ảnh trực tiếp từ camera**: Quét nhanh các chỉ số xét nghiệm hoặc kết quả đo huyết áp tự động

### 4. Tích hợp AI (Gemini) nâng quan tâm

- **Nhận diện ảnh đa năng**: Tự động nhận diện nếu ảnh là máy đo huyết áp (Omron HEM-7361T) hoặc kết quả xét nghiệm y tế

- **Thuật toán thông minh cho máy Omron**: Chỉ trích xuất cột kết quả đo mới nhất ở bên **PHẢI** (bỏ qua cột kết quả cũ bên trái)

- **Cơ chế Thử lại Tự động (Fallback models)**: Khi gặp lỗi quá tải/đáp ứng cao (`gemini-3.5-flash`), hệ thống tự động đổi sang `gemini-2.5-flash` rồi `gemini-1.5-flash` để đảm bảo quét thành công

- **Báo cáo phân tích tổng hợp (Blood Test + BP)**: Kết hợp các xét nghiệm máu và lịch sử đo huyết áp để phân tích tim mạch, đường huyết, mỡ máu tổng quan

- **Tùy chọn Phân tích linh hoạt**: Sau khi quét huyết áp, hiển thị modal cho phép lựa chọn:

- **Phương án 1**: Chỉ phân tích chỉ số Huyết áp (Hôm nay & Lịch sử)

- **Phương án 2**: Phân tích Huyết áp kết hợp toàn bộ dữ liệu sức khỏe (Xét nghiệm máu, nước tiểu...)

- **Giọng đọc AI (Text-to-Speech) cải tiến**: Tự động phát hiện và lựa chọn giọng đọc tự nhiên (Natural/Google/Microsoft), tinh chỉnh tốc độ đọc xuống `0.9` để giảm tối đa tính máy móc, tự động ngắt tiếng khi tắt modal.

### 5. Xuất báo cáo PDF

- Xuất dữ liệu y tế và lịch sử huyết áp ra file PDF chuyên nghiệp

- **Sửa lỗi Font tiếng Việt**: Nhúng font Roboto (Regular & Bold) tự động từ CDN cdnjs hỗ trợ diacritics tiếng Việt trọn vẹn

- Việt hóa toàn bộ văn bản trong file PDF xuất ra

### 6. Trang chủ & Đồng bộ

- Widget **Thời tiết Hà Nội** (Open-Meteo API, mô tả tiếng Việt) và **Lịch âm Việt Nam** (GMT+7)

- Cập nhật sáng/tối đồng bộ

- **Đồng bộ Supabase**: Dữ liệu mã hóa của cả Thu Chi và Huyết áp được đồng bộ tự động theo thời gian thực (nhất quán LWW)

---

## 🔑 Lưu ý kỹ thuật quan trọng

> [!CAUTION]

> **KHÔNG tự động tải lên GitHub.** Sau khi hoàn thành tính năng hoặc sửa lỗi, agent **chỉ được phép** `git add` + `git commit` (nếu người dùng yêu cầu rõ ràng). Việc `git push` lên GitHub **do người dùng tự thực hiện** trên cuộc trò chuyện riêng. Không được tự ý push code.

> [!IMPORTANT]

> **Nâng cấp phiên bản (Version Bump):** Ở MỖI LẦN chỉnh sửa mã nguồn (dù là nhỏ nhất), agent **bắt buộc** phải nâng cấp số phiên bản đồng loạt trong **6 file** (không được bỏ sót): `version.json`, `src/core/app.js` (biến `APP_VERSION`), `index.html` (các `?v=...`), `sw.js`, **`package.json`** (ảnh hưởng tên file `.ipa` iOS), **`manifest.json`** (icon URL cache PWA), và tất cả `import ... ?v=` trong các file JS module. Xem **Checklist đầy đủ** trong `.agents/AGENTS.md` Quy tắc 2.

> [!IMPORTANT]

> **Cập nhật Lịch sử Phiên bản:** Cùng với việc nâng cấp version, bạn bắt buộc phải thêm dòng tóm tắt thông tin các thay đổi của phiên bản mới vào bảng "Lịch sử phiên bản gần đây" trong chính file `project_summary.md` này.

> [!IMPORTANT]

> **Tính Độc Lập Giữa Các Module:** Mọi chỉnh sửa trong tính năng **Thu chi đối ngoại** tuyệt đối không được ảnh hưởng đến dữ liệu hoặc hoạt động của **Hồ sơ sức khỏe** và ngược lại. Hai phân hệ này phải hoàn toàn độc lập với nhau.

> [!IMPORTANT]

> **Đóng gói & Đặt tên file IPA (iOS):** Khi ứng dụng được đóng gói tự động trên GitHub Actions (file `build-ios.yml`), file `.ipa` đầu ra bắt buộc phải được tự động đổi tên theo định dạng `FamiLife_v[Phiên_bản].ipa` (ví dụ: `FamiLife_v4.1.41.ipa`) dựa trên thuộc tính `version` trong `package.json`.

> [!IMPORTANT]

> **Bảo vệ mã hóa UTF-8 (No-BOM):** Toàn bộ file nguồn (`index.html`, JS, CSS, JSON) phải luôn lưu dưới dạng **UTF-8 không BOM**. Tuyệt đối không dùng các câu lệnh PowerShell `Get-Content | Set-Content` đơn thuần trên hệ điều hành Windows vì sẽ gây ra lỗi **Mojibake** (hỏng ký tự Tiếng Việt) và tự thêm dấu UTF-8 BOM byte header làm lỗi nạp module JS. Xem **Quy tắc 5** trong `.agents/AGENTS.md`.

---

## 🛠 Hệ Thống Chẩn Đoán Mã Lỗi Toàn Cục (Error Codes)

Ứng dụng tích hợp hệ thống chẩn đoán lỗi toàn cục tại [index.html](file:///c:/Users/PC VIP/Documents/Thong-ke/index.html), tự động bắt lỗi và ánh xạ sang các mã số chẩn đoán hiển thị trực quan trên Banner màu đỏ để người dùng dễ dàng báo cáo:

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

## 🛢 Cấu trúc Cơ sở dữ liệu & Chính sách RLS (Supabase)

Bảng `gift_sync` trên Supabase được cấu hình Row Level Security (RLS) để cho phép trao đổi khóa bất đối xứng và đồng bộ Quỹ gia đình E2EE giữa 2 vợ chồng:

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

## 🚀 Git & Triển khai

> [!CAUTION]

> **KHÔNG tự động đẩy lên GitHub.** AI tuyệt đối không chạy lệnh `git push`. Người dùng tự đẩy code sau. Chỉ dùng `git add` và `git commit` khi được yêu cầu.
