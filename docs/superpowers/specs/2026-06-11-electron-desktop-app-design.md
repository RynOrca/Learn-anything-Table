# Electron 桌面应用 — 设计规格

> 日期：2026-06-11 | 状态：已确认

## 概述

将 Learn-Anything Web App 包装为 Electron 桌面应用，提供无边框沉浸式窗口、自定义标题栏、欢迎页面，最终可通过 `electron-builder` 打包为 `.exe` 分发。

---

## 1. 架构

```
Electron 主进程 (electron/main.ts)
  ├─ 启动 Express API Server (port 3456)
  │    └─ 独立运行的 Express 应用 (server/index.ts)
  ├─ 检测 .env API Key → 缺失时加载欢迎页
  └─ 创建 BrowserWindow (无边框, 加载 dist/index.html)

前端 (React SPA)
  ├─ Welcome 页 → 输入 DeepSeek API Key → 验证 → 写入 .env → 跳转主页
  └─ 主界面 (现有 6 页 Dashboard/Roadmap/History/Chat/Practice/Settings + 自定义标题栏)

开发模式: npm run dev (Vite dev server + HMR, 不依赖 Electron)
生产模式: npm run electron:build (Vite build → Electron 加载 dist/ + 打包 .exe)
```

### 关键变化

- `app/src/server/main.ts`（Vite 插件 600 行）→ 拆为独立 Express 应用 `app/server/index.ts`
- Vite 插件保留精简版（仅转发请求到 Express），开发模式无感
- 新增 `app/electron/main.ts` 作为 Electron 入口
- 前端 `fetch('/api/...')` 在 Electron 中指向 `http://localhost:3456`

---

## 2. 自定义标题栏

融入现有 NavBar，在右侧新增三个窗口控制按钮：

### 布局

```
┌──────────────────────────────────────────────────────────┐
│ Learn-Anything  概览 路线 历史 对话 练习 设置  [主题▼]   ○ ○ ○ │
│ ──────────────────────────────────────────────────────── │
│                                                          │
│  (页面内容)                                               │
└──────────────────────────────────────────────────────────┘
```

### 窗口按钮（油菜花风格圆点）

| 按钮 | 功能 | 默认色 | hover 色 |
|------|------|--------|----------|
| ○ | 最小化 | `var(--color-text-tertiary)` | `#d2991d` (accent-yellow) |
| ○ | 最大化 | `var(--color-text-tertiary)` | `#3fb950` (accent-green) |
| ○ | 关闭 | `var(--color-text-tertiary)` | `#f85149` (accent-red) |

- 圆点直径 = `var(--font-size-base)` = 20px，与导航文字等高
- 圆点间距 = 12px，右侧留白 16px
- 拖拽区域：整个标题栏 `-webkit-app-region: drag`，按钮区域 `no-drag`
- 窗口四角保留 Windows 11 原生圆角
- 暗色背景 + 1px `--color-border` 细边框，在亮色壁纸上可见边界

---

## 3. 应用图标

- **风格**：抽象几何符号
- **图形**：三个嵌套六边形节点，连线表达知识递归结构
- **主色**：`#58a6ff`（accent-blue），暗底 `#0f1117` 衬托
- **输出**：`.ico`（Windows）+ `.png` 256/512/1024px

---

## 4. 欢迎页（首次启动）

首次启动（无 .env 或无 API Key 时）显示：

```
┌──────────────────────────────────────────┐
│                                          │
│            [应用图标 64px]                │
│                                          │
│          Learn-Anything                  │
│       AI 驱动的递归学习系统               │
│                                          │
│    ┌────────────────────────────────┐    │
│    │  DeepSeek API Key              │    │
│    │  sk-...  (输入框)              │    │
│    └────────────────────────────────┘    │
│                                          │
│    [如何获取 API Key?] → 外部链接         │
│                                          │
│         [开始使用 →]                      │
│                                          │
└──────────────────────────────────────────┘
```

