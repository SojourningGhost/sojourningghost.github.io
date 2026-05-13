"""
Generate public/favicon.ico — a hanko-inspired placeholder.

Re-run after editing the TEXT or COLOR constants below:
    python scripts/make-favicon.py

Outputs a multi-size ICO (16, 24, 32, 48, 64, 128, 256) so every browser
and OS context picks a crisp version.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# --- edit these to change the placeholder --------------------------------
TEXT = "SG"
BG = (178, 58, 42, 255)         # 朱 vermilion seal red
FG = (255, 255, 255, 255)       # carved-out white
BORDER = (255, 255, 255, 60)    # faint inner stroke at larger sizes
# -------------------------------------------------------------------------

SIZES = [16, 24, 32, 48, 64, 128, 256]
OUT = Path(__file__).resolve().parent.parent / "public" / "favicon.ico"

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\georgiab.ttf",
    r"C:\Windows\Fonts\timesbd.ttf",
    r"C:\Windows\Fonts\palab.ttf",
    "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
]


def load_font(px: int) -> ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def render(size: int) -> Image.Image:
    # Super-sample 4x then downsample for clean antialiased edges.
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = max(1, s // 7)
    d.rounded_rectangle([(0, 0), (s - 1, s - 1)], radius=radius, fill=BG)

    # Inner hairline border adds character at large sizes; below 48 it just
    # looks like aliasing noise, so skip it.
    if size >= 48:
        inset = max(1, s // 16)
        d.rounded_rectangle(
            [(inset, inset), (s - 1 - inset, s - 1 - inset)],
            radius=max(1, radius - inset),
            outline=BORDER,
            width=max(1, s // 96),
        )

    # At tab sizes a two-letter monogram crowds; drop to the lead letter so
    # each glyph gets enough pixels to read.
    text = TEXT[0] if size <= 24 else TEXT
    ratio = 0.70 if len(text) == 1 else 0.52
    font_px = int(s * ratio)
    font = load_font(font_px)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (s - tw) // 2 - bbox[0]
    ty = (s - th) // 2 - bbox[1] - max(1, s // 48)  # optical lift
    d.text((tx, ty), text, fill=FG, font=font)

    return img.resize((size, size), Image.LANCZOS)


def main() -> int:
    # Render largest first; PIL's ICO writer only DOWNSCALES, so the base
    # image must be at least as large as every requested size. Smaller
    # hand-tuned renders are passed via append_images and matched by size.
    images = sorted((render(sz) for sz in SIZES), key=lambda i: -i.size[0])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(
        OUT,
        format="ICO",
        sizes=[(s, s) for s in SIZES],
        append_images=images[1:],
    )
    print(f"wrote {OUT} ({len(SIZES)} sizes: {', '.join(str(s) for s in SIZES)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
