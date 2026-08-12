import os

css_dir = r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css"
results = []
for filename in os.listdir(css_dir):
    if filename.endswith(".css"):
        filepath = os.path.join(css_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        for i, line in enumerate(content.splitlines()):
            if "visibility" in line or "opacity" in line or "display: none" in line:
                results.append(f"{filename} line {i+1}: {line.strip()}")

with open(r"C:\Users\PC VIP\Documents\Thong-ke\scratch\hidden_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
print("Done writing results.")
