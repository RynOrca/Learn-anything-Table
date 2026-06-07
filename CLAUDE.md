# Learn Anything

AI 驱动的递归学习系统 — 在 Claude Code 中通过 Socratic 对话和 TDD 练习掌握任何技术主题。

## 项目来源

- 仓库: [ChenChenyaqi/learn-anything](https://github.com/ChenChenyaqi/learn-anything)
- npm: [learn-anything-cli](https://www.npmjs.com/package/learn-anything-cli)
- 当前版本: v0.3.0

## 可用命令

| 命令 | 功能 |
|------|------|
| `/learn:topic <topic>` | 初始化学习主题，生成知识地图 |
| `/learn:explain <concept>` | 递归式 Socratic 深入讲解 |
| `/learn:practice <concept>` | TDD 风格编程练习 |
| `/learn:review [topic]` | 进度回顾与间隔重复推荐 |
| `/learn:status [topic]` | 知识地图热力图 |

## 工作目录

学习数据存储在 `.learn/` 目录中。

## 技术栈

- Node.js / TypeScript (CLI 工具)
- Claude Code Skills (生成的技能文件)
