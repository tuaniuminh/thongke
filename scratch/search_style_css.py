with open(r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\style.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "repeat(3, 1fr) !important" in line or "260px 1fr" in line:
        print(f"Line {i+1}:")
        start = max(0, i-5)
        end = min(len(lines), i+6)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].strip()}")
