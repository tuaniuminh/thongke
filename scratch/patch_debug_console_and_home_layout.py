# Python script to update index.html and style.css for responsive header layouts and debug console copy logs feature

index_path = 'c:/Users/PC VIP/Downloads/Thong-ke/index.html'
css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/style.css'

# 1. Update index.html
with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# 1a. Replace home absolute components with the new home-top-bar structure
target_top_elements = """        <!-- Widget Lịch âm Việt Nam & Thời tiết Hà Nội -->
        <div class="home-widgets-container" id="homeWidgetsContainer">
            <div class="home-widget-box" id="homeLunarWidget">
                <div class="widget-row" id="lunarRow">
                    <span>Lịch âm: --/--/----</span>
                </div>
            </div>
            <div class="home-widget-box" id="homeWeatherWidget">
                <div class="widget-row" id="weatherRow">
                    <i data-lucide="cloud-sun"></i>
                    <span class="weather-desktop">--°C tại Hà Nội</span>
                    <span class="weather-mobile" style="display: none;">--°C - Đang tải...</span>
                </div>
            </div>
            <!-- WeLove Widget (Joined Hearts) as a left-aligned home widget box -->
            <div class="home-widget-box home-love-left-widget" id="homeLoveWidget" onclick="switchTab('welove')" style="display: none; cursor: pointer; align-items: center; gap: 6px;" title="Kỷ Niệm Tình Yêu">
                <span class="mini-widget-heart">💕</span>
                <span class="mini-widget-days" id="homeLoveDays" style="font-weight: 700; font-size: 0.85rem;">--</span>
            </div>
        </div>
        
        <button class="manual-check-update-btn version-badge-btn" id="homeVersionBadge" title="Kiểm tra cập nhật">
            <span class="wizard-version-badge"></span>
        </button>
        <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
        <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
            <i data-lucide="download"></i>
        </button>
        <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
            <i data-lucide="settings"></i>
        </button>"""

replace_top_elements = """        <!-- Top bar containing widgets and buttons in a responsive layout -->
        <div class="home-top-bar">
            <!-- Left side: widgets -->
            <div class="home-widgets-container" id="homeWidgetsContainer">
                <div class="home-widget-box" id="homeLunarWidget">
                    <div class="widget-row" id="lunarRow">
                        <span>Lịch âm: --/--/----</span>
                    </div>
                </div>
                <div class="home-widget-box" id="homeWeatherWidget">
                    <div class="widget-row" id="weatherRow">
                        <i data-lucide="cloud-sun"></i>
                        <span class="weather-desktop">--°C tại Hà Nội</span>
                        <span class="weather-mobile" style="display: none;">--°C - Đang tải...</span>
                    </div>
                </div>
                <!-- WeLove Widget (Joined Hearts) as a left-aligned home widget box -->
                <div class="home-widget-box home-love-left-widget" id="homeLoveWidget" onclick="switchTab('welove')" style="display: none; cursor: pointer; align-items: center; gap: 6px;" title="Kỷ Niệm Tình Yêu">
                    <span class="mini-widget-heart">💕</span>
                    <span class="mini-widget-days" id="homeLoveDays" style="font-weight: 700; font-size: 0.85rem;">--</span>
                </div>
            </div>
            
            <!-- Right side: controls -->
            <div class="home-controls-container">
                <button class="manual-check-update-btn version-badge-btn" id="homeVersionBadge" title="Kiểm tra cập nhật">
                    <span class="wizard-version-badge"></span>
                </button>
                <div class="home-right-buttons-row">
                    <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
                    <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
                        <i data-lucide="settings"></i>
                    </button>
                </div>
            </div>
        </div>"""

html_content = html_content.replace(target_top_elements, replace_top_elements)

# 1b. Replace debug console actions to include Copy button and update download to share-2
target_console_actions = """            <div class="debug-console-actions">
                <button id="clearDebugConsoleBtn" class="debug-console-btn">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    <span>Xóa log</span>
                </button>
                <button id="exportDebugConsoleBtn" class="debug-console-btn" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2);">
                    <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                    <span>Xuất log</span>
                </button>
                <button id="closeDebugConsoleBtn" class="debug-console-btn btn-close">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    <span>Đóng</span>
                </button>
            </div>"""

