import type { TopicState, Concept, SessionMeta, SessionDetail, DashboardStats, ConceptStatus } from '../types';

// ---------------------------------------------------------------------------
// Helpers: snake_case <-> camelCase mapping
// ---------------------------------------------------------------------------

interface ServerConcept {
  path: string;
  status: string;
  last_practiced: string | null;
  practice_count: number;
  confidence: number;
}

interface ServerTopicState {
  topic: string;
  created: string;
  concepts: ServerConcept[];
}

function serverStatusToFrontend(s: string): ConceptStatus {
  switch (s) {
    case 'completed':  return 'mastered';
    case 'stuck':      return 'needs_practice';
    case 'in_progress': return 'in_progress';
    default:           return 'unexplored';
  }
}

function frontendStatusToServer(s: ConceptStatus): string {
  switch (s) {
    case 'mastered':        return 'completed';
    case 'needs_practice':  return 'stuck';
    case 'in_progress':     return 'in_progress';
    default:                return 'unexplored';
  }
}

function mapConcept(c: ServerConcept): Concept {
  return {
    path: c.path,
    status: serverStatusToFrontend(c.status),
    lastPracticed: c.last_practiced,
    practiceCount: c.practice_count,
    confidence: c.confidence,
  };
}

function mapTopicState(raw: ServerTopicState): TopicState {
  return {
    topic: raw.topic,
    created: raw.created,
    concepts: raw.concepts.map(mapConcept),
  };
}

function topicStateToServer(state: TopicState): ServerTopicState {
  return {
    topic: state.topic,
    created: state.created,
    concepts: state.concepts.map((c) => ({
      path: c.path,
      status: frontendStatusToServer(c.status),
      last_practiced: c.lastPracticed,
      practice_count: c.practiceCount,
      confidence: c.confidence,
    })),
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchTopics(): Promise<string[]> {
  const res = await fetch('/api/topics');
  if (!res.ok) throw new Error(`获取主题列表失败 (${res.status})`);
  const data = (await res.json()) as { topics: string[] };
  return data.topics ?? [];
}

export async function createTopic(topicName: string): Promise<void> {
  const res = await fetch('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error: string };
    throw new Error(data.error ?? `创建主题失败 (${res.status})`);
  }
}

export async function createTopicWithPlan(
  topicName: string,
  planContent: string,
  knowledgeMapContent: string,
): Promise<void> {
  const res = await fetch('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, planContent, knowledgeMapContent }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error: string };
    throw new Error(data.error ?? `创建主题失败 (${res.status})`);
  }
}

export async function fetchKnowledgeMap(topicName: string): Promise<string> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/knowledge-map`);
  if (!res.ok) throw new Error(`获取知识地图失败 (${res.status})`);
  const data = (await res.json()) as { content: string };
  return data.content ?? '';
}

export async function fetchState(topicName: string): Promise<TopicState> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/state`);
  if (!res.ok) throw new Error(`获取学习状态失败 (${res.status})`);
  const raw = (await res.json()) as ServerTopicState;
  return mapTopicState(raw);
}

export async function updateState(
  topicName: string,
  currentState: TopicState,
  conceptPath: string,
  newStatus: ConceptStatus,
  newConfidence: number,
): Promise<TopicState> {
  const body = {
    currentState: topicStateToServer(currentState),
    conceptPath,
    newStatus: frontendStatusToServer(newStatus),
    newConfidence,
  };
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`更新学习状态失败 (${res.status})`);
  const raw = (await res.json()) as ServerTopicState;
  return mapTopicState(raw);
}

interface ServerSessionMeta {
  filename: string;
  conceptName: string;
  date: string;
  type: string;
}

