// ---------------------------------------------------------------------------
// Learn-Anything standalone Express API server
//
// Replaces the Vite plugin API from src/server/main.ts.
// Run: npx tsx server/index.ts
// ---------------------------------------------------------------------------

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { config } from 'dotenv';

// __dirname — works in CJS (esbuild compiled) and ESM (tsx dev)
// In CJS: __dirname is a module built-in
// In ESM: __dirname is undefined (ReferenceError in strict mode), fallback to import.meta.url
const __dirname: string = (() => {
  try { return __dirname; } catch { /* not in CJS */ }
  return path.dirname(fileURLToPath(import.meta.url));
})();

// Load .env from app/ directory
config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';

import {
  listTopics,
  createTopic,
  deleteTopic,
  getKnowledgeMap,
  getState,
  updateState,
  getSessions,
  getSessionDetail,
  createSession,
  deleteSessionFile,
  getPlan,
  updatePlan,
  getDataRoot,
  invalidateTopicCache,
} from './files.js';
import { initSkillManager, getSkillManager } from './skills.js';
import { getContext7Service } from './context7.js';
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
} from './deepseek.js';
import { executePython } from './execute.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.API_PORT || '17345', 10);
const distPath = path.resolve(__dirname, '..', 'dist');

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Helper: extract API key from Authorization header
// ---------------------------------------------------------------------------

function getApiKey(req: express.Request): string {
  const header = req.headers['authorization'];
  if (!header) return '';
  const authStr = Array.isArray(header) ? header[0] : header;
  return (authStr || '').replace(/^Bearer\s+/i, '');
}

// ---------------------------------------------------------------------------
// File-based topic routes
// ---------------------------------------------------------------------------

// GET /api/topics
app.get('/api/topics', (_req, res) => {
  const topics = listTopics();
  res.json({ topics });
});

// POST /api/topics
app.post('/api/topics', (req, res) => {
  const body = req.body as { topicName?: string; planContent?: string; knowledgeMapContent?: string };
  if (!body.topicName || typeof body.topicName !== 'string') {
    res.status(400).json({ error: 'topicName is required' });
    return;
  }
  const result = createTopic(body.topicName, {
    planContent: body.planContent,
    knowledgeMapContent: body.knowledgeMapContent,
  });
  res.status(201).json(result);
});

// DELETE /api/topics/:name
app.delete('/api/topics/:name', (req, res) => {
  const topicName = decodeURIComponent(req.params.name);
  const deleted = deleteTopic(topicName);
  if (!deleted) {
    res.status(404).json({ error: `Topic "${topicName}" not found or cannot be deleted` });
    return;
  }
  res.json({ deleted: true });
});

