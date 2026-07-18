# Python script to update home page widget alignment and replace heart icon with Two Hearts emoji

index_path = 'c:/Users/PC VIP/Downloads/Thong-ke/index.html'
css_path = 'c:/Users/PC VIP/Downloads/Thong-ke/src/assets/css/we-love.css'

# 1. Update index.html to replace heart emoji with Two Hearts emoji
with open(index_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

target_emoji = '<span class="mini-widget-heart">❤️</span>'
replace_emoji = '<span class="mini-widget-heart">💕</span>'

if target_emoji in html_content:
    html_content = html_content.replace(target_emoji, replace_emoji)
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("Replaced heart emoji with two hearts in index.html successfully.")
else:
    print("Heart emoji target not found in index.html or already replaced.")


# 2. Update we-love.css to align top-right actions group at top: 20px and push version badge to top: 65px
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

target_css = """.home-top-right-group {
    position: absolute;
    top: calc(65px + env(safe-area-inset-top));"""

replace_css = """.home-top-right-group {
    position: absolute;
    top: calc(20px + env(safe-area-inset-top));"""

if target_css in css_content:
    css_content = css_content.replace(target_css, replace_css)
    
    # Append the version badge override to the end if not already appended
    if ".version-badge-btn" not in css_content:
        version_badge_override = """
/* Position override for version badge to align top-right actions at top: 20px */
.version-badge-btn {
    top: calc(65px + env(safe-area-inset-top)) !important;
}
"""
        css_content += version_badge_override
    
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print("Aligned top-right actions to top: 20px and version badge to top: 65px successfully.")
else:
    print("CSS target not found in we-love.css or already replaced.")
