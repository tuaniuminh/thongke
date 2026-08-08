$files = @(
    'src\core\app.js',
    'src\features\quy-gia-dinh\quy-gia-dinh.js',
    'src\features\quy-gia-dinh\bao-cao-thang.js',
    'src\features\we-love\we-love.js',
    'src\features\thu-chi-doi-ngoai\thu-chi.js',
    'src\features\ho-so-y-te\ho-so-y-te.js',
    'src\features\ket-noi-gia-dinh\ket-noi.js',
    'sw.js'
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    if ($hasBom) {
        # Co BOM → doc lai nhu UTF8 (PowerShell tu xu ly BOM), luu lai khong BOM
        $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        [System.IO.File]::WriteAllText($f, $content, $utf8NoBom)
        Write-Host "Removed BOM: $f"
    } else {
        Write-Host "No BOM (OK): $f"
    }
}
Write-Host "Done."
