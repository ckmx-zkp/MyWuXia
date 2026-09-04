# 江湖长夜 UI 素材与实现规范

## 当前素材

| 文件 | 用途 | 状态 |
|---|---|---|
| `public/art/wuxia-attribute-kit-v1.png` | 右栏属性铜牌与四枚垂挂签的风格参考/精修源素材 | 已生成 |
| `public/art/ui/wuxia-attribute-kit-v1.png` | 右栏属性铜牌与四枚垂挂签 | 已切片接入（属性面板、四枚挂签） |
| `public/art/ui/wuxia-core-ui-kit-v1.png` | 纸卷任务框、左导航框、资源徽记、挂机条、日志框 | 已切片接入（`slices/`，脚本 `scripts/slice-ui.py`） |
| `public/art/story-parchment.png` | 中央剧情纸卷 | 已接入 |
| `public/art/wanderer-portrait.png` | 侠客圆形头像 | 已接入 |
| `public/art/jianghu-rain-bg.png` | 全局雨夜背景与日志底图 | 已接入 |

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
  background-image: url('/art/wuxia-attribute-kit-v1.png');
  background-repeat: no-repeat;
  pointer-events: none;
}
```

将素材裁成独立面板/挂签前，先保留原始 `-v1` 文件；新版本使用递增文件名，例如 `wuxia-attribute-panel-v2.png`。不要覆盖已有素材。

## 目录约定

```text
public/art/
├─ jianghu-rain-bg.png        # 全屏环境背景
├─ story-parchment.png        # 已接入的主纸卷
├─ wanderer-portrait.png      # 角色肖像
└─ ui/                        # 所有可复用 UI 底图与切片源
   ├─ wuxia-attribute-kit-v1.png
   └─ wuxia-core-ui-kit-v1.png
```

`wuxia-core-ui-kit-v1.png` 已补齐五类尚缺视觉件：任务纸卷、左侧导航框、银两/修为徽记、挂机收益条、江湖日志框。后续接入时以 CSS 背景定位或离线裁切生成独立 PNG；不要把整张素材表直接作为单一背景使用。

## 视觉验收

- 1440px 桌面：左导航、中央纸卷、右人物栏、底部日志同屏。
- 右栏不允许单一气血条拉成长色块；属性面板高度应由三行属性自然撑开。
- 移动端：挂签可换行或横向滚动，但文字与操作区不得被裁切。
