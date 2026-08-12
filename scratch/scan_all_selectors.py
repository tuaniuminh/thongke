with open(r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css\style.css", "r", encoding="utf-8") as f:
    content = f.read()

classes = [
    "lunar-calendar-col",
    "lunar-detail-col",
    "lunar-modal-body",
    "lunar-day-cell",
    "lunar-week-header",
    "lunar-week-header-row"
]

print("Scanning style.css for classes:")
for c in classes:
    if c in content:
        print(f"Found {c} in style.css!")
    else:
        print(f"No match for {c}")
