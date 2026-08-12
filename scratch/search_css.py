import os

css_dir = r"C:\Users\PC VIP\Documents\Thong-ke\src\assets\css"
for filename in os.listdir(css_dir):
    if filename.endswith(".css"):
        filepath = os.path.join(css_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Check for grid-template-columns
        if "grid-template-columns" in content:
            print(f"Found grid-template-columns in {filename}:")
            for line in content.splitlines():
                if "grid-template-columns" in line:
                    print("  ", line)
                    
        # Check for lunar-calendar-grid
        if "lunar-calendar-grid" in content:
            print(f"Found lunar-calendar-grid in {filename}:")
            for line in content.splitlines():
                if "lunar-calendar-grid" in line:
                    print("  ", line)
