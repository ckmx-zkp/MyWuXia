# 江湖长夜 GDD 文档库

本目录存放可评审、可拆分实现的游戏策划文档；项目级开发约定见根目录 `AGENTS.md`。

| 文档 | 内容 |
|---|---|
| [01-world-map.md](01-world-map.md) | 13 大区、政权、缓冲区与地理连接 |
| [02-quest-system.md](02-quest-system.md) | 沙盒世界、线性任务树、状态与奖励规范 |
| [03-launch-task-trees.md](03-launch-task-trees.md) | 第一批 10 棵正式原著任务树 |
| [04-dali-task-tree.md](04-dali-task-tree.md) | 大理区域的详细任务样板 |
| [05-audio-design.md](05-audio-design.md) | BGM / SFX 分类、13 区调性、命名与音量规范 |
| [06-map-infrastructure.md](06-map-infrastructure.md) | 地图基础设施：两层结构（生活+原著）与四大母版规范 |
| [07-dialogue-framework.md](07-dialogue-framework.md) | 剧本与事件文案工程规范（文案框架与对话标准） |
| [08-jiangnan-daily-quests.md](08-jiangnan-daily-quests.md) | 基础设施层：江南大宋六大城市生活支线与循环日常库 |
| [quests/DL-01-wuliang-crisis.md](quests/DL-01-wuliang-crisis.md) | 任务树剧本：大理·DL-01《无量山风波》（含完整对话与事件文案） |
| [quests/DL-02-nandi-track.md](quests/DL-02-nandi-track.md) | 任务树剧本：大理·DL-02《南帝旧踪与桃源避世》（含完整对话与事件文案） |
| [quests/JX-01-zuixianlou.md](quests/JX-01-zuixianlou.md) | 任务树剧本：嘉兴·JX-01《醉仙楼十八年之约》（含完整对话与事件文案） |
| [quests/YZ-01-weixiaobao.md](quests/YZ-01-weixiaobao.md) | 任务树剧本：扬州·YZ-01《市井小宝与丽春深澜》（含完整对话与事件文案） |
| [quests/FZ-01-fuwei-crisis.md](quests/FZ-01-fuwei-crisis.md) | 任务树剧本：福州·FZ-01《福威血夜与辟邪遗恨》（含完整对话与事件文案） |
| [quests/SZ-01-yanziwu.md](quests/SZ-01-yanziwu.md) | 任务树剧本：苏州·SZ-01《姑苏燕子坞与还施水阁》（含完整对话与事件文案） |
| [quests/HZ-01-meizhuang.md](quests/HZ-01-meizhuang.md) | 任务树剧本：杭州·HZ-01《西湖梅庄与琴棋书画四友》（含完整对话与事件文案） |
| [quests/WX-01-xingzilin.md](quests/WX-01-xingzilin.md) | 任务树剧本：无锡·WX-01《杏子林变局与身世惊雷》（含完整对话与事件文案） |

## 冻结原则

世界是沙盒非线性的；每一棵原著主线任务树内部保持线性。玩家能影响过程、旁支 NPC、奖励、关系和局部损失，但不取代原著核心人物的命运。
