# 江湖长夜 UI 素材与实现规范

## 当前素材

源文件在 `art-src/`（PNG，不部署）。站点只发布 `public/art/**/*.webp`（`python scripts/optimize-art.py`）。

| 文件 | 用途 | 状态 |
|---|---|---|
| `art-src/ui/wuxia-attribute-kit-v1.png` | 右栏属性铜牌与四枚垂挂签的切片源表 | 源文件，禁止打进 `public/` |
| `art-src/ui/wuxia-core-ui-kit-v1.png` | 纸卷 / 导航匾 / 徽记 / 挂机条 / 日志框切片源表 | 源文件，禁止打进 `public/` |
| `public/art/story-parchment.webp` | 中央剧情纸卷 | 已接入（由源 PNG 压缩） |
| `public/art/wanderer-portrait.webp` | 侠客圆形头像 | 已接入（显示约 174px，源缩到 400px） |
| `public/art/jianghu-rain-bg.webp` | 全局雨夜背景 | 已接入（约 1280×720） |
| `public/art/ui/slices/*.webp` | 徽记、属性面板、挂签、挂机条、日志框、弹窗纸卷 | 已接入 |

## 右栏实现规则

1. 三项属性固定为「气血、内力、声望」，每项由图标、名称、进度条和实时数值组成。
2. 气血使用朱红，内力使用青绿，声望使用暗金；颜色和进度必须由 CSS/React 动态渲染。
3. `查看详细属性` 是实按钮，不得画入底图。
4. 成就、信件、排行、设置使用四枚垂挂签；标签文字由代码绘制，点击必须产生可见反馈（页签切换、日志或弹层）。
5. 生图素材不得直接承载中文、数字、任务状态或按钮文案；它们容易失真且不可本地化。

## 使用方式

```css
/* 仅作为装饰层。内容层仍保留普通 HTML。 */
.hero-ornament {
  background-image: url('/art/ui/slices/attr-panel.webp');
  background-repeat: no-repeat;
  pointer-events: none;
}
```

将素材裁成独立面板/挂签前，先保留原始 `-v1` 文件于 `art-src/`；新版本使用递增文件名，例如 `wuxia-attribute-panel-v2.png`。不要覆盖已有素材。切图用 `scripts/slice-ui.py`，再跑 `npm run art:optimize` 写出 WebP。

## 目录约定

```text
art-src/                      # PNG 源，不进 dist
├─ jianghu-rain-bg.png
├─ story-parchment.png
├─ wanderer-portrait.png
└─ ui/
   ├─ wuxia-attribute-kit-v1.png
   ├─ wuxia-core-ui-kit-v1.png
   └─ slices/*.png
public/art/                   # 仅 WebP，按显示尺寸压缩
├─ jianghu-rain-bg.webp
├─ story-parchment.webp
├─ wanderer-portrait.webp
└─ ui/slices/*.webp
```

不要把整张素材表直接作为单一背景使用，也不要把 kit 源 PNG 放进 `public/`。

## 视觉验收

- 1440px 桌面：左导航、中央纸卷、右人物栏、底部日志同屏。
- 右栏不允许单一气血条拉成长色块；属性面板高度应由三行属性自然撑开。
- 移动端：挂签可换行或横向滚动，但文字与操作区不得被裁切。
