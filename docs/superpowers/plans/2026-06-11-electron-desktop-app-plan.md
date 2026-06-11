# Electron 桌面应用 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Learn-Anything Web App 包装为 Electron 桌面应用 — 无边框窗口、自定义标题栏、欢迎页、独立 Express API 服务器、可打包 .exe 分发。

**Architecture:** Express 独立 API 服务器 (port 3456) 同时提供 REST API 和静态文件服务。Electron 主进程启动 Express → 创建无边框 BrowserWindow → 加载 `http://localhost:3456`。Vite 插件精简为 dev 模式代理。使用 `tsx` 运行 TypeScript 服务端代码，避免额外编译步骤。

**Tech Stack:** Electron 34, Express 5, electron-builder, tsx, concurrently

---

## 前置改动：DATA_ROOT 可配置化

当前 `files.ts` 使用模块级常量 `const DATA_ROOT = path.resolve(process.cwd(), '..')`，在 Electron 打包环境中 cwd 不可靠。需要改为从环境变量读取。

---

### Task 1: 安装依赖 + 创建目录结构

**Files:**
- Modify: `app/package.json`
- Create: `app/electron/`, `app/server/`

- [ ] **Step 1: 安装新依赖**

```bash
cd app
npm install express cors dotenv
npm install -D electron electron-builder tsx concurrently
```

Expected: 6 个包安装成功，package.json 更新。

- [ ] **Step 2: 创建目录结构**

```bash
mkdir -p app/electron app/server app/public
```

- [ ] **Step 3: 复制服务端文件到 server/ 目录**

```powershell
Copy-Item app/src/server/files.ts app/server/files.ts
Copy-Item app/src/server/deepseek.ts app/server/deepseek.ts
Copy-Item app/src/server/execute.ts app/server/execute.ts
```

- [ ] **Step 4: 修改 server/files.ts — DATA_ROOT 从环境变量读取**

将第 7 行：
```ts
const DATA_ROOT = path.resolve(process.cwd(), '..');
```

替换为：
```ts
function getDataRoot(): string {
  return process.env.LEARN_ANYTHING_DATA_DIR || path.resolve(process.cwd(), '..');
}
```

然后将文件中所有直接引用 `DATA_ROOT` 的地方改为调用 `getDataRoot()`。文件中共 6 处：
- Line 36: `if (!fs.existsSync(DATA_ROOT))` → `if (!fs.existsSync(getDataRoot()))`
- Line 40: `rootEntries = fs.readdirSync(DATA_ROOT, ...)` → `rootEntries = fs.readdirSync(getDataRoot(), ...)`
- Line 53: `path.join(DATA_ROOT, entry.name, '.learn', 'topics')` → `path.join(getDataRoot(), entry.name, '.learn', 'topics')`
- Line 68: `path.join(DATA_ROOT, entry.name)` → `path.join(getDataRoot(), entry.name)`
- Line 94: `return path.join(DATA_ROOT, '.learn', 'topics')` → `return path.join(getDataRoot(), '.learn', 'topics')`
- Line 488: `path.join(DATA_ROOT, safeName.charAt(0)...)` → `path.join(getDataRoot(), safeName.charAt(0)...)`
- Line 540: `if (!rootDir.startsWith(DATA_ROOT) || rootDir === DATA_ROOT)` → `if (!rootDir.startsWith(getDataRoot()) || rootDir === getDataRoot())`

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: add Electron dependencies + extract server files to server/"
```

---

### Task 2: 创建独立 Express API 服务器

**Files:**
- Create: `app/server/index.ts`

- [ ] **Step 1: 创建 app/server/index.ts**

```ts
// Express API 服务器 — 独立于 Vite，供 Electron 使用
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from 'dotenv';

// Load .env if present (for VITE_DATA_DIR)
config({ path: path.resolve(__dirname, '..', '.env') });

