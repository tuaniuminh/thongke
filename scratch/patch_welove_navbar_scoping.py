# Python script to scope navbar pink active states to only WeLove active tabs in we-love.css

css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/we-love.css'

with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

target_style = """/* Custom pink active states for navbar/header buttons inside Kỷ Niệm Tình Yêu context */
.mobile-navbar-right .nav-icon-btn:hover {
    color: var(--accent-rose) !important;
    background: rgba(244, 63, 94, 0.08) !important;
}

.mobile-navbar-right .nav-icon-btn.active {
    color: var(--accent-rose) !important;
    background: rgba(244, 63, 94, 0.12) !important;
    border: 1px solid rgba(244, 63, 94, 0.4) !important;
}"""

replace_style = """/* Custom pink active states for navbar/header buttons inside Kỷ Niệm Tình Yêu context */
body.active-tab-welove .mobile-navbar-right .nav-icon-btn:hover,
body.active-tab-welove-admin .mobile-navbar-right .nav-icon-btn:hover,
body.active-tab-welove-settings .mobile-navbar-right .nav-icon-btn:hover {
    color: var(--accent-rose) !important;
    background: rgba(244, 63, 94, 0.08) !important;
}

body.active-tab-welove .mobile-navbar-right .nav-icon-btn.active,
body.active-tab-welove-admin .mobile-navbar-right .nav-icon-btn.active,
body.active-tab-welove-settings .mobile-navbar-right .nav-icon-btn.active {
    color: var(--accent-rose) !important;
    background: rgba(244, 63, 94, 0.12) !important;
    border: 1px solid rgba(244, 63, 94, 0.4) !important;
}"""

if target_style in css_content:
    css_content = css_content.replace(target_style, replace_style)
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("Successfully scoped active navbar pink states to WeLove tabs in we-love.css.")
else:
    print("Target style block not found in we-love.css.")
