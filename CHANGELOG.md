# Changelog

## [Unreleased] — 2026-06-12

### Added

- Task 1: Electron 桌面应用基础设施
  - 安装依赖: express, cors, dotenv, electron, electron-builder, tsx, concurrently, wait-on
  - 创建目录结构: `app/electron/`, `app/server/`, `app/public/`
  - 复制 server 文件到 `app/server/` (files.ts, deepseek.ts, execute.ts)
  - `app/server/files.ts`: DATA_ROOT 改为 `getDataRoot()` 函数，支持 `LEARN_ANYTHING_DATA_DIR` 环境变量配置

- Task 2: 独立 Express API 服务器 (`app/server/index.ts`)
  - 完整移植了 Vite 插件 (src/server/main.ts) 的全部 23 个 API 路由
  - 新增 4 个端点: POST /api/validate-key, GET/POST /api/config/data-dir, GET /api/config/scan-topics
  - Express 5 独立运行于端口 3456 (可通过 API_PORT 环境变量配置)
  - 内置 CORS、JSON 解析、静态文件服务、SPA fallback
  - `app/server/files.ts`: 导出 `getDataRoot()` 和 `invalidateTopicCache()` 函数

---
> commit: `fc11c7f`

- 创建 Python 体系化学习计划 (`python-learning-plan.md`)
- 创建任务规划文件 (`task_plan.md` / `findings.md` / `progress.md`)
- 计划覆盖 6 大阶段、52 个知识点：基础语法与数据结构 → 函数与面向对象 → 内置函数与标准库 → 工程化开发 → 常用库 + GUI → 深度学习
- 将所有 Python 相关文件整理到 `Python/` 目录下
- 搭建 Vite + React + TypeScript 项目脚手架 (`app/`)
  - 配置 package.json (React 18, React Router, Zustand, CodeMirror, react-markdown 等)
  - 配置 TypeScript、Vite
  - 创建暗色学术主题 CSS 变量系统 (globals.css)
  - 字体: Noto Serif SC (思源宋体)
  - index.html / main.tsx / App.tsx 入口
  - .env.example 环境变量模板
- 添加类型定义与状态管理 (Task 2)
  - 创建 `types/index.ts`: Concept, TopicState, DashboardStats, Settings 等核心类型
  - 创建 `store/useSettingsStore.ts`: Zustand 设置 store，支持 localStorage 持久化
  - 创建 `store/useLearningStore.ts`: Zustand 学习状态 store，含 stub API 占位
- 添加文件系统 API 中间件 (Task 3)
  - 创建 `src/server/files.ts`: 文件系统读写操作 (topics, knowledge-map, state, sessions, plan)
  - 创建 `src/server/deepseek.ts`: DeepSeek API 客户端 (explain, chat, exercise, review, recommend, knowledge-map, adjust-plan)
  - 创建 `src/server/execute.ts`: Python 代码执行器 (child_process, 5s 超时, 临时文件)
  - 创建 `src/server/main.ts`: Vite 插件，注册全部 API 路由 (14 个端点)
  - 更新 `vite.config.ts` 集成 learningApiPlugin

---
> commit: `39e9379`

---
> commit: `5e3fb77`

- 添加知识地图页面 KnowledgeMap (Task 6)
  - 头部: 主题名称 + "知识地图"标题，图例显示 4 种状态颜色(已掌握/绿、进行中/蓝、待练习/黄、未开始/灰)
  - 知识地图原始文本: 如果 store 中存在 knowledgeMap 字符串，以 pre-wrap 卡片渲染
  - 领域卡片响应式网格: 按域(路径第一个 '/' 前部分)分组展示，每张卡片标题可展开/折叠
  - 概念点击: 选中概念高亮，底部固定操作栏含 4 个按钮: 去讲解(/chat)、去练习(/practice)、看历史(/history)、关闭
  - 状态处理: 加载中、错误信息(红色)、无数据提示

---
> commit: `7e33f25`

- 添加学习历史页面 History (Task 7)
  - 头部: "学习历史"标题 + 搜索栏(输入框 + 搜索按钮，支持 Enter 键触发)
  - 搜索: 按概念名称搜索知识点，调用 loadSessions(search) 后端过滤
  - 会话列表: 渲染 SessionCard 组件，支持展开/折叠查看详细内容(Markdown 渲染)
  - 状态处理: 加载中、空数据("暂无学习记录")、错误信息(红色)

---
> commit: `bf61885`

- 添加仪表盘页面 Dashboard (Task 5)
  - 显示主题名称与中文日期头部
  - 阶段胶囊导航 (PhasePill)，活跃阶段绿色边框，点击跳转 /roadmap
  - 总体进度条 (ProgressBar)，含已掌握/总数分数显示
  - 四列统计卡片：已掌握(绿)、进行中(蓝)、待练习(黄)、未开始(灰)
  - 双栏底部：今日推荐(左，带彩色左边框推荐卡片) + 最近活动(右，SessionCard compact 模式)
  - 状态处理：加载中、错误信息(红色)、无数据提示

---
> commit: `01962c1`

- 添加在线练习页面 Practice (Task 9)
  - 创建 `components/CodeEditor.tsx`: Python 代码编辑器组件 (monospace textarea)
  - 重写 `pages/Practice.tsx`: 完整练习页面，含概念选择、AI 出题、代码编辑、运行测试、AI 审阅、提交保存
  - AI 响应解析: `parseExercise()` 从 Markdown 提取练习目标/任务描述/验收要求/提示/起始代码
  - AI 审阅解析: `parseReview()` 从 Markdown 提取肯定/改进建议/边界情况/代码质量建议/综合评价
  - 难度映射: 根据信心值 (confidence) 自动选择 beginner/intermediate/challenge
  - 状态管理: 练习完成后根据审阅结果自动更新概念状态和信心值
  - 暗色学术主题: 900px 居中布局，全部使用 CSS 变量样式

---
> commit: `603df15`

---
> commit: `c36aa0e`

## [v1.0.0] — 2026-06-07

### Added

- 初始化项目，安装 learn-anything-cli v0.3.0
- 生成 5 个 Claude Code 学习命令: `/learn:topic`, `/learn:explain`, `/learn:practice`, `/learn:review`, `/learn:status`
- 生成 5 个对应的技能文件
- 创建 CLAUDE.md 项目文档
- 创建 .gitignore
- Git 仓库初始化

---
> commit: `e08934b`
