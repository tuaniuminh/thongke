import os
from PIL import Image

def generate_icons():
    source_path = "icon-512.png"
    icons_dir = os.path.join("src-tauri", "icons")
    
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
        
    print(f"Loading source icon: {source_path}")
    img = Image.open(source_path)
    
    # 1. Save standard PNGs
    img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "32x32.png"))
    img.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128.png"))
    img.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "128x128@2x.png"))
    img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, "icon.png"))
    print("PNG icons generated.")
    
    # 2. Save ICO (contains multiple sizes)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_imgs = [img.resize(size, Image.Resampling.LANCZOS) for size in ico_sizes]
    img.save(os.path.join(icons_dir, "icon.ico"), format="ICO", sizes=ico_sizes)
    print("ICO icon generated.")
    
    # 3. Save ICNS
    # Pillow supports ICNS format directly
    try:
        # ICNS requires specific sizes: 16, 32, 64, 128, 256, 512, 1024
        img.save(os.path.join(icons_dir, "icon.icns"), format="ICNS")
        print("ICNS icon generated.")
    except Exception as e:
        print(f"Warning: Failed to save ICNS: {e}. Creating a fallback copy.")
        # Fallback to copy the 512x512 png as a placeholder
        img.save(os.path.join(icons_dir, "icon.icns"))

if __name__ == "__main__":
    generate_icons()
