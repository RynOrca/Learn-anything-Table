// ---------------------------------------------------------------------------
// Context7Service — real-time documentation lookup via Context7 API
//
// Context7 provides up-to-date documentation snippets from official sources.
// This service wraps the two-step API: resolve library → query docs.
//
// Graceful degradation: if Context7 is not configured, unreachable, or
// returns no results, the caller falls back to AI-only responses with
// uncertainty annotations.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Context7Config {
  apiKey: string;
  enabled: boolean;
  maxResults: number;
  timeoutMs: number;
}

export interface DocSnippet {
  content: string;
  sourceUrl: string;
  title: string;
}

export interface Context7QueryResult {
  resolved: boolean;
  libraryName?: string;
  libraryId?: string;
  snippets: DocSnippet[];
  error?: string;
  degraded: boolean;
  degradationReason?: string;
}

interface CacheEntry {
  result: Context7QueryResult;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Context7Service
// ---------------------------------------------------------------------------

// Context7 public REST API (extracted from @upstash/context7-mcp@3.2.0 source)
// Base: https://context7.com/api/v2
// Endpoints: GET /libs/search (resolve library), GET /context (query docs)
// Auth: Bearer token + X-Context7-Source header

const CONTEXT7_API_BASE = 'https://context7.com/api';
const CONTEXT7_SERVER_VERSION = '3.2.0';

export class Context7Service {
  private config: Context7Config;
  private cache = new Map<string, CacheEntry>();
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config: Partial<Context7Config> = {}) {
    this.config = {
      apiKey: config.apiKey ?? '',
      enabled: config.enabled ?? false,
      maxResults: config.maxResults ?? 3,
      timeoutMs: config.timeoutMs ?? 5000,
    };
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  isEnabled(): boolean {
    return this.config.enabled && this.config.apiKey.length > 0;
  }

  updateConfig(partial: Partial<Context7Config>): void {
    this.config = { ...this.config, ...partial };
  }

  // -----------------------------------------------------------------------
  // Core API
  // -----------------------------------------------------------------------

  /**
   * Full workflow: resolve library → query docs → format result.
   * Returns Context7QueryResult with degraded flag for graceful fallback.
   */
  async fetchContext(libraryName: string, query: string): Promise<Context7QueryResult> {
    if (!this.isEnabled()) {
      return {
        resolved: false,
        snippets: [],
        degraded: true,
        degradationReason: 'Context7 未配置或未启用',
      };
    }

    // Check cache
    const cacheKey = `${libraryName.toLowerCase()}:${query.toLowerCase().replace(/[^\w一-鿿]+/g, ' ').trim()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      // Step 1: Resolve library
      const libraryId = await this.resolveLibrary(libraryName, query);
      if (!libraryId) {
        const result: Context7QueryResult = {
          resolved: false,
          snippets: [],
          degraded: true,
          degradationReason: `未在 Context7 中找到库 "${libraryName}"`,
        };
        this.cache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Step 2: Query docs
      const snippets = await this.queryDocs(libraryId, query);
      if (snippets.length === 0) {
        const result: Context7QueryResult = {
          resolved: true,
          libraryName,
          libraryId,
          snippets: [],
          degraded: true,
          degradationReason: `未找到与 "${query}" 相关的文档`,
        };
        this.cache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      const result: Context7QueryResult = {
        resolved: true,
        libraryName,
        libraryId,
        snippets: snippets.slice(0, this.config.maxResults),
        degraded: false,
      };
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (err) {
      const result: Context7QueryResult = {
        resolved: false,
        snippets: [],
        degraded: true,
        degradationReason: `Context7 服务不可用: ${err instanceof Error ? err.message : '未知错误'}`,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      return result;
    }
  }

  /**
   * Build context augmentation text from query result.
   * Returns formatted string to inject into the system prompt, plus metadata.
   */
  buildContextAugmentation(result: Context7QueryResult): {
    contextText: string;
    verifiedSources: string[];
  } {
    if (result.degraded || result.snippets.length === 0) {
      return { contextText: '', verifiedSources: [] };
    }

    const parts = result.snippets.map((s, i) =>
      `[📋 官方文档 ${i + 1}] ${s.title}\n来源: ${s.sourceUrl}\n\`\`\`\n${s.content}\n\`\`\``,
    );
    return {
      contextText: parts.join('\n\n'),
      verifiedSources: result.snippets.map(s => s.sourceUrl),
    };
  }

