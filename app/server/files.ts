import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Process runs from app/ directory when using Vite dev server.
// DATA_ROOT is the project root — configurable via LEARN_ANYTHING_DATA_DIR env var.
export function getDataRoot(): string {
  return process.env.LEARN_ANYTHING_DATA_DIR || path.resolve(process.cwd(), '..');
}

// ---------------------------------------------------------------------------
// Topic discovery
//
// Actual directory layout (topics are self-contained folders at DATA_ROOT):
//
//   DATA_ROOT/
//     Python/                          ← topic root folder
//       .learn/topics/python/          ← topic data
//         state.yaml
//         knowledge-map.md
//         sessions/*.md
//       python-learning-plan.md        ← plan file at topic root
//       progress.md
// ---------------------------------------------------------------------------

interface TopicLocation {
  name: string;     // original-case topic name (matches state.yaml)
  dataDir: string;  // path to .learn/topics/<name>/
  rootDir: string;  // path to the topic root folder (e.g., DATA_ROOT/Python/)
}

let _topicCache: TopicLocation[] | null = null;

function discoverTopics(): TopicLocation[] {
  if (_topicCache) return _topicCache;

  const result: TopicLocation[] = [];
  if (!fs.existsSync(getDataRoot())) return result;

  let rootEntries: fs.Dirent[];
  try {
    rootEntries = fs.readdirSync(getDataRoot(), { withFileTypes: true });
  } catch {
    _topicCache = result;
    return result;
  }

  // Skip directories that are not topic folders
  const skipDirs = new Set(['app', 'docs', 'node_modules', '.git', '.claude', '.superpowers']);

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;

    const innerTopics = path.join(getDataRoot(), entry.name, '.learn', 'topics');
    if (!fs.existsSync(innerTopics)) continue;

    let topicDirs: fs.Dirent[];
    try {
      topicDirs = fs.readdirSync(innerTopics, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const topic of topicDirs) {
      if (!topic.isDirectory()) continue;
      result.push({
        name: topic.name,
        dataDir: path.join(innerTopics, topic.name),
        rootDir: path.join(getDataRoot(), entry.name),
      });
    }
  }

  _topicCache = result;
  return result;
}

function locateTopic(topicName: string): TopicLocation | null {
  const lower = topicName.toLowerCase();
  return discoverTopics().find((t) => t.name.toLowerCase() === lower) ?? null;
}

