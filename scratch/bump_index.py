import sys

index_path = r"C:\Users\PC VIP\Documents\Thong-ke\index.html"

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace 4.3.168 → 4.3.172 in index.html (all occurrences)
new_content = content.replace("4.3.168", "4.3.172")

if content == new_content:
    print("No changes made. Check version strings.")
else:
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    count = content.count("4.3.168")
    print(f"Replaced {count} occurrences of 4.3.168 -> 4.3.172 in index.html")