replace_console_actions = """            <div class="debug-console-actions">
                <button id="clearDebugConsoleBtn" class="debug-console-btn">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    <span>Xóa log</span>
                </button>
                <button id="copyDebugConsoleBtn" class="debug-console-btn" style="background: rgba(14, 165, 233, 0.1); color: var(--accent-blue); border-color: rgba(14, 165, 233, 0.2);" title="Sao chép toàn bộ log vào clipboard">
                    <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                    <span>Sao chép</span>
                </button>
                <button id="exportDebugConsoleBtn" class="debug-console-btn" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2);" title="Gửi/Chia sẻ file log">
                    <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
                    <span>Chia sẻ</span>
                </button>
                <button id="closeDebugConsoleBtn" class="debug-console-btn btn-close">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    <span>Đóng</span>
                </button>
            </div>"""

html_content = html_content.replace(target_console_actions, replace_console_actions)

# 1c. Insert copy log button JavaScript logic
target_js_binding = """            const exportBtn = document.getElementById('exportDebugConsoleBtn');
            if (exportBtn) {"""

replace_js_binding = """            const copyBtn = document.getElementById('copyDebugConsoleBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', async () => {
                    if (!window.__famiLifeLogs || window.__famiLifeLogs.length === 0) {
                        alert("Không có dữ liệu log để sao chép!");
                        return;
                    }
                    const logText = window.__famiLifeLogs.map(log => `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`).join('\\n');
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(logText);
                        } else {
                            const textArea = document.createElement("textarea");
                            textArea.value = logText;
                            textArea.style.position = "fixed";
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                        }
                        alert("Đã sao chép toàn bộ log vào bộ nhớ tạm! Bạn có thể dán (paste) để gửi đi.");
                    } catch (err) {
                        alert("Không thể sao chép log: " + err.message);
                    }
                });
            }

            const exportBtn = document.getElementById('exportDebugConsoleBtn');
            if (exportBtn) {"""

html_content = html_content.replace(target_js_binding, replace_js_binding)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
print("Updated HTML structure in index.html successfully.")


# 2. Update style.css
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 2a. Add home-top-bar and layout responsiveness styles
target_layout_media = """@media (max-width: 768px) {
    .home-layout {
        align-items: flex-start !important;
        padding-top: calc(120px + env(safe-area-inset-top, 0px)) !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        padding-bottom: 8rem !important;
    }
}"""

replace_layout_media = """@media (max-width: 768px) {
    .home-layout {
        align-items: flex-start !important;
        padding-top: calc(20px + env(safe-area-inset-top, 0px)) !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        padding-bottom: 8rem !important;
        display: flex !important;
        flex-direction: column !important;
    }
}

/* Responsive Top Bar layout for widgets and buttons */
.home-top-bar {
    width: 100%;
    position: absolute;
    top: calc(20px + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 100;
    pointer-events: none;
}

.home-widgets-container,
.home-controls-container {
    pointer-events: auto !important;
}

.home-controls-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

.home-right-buttons-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

/* Static override to let flex container flow guide placement and prevent overlapping */
.home-top-bar .version-badge-btn,
.home-top-bar .home-pwa-install-btn,
.home-top-bar .home-settings-btn {
    position: static !important;
    margin: 0 !important;
}

.home-top-bar .home-widgets-container {
    position: static !important;
    margin: 0 !important;
}

@media (max-width: 768px) {
    .home-top-bar {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        padding: 0 !important;
        margin-bottom: 1.5rem !important;
        pointer-events: auto !important;
        flex-wrap: wrap;
        gap: 12px;
    }
    
    .home-widgets-container {
        flex: 1;
        min-width: 150px;
    }
    
    .home-controls-container {
        flex-shrink: 0;
        align-items: flex-end;
    }
}"""

css_content = css_content.replace(target_layout_media, replace_layout_media)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)
print("Updated CSS styling in style.css successfully.")
