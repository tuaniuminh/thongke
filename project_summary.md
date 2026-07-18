# 📋 Tóm Tắt Dự Án FamiLife – Tài liệu chuyển giao cho cuộc trò chuyện mới

## 🗂 Thông tin dự án

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | FamiLife – Thu Chi & Sức Khỏe Gia Đình |
| **Phiên bản hiện tại** | **v4.2.02** |
| **v4.2.02** | ✅ **Sửa lỗi kích hoạt Dark Mode, khôi phục Light Mode mặc định & Cải tiến độ nhạy thả tim (Theme fixes & Float heart responsiveness improvements)**: (1) Sửa lỗi giao diện tối của WeLove không tự động kích hoạt (do FamiLife kiểm soát theme qua lớp `.light-mode` trên thẻ body thay vì thẻ thuộc tính `data-theme`). Thiết lập hiển thị màu tối bằng bộ lọc loại trừ `body:not(.light-mode) .memory-page`. (2) Khôi phục lại giao diện sáng mặc định của WeLove về trạng thái nền trong suốt nguyên bản. (3) Khắc phục lỗi trễ 300ms khi bấm thả tim liên tục trên di động (được gây ra bởi cử chỉ Double Tap to Zoom mặc định của trình duyệt) bằng cách chuyển đổi hoàn toàn sự kiện lắng nghe từ `click` sang `pointerdown` giúp tim bay liên tục tức thì. Bơm cache-busting `v4.2.02` cho toàn bộ module. |
| **v4.2.01** | ✅ **Khôi phục giao diện tối gốc của love-only-app cho WeLove (Original Dark/Light Theme variables & Gradient backgrounds restoration)**: (1) Khai báo cục bộ hệ thống CSS tokens (gồm `--bg-primary`, `--bg-secondary`, `--bg-gradient`, `--glass-bg`, `--glass-border`, `--glass-shadow`...) của dự án gốc `love-only-app` trực tiếp bên trong vùng bao `.memory-page` để cách ly hoàn toàn phong cách thiết kế của WeLove với ứng dụng mẹ FamiLife. (2) Phục hồi hình nền gradient chuyển sắc lãng mạn cho cả Light theme và Dark theme (gradient 135 độ kết hợp xanh đậm Indigo, tím Deep Purple và đỏ mận Crimson khi ở giao diện tối). Bơm cache-busting `v4.2.01` cho toàn bộ module. |
| **v4.2.00** | ✅ **Xóa bỏ hoàn toàn cụm nút tab cũ ở góc phải Header trên máy tính (Desktop Header Tabs removal)**: (1) Loại bỏ triệt để khối HTML `#headerWeLoveTabs` chứa các nút Kỷ niệm, Lịch nhắc, Quản lý ở góc phải thanh tiêu đề trên giao diện máy tính để tránh trùng lặp dư thừa với thanh Sidebar điều hướng dọc vừa được cải tiến. (2) Loại bỏ toàn bộ logic bật/tắt hiển thị và đồng bộ trạng thái kích hoạt của cụm nút này trong `app.js` và `we-love.js`. Bơm cache-busting `v4.2.00` cho toàn bộ module. |
| **v4.1.99** | ✅ **Cải tiến Sidebar máy tính cho WeLove & Đồng bộ hóa định tuyến phụ (Sidebar navigation sub-menus & Routing integration)**: (1) Tích hợp các tab phụ "Lịch nhắc" và "Quản lý" của WeLove trực tiếp vào thanh điều hướng bên trái (Sidebar) trên giao diện máy tính thành các liên kết điều hướng riêng biệt, loại bỏ cụm nút phụ ở góc phải header. (2) Tích hợp hoàn toàn các định tuyến `welove-admin` và `welove-settings` vào hệ thống chuyển tab chính `switchTab()`, giúp đồng bộ hóa vùng hiển thị active trên thanh sidebar và tiêu đề trang tương ứng. (3) Cập nhật kiểm tra và tự động chuyển hướng sang `welove-settings` nếu người dùng chưa thiết lập ngày tình yêu bắt đầu. Bơm cache-busting `v4.1.99` cho toàn bộ module. |
| **v4.1.98** | ✅ **Xóa bỏ các nút tab dư thừa ở thân trang & Sửa triệt để Navbar hiển thị WeLove (Inline Tabs removal & Navbar Fix)**: (1) Loại bỏ hoàn toàn khối HTML `.welove-subview-tabs` chứa 3 nút Kỷ niệm, Lịch nhắc, Thiết lập ở giữa trang trên cả máy tính và điện thoại để thống nhất trải nghiệm chuyển tab trên thanh Navbar (Header). (2) Khắc phục lỗi còn dính tiêu đề "Góc tình yêu" trên sidebar máy tính, navbar di động và header page title; chuyển đổi hoàn toàn sang tên thương hiệu thống nhất là **"WeLove"**. Bơm cache-busting `v4.1.98` cho toàn bộ module. |
| **v4.1.97** | ✅ **Đồng bộ hóa giao diện WeLove & Cải tiến Navbar trên máy tính (WeLove Synchronized Tabs & UI refinement)**: (1) Thay đổi tên hiển thị "Góc tình yêu" thành "WeLove" trên cả Sidebar desktop và Navbar mobile. (2) Đổi tiêu đề phần nội dung thành "Kỷ Niệm Tình Yêu" và câu khẩu hiệu thành "Hành trình gieo bình yên, hái hạnh phúc". (3) Bỏ các nút lựa chọn tab con "Kỷ niệm", "Lịch nhắc", "Quản lý" ở thân trang trên giao diện di động (vì đã có trên navbar mobile) và đồng bộ hóa hiển thị các tab này lên thanh đầu trang (Desktop Header) khi sử dụng trên máy tính. (4) Xóa hoàn toàn tên "Linh Tuấn ❤️ Ngô Minh" mặc định trên widget trang chủ chính, thay thế bằng biệt danh động sau khi cấu hình trong WeLove hoặc hiển thị chữ mặc định "WeLove". Bơm cache-busting `v4.1.97` cho toàn bộ module. |
| **v4.1.96** | ✅ **Nâng cấp Góc Tình Yêu & Khắc phục hoàn toàn Navbar của WeLove (Love Corner Setup & Navbar Correction)**: (1) Sửa lỗi hiển thị Navbar/Tabbar trên di động hiển thị "Thu Chi Đối Ngoại" khi ở WeLove; chuyển tiêu đề thành "Góc tình yêu" cùng 3 nút điều hướng tab con Kỷ niệm, Lịch nhắc và Quản lý đồng bộ. (2) Bỏ mốc mặc định ngày 03/09/2025 và tên Linh Tuấn, Ngô Minh. Bổ sung 2 ô nhập tên trong Thiết lập Góc tình yêu. (3) Đặt cấu hình mặc định tự chuyển hướng sang view Thiết lập (Settings) ở lần đầu tiên truy cập nếu chưa cài đặt ngày tình yêu bắt đầu. Bơm cache-busting `v4.1.96` cho toàn bộ module. |
| **v4.1.95** | ✅ **Sửa lỗi hiển thị Hồ Sơ Y Tế & Nâng cấp góc Quản lý WeLove (Medical UI Fix & WeLove Management View)**: (1) Thay đổi toàn bộ class namespace trong `we-love.css` và `we-love.js` từ `.health-` sang `.welove-` để khắc phục lỗi xung đột css đè hỏng màu đỏ và làm mất viền nút xuất pdf, quản lý thành viên, gemini ai trong module Hồ Sơ Y Tế. (2) Bổ sung tab Thiết lập góc yêu (Settings Subview) trong WeLove: Cho phép người dùng tùy chọn Ngày bắt đầu yêu nhau thay đổi bộ đếm ngày, nút mời bạn tình tham gia (`spouseEmail`) và nút gạt bật/tắt hiển thị Sổ tay sức khỏe em yêu. (3) Định nghĩa quy tắc ẩn/hiện menu con trên sidebar/navbar khi ở tab WeLove để không hiện menu của Thu Chi Đối Ngoại. Bơm cache-busting `v4.1.95` cho toàn bộ module. |
| **v4.1.94** | ✅ **Tích hợp tính năng WeLove & Nút Bật/Tắt trong Cài đặt (WeLove Integration & Toggle Switch)**: Tích hợp góc kỷ niệm WeLove đếm ngày yêu nhau (mốc ngày 03/09/2025), câu nói tình yêu dạng vuốt trượt, trình phát nhạc lãng mạn nền bài hát *Một Đời* (có Media Session API màn hình khóa). Tái cấu trúc và thiết kế lại cơ chế lưu trữ: Chuyển hoàn toàn từ việc truy vấn trực tiếp bảng dữ liệu Supabase riêng lẻ `tuanminh_wedding_rsvps` sang tích hợp đồng bộ trực tiếp vào đối tượng trạng thái `state` toàn cục của FamiLife, tự động mã hóa đầu cuối (E2EE) qua Master Password và đồng bộ đồng thời lên đám mây thông qua tiến trình Sync của FamiLife. Bổ sung nút gạt bật/tắt hiển thị Widget 2 trái tim nảy động ở trang chủ chính trong tab Cài đặt, tự động lưu trữ cấu hình. Bơm cache-busting `v4.1.94` cho toàn bộ module. |
| **v4.1.93** | ✅ **Ẩn hoàn toàn chỉ báo cuộn native trên iOS (Native iOS Scroll Indicators Hiding)**: Khắc phục triệt để lỗi thanh cuộn native vẫn hiển thị trên bản cài đặt IPA mặc dù đã có CSS ẩn. Cập nhật mã nguồn Swift được swizzle trong `update-xcode-version.py` để gán `showsVerticalScrollIndicator = false` and `showsHorizontalScrollIndicator = false` cho `scrollView` chính của WKWebView và tất cả subviews `UIScrollView` của nó. |
| **v4.1.92** | ✅ **Ẩn thanh cuộn toàn cục & Nâng cấp chẩn đoán lỗi cuộn (Scrollbar Hiding & Diagnostics Upgrade)**: (1) Thiết lập CSS ẩn thanh cuộn toàn cục bằng selector `*::-webkit-scrollbar` và `scrollbar-width: none` đảm bảo không hiển thị thanh cuộn trên WKWebView iOS (IPA) và Web PWA nhưng vẫn giữ chức năng cuộn mượt mà. (2) Nâng cấp hàm `logScrollDiagnostics()` chèn kiểm tra thực nghiệm (System Scrollbar Dimension Test): tạo div scroll tạm thời để đo kích thước thanh cuộn thực tế của WebKit render, đưa ra cảnh báo đỏ cụ thể nếu thanh cuộn không được ẩn thành công. (3) Bổ sung quét và đo lường kích thước cuộn thực tế (`scrollHeight`, `clientHeight`, `scrollableY`) của các container chính trong app để dễ dàng định vị lỗi layout. |
| **v4.1.91** | ✅ **Nâng cấp tính năng Uống thuốc tẩy giun & Lấy cao răng (Deworming Scheduling & Label Translation Upgrade)**: (1) Thay đổi nhãn Ngày xét nghiệm thành "Ngày uống thuốc" đối với loại Tẩy giun và "Ngày lấy cao răng" đối với loại Lấy cao răng trên cả biểu mẫu và chi tiết. (2) Bổ sung trường nhập Tên loại thuốc, chu kỳ nhắc nhở (4 tháng / 6 tháng) và tự động tính toán ngày uống tiếp theo khi thay đổi ngày/chu kỳ. (3) Ẩn trường ghi chú bác sĩ đối với Uống thuốc tẩy giun để tối giản. (4) Tích hợp khối thông tin chi tiết Lịch trình uống thuốc tẩy giun, ẩn bảng chỉ số xét nghiệm và ẩn nơi khám trong modal chi tiết của Uống thuốc tẩy giun. |
| **v4.1.90** | ✅ **Tối ưu hóa biểu mẫu y tế dựa trên phân loại dịch vụ (Medical Form Field Auto-Toggling & Layout Optimization)**: Khắc phục lỗi khi chọn "Uống thuốc tẩy giun" và "Lấy cao răng" vẫn hiển thị bảng chỉ số xét nghiệm trống gây lỗi validate HTML5. (1) Thiết lập hàm `updateHealthFormFields()` tự động ẩn danh sách chỉ số xét nghiệm và dọn dẹp indicators rows. (2) Tự động điền tiêu đề hồ sơ và ẩn trường tiêu đề. (3) Ẩn hoàn toàn trường "Bệnh viện / Phòng khám" đối với loại Tẩy giun và đổi nhãn thành "Phòng khám Nha khoa" đối với loại Lấy cao răng. (4) Tự động tính toán và cập nhật cấu trúc cột CSS Grid tương ứng. |
| **v4.1.89** | ✅ **Thêm loại Hồ sơ y tế mới, Rung phản hồi toàn cục & Bản địa hóa Camera iOS**: (1) Thêm phân loại "Uống thuốc tẩy giun" (`deworming`) và "Lấy cao răng" (`dental_scaling`) vào Hồ sơ y tế, cập nhật giao diện form thêm hồ sơ thủ công, hàm lấy nhãn tiếng Việt và prompt AI. (2) Chuyển cấu trúc rung xúc giác sang dạng lắng nghe sự kiện `click` toàn cục trong `app.js` để tự động rung nhẹ cho tất cả nút bấm hiện tại và tương lai của app. (3) Bổ sung cấu hình `CFBundleDevelopmentRegion = vi` và `CFBundleLocalizations` tiếng Việt vào file `Info.plist` của Xcode qua Python build script để ép camera gốc và các thành phần native of iOS hiển thị ngôn ngữ tiếng Việt. |
| **v4.1.88** | ✅ **Đồng bộ hóa phiên bản build Xcode trong update-xcode-version.py (Xcode Versioning Sync Fix)**: Sửa đổi kịch bản build `update-xcode-version.py` để đọc số phiên bản trực tiếp từ tệp `version.json` thay vì `package.json`. Điều này khắc phục lỗi bản cài đặt iOS IPA hiển thị phiên bản cũ `.85` do tệp `package.json` không được nâng cấp đồng loạt, giúp số phiên bản khi cài đặt app đồng bộ hoàn toàn với phiên bản mã nguồn. |
| **v4.1.87** | ✅ **Hotfix lỗi cú pháp export trong app.js (Duplicate Export Bug Fix)**: Sửa lỗi cú pháp `SyntaxError: Cannot export a duplicate name 'triggerHapticFeedback'` bằng cách loại bỏ lệnh export trùng lặp trong tệp `app.js` để ứng dụng khởi chạy bình thường. |
| **v4.1.86** | ✅ **Sửa viền tab di động, đổi vị trí nút Sửa/Xóa, cấu hình Camera iOS & Tích hợp rung phản hồi xúc giác (Haptic Feedback)**: (1) Sửa lỗi khuyết viền trái của tab "Tổng quan" trên điện thoại bằng cách đổi flexbox justify thành `flex-start` và áp dụng `flex-grow` cho các tab chữ. (2) Chuyển 2 nút "Sửa" và "Xóa" của Huyết áp & Chỉ số cơ thể xuống dòng dưới của card khi active để không làm ảnh hưởng hiển thị chữ. (3) Bổ sung quyền Camera và Photo Library vào tệp `Info.plist` cho bản iOS IPA qua Python build script. (4) Tích hợp plugin `@capacitor/haptics` và phát triển hàm `triggerHapticFeedback` rung xúc giác thông minh cho cả iOS IPA, Android APK và Web PWA (rung khi bấm PIN pad, chuyển tab di động, và rung phản hồi/cảnh báo khi xuất hiện Toast). |
| **v4.1.85** | ✅ **Hoàn tác Tab Quản lý về biểu tượng sliders (Revert to Sliders Icon Tab Migration)**: Hoàn tác biểu tượng Cờ lê lồng Bánh răng vẽ bằng SVG và khôi phục lại việc sử dụng biểu tượng `sliders` chuẩn của thư viện Lucide trong phân hệ Thu Chi Đối Ngoại di động theo yêu cầu của người dùng để giữ nguyên tính đồng bộ thẩm mỹ. |
| **v4.1.84** | ✅ **Cập nhật biểu tượng tab 'Quản lý' thành hình Cờ lê lồng Bánh răng (Custom Gear-Wrench Inline SVG Navigation Icon)**: Cập nhật icon sliders của tab Quản lý trên thanh điều hướng mobile thành biểu tượng Cờ lê lồng Bánh răng (Gear & Wrench) theo đúng hình ảnh yêu cầu. Sử dụng mã vẽ SVG vector nội tuyến tinh giản (`stroke="currentColor"`) để tự động đồng bộ màu theo trạng thái Active (xanh ngọc khi chọn, xám tối khi không chọn) đảm bảo tính thẩm mỹ cao nhất. |
| **v4.1.83** | ✅ **Di chuyển toàn bộ hộp thoại xác nhận xóa trong Hồ Sơ Y Tế sang Dialog Custom (Health Profile Confirmation Dialogs Migration)**: Khắc phục lỗi khi xóa dữ liệu trong mục Hồ sơ y tế hiển thị hộp thoại pop-up native của trình duyệt thay vì hộp thoại custom đẹp mắt của ứng dụng. Tôi đã chuyển đổi toàn bộ 7 vị trí sử dụng hàm `confirm()` gốc của trình duyệt (bao gồm: xóa thành viên, nhập sao lưu, xác nhận ghi đè phân tích AI, xóa kết quả xét nghiệm, xóa lịch sử huyết áp, xóa chỉ số cơ thể) sang hàm bất đồng bộ `await window.showConfirm()` dùng chung của hệ thống. Giúp giao diện xác nhận đồng bộ 100% về mặt thẩm mỹ cao cấp của FamiLife. |
| **v4.1.82** | ✅ **Thay đổi tab 'Quản lý' thành icon 'sliders' trên thanh điều hướng mobile (Mobile Navbar Tab Layout Optimization)**: Tối ưu hóa không gian hiển thị trên màn hình điện thoại trong phân hệ Thu Chi Đối Ngoại bằng cách thay thế nhãn chữ "Quản lý" (thường bị co hẹp hoặc xuống hàng trên các dòng máy màn hình nhỏ) bằng biểu tượng thanh trượt cấu hình `sliders` của thư viện Lucide. Tab được căn chỉnh dạng `inline-flex` nằm ngang cân đối với các tab chữ còn lại, giúp thanh điều hướng gọn gàng, tinh tế và chuyên nghiệp hơn. |
| **v4.1.81** | ✅ **Tích hợp Web Share API cho tính năng Xuất Excel & Xuất PDF trên iOS IPA/PWA (Native Document Sharing Fallbacks)**: Khắc phục triệt để lỗi không tải được file trên iOS WebView (do WKWebView chặn các liên kết tải xuống dạng Blob và `<a download>`). (1) Cập nhật hàm `handleExportExcel` trong `thu-chi.js` để đóng gói dữ liệu Workbook của SheetJS thành tệp `File` vật lý và gọi `navigator.share` mở hộp thoại chia sẻ hệ thống (cho phép lưu vào Tệp, gửi qua Zalo/Messenger/Mail). (2) Cập nhật hàm `exportHealthPDF` trong `ho-so-y-te.js` thực hiện logic tương tự cho file báo cáo PDF. (3) Cơ chế tự động fallback về luồng tải xuống HTML5 truyền thống đối với các nền tảng desktop. |
| **v4.1.80** | ✅ **Đồng bộ màu nền siêu tốc ngay khi khởi chạy (High-Speed Initial Theme Sync & Solid Rendering Fix)**: Do việc đoán giao diện qua hệ điều hành có thể bị sai nếu người dùng bật Dark Mode hệ thống nhưng dùng Light Mode trong ứng dụng, phiên bản này triển khai cơ chế đồng bộ thích ứng siêu tốc. (1) Thiết lập một bộ hẹn giờ tần suất cao (mỗi 0.1 giây chạy 1 lần trong 3 giây đầu) để liên tục kiểm tra khi nào DOM và CSS sẵn sàng. (2) Ngay khi nhận được màu nền của body (chỉ mất ~100-200ms), áp dụng ngay lập tức dạng màu đặc (Solid Color, khôi phục `isOpaque = true` của WKWebView) cho cả WebView, ScrollView và View gốc. (3) Sau 3 giây, tự động huỷ timer tần suất cao và chuyển sang timer chậm (2 giây/lần) để tiết kiệm pin. Nhờ đó, triệt tiêu 100% vệt đen khi vuốt cuộn ngay khi vừa mở ứng dụng. |
| **v4.1.79** | ✅ **Đồng bộ màu nền đàn hồi (Dynamic Background Bounce Color Sync via Swift Timer)**: Sửa lỗi khoảng đệm nảy hiển thị nền đen bằng cách cập nhật kịch bản Python (`update-xcode-version.py`) để thêm tiến trình hẹn giờ `Timer.scheduledTimer` chạy mỗi 1.5 giây trong `AppDelegate.swift`. Tiến trình này tự động truy vấn màu nền CSS thực tế của `document.body` thông qua `evaluateJavaScript` và áp dụng màu đó đồng bộ cho cả `webView.backgroundColor`, `webView.scrollView.backgroundColor` và `viewController.view.backgroundColor`. Nhờ đó, phần rìa nảy luôn khớp hoàn hảo với màu nền giao diện (sáng/tối) tương tự như phiên bản PWA. |
| **v4.1.78** | ✅ **Kích hoạt cuộn đàn hồi native qua Swizzling AppDelegate.swift (Objective-C Runtime Swizzler & iOS Build Fix)**: Do Capacitor 6 không sinh file `ViewController.swift` ở bản mẫu mặc định (nút gốc được map thẳng vào thư viện Capacitor), tôi đã cấu hình kịch bản Python (`update-xcode-version.py`) để sửa đổi tệp gốc `AppDelegate.swift` (tệp luôn tồn tại và đã được đăng ký biên dịch). Sử dụng kỹ thuật **Objective-C Runtime Method Swizzling** để hoán đổi hàm `viewDidAppear` của `UIViewController`. Khi ứng dụng chạy và khởi tạo `CAPBridgeViewController`, mã swizzler sẽ tự động bắt lấy, cấu hình `bounces = true` cho WKWebView và gửi log phản hồi lên Debug Console mà không cần tạo file mới hay làm hỏng cấu hình Xcode Project. |
| **v4.1.77** | ✅ **Đồng bộ kiểm tra log từ mã nguồn native Swift lên Debug Console (Bridge WebView Native Logger & Lifecycle Swift Uprides)**: (1) Cấu hình mã nguồn native Swift (`ViewController.swift` thông qua `update-xcode-version.py`) sử dụng lệnh `webView.evaluateJavaScript()` để in trực tiếp các trạng thái cấu hình cuộn `bounces` và `alwaysBounceVertical` của WKWebView lên giao diện "Con bọ" của ứng dụng. (2) Override thêm hook `capacitorDidLoad()` để đảm bảo kích hoạt cuộn nảy ngay khi cầu nối Capacitor hoàn tất khởi tạo. (3) Bổ sung vòng lặp kiểm tra và áp dụng liên tục tại nhiều điểm trễ (0.5s, 1s, 2s, 3s, 5s, 8s) để đè bẹp hoàn toàn bất kỳ lệnh tắt cuộn nào từ lõi Capacitor. |
| **v4.1.76** | ✅ **Bổ sung tính năng Xuất File Log (.txt) trong Debug Console (Debug Console Log Exporter via Web Share API)**: (1) Tích hợp thêm nút "Xuất log" kế bên nút "Xóa log" trong giao diện Debug Console của `index.html`. (2) Sử dụng Web Share API (`navigator.share`) để mở hộp thoại chia sẻ hệ thống trên các thiết bị di động (cho phép gửi file log qua Zalo, Messenger, Mail hoặc chọn "Lưu vào Tệp"). (3) Tích hợp cơ chế tự động chuyển hướng về phương pháp tải xuống HTML5 truyền thống đối với các trình duyệt trên máy tính không hỗ trợ Share API. |
| **v4.1.75** | ✅ **Nâng cấp Debug Console gỡ lỗi cuộn trang thực tế (Real-Time Touch/Scroll Diagnostics & Debug Console Upgrades)**: Bổ sung module chẩn đoán lỗi cuộn `logScrollDiagnostics()` vào sự kiện khởi chạy `initializeApp()` trong `app.js` để in toàn bộ cấu hình kích thước và CSS của viewport, html, body và các layout chính trực tiếp lên bảng gỡ lỗi "Con bọ". Đồng thời nâng cấp các hàm bắt sự kiện `touchstart`/`touchmove` để ghi nhận chi tiết theo thời gian thực (real-time logs) mỗi khi cử chỉ cuộn bị ngăn chặn (prevented) và lý do ngăn chặn (do modal/overlay ẩn hay hiện). Giúp kiểm soát và phát hiện 100% nguyên nhân cản trở cuộn đàn hồi trên iOS IPA. |
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
| **v4.1.52** | ✅ **Sửa lỗi Compile & Kích hoạt vuốt native iOS thực tế trong Xcode**: Cập nhật tệp python `update-xcode-version.py` để tự động chèn cấu hình `self.webView?.allowsBackForwardNavigationGestures = true` trực tiếp vào file native Swift `ViewController.swift` của iOS project khi build trên GitHub Actions. Việc này đảm bảo tính năng cử chỉ vuốt lùi native của Apple được kích hoạt và compile thực tế thành công 100%. |
| **v4.1.51** | ✅ **Kích hoạt cử chỉ vuốt lùi native iOS (allowsBackForwardNavigationGestures):** (1) Cấu hình thuộc tính `server.iosScheme: "http"` và `server.hostname: "localhost"` trong `capacitor.config.json` để chạy native app qua giao thức HTTP cục bộ, cho phép iOS bật cử chỉ vuốt trượt lùi trang chuẩn của hệ thống y hệt ứng dụng Cài đặt. (2) Xóa bỏ hoàn toàn bộ vuốt giả lập bằng JavaScript trong `app.js` để tránh xung đột với cử chỉ native. |
| **v4.1.50** | ✅ **Hỗ trợ vuốt trượt lùi về Trang chủ (Swipe to Home):** (1) Mở rộng logic cử chỉ vuốt mép trái trượt toàn bộ khung ứng dụng con `#appLayout` làm lộ Trang chủ `#homeLayout` bên dưới khi lịch sử tab con trống, cho phép quay về Trang chủ mượt mà bám tay 100%. (2) Tăng vùng nhạy cảm chạm mép từ `35px` lên thành `45px` để tối ưu hóa nhận diện trên thiết bị dùng bao da, ốp lưng hoặc cường lực dày. |
| **v4.1.49** | ✅ **Tự lập trình cử chỉ vuốt trượt bám tay (Interactive Swipe Back):** Tích hợp touch events (`touchstart`/`touchmove`/`touchend`) kết hợp CSS Transform dịch chuyển thẻ `.tab-panel` bám sát theo chuyển động ngón tay, có parallax nền mờ phía dưới và đổ bóng vật lý y hệt cử chỉ native iOS, đồng thời bảo toàn 100% dữ liệu LocalStorage. |
| **v4.1.48** | ✅ **Sửa lỗi đè Status Bar trên các trang chức năng iOS:** Gán cứng `padding-top: 54px !important;` cho thanh điều hướng di động `.mobile-navbar` trên iOS để tránh việc tiêu đề trang và nút ngôi nhà "Trang chủ" bị đè bởi vạch pin và giờ giấc của iPhone. |
| **v4.1.47** | ✅ **Sửa lỗi đè logo FamiLife trên iOS:** Tăng khoảng đệm `padding-top` của trang chủ `.home-layout` từ `110px` lên thành `154px` (cộng thêm 44px) trên thiết bị di động iOS để giải phóng không gian, tránh việc widget thời tiết/lịch âm đè lên phần trên của logo sau khi dịch chuyển. |
| **v4.1.46** | ✅ **Sửa triệt để đè Status Bar iOS (Xử lý lỗi env):** (1) Loại bỏ hoàn toàn dynamic `env()` và `calc()` trong style chèn JS để tránh lỗi trình duyệt tính toán sai lệch safe area trả về 0px. (2) Gán cứng offset `64px`/`94px`/`109px` trực tiếp cho iOS/Capacitor environment. (3) Mở rộng điều kiện kiểm tra isIOSDevice bao gồm touch capability và local files path. |
| **v4.1.45** | ✅ **Bộ nhận diện iOS Bulletproof:** (1) Bổ sung nhận diện bằng check local native protocol `capacitor:` và Apple Desktop Touch Emulation để phát hiện chính xác môi trường iOS trong mọi điều kiện (kể cả khi TrollStore hoặc Capacitor giả lập userAgent Desktop). (2) Tối ưu hóa đặt tên file zip đóng gói đầu ra theo phiên bản trên CI/CD. |
| **v4.1.44** | ✅ **Sửa triệt để Safe Area & Tối ưu vuốt mép iOS:** (1) Bỏ qua cache CSS bằng cách tự động chèn thẻ `<style>` Safe Area động qua JS vào `<head>`. (2) Tăng độ nhạy cử chỉ vuốt mép trái (`diffX > 50px`) và bổ sung hiệu ứng transition `.tab-panel` fade-in mượt mà khi chuyển đổi tab. (3) Đặt tên file zip đóng gói trên CI/CD theo phiên bản (ví dụ: `FamiLife-iOS_v4.1.44.zip`). |
| **v4.1.43** | ✅ **Bảo mật & Fallback giao diện iOS:** (1) Thêm offset đệm cứng `64px`/`94px`/`109px` làm fallback dự phòng cho CSS Safe Area nếu WKWebView trả về safe-area metrics bằng 0. (2) Đồng bộ hóa tên đóng gói tự động cho file cài đặt Android. |
| **v4.1.42** | ✅ **Sửa lỗi Vuốt mép & Safe Area iOS:** (1) Tự code phát hiện thiết bị iOS để gán class `ios-device` và áp dụng đệm status-bar `env(safe-area-inset-top, 44px)` dự phòng lỗi Safe Area. (2) Tự code bộ lắng nghe touch gestures (`touchstart`/`touchend`) bằng JS để nhận diện vuốt mép trái quay lại trên Single Page App dùng Hash Router. (3) Nâng cấp cấu hình Android build. |
| **v4.1.41** | ✅ **Sửa lỗi giao diện iOS & Đóng gói tự động:** (1) Fix lỗi status bar overlap đè nội dung trên iOS tai thỏ bằng CSS Safe Area. (2) Chuyển logo app icon sang logo sáng. (3) Bật tính năng vuốt mép trái để quay lại. (4) Tự động hóa đổi tên file IPA đầu ra theo version (ví dụ: `FamiLife_v4.1.41.ipa`). |
| **v4.1.40** | ✅ **Sửa lỗi chặn đồng bộ (Master Password chưa thiết lập) do sai lệch phiên bản import:** Cập nhật đồng bộ tham số truy vấn ở đầu tệp `bao-cao-thang.js` từ `?v=4.1.30` thành `?v=4.1.40`. Lỗi lệch phiên bản trước đó khiến trình duyệt tải một thực thể `app.js` độc lập, làm phân mảnh và khởi tạo một `state` thứ hai có `masterPassword` rỗng, dẫn đến cảnh báo chặn đồng bộ khi gọi các tác vụ từ tệp báo cáo tháng. |
| **v4.1.39** | ✅ **Sửa lỗi tự động đăng xuất trên điện thoại & Ẩn con bọ gỡ lỗi trên mobile:** (1) Sửa đổi cơ chế cache trong Service Worker (`sw.js`) để **lưu bộ nhớ đệm (Cache-First) toàn bộ thư viện CDN tĩnh** (`cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`) thay vì bypass. Điều này đảm bảo Supabase client, Chart.js, Lucide... luôn tải được tức thì trên điện thoại khi mạng chập chờn/offline, chặn đứng lỗi Supabase không tải được gây mất session đăng nhập. (2) Sử dụng Media Query CSS ẩn hoàn toàn nút nổi 🐞 Debug Console trên màn hình điện thoại (chiều rộng nhỏ hơn 768px), chỉ hiển thị trên máy tính. |
| **v4.1.38** | ✅ **Di chuyển con bọ gỡ lỗi (Debug Console Button) sang bên trái:** Điều chỉnh lại CSS của class `.debug-console-toggle-btn` trong `style.css` từ `right: 20px;` thành `left: 20px;` giúp nút nổi gỡ lỗi hiển thị ở góc dưới bên trái màn hình để không che khuất các phần tử giao diện quan trọng khác ở bên phải. |
| **v4.1.37** | ✅ **Bảng điều khiển gỡ lỗi (Debug Console) trên màn hình:** (1) Bẫy lỗi toàn cục (`error`, `unhandledrejection`) và chặn toàn bộ các phương thức `console.log`, `console.warn`, `console.error` để ghi nhận nhật ký hoạt động. (2) Thiết kế một **Debug Console** dạng ngăn kéo trượt (drawer) màu tối cao cấp nằm ở góc màn hình để theo dõi log trực tiếp, kèm badge đỏ đếm số lỗi thực tế phát sinh. (3) Thêm switch toggle trong phần Cài đặt và ngay trên panel gỡ lỗi giúp bật/tắt hiển thị tính năng này dễ dàng trong tương lai, mặc định kích hoạt để tiện theo dõi. |
| **v4.1.36** | ✅ **Sửa lỗi tự động đăng xuất khi reload trang:** Khôi phục lại cấu hình khởi tạo mặc định của Supabase client (gỡ bỏ `storageKey: 'familife_supabase_auth'` custom). Việc thay đổi storageKey trước đó khiến Supabase không tìm thấy session lưu trữ cũ của người dùng ở key mặc định, dẫn tới việc tự động đăng xuất mỗi khi tải lại trang. Singleton pattern vẫn được duy trì để loại bỏ hoàn toàn cảnh báo Multiple GoTrueClient. |
| **v4.1.35** | ✅ **Sửa lỗi trùng lặp export `getLocalDateString` gây lỗi SyntaxError:** Loại bỏ từ khóa `export` trực tiếp ở hàm khai báo `getLocalDateString()` trong `app.js`, chỉ giữ lại việc export một lần ở khối named exports cuối file. Sửa triệt để lỗi đứng ứng dụng (crash đỏ) khi mở trang. |
| **v4.1.34** | ✅ **Sửa lỗi múi giờ ngày mặc định toàn cục:** Chuyển `getLocalDateString()` thành hàm **tiện ích chung** được export từ `app.js`, thông qua `getDate()/getMonth()/getFullYear()` (giờ địa phương) thay vì `toISOString()` (giờ UTC). Sửa toàn bộ các module bị lỗi: `quy-gia-dinh.js` (8 chỗ), `thu-chi.js` (2 chỗ), `ho-so-y-te.js` (9 chỗ) — tổng 19 điểm. Trước 7h sáng giờ Việt Nam, các modal Thêm mới, Đóng góp, Chi tiêu, Huyết áp, Thành phần cơ thể đều hiển thị đúng ngày hiện tại. |
| **v4.1.33** | ✅ **Sửa lỗi ngày mặc định sai múi giờ trong Quỹ Gia Đình:** Thêm hàm `getLocalDateString()` trả về ngày địa phương (VN UTC+7) thông qua `getFullYear()/getMonth()/getDate()` — thay thế hoàn toàn `new Date().toISOString().split('T')[0]` tại 8 điểm trong `quy-gia-dinh.js` (4 modal mở và 4 form fallback). Trước 7h sáng giờ Việt Nam, `toISOString()` trả về ngày UTC là ngày hôm qua khiến người dùng thấy ngày sai trong modal Đóng góp / Chi tiêu / Chuyển tiền / Đầu tư. |
| **v4.1.32** | ✅ **Loại bỏ hoàn toàn cảnh báo Multiple GoTrueClient:** (1) Thêm `storageKey: 'familife_supabase_auth'` + `persistSession + autoRefreshToken` vào `createClient` options. (2) **Window-level singleton pattern** — lưu Supabase instance lên `window.__famiLifeSupabase` để tồn tại xuyên suốt module re-execution sau khi Service Worker kích hoạt (nguyên nhân gốc rễ: SW reset module state → `supabase = null` → `renderSettings()` trong `thu-chi.js` thấy `!isConfigured()` và gọi `createClient()` lần 2 → GoTrueClient #2 ra đời → cảnh báo). |
| **v4.1.31** | ✅ **Vá 8 lỗ hổng bảo mật + Bật PWA Service Worker:** (1) **Brute-force protection** — khóa nhập PIN/mật khẩu tạm thời sau 3 lần sai (30s → 5p → 15p), áp dụng trên cả keypad T9, form text và auto-unlock. (2) **XSS safe toast** — `showToast` dùng `textContent` + DOM API thay vì `innerHTML` để chặn script injection từ error messages. (3) **E2EE entropy cao** — `fundSymmetricKey` sinh bằng `crypto.getRandomValues(Uint8Array(32))` thay vì `generateId()+generateId()`. (4) **Fix mất data khi đổi mật khẩu** — `handleChangePassword` gọi `performSync(true)` đầy đủ thay vì tự build payload 2-field. (5) **E2EE debug logs ẩn sau flag** — thêm `DEBUG_E2EE = false` flag, bọc 4 console.log tiết lộ email vào flag, tắt mặc định trong production. (6) **Fix circular import** — xóa `import { state } from app.js` khỏi `sync.js`, truyền `publicKey` qua tham số `saveSyncData(encryptedData, publicKey)`. (7) **`reportAiInsights` đồng bộ đúng** — thêm vào `personalPayload` và LWW merge trong `performSync`. (8) **Service Worker PWA** — tạo `sw.js` network-first strategy, đăng ký trong `index.html`, update `manifest.json` thêm icon 192x192 + maskable. |
| **v4.1.30** | ✅ **Nâng cấp AI nhận xét + Đồng bộ đa thiết bị:** (1) Đổi model từ `gemini-2.5-flash` sang **`gemini-3.5-flash`** (mạnh hơn, chất lượng phân tích cao hơn). (2) Thêm `reportAiInsights` vào `state` và tích hợp vào `saveLocalState`/`loadLocalState` — nhận xét AI được lưu encrypted trong Supabase và tự đồng bộ đến thiết bị khác (vợ/chồng) sau khi sinh thành. (3) Khi mở lại báo cáo, ưu tiên đọc từ `state.reportAiInsights` (đồng bộ), fallback về `localStorage` nếu offline. |
| **v4.1.29** | ✅ **Lưu và khôi phục nhận xét AI theo tháng (không mất sau khi tải lại trang):** Sau khi AI trả về nhận xét, nội dung được lưu vào `localStorage` với khóa `aiInsight_YYYY_MM`. Mỗi khi mở báo cáo của cùng tháng/năm đó, nhận xét cũ sẽ được tự động khôi phục và hiển thị ngay — không cần phải bấm "Trợ lý AI nhận xét" lại. Chuyển sang tháng khác sẽ hiện nhận xét của tháng đó (nếu đã có), hoặc hiện nút gọi AI. |
| **v4.1.28** | ✅ **Sửa lỗi khung AI nhận xét bị tràn/cắt chữ trong ảnh tải về:** Thay chiều cao cố định `boxHeight = 180` bằng chiều cao động tính từ hàm `measureWrappedTextHeight()` — đo trước tổng số dòng của văn bản AI mà không cần vẽ. Đồng thời, `virtualHeight` của Canvas cũng được tính động dựa trên số giao dịch chi tiêu và chiều cao thực tế của ô AI, đảm bảo ảnh luôn đủ dài để hiển thị toàn bộ nội dung và không bao giờ cắt chữ. |
| **v4.1.27** | ✅ **Báo cáo tháng tự động tải lại khi đổi tháng/năm:** Thêm `onchange="generateMonthlyReport()"` vào cả 2 dropdown Tháng và Năm — người dùng chỉ cần chọn tháng là báo cáo hiển thị ngay, không cần bấm nút "Xem báo cáo". Đồng thời ẩn nút "Xem báo cáo" để giao diện gọn hơn. |
| **v4.1.26** | ✅ **Sửa chú thích màu Vợ/Chồng bị đè lên viền bảng trong Báo cáo tháng:** Nhúng legend màu vào cùng hàng với tiêu đề section dùng `flex space-between`, loại bỏ div legend rời độc lập không còn cần thiết. Đồng thời xóa badge tên (Chồng/Vợ) khỏi từng dòng chi tiêu vì màu nền hàng đã đủ phân biệt. |
| **v4.1.25** | ✅ **Nâng cấp bảng chi tiêu trong Báo cáo tháng:** (1) Đổi tiêu đề thành "Các khoản chi tiêu trong tháng" và hiển thị **toàn bộ** giao dịch chi tiêu (không giới hạn 5 khoản lớn nhất). (2) Sắp xếp theo ngày tháng tăng dần thay vì theo số tiền. (3) Tô màu từng dòng theo người chi: **Chồng = nền xanh dương** với badge xanh, **Vợ = nền hồng** với badge hồng – áp dụng cả trong giao diện HTML lẫn ảnh Canvas xuất về. |
| **v4.1.24** | ✅ **Sửa lỗi Báo cáo tháng mở mặc định tháng trước và không thấy chi tiêu tháng hiện tại:** (1) Thay đổi tháng mặc định khi mở báo cáo từ "tháng trước" sang "tháng hiện tại". (2) Thay thế `new Date(t.date)` bằng hàm `parseTxDate()` phân tích chuỗi ngày tháng trực tiếp từ string (`YYYY-MM-DD`) không qua đối tượng `Date`, loại bỏ triệt để lỗi lệch ngày do múi giờ UTC làm mất 1 ngày khiến giao dịch cuối tháng bị xếp nhầm vào tháng trước đó. |
| **v4.1.23** | ✅ **Bổ sung hiển thị người thực hiện chi tiêu trong Báo cáo tháng:** Tích hợp hàm trợ giúp `getMemberName(memberId)` để xác định danh tính người chi tiêu (Chồng, Vợ hoặc các thành viên gia đình khác). Hiển thị tên người chi tiêu ở dạng mở ngoặc đơn `(Chồng)` / `(Vợ)` bên cạnh mô tả chi tiêu trong bảng giao diện HTML, hình vẽ Canvas 2D xuất ảnh PNG (có xử lý cắt ngắn chuỗi để không tràn dòng), nội dung tóm tắt Webhook gửi đi và truyền vào prompt gợi ý phân tích của Gemini AI để tối ưu hóa nhận xét. |
| **v4.1.22** | ✅ **Sửa lỗi mất trạng thái liên kết Quỹ (về Đang chờ duyệt) khi tải lại hoặc offline:** Tích hợp trường dữ liệu `spouseStatus` vào toàn bộ quy trình tuần tự hóa dữ liệu cục bộ (`saveLocalState`, `loadLocalState` kể cả nhánh reset và decrypt), bản sao lưu toàn bộ (`handleFullBackup`, `handleFullRestore`) giúp ứng dụng ghi nhớ và phục hồi chính xác trạng thái liên kết `'accepted'` mà không bị reset về giá trị rỗng/mặc định mỗi khi tắt ứng dụng hoặc hoạt động ngoại tuyến (offline). |
| **v4.1.21** | ✅ **Nâng cấp độ phân giải ảnh báo cáo tháng lên 3x Ultra HD (2160x2880):** Thiết lập `scale = 3.0` cho Canvas và vẽ trên không gian tọa độ ảo `720` x `960` thông qua `ctx.scale(3.0, 3.0)` giúp văn bản, các khung viền, nét vẽ và biểu đồ đạt độ phân giải cực cao (gấp 9 lần diện tích điểm ảnh gốc), siêu nét và không bị vỡ hạt khi in ấn hoặc phóng to. |
| **v4.1.20** | ✅ **Căn chỉnh cỡ chữ và in đậm tiêu đề ô Quỹ chung:** Tăng kích thước hộp chứa lên `360px`, tăng kích thước tiêu đề của thẻ thông tin Quỹ chung (`.shared-fund-header-card`) lên `0.98rem` và thiết lập `font-weight: 800` để in đậm tiêu đề rõ nét. Tăng kích thước mô tả lên `0.8rem` và tăng cỡ icon người dùng lên `17px` giúp giao diện trực quan và thu hút hơn. |
| **v4.1.19** | ✅ **Chuyển đổi và nâng cấp banner Quỹ chung của Vợ:** Chuyển biểu ngữ "Đang xem Quỹ gia đình được chia sẻ từ..." từ dạng dải ngang thô sơ dưới tiêu đề lên góc trên bên phải đối diện "Tổng quan Quỹ" ở dạng thẻ thông tin nhỏ (`.shared-fund-header-card`) với tiêu đề "Quỹ chung gia đình của [Tên chồng]" và mô tả phụ gọn gàng. |
| **v4.1.18** | ✅ **Chuyển ảnh báo cáo xuất khẩu sang Giao diện Sáng (Light Theme):** Cập nhật toàn bộ màu vẽ Canvas 2D của hàm `downloadReportAsImage` sang phong cách giao diện sáng sang trọng (nền sáng xanh nhạt `#f8fafc` - `#f1f5f9`, thẻ màu trắng `#ffffff` viền mỏng `#e2e8f0`, chữ tối màu `#0f172a` và `#334155`), tạo cảm giác trang nhã, dễ in ấn và chuyên nghiệp hơn. |
| **v4.1.17** | ✅ **Sửa lỗi chênh lệch chiều cao biểu đồ (trên-dưới):** Đổi `align-items` từ `start` thành `stretch` trong `.fund-analytics-row` của CSS và tách phần tử `#fundDynamicChartsContainer` ra ngoài lưới để các thẻ biểu đồ chính (tròn đóng góp và cột thu chi) tự động co giãn bằng khít nhau theo chiều dọc, mang lại sự cân đối và gọn gàng tuyệt đối trên màn hình lớn. |
| **v4.1.16** | ✅ **Sửa đổi tỷ lệ khung lưới biểu đồ Quỹ cân đối:** Cập nhật thiết lập `.fund-analytics-row` từ dạng chia tỷ lệ lệch `1.2fr 1.8fr` sang tỷ lệ cân đối `1fr 1fr` giúp độ rộng của biểu đồ cột thu chi theo tháng và biểu đồ tròn tỷ lệ đóng góp hoàn toàn bằng nhau trên màn hình lớn. |
| **v4.1.15** | ✅ **Sửa lỗi đồng bộ phiên bản import (SyntaxError):** Khắc phục lỗi trình duyệt nạp phiên bản cũ từ bộ nhớ đệm (cache) do bất tương thích tham số truy vấn ở câu lệnh import của tệp `bao-cao-thang.js`. Nâng cấp đồng bộ toàn bộ import query params lên `?v=4.1.15` giúp khôi phục hoạt động bình thường của ứng dụng khi mở bảo vệ số (Thiết lập Mã PIN / Đăng nhập). |
| **v4.1.14** | ✅ **Bổ sung tính năng Báo cáo tài chính hàng tháng tự động:** Tích hợp nút và modal "Báo cáo tháng" trong giao diện Tổng quan Quỹ, tự động tổng hợp dòng tiền thu, chi, thặng dư tích lũy, thống kê tỷ lệ đóng góp của hai vợ chồng và danh sách chi tiêu lớn nhất. Tích hợp AI Gemini đánh giá thông minh, hỗ trợ xuất ảnh đồ họa Infographic (PNG) sắc nét vẽ hoàn toàn bằng Canvas 2D ở phía client và gửi tóm tắt qua Webhook (Telegram). Tự động hiển thị banner thông báo khi sang tháng mới để gợi ý xem báo cáo tháng cũ. |
| **v4.1.13** | ✅ **Sửa lỗi bộ lọc năm của biểu đồ Quỹ bị giới hạn cứng:** Chuyển đổi dropdown chọn năm (`chartSelectYear`) sang cơ chế tạo lựa chọn động bằng cách quét tìm tất cả các năm có phát sinh giao dịch thực tế trong lịch sử kết hợp với năm hiện tại, thay vì giới hạn cứng đến năm 2026. Điều này cho phép xem và lọc biểu đồ cho các giao dịch trong tương lai (ví dụ: 2027) hoặc bất kỳ năm nào sau này. |
| **v4.1.12** | ✅ **Sửa lỗi hiển thị biểu đồ cột thu chi bị méo / khuất nội dung:** Khắc phục lỗi trình duyệt nạp biểu đồ khi thẻ chứa tab chưa kịp reflow layout xong (khiến chiều rộng bằng 0px và Chart.js vẽ sai tỷ lệ). Đổi kiểu hiển thị `.fund-chart-container` từ `display: flex` thành `display: block` để tránh xung đột vòng lặp resize của Chart.js, gán kích thước cố định an toàn cho các khung chứa, và đưa việc khởi tạo biểu đồ vào hàm trễ `setTimeout` 50ms nhằm đảm bảo layout trình duyệt đã sẵn sàng trước khi vẽ. |
| **v4.1.11** | ✅ **Sửa lỗi hiển thị biểu đồ Quỹ chính luôn bị tự động bật lại:** Khắc phục lỗi cấu hình bật/tắt biểu đồ (`activeChartFundIds`) không được lưu trong hàm `saveLocalState` và `loadLocalState` (cục bộ) cũng như `personalPayload` (đồng bộ đám mây), dẫn đến việc tùy chọn hiển thị biểu đồ luôn bị reset về mặc định bật mỗi khi tải lại trang hoặc đồng bộ dữ liệu. |
| **v4.1.10** | ✅ **Sửa lỗi Lệch Khóa E2EE Đa Thiết Bị & Bảo Mật Logs:** Loại bỏ việc trả về sớm (`return`) trong khối đồng bộ khách của `performSync` giúp người Vợ (Guest) đồng bộ song song cả Quỹ chung (lên dòng của chồng) và Gói dữ liệu cá nhân gồm cặp khóa bảo mật RSA (lên dòng của vợ). Khắc phục triệt để lỗi lệch khóa E2EE làm văng nhóm khi Vợ dùng nhiều thiết bị. Dọn dẹp log F12 quét thô để bảo vệ dữ liệu email của các tài khoản khác (như bố mẹ). |
| **v4.1.09** | ✅ **Sửa lỗi ReferenceError đơ giao diện ở renderManagementTab:** Khắc phục triệt để lỗi khai báo biến `addFundBlock` bị thiếu trong hàm `renderManagementTab` gây ra lỗi đơ click menu tab, giật lag và phải tải lại trang mới hoạt động. |
| **v4.1.08** | ✅ **Sửa lỗi Vợ reload bị văng khỏi nhóm & Thiếu metadata khi Chấp nhận:** Khắc phục lỗi bất đồng bộ khi khởi chạy ứng dụng (auth session của Supabase chưa kịp tải xong khiến hàm quét quỹ chung reset trạng thái nhóm của người Vợ về mặc định). Đồng thời lưu đầy đủ thông tin `sharedFundSourceRow` khi Vợ nhận được lời mời ở kịch bản chưa đồng bộ khóa đối xứng (Case B) để Vợ có thể viết đè trạng thái `accepted` gửi ngược sang cho Chồng khi chấp nhận. |
| **v4.1.07** | ✅ **Sửa lỗi lưu trữ thời gian sao lưu & Đè trạng thái khi Vợ đồng bộ:** Bổ sung trường `lastFullBackupDate` vào danh sách lưu trữ cục bộ (`saveLocalState`/`loadLocalState`) và dữ liệu đám mây (`personalPayload`) giúp thời gian sao lưu gần nhất không bị biến mất khi cập nhật bản mới hoặc tải lại trang. Đồng thời sửa lỗi đồng bộ từ phía máy Vợ (Guest) khi lưu quỹ chung bị thiếu trường `spouse_status` làm đè trạng thái 'accepted' trên máy chủ về rỗng. |
| **v4.1.06** | ✅ **Bổ sung Hộp Chẩn đoán & Phục hồi mục Xuất Excel cho Vợ:** Thiết kế hộp "Chẩn đoán & Bảo mật Quỹ" trong tab Quản lý để hiển thị thông tin vai trò, trạng thái đối tác, tình trạng khóa RSA và khóa Quỹ chung, đồng thời hỗ trợ nút "Kiểm tra Cloud" quét và chuẩn đoán thô dòng dữ liệu Supabase của cả 2 vợ chồng để phát hiện lỗi lệch khóa, lệch email, chưa đồng bộ. Khôi phục hiển thị mục "Xuất dữ liệu Google Sheet" (Tải file Excel) trên tài khoản của Vợ. |
| **v4.1.05** | ✅ **Sửa lỗi đồng bộ trạng thái Quỹ gia đình ở máy Chồng:** Bổ sung logic so khớp trạng thái `spouse_status` từ phong bì mã hóa trên Supabase về máy người Chồng khi đồng bộ để tránh bị ghi đè thành trạng thái rỗng và tự động nạp lại giao diện tab Quản lý Quỹ (`renderManagementTab`) nhằm hiển thị badge "Đã chấp nhận" mà không cần reload trang. |
| **v4.1.04** | ✅ **Sửa lỗi Quỹ Gia Đình, Tab Quản Lý Mới & Sao lưu Toàn Bộ:** Sửa lỗi trạng thái 'Đang chờ duyệt' bị đứng ở máy chồng bằng cách thêm đồng bộ cập nhật `spouse_status = 'accepted'` từ máy vợ khi chấp nhận. Ẩn 'Tự động đồng bộ Google Sheets' và sửa UI liên kết đối với thành viên đã tham gia. Ẩn nút xóa giao dịch trong nhật ký quỹ và chỉ hiển thị khi click chọn giao dịch. Thêm tab 'Quản lý' độc lập vào navbar Thu chi đối ngoại, di chuyển các tính năng tùy chỉnh, quản lý sự kiện tùy chỉnh, xuất nhập dữ liệu sang tab mới này và đổi tên nút xóa dữ liệu thành 'Xóa tất cả dữ liệu thu chi'. Thêm tính năng 'Sao lưu/Đồng bộ toàn bộ dữ liệu' mã hóa đa phần mềm trong Cài đặt. |
> [!CAUTION]
> **KHÔNG tự động tải lên GitHub.** Sau khi hoàn thành tính năng hoặc sửa lỗi, agent **chỉ được phép** `git add` + `git commit` (nếu người dùng yêu cầu rõ ràng). Việc `git push` lên GitHub **do người dùng tự thực hiện** trên cuộc trò chuyện riêng. Không được tự ý push code.

> [!IMPORTANT]
> **Nâng cấp phiên bản (Version Bump):** Ở MỖI LẦN chỉnh sửa mã nguồn (dù là nhỏ nhất), agent **bắt buộc** phải nâng cấp số phiên bản (ví dụ từ `v4.0.18` lên `v4.0.23`) đồng loạt trong 3 file: `version.json`, `src/core/app.js` (biến `APP_VERSION`), và `index.html` (các tham số `?v=...` ở CSS/JS/Images). Việc này là cực kỳ quan trọng để đảm bảo trình duyệt tự động xóa bộ đệm (cache) và nạp code mới nhất.

> [!IMPORTANT]
> **Cập nhật Lịch sử Phiên bản:** Cùng với việc nâng cấp version, bạn bắt buộc phải thêm dòng tóm tắt thông tin các thay đổi của phiên bản mới vào bảng "Lịch sử phiên bản gần đây" trong chính file `project_summary.md` này.

> [!IMPORTANT]
> **Tính Độc Lập Giữa Các Module:** Mọi chỉnh sửa trong tính năng **Thu chi đối ngoại** tuyệt đối không được ảnh hưởng đến dữ liệu hoặc hoạt động của **Hồ sơ sức khỏe** và ngược lại. Hai phân hệ này phải hoàn toàn độc lập với nhau.

> [!IMPORTANT]
> **Đóng gói & Đặt tên file IPA (iOS):** Khi ứng dụng được đóng gói tự động trên GitHub Actions (file `build-ios.yml`), file `.ipa` đầu ra bắt buộc phải được tự động đổi tên theo định dạng `FamiLife_v[Phiên_bản].ipa` (ví dụ: `FamiLife_v4.1.41.ipa`) dựa trên thuộc tính `version` trong `package.json`.

---

## 📜 Lịch sử phiên bản gần đây

| Phiên bản | Tính năng |
|-----------|-----------|
| v4.1.93 | ✅ Ẩn hoàn toàn chỉ báo cuộn native trên iOS (Native iOS Scroll Indicators Hiding). |
| v4.1.92 | ✅ Ẩn thanh cuộn toàn cục & Nâng cấp chẩn đoán lỗi cuộn (Scrollbar Hiding & Diagnostics Upgrade). |
| v4.1.91 | ✅ Nâng cấp tính năng Uống thuốc tẩy giun & Lấy cao răng (Deworming Scheduling & Label Translation Upgrade). |
| v4.1.90 | ✅ Tối ưu hóa biểu mẫu y tế dựa trên phân loại dịch vụ (Deworming & Dental Scaling Form Toggling). |
| v4.1.89 | ✅ Thêm loại Hồ sơ y tế mới, Rung phản hồi toàn cục & Bản địa hóa Camera iOS. |
| v4.1.88 | ✅ Đồng bộ hóa phiên bản build Xcode trong update-xcode-version.py (Xcode Versioning Sync Fix). |
| v4.1.87 | ✅ Hotfix lỗi cú pháp duplicate export 'triggerHapticFeedback' trong app.js. |
| v4.1.86 | ✅ Sửa viền tab, đổi vị trí nút Sửa/Xóa trong Hồ sơ y tế, cấu hình Camera iOS & Rung phản hồi xúc giác Haptic. |
| v4.1.85 | ✅ Hoàn tác Tab Quản lý về biểu tượng sliders chuẩn Lucide sliders trên thanh điều hành di động. |
| v4.1.84 | ✅ Thay đổi icon sliders tab Quản lý thành biểu tượng bánh răng lồng cờ lê custom bằng mã vẽ inline SVG. |
| v4.1.83 | ✅ Chuyển đổi toàn bộ hộp thoại confirm() mặc định của trình duyệt trong Hồ sơ y tế sang await window.showConfirm() custom. |
| v4.1.82 | ✅ Thay đổi chữ "Quản lý" thành icon Lucide 'sliders' trên thanh điều hướng di động để tối ưu hóa không gian hiển thị. |
| v4.1.81 | ✅ Tích hợp Web Share API cho tính năng Xuất Excel & Xuất PDF trên iOS để mở hộp thoại chia sẻ/lưu file hệ thống. |
| v4.1.80 | ✅ Đồng bộ màu nền native siêu tốc (100ms) ở 3 giây đầu khi mở ứng dụng để triệt tiêu vệt đen lần cuộn đầu. |
| v4.1.79 | ✅ Khắc phục lỗi nảy rìa nền đen bằng cách đồng bộ màu nền body CSS vào WKWebView & ScrollView định kỳ. |
| v4.1.78 | ✅ Sử dụng kỹ thuật Method Swizzling trong AppDelegate.swift để can thiệp WKWebView, sửa lỗi build Actions. |
| v4.1.77 | ✅ Ép cấu hình cuộn native Swift lên Debug Console qua evaluateJavaScript và override thêm capacitorDidLoad. |
| v4.1.76 | ✅ Bổ sung nút Xuất log và tích hợp Web Share API cho phép chia sẻ/gửi file log .txt nhanh chóng trên cả mobile. |
| v4.1.75 | ✅ Tích hợp module chẩn đoán lỗi cuộn thời gian thực (logScrollDiagnostics) in ra con bọ debug khi khởi chạy và khi chạm. |

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

> [!IMPORTANT]
> **Đóng gói & Đặt tên file IPA (iOS):** Khi ứng dụng được đóng gói tự động trên GitHub Actions (file `build-ios.yml`), file `.ipa` đầu ra bắt buộc phải được tự động đổi tên theo định dạng `FamiLife_v[Phiên_bản].ipa` (ví dụ: `FamiLife_v4.1.41.ipa`) dựa trên thuộc tính `version` trong `package.json`.

---

## 📜 Lịch sử phiên bản gần đây

| Phiên bản | Tính năng |
|-----------|-----------|
| v4.1.85 | ✅ Hoàn tác Tab Quản lý về biểu tượng sliders chuẩn Lucide sliders trên thanh điều hành di động. |
| v4.1.84 | ✅ Thay đổi icon sliders tab Quản lý thành biểu tượng bánh răng lồng cờ lê custom bằng mã vẽ inline SVG. |
| v4.1.83 | ✅ Chuyển đổi toàn bộ hộp thoại confirm() mặc định của trình duyệt trong Hồ sơ y tế sang await window.showConfirm() custom. |
| v4.1.82 | ✅ Thay đổi chữ "Quản lý" thành icon Lucide 'sliders' trên thanh điều hướng di động để tối ưu hóa không gian hiển thị. |
| v4.1.81 | ✅ Tích hợp Web Share API cho tính năng Xuất Excel & Xuất PDF trên iOS để mở hộp thoại chia sẻ/lưu file hệ thống. |
| v4.1.80 | ✅ Đồng bộ màu nền native siêu tốc (100ms) ở 3 giây đầu khi mở ứng dụng để triệt tiêu vệt đen lần cuộn đầu. |
| v4.1.79 | ✅ Khắc phục lỗi nảy rìa nền đen bằng cách đồng bộ màu nền body CSS vào WKWebView & ScrollView định kỳ. |
| v4.1.78 | ✅ Sử dụng kỹ thuật Method Swizzling trong AppDelegate.swift để can thiệp WKWebView, sửa lỗi build Actions. |
| v4.1.77 | ✅ Ép cấu hình cuộn native Swift lên Debug Console qua evaluateJavaScript và override thêm capacitorDidLoad. |
| v4.1.76 | ✅ Bổ sung nút Xuất log và tích hợp Web Share API cho phép chia sẻ/gửi file log .txt nhanh chóng trên cả mobile. |
| v4.1.75 | ✅ Tích hợp module chẩn đoán lỗi cuộn thời gian thực (logScrollDiagnostics) in ra con bọ debug khi khởi chạy và khi chạm. |

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
