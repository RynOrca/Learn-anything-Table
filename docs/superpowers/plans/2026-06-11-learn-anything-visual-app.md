# Learn-Anything 可视化学习面板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地 Web 全功能学习面板，通过 DeepSeek API 驱动 AI 教学，可视化展示学习进度、知识地图、历史记录。

**Architecture:** React 18 + TypeScript + Vite 前端，Vite 插件提供文件系统 API 中间件和 DeepSeek API 代理。前端通过 Zustand 管理状态，react-router-dom 管理路由。深色学术风主题，思源宋体。

**Tech Stack:** React 18, TypeScript 5, Vite 5, react-router-dom v6, Zustand, CodeMirror 6, react-markdown, js-yaml, DeepSeek API

---

## 文件结构

```
D:\Code\Learn-anything\app\
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  index.html
  .env.example
  src/
    main.tsx
    App.tsx
    vite-env.d.ts
    types/
      index.ts
    styles/
      globals.css
    store/
      useLearningStore.ts
      useSettingsStore.ts
    api/
      files.ts
      deepseek.ts
      github.ts
    components/
      Layout.tsx
      NavBar.tsx
      StatusBadge.tsx
      ProgressBar.tsx
      SessionCard.tsx
      ChatMessage.tsx
      CodeEditor.tsx
      PhasePill.tsx
      TopicSelector.tsx
    pages/
      Dashboard.tsx
      KnowledgeMap.tsx
      History.tsx
      Chat.tsx
      Practice.tsx
      Roadmap.tsx
      Settings.tsx
    server/
      files.ts
      deepseek.ts
      execute.ts
      main.ts          # Vite 插件入口
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `D:\Code\Learn-anything\app\package.json`
- Create: `D:\Code\Learn-anything\app\tsconfig.json`
- Create: `D:\Code\Learn-anything\app\tsconfig.node.json`
- Create: `D:\Code\Learn-anything\app\vite.config.ts`
- Create: `D:\Code\Learn-anything\app\index.html`
- Create: `D:\Code\Learn-anything\app\.env.example`
- Create: `D:\Code\Learn-anything\app\src\vite-env.d.ts`
- Create: `D:\Code\Learn-anything\app\src\main.tsx`
- Create: `D:\Code\Learn-anything\app\src\App.tsx`
- Create: `D:\Code\Learn-anything\app\src\styles\globals.css`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "learn-anything-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
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
    "@codemirror/state": "^6.4.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/js-yaml": "^4.0.9",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "src/server/**/*.ts"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { learningApiPlugin } from './src/server/main';

export default defineConfig({
  plugins: [react(), learningApiPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  }
});
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learn-Anything 学习面板</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 .env.example**

```
VITE_DEEPSEEK_API_KEY=sk-your-api-key-here
VITE_DATA_DIR=../..
```

- [ ] **Step 7: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_DATA_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 8: 创建 src/styles/globals.css**

```css
:root {
  --color-bg-page: #0f1117;
  --color-bg-card: #161b22;
  --color-bg-input: #0d1117;
  --color-border: #1e2130;
  --color-border-hover: #30363d;
  --color-text-primary: #e1e4e8;
  --color-text-secondary: #8b949e;
  --color-text-tertiary: #484f58;
  --color-accent-blue: #58a6ff;
  --color-accent-green: #3fb950;
  --color-accent-yellow: #d2991d;
  --color-accent-red: #f85149;
  --color-bg-blue: #1a2332;
  --color-bg-green: #1a3a2a;
  --color-bg-yellow: #2e2a1a;

  --font-serif: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', 'Songti SC', serif;
  --font-mono: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-base: 13px;
  --font-size-md: 15px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 20px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
```

- [ ] **Step 9: 创建 src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 10: 创建占位 App.tsx**

```tsx
export default function App() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--font-size-lg)'
    }}>
      Learn-Anything
    </div>
  );
}
```

- [ ] **Step 11: 安装依赖并验证启动**

```bash
cd D:\Code\Learn-anything\app && npm install
```

```bash
cd D:\Code\Learn-anything\app && npm run dev
```

Expected: 浏览器打开 http://localhost:5173 显示 "Learn-Anything" 文字，深色背景。

- [ ] **Step 12: 提交**

```bash
git add app/
git commit -m "feat: scaffold Vite + React + TypeScript project with global styles"
```

---

### Task 2: 类型定义与状态管理

**Files:**
- Create: `D:\Code\Learn-anything\app\src\types\index.ts`
- Create: `D:\Code\Learn-anything\app\src\store\useSettingsStore.ts`
- Create: `D:\Code\Learn-anything\app\src\store\useLearningStore.ts`

- [ ] **Step 1: 创建 types/index.ts**

```typescript
export type ConceptStatus = 'mastered' | 'in_progress' | 'needs_practice' | 'unexplored';

export interface Concept {
  path: string;
  status: ConceptStatus;
  last_practiced: string | null;
  practice_count: number;
  confidence: number;
}

export interface TopicState {
  topic: string;
  created: string;
  concepts: Concept[];
}

export interface KnowledgeDomain {
  name: string;
  concepts: string[];
}

export interface SessionMeta {
  filename: string;
  conceptName: string;
  type: 'explain' | 'practice';
  date: string;
  summary: string;
}

export interface SessionDetail {
  filename: string;
  conceptName: string;
  type: 'explain' | 'practice';
  date: string;
  content: string;
}

export interface Phase {
  name: string;
  index: number;
  topicCount: number;
  masteredCount: number;
  progress: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ExercisePrompt {
  goal: string;
  background: string;
  requirements: string[];
  hints: string[];
  starterCode: string;
}

export interface AIReviewResult {
  acknowledgment: string;
  socraticFollowUp: string;
  edgeCases: string[];
  codeQualityTip: string;
  assessment: 'excellent' | 'good' | 'needs_work';
  confidenceChange: number;
}

export interface DashboardStats {
  topicName: string;
  totalConcepts: number;
  masteredCount: number;
  inProgressCount: number;
  needsPracticeCount: number;
  unexploredCount: number;
  overallProgress: number;
  phases: Phase[];
  recommendations: Array<{
    type: 'practice' | 'learn';
    conceptName: string;
    reason: string;
  }>;
  recentSessions: SessionMeta[];
}

export interface Settings {
  deepseekApiKey: string;
  dataDir: string;
  fontSize: number;
}
```

- [ ] **Step 2: 创建 store/useSettingsStore.ts**

```typescript
import { create } from 'zustand';
import type { Settings } from '../types';

interface SettingsState extends Settings {
  setApiKey: (key: string) => void;
  setDataDir: (dir: string) => void;
  setFontSize: (size: number) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const STORAGE_KEY = 'learn-anything-settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  deepseekApiKey: '',
  dataDir: '../..',
  fontSize: 13,

  setApiKey: (key: string) => set({ deepseekApiKey: key }),
  setDataDir: (dir: string) => set({ dataDir: dir }),
  setFontSize: (size: number) => set({ fontSize: size }),

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        set({
          deepseekApiKey: parsed.deepseekApiKey ?? '',
          dataDir: parsed.dataDir ?? '../..',
          fontSize: parsed.fontSize ?? 13,
        });
      }
    } catch {
      // use defaults
    }
  },

  saveSettings: () => {
    const { deepseekApiKey, dataDir, fontSize } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      deepseekApiKey,
      dataDir,
      fontSize,
    }));
  },
}));
```

- [ ] **Step 3: 创建 store/useLearningStore.ts**

```typescript
import { create } from 'zustand';
import type { TopicState, DashboardStats, SessionMeta, SessionDetail } from '../types';
import * as filesApi from '../api/files';