// Invalidate cache (useful after creating new topics)
export function invalidateTopicCache(): void {
  _topicCache = null;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function topicsDir(): string {
  // Fallback — topics are discovered via discoverTopics(), but this
  // provides a default path for cases where a topic hasn't been created yet.
  return path.join(getDataRoot(), '.learn', 'topics');
}

function topicDir(topicName: string): string {
  return locateTopic(topicName)?.dataDir ?? path.join(topicsDir(), topicName);
}

function sessionsDir(topicName: string): string {
  return path.join(topicDir(topicName), 'sessions');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConceptState {
  path: string;
  status: 'unexplored' | 'in_progress' | 'completed' | 'stuck';
  last_practiced: string | null;
  practice_count: number;
  confidence: number;
}

export interface TopicState {
  topic: string;
  created: string;
  concepts: ConceptState[];
}

export interface KnowledgeMapNode {
  category: string;
  concepts: string[];
}

// ---------------------------------------------------------------------------
// listTopics
// ---------------------------------------------------------------------------

export function listTopics(): string[] {
  return discoverTopics().map((t) => t.name);
}

// ---------------------------------------------------------------------------
// getKnowledgeMap
// ---------------------------------------------------------------------------

export function getKnowledgeMap(topicName: string): string | null {
  const filePath = path.join(topicDir(topicName), 'knowledge-map.md');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// getState
// ---------------------------------------------------------------------------

export function getState(topicName: string): TopicState | null {
  const filePath = path.join(topicDir(topicName), 'state.yaml');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as TopicState;
}

// ---------------------------------------------------------------------------
// updateState
// ---------------------------------------------------------------------------

export function updateState(
  topicName: string,
  currentState: TopicState,
  conceptPath: string,
  newStatus: string,
  newConfidence: number,
): TopicState | null {
  const filePath = path.join(topicDir(topicName), 'state.yaml');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const concepts = currentState.concepts.map((c) => {
    if (c.path === conceptPath) {
      return {
        ...c,
        status: newStatus as ConceptState['status'],
        confidence: newConfidence,
        last_practiced: new Date().toISOString().split('T')[0],
        practice_count:
          newStatus === 'in_progress' || newStatus === 'completed'
            ? c.practice_count + 1
            : c.practice_count,
      };
    }
    return c;
  });

  const newState: TopicState = {
    ...currentState,
    concepts,
  };

  // Write human-readable YAML
  const yamlContent = yaml.dump(newState, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.writeFileSync(filePath, yamlContent, 'utf-8');
  return newState;
}

// ---------------------------------------------------------------------------
// getSessions
// ---------------------------------------------------------------------------

export interface SessionMeta {
  filename: string;
  conceptName: string;
  date: string;
  type: string;
}

export function getSessions(
  topicName: string,
  search?: string,
): SessionMeta[] {
  const dir = sessionsDir(topicName);
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse();

  const sessions: SessionMeta[] = files.map((filename) => {
    // Filename pattern: "概念名-YYYY-MM-DD.md" or "概念名-type-YYYY-MM-DD.md"
    const namePart = filename.replace(/\.md$/, '');
    const parts = namePart.split('-');

    // Last two parts are typically date and optional type
    let date = '';
    let concept = '';
    let type = 'explain';

    // Try to find date at the end (YYYY-MM-DD)
    const dateMatch = namePart.match(/(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      date = dateMatch[1];
      const rest = namePart.slice(0, -(dateMatch[1].length + 1)); // remove date and trailing -
      // Check if last part looks like a type
      const lastSegment = rest.split('-').pop();
      if (
        lastSegment &&
        ['explain', 'practice', 'review', 'chat'].includes(lastSegment)
      ) {
        type = lastSegment;
        concept = rest.slice(0, -(lastSegment.length + 1));
      } else {
        concept = rest;
      }
    } else {
      concept = namePart;
    }

    return {
      filename,
      conceptName: concept || namePart,
      date,
      type,
    };
  });

  if (search) {
    const lower = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.conceptName.toLowerCase().includes(lower) ||
        s.type.toLowerCase().includes(lower) ||
        (s.date && s.date.includes(lower)),
    );
  }

  return sessions;
}

// ---------------------------------------------------------------------------
// getSessionDetail
// ---------------------------------------------------------------------------

export function getSessionDetail(
  topicName: string,
  filename: string,
): string | null {
  const filePath = path.join(sessionsDir(topicName), filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ---------------------------------------------------------------------------
// deleteSessionFile
// ---------------------------------------------------------------------------

export function deleteSessionFile(
  topicName: string,
  filename: string,
): boolean {
  const filePath = path.join(sessionsDir(topicName), filename);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  // Safety: ensure the filename doesn't contain path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
}

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

export function createSession(
  topicName: string,
  conceptName: string,
  type: string,
  content: string,
): string {
  const dir = sessionsDir(topicName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const safeConcept = conceptName.replace(/[/\\?%*:|"<>]/g, '-');
  const filename = `${safeConcept}-${type}-${date}.md`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, content, 'utf-8');
  return filename;
}

// ---------------------------------------------------------------------------
// getPlan
// ---------------------------------------------------------------------------

export function getPlan(topicName: string): string | null {
  const loc = locateTopic(topicName);
  if (!loc) return null;

  // Plan files live in the topic root directory (e.g., Python/python-learning-plan.md)
  try {
    const dirFiles = fs.readdirSync(loc.rootDir);
    for (const f of dirFiles) {
      const lower = f.toLowerCase();
      if (lower.includes('plan') && f.endsWith('.md')) {
        return fs.readFileSync(path.join(loc.rootDir, f), 'utf-8');
      }
    }
  } catch {
    // Directory unreadable
  }

  return null;
}

// ---------------------------------------------------------------------------
// updatePlan — overwrite plan file and update state.yaml concepts
// ---------------------------------------------------------------------------

export function updatePlan(topicName: string, planMd: string): boolean {
  const loc = locateTopic(topicName);
  if (!loc) return false;

  // Find and overwrite the plan file
  let planFile: string | null = null;
  try {
    const dirFiles = fs.readdirSync(loc.rootDir);
    for (const f of dirFiles) {
      const lower = f.toLowerCase();
      if (lower.includes('plan') && f.endsWith('.md')) {
        planFile = f;
        break;
      }
    }
  } catch {
    return false;
  }

  if (!planFile) return false;

  // Write the plan file
  fs.writeFileSync(path.join(loc.rootDir, planFile), planMd, 'utf-8');

  // Update state.yaml concepts from the new plan
  const statePath = path.join(loc.dataDir, 'state.yaml');
  if (fs.existsSync(statePath)) {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = yaml.load(raw) as TopicState;

    // Parse new concepts from the plan
    const newConcepts = parsePlanToConcepts(planMd);

    // Merge: keep existing concept data (status, confidence, etc.) for matching paths
    const existingMap = new Map<string, ConceptState>();
    for (const c of state.concepts) {
      existingMap.set(c.path, c);
    }

    state.concepts = newConcepts.map((nc) => {
      const existing = existingMap.get(nc.path);
      if (existing) {
        return existing; // Preserve existing status/confidence
      }
      return nc; // New concept
    });

    const yamlContent = yaml.dump(state, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    fs.writeFileSync(statePath, yamlContent, 'utf-8');
  }

  return true;
}

// ---------------------------------------------------------------------------
// parsePlanToConcepts — extract concept paths from plan Markdown
// ---------------------------------------------------------------------------

function parsePlanToConcepts(md: string): Array<{
  path: string;
  status: string;
  last_practiced: string | null;
  practice_count: number;
  confidence: number;
}> {
  const concepts: Array<{
    path: string;
    status: string;
    last_practiced: string | null;
    practice_count: number;
    confidence: number;
  }> = [];
  const lines = md.split('\n');
  let currentStage = '';

  for (const line of lines) {
    // ## 阶段N：名称
    const stageMatch = line.match(/^##\s*阶段\s*[^\s：:]+[：:]\s*(.+)/);
    if (stageMatch) {
      currentStage = stageMatch[1].trim();
      continue;
    }

    if (!currentStage) continue;

    // ### N.M 概念名
    const conceptMatch = line.match(/^###\s+\d+\.\d+\.?\s*(.+)/);
    if (conceptMatch) {
      concepts.push({
        path: `${currentStage}/${conceptMatch[1].trim()}`,
        status: 'unexplored',
        last_practiced: null,
        practice_count: 0,
        confidence: 0,
      });
    }
  }

  return concepts;
}

// ---------------------------------------------------------------------------
// createTopic
// ---------------------------------------------------------------------------

export function createTopic(
  topicName: string,
  options?: { planContent?: string; knowledgeMapContent?: string },
): { success: true; path: string } {
  const safeName = topicName.replace(/[/\\?%*:|"<>]/g, '-').toLowerCase();
  const rootDir = path.join(getDataRoot(), safeName.charAt(0).toUpperCase() + safeName.slice(1));
  const dataDir = path.join(rootDir, '.learn', 'topics', safeName);
  const sessionsDir = path.join(dataDir, 'sessions');
  const today = new Date().toISOString().split('T')[0];

  // Create directories
  fs.mkdirSync(sessionsDir, { recursive: true });

  // Create state.yaml — parse concepts from plan if available
  const parsedConcepts = options?.planContent
    ? parsePlanToConcepts(options.planContent)
    : [];

  const initialState = {
    topic: safeName,
    created: today,
    concepts: parsedConcepts,
  };

  fs.writeFileSync(
    path.join(dataDir, 'state.yaml'),
    yaml.dump(initialState, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }),
    'utf-8',
  );

  // Create knowledge-map.md
  const kmContent = options?.knowledgeMapContent
    || `# ${topicName} 知识地图\n\n> 创建于 ${today}\n\n## 基础知识\n\n_使用 AI 生成知识地图，或手动编辑此文件_\n`;
  fs.writeFileSync(path.join(dataDir, 'knowledge-map.md'), kmContent, 'utf-8');

  // Create plan file
  const planContent = options?.planContent
    || `# ${topicName} 学习计划\n\n> 创建于 ${today}\n\n## 阶段一：基础入门\n\n_使用 AI 调整路线，或手动编辑此文件_\n`;
  fs.writeFileSync(path.join(rootDir, `${safeName}-learning-plan.md`), planContent, 'utf-8');

  // Create progress.md
  fs.writeFileSync(path.join(rootDir, 'progress.md'), `# ${topicName} 学习进度\n\n`, 'utf-8');

  invalidateTopicCache();
  return { success: true, path: dataDir };
}

// ---------------------------------------------------------------------------
// deleteTopic
// ---------------------------------------------------------------------------

export function deleteTopic(topicName: string): boolean {
  const loc = locateTopic(topicName);
  if (!loc) return false;

  // Safety: ensure we're deleting inside DATA_ROOT and the path looks valid
  const rootDir = loc.rootDir;
  if (!rootDir.startsWith(getDataRoot()) || rootDir === getDataRoot()) return false;

  try {
    fs.rmSync(rootDir, { recursive: true, force: true });
    invalidateTopicCache();
    return true;
  } catch {
    return false;
  }
}
