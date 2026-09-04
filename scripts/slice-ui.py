#!/usr/bin/env python3
# 江湖长夜 UI 素材切片：从素材表裁出独立组件 PNG（见 docs/ui/UI-ASSET-GUIDE.md）
# 用法: python scripts/slice-ui.py
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / 'public' / 'art' / 'ui'
OUT = UI / 'slices'
OUT.mkdir(exist_ok=True)

# (源文件, 输出名, 裁剪框 left/top/right/bottom — 原图 1536x1024 坐标)
CUTS = [
    # 核心 UI 素材表
    ('wuxia-core-ui-kit-v1.png', 'scroll-mission.png', (20, 10, 1035, 460)),      # 任务纸卷
    ('wuxia-core-ui-kit-v1.png', 'idle-bar.png', (10, 455, 1040, 680)),           # 挂机收益条
    ('wuxia-core-ui-kit-v1.png', 'log-frame.png', (35, 685, 1480, 1000)),         # 江湖日志框
    ('wuxia-core-ui-kit-v1.png', 'nav-plaque.png', (1050, 0, 1210, 590)),         # 竖匾
    ('wuxia-core-ui-kit-v1.png', 'emblem-silver.png', (1185, 5, 1480, 300)),      # 银两徽记
    ('wuxia-core-ui-kit-v1.png', 'emblem-cultivate.png', (1240, 300, 1480, 620)), # 修为徽记
    # 右栏属性素材表
    ('wuxia-attribute-kit-v1.png', 'attr-panel.png', (0, 0, 900, 1015)),          # 龙纹属性面板
    ('wuxia-attribute-kit-v1.png', 'tag-achieve.png', (910, 0, 1056, 1024)),      # 挂签·成就
    ('wuxia-attribute-kit-v1.png', 'tag-letter.png', (1060, 0, 1214, 1024)),      # 挂签·信件
    ('wuxia-attribute-kit-v1.png', 'tag-rank.png', (1214, 0, 1368, 1024)),        # 挂签·排行
    ('wuxia-attribute-kit-v1.png', 'tag-setting.png', (1367, 0, 1536, 1024)),     # 挂签·设置
]

for src, name, box in CUTS:
    img = Image.open(UI / src)
    img.crop(box).save(OUT / name)
    print(f'{name} {box[2]-box[0]}x{box[3]-box[1]}')
print('done ->', OUT)
