import os

version_old = "4.3.179"
version_new = "4.3.180"

files_to_bump = [
    r"C:\Users\PC VIP\Documents\Thong-ke\version.json",
    r"C:\Users\PC VIP\Documents\Thong-ke\package.json",
    r"C:\Users\PC VIP\Documents\Thong-ke\manifest.json",
    r"C:\Users\PC VIP\Documents\Thong-ke\sw.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\index.html",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\core\app.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\ket-noi-gia-dinh\ket-noi.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\ho-so-y-te\ho-so-y-te.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\quy-gia-dinh\quy-gia-dinh.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\quy-gia-dinh\bao-cao-thang.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\thu-chi-doi-ngoai\thu-chi.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\we-love\we-love.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\features\am-lich\am-lich.js",
    r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\am-lich.css",
]

for file_path in files_to_bump:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = content.replace(version_old, version_new)
        if content != new_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Bumped: {os.path.basename(file_path)}")
        else:
            print(f"No change: {os.path.basename(file_path)}")
    else:
        print(f"NOT FOUND: {file_path}")
