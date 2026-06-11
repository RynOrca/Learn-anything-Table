import type { Plugin, ViteDevServer } from 'vite';
import {
  listTopics,
  getKnowledgeMap,
  getState,
  updateState,
  getSessions,
  getSessionDetail,
  createSession,
  getPlan,
} from './files';
import {
  explain,
  chat,
  generateExercise,
  reviewCode,
  recommend,
  generateKnowledgeMap,
  adjustPlan,
} from './deepseek';
import { executePython } from './execute';

// ---------------------------------------------------------------------------
// Helper: extract API key from Authorization header
// ---------------------------------------------------------------------------

function getApiKey(
  req: { headers: Record<string, string | string[] | undefined> },
): string {
  const header = req.headers['authorization'];
  if (!header) return '';
  const authStr = Array.isArray(header) ? header[0] : header;
  return (authStr || '').replace(/^Bearer\s+/i, '');
}

// ---------------------------------------------------------------------------
// Helper: read JSON body from request
// ---------------------------------------------------------------------------

function readBody(req: { on: (e: string, cb: (chunk: Buffer) => void) => void }): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: send JSON response
// ---------------------------------------------------------------------------

function json(
  res: {
    setHeader: (n: string, v: string) => void;
    statusCode: number;
    end: (data: string) => void;
  },
  statusCode: number,
  data: unknown,
) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Helper: simple route matching
// ---------------------------------------------------------------------------

