# 江湖长夜 · 架构优化方案

> 本文基于 2026-09-05 工作区版本（最近一次提交：首屏 WebP 压缩、字体移除、挂机节流）整理。目标是让后续扩展任务树、动态 NPC、门派和跨区事件时，继续保持可测试、可回滚、可按需加载。

## 一、当前基线

- 技术栈：React 19 + Vite 8，单入口 `src/main.jsx`，全局样式 `src/style.css`。
- `main.jsx` 同时承载世界数据、任务文本、数值规则、存档、音频管理和全部界面，当前约 1700 行。
- 任务树、设施、物品、音频路径均由代码常量直接引用；剧情尚未按区域分包。
- 游戏状态以多个 `useState` 组合维护；挂机由定时器驱动，存档使用 `localStorage`。
- 最近优化已将 UI 图片转为 WebP，并降低挂机状态刷新频率；生产构建应继续以 `npm run build` 为上线门槛。

## 二、优化目标

1. 内容只有一个权威来源，文档、配音、奖励和运行时数据可自动校验。
2. 规则层脱离 React，能够用固定随机种子重放和单元测试。
3. 存档可迁移，能够表达选择分支、世界标记和 NPC 阶段。
4. 首屏只加载当前区域所需内容，非当前剧情按需加载。
5. 挂机、音频、弹窗和移动端交互不产生状态串档或资源泄漏。

## 三、推荐目标结构

```text
src/
  app/                         # App、Provider、页面组合
  content/
    world.ts                   # 区域、邻接、设施、传闻
    quests/<quest-id>.ts       # 每棵任务树独立文件
    items.ts / skills.ts
  game/
    state.ts                   # GameState、初始值、版本迁移
    reducer.ts                 # 玩家 action 的唯一入口
    engine.ts                  # 旅行、任务、切磋、挂机纯函数
    selectors.ts               # 等级、能力、成就等派生值
  features/
    travel/ quests/ character/ facilities/
  components/
    layout/ modal/ common/
  services/audio-manager.ts
```

## 四、实施顺序与验收标准

### P0：状态正确性

- 将 `idleHold` 纳入游戏状态，或在重开、创角、读档、暂停和开始行动时统一清算并清零。
- 所有动作通过 `dispatch(action)` 进入 reducer；禁止组件直接拼接部分状态。
- 增加重复点击保护：同一剧情节点结算只能成功一次。

验收：挂机后重开角色，新角色经验不继承旧角色；刷新、切后台、暂停和进行中行动均不会重复发放经验或奖励。

### P1：领域层与存档

- 提取 `engine.ts`，为随机函数注入 `rng`，测试成功、软失败、消耗品、邻接旅行和切磋结算。
- 存档格式使用 `{ version, savedAt, state }`；保留 `migrateSave()`，禁止继续只做浅层对象合并。
- 将任务进度从数字计数升级为节点、选择、奖励和世界标记，例如：

```js
questStates: {
  "0:YZ-01": { node: 2, choices: { Q01: "rescue" } }
}
flags: { wei_xiaobao_stage: "northbound" }
```

验收：旧版 `jianghu-save-v1` 能迁移；新加字段不会使旧档出现 `undefined`；相同 RNG 种子能重现同一结算。

### P1：内容工程化

- 任务树统一为一个数据源，推荐每树一个 TS/JSON 文件；不要同时在 JSX 和独立数据文件维护副本。
- 建立 Quest Schema，校验五模块（scene、dialogues、choices/outcome、hearsay、奖励/前置）。
- 构建时检查物品 ID、语音路径、任务 ID、区域 ID 和前置任务是否存在。

验收：`npm run content:validate` 能在缺字段或资源不存在时失败，并输出任务 ID 与节点 ID。

### P2：渲染与首屏

- 将 `App` 拆为区域导航、任务树、设施、角色栏、日志和弹窗；静态列表提取到组件外。
- 使用 reducer/selector 让挂机更新只影响经验、进度和日志相关组件；必要处使用 `memo`。
- 按区域动态 `import()` 剧情数据，当前区优先加载，相邻区空闲预加载。

验收：首屏 JS 体积下降；挂机期间地图和未变化面板不重复渲染；移动端弹窗滚动与关闭操作正常。

### P2：音频与发布

- 封装 `AudioManager`，集中处理 BGM 交叉淡化、对白 duck、SFX 复用、计时器清理和首次交互解锁。
- 部署使用版本目录和 `current` 软链接切换，保留上一版本用于回滚；不要先删除线上目录再移动新目录。

## 五、工程护栏

- `package.json` 固定 React/Vite 版本，避免使用 `latest`。
- 增加 `lint`、`typecheck`、`test`、`content:validate`，部署前统一执行 `npm run check && npm run build`。
- 每次涉及存档、计时器、音频或任务结算的改动，至少补一条回归测试。
- UI 文案和数值仍由代码渲染，图片只做背景和装饰；资源源文件保留在 `art-src/`，部署目录只放压缩产物。

## 六、禁止事项

- 不得重新把所有区域剧情、NPC 对话和奖励塞回单一 `main.jsx`。
- 不得使用模块级可变变量保存玩家进度、挂机累计值或任务结算状态。
- 不得用 `Math.random()` 直接写入不可复现的核心结算而不提供注入 RNG。
- 不得通过删除线上目录实现“原子部署”，也不得绕过构建校验直接上线。