import {
  listTopics,
  getKnowledgeMap,
  getState,
  updateState,
  getSessions,
  getSessionDetail,
  createSession,
  deleteSessionFile,
  getPlan,
  createTopic,
  deleteTopic,
  updatePlan,
} from './files';
import {
  explain,
  chat,
  generateExercise,
  reviewCode,
  recommend,
  generateKnowledgeMap,
  generateLearningPlan,
  adjustPlan,
  polishPlan,
  planFromFile,
} from './deepseek';
import { executePython } from './execute';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3456', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from dist/ (production) or proxy to Vite (development)
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function getApiKey(req: express.Request): string {
  const header = req.headers['authorization'];
  if (!header) return '';
  const authStr = Array.isArray(header) ? header[0] : header;
  return (authStr || '').replace(/^Bearer\s+/i, '');
}

// ---------------------------------------------------------------------------
// GET /api/topics
// ---------------------------------------------------------------------------

app.get('/api/topics', (_req, res) => {
  const topics = listTopics();
  res.json({ topics });
});

// ---------------------------------------------------------------------------
// POST /api/topics
// ---------------------------------------------------------------------------

app.post('/api/topics', (req, res) => {
  const { topicName, planContent, knowledgeMapContent } = req.body;
  if (!topicName || typeof topicName !== 'string') {
    res.status(400).json({ error: 'topicName is required' });
    return;
  }
  const result = createTopic(topicName, { planContent, knowledgeMapContent });
  res.status(201).json(result);
});

// ---------------------------------------------------------------------------
// DELETE /api/topics/:name
// ---------------------------------------------------------------------------