// GET /api/topics/:name/knowledge-map
app.get('/api/topics/:name/knowledge-map', (req, res) => {
  const km = getKnowledgeMap(req.params.name);
  if (km === null) {
    res.status(404).json({ error: `Topic "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: km });
});

// GET /api/topics/:name/state
app.get('/api/topics/:name/state', (req, res) => {
  const state = getState(req.params.name);
  if (state === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(state);
});

// PUT /api/topics/:name/state
app.put('/api/topics/:name/state', (req, res) => {
  const body = req.body as {
    currentState: Record<string, unknown>;
    conceptPath: string;
    newStatus: string;
    newConfidence: number;
  };
  const currentState = body.currentState as {
    topic: string;
    created: string;
    concepts: Array<{
      path: string;
      status: string;
      last_practiced: string | null;
      practice_count: number;
      confidence: number;
    }>;
  };
  const newState = updateState(
    req.params.name,
    currentState,
    body.conceptPath,
    body.newStatus,
    body.newConfidence,
  );
  if (newState === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(newState);
});

// GET /api/topics/:name/sessions
app.get('/api/topics/:name/sessions', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const sessions = getSessions(req.params.name, search);
  res.json({ topicName: req.params.name, sessions });
});

// POST /api/topics/:name/sessions
app.post('/api/topics/:name/sessions', (req, res) => {
  const body = req.body as {
    conceptName: string;
    type: string;
    content: string;
  };
  const filename = createSession(
    req.params.name,
    body.conceptName,
    body.type,
    body.content,
  );
  res.status(201).json({ filename });
});

// GET /api/topics/:name/sessions/:file
app.get('/api/topics/:name/sessions/:file', (req, res) => {
  const detail = getSessionDetail(req.params.name, req.params.file);
  if (detail === null) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ filename: req.params.file, content: detail });
});

// DELETE /api/topics/:name/sessions/:file
app.delete('/api/topics/:name/sessions/:file', (req, res) => {
  const deleted = deleteSessionFile(req.params.name, req.params.file);
  if (!deleted) {
    res.status(404).json({ error: 'Session not found or cannot be deleted' });
    return;
  }
  res.json({ deleted: true });
});

// GET /api/topics/:name/plan
app.get('/api/topics/:name/plan', (req, res) => {
  const plan = getPlan(req.params.name);
  if (plan === null) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: plan });
});

// PUT /api/topics/:name/plan
app.put('/api/topics/:name/plan', (req, res) => {
  const body = req.body as { content: string };
  const ok = updatePlan(req.params.name, body.content);
  if (!ok) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ updated: true });
});

// ---------------------------------------------------------------------------
// Code execution
// ---------------------------------------------------------------------------

// POST /api/execute
app.post('/api/execute', (req, res) => {
  const body = req.body as { code: string };
  const result = executePython(body.code);
  res.json(result);
});

// ---------------------------------------------------------------------------
// AI routes (require Authorization: Bearer <apiKey>)
// ---------------------------------------------------------------------------

// POST /api/ai/explain
app.post('/api/ai/explain', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    conceptName: string;
    knowledgeMap: string;
    userLevel: string;
    history: Array<{ role: string; content: string }>;
  };
  try {
    const content = await explain(
      apiKey,
      body.conceptName,
      body.knowledgeMap,
      body.userLevel,
      body.history ?? [],
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] explain error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/chat
app.post('/api/ai/chat', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    conceptName: string;
    message: string;
    history: Array<{ role: string; content: string }>;
  };
  try {
    const content = await chat(
      apiKey,
      body.conceptName,
      body.message,
      body.history ?? [],
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] chat error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/exercise
app.post('/api/ai/exercise', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    conceptName: string;
    difficulty: string;
    knowledgeMap: string;
  };
  try {
    const content = await generateExercise(
      apiKey,
      body.conceptName,
      body.difficulty,
      body.knowledgeMap,
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] exercise error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/review
app.post('/api/ai/review', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    conceptName: string;
    userCode: string;
    exerciseGoal: string;
  };
  try {
    const content = await reviewCode(
      apiKey,
      body.conceptName,
      body.userCode,
      body.exerciseGoal,
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] review error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/recommend
app.post('/api/ai/recommend', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    topicState: string;
    sessions: string;
  };
  try {
    const content = await recommend(
      apiKey,
      body.topicState,
      body.sessions ?? '',
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] recommend error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/knowledge-map
app.post('/api/ai/knowledge-map', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as { topicName: string };
  try {
    const content = await generateKnowledgeMap(apiKey, body.topicName);
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] knowledge-map error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/learning-plan
app.post('/api/ai/learning-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as { topicName: string };
  if (!body.topicName || typeof body.topicName !== 'string') {
    res.status(400).json({ error: 'topicName is required' });
    return;
  }
  try {
    const content = await generateLearningPlan(apiKey, body.topicName);
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] learning-plan error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/polish-plan
app.post('/api/ai/polish-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as { currentPlan: string };
  try {
    const content = await polishPlan(apiKey, body.currentPlan);
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] polish-plan error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/plan-from-file
app.post('/api/ai/plan-from-file', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as { topicName: string; fileContent: string };
  try {
    const content = await planFromFile(apiKey, body.topicName, body.fileContent);
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] plan-from-file error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/adjust-plan
app.post('/api/ai/adjust-plan', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  const body = req.body as {
    currentPlan: string;
    currentState: string;
  };
  try {
    const content = await adjustPlan(
      apiKey,
      body.currentPlan,
      body.currentState,
    );
    res.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api] adjust-plan error:', message);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Validation & config routes
// ---------------------------------------------------------------------------

// POST /api/validate-key — lightweight DeepSeek API key check
app.post('/api/validate-key', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key in Authorization header' });
    return;
  }
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      res.status(response.status).json({ valid: false, error: errText });
      return;
    }
    res.json({ valid: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    res.status(500).json({ valid: false, error: message });
  }
});

// GET /api/config/data-dir — return current data directory
app.get('/api/config/data-dir', (_req, res) => {
  res.json({ dataDir: getDataRoot() });
});

// POST /api/config/data-dir — update data directory
app.post('/api/config/data-dir', (req, res) => {
  const body = req.body as { dataDir: string };
  if (!body.dataDir || typeof body.dataDir !== 'string') {
    res.status(400).json({ error: 'dataDir (string) is required' });
    return;
  }

  const normalized = path.resolve(body.dataDir);

  // Validate that the directory exists
  if (!fs.existsSync(normalized)) {
    res.status(400).json({ error: `Directory does not exist: ${normalized}` });
    return;
  }

  // Set env var for current process
  process.env.LEARN_ANYTHING_DATA_DIR = normalized;

  // Invalidate topic cache so next request picks up the new data root
  invalidateTopicCache();

  // Persist to userData/config.json if running inside Electron (production)
  const configDir = process.env.LEARN_ANYTHING_CONFIG_DIR;
  if (configDir) {
    try {
      const configPath = path.join(configDir, 'config.json');
      let cfg: Record<string, unknown> = {};
      if (fs.existsSync(configPath)) {
        cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      cfg['dataDir'] = normalized;
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
      console.error('[config] Failed to write config.json:', err);
    }
  }

  // Also try to persist to .env file (for dev mode)
  const envPath = path.resolve(__dirname, '..', '.env');
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    const lines = envContent.split('\n');
    const key = 'LEARN_ANYTHING_DATA_DIR';
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith(`${key}=`) || trimmed.startsWith(`# ${key}=`)) {
        lines[i] = `${key}=${normalized}`;
        found = true;
        break;
      }
    }
    if (!found) {
      if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
        lines.push('');
      }
      lines.push(`${key}=${normalized}`);
    }
    // Remove trailing empty entries
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
  } catch (err) {
    // Non-fatal in production — config.json is the primary persistence
    console.error('[config] Failed to write .env:', err);
  }

  res.json({ success: true, dataDir: normalized });
});

