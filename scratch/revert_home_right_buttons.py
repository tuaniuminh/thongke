# Python script to revert home page right-aligned buttons to their original absolute positions

index_path = 'c:/Users/PC VIP/Downloads/Thong-ke/index.html'
css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/we-love.css'

# 1. Update index.html
with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

target_group = """        <!-- Group top-right actions to align WeLove mini widget with Settings button -->
        <div class="home-top-right-group">
            <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
            <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
                <i data-lucide="download"></i>
            </button>
            <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
                <i data-lucide="settings"></i>
            </button>
        </div>"""

replace_group = """        <!-- Nút Cài đặt ứng dụng PWA (chỉ hiện khi trình duyệt hỗ trợ beforeinstallprompt) -->
        <button class="home-pwa-install-btn" id="homePwaInstallBtn" title="Cài đặt ứng dụng" style="display: none;">
            <i data-lucide="download"></i>
        </button>
        <button class="home-settings-btn" id="homeSettingsBtn" onclick="switchTab('settings')" title="Cài đặt & Đồng bộ">
            <i data-lucide="settings"></i>
        </button>"""

if target_group in html_content:
    html_content = html_content.replace(target_group, replace_group)
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("Reverted right-aligned buttons in index.html successfully.")
else:
    print("Target group not found in index.html.")


# 2. Update we-love.css
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Target CSS overrides to remove
target_css_to_remove = """
/* --- Home Page Mini Love Widget Styles --- */
.home-top-right-group {
    position: absolute;
    top: calc(20px + env(safe-area-inset-top));
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

/* Position override for version badge to align top-right actions at top: 20px */
.version-badge-btn {
    top: calc(65px + env(safe-area-inset-top)) !important;
}"""

# Clean up CSS content
if target_css_to_remove in css_content:
    css_content = css_content.replace(target_css_to_remove, "")
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("Cleaned up CSS overrides in we-love.css successfully.")
else:
    # Try alternate with top: 65px if first patch was still in there somehow
    alternate_css = target_css_to_remove.replace("top: calc(20px + env(safe-area-inset-top));", "top: calc(65px + env(safe-area-inset-top));")
    if alternate_css in css_content:
        css_content = css_content.replace(alternate_css, "")
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
        print("Cleaned up alternate CSS overrides in we-love.css successfully.")
    else:
        print("CSS target overrides not found in we-love.css.")
