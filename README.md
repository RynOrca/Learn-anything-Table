# Learn Anything

> AI 驱动的递归学习系统 — 在桌面应用中通过 Socratic 对话和 TDD 练习掌握任何技术主题。

基于 [ChenChenyaqi/learn-anything](https://github.com/ChenChenyaqi/learn-anything) (npm: [learn-anything-cli](https://www.npmjs.com/package/learn-anything-cli)) 构建，将 CLI 学习工具扩展为**完整的桌面应用**，提供知识地图、Socratic 讲解、TDD 编程练习、学习仪表盘等丰富功能。

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform">
</p>

---

## 🎯 核心理念

**Learn Anything** 的核心理念是：任何知识都可以被递归拆解。你选择一个大主题（如"Python"），AI 会自动生成一棵知识树，然后用三种方式帮你逐个击破每个知识点：

1. **Socratic 对话** — AI 用提问引导你思考，而不是直接灌输答案
2. **TDD 编程练习** — 先写测试，再写代码，AI 实时审阅你的代码
3. **间隔重复回顾** — 根据你的掌握程度，智能安排复习时间

---

## ✨ 功能特性

### 🗺️ 知识地图
- AI 自动生成树状知识结构，覆盖主题的所有子领域
- 彩色热力图显示每个知识点的掌握状态（已掌握/进行中/待练习/未开始）
- 按领域分组浏览，支持展开/折叠

### 💬 Socratic 对话讲解
- 选择任意概念进入 AI 对话，用提问引导深入理解
- 支持 Markdown 渲染（代码块、表格、公式）
- 对话历史自动保存，随时回顾

### 🏋️ TDD 编程练习
- AI 根据你的信心水平自动出题（初级/中级/挑战）
- 内嵌代码编辑器（CodeMirror），支持 Python 语法高亮
- 代码运行 + AI 审阅：代码质量、边界情况、改进建议
- 练习结果自动更新知识地图状态

### 📊 学习仪表盘
- 总进度条 + 四个统计卡片（已掌握/进行中/待练习/未开始）
- 今日推荐概念（根据间隔重复算法）
- 最近学习活动时间线
- 阶段导航胶囊，快速跳转路线图

### 🗂️ 路线图编辑器
- 拖拽调整概念顺序
- 添加/删除/编辑知识点
- AI 辅助调整学习计划
- 实时保存到文件系统

### ⚙️ 灵活配置
- 自定义数据存储目录（支持 Electron 原生文件夹选择器）
- 一键检测/导入已有主题
- DeepSeek API Key 配置（本地存储，不上传）
- 暗色学术主题 UI

### 🖥️ Electron 桌面应用
- 无边框窗口，自定义标题栏
- 窗口状态记忆（位置、大小）
- 数据目录持久化，重启不丢失
- 可打包为独立 exe/dmg/AppImage

---

## 🏗️ 架构设计

```
learn-anything/
├── app/                          # 主应用
│   ├── electron/                 # Electron 桌面壳
│   │   ├── main.cjs              #   主进程：窗口管理 + 进程生命周期
│   │   └── preload.cjs           #   预加载脚本：安全的 IPC 桥接
│   ├── server/                   # Express API 服务端
│   │   ├── index.ts              #   路由注册 + 中间件（23 个 API 端点）
│   │   ├── files.ts              #   文件系统读写（topics/sessions/state）
│   │   ├── deepseek.ts           #   DeepSeek AI 客户端
│   │   └── execute.ts            #   Python 代码沙箱执行器
│   └── src/                      # React 前端
│       ├── api/                  #   前端 API 调用层
│       ├── components/           #   可复用组件
│       ├── pages/                #   页面组件
│       ├── store/                #   Zustand 状态管理
│       ├── types/                #   TypeScript 类型定义
│       └── styles/               #   暗色学术主题样式
├── package.json                  # 根 package（CLI 依赖）
└── .learn/                       # 学习数据存储（Git 忽略）
```

### 数据流

```
用户操作 → React 组件 → Zustand Store → API 调用
                                            ↓
                                     Express 服务器
                                            ↓
                              ┌─────────────┼─────────────┐
                              ↓             ↓             ↓
                          files.ts     deepseek.ts    execute.ts
                         (文件读写)    (AI 对话)     (代码执行)
                              ↓             ↓             ↓
                         .learn/       DeepSeek      Python
                         topics/       API           child_process
```

### 前后端通信

- **开发模式**: Vite dev server (5173) → Vite 插件 → Express 中间件 → 文件系统
- **Electron 模式**: Electron 窗口 → Express server (17345) → 文件系统
- API 全部通过 HTTP 调用，前后端完全解耦

### 状态持久化策略

| 数据类型 | 存储方式 | 位置 |
|---------|---------|------|
| 知识地图/概念状态 | JSON 文件 | `<dataDir>/<topic>/state.json` |
| 聊天消息/会话 | JSON 文件 | `<dataDir>/<topic>/sessions/` |
| 学习计划/路线图 | YAML 文件 | `<dataDir>/<topic>/plan.yml` |
| 知识地图原始文本 | Markdown 文件 | `<dataDir>/<topic>/knowledge-map.md` |
| UI 设置（API Key 等） | Zustand + localStorage | 浏览器本地 |
| 数据目录路径 | config.json | Electron userData |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **Python** >= 3.8（用于代码练习执行）
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com/)）

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/learn-anything.git
cd learn-anything

# 2. 安装根依赖（CLI 工具 + Skills）
npm install

# 3. 进入 app 目录安装应用依赖
cd app
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key:
#   VITE_DEEPSEEK_API_KEY=sk-your-api-key-here
#   VITE_DATA_DIR=../..    (学习数据存储目录，默认项目根目录)