app.delete('/api/topics/:name', (req, res) => {
  const { name } = req.params;
  const deleted = deleteTopic(name);
  if (!deleted) {
    res.status(404).json({ error: `Topic "${name}" not found or cannot be deleted` });
    return;
  }
  res.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// GET /api/topics/:name/knowledge-map
// ---------------------------------------------------------------------------

app.get('/api/topics/:name/knowledge-map', (req, res) => {
  const km = getKnowledgeMap(req.params.name);
  if (km === null) {
    res.status(404).json({ error: `Topic "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: km });
});

// ---------------------------------------------------------------------------
// GET /api/topics/:name/state
// ---------------------------------------------------------------------------

app.get('/api/topics/:name/state', (req, res) => {
  const state = getState(req.params.name);
  if (state === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(state);
});

// ---------------------------------------------------------------------------
// PUT /api/topics/:name/state
// ---------------------------------------------------------------------------

app.put('/api/topics/:name/state', (req, res) => {
  const { currentState, conceptPath, newStatus, newConfidence } = req.body;
  const newState = updateState(req.params.name, currentState, conceptPath, newStatus, newConfidence);
  if (newState === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(newState);
});

// ---------------------------------------------------------------------------
// GET /api/topics/:name/sessions
// ---------------------------------------------------------------------------

app.get('/api/topics/:name/sessions', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const sessions = getSessions(req.params.name, search);
  res.json({ topicName: req.params.name, sessions });
});

// ---------------------------------------------------------------------------
// POST /api/topics/:name/sessions
// ---------------------------------------------------------------------------

app.post('/api/topics/:name/sessions', (req, res) => {
  const { conceptName, type, content } = req.body;
  const filename = createSession(req.params.name, conceptName, type, content);
  res.status(201).json({ filename });
});

// ---------------------------------------------------------------------------
// GET /api/topics/:name/sessions/:file
// ---------------------------------------------------------------------------

app.get('/api/topics/:name/sessions/:file', (req, res) => {
  const detail = getSessionDetail(req.params.name, req.params.file);
  if (detail === null) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ filename: req.params.file, content: detail });
});

// ---------------------------------------------------------------------------
// DELETE /api/topics/:name/sessions/:file
// ---------------------------------------------------------------------------

app.delete('/api/topics/:name/sessions/:file', (req, res) => {
  const deleted = deleteSessionFile(req.params.name, req.params.file);
  if (!deleted) {
    res.status(404).json({ error: 'Session not found or cannot be deleted' });
    return;
  }
  res.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// GET /api/topics/:name/plan
// ---------------------------------------------------------------------------

app.get('/api/topics/:name/plan', (req, res) => {
  const plan = getPlan(req.params.name);
  if (plan === null) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: plan });
});

// ---------------------------------------------------------------------------
// PUT /api/topics/:name/plan
// ---------------------------------------------------------------------------

app.put('/api/topics/:name/plan', (req, res) => {
  const { content } = req.body;
  const ok = updatePlan(req.params.name, content);
  if (!ok) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ updated: true });
});

// ---------------------------------------------------------------------------
// POST /api/execute
// ---------------------------------------------------------------------------

app.post('/api/execute', (req, res) => {
  const result = executePython(req.body.code);
  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/ai/explain
// ---------------------------------------------------------------------------

app.post('/api/ai/explain', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { conceptName, knowledgeMap, userLevel, history } = req.body;
  try {
    const content = await explain(apiKey, conceptName, knowledgeMap, userLevel, history ?? []);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------

app.post('/api/ai/chat', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { conceptName, message, history } = req.body;
  try {
    const content = await chat(apiKey, conceptName, message, history ?? []);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/exercise
// ---------------------------------------------------------------------------

app.post('/api/ai/exercise', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { conceptName, difficulty, knowledgeMap } = req.body;
  try {
    const content = await generateExercise(apiKey, conceptName, difficulty, knowledgeMap);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/review
// ---------------------------------------------------------------------------

app.post('/api/ai/review', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { conceptName, userCode, exerciseGoal } = req.body;
  try {
    const content = await reviewCode(apiKey, conceptName, userCode, exerciseGoal);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/recommend
// ---------------------------------------------------------------------------

app.post('/api/ai/recommend', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { topicState, sessions } = req.body;
  try {
    const content = await recommend(apiKey, topicState, sessions ?? '');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/knowledge-map
// ---------------------------------------------------------------------------

app.post('/api/ai/knowledge-map', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  try {
    const content = await generateKnowledgeMap(apiKey, req.body.topicName);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/learning-plan
// ---------------------------------------------------------------------------

app.post('/api/ai/learning-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  const { topicName } = req.body;
  if (!topicName || typeof topicName !== 'string') {
    res.status(400).json({ error: 'topicName is required' });
    return;
  }
  try {
    const content = await generateLearningPlan(apiKey, topicName);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/polish-plan
// ---------------------------------------------------------------------------

app.post('/api/ai/polish-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  try {
    const content = await polishPlan(apiKey, req.body.currentPlan);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/plan-from-file
// ---------------------------------------------------------------------------

app.post('/api/ai/plan-from-file', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  try {
    const content = await planFromFile(apiKey, req.body.topicName, req.body.fileContent);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/adjust-plan
// ---------------------------------------------------------------------------

app.post('/api/ai/adjust-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(401).json({ error: 'Missing API key' }); return; }
  try {
    const content = await adjustPlan(apiKey, req.body.currentPlan, req.body.currentState);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI error' });
  }
});

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for non-API routes (client-side routing)
// ---------------------------------------------------------------------------

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---------------------------------------------------------------------------
// Validate API key (lightweight check)
// ---------------------------------------------------------------------------

app.post('/api/validate-key', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) { res.status(400).json({ error: 'No API key provided' }); return; }
  try {
    // Send a minimal request to verify the key works
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      res.json({ valid: true });
    } else {
      const err = await response.text().catch(() => 'unknown');
      res.json({ valid: false, error: `API returned ${response.status}: ${err}` });
    }
  } catch (err) {
    res.json({ valid: false, error: err instanceof Error ? err.message : 'Connection failed' });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Learn-Anything API] http://localhost:${PORT}`);
});

export { app };
```

- [ ] **Step 2: 测试 Express 服务器能否独立启动**

```bash
cd app
npx tsx server/index.ts
```

Expected: 终端显示 `[Learn-Anything API] http://localhost:3456`，无崩溃。

- [ ] **Step 3: 验证 API 可访问**

在新终端：
```bash
curl http://localhost:3456/api/topics
```

Expected: 返回 JSON `{ "topics": [...] }`。

- [ ] **Step 4: 按 Ctrl+C 停止服务器**

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: create standalone Express API server with all 20 routes"
```

---

### Task 3: 创建 Electron 主进程

**Files:**
- Create: `app/electron/main.cjs`
- Create: `app/electron/preload.cjs`

> **重要**：Electron 主进程和 preload 脚本必须使用 CommonJS（`.cjs`），因为 Electron 直接加载这些文件，不经 tsx/Vite 转译。项目 `package.json` 中 `"type": "module"` 对 `.cjs` 文件不生效。

- [ ] **Step 1: 创建 app/electron/preload.cjs**

```js
// Preload script — exposes safe APIs to renderer via contextBridge
// Must be CommonJS (.cjs) because Electron loads it directly, not via tsx
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Check if running in Electron
  isElectron: true,

  // Window state change events
  onMaximizeChange: function(callback) {
    ipcRenderer.on('window:maximize-change', function(_event, isMaximized) {
      callback(isMaximized);
    });
  },
});
```

- [ ] **Step 2: 创建 app/electron/main.cjs**

```js
// Electron 主进程 — 启动 Express API + 创建无边框窗口
// Must be CommonJS (.cjs) for Electron to load directly
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const isDev = !app.isPackaged;
let serverProcess = null;
let mainWindow = null;

// ── Window state persistence ────────────────────────────────────────────

function getWindowStatePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'window-state.json');
}

