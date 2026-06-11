# Changelog

## [Unreleased] — 2026-06-11

### Added

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

- 添加仪表盘页面 Dashboard (Task 5)
  - 显示主题名称与中文日期头部
  - 阶段胶囊导航 (PhasePill)，活跃阶段绿色边框，点击跳转 /roadmap
  - 总体进度条 (ProgressBar)，含已掌握/总数分数显示
  - 四列统计卡片：已掌握(绿)、进行中(蓝)、待练习(黄)、未开始(灰)
  - 双栏底部：今日推荐(左，带彩色左边框推荐卡片) + 最近活动(右，SessionCard compact 模式)
  - 状态处理：加载中、错误信息(红色)、无数据提示

---
> commit: `01962c1`

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