// POST /api/save-env — write/update key in .env file
app.post('/api/save-env', (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string' || value === undefined || typeof value !== 'string') {
    res.status(400).json({ error: 'key and value (strings) are required' });
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
      if (lines[i].trimStart().startsWith(key + '=')) {
        lines[i] = key + '=' + value;
        found = true;
        break;
      }
    }
    if (!found) {
      // Remove trailing empty line before appending
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
      lines.push(key + '=' + value);
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    console.error('[save-env] Failed to write .env:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to write .env' });
  }
});

// GET /api/config/scan-topics — scan data root for potential topic directories
app.get('/api/config/scan-topics', (_req, res) => {
  const dataRoot = getDataRoot();
  const topics: string[] = [];

  if (!fs.existsSync(dataRoot)) {
    res.json({ topics });
    return;
  }

  const skipDirs = new Set(['app', 'docs', 'node_modules', '.git', '.claude', '.superpowers']);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dataRoot, { withFileTypes: true });
  } catch {
    res.json({ topics });
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;

    const learnTopicsPath = path.join(dataRoot, entry.name, '.learn', 'topics');
    if (fs.existsSync(learnTopicsPath)) {
      topics.push(entry.name);
    }
  }

  res.json({ topics });
});

// ---------------------------------------------------------------------------
// Skills management routes
// ---------------------------------------------------------------------------

