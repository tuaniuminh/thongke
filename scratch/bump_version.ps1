$files = @(
    'src\core\app.js',
    'src\features\ket-noi-gia-dinh\ket-noi.js',
    'src\features\ho-so-y-te\ho-so-y-te.js',
    'src\features\quy-gia-dinh\quy-gia-dinh.js',
    'src\features\quy-gia-dinh\bao-cao-thang.js',
    'src\features\thu-chi-doi-ngoai\thu-chi.js',
    'src\features\we-love\we-love.js',
    'sw.js'
)
foreach ($file in $files) {
    if (Test-Path $file) {
        $raw = Get-Content -Path $file -Raw -Encoding UTF8
        $updated = $raw -replace '\?v=4\.3\.135', '?v=4.3.136'
        if ($raw -ne $updated) {
            Set-Content -Path $file -Value $updated -Encoding UTF8 -NoNewline
            Write-Host "Updated: $file"
        } else {
            Write-Host "No change: $file"
        }
    } else {
        Write-Host "Not found: $file"
    }
}
Write-Host "Done."
