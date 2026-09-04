#!/usr/bin/env python3
"""把 PNG 源文件归档到 art-src/，再按显示尺寸写出 WebP 到 public/art/。

不覆盖已有 PNG；站点只部署 WebP。用法: python scripts/optimize-art.py
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "art"
SRC = ROOT / "art-src"

# (src relative to art-src, dest relative to public/art, max_w, max_h, quality)
# max_h=None 表示只限宽。2x 视网膜余量已含在尺寸里。
JOBS = [
    ("jianghu-rain-bg.png", "jianghu-rain-bg.webp", 1280, 720, 72),
    ("story-parchment.png", "story-parchment.webp", 1024, 700, 78),
    ("wanderer-portrait.png", "wanderer-portrait.webp", 400, 400, 80),
    ("ui/slices/attr-panel.png", "ui/slices/attr-panel.webp", 560, 640, 78),
    ("ui/slices/idle-bar.png", "ui/slices/idle-bar.webp", 1030, 225, 78),
    ("ui/slices/log-frame.png", "ui/slices/log-frame.webp", 1445, 320, 78),
    ("ui/slices/scroll-mission.png", "ui/slices/scroll-mission.webp", 900, 400, 78),
    ("ui/slices/nav-plaque.png", "ui/slices/nav-plaque.webp", 160, 480, 78),
    ("ui/slices/emblem-silver.png", "ui/slices/emblem-silver.webp", 96, 96, 80),
    ("ui/slices/emblem-cultivate.png", "ui/slices/emblem-cultivate.webp", 96, 96, 80),
    ("ui/slices/tag-achieve.png", "ui/slices/tag-achieve.webp", 120, 480, 78),
    ("ui/slices/tag-letter.png", "ui/slices/tag-letter.webp", 120, 480, 78),
    ("ui/slices/tag-rank.png", "ui/slices/tag-rank.webp", 120, 480, 78),
    ("ui/slices/tag-setting.png", "ui/slices/tag-setting.webp", 120, 480, 78),
]

ARCHIVE = [
    ("jianghu-rain-bg.png", "jianghu-rain-bg.png"),
    ("story-parchment.png", "story-parchment.png"),
    ("wanderer-portrait.png", "wanderer-portrait.png"),
    ("ui/wuxia-attribute-kit-v1.png", "ui/wuxia-attribute-kit-v1.png"),
    ("ui/wuxia-core-ui-kit-v1.png", "ui/wuxia-core-ui-kit-v1.png"),
]


def archive_pngs() -> None:
    """把 public 里的 PNG 源搬到 art-src，不覆盖已有源文件。"""
    SRC.mkdir(parents=True, exist_ok=True)
    for rel, dest in ARCHIVE:
        src = PUBLIC / rel
        dst = SRC / dest
        if src.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists():
                shutil.copy2(src, dst)
                print(f"archive {rel} -> art-src/{dest}")
    slices = PUBLIC / "ui" / "slices"
    if slices.exists():
        out = SRC / "ui" / "slices"
        out.mkdir(parents=True, exist_ok=True)
        for png in slices.glob("*.png"):
            dst = out / png.name
            if not dst.exists():
                shutil.copy2(png, dst)
                print(f"archive slices/{png.name}")


def fit(im: Image.Image, max_w: int, max_h: int | None) -> Image.Image:
    w, h = im.size
    scale = min(max_w / w, (max_h / h) if max_h else 1.0, 1.0)
    if scale >= 0.999:
        return im
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def emit_webp() -> None:
    total = 0
    for src_rel, dest_rel, max_w, max_h, q in JOBS:
        src = SRC / src_rel
        if not src.exists():
            raise SystemExit(f"missing source {src}")
        dest = PUBLIC / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(src)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im = fit(im, max_w, max_h)
        im.save(dest, "WEBP", quality=q, method=6)
        kb = dest.stat().st_size / 1024
        total += dest.stat().st_size
        print(f"{dest.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {kb:.1f} KB  q={q}")
    print(f"webp total {total / 1024:.1f} KB")


def strip_public_png() -> None:
    """站点目录不再放 PNG 源/切片，避免 dist 再带上十几 MB。"""
    removed = 0
    for png in PUBLIC.rglob("*.png"):
        png.unlink()
        removed += 1
        print(f"remove public {png.relative_to(PUBLIC)}")
    print(f"removed {removed} png from public/art")


if __name__ == "__main__":
    archive_pngs()
    emit_webp()
    strip_public_png()