// GET /api/skills — list all loaded skills + status
app.get('/api/skills', (_req, res) => {
  const mgr = getSkillManager();
  res.json({
    skills: mgr.list(),
    count: mgr.count,
    hasSkillsOnDisk: mgr.hasSkillsOnDisk(),
    needsSync: !mgr.hasSkillsOnDisk(),
  });
});

// GET /api/skills/:name — get full skill content
app.get('/api/skills/:name', (req, res) => {
  const mgr = getSkillManager();
  const skill = mgr.get(req.params.name);
  if (!skill) {
    res.status(404).json({ error: `Skill "${req.params.name}" not found` });
    return;
  }
  res.json({
    name: skill.frontmatter.name,
    displayName: skill.frontmatter.displayName,
    version: skill.frontmatter.version,
    source: skill.frontmatter.source,
    updatedAt: skill.frontmatter.updatedAt,
    prompt: skill.prompt,
  });
});

// POST /api/skills/reload — force reload all skills from disk
app.post('/api/skills/reload', (_req, res) => {
  const mgr = getSkillManager();
  const count = mgr.reloadFromDisk();
  res.json({ reloaded: true, count });
});

// ---------------------------------------------------------------------------
// Context7 routes
// ---------------------------------------------------------------------------

// POST /api/context7/validate-key — validate Context7 API key
app.post('/api/context7/validate-key', async (req, res) => {
  const body = req.body as { apiKey?: string };
  if (!body.apiKey) {
    res.status(400).json({ valid: false, error: 'apiKey is required' });
    return;
  }
  const ctx7 = getContext7Service();
  ctx7.updateConfig({ apiKey: body.apiKey, enabled: true });
  try {
    // Quick test: resolve "react" library
    const result = await ctx7.fetchContext('react', 'hello world');
    res.json({ valid: result.resolved, error: result.degradationReason });
  } catch {
    res.json({ valid: false, error: '无法连接到 Context7 服务' });
  }
});

// GET /api/context7/cache-stats — get cache stats
app.get('/api/context7/cache-stats', (_req, res) => {
  const ctx7 = getContext7Service();
  const stats = ctx7.getCacheStats();
  res.json(stats);
});

// POST /api/context7/clear-cache — clear the cache
app.post('/api/context7/clear-cache', (_req, res) => {
  const ctx7 = getContext7Service();
  ctx7.clearCache();
  res.json({ cleared: true });
});

// ---------------------------------------------------------------------------
// Static files & SPA fallback (production Electron)
// ---------------------------------------------------------------------------

// Serve static files from ../dist
app.use(express.static(distPath));

// SPA fallback: serve index.html for non-API GET requests
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'index.html not found — did you run `npm run build`?' });
  }
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Export for programmatic use
// ---------------------------------------------------------------------------

export { app };

/**
 * Start the Express server. Returns a Promise that resolves when listening.
 * Used by Electron main process to know exactly when the server is ready.
 */
export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, async () => {
      const skillMgr = await initSkillManager();
      console.log(`[learn-anything] API server running at http://localhost:${PORT}`);
      console.log(`[learn-anything] Data root: ${getDataRoot()}`);
      console.log(`[learn-anything] Skills on disk: ${skillMgr.count}, needs sync: ${!skillMgr.hasSkillsOnDisk()}`);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Auto-start when called directly (tsx dev / standalone)
// ---------------------------------------------------------------------------

// Detect if this module is the entry point (works in both ESM and CJS)
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('index.ts') ||
  process.argv[1].endsWith('index.cjs') ||
  process.argv[1].endsWith('index.js')
);
if (isMainModule) {
  startServer();
}
