with open(r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\we-love.css", "r", encoding="utf-8") as f:
    content = f.read()

print("we-love.css matches:")
for line in content.splitlines():
    if "sunday" in line or "7n" in line or "nth" in line or "day-cell" in line:
        print("  ", line)
