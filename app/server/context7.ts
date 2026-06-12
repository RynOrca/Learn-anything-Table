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

// Note: Context7 is typically accessed via MCP in Claude Code sessions.
// For standalone Express servers, we use direct HTTP to the Context7 API.
// If Context7 doesn't expose a public REST API, this service falls back
// gracefully (degraded = true).

const CONTEXT7_API_BASE = 'https://api.context7.com/v1';

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

  private async resolveLibrary(libraryName: string, query: string): Promise<string | null> {
    const url = `${CONTEXT7_API_BASE}/resolve-library`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ libraryName, query }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as {
        libraries?: Array<{ id?: string; libraryId?: string; score?: number }>;
      };

      const libs = data.libraries ?? [];
      if (libs.length === 0) return null;

      // Pick the best match
      const best = libs[0];
      return best.id ?? best.libraryId ?? null;
    } catch {
      return null;
    }
  }

  private async queryDocs(libraryId: string, query: string): Promise<DocSnippet[]> {
    const url = `${CONTEXT7_API_BASE}/query-docs`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ libraryId, query }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!res.ok) return [];

      const data = (await res.json()) as {
        snippets?: Array<{
          content?: string;
          sourceUrl?: string;
          source?: string;
          title?: string;
        }>;
      };

      return (data.snippets ?? []).map(s => ({
        content: s.content ?? '',
        sourceUrl: s.sourceUrl ?? s.source ?? '',
        title: s.title ?? '',
      }));
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