function matchRoute(url: string, pattern: string): Record<string, string> | null {
  const urlParts = url.split('/').filter(Boolean);
  const patParts = pattern.split('/').filter(Boolean);

  if (urlParts.length !== patParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function learningApiPlugin(): Plugin {
  return {
    name: 'learn-anything-api',
    configureServer(server: ViteDevServer) {
      const { middlewares } = server;

      // The Vite dev server uses Connect-compatible middleware.
      middlewares.use(async (req, res, next) => {
        // req is an IncomingMessage with .url, .method, .headers
        const url = req.url ?? '';
        const method = req.method ?? 'GET';

        // Strip query string for route matching
        const pathname = url.split('?')[0];

        // Parse query params
        const queryStr = url.includes('?') ? url.split('?')[1] : '';
        const queryParams = new URLSearchParams(queryStr);

        try {
          // -----------------------------------------------------------------
          // GET /api/topics
          // -----------------------------------------------------------------
          if (method === 'GET' && pathname === '/api/topics') {
            const topics = listTopics();
            return json(res, 200, { topics });
          }

          // -----------------------------------------------------------------
          // GET /api/topics/:name/knowledge-map
          // -----------------------------------------------------------------
          let params = matchRoute(pathname, '/api/topics/:name/knowledge-map');
          if (params && method === 'GET') {
            const km = getKnowledgeMap(params.name);
            if (km === null) {
              return json(res, 404, { error: `Topic "${params.name}" not found` });
            }
            return json(res, 200, { topicName: params.name, content: km });
          }

          // -----------------------------------------------------------------
          // GET /api/topics/:name/state
          // -----------------------------------------------------------------
          params = matchRoute(pathname, '/api/topics/:name/state');
          if (params && method === 'GET') {
            const state = getState(params.name);
            if (state === null) {
              return json(res, 404, { error: `State for "${params.name}" not found` });
            }
            return json(res, 200, state);
          }

          // -----------------------------------------------------------------
          // PUT /api/topics/:name/state
          // -----------------------------------------------------------------
          if (params && method === 'PUT') {
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
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
              params.name,
              currentState,
              body.conceptPath,
              body.newStatus,
              body.newConfidence,
            );
            if (newState === null) {
              return json(res, 404, { error: `State for "${params.name}" not found` });
            }
            return json(res, 200, newState);
          }

          // -----------------------------------------------------------------
          // GET /api/topics/:name/sessions/:file
          // -----------------------------------------------------------------
          params = matchRoute(pathname, '/api/topics/:name/sessions/:file');
          if (params && method === 'GET') {
            const detail = getSessionDetail(params.name, params.file);
            if (detail === null) {
              return json(res, 404, { error: 'Session not found' });
            }
            return json(res, 200, { filename: params.file, content: detail });
          }

          // -----------------------------------------------------------------
          // GET /api/topics/:name/sessions
          // -----------------------------------------------------------------
          params = matchRoute(pathname, '/api/topics/:name/sessions');
          if (params && method === 'GET') {
            const search = queryParams.get('search') ?? undefined;
            const sessions = getSessions(params.name, search);
            return json(res, 200, { topicName: params.name, sessions });
          }

          // -----------------------------------------------------------------
          // POST /api/topics/:name/sessions
          // -----------------------------------------------------------------
          if (params && method === 'POST') {
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              conceptName: string;
              type: string;
              content: string;
            };
            const filename = createSession(
              params.name,
              body.conceptName,
              body.type,
              body.content,
            );
            return json(res, 201, { filename });
          }

          // -----------------------------------------------------------------
          // GET /api/topics/:name/plan
          // -----------------------------------------------------------------
          params = matchRoute(pathname, '/api/topics/:name/plan');
          if (params && method === 'GET') {
            const plan = getPlan(params.name);
            if (plan === null) {
              return json(res, 404, { error: `Plan for "${params.name}" not found` });
            }
            return json(res, 200, { topicName: params.name, content: plan });
          }

          // -----------------------------------------------------------------
          // POST /api/execute
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/execute') {
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as { code: string };
            const result = executePython(body.code);
            return json(res, result.exitCode === 0 ? 200 : 200, result);
          }

          // -----------------------------------------------------------------
          // POST /api/ai/explain
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/explain') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              conceptName: string;
              knowledgeMap: string;
              userLevel: string;
              history: Array<{ role: string; content: string }>;
            };
            const content = await explain(
              apiKey,
              body.conceptName,
              body.knowledgeMap,
              body.userLevel,
              body.history ?? [],
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/chat
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/chat') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              conceptName: string;
              message: string;
              history: Array<{ role: string; content: string }>;
            };
            const content = await chat(
              apiKey,
              body.conceptName,
              body.message,
              body.history ?? [],
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/exercise
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/exercise') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              conceptName: string;
              difficulty: string;
              knowledgeMap: string;
            };
            const content = await generateExercise(
              apiKey,
              body.conceptName,
              body.difficulty,
              body.knowledgeMap,
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/review
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/review') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              conceptName: string;
              userCode: string;
              exerciseGoal: string;
            };
            const content = await reviewCode(
              apiKey,
              body.conceptName,
              body.userCode,
              body.exerciseGoal,
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/recommend
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/recommend') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              topicState: string;
              sessions: string;
            };
            const content = await recommend(
              apiKey,
              body.topicState,
              body.sessions ?? '',
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/knowledge-map
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/knowledge-map') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as { topicName: string };
            const content = await generateKnowledgeMap(apiKey, body.topicName);
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // POST /api/ai/adjust-plan
          // -----------------------------------------------------------------
          if (method === 'POST' && pathname === '/api/ai/adjust-plan') {
            const apiKey = getApiKey(req);
            if (!apiKey) {
              return json(res, 401, { error: 'Missing API key in Authorization header' });
            }
            const bodyRaw = await readBody(req);
            const body = JSON.parse(bodyRaw) as {
              currentPlan: string;
              currentState: string;
            };
            const content = await adjustPlan(
              apiKey,
              body.currentPlan,
              body.currentState,
            );
            return json(res, 200, { content });
          }

          // -----------------------------------------------------------------
          // No route matched — continue to next middleware
          // -----------------------------------------------------------------
          next();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Internal server error';
          console.error('[learn-anything-api]', message);
          json(res, 500, { error: message });
        }
      });
    },
  };
}
