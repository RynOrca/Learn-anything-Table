# Learn-Anything 可视化学习面板

> 设计文档 · 2026-06-11 · 版本 1.0

---

## 一、项目背景

Learn-Anything 是一个 AI 驱动的递归学习系统，通过 5 个 Claude Code Skill（topic/explain/practice/review/status）在终端中完成 Socratic 对话教学和 TDD 编程练习。数据以 Markdown + YAML 文件形式存储在 `.learn/` 和各个主题文件夹中。

### 当前痛点

1. 终端交互无历史记录留存，学习对话淹没在滚动中
2. 学习路线图只能靠 ASCII 文字想象，无法直观展示
3. 进度状态依赖纯文本输出，无法快速区分已掌握/进行中/待练习/未开始
4. 跨主题切换不便，每次需要终端手动切换目录

### 目标

构建一个本地 Web 全功能应用，将所有学习行为可视化，同时保持与现有数据文件的完全兼容。

---

## 二、技术方案

| 维度 | 决策 | 理由 |
|------|------|------|
| 应用形态 | 本地 Web 全功能应用 | 浏览器是最好用的 UI 平台，功能完整 |
| 前端框架 | React 18 + TypeScript + Vite | 生态丰富，适合仪表盘类复杂 UI |
| 文件访问 | Vite 内置 API 中间件（开发服务器） | 一个命令启动，Node.js 天然读写文件 |
| AI 引擎 | DeepSeek API | 独立于 Claude，成本可控，API 兼容 |
| GitHub 同步 | 应用内一键更新按钮 | 检查 GitHub Release，自动下载更新 |
| 代码位置 | `D:\Code\Learn-anything\app\` | 与数据同目录，路径简单 |
| 版本管理 | Git（learn-anything 仓库内） | 跟随项目已有版本管理 |

---

## 三、视觉设计

### 设计语言

- **风格**: 深色学术风 -- 深蓝黑底（`#0f1117`），低对比度，长时间阅读护眼
- **字体**: 思源宋体（Source Han Serif SC / Noto Serif CJK SC），等宽字体 Cascadia Code
- **配色**:
  - 背景: `#0f1117` (页面) / `#161b22` (卡片)
  - 边框: `#1e2130`
  - 文字: `#e1e4e8` (主) / `#8b949e` (次) / `#484f58` (辅)
  - 强调: `#58a6ff` (蓝) / `#3fb950` (绿) / `#d2991d` (黄)
- **规则**: 不使用 emoji，用文字 + 颜色传递信息

### 设计原则

1. 信息层级清晰，主次分明
2. 深色背景低对比度，适合长时间学习
3. 思源宋体赋予学术阅读感
4. 交互反馈即时，操作路径短

---

## 四、页面结构（7 页）

### 4.1 仪表盘 Dashboard

**路由**: `/`

**功能**:
- 学习概览卡片: 已掌握 / 进行中 / 待练习 / 未开始，四个数字 + 颜色区分
- 整体进度条: 百分比 + 实际数量（如 3/52）
- 阶段标签: 6 个阶段药丸按钮，点击可跳转对应路线图
- 今日推荐: 基于间隔重复算法，推荐练习或学习内容
- 最近活动: 按时间线展示最近的会话记录
- 顶部导航: 7 个标签页切换

**数据来源**: `state.yaml` 统计 + `progress.md` + `sessions/` 最新记录

---

### 4.2 知识地图 Knowledge Map

**路由**: `/map`

**功能**:
- 多列树形布局，按知识域分组
- 每个知识点标注状态颜色: 绿色(已掌握) / 蓝色(进行中) / 黄色(待练习) / 灰色(未开始)
- 点击知识点: 弹出操作菜单（开始讲解 / 进入练习 / 查看历史）
- 图例: 顶部显示四种状态的颜色含义
- 支持折叠/展开知识域

**数据来源**: `knowledge-map.md` + `state.yaml`

---

### 4.3 学习历史 History

**路由**: `/history`

