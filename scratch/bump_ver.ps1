$files = @(
    'version.json',
    'package.json',
    'manifest.json',
    'index.html',
    'sw.js',
    'src\core\app.js',
    'src\features\ket-noi-gia-dinh\ket-noi.js',
    'src\features\ho-so-y-te\ho-so-y-te.js',
    'src\features\quy-gia-dinh\quy-gia-dinh.js',
    'src\features\quy-gia-dinh\bao-cao-thang.js',
    'src\features\thu-chi-doi-ngoai\thu-chi.js',
    'src\features\we-love\we-love.js'
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $files) {
    if (Test-Path $f) {
        $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
        if ($content.Contains('4.3.137')) {
            $newContent = $content.Replace('4.3.137', '4.3.138')
            [System.IO.File]::WriteAllText($f, $newContent, $utf8NoBom)
            Write-Host "Updated: $f"
        } else {
            Write-Host "No 4.3.137 found in: $f"
        }
    }
}
