import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Process runs from app/ directory when using Vite dev server.
// DATA_ROOT is the project root (D:\Code\Learn-anything).
const DATA_ROOT = path.resolve(process.cwd(), '..');

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function topicsDir(): string {
  return path.join(DATA_ROOT, '.learn', 'topics');
}

function topicDir(topicName: string): string {
  return path.join(topicsDir(), topicName);
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
  const dir = topicsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
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
  // Look for plan files in the topic's project directory.
  // The convention is that a topic lives in a directory whose name
  // matches the topic name somewhere under DATA_ROOT.
  // For example, DATA_ROOT/Python/python-learning-plan.md
  const candidates = []; // No need for explicit candidates — scan topic-named dirs

  // Strategy: read the .learn/topics/<topic>/state.yaml to find the topic root,
  // but here we scan the filesystem. Since topics are stored alongside their
  // project dirs, we look for directories matching the topic name under DATA_ROOT
  // that contain *plan*.md files.

  // First, check if topicDir exists
  const td = topicDir(topicName);
  if (!fs.existsSync(td)) {
    return null;
  }

  // The project root for the topic is typically DATA_ROOT/<TopicName>/
  // Walk through DATA_ROOT looking for matching directories
  try {
    const rootEntries = fs.readdirSync(DATA_ROOT, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(DATA_ROOT, entry.name);
      try {
        const dirFiles = fs.readdirSync(dirPath);
        for (const f of dirFiles) {
          const lower = f.toLowerCase();
          if (
            lower.includes('plan') &&
            f.endsWith('.md') &&
            // Match topic: the directory name should contain the topic name (case-insensitive)
            entry.name.toLowerCase().includes(topicName.toLowerCase())
          ) {
            return fs.readFileSync(path.join(dirPath, f), 'utf-8');
          }
        }
      } catch {
        // Skip directories we cannot read
      }
    }
  } catch {
    // Fallback
  }

  return null;
}
