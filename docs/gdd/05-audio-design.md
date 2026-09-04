# 音频设计 GDD

## 设计原则

- 音色基底：古琴、箫、二胡、琵琶、中阮、笛、笙、唢呐、编钟、寺钟、中国鼓、建鼓、木鱼、梆子；少用西洋乐器，仅作为氛围垫底。
- 节奏：BPM 50–80 为主。战斗 BGM 才进入 90–130。避免 4-on-the-floor 节拍。
- 旋律：五声音阶（宫商角徵羽）为主，徵、羽调偏江湖萧索，宫、商调偏中原正大。
- 空间：所有 BGM 默认留出中央 20% 静音带用于 UI 文本朗读与对白。SFX 优先单声道短促。
- 循环：所有 BGM 必须以 4 或 8 小节自然淡入淡出收尾，禁止硬切。
- 音量：BGM 默认 −18 LUFS，SFX 默认 −12 LUFS，UI 点击 −6 LUFS。

## BGM 分类矩阵

| 大类 | 编号 | 用途 | 时长 | 主奏 | 调式 | BPM |
|---|---|---|---:|---|---|---:|
| 主菜单 | M01 | 标题屏 | 2:30 | 古琴+箫 | 羽 | 60 |
| 江湖游历 | T01–T13 | 13 区地图主旋律 | 各 1:30 | 见区域表 | — | — |
| 城内闲行 | C01 | 城镇/市井/白天 | 2:00 | 琵琶+中阮 | 商 | 72 |
| 城内夜雨 | C02 | 城镇/雨夜/已存在 rain-bg 配合 | 2:30 | 古琴+箫 | 羽 | 58 |
| 山林 | F01 | 山林/小径/采药 | 2:00 | 笛+木鱼 | 角 | 64 |
| 客栈酒肆 | I01 | 客栈/酒馆/聚会 | 1:45 | 二胡+琵琶 | 徵 | 78 |
| 战场 | B01 | 守城/突围 | 2:00 | 唢呐+大鼓 | 宫 | 110 |
| 江湖夜奔 | B02 | 追击/逃亡 | 1:45 | 二胡快弓+鼓 | 羽 | 132 |
| 主线剧情 | S01 | 关键剧情揭示 | 1:30 | 古琴泛音+箫 | 羽 | 50 |
| 支线闲趣 | S02 | 轻量支线 | 1:30 | 琵琶轮指 | 宫 | 80 |
| 离愁别绪 | S03 | 告别/旧事 | 2:00 | 二胡+古琴 | 羽 | 56 |
| 佛法梵音 | S04 | 天龙寺/一灯/少林 | 2:00 | 钟+木鱼+梵唱 | 商 | 52 |
| 异域商路 | S05 | 西夏/西域 | 1:45 | 琵琶+都塔尔模仿 | 角 | 84 |
| 海岛潮声 | S06 | 东海/海外 | 2:00 | 笛+潮声采样 | 徵 | 60 |
| 章节结束 | E01 | 通关/区域完成 | 0:30 | 编钟泛音 | 宫 | — |

## 13 区主旋律调性分配

| 区 | 调 | 主奏 | 风格关键词 |
|---|---|---|---|
| 江南东南 | 羽 | 古琴+箫 | 烟雨、画桥、丝竹 |
| 荆襄前线 | 宫变徵 | 唢呐+鼓 | 战鼓、号角、悲壮 |
| 中原腹地 | 商 | 琵琶+古琴 | 会盟、试剑、沉稳 |
| 河朔燕云 | 角 | 二胡+马头琴风 | 边风、霜雪、辽阔 |
| 塞北草原 | 徵 | 马头琴+笛 | 长调、骏马、苍茫 |
| 辽东大金 | 宫 | 大鼓+唢呐 | 铁骑、冰原、肃杀 |
| 白山黑水 | 羽 | 低箫+皮鼓 | 密林、暗哨、诡谲 |
| 西北西夏 | 角 | 琵琶+筚篥风 | 沙海、商队、神秘 |
| 关中秦地 | 商 | 古琴+秦腔帮腔 | 关山、剑气、古道 |
| 巴蜀西南 | 徵 | 笛+芦笙 | 栈道、云雾、灵秀 |
| 云贵大明 | 商 | 葫芦笙+中阮 | 烟瘴、茶马、温润 |
| 大理诸国 | 羽 | 箫+铜钟 | 梵唱、花海、古雅 |
| 东海海外 | 宫转羽 | 笛+潮声 | 沧波、孤岛、奇遇 |

## SFX 分组

| 组 | 现有 | 需补 | 备注 |
|---|---|---|---|
| UI | wood-pluck | click-paper, page-turn, scroll-unroll, tab-switch, lock-jingle, fail-buzz | 已有的 wood-pluck 复用作常规确认 |
| 反馈 | quest-complete | level-up, hp-low-pulse, exp-tick, reputation-up, reputation-down, danger-warning | quest-complete 复用为支线完成 |
| 状态 | — | poison-loop, heal-bell, detox-chime, death-thud, revive-gong | bell 系列与 breath-bell 共音色 |
| 战斗 | — | sword-draw, sword-clash ×3, dodge-whoosh, fist-impact, dodge-step, arrow-release, hidden-weapon-ping, critical-hit, kill-stinger | 短促、富有层次 |
| 移动 | — | footstep-stone, footstep-grass, footstep-wood, footstep-mud, jump, fall, roll | 提供三档随机变体 |
| 环境 | — | rain-loop, wind-loop, night-cricket-loop, fire-loop, stream-loop, temple-bell-loop, market-crowd-loop | 长循环 30–60 秒无缝 |
| 动物 | — | horse-gallop, horse-whinny, dog-bark, hawk-cry, monkey-screech, snake-hiss | 江南支线 04、32 等需要 |
| 物品 | — | coin-pouch, bottle-open, book-open, door-creak, bowl-drop, fire-crackle | 与行囊/背包系统配合 |

## 现有资产复用建议

- `wood-pluck.wav`：作为通用 UI 确认与切换 tab 的基础音，不改动。
- `quest-complete.wav`：作为任务完成反馈，建议加尾音 0.4 秒以与“主线完成”区分。
- `breath-bell.wav`：作为危险警告 / 进入高危 NPC 区域的提示，可与 poison-loop 共用钟声家族。

## 资源命名规范

```text
public/audio/
  bgm/{category}/{id}-{slug}.ogg     例如 bgm/zone/T01-jiangnan-rain.ogg
  sfx/{group}/{slug}-{variant}.wav   例如 sfx/combat/sword-clash-01.wav
  ambient/{slug}.ogg                  例如 ambient/rain-loop.ogg
```

所有文件 < 400 KB（BGM）或 < 80 KB（SFX）。优先 OGG Vorbis q5，浏览器兼容性最佳。

## 与 UI 配合

- 切区时 BGM 需 1.2 秒交叉淡化。
- 进入战斗时 BGM 立即淡出，B01/B02 在 0.8 秒内淡入。
- 关键剧情对白期间 BGM 自动 duck 至 −24 LUFS，对白结束 2 秒内恢复。
- 主菜单 → 江湖 → 游历的层级切换需音色调性呈上行五度（M01 羽 → T01 角 → C01 商）。