  // -----------------------------------------------------------------------
  // API Key validation (with detailed diagnostics)
  // -----------------------------------------------------------------------

  async validateApiKey(): Promise<{ valid: boolean; reachable: boolean; error?: string }> {
    // Step 1: Test API reachability without auth
    let reachable = false;
    try {
      const testUrl = new URL(`${CONTEXT7_API_BASE}/v2/libs/search`);
      testUrl.searchParams.set('query', 'test');
      testUrl.searchParams.set('libraryName', 'react');
      const res = await fetch(testUrl.toString(), {
        method: 'GET',
        headers: { 'X-Context7-Source': 'learn-anything' },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      reachable = res.ok;
      console.log(`[Context7] Reachability check: ${res.status} (ok=${res.ok})`);
    } catch (err) {
      console.error(`[Context7] Reachability check failed:`, (err as Error).message);
      return { valid: false, reachable: false, error: `Context7 API 不可达: ${(err as Error).message}` };
    }

    if (!reachable) {
      return { valid: false, reachable: false, error: 'Context7 API 不可达（服务器返回错误）' };
    }

    // Step 2: Test with the actual API key
    try {
      const testUrl = new URL(`${CONTEXT7_API_BASE}/v2/libs/search`);
      testUrl.searchParams.set('query', 'test');
      testUrl.searchParams.set('libraryName', 'react');
      const res = await fetch(testUrl.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      console.log(`[Context7] Auth check: ${res.status} (ok=${res.ok})`);

      if (res.ok) {
        return { valid: true, reachable: true };
      }

      if (res.status === 401) {
        let msg = 'API Key 无效（服务器返回 401）';
        try {
          const body = await res.json();
          if (body.message) msg = body.message;
        } catch {}
        return { valid: false, reachable: true, error: msg };
      }

      if (res.status === 429) {
        return { valid: false, reachable: true, error: '请求过于频繁，请稍后重试' };
      }

      return { valid: false, reachable: true, error: `服务器返回状态码 ${res.status}` };
    } catch (err) {
      console.error(`[Context7] Auth check failed:`, (err as Error).message);
      return { valid: false, reachable: true, error: `验证请求失败: ${(err as Error).message}` };
    }
  }

  // -----------------------------------------------------------------------
  // Cache management
  // -----------------------------------------------------------------------

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries: Array<{ key: string; age: number }> = [];
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      entries.push({ key, age: Math.round((now - entry.timestamp) / 1000) });
    }
    return { size: this.cache.size, entries };
  }

  // -----------------------------------------------------------------------
  // Private: API calls
  // -----------------------------------------------------------------------

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Context7-Source': 'learn-anything',
      'X-Context7-Server-Version': CONTEXT7_SERVER_VERSION,
    };
  }

  private async resolveLibrary(libraryName: string, query: string): Promise<string | null> {
    const url = new URL(`${CONTEXT7_API_BASE}/v2/libs/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('libraryName', libraryName);
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as {
        results?: Array<{ libraryId?: string; name?: string; description?: string }>;
      };

      const results = data.results ?? [];
      if (results.length === 0) return null;

      // Pick the best match
      const best = results[0];
      return best.libraryId ?? null;
    } catch {
      return null;
    }
  }

  private async queryDocs(libraryId: string, query: string): Promise<DocSnippet[]> {
    const url = new URL(`${CONTEXT7_API_BASE}/v2/context`);
    url.searchParams.set('query', query);
    url.searchParams.set('libraryId', libraryId);
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!res.ok) return [];

      const text = await res.text();
      if (!text || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        return [];
      }

      // The API returns raw documentation text (not structured snippets)
      return [{
        content: text.slice(0, 8000),
        sourceUrl: `https://context7.com/library/${libraryId}`,
        title: libraryId,
      }];
    } catch {
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _context7Instance: Context7Service | null = null;

export function getContext7Service(): Context7Service {
  if (!_context7Instance) {
    _context7Instance = new Context7Service();
  }
  return _context7Instance;
}