export async function fetchSessions(topicName: string, search?: string): Promise<SessionMeta[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/sessions${params}`);
  if (!res.ok) throw new Error(`获取会话列表失败 (${res.status})`);
  const data = (await res.json()) as { sessions: ServerSessionMeta[] };
  return (data.sessions ?? []).map((s) => ({
    filename: s.filename,
    conceptName: s.conceptName,
    type: s.type as 'explain' | 'practice',
    date: s.date,
    summary: `${s.type === 'practice' ? '练习' : '讲解'}: ${s.conceptName}`,
  }));
}

export async function fetchSessionDetail(topicName: string, filename: string): Promise<SessionDetail> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/sessions/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`获取会话详情失败 (${res.status})`);
  const data = (await res.json()) as { filename: string; content: string };

  // Parse conceptName, type, date from filename: "概念名-type-YYYY-MM-DD.md" or "概念名-YYYY-MM-DD.md"
  const namePart = filename.replace(/\.md$/, '');
  let conceptName = namePart;
  let type: 'explain' | 'practice' = 'explain';
  let date = '';
  const dateMatch = namePart.match(/(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    date = dateMatch[1];
    const rest = namePart.slice(0, -(dateMatch[1].length + 1));
    const lastSegment = rest.split('-').pop();
    if (lastSegment && ['explain', 'practice', 'review', 'chat'].includes(lastSegment)) {
      type = lastSegment === 'practice' ? 'practice' : 'explain';
      conceptName = rest.slice(0, -(lastSegment.length + 1));
    } else {
      conceptName = rest;
    }
  }

  return { filename: data.filename, conceptName, type, date, content: data.content };
}

export async function createSession(
  topicName: string,
  conceptName: string,
  type: string,
  content: string,
): Promise<string> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conceptName, type, content }),
  });
  if (!res.ok) throw new Error(`创建会话失败 (${res.status})`);
  const data = (await res.json()) as { filename: string };
  return data.filename;
}

export async function deleteSession(
  topicName: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/sessions/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`删除会话失败 (${res.status})`);
}

export async function deleteTopic(topicName: string): Promise<void> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error: string };
    throw new Error(data.error ?? `删除主题失败 (${res.status})`);
  }
}

export async function fetchPlan(topicName: string): Promise<string> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/plan`);
  if (!res.ok) throw new Error(`获取学习计划失败 (${res.status})`);
  const data = (await res.json()) as { content: string };
  return data.content ?? '';
}

export async function updatePlan(topicName: string, content: string): Promise<void> {
  const res = await fetch(`/api/topics/${encodeURIComponent(topicName)}/plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error: string };
    throw new Error(data.error ?? `更新计划失败 (${res.status})`);
  }
}

export async function executePython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const res = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json()) as { stdout: string; stderr: string; exitCode: number; timedOut: boolean };
  return data;
}

export function computeStats(state: TopicState, sessions: SessionMeta[]): DashboardStats {
  const concepts = state.concepts ?? [];
  const totalConcepts = concepts.length;
  let masteredCount = 0;
  let inProgressCount = 0;
  let needsPracticeCount = 0;
  let unexploredCount = 0;

  for (const c of concepts) {
    switch (c.status) {
      case 'mastered':        masteredCount++; break;
      case 'in_progress':     inProgressCount++; break;
      case 'needs_practice':  needsPracticeCount++; break;
      default:                unexploredCount++; break;
    }
  }

  const overallProgress = totalConcepts > 0
    ? Math.round(((masteredCount + inProgressCount * 0.5) / totalConcepts) * 100)
    : 0;

  // Build phases: group concepts by the first segment of their path
  const phaseMap = new Map<string, { concepts: Concept[] }>();
  for (const c of concepts) {
    const phaseName = c.path.split('.')[0] || '其他';
    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, { concepts: [] });
    }
    phaseMap.get(phaseName)!.concepts.push(c);
  }

  const phases = Array.from(phaseMap.entries()).map(([name, group], index) => {
    const total = group.concepts.length;
    const mastered = group.concepts.filter((c) => c.status === 'mastered').length;
    const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { name, index, topicCount: total, masteredCount: mastered, progress };
  });

  // Simple recommendations based on state
  const recommendations: DashboardStats['recommendations'] = [];
  const unexplored = concepts.filter((c) => c.status === 'unexplored');
  if (unexplored.length > 0) {
    recommendations.push({ type: 'learn', conceptName: unexplored[0].path, reason: '开始探索新概念' });
  }
  const needsPractice = concepts.filter((c) => c.status === 'needs_practice');
  if (needsPractice.length > 0) {
    recommendations.push({ type: 'practice', conceptName: needsPractice[0].path, reason: '需要巩固练习' });
  }

  const recentSessions = sessions.slice(0, 5);

  return {
    topicName: state.topic,
    totalConcepts,
    masteredCount,
    inProgressCount,
    needsPracticeCount,
    unexploredCount,
    overallProgress,
    phases,
    recommendations,
    recentSessions,
  };
}
