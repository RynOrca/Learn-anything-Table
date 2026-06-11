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

---
> commit: `5e3fb77`

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