**功能**:
- 按时间倒序排列所有学习会话
- 每条记录显示: 知识点名称 / 类型(讲解or练习) / 日期 / 摘要
- 搜索框: 按知识点名或关键词搜索
- 日期筛选: 按日期范围过滤
- 点击记录: 展开完整对话回放（Markdown 渲染）
- 分页加载: 避免一次性加载全部

**数据来源**: `sessions/*.md` 文件列表

---

### 4.4 AI 对话学习

**路由**: `/chat`

**功能**:
- 聊天界面: AI 消息(左对齐) + 用户消息(右对齐)
- 上下文选择: 顶部下拉选择当前学习的知识点
- DeepSeek API 驱动: 遵循 Socratic 教学法（定位 -> 类比 -> 核心机制 -> 代码示例 -> 苏格拉底检验）
- 代码块: 语法高亮 + 一键复制
- 会话开始/结束: 每次对话自动保存为新的 session 文件
- 对话中可触发: 保存当前进度 / 标记为已掌握 / 跳转练习

**数据来源**: DeepSeek API + 保存至 `sessions/` + 更新 `state.yaml`

---

### 4.5 在线练习

**路由**: `/practice`

**功能**:
- 选题: 下拉选择知识点，DeepSeek 自动生成对应难度的题目
- 代码编辑器: Monaco Editor 或 CodeMirror，支持 Python 语法高亮
- 题目描述: 目标 / 背景 / 要求 / 提示（折叠）
- 运行按钮: 调用后端执行 Python 代码，显示输出
- AI 审阅按钮: 将代码提交 DeepSeek，获得苏格拉底式反馈
- 练习记录: 结果自动保存到 sessions/，更新 state.yaml

**数据来源**: DeepSeek API + Vite 后端执行 Python + 保存至 `sessions/`

---

### 4.6 学习路线图

**路由**: `/roadmap`

**功能**:
- 阶段概览: 6 个阶段卡片，显示进度百分比和知识点数
- 时间线视图: 横向展示阶段间依赖关系
- 阶段详情: 点击展开，列出该阶段所有知识点及其状态
- 时间预估: 每个阶段的预估学习时长
- AI 调整: 可以请求 DeepSeek 根据当前进度重新规划路线

**数据来源**: `python-learning-plan.md` + `state.yaml` + DeepSeek API

---

### 4.7 设置与同步

**路由**: `/settings`

**功能**:
- DeepSeek API Key 配置（加密存储在本地 `.env`）
- 数据目录路径配置
- 当前版本显示
- 检查更新按钮: 调用 GitHub API 检查 `ChenChenyaqi/learn-anything` 最新版本
- 一键同步: 下载更新 Skill 定义文件（不覆盖用户数据）
- 字体大小调节
- 数据导出/导入

**数据来源**: GitHub API + 本地文件系统

---

## 五、数据模型

### 读取（应用 -> 文件系统）

| 文件 | 用途 | 读取页面 |
|------|------|---------|
| `.learn/topics/<topic>/knowledge-map.md` | 知识地图结构 | 知识地图 |
| `.learn/topics/<topic>/state.yaml` | 学习状态数据 | 仪表盘、知识地图、路线图 |
| `.learn/topics/<topic>/sessions/*.md` | 历史会话记录 | 历史、仪表盘 |
| `<topic>/progress.md` | 进度日志 | 仪表盘 |
| `<topic>/<plan>.md` | 学习计划 | 路线图 |

### 写入（应用 -> 文件系统）

| 操作 | 写入内容 | 触发时机 |
|------|---------|---------|
| AI 对话结束 | 新建 `sessions/<concept>-<date>.md` | 每次对话结束 |
| 练习完成 | 新建 `sessions/<concept>-practice-<date>.md` | 每次练习提交 |
| 状态变更 | 更新 `state.yaml` 中对应 concept 字段 | 掌握/进度变化 |
| 创建新主题 | 新建目录 + `knowledge-map.md` + `state.yaml` | 用户请求新主题 |

