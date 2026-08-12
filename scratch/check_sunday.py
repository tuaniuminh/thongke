with open(r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\am-lich.css", "r", encoding="utf-8") as f:
    content = f.read()

print("am-lich.css:")
for line in content.splitlines():
    if "sunday" in line or "7n" in line or "nth" in line:
        print("  ", line)

with open(r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\style.css", "r", encoding="utf-8") as f:
    content_style = f.read()

print("style.css:")
for line in content_style.splitlines():
    if "sunday" in line or "7n" in line or "nth" in line:
        print("  ", line)