# 5. 回到项目根目录
cd ..
```

### 启动开发模式（浏览器）

```bash
cd app
npm run dev
# 访问 http://localhost:5173
```

### 启动 Electron 桌面应用

```bash
cd app
npm run electron:dev
# 这会同时启动 Express 服务器 + Vite + Electron 窗口
```

### 打包为独立应用

```bash
cd app
npm run electron:build
# 产物在 app/release/ 目录
```

---

## 📖 使用指南

### 1. 初始化学习主题

在设置页面配置好 API Key 和数据目录后，在首页输入你想学习的主题（如 `Python`、`React`、`机器学习`），AI 会自动生成知识地图。

### 2. 浏览知识地图

点击导航栏的"知识地图"，可以看到主题的完整知识树。每个概念用颜色标记状态：
- 🟢 绿色 — 已掌握
- 🔵 蓝色 — 进行中
- 🟡 黄色 — 待练习
- ⚪ 灰色 — 未开始

### 3. Socratic 对话学习

点击任意概念 → 点击"去讲解"，AI 会用苏格拉底式提问引导你理解这个概念。你不会被直接告知答案，而是通过回答一系列递进的问题，自己"发现"答案。

### 4. TDD 编程练习

点击概念 → "去练习"，AI 会：
1. 根据你的信心水平生成编程题目
2. 提供起始代码和测试用例
3. 你在编辑器中写代码，点击运行
4. AI 审阅你的代码，给出改进建议
5. 根据表现自动更新掌握程度

### 5. 查看学习进度

仪表盘页面展示你的整体学习进度，包括已掌握概念数、进度百分比、最近活动时间线等。

### 6. 调整学习路线

在路线图页面，你可以拖拽调整概念的学习顺序，AI 也会根据你的掌握情况自动推荐优先级。

---

## 🛠️ 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| **桌面壳** | Electron 42 | 跨平台桌面应用 |
| **前端框架** | React 18 + TypeScript 5 | SPA 单页应用 |
| **状态管理** | Zustand 4 | 轻量级全局状态 |
| **路由** | React Router v6 | 客户端路由 |
| **构建工具** | Vite 5 | 开发服务器 + 打包 |
| **后端** | Express 5 | RESTful API 服务 |
| **AI** | DeepSeek Chat API | 对话/出题/审阅/推荐 |
| **代码编辑器** | CodeMirror 6 | 浏览器内代码编辑 |
| **Markdown** | react-markdown + remark-gfm | 内容渲染 |
| **打包** | electron-builder | 桌面应用打包 |

---

## 📁 API 端点一览

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/topics` | 获取所有主题列表 |
| POST | `/api/topics` | 创建新主题 |
| DELETE | `/api/topics/:name` | 删除主题 |
| GET | `/api/topics/:name/state` | 获取主题学习状态 |
| POST | `/api/topics/:name/state` | 更新学习状态 |
| GET | `/api/topics/:name/sessions` | 获取会话列表（支持 ?search=） |
| POST | `/api/topics/:name/sessions` | 创建新会话 |
| GET | `/api/topics/:name/plan` | 获取学习计划 |
| POST | `/api/topics/:name/plan` | 保存学习计划 |
| GET | `/api/topics/:name/knowledge-map` | 获取知识地图 |
| POST | `/api/explain` | AI Socratic 讲解 |
| POST | `/api/chat` | AI 对话 |
| POST | `/api/exercise` | AI 生成练习题 |
| POST | `/api/review` | AI 审阅练习代码 |
| POST | `/api/recommend` | AI 推荐下一个学习目标 |
| POST | `/api/knowledge-map` | AI 生成知识地图 |
| POST | `/api/adjust-plan` | AI 调整学习计划 |
| POST | `/api/execute` | 执行 Python 代码（5s 超时沙箱） |
| POST | `/api/validate-key` | 验证 API Key 有效性 |
| GET | `/api/config/data-dir` | 获取当前数据目录 |
| POST | `/api/config/data-dir` | 设置数据目录 |
| GET | `/api/config/scan-topics` | 扫描数据目录下的主题 |

---

## ⚠️ 安全注意事项

1. **API Key 保护**: `.env` 文件已加入 `.gitignore`，切勿将 API Key 提交到 Git。`.env.example` 仅包含占位符，可安全提交。
2. **学习数据隐私**: `.learn/` 目录包含你的学习记录，已加入 `.gitignore`。更换数据目录后，确保新目录不在 Git 追踪范围内。
3. **代码执行沙箱**: Python 代码在子进程中执行，有 5 秒超时限制，运行在临时文件中。但仍建议只执行自己编写的练习代码。
4. **两步确认删除**: 主题删除等破坏性操作需要两次点击确认（3 秒超时），防止误操作。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

```bash
# 1. Fork 本仓库
# 2. 创建功能分支
git checkout -b feat/your-feature

# 3. 开发 + 测试
cd app && npm run dev

# 4. 提交（遵循 Conventional Commits）
git commit -m "feat: add your feature"

# 5. 推送并创建 PR
git push origin feat/your-feature
```

### 提交规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `refactor:` 重构
- `style:` 样式
- `test:` 测试

---

## 📄 致谢

本项目基于 [ChenChenyaqi/learn-anything](https://github.com/ChenChenyaqi/learn-anything) 的原始创意和 CLI 工具构建。原始项目提供了 `/learn:topic`、`/learn:explain`、`/learn:practice`、`/learn:review`、`/learn:status` 五个核心 Claude Code 命令，本项目将这些能力扩展为完整的可视化桌面应用。

---

## 📜 许可证

MIT License