- 深色背景 (`--color-bg-page`)，居中布局，max-width 480px
- 输入 Key 后点击"开始使用"→ 轻量 API 请求验证连通性
- 验证通过 → 写入 `.env` → 自动跳转主界面
- 验证失败 → 输入框标红，显示具体错误信息
- 之后启动不再显示（.env 已存在）

---

## 5. 文件结构

```
app/
├── electron/
│   ├── main.ts             # Electron 主进程
│   └── preload.ts          # 预加载脚本 (contextBridge)
├── server/
│   ├── index.ts            # Express 应用入口 (路由注册)
│   ├── files.ts            # 文件系统 CRUD (复用)
│   ├── deepseek.ts         # DeepSeek API 客户端 (复用)
│   └── execute.ts          # Python 代码执行器 (复用)
├── src/
│   ├── pages/
│   │   └── Welcome.tsx     # 新增：欢迎页
│   ├── server/
│   │   └── main.ts         # Vite 插件精简版 (dev 模式代理)
│   └── ...                 # 其余前端代码不变
├── dist/                   # Vite 构建产物
├── package.json            # 新增 electron, electron-builder, express 等依赖
└── electron-builder.yml    # 打包配置
```

---

## 6. 打包方案

- **工具**：`electron-builder`
- **输出**：Windows `.exe` NSIS 安装包 + 便携版 zip
- **体积**：约 120–150MB（含 Node.js 运行时 + Chromium + 依赖）
- **签名**：初期不签名（自用），分发前可加代码签名证书

### electron-builder.yml 关键配置

```yaml
appId: com.learnanything.app
productName: Learn-Anything
directories:
  output: release
win:
  target:
    - target: nsis
      arch: [x64]
  icon: public/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## 7. 技术依赖

### 新增 npm 包

| 包 | 用途 |
|---|---|
| `electron` | 桌面壳 |
| `electron-builder` | 打包工具 |
| `express` | 独立 API 服务器 |
| `cors` | Express CORS (Electron 跨域) |

### API 路由（从 Vite 插件迁移到 Express）

完整迁移现有的 14 个 API 端点（保持不变）：

- `GET /api/topics` — 列表
- `POST /api/topics` — 创建
- `DELETE /api/topics/:name` — 删除
- `GET /api/topics/:name/knowledge-map` — 知识地图
- `GET/PUT /api/topics/:name/state` — 学习状态
- `GET /api/topics/:name/sessions` — 会话列表
- `POST /api/topics/:name/sessions` — 创建会话
- `GET/DELETE /api/topics/:name/sessions/:file` — 会话详情/删除
- `GET/PUT /api/topics/:name/plan` — 学习路线
- `POST /api/execute` — 执行 Python
- `POST /api/ai/explain` — AI 讲解
- `POST /api/ai/chat` — AI 对话
- `POST /api/ai/exercise` — AI 出题
- `POST /api/ai/review` — AI 审阅
- `POST /api/ai/recommend` — AI 推荐
- `POST /api/ai/knowledge-map` — AI 生成知识地图
- `POST /api/ai/learning-plan` — AI 生成学习路线
- `POST /api/ai/polish-plan` — AI 完善路线
- `POST /api/ai/plan-from-file` — 从文件生成路线
- `POST /api/ai/adjust-plan` — AI 调整路线

---

## 8. 边界情况与错误处理

- **Node.js 未安装**：Electron 内置运行时，不存在此问题
- **Python 未安装**：execute API 依赖系统 Python，无 Python 时执行返回友好错误 `{ error: "Python not found. Please install Python 3.x." }`
- **DeepSeek API 不可用**：前端已有错误展示（红色提示），不静默失败
- **端口占用**：Express 启动前检测 3456 端口，被占用则自动递增
- **数据目录**：默认使用项目根目录 `.learn/`，与 Web 版本共享数据
- **窗口大小记忆**：关闭时保存窗口位置/尺寸，下次启动恢复