function loadWindowState() {
  try {
    const statePath = getWindowStatePath();
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { width: 1280, height: 860, x: undefined, y: undefined };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

// ── Express server lifecycle ────────────────────────────────────────────

function startServer() {
  return new Promise(function(resolve, reject) {
    const serverPath = path.join(__dirname, '..', 'server', 'index.ts');

    const dataDir = isDev
      ? path.resolve(__dirname, '..', '..')
      : path.dirname(app.getPath('exe'));

    serverProcess = spawn('npx', ['tsx', serverPath], {
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, {
        LEARN_ANYTHING_DATA_DIR: dataDir,
        API_PORT: '3456',
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    var started = false;

    serverProcess.stdout.on('data', function(data) {
      var msg = data.toString();
      console.log('[server]', msg.trim());
      if (!started && msg.indexOf('localhost:3456') !== -1) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', function(data) {
      console.error('[server:err]', data.toString().trim());
    });

    serverProcess.on('error', function(err) {
      console.error('[server] Failed to start:', err);
      reject(err);
    });

    serverProcess.on('exit', function(code) {
      console.log('[server] Exited with code ' + code);
      serverProcess = null;
    });

    // Timeout: resolve after 5s even without startup message
    setTimeout(function() {
      if (!started) { started = true; resolve(); }
    }, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// ── Window creation ─────────────────────────────────────────────────────

function createWindow() {
  var state = loadWindowState();

  var winOpts = {
    width: state.width,
    height: state.height,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  };

  // Restore position if available
  if (state.x !== undefined && state.y !== undefined) {
    winOpts.x = state.x;
    winOpts.y = state.y;
  }

  var win = new BrowserWindow(winOpts);
  mainWindow = win;

  // Restore maximized state after creation
  if (state.isMaximized) {
    win.maximize();
  }

  var url = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:3456';

  win.loadURL(url);

  win.once('ready-to-show', function() {
    win.show();
  });

  win.webContents.setWindowOpenHandler(function(details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  win.on('maximize', function() { win.webContents.send('window:maximize-change', true); });
  win.on('unmaximize', function() { win.webContents.send('window:maximize-change', false); });

  // Save window state on move/resize
  win.on('resize', saveWindowState);
  win.on('move', saveWindowState);
  win.on('close', saveWindowState);

  win.on('closed', function() {
    mainWindow = null;
  });
}

// ── IPC handlers ────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.on('window:minimize', function(event) {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on('window:maximize', function(event) {
    var w = BrowserWindow.fromWebContents(event.sender);
    if (w?.isMaximized()) {
      w.unmaximize();
    } else {
      w?.maximize();
    }
  });
  ipcMain.on('window:close', function(event) {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

// ── App lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(async function() {
  setupIPC();

  if (!isDev) {
    try {
      await startServer();
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  }

  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function() {
  stopServer();
  app.quit();
});

app.on('before-quit', function() {
  stopServer();
});
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: add Electron main process with borderless window and Express lifecycle"
```

---

### Task 4: 精简 Vite 插件（dev 保留可用）

**Files:**
- Modify: `app/src/server/main.ts`

当前 `src/server/main.ts` 包含完整的 600 行 Vite 插件 + API 路由。现在 API 已迁移到独立 Express，Vite 插件需要精简：保留为 dev 模式代理，将 `/api/*` 请求转发到 Express（port 3456），或直接保留原有逻辑用于独立 `npm run dev`。

**决定**：为了 `npm run dev` 仍可独立工作（不依赖 Electron），保留现有 Vite 插件全部代码。只需确保 `import` 路径指向新的 `server/` 目录文件。

- [ ] **Step 1: 更新 src/server/main.ts 的 import 路径**

将第 2-15 行的 import 改为从 `../../server/` 引入：

```ts
import {
  listTopics,
  getKnowledgeMap,
  // ... etc
} from '../../server/files';
import {
  explain,
  chat,
  // ... etc
} from '../../server/deepseek';
import { executePython } from '../../server/execute';
```

- [ ] **Step 2: 验证 dev 模式仍可工作**

```bash
cd app && npm run dev
```

Expected: Vite 启动在 5173，API 正常工作。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "refactor: update Vite plugin imports to use server/ module paths"
```

---

### Task 5: 自定义标题栏 — 窗口控制按钮

**Files:**
- Modify: `app/src/components/NavBar.tsx`
- Modify: `app/src/styles/globals.css`

- [ ] **Step 1: 在 globals.css 末尾添加 Electron 标题栏样式**

```css
/* ── Electron 自定义标题栏 ─────────────────────────────────────────── */

.electron-titlebar {
  -webkit-app-region: drag;
  user-select: none;
}

.electron-titlebar button,
.electron-titlebar a,
.electron-titlebar input,
.electron-titlebar select,
.electron-no-drag {
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  padding-right: 16px;
  flex-shrink: 0;
}

.window-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--color-text-tertiary);
  cursor: pointer;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.window-dot:hover {
  opacity: 1;
}

.window-dot--minimize:hover {
  background: var(--color-accent-yellow);
}

.window-dot--maximize:hover {
  background: var(--color-accent-green);
}

.window-dot--close:hover {
  background: var(--color-accent-red);
}
```

- [ ] **Step 2: 修改 NavBar.tsx — 添加窗口控制按钮**

在 NavBar 的 `<nav>` 元素上添加 `className="electron-titlebar"`，然后在 `</nav>` 之前、`<TopicSelector />` 之后，添加窗口控制按钮：

```tsx
<div className="window-controls">
  <button
    className="window-dot window-dot--minimize"
    onClick={() => (window as any).electronAPI?.minimize()}
    title="最小化"
  />
  <button
    className="window-dot window-dot--maximize"
    onClick={() => (window as any).electronAPI?.maximize()}
    title="最大化"
  />
  <button
    className="window-dot window-dot--close"
    onClick={() => (window as any).electronAPI?.close()}
    title="关闭"
  />
</div>
```

- [ ] **Step 3: 在 NavBar 中检测 Electron 环境，动态渲染控制按钮**

在组件顶部添加：

```tsx
const isElectron = typeof (window as any).electronAPI?.isElectron !== 'undefined';
```

窗口控制按钮仅当 `isElectron` 为 `true` 时渲染。

完整的 NavBar 结构变更：
```
nav (electron-titlebar)
  ├─ Logo "Learn-Anything"
  ├─ NavLinks (概览 路线 ...)
  ├─ TopicSelector
  └─ [if Electron] window-controls (○ ○ ○)
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add Electron custom title bar with traffic-light window controls"
```

---

### Task 6: 创建欢迎页 (Welcome Page)

**Files:**
- Create: `app/src/pages/Welcome.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: 创建 app/src/pages/Welcome.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore';

export default function Welcome() {
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const store = useSettingsStore();

  const handleSubmit = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('请输入 API Key');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      setError('API Key 格式不正确，应以 sk- 开头');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const resp = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmed}`,
        },
        body: JSON.stringify({}),
      });
      const data = await resp.json();

      if (data.valid) {
        // Save to store + localStorage
        store.setApiKey(trimmed);
        store.saveSettings();
        
        // Write to .env file via API (for persistence)
        await fetch('/api/save-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'VITE_DEEPSEEK_API_KEY', value: trimmed }),
        });

        navigate('/');
      } else {
        setError(data.error || 'API Key 验证失败，请检查后重试');
      }
    } catch {
      setError('无法连接到服务器，请稍后重试');
    } finally {
      setValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--color-bg-page)',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        {/* Icon placeholder — will be replaced with generated icon */}
        <div style={{
          width: 72,
          height: 72,
          margin: '0 auto 24px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          color: 'var(--color-accent-blue)',
          fontFamily: 'var(--font-mono)',
        }}>
          LA
        </div>

        <h1 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 8,
          fontFamily: 'var(--font-serif)',
        }}>
          Learn-Anything
        </h1>
        <p style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-secondary)',
          marginBottom: 36,
          fontFamily: 'var(--font-serif)',
        }}>
          AI 驱动的递归学习系统
        </p>

        {/* API Key Input */}
        <div style={{
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          marginBottom: 16,
          border: '1px solid var(--color-border)',
          textAlign: 'left',
        }}>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 10,
            fontFamily: 'var(--font-serif)',
          }}>
            DeepSeek API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.currentTarget.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="sk-..."
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${error ? 'var(--color-accent-red)' : 'var(--color-border)'}`,
              background: 'var(--color-bg-page)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-base)',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          {error && (
            <p style={{
              color: 'var(--color-accent-red)',
              fontSize: 'var(--font-size-xs)',
              marginTop: 8,
              fontFamily: 'var(--font-serif)',
            }}>
              {error}
            </p>
          )}
        </div>

        {/* How to get key link */}
        <a
          href="https://platform.deepseek.com/api_keys"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            marginBottom: 24,
            fontFamily: 'var(--font-serif)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          如何获取 API Key？
        </a>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={validating}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-accent-blue)',
            background: 'var(--color-bg-blue)',
            color: 'var(--color-accent-blue)',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            cursor: validating ? 'not-allowed' : 'pointer',
            opacity: validating ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {validating ? '验证中...' : '开始使用 →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 修改 App.tsx — 添加 Welcome 路由**

在 `<Routes>` 中添加 Welcome 路由（在 Layout 外面，因为欢迎页不需要导航栏）：

```tsx
<Routes>
  <Route path="/welcome" element={<Welcome />} />
  <Route element={<Layout />}>
    <Route path="/" element={<Dashboard />} />
    {/* ... 其他路由不变 ... */}
  </Route>
</Routes>
```

并添加 import：
```tsx
import Welcome from './pages/Welcome';
```

- [ ] **Step 3: 添加启动时的欢迎页检测逻辑**

在 App 组件中，检测是否已有 API Key，没有则跳转到 `/welcome`：

```tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const apiKey = useSettingsStore((s) => s.deepseekApiKey);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line

  useEffect(() => {
    // After settings loaded, check if we need to show welcome page
    if (location.pathname !== '/welcome' && !apiKey) {
      navigate('/welcome', { replace: true });
    }
  }, [apiKey, location.pathname, navigate]);
  
  // ... rest of component
}
```

**注意**：需要确保 `loadSettings` 先执行完成再检查 `apiKey`。由于 Zustand 的同步特性，`loadSettings()` 调用后立即可以读取 `apiKey`。但 `useSettingsStore((s) => s.deepseekApiKey)` 在同一个渲染周期内可能还是旧值。稳妥做法是在 `App` 中直接调用 `useSettingsStore.getState()` 来判断。

更好的方式：

```tsx
useEffect(() => {
  loadSettings();
  // Use getState to read the latest value synchronously after load
  const key = useSettingsStore.getState().deepseekApiKey;
  if (!key && location.pathname !== '/welcome') {
    navigate('/welcome', { replace: true });
  }
}, []); // Run once on mount
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add Welcome page for first-run API key setup"
```

---

### Task 7: Express 环境变量管理 API

**Files:**
- Modify: `app/server/index.ts`

在 `server/index.ts` 中添加 `.env` 读写端点。

- [ ] **Step 1: 在 server/index.ts 中添加 POST /api/save-env 路由**

```ts
import fs from 'node:fs';

// ── POST /api/save-env — write/update a key in .env file ──────────────────

app.post('/api/save-env', (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string' || !value || typeof value !== 'string') {
    res.status(400).json({ error: 'key and value are required' });
    return;
  }

  const envPath = path.resolve(__dirname, '..', '.env');
  
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Update or append the key
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }
    if (!found) {
      lines.push(`${key}=${value}`);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to write .env' });
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: add /api/save-env endpoint for persisting API key to .env"
```

---

### Task 8: 生成应用图标

**Files:**
- Create: `app/public/icon.svg`
- Convert: `app/public/icon.png`, `app/public/icon.ico`

- [ ] **Step 1: 创建 app/public/icon.svg**

使用三个嵌套六边形 + 连接线的抽象知识图谱图形：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <rect width="256" height="256" rx="48" fill="#0f1117"/>
  
  <!-- 外圈六边形 -->
  <polygon points="128,24 224,72 224,148 128,196 32,148 32,72" 
           fill="none" stroke="#58a6ff" stroke-width="4" opacity="0.3"/>
  
  <!-- 中圈六边形 -->
  <polygon points="128,52 196,86 196,140 128,174 60,140 60,86" 
           fill="none" stroke="#58a6ff" stroke-width="4" opacity="0.6"/>
  
  <!-- 内圈六边形 -->
  <polygon points="128,80 168,100 168,132 128,152 88,132 88,100" 
           fill="none" stroke="#58a6ff" stroke-width="4"/>
  
  <!-- 中心节点 -->
  <circle cx="128" cy="116" r="12" fill="#58a6ff"/>
  
  <!-- 连接线到顶点 -->
  <line x1="128" y1="104" x2="128" y2="52" stroke="#58a6ff" stroke-width="2" opacity="0.6"/>
  <line x1="140" y1="116" x2="196" y2="86" stroke="#58a6ff" stroke-width="2" opacity="0.6"/>
  <line x1="140" y1="116" x2="168" y2="100" stroke="#58a6ff" stroke-width="2" opacity="0.8"/>
  <line x1="116" y1="116" x2="60" y2="86" stroke="#58a6ff" stroke-width="2" opacity="0.6"/>
  <line x1="116" y1="116" x2="88" y2="100" stroke="#58a6ff" stroke-width="2" opacity="0.8"/>
  
  <!-- 顶点节点 -->
  <circle cx="128" cy="52" r="5" fill="#58a6ff" opacity="0.6"/>
  <circle cx="196" cy="86" r="5" fill="#58a6ff" opacity="0.6"/>
  <circle cx="168" cy="100" r="4" fill="#58a6ff" opacity="0.8"/>
  <circle cx="60" cy="86" r="5" fill="#58a6ff" opacity="0.6"/>
  <circle cx="88" cy="100" r="4" fill="#58a6ff" opacity="0.8"/>
</svg>
```

- [ ] **Step 2: 生成 raster 版本（使用 bash）**

需确保安装了 ImageMagick 或使用在线转换。一个简单方法是用 Node.js 的 `sharp` 库：

```bash
cd app
npx sharp --input public/icon.svg --output public/icon.png resize 256 256
```

如果没有 `sharp`，也可手动在浏览器中打开 SVG 截图保存。先提交 SVG，PNG/ICO 后续手动处理。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: add application icon (SVG)"
```

---

### Task 9: 构建配置 + 打包

**Files:**
- Modify: `app/package.json`
- Create: `app/electron-builder.yml`
- Modify: `app/vite.config.ts`

- [ ] **Step 1: 更新 package.json — 添加脚本和配置**

```json
{
  "name": "learn-anything-app",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx server/index.ts",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently -k \"npm run dev:server\" \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:start": "electron ."
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "zustand": "^4.5.2",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "js-yaml": "^4.1.0",
    "codemirror": "^6.0.1",
    "@codemirror/lang-python": "^6.1.6",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.28.4",
    "@codemirror/state": "^6.4.1",
    "express": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/js-yaml": "^4.0.9",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "electron": "^34.0.0",
    "electron-builder": "^25.1.0",
    "tsx": "^4.19.0",
    "concurrently": "^9.1.0",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 2: 创建 app/electron-builder.yml**

```yaml
appId: com.learnanything.app
productName: Learn-Anything
copyright: Copyright © 2026

directories:
  output: release
  buildResources: public

files:
  - dist/**/*
  - server/**/*
  - electron/**/*.cjs
  - node_modules/**/*
  - package.json
  - .env.example

extraResources:
  - from: ../.learn
    to: .learn

win:
  target:
    - target: nsis
      arch: [x64]
  icon: public/icon.ico

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Learn-Anything

asar: true
asarUnpack:
  - node_modules/sharp/**
  - node_modules/cpu-features/**
```

- [ ] **Step 3: 更新 vite.config.ts — 生产构建配置**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { learningApiPlugin } from './src/server/main';

export default defineConfig({
  plugins: [react(), learningApiPlugin()],
  base: './',  // Relative paths for Electron file:// loading
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
```

关键：`base: './'` 确保构建产物使用相对路径，这样从 Express 或 file:// 加载都能正常工作。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add Electron packaging config and build scripts"
```

---

### Task 10: 集成测试 + 最终修复

- [ ] **Step 1: 测试开发模式（Vite + Express）**

```bash
# Terminal 1
cd app && npm run dev:server
# Expected: [Learn-Anything API] http://localhost:3456

# Terminal 2
cd app && npm run dev
# Expected: Vite dev server on http://localhost:5173
```

访问 `http://localhost:5173`，验证所有页面功能正常。

- [ ] **Step 2: 测试 Electron 开发模式**

```bash
cd app && npm run electron:dev
```

Expected:
- Express 启动在 3456
- Vite 启动在 5173
- Electron 窗口打开，加载 Vite 页面
- 自定义标题栏显示三个圆点按钮
- 点击圆点：最小化/最大化/关闭正常工作
- 欢迎页：首次启动显示 API Key 输入页

- [ ] **Step 3: 测试生产构建**

```bash
cd app && npm run build
# Expected: dist/ 目录生成，含 index.html 和静态资源

npm run electron:start
# Expected: Express 启动 → Electron 窗口加载 http://localhost:3456
```

- [ ] **Step 4: 测试 .exe 打包**

```bash
cd app && npm run electron:build
# Expected: release/ 目录生成 Learn-Anything Setup X.X.X.exe
```

运行安装程序，验证：
- 桌面快捷方式
- 启动菜单项
- 应用启动后功能正常

- [ ] **Step 5: 提交最终版本**

```bash
git add -A
git commit -m "feat: complete Electron desktop app integration"
```

---

## npm scripts 速查

| 命令 | 用途 |
|------|------|
| `npm run dev` | 纯 Web 开发（Vite HMR） |
| `npm run dev:server` | 启动独立 Express API 服务器 |
| `npm run build` | 构建前端生产包 |
| `npm run electron:dev` | Electron 开发模式（Express + Vite + Electron） |
| `npm run electron:start` | Electron 生产模式（加载 dist/） |
| `npm run electron:build` | 构建 + 打包 .exe |
