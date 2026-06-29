import os
from PIL import Image, ImageDraw, ImageFont

def create_youtube_scraper_icon(size):
    # Create high-res supersampled image for anti-aliasing (4x size)
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Base YouTube Red rounded rectangle background
    margin = int(s * 0.05)
    rect = [margin, margin, s - margin, s - margin]
    radius = int(s * 0.22)
    
    # Draw dark red shadow / border
    draw.rounded_rectangle(rect, radius=radius, fill=(204, 0, 0, 255))
    
    # Draw main bright red play button badge
    inner_margin = margin + int(s * 0.02)
    inner_rect = [inner_margin, inner_margin, s - inner_margin, s - inner_margin]
    draw.rounded_rectangle(inner_rect, radius=int(radius * 0.9), fill=(255, 0, 0, 255))

    # Center play triangle (white)
    # Move triangle slightly left to balance visually
    cx, cy = s * 0.46, s * 0.50
    tw, th = s * 0.22, s * 0.26
    
    triangle = [
        (cx - tw * 0.5, cy - th * 0.5),
        (cx + tw * 0.8, cy),
        (cx - tw * 0.5, cy + th * 0.5)
    ]
    draw.polygon(triangle, fill=(255, 255, 255, 255))

    # Magnifying glass / Contact badge overlay on bottom-right corner
    # Outer circle for glass
    glass_cx, glass_cy = s * 0.70, s * 0.70
    glass_r = s * 0.18
    
    # Dark shadow ring
    draw.ellipse([glass_cx - glass_r - 2, glass_cy - glass_r - 2, glass_cx + glass_r + 2, glass_cy + glass_r + 2], fill=(40, 0, 0, 200))
    # White background for search/contact badge
    draw.ellipse([glass_cx - glass_r, glass_cy - glass_r, glass_cx + glass_r, glass_cy + glass_r], fill=(255, 255, 255, 255))
    
    # Inner lens accent (cyan/blue or dark grey)
    lens_r = glass_r * 0.7
    draw.ellipse([glass_cx - lens_r, glass_cy - lens_r, glass_cx + lens_r, glass_cy + lens_r], fill=(240, 245, 250, 255))
    
    # Magnifying glass handle
    handle_w = int(s * 0.05)
    draw.line([glass_cx + glass_r * 0.6, glass_cy + glass_r * 0.6, glass_cx + glass_r * 1.3, glass_cy + glass_r * 1.3], fill=(30, 30, 30, 255), width=handle_w)

    # Downsample with LANCZOS for crystal clear anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

output_dir = r"C:\Users\HP\Documents\work\youtube_scraper\icons"
os.makedirs(output_dir, exist_ok=True)

sizes = [16, 48, 128]
for sz in sizes:
    icon = create_youtube_scraper_icon(sz)
    out_path = os.path.join(output_dir, f"icon{sz}.png")
    icon.save(out_path, "PNG")
    print(f"Generated {out_path} ({sz}x{sz})")
