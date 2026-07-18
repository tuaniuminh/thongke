# Python script to convert WeLove card into a top-right mini-widget on home page

index_path = 'c:/Users/PC VIP/Downloads/Thong-ke/index.html'
css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/we-love.css'

with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# 1. Replace PWA and settings buttons with top-right actions group containing mini love widget
target_buttons = """        <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
        <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
            <i data-lucide="download"></i>
        </button>
        <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
            <i data-lucide="settings"></i>
        </button>"""

replace_buttons = """        <!-- Group top-right actions to align WeLove mini widget with Settings button -->
        <div class="home-top-right-group">
            <!-- Small WeLove Widget Pill -->
            <div class="home-love-mini-widget" id="homeLoveWidget" onclick="switchTab('welove')" style="display: none;" title="Kỷ Niệm Tình Yêu">
                <span class="mini-widget-heart">❤️</span>
                <span class="mini-widget-days" id="homeLoveDays">--</span>
            </div>
            
            <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
            <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
                <i data-lucide="download"></i>
            </button>
            <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
                <i data-lucide="settings"></i>
            </button>
        </div>"""

html_content = html_content.replace(target_buttons, replace_buttons)


# 2. Delete the old home-love-widget big card
target_big_widget = """            <!-- WeLove Widget (Joined Hearts) -->
            <div class="home-love-widget" id="homeLoveWidget" onclick="switchTab('welove')" style="display: none;">
                <div class="hearts-svg-wrapper">
                    <svg class="double-heart-svg" viewBox="0 0 240 160">
                        <defs>
                            <linearGradient id="heartGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#ff4b6e" />
                                <stop offset="100%" stop-color="#ff758c" />
                            </linearGradient>
                            <linearGradient id="heartGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#e83e8c" />
                                <stop offset="100%" stop-color="#fd7e14" />
                            </linearGradient>
                            <filter id="heartGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="8" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path class="svg-heart heart-left" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" transform="translate(45, 20) scale(3.5)" fill="url(#heartGradLeft)" filter="url(#heartGlow)"></path>
                        <path class="svg-heart heart-right" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" transform="translate(105, 30) scale(3.5) rotate(10 12 12)" fill="url(#heartGradRight)" filter="url(#heartGlow)"></path>
                    </svg>
                    <div class="heart-center-text">
                        <span class="days-num" id="homeLoveDays">--</span>
                        <span class="days-lbl">Ngày bên nhau</span>
                    </div>
                </div>
                <div class="love-names" id="homeLoveWidgetNames">WeLove</div>
            </div>"""

html_content = html_content.replace(target_big_widget, "")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
print("Updated index.html love widget placement successfully.")


# 3. Add styles for mini-widget and container to we-love.css
mini_widget_css = """
/* --- Home Page Mini Love Widget Styles --- */
.home-top-right-group {
    position: absolute;
    top: calc(65px + env(safe-area-inset-top));
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 100;
    pointer-events: auto;
}

.home-top-right-group .home-settings-btn,
.home-top-right-group .home-pwa-install-btn {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    margin: 0 !important;
}

.home-love-mini-widget {
    height: 40px;
    padding: 0 14px;
    border-radius: 20px;
    background: rgba(244, 63, 94, 0.1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(244, 63, 94, 0.25);
    color: #e11d48;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 4px 15px rgba(244, 63, 94, 0.1);
}

body.dark-mode .home-love-mini-widget {
    color: #fda4af;
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.35);
}

.home-love-mini-widget:hover {
    transform: translateY(-1px) scale(1.03);
    box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2);
    background: rgba(244, 63, 94, 0.15);
}

body.dark-mode .home-love-mini-widget:hover {
    background: rgba(244, 63, 94, 0.22);
}

.mini-widget-heart {
    font-size: 1rem;
    animation: miniHeartBeat 1.2s infinite;
    display: inline-block;
}

@keyframes miniHeartBeat {
    0% { transform: scale(1); }
    14% { transform: scale(1.2); }
    28% { transform: scale(1); }
    42% { transform: scale(1.2); }
    70% { transform: scale(1); }
}
"""

with open(css_path, 'a', encoding='utf-8') as f:
    f.write(mini_widget_css)
print("Appended mini-widget CSS styles to we-love.css successfully.")
