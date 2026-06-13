// ---------------------------------------------------------------------------
// Frontend API client — skills + Context7
// ---------------------------------------------------------------------------

// Types

export interface SkillSummary {
  name: string;
  displayName: string;
  version: string;
  source: string;
  updatedAt: string;
}

export interface SkillDetail {
  name: string;
  displayName: string;
  version: string;
  source: string;
  updatedAt: string;
  prompt: string;
}

// Helpers

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// Skills API

export interface SkillsStatus {
  skills: SkillSummary[];
  builtins: SkillSummary[];
  count: number;
  hasSkillsOnDisk: boolean;
  needsSync: boolean;
}

export async function fetchSkills(): Promise<SkillsStatus> {
  return getJSON<SkillsStatus>('/api/skills');
}

export async function getSkill(name: string): Promise<SkillDetail> {
  return getJSON<SkillDetail>(`/api/skills/${encodeURIComponent(name)}`);
}

export async function reloadSkills(): Promise<number> {
  const data = await postJSON<{ reloaded: boolean; count: number }>('/api/skills/reload');
  return data.count;
}

// Context7 API

export async function validateContext7Key(apiKey: string): Promise<{ valid: boolean; reachable?: boolean; error?: string }> {
  return postJSON<{ valid: boolean; reachable?: boolean; error?: string }>('/api/context7/validate-key', { apiKey });
}

export async function clearContext7Cache(): Promise<void> {
  await postJSON('/api/context7/clear-cache');
}
