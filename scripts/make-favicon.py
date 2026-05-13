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
# Mirrors src/styles/global.css tokens:
#   accent #6b3410   paper #f5f1e8   ink #1a1814
TEXT = "旅"                      # journey / sojourn — ties to SojourningGhost
BG = (0x6b, 0x34, 0x10, 255)     # --accent (warm brown)
FG = (0xf5, 0xf1, 0xe8, 255)     # --paper (cream)
BORDER = (0xf5, 0xf1, 0xe8, 70)  # faint cream inner stroke at larger sizes
# -------------------------------------------------------------------------

SIZES = [16, 24, 32, 48, 64, 128, 256]
OUT = Path(__file__).resolve().parent.parent / "public" / "favicon.ico"

# Prefer Japanese Mincho (matches --serif-ja); fall back to Yu Gothic Bold
# and Chinese serifs so a kanji TEXT always renders with CJK glyphs.
FONT_CANDIDATES = [
    (r"C:\Windows\Fonts\yumin.ttf", 0),
    (r"C:\Windows\Fonts\yuminb.ttf", 0),
    (r"C:\Windows\Fonts\msmincho.ttc", 0),
    (r"C:\Windows\Fonts\YuGothB.ttc", 0),
    (r"C:\Windows\Fonts\simsun.ttc", 0),
    (r"C:\Windows\Fonts\mingliub.ttc", 0),
    ("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 0),
    ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc", 0),
]


def load_font(px: int) -> ImageFont.ImageFont:
    for path, index in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, px, index=index)
            except OSError:
                continue
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

    # Multi-glyph Latin monograms need a smaller ratio; a single CJK glyph
    # fills its em-box and looks best around 0.66.
    text = TEXT[0] if len(TEXT) > 1 and size <= 24 else TEXT
    if len(text) == 1:
        ratio = 0.78 if ord(text) < 0x2E80 else 0.66  # tighter for CJK
    else:
        ratio = 0.52
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
