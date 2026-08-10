$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# 1. Sửa file we-love.js
$jsPath = Resolve-Path "src/features/we-love/we-love.js"
$jsContent = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)

# Chuẩn hóa về LF
$jsNorm = $jsContent.Replace("`r`n", "`n")

# Vá lỗi Mojibake trong HTML subview
$jsNorm = $jsNorm.Replace("Cá»™t pháº£i (Sá»• tay sá»©c khá» e)", "Cột phải (Sổ tay sức khỏe)")
$jsNorm = $jsNorm.Replace("HÃ ng dÆ°á»›i (Album áº£nh trÃ n rá»™ng)", "Hàng dưới (Album ảnh tràn rộng)")
$jsNorm = $jsNorm.Replace("ðŸ“¸", "📸")
$jsNorm = $jsNorm.Replace("Album áº¢nh TÃ¬nh YÃªu", "Album Ảnh Tình Yêu")
$jsNorm = $jsNorm.Replace("Quáº£n lÃ½ Album áº£nh", "Quản lý Album ảnh")

# Vá lỗi trích dẫn tiếng Trung
$jsNorm = $jsNorm.Replace('cn: "只要有nước陪伴，每天 đều là晴天。"', 'cn: "只要有你陪伴，每天都是晴天。"')

# Tích hợp .normalize('NFC') cho chuỗi trích dẫn tiếng Việt để tránh vỡ dấu
$jsNorm = $jsNorm.Replace("if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi;", "if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi.normalize('NFC');")
$jsNorm = $jsNorm.Replace("<div class=\"quote-vietnamese\">\${LOVE_QUOTES[currentQuoteIdx].vi}</div>", "<div class=\"quote-vietnamese\">\${LOVE_QUOTES[currentQuoteIdx].vi.normalize('NFC')}</div>")

# Ghi lại file we-love.js
if ($jsContent.Contains("`r`n")) {
    $jsFinal = $jsNorm.Replace("`n", "`r`n")
} else {
    $jsFinal = $jsNorm
}
[System.IO.File]::WriteAllText($jsPath, $jsFinal, $utf8NoBom)
Write-Output "Successfully patched we-love.js"


# 2. Sửa file we-love.css (thay màu xám và cập nhật font-family)
$cssPath = Resolve-Path "src/assets/css/we-love.css"
$cssContent = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$cssNorm = $cssContent.Replace("`r`n", "`n")

# Đổi màu gradient Slate xám thành Rose lãng mạn ngọt ngào cho days-number
$cssNorm = $cssNorm.Replace("background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%) !important;", "background: linear-gradient(135deg, #e11d48 0%, #ec4899 50%, #f472b6 100%) !important;")
$cssNorm = $cssNorm.Replace("filter: drop-shadow(0 2px 8px rgba(30, 41, 59, 0.15)) !important;", "filter: drop-shadow(0 4px 15px rgba(236, 72, 153, 0.35)) !important;")

# Cập nhật font-family cho quote-vietnamese sang Lora/Georgia
$cssNorm = $cssNorm.Replace('font-family: "Georgia", "Times New Roman", serif !important; /* Chuyển sang Georgia nghiêng để khắc phục lỗi vỡ dấu tiếng Việt của Great Vibes */', 'font-family: "Lora", "Georgia", "Times New Roman", serif !important; /* Dùng Lora kết hợp Georgia để hiển thị chữ Việt có dấu đẹp nhất */')

# Ghi lại file we-love.css
if ($cssContent.Contains("`r`n")) {
    $cssFinal = $cssNorm.Replace("`n", "`r`n")
} else {
    $cssFinal = $cssNorm
}
[System.IO.File]::WriteAllText($cssPath, $cssFinal, $utf8NoBom)
Write-Output "Successfully patched we-love.css"
