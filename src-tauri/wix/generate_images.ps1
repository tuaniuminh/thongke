Add-Type -AssemblyName System.Drawing

$iconPath = "C:\Users\PC VIP\Downloads\Thong-ke\src\assets\images\icon-light.png"
$wixDir = "C:\Users\PC VIP\Downloads\Thong-ke\src-tauri\wix"

if (-not (Test-Path $wixDir)) {
    New-Item -ItemType Directory -Force -Path $wixDir
}

# Load source icon image
$icon = [System.Drawing.Image]::FromFile($iconPath)

# 1. Create banner.bmp (493x58)
$bannerWidth = 493
$bannerHeight = 58
$bannerBmp = New-Object System.Drawing.Bitmap($bannerWidth, $bannerHeight)
$bannerGraphics = [System.Drawing.Graphics]::FromImage($bannerBmp)

# Fill background with Solid White
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$bannerGraphics.FillRectangle($whiteBrush, 0, 0, $bannerWidth, $bannerHeight)

# Draw icon resized at right side (X = 430, Y = 5, Size = 48x48)
$bannerGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$bannerGraphics.DrawImage($icon, 430, 5, 48, 48)

# Clean up banner drawing resources
$whiteBrush.Dispose()
$bannerGraphics.Dispose()

# Save banner.bmp
$bannerSavePath = Join-Path $wixDir "banner.bmp"
$bannerBmp.Save($bannerSavePath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$bannerBmp.Dispose()
Write-Host "Saved banner.bmp to $bannerSavePath"

# 2. Create dialog.bmp (164x312)
$dialogWidth = 164
$dialogHeight = 312
$dialogBmp = New-Object System.Drawing.Bitmap($dialogWidth, $dialogHeight)
$dialogGraphics = [System.Drawing.Graphics]::FromImage($dialogBmp)

# Fill background with Linear Gradient from top-left (#0284c7) to bottom-right (#1d4ed8)
$colorStart = [System.Drawing.Color]::FromArgb(255, 2, 132, 199)
$colorEnd = [System.Drawing.Color]::FromArgb(255, 29, 78, 216)
$rect = New-Object System.Drawing.Rectangle(0, 0, $dialogWidth, $dialogHeight)
$gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorStart, $colorEnd, 90.0) # 90 degrees = vertical gradient

$dialogGraphics.FillRectangle($gradientBrush, $rect)

# Draw icon resized at center (X = 42, Y = 100, Size = 80x80)
$dialogGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$dialogGraphics.DrawImage($icon, 42, 100, 80, 80)

# Clean up dialog drawing resources
$gradientBrush.Dispose()
$dialogGraphics.Dispose()

# Save dialog.bmp
$dialogSavePath = Join-Path $wixDir "dialog.bmp"
$dialogBmp.Save($dialogSavePath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$dialogBmp.Dispose()
Write-Host "Saved dialog.bmp to $dialogSavePath"

# Clean up source icon
$icon.Dispose()
