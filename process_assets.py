import os
from PIL import Image

input_path = r'C:\Users\Aqeel\.gemini\antigravity\brain\babdb5d2-8e21-4139-9bb4-5802d1f8c1b9\uploaded_media_1769969049308.jpg'
output_dir = r'd:\Sign Language\SingLanguage\assets'

def resize_and_save(src, dest, size):
    img = Image.open(src)
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Resize with high quality
    img = img.resize(size, Image.Resampling.LANCZOS)
    img.save(dest)
    print(f"Saved: {dest} ({size[0]}x{size[1]})")

# Create assets dir if not exists
os.makedirs(output_dir, exist_ok=True)

# 1. Main Icon (1024x1024)
resize_and_save(input_path, os.path.join(output_dir, 'icon.png'), (1024, 1024))

# 2. Splash Icon (Resized with padding for splash screen)
# Splash icons should typically be centered. We'll make a 1024x1024 version as well.
resize_and_save(input_path, os.path.join(output_dir, 'splash-icon.png'), (1024, 1024))

# 3. Adaptive Icon Foreground (1024x1024) - Android specific
resize_and_save(input_path, os.path.join(output_dir, 'adaptive-icon.png'), (1024, 1024))

# 4. Favicon (48x48)
resize_and_save(input_path, os.path.join(output_dir, 'favicon.png'), (48, 48))

print("Asset processing complete!")
