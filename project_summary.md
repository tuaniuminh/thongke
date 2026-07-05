# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.0.54** |
| **v4.0.54** | ✅ **Sửa lỗi sửa/xóa huyết áp:** Khắc phục lỗi `openBpModal is not defined` và `deleteBpRecord is not defined` khi bấm nút sửa/xóa bản ghi huyết áp bằng cách liên kết các hàm này vào phạm vi toàn cục `window`. |
| **Thư mục dự án** | `C:\Users\PC VIP\Downloads\Thong-ke` |
| **GitHub Repository** | `https://github.com/tuaniuminh/thongke.git` (nhánh `main`) |
| **Ngôn ngữ** | HTML + Vanilla JS + CSS (không dùng framework) |

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
> **Nâng cấp phiên bản (Version Bump):** Ở MỖI LẦN chỉnh sửa mã nguồn (dù là nhỏ nhất), agent **bắt buộc** phải nâng cấp số phiên bản (ví dụ từ `v4.0.18` lên `v4.0.23`) đồng loạt trong 3 file: `version.json`, `src/core/app.js` (biến `APP_VERSION`), và `index.html` (các tham số `?v=...` ở CSS/JS/Images). Việc này là cực kỳ quan trọng để đảm bảo trình duyệt tự động xóa bộ đệm (cache) và nạp code mới nhất.

> [!IMPORTANT]
> **Cập nhật Lịch sử Phiên bản:** Cùng với việc nâng cấp version, bạn bắt buộc phải thêm dòng tóm tắt thông tin các thay đổi của phiên bản mới vào bảng "Lịch sử phiên bản gần đây" trong chính file `project_summary.md` này.

> [!IMPORTANT]
> **Tính Độc Lập Giữa Các Module:** Mọi chỉnh sửa trong tính năng **Thu chi đối ngoại** tuyệt đối không được ảnh hưởng đến dữ liệu hoặc hoạt động của **Hồ sơ sức khỏe** và ngược lại. Hai phân hệ này phải hoàn toàn độc lập với nhau.

---

## 📜 Lịch sử phiên bản gần đây