interface LearningState {
  topicName: string | null;
  state: TopicState | null;
  knowledgeMap: string | null;
  sessions: SessionMeta[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  loadTopic: (name: string) => Promise<void>;
  loadSessions: (search?: string) => Promise<void>;
  loadSessionDetail: (filename: string) => Promise<SessionDetail | null>;
  updateConceptStatus: (path: string, status: string, confidence: number) => Promise<void>;
  saveSession: (conceptName: string, type: 'explain' | 'practice', content: string) => Promise<void>;
  refreshStats: () => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  topicName: null,
  state: null,
  knowledgeMap: null,
  sessions: [],
  stats: null,
  loading: false,
  error: null,

  loadTopic: async (name: string) => {
    set({ loading: true, error: null, topicName: name });
    try {
      const [state, knowledgeMap, sessions] = await Promise.all([
        filesApi.fetchState(name),
        filesApi.fetchKnowledgeMap(name),
        filesApi.fetchSessions(name),
      ]);
      const stats = filesApi.computeStats(state, sessions);
      set({ state, knowledgeMap, sessions, stats, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  loadSessions: async (search?: string) => {
    const { topicName } = get();
    if (!topicName) return;
    try {
      const sessions = await filesApi.fetchSessions(topicName, search);
      set({ sessions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadSessionDetail: async (filename: string) => {
    const { topicName } = get();
    if (!topicName) return null;
    return filesApi.fetchSessionDetail(topicName, filename);
  },

  updateConceptStatus: async (path: string, status: string, confidence: number) => {
    const { topicName, state } = get();
    if (!topicName || !state) return;
    try {
      await filesApi.updateState(topicName, state, path, status, confidence);
      // Reload topic to refresh stats
      await get().loadTopic(topicName);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  saveSession: async (conceptName: string, type: 'explain' | 'practice', content: string) => {
    const { topicName } = get();
    if (!topicName) return;
    try {
      await filesApi.createSession(topicName, conceptName, type, content);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshStats: () => {
    const { state, sessions } = get();
    if (!state) return;
    const stats = filesApi.computeStats(state, sessions);
    set({ stats });
  },
}));
```

- [ ] **Step 4: 提交**

```bash
git add app/src/types/ app/src/store/
git commit -m "feat: add TypeScript types and Zustand stores"
```

---

### Task 3: 文件系统 API 中间件

**Files:**
- Create: `D:\Code\Learn-anything\app\src\server\main.ts`
- Create: `D:\Code\Learn-anything\app\src\server\files.ts`
- Create: `D:\Code\Learn-anything\app\src\server\deepseek.ts`
- Create: `D:\Code\Learn-anything\app\src\server\execute.ts`

- [ ] **Step 1: 创建 src/server/files.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { TopicState, SessionMeta, SessionDetail, Concept } from '../types';

const DATA_ROOT = path.resolve(__dirname, '../../../..');

function topicsDir(): string {
  return path.join(DATA_ROOT, '.learn', 'topics');
}

function topicDir(name: string): string {
  return path.join(topicsDir(), name);
}

function sessionsDir(topicName: string): string {
  return path.join(topicDir(topicName), 'sessions');
}

export function listTopics(): string[] {
  const dir = topicsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

export function getKnowledgeMap(topicName: string): string {
  const filePath = path.join(topicDir(topicName), 'knowledge-map.md');
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

export function getState(topicName: string): TopicState {
  const filePath = path.join(topicDir(topicName), 'state.yaml');
  if (!fs.existsSync(filePath)) {
    throw new Error(`No state.yaml found for topic: ${topicName}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as TopicState;
}

export function updateState(
  topicName: string,
  currentState: TopicState,
  conceptPath: string,
  newStatus: string,
  newConfidence: number
): void {
  const concept = currentState.concepts.find(c => c.path === conceptPath);
  if (!concept) throw new Error(`Concept not found: ${conceptPath}`);

  concept.status = newStatus as Concept['status'];
  concept.confidence = newConfidence;
  if (newStatus === 'mastered' || newStatus === 'needs_practice') {
    concept.last_practiced = new Date().toISOString().split('T')[0];
    concept.practice_count += 1;
  }

  const filePath = path.join(topicDir(topicName), 'state.yaml');
  fs.writeFileSync(filePath, yaml.dump(currentState, { lineWidth: 120 }), 'utf-8');
}

export function getSessions(topicName: string, search?: string): SessionMeta[] {
  const dir = sessionsDir(topicName);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  const sessions: SessionMeta[] = [];
  for (const filename of files) {
    if (search && !filename.toLowerCase().includes(search.toLowerCase())) continue;
    const content = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const type = filename.includes('practice') ? 'practice' as const : 'explain' as const;
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';
    const conceptName = filename.replace(`-${date}.md`, '').replace('-practice', '').replace(/-/g, ' ');
    const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#')) ?? '';
    const summary = firstLine.replace(/^[#*\->\s]+/, '').slice(0, 80);

    sessions.push({ filename, conceptName, type, date, summary });
  }
  return sessions;
}

export function getSessionDetail(topicName: string, filename: string): SessionDetail | null {
  const filePath = path.join(sessionsDir(topicName), filename);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const type = filename.includes('practice') ? 'practice' as const : 'explain' as const;
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';
  const conceptName = filename.replace(`-${date}.md`, '').replace('-practice', '').replace(/-/g, ' ');

  return { filename, conceptName, type, date, content };
}

export function createSession(
  topicName: string,
  conceptName: string,
  type: 'explain' | 'practice',
  content: string
): void {
  const dir = sessionsDir(topicName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const date = new Date().toISOString().split('T')[0];
  const slug = conceptName.toLowerCase().replace(/\s+/g, '-');
  const typeSuffix = type === 'practice' ? '-practice' : '';
  const filename = `${slug}${typeSuffix}-${date}.md`;

  const header = type === 'explain'
    ? `# ${conceptName} -- 讲解\n\n> 日期: ${date}\n\n`
    : `# ${conceptName} -- 练习\n\n> 日期: ${date}\n\n`;

  fs.writeFileSync(path.join(dir, filename), header + content, 'utf-8');
}

export function getPlan(topicName: string): string {
  const topicRoot = path.join(DATA_ROOT, topicName);
  if (!fs.existsSync(topicRoot)) return '';

  const files = fs.readdirSync(topicRoot);
  const planFile = files.find(f => f.includes('plan') && f.endsWith('.md'));
  if (!planFile) return '';

  return fs.readFileSync(path.join(topicRoot, planFile), 'utf-8');
}
```

- [ ] **Step 2: 创建 src/server/deepseek.ts**

```typescript
import type { ExercisePrompt, AIReviewResult } from '../types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

async function callDeepseek(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history?: Array<{ role: string; content: string }>
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...(history ?? []),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
}

const EXPLAIN_PROMPT = `你是一位苏格拉底式教师，使用中文进行教学。你的教学方法：

1. **定位** — 一句话说明这个概念在知识体系中的位置
2. **类比** — 用一个生活化的比喻建立直觉
3. **核心机制** — 用清晰的语言解释"是什么"和"为什么"
4. **代码示例** — 提供完整且最小的代码示例，逐步讲解
5. **常见误区** — 指出最常见的初学者错误
6. **苏格拉底检验** — 提1-2个引导思考的问题（不是测试！）

原则：
- 使用思源宋体风格的语言——沉稳、学术但不枯燥
- 用中文回复，代码注释用中文
- 不评价学生，只引导思考
- 每个概念结束时，提供下一步学习方向`;

export async function explain(
  apiKey: string,
  conceptName: string,
  knowledgeMap: string,
  userLevel: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  const userMsg = `请讲解概念："${conceptName}"。知识地图上下文：\n${knowledgeMap}\n\n学习者水平：${userLevel}`;
  return callDeepseek(apiKey, EXPLAIN_PROMPT, userMsg, history);
}

export async function chat(
  apiKey: string,
  conceptName: string,
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  const userMsg = `当前学习的概念是："${conceptName}"。\n\n学生的问题：${message}`;
  return callDeepseek(apiKey, EXPLAIN_PROMPT, userMsg, history);
}

export async function generateExercise(
  apiKey: string,
  conceptName: string,
  difficulty: string,
  knowledgeMap: string
): Promise<ExercisePrompt> {
  const userMsg = `请为概念"${conceptName}"生成一个编程练习题。难度：${difficulty}。知识地图：${knowledgeMap}`;
  const systemPrompt = `你是一位编程练习设计者。根据概念和难度，生成一个TDD风格的练习题。用JSON格式回复：
{
  "goal": "一句话目标",
  "background": "1-2句背景",
  "requirements": ["要求1", "要求2", "要求3"],
  "hints": ["提示1", "提示2"],
  "starterCode": "def solution(...):\\n    # TODO\\n    pass"
}`;

  const response = await callDeepseek(apiKey, systemPrompt, userMsg);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as ExercisePrompt;
  }
  return {
    goal: '实现指定功能',
    background: '',
    requirements: [],
    hints: [],
    starterCode: '# TODO\n',
  };
}

export async function reviewCode(
  apiKey: string,
  conceptName: string,
  userCode: string,
  exerciseGoal: string
): Promise<AIReviewResult> {
  const userMsg = `概念："${conceptName}"\n练习目标："${exerciseGoal}"\n\n学生代码：\n\`\`\`python\n${userCode}\n\`\`\``;
  const systemPrompt = `你是编程教练。审阅学生代码，用苏格拉底式反馈。用JSON格式回复：
{
  "acknowledgment": "首先肯定做对的部分",
  "socraticFollowUp": "引导式追问",
  "edgeCases": ["边界情况1", "边界情况2"],
  "codeQualityTip": "代码质量改进建议",
  "assessment": "good|excellent|needs_work",
  "confidenceChange": 0.1
}`;

  const response = await callDeepseek(apiKey, systemPrompt, userMsg);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as AIReviewResult;
  }
  return {
    acknowledgment: '',
    socraticFollowUp: '',
    edgeCases: [],
    codeQualityTip: '',
    assessment: 'good',
    confidenceChange: 0.05,
  };
}

export async function recommend(
  apiKey: string,
  topicState: string,
  sessions: string
): Promise<string> {
  const systemPrompt = `你是学习分析师。根据学习数据和间隔重复原理，推荐下一步学习路径。用中文回复。`;
  const userMsg = `学习状态：\n${topicState}\n\n历史会话：\n${sessions}`;
  return callDeepseek(apiKey, systemPrompt, userMsg);
}

export async function generateKnowledgeMap(
  apiKey: string,
  topicName: string
): Promise<string> {
  const systemPrompt = `你是知识体系架构师。为主题生成结构化的知识地图。用Markdown格式，## 为领域标题，- 为知识点。2-3层深度，15-25个核心概念。`;
  return callDeepseek(apiKey, systemPrompt, `为"${topicName}"生成知识地图`);
}

export async function adjustPlan(
  apiKey: string,
  currentPlan: string,
  currentState: string
): Promise<string> {
  const systemPrompt = `你是学习规划师。根据当前学习进度调整学习计划。保持原计划的Markdown结构。用中文。`;
  const userMsg = `当前计划：\n${currentPlan}\n\n学习状态：\n${currentState}`;
  return callDeepseek(apiKey, systemPrompt, userMsg);
}
```

- [ ] **Step 3: 创建 src/server/execute.ts**

```typescript
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export function executePython(code: string): ExecutionResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learn-py-'));
  const tmpFile = path.join(tmpDir, 'solution.py');

  try {
    fs.writeFileSync(tmpFile, code, 'utf-8');

    const result: ExecutionResult = {
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    };

    try {
      const output = execSync(`python "${tmpFile}"`, {
        timeout: 5000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        cwd: tmpDir,
      });
      result.stdout = output;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; status?: number; killed?: boolean };
      result.stdout = err.stdout ?? '';
      result.stderr = err.stderr ?? '';
      result.exitCode = err.status ?? 1;
      result.timedOut = err.killed ?? false;
    }

    return result;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup failure is non-critical
    }
  }
}
```

- [ ] **Step 4: 创建 src/server/main.ts**

```typescript
import type { Plugin } from 'vite';
import { listTopics, getKnowledgeMap, getState, updateState, getSessions, getSessionDetail, createSession, getPlan } from './files';
import { explain, chat, generateExercise, reviewCode, recommend, generateKnowledgeMap, adjustPlan } from './deepseek';
import { executePython } from './execute';

function getApiKeyFromRequest(req: { headers: Record<string, string | string[] | undefined> }): string {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return '';
}

export function learningApiPlugin(): Plugin {
  return {
    name: 'learn-anything-api',
    configureServer(server) {
      // List topics
      server.middlewares.use('/api/topics', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        try {
          const topics = listTopics();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(topics));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      // Get knowledge map
      server.middlewares.use('/api/topics/:name/knowledge-map', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const name = url.pathname.split('/')[3];
        try {
          const map = getKnowledgeMap(name);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(map);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      // Get state
      server.middlewares.use('/api/topics/:name/state', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const parts = url.pathname.split('/');
        const name = parts[3];
        const isState = parts[4] === 'state';

        if (req.method === 'GET' && isState) {
          try {
            const state = getState(name);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(state));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        } else if (req.method === 'PUT' && isState) {
          try {
            const body = await readBody(req);
            const { currentState, conceptPath, newStatus, newConfidence } = JSON.parse(body);
            updateState(name, currentState, conceptPath, newStatus, newConfidence);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      // Sessions
      server.middlewares.use('/api/topics/:name/sessions', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const parts = url.pathname.split('/');
        const name = parts[3];
        const sessionFile = parts[5];

        if (req.method === 'GET' && !sessionFile) {
          try {
            const search = url.searchParams.get('search') ?? undefined;
            const sessions = getSessions(name, search);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(sessions));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        } else if (req.method === 'GET' && sessionFile) {
          try {
            const detail = getSessionDetail(name, sessionFile);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(detail));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        } else if (req.method === 'POST') {
          try {
            const body = await readBody(req);
            const { conceptName, type, content } = JSON.parse(body);
            createSession(name, conceptName, type, content);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      // Plan
      server.middlewares.use('/api/topics/:name/plan', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const name = url.pathname.split('/')[3];
        try {
          const plan = getPlan(name);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(plan);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      // Execute Python
      server.middlewares.use('/api/execute', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { code } = JSON.parse(body);
          const result = executePython(code);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      // DeepSeek AI endpoints
      server.middlewares.use('/api/ai/explain', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { conceptName, knowledgeMap, userLevel, history } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const response = await explain(apiKey, conceptName, knowledgeMap, userLevel, history ?? []);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: response }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/chat', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { conceptName, message, history } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const response = await chat(apiKey, conceptName, message, history ?? []);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: response }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/exercise', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { conceptName, difficulty, knowledgeMap } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const exercise = await generateExercise(apiKey, conceptName, difficulty, knowledgeMap ?? '');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(exercise));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/review', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { conceptName, userCode, exerciseGoal } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const review = await reviewCode(apiKey, conceptName, userCode, exerciseGoal);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(review));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/recommend', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { topicState, sessions } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const recs = await recommend(apiKey, topicState, sessions);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: recs }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/knowledge-map', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { topicName } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const map = await generateKnowledgeMap(apiKey, topicName);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: map }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });

      server.middlewares.use('/api/ai/adjust-plan', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        try {
          const body = await readBody(req);
          const { currentPlan, currentState } = JSON.parse(body);
          const apiKey = getApiKeyFromRequest(req);
          if (!apiKey) { res.statusCode = 401; res.end(JSON.stringify({ error: 'API key required' })); return; }
          const plan = await adjustPlan(apiKey, currentPlan, currentState);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: plan }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
    },
  };
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
```

- [ ] **Step 5: 提交**

```bash
git add app/src/server/
git commit -m "feat: add Vite API middleware for file system, DeepSeek, and Python execution"
```

---

### Task 4: 前端 API 层与布局组件

**Files:**
- Create: `D:\Code\Learn-anything\app\src\api\files.ts`
- Create: `D:\Code\Learn-anything\app\src\api\deepseek.ts`
- Create: `D:\Code\Learn-anything\app\src\api\github.ts`
- Create: `D:\Code\Learn-anything\app\src\components\Layout.tsx`
- Create: `D:\Code\Learn-anything\app\src\components\NavBar.tsx`
- Create: `D:\Code\Learn-anything\app\src\components\StatusBadge.tsx`
- Create: `D:\Code\Learn-anything\app\src\components\ProgressBar.tsx`
- Create: `D:\Code\Learn-anything\app\src\components\PhasePill.tsx`
- Create: `D:\Code\Learn-anything\app\src\components\TopicSelector.tsx`

- [ ] **Step 1: 创建 api/files.ts**

```typescript
import type { TopicState, SessionMeta, SessionDetail, DashboardStats, Phase } from '../types';

const BASE = '/api';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchTopics(): Promise<string[]> {
  return get<string[]>(`${BASE}/topics`);
}

export function fetchKnowledgeMap(topicName: string): Promise<string> {
  return getText(`${BASE}/topics/${topicName}/knowledge-map`);
}

export function fetchState(topicName: string): Promise<TopicState> {
  return get<TopicState>(`${BASE}/topics/${topicName}/state`);
}

export function updateState(
  topicName: string,
  currentState: TopicState,
  conceptPath: string,
  newStatus: string,
  newConfidence: number
): Promise<{ success: boolean }> {
  return put(`${BASE}/topics/${topicName}/state`, {
    currentState,
    conceptPath,
    newStatus,
    newConfidence,
  });
}

export function fetchSessions(topicName: string, search?: string): Promise<SessionMeta[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return get<SessionMeta[]>(`${BASE}/topics/${topicName}/sessions${params}`);
}

export function fetchSessionDetail(topicName: string, filename: string): Promise<SessionDetail> {
  return get<SessionDetail>(`${BASE}/topics/${topicName}/sessions/${filename}`);
}

export function createSession(
  topicName: string,
  conceptName: string,
  type: 'explain' | 'practice',
  content: string
): Promise<{ success: boolean }> {
  return post(`${BASE}/topics/${topicName}/sessions`, {
    conceptName,
    type,
    content,
  });
}

export function fetchPlan(topicName: string): Promise<string> {
  return getText(`${BASE}/topics/${topicName}/plan`);
}

export function executePython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return post(`${BASE}/execute`, { code });
}

// Stats computation (client-side)
export function computeStats(state: TopicState, sessions: SessionMeta[]): DashboardStats {
  const total = state.concepts.length;
  const mastered = state.concepts.filter(c => c.status === 'mastered').length;
  const inProgress = state.concepts.filter(c => c.status === 'in_progress').length;
  const needsPractice = state.concepts.filter(c => c.status === 'needs_practice').length;
  const unexplored = total - mastered - inProgress - needsPractice;
  const overallProgress = total > 0 ? Math.round((mastered / total) * 100) : 0;

  // Derive phases from concept paths
  const domainMap = new Map<string, { total: number; mastered: number }>();
  for (const c of state.concepts) {
    const domain = c.path.split('/')[0];
    const entry = domainMap.get(domain) ?? { total: 0, mastered: 0 };
    entry.total += 1;
    if (c.status === 'mastered') entry.mastered += 1;
    domainMap.set(domain, entry);
  }

  const phases: Phase[] = Array.from(domainMap.entries()).map(([name, counts], i) => ({
    name,
    index: i,
    topicCount: counts.total,
    masteredCount: counts.mastered,
    progress: counts.total > 0 ? Math.round((counts.mastered / counts.total) * 100) : 0,
  }));

  // Generate recommendations
  const recommendations: DashboardStats['recommendations'] = [];
  const needsPracticeConcept = state.concepts.find(c => c.status === 'needs_practice');
  if (needsPracticeConcept) {
    recommendations.push({
      type: 'practice',
      conceptName: needsPracticeConcept.path.split('/').pop()!,
      reason: '上次学习后需要巩固练习',
    });
  }
  const inProgressConcept = state.concepts.find(c => c.status === 'in_progress');
  if (inProgressConcept) {
    recommendations.push({
      type: 'learn',
      conceptName: inProgressConcept.path.split('/').pop()!,
      reason: '继续上次的学习进度',
    });
  }

  return {
    topicName: state.topic,
    totalConcepts: total,
    masteredCount: mastered,
    inProgressCount: inProgress,
    needsPracticeCount: needsPractice,
    unexploredCount: unexplored,
    overallProgress,
    phases,
    recommendations,
    recentSessions: sessions.slice(0, 5),
  };
}
```

- [ ] **Step 2: 创建 api/deepseek.ts**

```typescript
import type { ExercisePrompt, AIReviewResult } from '../types';

const BASE = '/api/ai';

function getAuthHeaders(): Record<string, string> {
  const stored = localStorage.getItem('learn-anything-settings');
  let apiKey = '';
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { deepseekApiKey?: string };
      apiKey = parsed.deepseekApiKey ?? '';
    } catch { /* use empty */ }
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json() as Promise<T>;
}

export function explain(
  conceptName: string,
  knowledgeMap: string,
  userLevel: string,
  history: Array<{ role: string; content: string }>
): Promise<{ content: string }> {
  return post(`${BASE}/explain`, { conceptName, knowledgeMap, userLevel, history });
}

export function chat(
  conceptName: string,
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<{ content: string }> {
  return post(`${BASE}/chat`, { conceptName, message, history });
}

export function generateExercise(
  conceptName: string,
  difficulty: string,
  knowledgeMap: string
): Promise<ExercisePrompt> {
  return post(`${BASE}/exercise`, { conceptName, difficulty, knowledgeMap });
}

export function reviewCode(
  conceptName: string,
  userCode: string,
  exerciseGoal: string
): Promise<AIReviewResult> {
  return post(`${BASE}/review`, { conceptName, userCode, exerciseGoal });
}

export function recommend(topicState: string, sessions: string): Promise<{ content: string }> {
  return post(`${BASE}/recommend`, { topicState, sessions });
}

export function generateKnowledgeMap(topicName: string): Promise<{ content: string }> {
  return post(`${BASE}/knowledge-map`, { topicName });
}

export function adjustPlan(currentPlan: string, currentState: string): Promise<{ content: string }> {
  return post(`${BASE}/adjust-plan`, { currentPlan, currentState });
}
```

- [ ] **Step 3: 创建 api/github.ts**

```typescript
const GITHUB_API = 'https://api.github.com/repos/ChenChenyaqi/learn-anything';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

export async function checkLatestVersion(): Promise<GitHubRelease | null> {
  try {
    const res = await fetch(`${GITHUB_API}/releases/latest`);
    if (!res.ok) return null;
    return res.json() as Promise<GitHubRelease>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 创建 components/Layout.tsx**

```tsx
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <NavBar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px 32px',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: 创建页面占位文件**

```bash
mkdir -p D:\Code\Learn-anything\app\src\pages
```

创建 `src/pages/Dashboard.tsx`:
```tsx
export default function Dashboard() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>仪表盘</div>;
}
```

创建 `src/pages/KnowledgeMap.tsx`:
```tsx
export default function KnowledgeMap() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>知识地图</div>;
}
```

创建 `src/pages/History.tsx`:
```tsx
export default function History() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>学习历史</div>;
}
```

创建 `src/pages/Chat.tsx`:
```tsx
export default function Chat() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>AI 对话</div>;
}
```

创建 `src/pages/Practice.tsx`:
```tsx
export default function Practice() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>在线练习</div>;
}
```

创建 `src/pages/Roadmap.tsx`:
```tsx
export default function Roadmap() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>学习路线</div>;
}
```

创建 `src/pages/Settings.tsx`:
```tsx
export default function Settings() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>设置</div>;
}
```

- [ ] **Step 6: 创建 components/NavBar.tsx**

```tsx
import { NavLink } from 'react-router-dom';
import TopicSelector from './TopicSelector';

const NAV_ITEMS = [
  { to: '/', label: '概览' },
  { to: '/map', label: '地图' },
  { to: '/history', label: '历史' },
  { to: '/chat', label: '对话' },
  { to: '/practice', label: '练习' },
  { to: '/roadmap', label: '路线' },
  { to: '/settings', label: '设置' },
];

const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  padding: '4px 0',
  borderBottom: '2px solid transparent',
  transition: 'color 0.15s, border-color 0.15s',
};

const activeStyle: React.CSSProperties = {
  ...linkStyle,
  color: 'var(--color-text-primary)',
  borderBottomColor: 'var(--color-accent-blue)',
};

export default function NavBar() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: 48,
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-bg-page)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginRight: 32 }}>
        Learn-Anything
      </div>
      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => isActive ? activeStyle : linkStyle}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <TopicSelector />
    </nav>
  );
}
```

- [ ] **Step 7: 创建 components/StatusBadge.tsx**

```tsx
import type { ConceptStatus } from '../types';

const STATUS_CONFIG: Record<ConceptStatus, { label: string; color: string; bg: string }> = {
  mastered: { label: '已掌握', color: 'var(--color-accent-green)', bg: 'var(--color-bg-green)' },
  in_progress: { label: '进行中', color: 'var(--color-accent-blue)', bg: 'var(--color-bg-blue)' },
  needs_practice: { label: '待练习', color: 'var(--color-accent-yellow)', bg: 'var(--color-bg-yellow)' },
  unexplored: { label: '未开始', color: 'var(--color-text-tertiary)', bg: 'transparent' },
};

interface StatusBadgeProps {
  status: ConceptStatus;
  confidence?: number;
}

export default function StatusBadge({ status, confidence }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 'var(--font-size-xs)',
      color: config.color,
      background: config.bg,
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      border: status === 'unexplored' ? '1px solid var(--color-border)' : 'none',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: config.color,
        display: 'inline-block',
      }} />
      {config.label}
      {confidence !== undefined && ` ${Math.round(confidence * 100)}%`}
    </span>
  );
}
```

- [ ] **Step 8: 创建 components/ProgressBar.tsx**

```tsx
interface ProgressBarProps {
  value: number;
  label?: string;
  showFraction?: { current: number; total: number };
  height?: number;
  color?: string;
}

export default function ProgressBar({
  value,
  label,
  showFraction,
  height = 6,
  color = 'var(--color-accent-green)',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      {(label || showFraction) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          {label && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</span>}
          {showFraction && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-blue)' }}>
              {showFraction.current} / {showFraction.total}
            </span>
          )}
        </div>
      )}
      <div style={{
        background: 'var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        height,
        overflow: 'hidden',
      }}>
        <div style={{
          background: color,
          height: '100%',
          width: `${pct}%`,
          borderRadius: 'var(--radius-sm)',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: 创建 components/PhasePill.tsx**

```tsx
interface PhasePillProps {
  name: string;
  progress: number;
  isActive?: boolean;
  onClick?: () => void;
}

export default function PhasePill({ name, progress, isActive, onClick }: PhasePillProps) {
  const bg = isActive ? 'var(--color-bg-green)' : 'var(--color-bg-card)';
  const borderColor = isActive ? 'var(--color-accent-green)' : 'var(--color-border)';
  const textColor = isActive ? 'var(--color-accent-green)' : 'var(--color-text-tertiary)';

  return (
    <span
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        padding: '4px 12px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--font-size-sm)',
        color: textColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      {name} {progress}%
    </span>
  );
}
```

- [ ] **Step 10: 创建 components/TopicSelector.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import { fetchTopics } from '../api/files';

export default function TopicSelector() {
  const [topics, setTopics] = useState<string[]>([]);
  const { topicName, loadTopic } = useLearningStore();

  useEffect(() => {
    fetchTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    if (topics.length > 0 && !topicName) {
      loadTopic(topics[0]);
    }
  }, [topics, topicName, loadTopic]);

  if (topics.length === 0) {
    return (
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
        无学习主题
      </span>
    );
  }

  return (
    <select
      value={topicName ?? ''}
      onChange={e => loadTopic(e.target.value)}
      style={{
        background: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 8px',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-serif)',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {topics.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 11: 创建 components/SessionCard.tsx**

```tsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SessionMeta, SessionDetail } from '../types';
import { useLearningStore } from '../store/useLearningStore';

interface SessionCardProps {
  session: SessionMeta;
  compact?: boolean;
}

export default function SessionCard({ session, compact }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const loadSessionDetail = useLearningStore(s => s.loadSessionDetail);

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    if (!detail) {
      setLoadingDetail(true);
      try { const d = await loadSessionDetail(session.filename); setDetail(d); } catch {}
      setLoadingDetail(false);
    }
    setExpanded(true);
  };

  return (
    <div style={{
      padding: expanded ? 16 : '10px 12px',
      marginBottom: expanded ? 8 : 4,
      background: 'var(--color-bg-card)',
      border: `1px solid ${expanded ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    }}>
      <div onClick={handleExpand} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: session.type === 'practice' ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)',
            marginBottom: 2,
          }}>
            {session.conceptName} -- {session.type === 'practice' ? '练习' : '讲解'}
          </div>
          {!compact && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {session.summary}
            </div>
          )}
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginLeft: 16, whiteSpace: 'nowrap' }}>
          {session.date}
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          {loadingDetail ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>加载中...</div>
          ) : detail ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.8 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.content}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>无法加载详情</div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12: 更新 App.tsx 加入路由**

```tsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import KnowledgeMap from './pages/KnowledgeMap';
import History from './pages/History';
import Chat from './pages/Chat';
import Practice from './pages/Practice';
import Roadmap from './pages/Roadmap';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<KnowledgeMap />} />
        <Route path="/history" element={<History />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 13: 提交**

```bash
git add app/src/api/ app/src/components/ app/src/pages/ app/src/App.tsx
git commit -m "feat: add frontend API layer, layout, shared components, and page stubs"
```

---

### Task 5: 仪表盘页面

**Files:**
- Modify: `D:\Code\Learn-anything\app\src\pages\Dashboard.tsx`（替换占位文件）

- [ ] **Step 1: 创建 pages/Dashboard.tsx**

```tsx
import { useLearningStore } from '../store/useLearningStore';
import ProgressBar from '../components/ProgressBar';
import PhasePill from '../components/PhasePill';
import SessionCard from '../components/SessionCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { stats, loading, error, topicName } = useLearningStore();
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ color: 'var(--color-text-secondary)', padding: 32 }}>加载中...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--color-accent-red)', padding: 32 }}>加载失败: {error}</div>;
  }

  if (!stats) {
    return <div style={{ color: 'var(--color-text-tertiary)', padding: 32 }}>暂无学习数据，请先在终端运行 /learn:topic 创建主题</div>;
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
            {stats.topicName} 学习面板
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Phase pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {stats.phases.map(p => (
          <PhasePill
            key={p.name}
            name={p.name}
            progress={p.progress}
            isActive={p.progress > 0}
            onClick={() => navigate('/roadmap')}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <ProgressBar
          value={stats.overallProgress}
          showFraction={{ current: stats.masteredCount, total: stats.totalConcepts }}
          label={`${stats.topicName} 整体进度`}
        />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <StatCard label="已掌握" value={stats.masteredCount} color="var(--color-accent-green)" />
        <StatCard label="进行中" value={stats.inProgressCount} color="var(--color-accent-blue)" />
        <StatCard label="待练习" value={stats.needsPracticeCount} color="var(--color-accent-yellow)" />
        <StatCard label="未开始" value={stats.unexploredCount} color="var(--color-text-tertiary)" />
      </div>

      {/* Recommendations + Recent sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recommendations */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12, fontWeight: 600 }}>
            今日推荐
          </div>
          {stats.recommendations.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              暂无推荐，选择一个知识点开始学习
            </div>
          ) : (
            stats.recommendations.map((rec, i) => (
              <div
                key={i}
                onClick={() => navigate(rec.type === 'practice' ? '/practice' : '/chat')}
                style={{
                  padding: '10px 12px',
                  marginBottom: 8,
                  background: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${rec.type === 'practice' ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)'}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  [{rec.type === 'practice' ? '练习' : '学习'}] {rec.conceptName}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {rec.reason}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent sessions */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12, fontWeight: 600 }}>
            最近活动
          </div>
          {stats.recentSessions.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              暂无学习记录
            </div>
          ) : (
            stats.recentSessions.map(s => (
              <SessionCard key={s.filename} session={s} compact />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with stats, progress, recommendations"
```

---

### Task 6: 知识地图页面

**Files:**
- Modify: `D:\Code\Learn-anything\app\src\pages\KnowledgeMap.tsx`（替换占位文件）

- [ ] **Step 1: 创建 pages/KnowledgeMap.tsx**

```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearningStore } from '../store/useLearningStore';
import StatusBadge from '../components/StatusBadge';
import type { Concept } from '../types';

interface DomainGroup {
  name: string;
  concepts: Concept[];
}

export default function KnowledgeMap() {
  const { state, knowledgeMap, loading } = useLearningStore();
  const navigate = useNavigate();
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const domains = useMemo(() => {
    if (!state) return [];
    const map = new Map<string, Concept[]>();
    for (const concept of state.concepts) {
      const parts = concept.path.split('/');
      const domain = parts[0];
      const existing = map.get(domain) ?? [];
      existing.push(concept);
      map.set(domain, existing);
    }
    // Ensure all domains are expanded by default
    const names = Array.from(map.keys());
    if (expandedDomains.size === 0 && names.length > 0) {
      setExpandedDomains(new Set(names));
    }
    return Array.from(map.entries()).map(([name, concepts]) => ({ name, concepts }));
  }, [state, expandedDomains.size]);

  const toggleDomain = (name: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading || !state) {
    return <div style={{ color: 'var(--color-text-secondary)', padding: 32 }}>加载中...</div>;
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
          {state.topic} 知识地图
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 'var(--font-size-xs)' }}>
          <span style={{ color: 'var(--color-accent-green)' }}>已掌握</span>
          <span style={{ color: 'var(--color-accent-blue)' }}>进行中</span>
          <span style={{ color: 'var(--color-accent-yellow)' }}>待练习</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>未开始</span>
        </div>
      </div>

      {knowledgeMap && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          marginBottom: 24,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-serif)',
        }}>
          {knowledgeMap}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {domains.map(domain => (
          <div key={domain.name} style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div
              onClick={() => toggleDomain(domain.name)}
              style={{
                padding: '10px 16px',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                borderBottom: expandedDomains.has(domain.name) ? '1px solid var(--color-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                userSelect: 'none',
              }}
            >
              {domain.name}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {domain.concepts.filter(c => c.status === 'mastered').length}/{domain.concepts.length}
              </span>
            </div>
            {expandedDomains.has(domain.name) && (
              <div>
                {domain.concepts.map(c => {
                  const conceptName = c.path.split('/').pop()!;
                  return (
                    <div
                      key={c.path}
                      onClick={() => setSelectedConcept(selectedConcept?.path === c.path ? null : c)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: selectedConcept?.path === c.path ? 'var(--color-bg-page)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      {conceptName}
                      <StatusBadge status={c.status} confidence={c.confidence} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Concept action popup */}
      {selectedConcept && (
        <div style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px',
          display: 'flex',
          gap: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginRight: 8, alignSelf: 'center' }}>
            {selectedConcept.path.split('/').pop()}
          </div>
          <ActionButton label="去讲解" onClick={() => navigate('/chat')} />
          <ActionButton label="去练习" onClick={() => navigate('/practice')} />
          <ActionButton label="看历史" onClick={() => navigate('/history')} />
          <ActionButton label="关闭" onClick={() => setSelectedConcept(null)} secondary />
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, onClick, secondary }: { label: string; onClick: () => void; secondary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: secondary ? 'transparent' : 'var(--color-bg-blue)',
        color: secondary ? 'var(--color-text-secondary)' : 'var(--color-accent-blue)',
        border: secondary ? '1px solid var(--color-border)' : '1px solid var(--color-accent-blue)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-serif)',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/src/pages/KnowledgeMap.tsx
git commit -m "feat: add Knowledge Map page with domain grouping and concept actions"
```

---

### Task 7: 历史记录页面

**Files:**
- Modify: `D:\Code\Learn-anything\app\src\pages\History.tsx`（替换占位文件）

- [ ] **Step 1: 替换 pages/History.tsx 为完整实现**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import SessionCard from '../components/SessionCard';

export default function History() {
  const { sessions, loadSessions, loading } = useLearningStore();
  const [search, setSearch] = useState('');

  const handleSearch = useCallback(() => {
    loadSessions(search || undefined);
  }, [search, loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>学习历史</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索知识点..."
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-serif)',
              outline: 'none',
              width: 200,
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: 'var(--color-bg-blue)',
              color: 'var(--color-accent-blue)',
              border: '1px solid var(--color-accent-blue)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
            }}
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', padding: 32 }}>加载中...</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 32, textAlign: 'center' }}>
          暂无学习记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map(s => (
            <SessionCard key={s.filename} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/src/pages/History.tsx
git commit -m "feat: add History page with search and expandable session details"
```

---

### Task 8: AI 对话页面

**Files:**
- Create: `D:\Code\Learn-anything\app\src\components\ChatMessage.tsx`
- Modify: `D:\Code\Learn-anything\app\src\pages\Chat.tsx`（替换占位文件）

- [ ] **Step 1: 创建 components/ChatMessage.tsx**

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        marginBottom: 4,
        marginLeft: isUser ? 0 : 4,
        marginRight: isUser ? 4 : 0,
      }}>
        {isUser ? '你' : 'AI 教师'}
      </div>
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'var(--color-bg-blue)' : 'var(--color-bg-card)',
        border: `1px solid ${isUser ? '#1f2b3d' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-primary)',
        lineHeight: 1.8,
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const isBlock = className?.startsWith('language-');
              if (isBlock) {
                return (
                  <div style={{ position: 'relative', margin: '8px 0' }}>
                    <pre style={{
                      background: 'var(--color-bg-page)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      overflow: 'auto',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <code className={className} {...props}>{children}</code>
                    </pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children))}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-secondary)',
                        padding: '2px 8px',
                        fontSize: 'var(--font-size-xs)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-serif)',
                      }}
                    >
                      复制
                    </button>
                  </div>
                );
              }
              return (
                <code style={{
                  background: 'var(--color-bg-page)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-mono)',
                }} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 pages/Chat.tsx**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import ChatMessage from '../components/ChatMessage';
import * as deepseekApi from '../api/deepseek';
import type { ChatMessage as ChatMessageType, Concept } from '../types';

export default function Chat() {
  const { state, knowledgeMap, topicName, saveSession, updateConceptStatus } = useLearningStore();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedConceptPath, setSelectedConceptPath] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const concepts = state?.concepts ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const conceptName = selectedConceptPath
      ? selectedConceptPath.split('/').pop()!
      : '';

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const history = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { content } = await deepseekApi.chat(
        conceptName,
        text,
        history.slice(0, -1) // don't include the just-sent message as history
      );

      const aiMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Save session after AI response
      if (topicName && conceptName) {
        const sessionContent = finalMessages
          .map(m => `### ${m.role === 'user' ? '学生' : 'AI 教师'}\n\n${m.content}`)
          .join('\n\n---\n\n');
        await saveSession(conceptName, 'explain', sessionContent);
      }
    } catch (e) {
      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `错误: ${(e as Error).message}`,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, selectedConceptPath, messages, topicName, saveSession]);

  const handleStartExplain = async (concept: Concept) => {
    setSelectedConceptPath(concept.path);
    const conceptName = concept.path.split('/').pop()!;

    const systemMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'system',
      content: `开始学习: ${conceptName}`,
      timestamp: Date.now(),
    };

    setMessages([systemMsg]);
    setSending(true);

    try {
      const { content } = await deepseekApi.explain(
        conceptName,
        knowledgeMap ?? '',
        concept.status === 'unexplored' ? 'beginner' : 'intermediate',
        []
      );

      const aiMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      };

      const finalMessages = [systemMsg, aiMsg];
      setMessages(finalMessages);

      // Update status to in_progress
      if (concept.status === 'unexplored' && state) {
        await updateConceptStatus(concept.path, 'in_progress', 0.1);
      }
    } catch (e) {
      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `错误: ${(e as Error).message}`,
        timestamp: Date.now(),
      };
      setMessages([systemMsg, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleMarkMastered = async () => {
    if (!selectedConceptPath || !state) return;
    await updateConceptStatus(selectedConceptPath, 'mastered', 0.9);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'system',
      content: `已标记"${selectedConceptPath.split('/').pop()}"为已掌握`,
      timestamp: Date.now(),
    }]);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Concept selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexShrink: 0 }}>
        <select
          value={selectedConceptPath}
          onChange={e => setSelectedConceptPath(e.target.value)}
          style={{
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
            flex: 1,
          }}
        >
          <option value="">-- 选择知识点 --</option>
          {concepts.map(c => (
            <option key={c.path} value={c.path}>
              {c.path} ({c.status === 'mastered' ? '已掌握' : c.status === 'in_progress' ? '进行中' : '未开始'})
            </option>
          ))}
        </select>
        {selectedConceptPath && (
          <button onClick={handleMarkMastered} style={{
            background: 'var(--color-bg-green)',
            color: 'var(--color-accent-green)',
            border: '1px solid var(--color-accent-green)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            标记已掌握
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        marginBottom: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '40px 0' }}>
            {concepts.length === 0
              ? '暂无知识点，请先在终端创建学习主题'
              : '选择一个知识点，输入你的问题开始学习'}
          </div>
        ) : (
          messages.map(m => (
            <ChatMessage key={m.id} message={m} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={sending ? 'AI 正在回复...' : '输入你的问题...'}
          disabled={sending}
          style={{
            flex: 1,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: sending ? 'var(--color-bg-card)' : 'var(--color-bg-green)',
            color: sending ? 'var(--color-text-tertiary)' : 'var(--color-accent-green)',
            border: `1px solid ${sending ? 'var(--color-border)' : 'var(--color-accent-green)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 20px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add app/src/components/ChatMessage.tsx app/src/pages/Chat.tsx
git commit -m "feat: add AI Chat page with DeepSeek-powered Socratic teaching"
```

---

### Task 9: 练习页面

**Files:**
- Create: `D:\Code\Learn-anything\app\src\components\CodeEditor.tsx`
- Modify: `D:\Code\Learn-anything\app\src\pages\Practice.tsx`（替换占位文件）

- [ ] **Step 1: 创建 components/CodeEditor.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, readOnly }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        keymap.of([]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.editable.of(!readOnly),
      ],
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => view.destroy();
  }, []);

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (value !== currentContent) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return (
    <div ref={editorRef} style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      minHeight: 200,
    }} />
  );
}
```

- [ ] **Step 2: 创建 pages/Practice.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import CodeEditor from '../components/CodeEditor';
import * as deepseekApi from '../api/deepseek';
import * as filesApi from '../api/files';
import type { ExercisePrompt, AIReviewResult, Concept } from '../types';

export default function Practice() {
  const { state, knowledgeMap, topicName, saveSession, updateConceptStatus } = useLearningStore();
  const [selectedConceptPath, setSelectedConceptPath] = useState('');
  const [exercise, setExercise] = useState<ExercisePrompt | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [review, setReview] = useState<AIReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const concepts = state?.concepts ?? [];

  const handleGenerate = async () => {
    if (!selectedConceptPath) return;
    setLoading(true);
    setExercise(null);
    setReview(null);
    setOutput('');

    try {
      const concept = concepts.find(c => c.path === selectedConceptPath)!;
      const difficulty = concept.confidence < 0.3 ? 'beginner'
        : concept.confidence < 0.7 ? 'intermediate'
        : 'challenge';

      const ex = await deepseekApi.generateExercise(
        selectedConceptPath.split('/').pop()!,
        difficulty,
        knowledgeMap ?? ''
      );
      setExercise(ex);
      setCode(ex.starterCode);
    } catch (e) {
      setOutput(`生成题目失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    setOutput('运行中...');
    setReview(null);
    try {
      const result = await filesApi.executePython(code);
      if (result.timedOut) {
        setOutput('执行超时 (5秒)');
      } else if (result.exitCode !== 0) {
        setOutput(`错误 (退出码 ${result.exitCode}):\n${result.stderr || result.stdout}`);
      } else {
        setOutput(result.stdout || '(无输出)');
      }
    } catch (e) {
      setOutput(`运行失败: ${(e as Error).message}`);
    }
  };

  const handleReview = async () => {
    if (!exercise || !selectedConceptPath) return;
    setLoading(true);
    try {
      const result = await deepseekApi.reviewCode(
        selectedConceptPath.split('/').pop()!,
        code,
        exercise.goal
      );
      setReview(result);
    } catch (e) {
      setOutput(`AI 审阅失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!topicName || !selectedConceptPath || !review || !exercise) return;
    const conceptName = selectedConceptPath.split('/').pop()!;
    const sessionContent = [
      `## 练习题目\n\n${exercise.goal}\n\n${exercise.background}`,
      `## 提交代码\n\n\`\`\`python\n${code}\n\`\`\``,
      `## 运行输出\n\n\`\`\`\n${output}\n\`\`\``,
      `## AI 反馈\n\n**肯定:** ${review.acknowledgment}\n\n**追问:** ${review.socraticFollowUp}\n\n**边界情况:** ${review.edgeCases.join(', ')}\n\n**建议:** ${review.codeQualityTip}\n\n**评估:** ${review.assessment}`,
    ].join('\n\n');

    await saveSession(conceptName, 'practice', sessionContent);

    const newStatus = review.assessment === 'excellent' ? 'mastered' : 'needs_practice';
    const newConfidence = Math.min(1, (concepts.find(c => c.path === selectedConceptPath)?.confidence ?? 0) + review.confidenceChange);
    await updateConceptStatus(selectedConceptPath, newStatus, newConfidence);

    setOutput(prev => prev + '\n\n[已保存练习记录]');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 20 }}>在线练习</div>

      {/* Topic selector + Generate */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={selectedConceptPath}
          onChange={e => setSelectedConceptPath(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
          }}
        >
          <option value="">-- 选择要练习的知识点 --</option>
          {concepts.map(c => (
            <option key={c.path} value={c.path}>
              {c.path} (练习{c.practice_count}次 / 信心{Math.round(c.confidence * 100)}%)
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={!selectedConceptPath || loading}
          style={{
            background: loading ? 'var(--color-bg-card)' : 'var(--color-bg-blue)',
            color: loading ? 'var(--color-text-tertiary)' : 'var(--color-accent-blue)',
            border: `1px solid ${loading ? 'var(--color-border)' : 'var(--color-accent-blue)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '8px 20px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          AI 出题
        </button>
      </div>

      {/* Exercise description */}
      {exercise && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-yellow)', marginBottom: 8, fontWeight: 600 }}>
            目标: {exercise.goal}
          </div>
          {exercise.background && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              {exercise.background}
            </div>
          )}
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>要求:</div>
            {exercise.requirements.map((r, i) => (
              <div key={i} style={{ marginBottom: 2 }}>{i + 1}. {r}</div>
            ))}
          </div>
          <div
            onClick={() => setShowHints(!showHints)}
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-blue)', cursor: 'pointer' }}
          >
            {showHints ? '隐藏提示' : '显示提示'}
          </div>
          {showHints && (
            <div style={{ marginTop: 8 }}>
              {exercise.hints.map((h, i) => (
                <div key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                  提示 {i + 1}: {h}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code editor */}
      <div style={{ marginBottom: 12 }}>
        <CodeEditor value={code} onChange={setCode} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={handleRun} disabled={!code} style={actionBtnStyle}>
          运行测试
        </button>
        <button onClick={handleReview} disabled={!code || !exercise || loading} style={actionBtnStyle}>
          AI 审阅
        </button>
        {review && (
          <button onClick={handleSubmit} style={{
            ...actionBtnStyle,
            background: 'var(--color-bg-green)',
            color: 'var(--color-accent-green)',
            borderColor: 'var(--color-accent-green)',
          }}>
            提交并保存
          </button>
        )}
      </div>

      {/* Output */}
      {output && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 12,
          marginBottom: 12,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'pre-wrap',
        }}>
          {output}
        </div>
      )}

      {/* Review result */}
      {review && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-green)', marginBottom: 8 }}>
            {review.acknowledgment}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-blue)', marginBottom: 8 }}>
            {review.socraticFollowUp}
          </div>
          {review.edgeCases.length > 0 && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              边界情况: {review.edgeCases.join(' / ')}
            </div>
          )}
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            {review.codeQualityTip}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            评估: {review.assessment === 'excellent' ? '优秀' : review.assessment === 'good' ? '良好' : '需改进'}
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 20px',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-serif)',
  cursor: 'pointer',
};
```

- [ ] **Step 3: 提交**

```bash
git add app/src/components/CodeEditor.tsx app/src/pages/Practice.tsx
git commit -m "feat: add Practice page with CodeMirror editor and AI review"
```

---

### Task 10: 路线图与设置页面

**Files:**
- Modify: `D:\Code\Learn-anything\app\src\pages\Roadmap.tsx`（替换占位文件）
- Modify: `D:\Code\Learn-anything\app\src\pages\Settings.tsx`（替换占位文件）

- [ ] **Step 1: 创建 pages/Roadmap.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import * as filesApi from '../api/files';
import * as deepseekApi from '../api/deepseek';
import ReactMarkdown from 'react-markdown';

export default function Roadmap() {
  const { state, stats, topicName } = useLearningStore();
  const [planContent, setPlanContent] = useState<string>('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [adjustingPlan, setAdjustingPlan] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  useEffect(() => {
    if (!topicName) return;
    setLoadingPlan(true);
    filesApi.fetchPlan(topicName)
      .then(setPlanContent)
      .catch(() => setPlanContent(''))
      .finally(() => setLoadingPlan(false));
  }, [topicName]);

  const handleAdjustPlan = async () => {
    if (!state || !topicName) return;
    setAdjustingPlan(true);
    try {
      const currentPlan = await filesApi.fetchPlan(topicName);
      const { content } = await deepseekApi.adjustPlan(
        currentPlan,
        JSON.stringify(state, null, 2)
      );
      setPlanContent(content);
    } catch (e) {
      // keep current plan
    } finally {
      setAdjustingPlan(false);
    }
  };

  if (!stats) {
    return <div style={{ color: 'var(--color-text-secondary)', padding: 32 }}>加载中...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>学习路线图</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            预计 14-21 周 / 每日 1 个知识点
          </div>
        </div>
        <button
          onClick={handleAdjustPlan}
          disabled={adjustingPlan}
          style={{
            background: adjustingPlan ? 'var(--color-bg-card)' : 'var(--color-bg-blue)',
            color: adjustingPlan ? 'var(--color-text-tertiary)' : 'var(--color-accent-blue)',
            border: `1px solid ${adjustingPlan ? 'var(--color-border)' : 'var(--color-accent-blue)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '6px 16px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: adjustingPlan ? 'not-allowed' : 'pointer',
          }}
        >
          AI 调整路线
        </button>
      </div>

      {/* Phase overview */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {stats.phases.map((phase, i) => (
          <div
            key={phase.name}
            onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
            style={{
              flex: 1,
              minWidth: 120,
              background: expandedPhase === i ? 'var(--color-bg-blue)' : 'var(--color-bg-card)',
              border: `1px solid ${expandedPhase === i ? 'var(--color-accent-blue)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 8 }}>
              阶段 {i + 1}: {phase.name}
            </div>
            <ProgressBar value={phase.progress} height={4} />
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
              {phase.masteredCount}/{phase.topicCount} 已掌握
            </div>
          </div>
        ))}
      </div>

      {/* Phase detail */}
      {expandedPhase !== null && state && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            阶段 {expandedPhase + 1} 知识点列表
          </div>
          {state.concepts
            .filter(c => {
              const phaseName = stats.phases[expandedPhase]?.name;
              return c.path.startsWith(phaseName + '/') || c.path.startsWith(phaseName);
            })
            .map(c => (
              <div key={c.path} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
              }}>
                {c.path.split('/').pop()}
                <StatusBadge status={c.status} confidence={c.confidence} />
              </div>
            ))}
        </div>
      )}

      {/* Plan markdown */}
      {loadingPlan ? (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 20 }}>加载计划中...</div>
      ) : planContent ? (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.8,
        }}>
          <ReactMarkdown>{planContent}</ReactMarkdown>
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 20, textAlign: 'center' }}>
          暂无学习计划文件
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 pages/Settings.tsx**

```tsx
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { checkLatestVersion, type GitHubRelease } from '../api/github';

export default function Settings() {
  const { deepseekApiKey, dataDir, fontSize, setApiKey, setDataDir, setFontSize, saveSettings } = useSettingsStore();
  const [localApiKey, setLocalApiKey] = useState(deepseekApiKey);
  const [localDataDir, setLocalDataDir] = useState(dataDir);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [saved, setSaved] = useState(false);
  const [versionInfo, setVersionInfo] = useState<GitHubRelease | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);

  const handleSave = () => {
    setApiKey(localApiKey);
    setDataDir(localDataDir);
    setFontSize(localFontSize);
    saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheckUpdate = async () => {
    setCheckingVersion(true);
    const release = await checkLatestVersion();
    setVersionInfo(release);
    setCheckingVersion(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 24 }}>设置</div>

      {/* API Key */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={sectionLabelStyle}>DeepSeek API Key</div>
        <input
          type="password"
          value={localApiKey}
          onChange={e => setLocalApiKey(e.target.value)}
          placeholder="sk-..."
          style={inputStyle}
        />
      </div>

      {/* Data directory */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={sectionLabelStyle}>数据目录</div>
        <input
          type="text"
          value={localDataDir}
          onChange={e => setLocalDataDir(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Font size */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={sectionLabelStyle}>字体大小: {localFontSize}px</div>
        <input
          type="range"
          min={10}
          max={20}
          value={localFontSize}
          onChange={e => setLocalFontSize(Number(e.target.value))}
          style={{ width: '100%', marginTop: 8 }}
        />
      </div>

      {/* Save button */}
      <button onClick={handleSave} style={{
        width: '100%',
        background: saved ? 'var(--color-bg-green)' : 'var(--color-bg-blue)',
        color: saved ? 'var(--color-accent-green)' : 'var(--color-accent-blue)',
        border: `1px solid ${saved ? 'var(--color-accent-green)' : 'var(--color-accent-blue)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 0',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-serif)',
        cursor: 'pointer',
        marginBottom: 24,
      }}>
        {saved ? '已保存' : '保存设置'}
      </button>

      {/* Version & sync */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
      }}>
        <div style={sectionLabelStyle}>版本与同步</div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          当前版本: v0.1.0 (learn-anything v0.3.0)
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleCheckUpdate}
            disabled={checkingVersion}
            style={{
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 16px',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-serif)',
              cursor: checkingVersion ? 'not-allowed' : 'pointer',
            }}
          >
            {checkingVersion ? '检查中...' : '检查更新'}
          </button>
          <button style={{
            background: 'var(--color-bg-blue)',
            color: 'var(--color-accent-blue)',
            border: '1px solid var(--color-accent-blue)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 16px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}>
            同步 GitHub
          </button>
        </div>

        {versionInfo && (
          <div style={{ marginTop: 12, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            最新版本: {versionInfo.tag_name} (发布于 {versionInfo.published_at})
          </div>
        )}
      </div>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-page)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};
```

- [ ] **Step 3: 提交**

```bash
git add app/src/pages/Roadmap.tsx app/src/pages/Settings.tsx
git commit -m "feat: add Roadmap and Settings pages"
```

---

### Task 11: 启动验证与最终提交

- [ ] **Step 1: 确保所有页面有占位导出（创建缺失的页面文件）**

检查 `app/src/pages/` 下是否有所有 7 个页面文件：Dashboard.tsx, KnowledgeMap.tsx, History.tsx, Chat.tsx, Practice.tsx, Roadmap.tsx, Settings.tsx。如果有缺失，创建占位文件：

```tsx
export default function PageName() {
  return <div style={{ padding: 32, color: 'var(--color-text-secondary)' }}>PageName</div>;
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd D:\Code\Learn-anything\app && npm install
```

- [ ] **Step 3: 启动开发服务器**

```bash
cd D:\Code\Learn-anything\app && npm run dev
```

- [ ] **Step 4: 验证页面导航**

在浏览器 http://localhost:5173 验证:
- 导航栏显示 7 个标签
- 点击每个标签能切换到对应页面
- 深色主题正确渲染
- 思源宋体字体加载正常

- [ ] **Step 5: 最终提交**

```bash
git add app/
git commit -m "feat: complete Learn-Anything visual learning panel v0.1.0"
```

---

## 自检清单

1. **规格覆盖**: 7 个页面全部覆盖，API 端点全部实现，数据模型与规格一致
2. **无占位符**: 所有步骤包含具体代码，无 TBD/TODO
3. **类型一致性**: Concept.path 格式统一为 "Domain/Concept"，状态值沿用规格定义