### 保护规则

以下文件 **永不被覆盖**:
- `Python/`、`<任何主题>/` 下的用户自建文件
- `progress.md`、`task_plan.md`、`findings.md`
- `sessions/` 下所有历史文件
- 用户自定义的学习计划

---

## 六、API 设计

### Vite 中间件 API（文件系统）

```
GET  /api/topics                          # 列出所有主题
GET  /api/topics/:name/knowledge-map      # 获取知识地图
GET  /api/topics/:name/state              # 获取学习状态
PUT  /api/topics/:name/state              # 更新学习状态
GET  /api/topics/:name/sessions           # 列出会话列表（支持 ?search=&from=&to=）
GET  /api/topics/:name/sessions/:file     # 获取单个会话内容
POST /api/topics/:name/sessions           # 创建新会话文件
GET  /api/topics/:name/plan               # 获取学习计划
POST /api/execute                         # 执行 Python 代码（练习用）
GET  /api/version                         # 获取当前版本
POST /api/sync                            # 触发 GitHub 同步
```

### DeepSeek API 调用

```
POST /api/ai/explain      # AI 讲解（Socratic 教学）
POST /api/ai/practice     # AI 出题
POST /api/ai/review       # AI 审阅代码
POST /api/ai/recommend    # AI 复习推荐
POST /api/ai/plan         # AI 路线规划
POST /api/ai/knowledge-map # AI 知识地图生成
```

---

## 七、项目目录结构

```
D:\Code\Learn-anything\
  app/                          # Web 应用代码（新增）
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.tsx                  # 入口
      App.tsx                   # 路由 + 布局
      pages/
        Dashboard.tsx           # 仪表盘
        KnowledgeMap.tsx        # 知识地图
        History.tsx             # 学习历史
        Chat.tsx               # AI 对话
        Practice.tsx           # 在线练习
        Roadmap.tsx            # 学习路线
        Settings.tsx           # 设置
      components/
        Layout.tsx              # 整体布局（导航 + 内容区）
        NavBar.tsx              # 顶部导航
        StatusBadge.tsx         # 状态标记
        ProgressBar.tsx         # 进度条
        SessionCard.tsx         # 历史记录卡片
        ChatMessage.tsx         # 对话消息
        CodeEditor.tsx          # 代码编辑器
        PhasePill.tsx           # 阶段标签
      api/
        client.ts               # DeepSeek API 客户端
        files.ts                # 文件系统 API 调用
      store/
        useLearningStore.ts     # 全局学习状态
        useSettingsStore.ts     # 设置状态
      types/
        index.ts                # TypeScript 类型定义
      styles/
        globals.css             # 全局样式 + CSS 变量
    server/
      files.ts                  # Vite 文件 API 中间件
      deepseek.ts               # DeepSeek API 代理
      execute.ts                # Python 代码执行
  .learn/                       # 学习数据（现有，不动）
  Python/                       # 主题文件夹（现有，不动）
  .claude/                      # Skill 定义（同步目标）
  docs/
    superpowers/
      specs/
        2026-06-11-learn-anything-visual-app-design.md  # 本文档
```

---

## 八、风险与约束

| 风险 | 应对 |
|------|------|
| DeepSeek API 不可用 | 降级为离线模式，仅展示已有数据，不提供 AI 功能 |
| Python 代码执行安全 | 沙箱执行，限制超时 5s，限制系统调用 |
| GitHub 同步覆盖用户数据 | 仅同步 `.claude/skills/` 和 `.claude/commands/`，不动数据目录 |
| 大型 session 文件加载慢 | 分页加载，每次 20 条 |
| 思源宋体未安装 | 降级到系统宋体 (SimSun / Songti SC / serif) |

---

## 九、后续扩展

- PWA 支持，可添加到桌面
- Tauri 包装为独立桌面应用（双击运行，不依赖终端）
- 多主题支持（Python 以外的新主题）
- 学习数据统计图表（周报、月报）
- 学习提醒通知
