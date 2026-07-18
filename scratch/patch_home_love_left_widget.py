# Python script to move WeLove widget from top-right to left widgets container below weather in index.html

index_path = 'c:/Users/PC VIP/Downloads/Thong-ke/index.html'
css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/we-love.css'

# 1. Read index.html
with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Target for home top-right actions group (currently containing the love mini widget)
target_top_right = """        <!-- Group top-right actions to align WeLove mini widget with Settings button -->
        <div class="home-top-right-group">
            <!-- Small WeLove Widget Pill -->
            <div class="home-love-mini-widget" id="homeLoveWidget" onclick="switchTab('welove')" style="display: none;" title="Kỷ Niệm Tình Yêu">
                <span class="mini-widget-heart">💕</span>
                <span class="mini-widget-days" id="homeLoveDays">--</span>
            </div>
            
            <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
            <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
                <i data-lucide="download"></i>
            </button>
            <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">"""

# Replace by removing the mini widget from top-right actions group
replace_top_right = """        <!-- Group top-right actions to align WeLove mini widget with Settings button -->
        <div class="home-top-right-group">
            <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
            <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
                <i data-lucide="download"></i>
            </button>
            <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">"""

html_content = html_content.replace(target_top_right, replace_top_right)


# Target for widgets container
target_widgets_container = """            <div class="home-widget-box" id="homeWeatherWidget">
                <div class="widget-row" id="weatherRow">
                    <i data-lucide="cloud-sun"></i>
                    <span class="weather-desktop">--°C tại Hà Nội</span>
                    <span class="weather-mobile" style="display: none;">--°C - Đang tải...</span>
                </div>
            </div>"""

# Replace by inserting WeLove widget box right below weather widget box
replace_widgets_container = """            <div class="home-widget-box" id="homeWeatherWidget">
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
            </div>"""

html_content = html_content.replace(target_widgets_container, replace_widgets_container)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
print("Updated index.html love widget placement successfully.")


# 2. Append styling for the left-aligned love widget box to we-love.css
left_widget_css = """
/* --- Left Aligned Home Page Love Widget Styles --- */
.home-love-left-widget {
    display: none; /* JS will toggle flex or none */
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    color: #e11d48;
    transition: all 0.2s ease-in-out;
}

body.dark-mode .home-love-left-widget {
    color: #fda4af;
}

.home-love-left-widget:hover {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 12px rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.3);
}
"""

with open(css_path, 'a', encoding='utf-8') as f:
    f.write(left_widget_css)
print("Appended left love widget CSS styles to we-love.css successfully.")
