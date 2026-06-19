# Learn Anything

AI 驱动的递归学习系统 — 在 Codex 中通过 Socratic 对话和 TDD 练习掌握任何技术主题。

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
- Codex Skills (生成的技能文件)

## Web App (app/)

- React 18 + TypeScript 5 + Vite 5
- Zustand 状态管理, react-router-dom v6 路由
- Vite 插件作为 Node.js 后端中间件
- DeepSeek API (deepseek-chat) AI 能力
- 文件系统直接读写 (.learn/topics/ 目录)

## 开发教训

### 1. 必须使用 Git 版本管理
每个功能完成后立即提交。删除/破坏性操作前先提交当前状态，确保可以回退。
误删 Python 主题数据就是血泪教训——没有 Git 就意味着永久丢失。

### 2. 测试 API 时永远用测试数据
`DELETE /api/topics/python` 直接删掉了唯一的生产数据。
应该先创建测试主题（如 `test-del-me`），测试完毕确认无误后再用于生产。

### 3. Zustand 异步闭包陷阱
在 async 函数中读取 Zustand 状态时，不要用组件解构的变量（可能是旧闭包值）。
应该用 `useLearningStore.getState()` 直接读取最新状态。
这是 Chat.tsx 保存消息丢失的根因。

### 4. 前端状态持久化模式
切换页面不丢数据的状态（聊天消息、练习题、AI 调整的路线）必须存 Zustand store，不能放组件本地 useState。
store 中的数据在同一次会话内跨路由保持。

### 5. 服务端文件变更需要重启
Vite HMR 只对前端文件生效。修改 server/ 下的文件（Vite 插件代码）需要重启 dev server。

### 6. 破坏性操作必须有二次确认
主题删除、session 删除等不可逆操作，都需要两步确认（点两次，3 秒超时），防止误触。