| Phiên bản | Tính năng |
|-----------|-----------|
| v4.0.10 | ✅ Tối ưu giọng đọc AI (nâng giọng đọc Natural/Google, tốc độ 0.9); Thêm tùy chọn Phân tích chỉ số Huyết áp. |
| **v4.0.18** | ✅ **Tái cấu trúc (Refactoring) toàn diện:** Bóc tách file `app.js` (8000 dòng) thành các file module riêng biệt trong thư mục `src/features/` (Y tế, Thu chi). Khắc phục lỗi Import và cấu trúc lại thư mục dự án gọn gàng. |
| **v4.0.19** | ✅ **Bóc tách Thời tiết:** Di dời logic xử lý Open-Meteo API sang `src/features/thoi-tiet/thoi-tiet.js` để sẵn sàng nâng cấp. |
| **v4.0.21** | ✅ **Sửa lỗi giao diện:** Sửa lỗi popover nhập Key Gemini AI trong Hồ sơ y tế bị cắt xén (hiển thị ẩn) do thuộc tính overflow của CSS. |
| **v4.0.23** | ✅ **Sửa lỗi giao diện:** Khắc phục lỗi menu popover Gemini bị văng ra ngoài màn hình trên giao diện điện thoại (đổi `right: 0` thành `left: 0`). |
| **v4.0.24** | ✅ **Nâng cấp Quản lý thành viên & Sửa lỗi:** Thêm trường Giới tính (Nam/Nữ) và chi tiết thể trạng y tế cho thành viên; Sửa lỗi khởi tạo khiến nút "Gemini AI" và nút "Sửa" không hoạt động. |
| **v4.0.25** | ✅ **Nâng cấp Cực mạnh Cache Busting:** Áp dụng tham số truy vấn phiên bản `?v=4.0.25` cho tất cả các câu lệnh `import` mô-đun nội bộ nhằm cưỡng chế trình duyệt xóa sạch cache cũ và nạp ngay mã nguồn mới nhất. |
| **v4.0.26** | ✅ **Tinh chỉnh giao diện y tế:** Sửa lỗi tràn/đè phần tử nhập liệu Tiền sử bệnh lý lên các nút lưu của Modal thông tin thành viên; Khắc phục viền thừa (double border) trên các hộp chọn Google dịch/Tốc độ đọc; Tối ưu hóa cỡ chữ & padding cho các ô nhập liệu giúp giao diện hài hòa, cao cấp hơn. |
| **v4.0.27** | ✅ **Nâng cấp Trải nghiệm Người dùng:** Chặn cuộn nền trang (scroll lock) bằng MutationObserver khi bất kỳ modal nào đang mở; Cấu trúc lại danh sách thành viên trong Quản lý thành viên (ẩn nút 'Sửa thể trạng' khi chưa bật chế độ sửa; hiển thị nút kèm chữ rõ ràng cho 'Sao lưu' và 'Đồng bộ' khi bật sửa; xóa nút sửa tên cũ do đã tích hợp sửa tên trực tiếp trong modal chi tiết thể trạng). |
| **v4.0.28** | ✅ **Sửa lỗi đơ màn hình (Freeze Fix):** Gỡ bỏ MutationObserver trong JS để tránh vòng lặp tuần hoàn (layout loop) gây treo trình duyệt trên di động; Thay thế bằng giải pháp thuần CSS sử dụng bộ chọn giả `:has` (`body:has(.modal-overlay[style*="display: flex"])`) giúp chặn cuộn nền mượt mà, hiệu năng cao và tuyệt đối không gây đơ máy. |
| **v4.0.29** | ✅ **Nâng cấp Giao diện & Tính năng:** Chặn cuộn nền di động iOS khi vuốt ở viền modal (iOS touchmove scroll lock); Sửa lỗi căn giữa danh sách thành viên (căn lề trái thẳng hàng như Bản thân); Di chuyển nút Sao lưu, Đồng bộ, Xóa vào modal Sửa thể trạng; Nâng cấp thuật toán Sao lưu/Đồng bộ để bao gồm 100% dữ liệu (các chỉ số xét nghiệm, lịch sử huyết áp, và thông tin thể trạng). |
| **v4.0.30** | ✅ **Tối ưu hóa Bố cục Thành viên:** Căn lề trái hoàn chỉnh cho danh sách thành viên sử dụng cấu trúc Flex Row; Di chuyển nút "Xóa" trực tiếp ra ngoài danh sách khi bật chế độ Sửa; Di chuyển nút "Sao lưu" và "Đồng bộ" lên trên cùng của Modal Sửa thể trạng, bổ sung viền màu nổi bật; Loại bỏ hoàn toàn nút Xóa khỏi modal footer. |
| **v4.0.31** | ✅ **Tối ưu Bố cục Danh sách:** Chuyển đổi thẻ thành viên sang dạng cột Flex Column; Tách biệt dòng hiển thị thông tin thể trạng (độ rộng 100%, căn lề trái tự nhiên) và dòng nút hành động bên dưới khi ở chế độ Sửa; Tránh hiện tượng co hẹp chữ thông tin và lệch nút trên di động. |
| **v4.0.32** | ✅ **Sửa lỗi Camera & Tối ưu Giao diện:** Định tuyến ảnh chụp camera gốc trực tiếp qua hàm phân tích/nhận diện thông minh (`processScannedHealthImage`) thay vì tự động mở modal xét nghiệm máu (giúp nhận diện ảnh đo huyết áp chính xác từ camera); Bo tròn viền danh sách thành viên thành `12px`; Bố cục lại form thêm thành viên (nút "Thêm" đưa lên cao góc phải đối diện nhãn tên, ô nhập tên dãn rộng 100% bên dưới); Xóa bỏ nút "Đóng lại" ở footer của modal quản lý thành viên vì đã có nút X ở góc trên bên phải; Tăng chiều cao danh sách thành viên lên `380px`. |
| **v4.0.33** | ✅ **Nâng cấp tính năng Xuất PDF:** Thay thế hành vi tự động tải file xuống bằng cách mở file PDF trực tiếp trong một tab mới trên trình duyệt máy tính (thông qua Blob URL và `window.open`), giúp người dùng xem trước/in trực quan; Trên các thiết bị di động, hệ thống vẫn duy trì tải file y tế trực tiếp xuống để đảm bảo tính tương thích tốt nhất. |
| **v4.0.34** | ✅ **Cực cưỡng chế xóa Cache:** Cập nhật đồng loạt toàn bộ các tham số truy vấn cache-busting từ `?v=4.0.32` lên `?v=4.0.34` ở tất cả các file liên kết (`index.html`, `app.js`, `ho-so-y-te.js`, `thu-chi.js`), giải quyết triệt để lỗi xung đột mã nguồn cũ/mới và treo ứng dụng. |
| **v4.0.35** | ✅ **Sửa lỗi cuộn nền & tối ưu cỡ chữ:** Chặn cuộn nền triệt để khi mở các modal y tế bằng class `.active` kết hợp `:has` selector cho cả `html` và `body`; thu gọn kích thước nút "Thêm" thành viên gia đình (loại bỏ biểu tượng "+", sửa lỗi nút bị kéo giãn trên di động); đồng bộ cỡ chữ các trường nhập liệu y tế bằng với cỡ chữ tiêu đề (`0.82rem`). |
| **v4.0.36** | ✅ **Ngăn chặn cuộn nền triệt để & Thêm giờ đo huyết áp:** Cập nhật cơ chế chặn cuộn nền iOS/Safari bằng cách thêm TouchStart/TouchMove boundary-lock ở JS và `overscroll-behavior: contain` ở CSS; Tự động nhận diện thời gian tải lên/chụp ảnh để ghi nhận giờ đo huyết áp và tích hợp thêm trường "Giờ đo" vào form nhập thủ công lẫn báo cáo PDF. |
| **v4.0.37** | ✅ **Tự động nhận diện buổi đo huyết áp:** Thêm bộ lắng nghe sự kiện thay đổi Giờ đo để tự động chọn thời điểm đo tương ứng (Sáng: 5h-12h, Tối: 18h-5h, Khác: 12h-18h); Cung cấp giải thích y khoa về lý do đo huyết áp tại nhà (HBPM) chỉ cần tập trung vào buổi Sáng và Tối theo tiêu chuẩn lâm sàng quốc tế. |
| **v4.0.38** | ✅ **Sửa lỗi cuộn bảng chi tiết y tế:** Cấu trúc lại trình chặn cuộn nền di động (`touchmove`) trong JS bằng bộ tìm kiếm tổ tiên cuộn dọc động (`window.getComputedStyle`), sửa lỗi triệt để hành vi không thể cuộn bảng kết quả xét nghiệm máu khi người dùng vuốt trên các dòng bảng (do sự kiện chạm bị chặn nhầm bởi phần tử con). |
| **v4.0.39** | ✅ **Sửa lỗi mã hóa sao lưu thành viên:** Nhập trực tiếp các hàm `encrypt` và `decrypt` từ module `crypto.js` vào `ho-so-y-te.js`, khắc phục triệt để lỗi ReferenceError "Lỗi khi xuất sao lưu hồ sơ" xảy ra khi người dùng cố gắng sao lưu thông tin thành viên có sử dụng mật khẩu bảo vệ. |
| **v4.0.40** | ✅ **Giao diện đăng nhập & Khóa lối tắt:** Ẩn thẻ cài đặt/đăng nhập trang chủ khi chưa đăng nhập; hiển thị nút chữ "Đăng nhập" viền vàng ở góc phải với hiệu ứng phóng to/nhấp nháy khi bấm vào các thẻ y tế/tài chính bị khóa. Khóa/mờ các lối tắt tương ứng trên Sidebar. Chuẩn hóa tiêu đề di động trang Cài đặt có nút Trang chủ kèm nhãn chữ bên dưới. |
| **v4.0.41** | ✅ **Sửa đổi cuộn Modal y tế & Thanh cuộn giới hạn:** Khắc phục lỗi trễ cuộn danh sách thành viên trên di động bằng cách khóa cuộn modal cha. Bo tròn các nút chụp ảnh, xóa dữ liệu và hộp chỉ số. Thay đổi bộ lọc input để ẩn chụp ảnh trùng lặp trong bộ chọn ảnh. Giới hạn chiều cao và thêm thanh cuộn mượt cho danh sách huyết áp (320px) và lịch sử y tế (485px) khi có nhiều bản ghi. |
| **v4.0.42** | ✅ **Sửa cuộn danh sách & Quy định module:** Tách biệt `overscroll-behavior` cho `.table-responsive` giúp sửa lỗi cuộn danh sách thu chi đối ngoại trên máy tính (desktop) và thiết bị cảm ứng khi rê chuột; Thêm quy định thiết kế đảm bảo các chỉnh sửa của tính năng Thu chi đối ngoại không ảnh hưởng đến Hồ sơ sức khỏe và ngược lại. |
| **v4.0.43** | ✅ **Đồng bộ vuốt trang, thu gọn lịch sử & Tinh chỉnh Grid nhập chỉ số:** Đồng bộ cuộn lưới lịch sử xét nghiệm theo trang (bỏ scroll container riêng); Chỉ hiển thị 3 bản ghi y tế gần nhất kèm nút Xem thêm/Thu gọn; Ẩn bảng tóm tắt chỉ số ngoài card lịch sử y tế; Mở rộng modal nhập thủ công lên 850px và căn chỉnh 6 cột thẳng hàng ngăn nắp cho bảng nhập chỉ số trên desktop. |
| **v4.0.44** | ✅ **Đồng bộ cuộn huyết áp & Xem thêm:** Đồng bộ cuộn danh sách kết quả đo huyết áp theo trang (bỏ scroll container riêng); Chỉ hiển thị 3 kết quả đo huyết áp gần nhất và bổ sung nút Xem thêm/Thu gọn ở dưới để mở rộng danh sách khi cần. |
| **v4.0.45** | ✅ **Tích hợp Theo dõi Chỉ số Cơ thể (InBody/Accuniq) & AI:** Bổ sung phân hệ theo dõi chỉ số cơ thể toàn diện 56 trường (5 tab) có trường điền thiết bị đo và phân loại thể trạng; Cho phép cấu hình bật/tắt theo dõi cho từng thành viên; Triển khai logic CRUD, đồng bộ LWW Supabase và tích hợp báo cáo phân tích AI chuyên biệt/toàn diện. |
| **v4.0.46** | ✅ **Quét ảnh Phiếu đo Cơ thể (Accuniq/InBody) & Cảnh báo chỉ số lạ:** Cải tiến prompt Gemini Vision tự nhận diện phiếu đo cơ thể, tự động điền 56 trường; Phát hiện các chỉ số lạ ngoài danh mục, tự động điền vào Ghi chú kèm Toast cảnh báo màu vàng nổi bật. |
| **v4.0.47** | ✅ **Sửa lỗi cú pháp SyntaxError:** Khắc phục lỗi khai báo biến trùng lặp `selectedProfileId` trong hàm `renderHealthDashboard` gây treo giao diện đăng nhập. |
| **v4.0.48** | ✅ **Sửa lỗi cuộn Modal cơ thể (Accuniq/InBody):** Chuyển đổi cấu trúc modal nhập chỉ số cơ thể sang `.modal-container` chuẩn, thiết lập giới hạn `max-height: 90vh` và hỗ trợ cuộn dọc giúp hiển thị đầy đủ các nút Lưu/Hủy trên di động. |
| **v4.0.49** | ✅ **Quét gộp nhiều ảnh bằng AI (Multi-Image Scan):** Hỗ trợ chọn/kéo thả đồng thời nhiều ảnh (ví dụ: chụp nhiều trang màn hình máy đo Accuniq/InBody); Gửi gộp lên Gemini để phân tích và điền tự động hợp nhất các chỉ số cơ thể. |
| **v4.0.50** | ✅ **Sửa triệt để cuộn Modal cơ thể (Accuniq/InBody):** Loại bỏ inline style overflow:hidden cản trở và chuyển sang cuộn toàn bộ container modal; giải quyết triệt để vấn đề không cuộn được biểu mẫu thêm chỉ số thủ công trên thiết bị di động. |
| **v4.0.51** | ✅ **Sửa lỗi API mimeType:** Sửa lỗi gọi biến không tồn tại `mimeType` trong cấu hình yêu cầu của `callGeminiAPI` khi truyền dữ liệu ảnh. |
| **v4.0.52** | ✅ **Sửa hiển thị Tabs chỉ số cơ thể di động:** Thay đổi class của thanh chọn tab trong modal nhập chỉ số cơ thể để không bị đè bởi thuộc tính `display:none` của bảng nhập chỉ số y tế cũ trên di động. |
| **v4.0.53** | ✅ **Cô lập phân tích AI chỉ số cơ thể:** Sửa lỗi nút phân tích lại (Refresh) và hiển thị kết quả AI của Chỉ số cơ thể bị lẫn lộn sang dữ liệu Xét nghiệm máu & Huyết áp; đảm bảo báo cáo AI chỉ tập trung phân tích thành phần cơ thể. |
| **v4.0.54** | ✅ **Sửa lỗi sửa/xóa huyết áp:** Khắc phục lỗi `openBpModal is not defined` và `deleteBpRecord is not defined` khi bấm nút sửa/xóa bản ghi huyết áp bằng cách liên kết các hàm này vào phạm vi toàn cục `window`. |

---

## 🚀 Git & Triển khai

> [!CAUTION]
> **KHÔNG tự động đẩy lên GitHub.** AI tuyệt đối không chạy lệnh `git push`. Người dùng tự đẩy code sau. Chỉ dùng `git add` và `git commit` khi được yêu cầu.

