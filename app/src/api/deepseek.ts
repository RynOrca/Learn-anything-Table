// ---------------------------------------------------------------------------
// DeepSeek AI API client
// ---------------------------------------------------------------------------

function getApiKey(): string {
  try {
    const stored = localStorage.getItem('learn-anything-settings');
    if (stored) {
      const parsed = JSON.parse(stored) as { deepseekApiKey?: string };
      return parsed.deepseekApiKey ?? '';
    }
  } catch {
    // ignore
  }
  return '';
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getApiKey()}`,
  };
}

async function postAI<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`AI API 请求失败 (${res.status}): ${errText}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function explain(
  conceptName: string,
  knowledgeMap: string,
  userLevel: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/explain', {
    conceptName,
    knowledgeMap,
    userLevel,
    history,
  });
  return data.content;
}

export async function chat(
  conceptName: string,
  message: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/chat', {
    conceptName,
    message,
    history,
  });
  return data.content;
}

export async function generateExercise(
  conceptName: string,
  difficulty: string,
  knowledgeMap: string,
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/exercise', {
    conceptName,
    difficulty,
    knowledgeMap,
  });
  return data.content;
}

export async function reviewCode(
  conceptName: string,
  userCode: string,
  exerciseGoal: string,
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/review', {
    conceptName,
    userCode,
    exerciseGoal,
  });
  return data.content;
}

export async function recommend(
  topicState: string,
  sessions: string,
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/recommend', {
    topicState,
    sessions,
  });
  return data.content;
}

export async function generateKnowledgeMap(topicName: string): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/knowledge-map', {
    topicName,
  });
  return data.content;
}

export async function adjustPlan(
  currentPlan: string,
  currentState: string,
): Promise<string> {
  const data = await postAI<{ content: string }>('/api/ai/adjust-plan', {
    currentPlan,
    currentState,
  });
  return data.content;
}
