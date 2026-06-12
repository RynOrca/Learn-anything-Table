"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/index.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_node_url = require("node:url");
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_dotenv = require("dotenv");
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/files.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_js_yaml = __toESM(require("js-yaml"), 1);
function getDataRoot() {
  return process.env.LEARN_ANYTHING_DATA_DIR || import_node_path.default.resolve(process.cwd(), "..");
}
var _topicCache = null;
function discoverTopics() {
  if (_topicCache) return _topicCache;
  const result = [];
  if (!import_node_fs.default.existsSync(getDataRoot())) return result;
  let rootEntries;
  try {
    rootEntries = import_node_fs.default.readdirSync(getDataRoot(), { withFileTypes: true });
  } catch {
    _topicCache = result;
    return result;
  }
  const skipDirs = /* @__PURE__ */ new Set(["app", "docs", "node_modules", ".git", ".claude", ".superpowers"]);
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || skipDirs.has(entry.name)) continue;
    const innerTopics = import_node_path.default.join(getDataRoot(), entry.name, ".learn", "topics");
    if (!import_node_fs.default.existsSync(innerTopics)) continue;
    let topicDirs;
    try {
      topicDirs = import_node_fs.default.readdirSync(innerTopics, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const topic of topicDirs) {
      if (!topic.isDirectory()) continue;
      result.push({
        name: topic.name,
        dataDir: import_node_path.default.join(innerTopics, topic.name),
        rootDir: import_node_path.default.join(getDataRoot(), entry.name)
      });
    }
  }
  _topicCache = result;
  return result;
}
function locateTopic(topicName) {
  const lower = topicName.toLowerCase();
  return discoverTopics().find((t) => t.name.toLowerCase() === lower) ?? null;
}
function invalidateTopicCache() {
  _topicCache = null;
}
function topicsDir() {
  return import_node_path.default.join(getDataRoot(), ".learn", "topics");
}
function topicDir(topicName) {
  return locateTopic(topicName)?.dataDir ?? import_node_path.default.join(topicsDir(), topicName);
}
function sessionsDir(topicName) {
  return import_node_path.default.join(topicDir(topicName), "sessions");
}
function listTopics() {
  return discoverTopics().map((t) => t.name);
}
function getKnowledgeMap(topicName) {
  const filePath = import_node_path.default.join(topicDir(topicName), "knowledge-map.md");
  if (!import_node_fs.default.existsSync(filePath)) {
    return null;
  }
  return import_node_fs.default.readFileSync(filePath, "utf-8");
}
function getState(topicName) {
  const filePath = import_node_path.default.join(topicDir(topicName), "state.yaml");
  if (!import_node_fs.default.existsSync(filePath)) {
    return null;
  }
  const raw = import_node_fs.default.readFileSync(filePath, "utf-8");
  return import_js_yaml.default.load(raw);
}
function updateState(topicName, currentState, conceptPath, newStatus, newConfidence) {
  const filePath = import_node_path.default.join(topicDir(topicName), "state.yaml");
  if (!import_node_fs.default.existsSync(filePath)) {
    return null;
  }
  const concepts = currentState.concepts.map((c) => {
    if (c.path === conceptPath) {
      return {
        ...c,
        status: newStatus,
        confidence: newConfidence,
        last_practiced: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        practice_count: newStatus === "in_progress" || newStatus === "completed" ? c.practice_count + 1 : c.practice_count
      };
    }
    return c;
  });
  const newState = {
    ...currentState,
    concepts
  };
  const yamlContent = import_js_yaml.default.dump(newState, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
  import_node_fs.default.writeFileSync(filePath, yamlContent, "utf-8");
  return newState;
}
function getSessions(topicName, search) {
  const dir = sessionsDir(topicName);
  if (!import_node_fs.default.existsSync(dir)) {
    return [];
  }
  const files = import_node_fs.default.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().reverse();
  const sessions = files.map((filename) => {
    const namePart = filename.replace(/\.md$/, "");
    const parts = namePart.split("-");
    let date = "";
    let concept = "";
    let type = "explain";
    const dateMatch = namePart.match(/(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      date = dateMatch[1];
      const rest = namePart.slice(0, -(dateMatch[1].length + 1));
      const lastSegment = rest.split("-").pop();
      if (lastSegment && ["explain", "practice", "review", "chat"].includes(lastSegment)) {
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
      type
    };
  });
  if (search) {
    const lower = search.toLowerCase();
    return sessions.filter(
      (s) => s.conceptName.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower) || s.date && s.date.includes(lower)
    );
  }
  return sessions;
}
function getSessionDetail(topicName, filename) {
  const filePath = import_node_path.default.join(sessionsDir(topicName), filename);
  if (!import_node_fs.default.existsSync(filePath)) {
    return null;
  }
  return import_node_fs.default.readFileSync(filePath, "utf-8");
}
function deleteSessionFile(topicName, filename) {
  const filePath = import_node_path.default.join(sessionsDir(topicName), filename);
  if (!import_node_fs.default.existsSync(filePath)) {
    return false;
  }
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  import_node_fs.default.unlinkSync(filePath);
  return true;
}
function createSession(topicName, conceptName, type, content) {
  const dir = sessionsDir(topicName);
  if (!import_node_fs.default.existsSync(dir)) {
    import_node_fs.default.mkdirSync(dir, { recursive: true });
  }
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const safeConcept = conceptName.replace(/[/\\?%*:|"<>]/g, "-");
  const filename = `${safeConcept}-${type}-${date}.md`;
  const filePath = import_node_path.default.join(dir, filename);
  import_node_fs.default.writeFileSync(filePath, content, "utf-8");
  return filename;
}
function getPlan(topicName) {
  const loc = locateTopic(topicName);
  if (!loc) return null;
  try {
    const dirFiles = import_node_fs.default.readdirSync(loc.rootDir);
    for (const f of dirFiles) {
      const lower = f.toLowerCase();
      if (lower.includes("plan") && f.endsWith(".md")) {
        return import_node_fs.default.readFileSync(import_node_path.default.join(loc.rootDir, f), "utf-8");
      }
    }
  } catch {
  }
  return null;
}
function updatePlan(topicName, planMd) {
  const loc = locateTopic(topicName);
  if (!loc) return false;
  let planFile = null;
  try {
    const dirFiles = import_node_fs.default.readdirSync(loc.rootDir);
    for (const f of dirFiles) {
      const lower = f.toLowerCase();
      if (lower.includes("plan") && f.endsWith(".md")) {
        planFile = f;
        break;
      }
    }
  } catch {
    return false;
  }
  if (!planFile) return false;
  import_node_fs.default.writeFileSync(import_node_path.default.join(loc.rootDir, planFile), planMd, "utf-8");
  const statePath = import_node_path.default.join(loc.dataDir, "state.yaml");
  if (import_node_fs.default.existsSync(statePath)) {
    const raw = import_node_fs.default.readFileSync(statePath, "utf-8");
    const state = import_js_yaml.default.load(raw);
    const newConcepts = parsePlanToConcepts(planMd);
    const existingMap = /* @__PURE__ */ new Map();
    for (const c of state.concepts) {
      existingMap.set(c.path, c);
    }
    state.concepts = newConcepts.map((nc) => {
      const existing = existingMap.get(nc.path);
      if (existing) {
        return existing;
      }
      return nc;
    });
    const yamlContent = import_js_yaml.default.dump(state, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    import_node_fs.default.writeFileSync(statePath, yamlContent, "utf-8");
  }
  return true;
}
function parsePlanToConcepts(md) {
  const concepts = [];
  const lines = md.split("\n");
  let currentStage = "";
  for (const line of lines) {
    const stageMatch = line.match(/^##\s*阶段\s*[^\s：:]+[：:]\s*(.+)/);
    if (stageMatch) {
      currentStage = stageMatch[1].trim();
      continue;
    }
    if (!currentStage) continue;
    const conceptMatch = line.match(/^###\s+\d+\.\d+\.?\s*(.+)/);
    if (conceptMatch) {
      concepts.push({
        path: `${currentStage}/${conceptMatch[1].trim()}`,
        status: "unexplored",
        last_practiced: null,
        practice_count: 0,
        confidence: 0
      });
    }
  }
  return concepts;
}
function createTopic(topicName, options) {
  const safeName = topicName.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase();
  const rootDir = import_node_path.default.join(getDataRoot(), safeName.charAt(0).toUpperCase() + safeName.slice(1));
  const dataDir = import_node_path.default.join(rootDir, ".learn", "topics", safeName);
  const sessionsDir2 = import_node_path.default.join(dataDir, "sessions");
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  import_node_fs.default.mkdirSync(sessionsDir2, { recursive: true });
  const parsedConcepts = options?.planContent ? parsePlanToConcepts(options.planContent) : [];
  const initialState = {
    topic: safeName,
    created: today,
    concepts: parsedConcepts
  };
  import_node_fs.default.writeFileSync(
    import_node_path.default.join(dataDir, "state.yaml"),
    import_js_yaml.default.dump(initialState, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }),
    "utf-8"
  );
  const kmContent = options?.knowledgeMapContent || `# ${topicName} \u77E5\u8BC6\u5730\u56FE

> \u521B\u5EFA\u4E8E ${today}

## \u57FA\u7840\u77E5\u8BC6

_\u4F7F\u7528 AI \u751F\u6210\u77E5\u8BC6\u5730\u56FE\uFF0C\u6216\u624B\u52A8\u7F16\u8F91\u6B64\u6587\u4EF6_
`;
  import_node_fs.default.writeFileSync(import_node_path.default.join(dataDir, "knowledge-map.md"), kmContent, "utf-8");
  const planContent = options?.planContent || `# ${topicName} \u5B66\u4E60\u8BA1\u5212

> \u521B\u5EFA\u4E8E ${today}

## \u9636\u6BB5\u4E00\uFF1A\u57FA\u7840\u5165\u95E8

_\u4F7F\u7528 AI \u8C03\u6574\u8DEF\u7EBF\uFF0C\u6216\u624B\u52A8\u7F16\u8F91\u6B64\u6587\u4EF6_
`;
  import_node_fs.default.writeFileSync(import_node_path.default.join(rootDir, `${safeName}-learning-plan.md`), planContent, "utf-8");
  import_node_fs.default.writeFileSync(import_node_path.default.join(rootDir, "progress.md"), `# ${topicName} \u5B66\u4E60\u8FDB\u5EA6

`, "utf-8");
  invalidateTopicCache();
  return { success: true, path: dataDir };
}
function deleteTopic(topicName) {
  const loc = locateTopic(topicName);
  if (!loc) return false;
  const rootDir = loc.rootDir;
  if (!rootDir.startsWith(getDataRoot()) || rootDir === getDataRoot()) return false;
  try {
    import_node_fs.default.rmSync(rootDir, { recursive: true, force: true });
    invalidateTopicCache();
    return true;
  } catch {
    return false;
  }
}

// server/deepseek.ts
var DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
var MODEL = "deepseek-chat";
async function callDeepSeek(apiKey, messages, maxTokens = 4096, temperature = 0.7, timeoutMs = 3e4) {
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
var EXPLAIN_SYSTEM = `\u4F60\u662F\u4E00\u4F4D\u82CF\u683C\u62C9\u5E95\u5F0F\u7F16\u7A0B\u5BFC\u5E08\uFF0C\u64C5\u957F\u7528\u7C7B\u6BD4\u3001\u56FE\u8868\u548C\u5F15\u5BFC\u5F0F\u63D0\u95EE\u8FDB\u884C\u6559\u5B66\u3002

## \u6838\u5FC3\u539F\u5219
1. **\u4F18\u5148\u4F7F\u7528\u89C6\u89C9\u7C7B\u6BD4** \u2014 \u5C06\u62BD\u8C61\u6982\u5FF5\u8F6C\u5316\u4E3A\u65E5\u5E38\u751F\u6D3B\u4E2D\u7684\u573A\u666F\uFF08\u5982\u5FEB\u9012\u5305\u88F9\u3001\u56FE\u4E66\u9986\u3001\u5DE5\u5382\u6D41\u6C34\u7EBF\uFF09
2. **\u5BF9\u6BD4\u8868\u683C** \u2014 \u5728\u8BB2\u89E3\u76F8\u4F3C\u6982\u5FF5\u65F6\u5FC5\u987B\u4F7F\u7528 Markdown \u8868\u683C\u7A81\u51FA\u533A\u522B
3. **\u4ECE"\u4E3A\u4EC0\u4E48"\u5F00\u59CB** \u2014 \u5148\u8BF4\u660E\u6982\u5FF5\u7684\u52A8\u673A\u548C\u4F7F\u7528\u573A\u666F\uFF0C\u518D\u8BB2\u8BED\u6CD5\u7EC6\u8282
4. **\u4EE3\u7801\u5373\u6587\u6863** \u2014 \u6BCF\u4E2A\u77E5\u8BC6\u70B9\u81F3\u5C11\u914D\u4E00\u6BB5\u53EF\u8FD0\u884C\u7684\u793A\u4F8B\u4EE3\u7801
5. **\u9677\u9631\u9884\u8B66** \u2014 \u660E\u786E\u6307\u51FA\u65B0\u624B\u5BB9\u6613\u72AF\u7684\u9519\u8BEF\uFF0C\u5E76\u89E3\u91CA\u539F\u56E0
6. **\u82CF\u683C\u62C9\u5E95\u5F0F\u5F15\u5BFC** \u2014 \u7ED3\uFFFD\uFFFD\uFFFD\u65F6\u63D0\u51FA 3-5 \u4E2A\u601D\u8003\u9898\uFF0C\u5F15\u5BFC\u5B66\u751F\u81EA\u5DF1\u63A8\u5BFC\u51FA\u66F4\u6DF1\u5C42\u7684\u7406\u89E3
7. **\u60C5\u7EEA\u611F\u77E5** \u2014 \u7528\u6237\u8BF4"\u8FD8\u662F\u4E0D\u61C2"\u65F6\uFF0C\u6362\u4E00\u4E2A\u5B8C\u5168\u4E0D\u540C\u7684\u89D2\u5EA6\u518D\u8BB2\uFF0C\u964D\u4F4E\u62BD\u8C61\u5C42\u6B21

## \u8F93\u51FA\u7ED3\u6784
- \u4E00\u3001\u5B9A\u4F4D\uFF1A\u6B64\u6982\u5FF5\u5728\u77E5\u8BC6\u5730\u56FE\u4E2D\u7684\u4F4D\u7F6E
- \u4E8C\u3001\u7C7B\u6BD4\uFF1A\u751F\u6D3B\u5316\u573A\u666F -> Python \u6982\u5FF5\u6620\u5C04\u8868
- \u4E09\u3001\u6838\u5FC3\u673A\u5236\uFF1A\u539F\u7406\u8BB2\u89E3\uFF08\u5C3D\u91CF\u7528\u8868\u683C\u548C\u5BF9\u6BD4\uFF09
- \u56DB\u3001\u4EE3\u7801\u5B9E\u6218\uFF1A\u4ECE\u7B80\u5355\u5230\u590D\u6742\u7684\u53EF\u8FD0\u884C\u793A\u4F8B
- \u4E94\u3001\u26A0\uFE0F \u5E38\u89C1\u9677\u9631
- \u516D\u3001\u{1F914} Socratic \u68C0\u9A8C\uFF1A\u5F15\u5BFC\u5F0F\u601D\u8003\u9898
- \u4E03\u3001\u603B\u7ED3\u5361\u7247\uFF08ASCII \u6846\u56FE\uFF09
- \u516B\u3001\u4E0B\u4E00\u6B65\u63A2\u7D22\u5EFA\u8BAE

## \u8F93\u51FA\u8981\u6C42
- \u5168\u90E8\u4F7F\u7528\u4E2D\u6587\uFF08\u4EE3\u7801\u4E2D\u7684\u6CE8\u91CA\u4E5F\u7528\u4E2D\u6587\uFF09
- \u7528 Markdown \u683C\u5F0F\u8F93\u51FA\uFF0C\u5145\u5206\u5229\u7528\u8868\u683C\u3001\u4EE3\u7801\u5757\u3001\u5F15\u7528
- \u907F\u514D\u5197\u957F\uFF0C\u6BCF\u4E2A\u5B50\u8282\u63A7\u5236\u5728 10-20 \u884C\u4EE5\u5185`;
var CHAT_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u4F19\u4F34 "Lumi"\uFF0C\u4E00\u4F4D\u70ED\u60C5\u3001\u8010\u5FC3\u7684\u7F16\u7A0B\u5BFC\u5E08\u3002
\u4F60\u7684\u6559\u5B66\u98CE\u683C\u6D3B\u6CFC\u4F46\u4E13\u4E1A\uFF1A
- \u7528\u65E5\u5E38\u7C7B\u6BD4\u89E3\u91CA\u590D\u6742\u6982\u5FF5
- \u5F53\u5B66\u751F\u56F0\u60D1\u65F6\u6362\u4E0D\u540C\u89D2\u5EA6\u91CD\u8BB2
- \u9F13\u52B1\u5B66\u751F\u81EA\u5DF1\u601D\u8003\uFF0C\u4E0D\u76F4\u63A5\u7ED9\u7B54\u6848
- \u56DE\u7B54\u7B80\u6D01\u6709\u529B\uFF0C\u6BCF\u6B21\u805A\u7126\u4E00\u4E2A\u95EE\u9898
- \u4F7F\u7528\u4E2D\u6587\u56DE\u590D\uFF0C\u4EE3\u7801\u5757\u7528\u6B63\u786E\u7684\u8BED\u8A00\u6807\u8BB0`;
var EXERCISE_SYSTEM = `\u4F60\u662F TDD\uFF08\u6D4B\u8BD5\u9A71\u52A8\u5F00\u53D1\uFF09\u7EC3\u4E60\u751F\u6210\u5668\u3002\u6839\u636E\u6982\u5FF5\u548C\u96BE\u5EA6\u751F\u6210\u7EC3\u4E60\u9898\u3002

## \u8F93\u51FA\u683C\u5F0F\uFF08\u4E25\u683C\u9075\u5FAA\uFF09
\`\`\`markdown
# {\u6982\u5FF5\u540D} \u2014 TDD \u7EC3\u4E60

## \u{1F3AF} \u7EC3\u4E60\u76EE\u6807
{\u4E00\u53E5\u8BDD\u8BF4\u660E}

## \u{1F4CB} \u4EFB\u52A1\u63CF\u8FF0
{\u8BE6\u7EC6\u63CF\u8FF0\u8981\u5B9E\u73B0\u4EC0\u4E48}

## \u2705 \u9A8C\u6536\u6D4B\u8BD5\uFF08\u5FC5\u987B\u5148\u5199\uFF01\uFF09
\`\`\`python
import pytest

def test_xxx():
    """\u6D4B\u8BD5\u63CF\u8FF0"""
    assert ...
\`\`\`

## \u{1F9E9} \u4EE3\u7801\u6A21\u677F
\`\`\`python
# \u8BF7\u5728\u4E0B\u65B9\u5B8C\u6210\u4F60\u7684\u5B9E\u73B0
def xxx():
    pass
\`\`\`

## \u{1F4A1} \u63D0\u793A\uFF08\u5982\u679C\u5361\u4F4F\u518D\u770B\uFF09
<details>
<summary>\u70B9\u51FB\u67E5\u770B\u63D0\u793A</summary>
{\u5206\u9636\u6BB5\u7684\u6E10\u8FDB\u63D0\u793A}
</details>
\`\`\`

## \u96BE\u5EA6\u7B49\u7EA7
- \u5165\u95E8\uFF1A\u5355\u4E00\u51FD\u6570\uFF0C\u903B\u8F91\u7B80\u5355\uFF0C3-5 \u4E2A\u6D4B\u8BD5
- \u8FDB\u9636\uFF1A\u591A\u51FD\u6570\u534F\u4F5C\uFF0C\u8FB9\u754C\u6761\u4EF6\u5904\u7406\uFF0C5-8 \u4E2A\u6D4B\u8BD5
- \u6311\u6218\uFF1A\u8BBE\u8BA1\u6A21\u5F0F/\u7B97\u6CD5\uFF0C\u591A\u6587\u4EF6\u7ED3\u6784\uFF0C8+ \u4E2A\u6D4B\u8BD5

## \u8981\u6C42
- \u6D4B\u8BD5\u5FC5\u987B\u771F\u5B9E\u53EF\u8FD0\u884C\uFF0C\u8F93\u5165\u8F93\u51FA\u660E\u786E
- \u4EE3\u7801\u6A21\u677F\u8981\u6709\u8DB3\u591F\u7684\u5F15\u5BFC\u4F46\u4E0D\u8FC7\u5EA6\u586B\u5145
- \u4F7F\u7528\u4E2D\u6587\u63CF\u8FF0
- \u7EC3\u4E60\u5E94\u80FD\u5728 15-30 \u5206\u949F\u5185\u5B8C\u6210`;
var REVIEW_SYSTEM = `\u4F60\u662F\u7F16\u7A0B\u7EC3\u4E60\u8BC4\u5BA1\u5B98\u3002\u5BA1\u67E5\u5B66\u751F\u4EE3\u7801\u5E76\u63D0\u4F9B\u5EFA\u8BBE\u6027\u53CD\u9988\u3002

## \u8BC4\u5BA1\u7EF4\u5EA6
1. **\u6B63\u786E\u6027** \u2014 \u662F\u5426\u901A\u8FC7\u9A8C\u6536\u6D4B\u8BD5\uFF1F\u903B\u8F91\u662F\u5426\u6B63\u786E\uFF1F
2. **\u4EE3\u7801\u98CE\u683C** \u2014 \u662F\u5426\u9075\u5FAA PEP 8\uFF1F\u547D\u540D\u3001\u7F29\u8FDB\u3001\u7A7A\u683C\uFF1F
3. **\u6548\u7387** \u2014 \u65F6\u95F4\u590D\u6742\u5EA6\u662F\u5426\u5408\u7406\uFF1F\u6709\u65E0\u5197\u4F59\u64CD\u4F5C\uFF1F
4. **Pythonic** \u2014 \u662F\u5426\u5229\u7528 Python \u7279\u6027\uFF08\u63A8\u5BFC\u5F0F\u3001\u89E3\u5305\u3001with \u7B49\uFF09\uFF1F
5. **\u53EF\u8BFB\u6027** \u2014 \u53D8\u91CF\u540D\u662F\u5426\u6E05\u6670\uFF1F\u662F\u5426\u9700\u8981\u6CE8\u91CA\uFF1F

## \u8F93\u51FA\u683C\u5F0F
\`\`\`markdown
# \u4EE3\u7801\u8BC4\u5BA1\uFF1A{\u6982\u5FF5\u540D}

## \u{1F4CA} \u8BC4\u5206
| \u7EF4\u5EA6 | \u8BC4\u5206(1-5) | \u8BF4\u660E |
|------|----------|------|
| \u6B63\u786E\u6027 | \u2B50\u2B50\u2B50\u2B50\u2B50 | ... |
| \u4EE3\u7801\u98CE\u683C | \u2B50\u2B50\u2B50\u2B50\u2B50 | ... |
| \u6548\u7387 | \u2B50\u2B50\u2B50\u2B50\u2B50 | ... |
| Pythonic | \u2B50\u2B50\u2B50\u2B50\u2B50 | ... |
| \u53EF\u8BFB\u6027 | \u2B50\u2B50\u2B50\u2B50\u2B50 | ... |

## \u2705 \u505A\u5F97\u597D\u7684\u5730\u65B9
- {\u5177\u4F53\u8868\u626C}

## \u{1F527} \u53EF\u4EE5\u6539\u8FDB\u7684\u5730\u65B9
1. {\u5177\u4F53\u5EFA\u8BAE + \u4EE3\u7801\u5BF9\u6BD4}

## \u{1F4A1} "\u66F4 Pythonic \u7684\u5199\u6CD5"
\`\`\`python
# \u4F60\u7684\u5199\u6CD5
...
# \u63A8\u8350\u5199\u6CD5
...
\`\`\`
\`\`\`

## \u98CE\u683C
- \u5148\u80AF\u5B9A\u518D\u6539\u8FDB\uFF08\u4E09\u660E\u6CBB\u53CD\u9988\u6CD5\uFF09
- \u6BCF\u4E2A\u5EFA\u8BAE\u9644\u5E26\u5177\u4F53\u4EE3\u7801\u793A\u4F8B
- \u4F7F\u7528\u4E2D\u6587`;
var RECOMMEND_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u8DEF\u5F84\u63A8\u8350\u5F15\u64CE\u3002\u6839\u636E\u7528\u6237\u7684\u77E5\u8BC6\u638C\u63E1\u72B6\u6001\u548C\u5B66\u4E60\u5386\u53F2\uFF0C\u63A8\u8350\u6700\u4F18\u4E0B\u4E00\u6B65\u3002

## \u63A8\u8350\u7B56\u7565
1. **\u5E7F\u5EA6\u4F18\u5148** \u2014 \u4F18\u5148\u63A8\u8350\u540C\u4E00\u77E5\u8BC6\u5206\u7C7B\u4E0B\u672A\u63A2\u7D22\u7684\u6982\u5FF5
2. **\u8865\u9F50\u77ED\u677F** \u2014 \u4F4E\u4FE1\u5FC3\u7684\u6982\u5FF5\u6BD4\u9AD8\u4FE1\u5FC3\u7684\u4F18\u5148
3. **\u524D\u7F6E\u4F9D\u8D56** \u2014 \u786E\u4FDD\u63A8\u8350\u6982\u5FF5\u7684\u524D\u7F6E\u6982\u5FF5\u5DF2\u5B8C\u6210
4. **stuck \u5E72\u9884** \u2014 \u5982\u679C\u7528\u6237\u5728\u67D0\u6982\u5FF5\u5361\u4F4F(status=stuck)\uFF0C\u63A8\u8350\u5148\u505A\u7EC3\u4E60\u5DE9\u56FA
5. **\u95F4\u9694\u91CD\u590D** \u2014 \u5BF9\u5DF2\u5B8C\u6210\u4F46 last_practiced \u8D85\u8FC7 3 \u5929\u7684\u6982\u5FF5\u63D0\u9192\u590D\u4E60

## \u8F93\u51FA\u683C\u5F0F
\`\`\`markdown
# \u5B66\u4E60\u63A8\u8350

## \u{1F525} \u5F53\u524D\u4F18\u5148
1. **{\u6982\u5FF5\u540D}** \u2014 {\u539F\u56E0}\uFF08\u63A8\u8350\u52A8\u4F5C\uFF1A{explain/practice/review}\uFF09

## \u{1F4DA} \u53EF\u63A2\u7D22\u7684\u65B0\u6982\u5FF5
- {\u6982\u5FF5\u540D}\uFF1A{\u7B80\u8981\u8BF4\u660E}

## \u{1F504} \u5EFA\u8BAE\u590D\u4E60
- {\u6982\u5FF5\u540D}\uFF1A{\u4E0A\u6B21\u7EC3\u4E60\u65E5\u671F}\uFF0C\u5EFA\u8BAE\u91CD\u6E29
\`\`\``;
var KNOWLEDGE_MAP_SYSTEM = `\u4F60\u662F\u77E5\u8BC6\u4F53\u7CFB\u6784\u5EFA\u4E13\u5BB6\u3002\u4E3A\u6307\u5B9A\u4E3B\u9898\u751F\u6210\u7ED3\u6784\u5316\u7684\u77E5\u8BC6\u5730\u56FE\u3002

## \u8F93\u51FA\u683C\u5F0F
\`\`\`markdown
# {\u4E3B\u9898\u540D} \u77E5\u8BC6\u5730\u56FE

## \u5206\u7C7B1
- \u6982\u5FF51-1
  - \u5B50\u8981\u70B91
  - \u5B50\u8981\u70B92
- \u6982\u5FF51-2
  - \u5B50\u8981\u70B91
  - \u5B50\u8981\u70B92

## \u5206\u7C7B2
- \u6982\u5FF52-1
  - ...
\`\`\`

## \u89C4\u5219
- \u6BCF\u4E2A\u5927\u7C7B\u4E0B 3-6 \u4E2A\u6982\u5FF5
- \u7EDF\u8BA1 6-10 \u4E2A\u5206\u7C7B
- \u540D\u5B57\u7B80\u660E\u627C\u8981\uFF082-6 \u4E2A\u5B57\uFF09
- \u6309\u5B66\u4E60\u987A\u5E8F\u6392\u5217\uFF1A\u57FA\u7840 -> \u8FDB\u9636 -> \u9AD8\u7EA7
- \u4F7F\u7528\u4E2D\u6587`;
var GENERATE_PLAN_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u8DEF\u5F84\u8BBE\u8BA1\u4E13\u5BB6\u3002\u4E3A\u6307\u5B9A\u4E3B\u9898\u751F\u6210\u7CFB\u7EDF\u5316\u7684\u5B66\u4E60\u8BA1\u5212\u3002

## \u8F93\u51FA\u683C\u5F0F\uFF08\u4E25\u683C\u9075\u5B88\uFF09
\`\`\`markdown
# {\u4E3B\u9898\u540D} \u5B66\u4E60\u8BA1\u5212

> **\u521B\u5EFA\u65E5\u671F**: YYYY-MM-DD
> **\u8D77\u70B9**: {\u63CF\u8FF0\u521D\u5B66\u8005\u7684\u524D\u7F6E\u77E5\u8BC6\uFF0C\u9ED8\u8BA4"\u96F6\u57FA\u7840"}
> **\u76EE\u6807**: {\u63CF\u8FF0\u5B66\u5B8C\u540E\u80FD\u8FBE\u5230\u7684\u6C34\u5E73}

---

## \u9636\u6BB5\u4E00\uFF1A\u9636\u6BB5\u540D\u79F0
> \u76EE\u6807\uFF1A\u6B64\u9636\u6BB5\u5B66\u4E60\u76EE\u6807\u7684\u4E00\u53E5\u8BDD\u8BF4\u660E

### 1.1 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09

### 1.2 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09

---

## \u9636\u6BB5\u4E8C\uFF1A\u9636\u6BB5\u540D\u79F0
> \u76EE\u6807\uFF1A\u6B64\u9636\u6BB5\u5B66\u4E60\u76EE\u6807\u7684\u4E00\u53E5\u8BDD\u8BF4\u660E

### 2.1 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09
\`\`\`

## \u89C4\u5219
- \u751F\u6210 3-6 \u4E2A\u9636\u6BB5\uFF0C\u5448\u9012\u8FDB\u5173\u7CFB\uFF08\u57FA\u7840 \u2192 \u8FDB\u9636 \u2192 \u9AD8\u7EA7\uFF09
- \u6BCF\u4E2A\u9636\u6BB5 3-8 \u4E2A\u6982\u5FF5\uFF0C\u6BCF\u4E2A\u6982\u5FF5\u540D\u79F0 2-6 \u4E2A\u5B57
- \u6BCF\u4E2A\u6982\u5FF5\u540E\u7D27\u8DDF\u4E00\u6761"-"\u5F00\u5934\u7684\u7B80\u8981\u8BF4\u660E
- \u8D77\u70B9\u9ED8\u8BA4\u63CF\u8FF0\u4E3A"\u96F6\u57FA\u7840"\uFF0C\u4F46\u53EF\u6839\u636E\u4E3B\u9898\u8C03\u6574
- \u76EE\u6807\u63CF\u8FF0\u5E94\u5177\u4F53\u53EF\u8861\u91CF
- \u53EA\u8F93\u51FA\u4E0A\u8FF0\u683C\u5F0F\u7684\u5185\u5BB9\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u989D\u5916\u7684\u89E3\u91CA\u6216\u524D\u8A00
- \u4F7F\u7528\u4E2D\u6587
- \u6982\u5FF5\u540D\u79F0\u4E0D\u8981\u5E26\u7F16\u53F7\uFF0C\u7F16\u53F7\u7531\u7CFB\u7EDF\u81EA\u52A8\u6DFB\u52A0

## \u6559\u5B66\u539F\u5219
- \u5E7F\u5EA6\u4F18\u5148\uFF1A\u8986\u76D6\u4E3B\u9898\u6838\u5FC3\u9886\u57DF
- \u5B9E\u7528\u5BFC\u5411\uFF1A\u4F18\u5148\u7EB3\u5165\u80FD\u76F4\u63A5\u52A8\u624B\u5B9E\u8DF5\u7684\u77E5\u8BC6
- \u524D\u540E\u4F9D\u8D56\uFF1A\u540E\u9636\u6BB5\u7684\u6982\u5FF5\u987B\u4EE5\u524D\u9636\u6BB5\u4E3A\u57FA\u7840`;
var POLISH_PLAN_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u8BA1\u5212\u5B8C\u5584\u4E13\u5BB6\u3002\u7528\u6237\u5728\u73B0\u6709\u8BA1\u5212\u4E0A\u505A\u4E86\u589E\u5220\u6539\uFF0C\u4F60\u9700\u8981\u5E2E\u7528\u6237\u5B8C\u5584\u548C\u6DA6\u8272\u3002

## \u4F60\u7684\u4EFB\u52A1
\u7528\u6237\u4F1A\u7ED9\u4F60\u4E00\u4EFD\u5B66\u4E60\u8BA1\u5212\uFF08Markdown\uFF09\uFF0C\u5176\u4E2D\u6709\u4E9B\u9636\u6BB5\u6216\u6982\u5FF5\u53EF\u80FD\u7F3A\u5C11\u76EE\u6807\u63CF\u8FF0\u3001\u6982\u5FF5\u8BF4\u660E\uFF0C\u6216\u8005\u7ED3\u6784\u4E0D\u591F\u5B8C\u6574\u3002\u4F60\u9700\u8981\uFF1A
1. \u4FDD\u7559\u7528\u6237\u624B\u52A8\u6DFB\u52A0/\u5220\u9664\u7684\u6240\u6709\u9636\u6BB5\u548C\u6982\u5FF5\u7ED3\u6784\uFF08\u4E0D\u8981\u5220\u9664\u7528\u6237\u6DFB\u52A0\u7684\u5185\u5BB9\uFF09
2. \u4E3A\u7F3A\u5C11"\u76EE\u6807"\u7684\u9636\u6BB5\u81EA\u52A8\u586B\u5199\u5408\u7406\u7684\u5B66\u4E60\u76EE\u6807
3. \u4E3A\u7F3A\u5C11"- \u8BF4\u660E"\u7684\u6982\u5FF5\u81EA\u52A8\u586B\u5199\u4E00\u53E5\u8BDD\u8BF4\u660E
4. \u5982\u679C\u53D1\u73B0\u67D0\u9636\u6BB5\u7F3A\u5C11\u5FC5\u8981\u7684\u57FA\u7840\u6982\u5FF5\uFF0C\u5728\u9636\u6BB5\u672B\u5C3E\u4EE5\u6CE8\u91CA\u5F62\u5F0F\u5EFA\u8BAE\u8865\u5145\uFF1A[\u5EFA\u8BAE\u8865\u5145: xxx]
5. \u7EDF\u4E00\u6982\u5FF5\u540D\u79F0\u98CE\u683C\uFF08\u7B80\u6D01\u30012-6\u5B57\u3001\u4E2D\u6587\uFF09
6. \u786E\u4FDD\u9636\u6BB5\u987A\u5E8F\u903B\u8F91\u9012\u8FDB\uFF08\u57FA\u7840\u2192\u8FDB\u9636\u2192\u9AD8\u7EA7\uFF09

## \u8F93\u51FA\u683C\u5F0F
\u76F4\u63A5\u8F93\u51FA\u5B8C\u5584\u540E\u7684\u5B8C\u6574\u5B66\u4E60\u8BA1\u5212 Markdown\uFF0C\u4FDD\u6301\u539F\u6709\u7ED3\u6784\u3002\u4FEE\u6539\u8FC7\u7684\u5730\u65B9\u5728\u884C\u672B\u6807\u6CE8 [\u5B8C\u5584]\u3002`;
var ADJUST_PLAN_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u8BA1\u5212\u8C03\u6574\u987E\u95EE\u3002\u6839\u636E\u5F53\u524D\u5B66\u4E60\u8FDB\u5EA6\u548C\u72B6\u6001\uFF0C\u4F18\u5316\u5B66\u4E60\u8BA1\u5212\u3002

## \u8C03\u6574\u7B56\u7565
1. **\u52A0\u901F** \u2014 \u5DF2\u5B8C\u6210\u7684\u6982\u5FF5\u6574\u4F53\u65F6\u95F4\u538B\u7F29
2. **\u8865\u5145** \u2014 \u53D1\u73B0\u77E5\u8BC6\u7F3A\u53E3\u65F6\u63D2\u5165\u65B0\u77E5\u8BC6\u70B9
3. **\u91CD\u6392** \u2014 \u6839\u636E\u5B9E\u9645\u96BE\u5EA6\u91CD\u65B0\u6392\u5E8F
4. **\u62C6\u5206** \u2014 \u5982\u679C\u67D0\u6982\u5FF5\u53CD\u590D stuck\uFF0C\u62C6\u5206\u4E3A\u66F4\u5C0F\u7684\u5B50\u6982\u5FF5

## \u8F93\u51FA\u683C\u5F0F
\u76F4\u63A5\u8F93\u51FA\u8C03\u6574\u540E\u7684\u5B8C\u6574\u5B66\u4E60\u8BA1\u5212\uFF08Markdown\uFF09\uFF0C\u4FDD\u6301\u539F\u6709\u7ED3\u6784\uFF0C\u6807\u6CE8\u4FEE\u6539\u90E8\u5206\u7528 [\u8C03\u6574] \u6807\u8BB0\u3002`;
async function explain(apiKey, conceptName, knowledgeMap, userLevel, history = []) {
  const userMessage = `\u8BF7\u8BB2\u89E3\u6982\u5FF5\uFF1A**${conceptName}**

\u77E5\u8BC6\u5730\u56FE\uFF08\u4E0A\u4E0B\u6587\uFF09\uFF1A
\`\`\`markdown
${knowledgeMap}
\`\`\`

\u5B66\u4E60\u8005\u6C34\u5E73\uFF1A${userLevel}

\u8BF7\u6309\u7167\u4F60\u7684\u6559\u5B66\u7ED3\u6784\uFF0C\u7528\u82CF\u683C\u62C9\u5E95\u5F0F\u6559\u5B66\u6CD5\u8BB2\u89E3\u6B64\u6982\u5FF5\u3002`;
  const messages = [
    { role: "system", content: EXPLAIN_SYSTEM },
    ...history.map((h) => ({
      role: h.role,
      content: h.content
    })),
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096);
}
async function chat(apiKey, conceptName, message, history = []) {
  const userMessage = `\u5F53\u524D\u8BA8\u8BBA\u7684\u6982\u5FF5\uFF1A${conceptName}

${message}`;
  const messages = [
    { role: "system", content: CHAT_SYSTEM },
    ...history.map((h) => ({
      role: h.role,
      content: h.content
    })),
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 2048);
}
async function generateExercise(apiKey, conceptName, difficulty, knowledgeMap) {
  const userMessage = `\u8BF7\u4E3A\u6982\u5FF5 **${conceptName}** \u751F\u6210\u4E00\u4E2A TDD \u7EC3\u4E60\u3002

\u96BE\u5EA6\uFF1A${difficulty}

\u76F8\u5173\u77E5\u8BC6\u4E0A\u4E0B\u6587\uFF1A
\`\`\`markdown
${knowledgeMap}
\`\`\`

\u8BF7\u4E25\u683C\u6309\u7167 TDD \u683C\u5F0F\u8F93\u51FA\uFF0C\u5305\u542B\u9A8C\u6536\u6D4B\u8BD5\u548C\u4EE3\u7801\u6A21\u677F\u3002`;
  const messages = [
    { role: "system", content: EXERCISE_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096);
}
async function reviewCode(apiKey, conceptName, userCode, exerciseGoal) {
  const userMessage = `\u8BF7\u8BC4\u5BA1\u4EE5\u4E0B\u4EE3\u7801\uFF1A

\u6982\u5FF5\uFF1A${conceptName}
\u7EC3\u4E60\u76EE\u6807\uFF1A${exerciseGoal}

\`\`\`python
${userCode}
\`\`\``;
  const messages = [
    { role: "system", content: REVIEW_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096);
}
async function recommend(apiKey, topicState, sessions) {
  const userMessage = `\u5F53\u524D\u5B66\u4E60\u72B6\u6001\uFF1A

## \u77E5\u8BC6\u72B6\u6001
\`\`\`yaml
${topicState}
\`\`\`

## \u5B66\u4E60\u5386\u53F2
${sessions || "(\u6682\u65E0\u5B66\u4E60\u8BB0\u5F55)"}

\u8BF7\u5206\u6790\u4E0A\u8FF0\u72B6\u6001\uFF0C\u63A8\u8350\u6700\u4F18\u7684\u4E0B\u4E00\u6B65\u5B66\u4E60\u8DEF\u5F84\u3002`;
  const messages = [
    { role: "system", content: RECOMMEND_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 2048);
}
async function generateKnowledgeMap(apiKey, topicName) {
  const userMessage = `\u8BF7\u4E3A\u4E3B\u9898 **${topicName}** \u751F\u6210\u5B8C\u6574\u77E5\u8BC6\u5730\u56FE\u3002`;
  const messages = [
    { role: "system", content: KNOWLEDGE_MAP_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096);
}
async function generateLearningPlan(apiKey, topicName) {
  const userMessage = `\u8BF7\u4E3A\u4E3B\u9898 **${topicName}** \u8BBE\u8BA1\u4E00\u4EFD\u5B8C\u6574\u7684\u5B66\u4E60\u8BA1\u5212\uFF0C\u5305\u542B\u9636\u6BB5\u5212\u5206\u548C\u6982\u5FF5\u5217\u8868\u3002`;
  const messages = [
    { role: "system", content: GENERATE_PLAN_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096, 0.8, 6e4);
}
async function adjustPlan(apiKey, currentPlan, currentState) {
  const userMessage = `\u5F53\u524D\u5B66\u4E60\u8BA1\u5212\uFF1A
\`\`\`markdown
${currentPlan}
\`\`\`

\u5F53\u524D\u5B66\u4E60\u72B6\u6001\uFF1A
\`\`\`yaml
${currentState}
\`\`\`

\u8BF7\u6839\u636E\u5F53\u524D\u8FDB\u5C55\u4F18\u5316\u5B66\u4E60\u8BA1\u5212\u3002\u6807\u6CE8\u6240\u6709 [\u8C03\u6574] \u7684\u5730\u65B9\u3002`;
  const messages = [
    { role: "system", content: ADJUST_PLAN_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096);
}
async function polishPlan(apiKey, currentPlan) {
  const userMessage = `\u8BF7\u5B8C\u5584\u4EE5\u4E0B\u5B66\u4E60\u8BA1\u5212\uFF0C\u8865\u5145\u7F3A\u5931\u7684\u76EE\u6807\u548C\u6982\u5FF5\u8BF4\u660E\uFF1A

\`\`\`markdown
${currentPlan}
\`\`\`

\u8BF7\u4FDD\u7559\u6240\u6709\u73B0\u6709\u7684\u9636\u6BB5\u548C\u6982\u5FF5\u7ED3\u6784\uFF0C\u53EA\u8865\u5145\u548C\u5B8C\u5584\u5185\u5BB9\u3002`;
  const messages = [
    { role: "system", content: POLISH_PLAN_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096, 0.7, 6e4);
}
var PLAN_FROM_FILE_SYSTEM = `\u4F60\u662F\u5B66\u4E60\u8DEF\u5F84\u8BBE\u8BA1\u4E13\u5BB6\u3002\u7528\u6237\u4F1A\u4E0A\u4F20\u4E00\u4EFD MD \u6587\u4EF6\u5185\u5BB9\uFF0C\u8BF7\u4F60\u5206\u6790\u5176\u4E2D\u7684\u77E5\u8BC6\u70B9\uFF0C\u4E3A\u8FD9\u4E9B\u77E5\u8BC6\u70B9\u8BBE\u8BA1\u4E00\u4EFD\u7CFB\u7EDF\u5316\u7684\u5B66\u4E60\u8BA1\u5212\u3002

## \u8F93\u51FA\u683C\u5F0F\uFF08\u4E25\u683C\u9075\u5B88\uFF09
\u53EA\u8F93\u51FA\u4EE5\u4E0B\u683C\u5F0F\u7684 Markdown \u5185\u5BB9\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u989D\u5916\u7684\u89E3\u91CA\u6216\u524D\u8A00\uFF1A

\`\`\`markdown
# {\u4E3B\u9898\u540D} \u5B66\u4E60\u8BA1\u5212

> **\u521B\u5EFA\u65E5\u671F**: YYYY-MM-DD
> **\u8D77\u70B9**: {\u63CF\u8FF0\u521D\u5B66\u8005\u7684\u524D\u7F6E\u77E5\u8BC6\uFF0C\u9ED8\u8BA4"\u96F6\u57FA\u7840"}
> **\u76EE\u6807**: {\u63CF\u8FF0\u5B66\u5B8C\u540E\u80FD\u8FBE\u5230\u7684\u6C34\u5E73}

---

## \u9636\u6BB5\u4E00\uFF1A\u9636\u6BB5\u540D\u79F0
> \u76EE\u6807\uFF1A\u6B64\u9636\u6BB5\u5B66\u4E60\u76EE\u6807\u7684\u4E00\u53E5\u8BDD\u8BF4\u660E

### 1.1 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09

### 1.2 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09

---

## \u9636\u6BB5\u4E8C\uFF1A\u9636\u6BB5\u540D\u79F0
> \u76EE\u6807\uFF1A\u6B64\u9636\u6BB5\u5B66\u4E60\u76EE\u6807\u7684\u4E00\u53E5\u8BDD\u8BF4\u660E

### 2.1 \u6982\u5FF5\u540D\u79F0
- \u6982\u5FF5\u7B80\u8981\u8BF4\u660E\uFF08\u4E00\u53E5\u8BDD\uFF09
\`\`\`

## \u89C4\u5219
- \u4ECE\u4E0A\u4F20\u7684\u6587\u4EF6\u5185\u5BB9\u4E2D\u63D0\u53D6\u6240\u6709\u51FA\u73B0\u7684\u77E5\u8BC6\u70B9
- \u6309\u5B66\u4E60\u987A\u5E8F\u6392\u5217\uFF1A\u57FA\u7840 -> \u8FDB\u9636 -> \u9AD8\u7EA7
- \u751F\u6210 3-6 \u4E2A\u9636\u6BB5\uFF0C\u6BCF\u4E2A\u9636\u6BB5 3-8 \u4E2A\u6982\u5FF5
- \u6BCF\u4E2A\u6982\u5FF5\u540E\u7D27\u8DDF\u4E00\u6761"-"\u5F00\u5934\u7684\u7B80\u8981\u8BF4\u660E
- \u6982\u5FF5\u540D\u79F0 2-6 \u4E2A\u5B57\uFF0C\u4E0D\u8981\u5E26\u7F16\u53F7\uFF08\u7F16\u53F7\u7531\u7CFB\u7EDF\u81EA\u52A8\u6DFB\u52A0\uFF09
- \u8D77\u70B9\u9ED8\u8BA4\u63CF\u8FF0\u4E3A"\u96F6\u57FA\u7840"\uFF0C\u4F46\u53EF\u6839\u636E\u4E3B\u9898\u8C03\u6574
- \u76EE\u6807\u63CF\u8FF0\u5E94\u5177\u4F53\u53EF\u8861\u91CF
- \u4F7F\u7528\u4E2D\u6587
- \u9636\u6BB5\u4F7F\u7528"## \u9636\u6BB5N\uFF1A\u540D\u79F0"\u683C\u5F0F\uFF0CN\u4E3A\u4E2D\u6587\u6570\u5B57\uFF08\u4E00\u3001\u4E8C\u3001\u4E09...\uFF09
- \u6982\u5FF5\u4F7F\u7528"### N.M \u6982\u5FF5\u540D\u79F0"\u683C\u5F0F`;
async function planFromFile(apiKey, topicName, fileContent) {
  const truncated = fileContent.length > 8e3 ? fileContent.slice(0, 8e3) + "\n\n...(\u5185\u5BB9\u5DF2\u622A\u65AD)" : fileContent;
  const userMessage = `\u8BF7\u6839\u636E\u4EE5\u4E0B\u6587\u4EF6\u5185\u5BB9\uFF0C\u4E3A\u4E3B\u9898 **${topicName}** \u8BBE\u8BA1\u4E00\u4EFD\u5B8C\u6574\u7684\u5B66\u4E60\u8BA1\u5212\uFF1A

\`\`\`markdown
${truncated}
\`\`\``;
  const messages = [
    { role: "system", content: PLAN_FROM_FILE_SYSTEM },
    { role: "user", content: userMessage }
  ];
  return callDeepSeek(apiKey, messages, 4096, 0.7, 6e4);
}

// server/execute.ts
var import_node_child_process = require("node:child_process");
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var TIMEOUT_MS = 5e3;
function executePython(code) {
  const tmpDir = import_node_os.default.tmpdir();
  const tmpFile = import_node_path2.default.join(tmpDir, `learn-anything-${Date.now()}.py`);
  try {
    import_node_fs2.default.writeFileSync(tmpFile, code, "utf-8");
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    let timedOut = false;
    try {
      const result = (0, import_node_child_process.execSync)(`python "${tmpFile}"`, {
        encoding: "utf-8",
        timeout: TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        // 10 MB
        windowsHide: true
      });
      stdout = result;
    } catch (err) {
      const execErr = err;
      stdout = execErr.stdout ? typeof execErr.stdout === "string" ? execErr.stdout : execErr.stdout.toString() : "";
      stderr = execErr.stderr ? typeof execErr.stderr === "string" ? execErr.stderr : execErr.stderr.toString() : execErr.message ?? "";
      if (execErr.killed || execErr.signal === "SIGTERM") {
        timedOut = true;
        stderr = stderr + "\n[\u8FDB\u7A0B\u8D85\u65F6\uFF1A\u4EE3\u7801\u6267\u884C\u8D85\u8FC7 5 \u79D2\u9650\u5236]";
      }
      exitCode = execErr.code ?? 1;
    }
    return { stdout, stderr, exitCode, timedOut };
  } finally {
    try {
      if (import_node_fs2.default.existsSync(tmpFile)) {
        import_node_fs2.default.unlinkSync(tmpFile);
      }
    } catch {
    }
  }
}

// server/index.ts
var import_meta = {};
var __dirname = (() => {
  if (typeof __dirname !== "undefined") return __dirname;
  return import_node_path3.default.dirname((0, import_node_url.fileURLToPath)(import_meta.url));
})();
(0, import_dotenv.config)({ path: import_node_path3.default.resolve(__dirname, "..", ".env") });
var PORT = parseInt(process.env.API_PORT || "17345", 10);
var distPath = import_node_path3.default.resolve(__dirname, "..", "dist");
var app = (0, import_express.default)();
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "2mb" }));
function getApiKey(req) {
  const header = req.headers["authorization"];
  if (!header) return "";
  const authStr = Array.isArray(header) ? header[0] : header;
  return (authStr || "").replace(/^Bearer\s+/i, "");
}
app.get("/api/topics", (_req, res) => {
  const topics = listTopics();
  res.json({ topics });
});
app.post("/api/topics", (req, res) => {
  const body = req.body;
  if (!body.topicName || typeof body.topicName !== "string") {
    res.status(400).json({ error: "topicName is required" });
    return;
  }
  const result = createTopic(body.topicName, {
    planContent: body.planContent,
    knowledgeMapContent: body.knowledgeMapContent
  });
  res.status(201).json(result);
});
app.delete("/api/topics/:name", (req, res) => {
  const topicName = decodeURIComponent(req.params.name);
  const deleted = deleteTopic(topicName);
  if (!deleted) {
    res.status(404).json({ error: `Topic "${topicName}" not found or cannot be deleted` });
    return;
  }
  res.json({ deleted: true });
});
app.get("/api/topics/:name/knowledge-map", (req, res) => {
  const km = getKnowledgeMap(req.params.name);
  if (km === null) {
    res.status(404).json({ error: `Topic "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: km });
});
app.get("/api/topics/:name/state", (req, res) => {
  const state = getState(req.params.name);
  if (state === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(state);
});
app.put("/api/topics/:name/state", (req, res) => {
  const body = req.body;
  const currentState = body.currentState;
  const newState = updateState(
    req.params.name,
    currentState,
    body.conceptPath,
    body.newStatus,
    body.newConfidence
  );
  if (newState === null) {
    res.status(404).json({ error: `State for "${req.params.name}" not found` });
    return;
  }
  res.json(newState);
});
app.get("/api/topics/:name/sessions", (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : void 0;
  const sessions = getSessions(req.params.name, search);
  res.json({ topicName: req.params.name, sessions });
});
app.post("/api/topics/:name/sessions", (req, res) => {
  const body = req.body;
  const filename = createSession(
    req.params.name,
    body.conceptName,
    body.type,
    body.content
  );
  res.status(201).json({ filename });
});
app.get("/api/topics/:name/sessions/:file", (req, res) => {
  const detail = getSessionDetail(req.params.name, req.params.file);
  if (detail === null) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ filename: req.params.file, content: detail });
});
app.delete("/api/topics/:name/sessions/:file", (req, res) => {
  const deleted = deleteSessionFile(req.params.name, req.params.file);
  if (!deleted) {
    res.status(404).json({ error: "Session not found or cannot be deleted" });
    return;
  }
  res.json({ deleted: true });
});
app.get("/api/topics/:name/plan", (req, res) => {
  const plan = getPlan(req.params.name);
  if (plan === null) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ topicName: req.params.name, content: plan });
});
app.put("/api/topics/:name/plan", (req, res) => {
  const body = req.body;
  const ok = updatePlan(req.params.name, body.content);
  if (!ok) {
    res.status(404).json({ error: `Plan for "${req.params.name}" not found` });
    return;
  }
  res.json({ updated: true });
});
app.post("/api/execute", (req, res) => {
  const body = req.body;
  const result = executePython(body.code);
  res.json(result);
});
app.post("/api/ai/explain", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await explain(
      apiKey,
      body.conceptName,
      body.knowledgeMap,
      body.userLevel,
      body.history ?? []
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] explain error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await chat(
      apiKey,
      body.conceptName,
      body.message,
      body.history ?? []
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] chat error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/exercise", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await generateExercise(
      apiKey,
      body.conceptName,
      body.difficulty,
      body.knowledgeMap
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] exercise error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/review", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await reviewCode(
      apiKey,
      body.conceptName,
      body.userCode,
      body.exerciseGoal
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] review error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/recommend", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await recommend(
      apiKey,
      body.topicState,
      body.sessions ?? ""
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] recommend error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/knowledge-map", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await generateKnowledgeMap(apiKey, body.topicName);
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] knowledge-map error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/learning-plan", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  if (!body.topicName || typeof body.topicName !== "string") {
    res.status(400).json({ error: "topicName is required" });
    return;
  }
  try {
    const content = await generateLearningPlan(apiKey, body.topicName);
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] learning-plan error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/polish-plan", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await polishPlan(apiKey, body.currentPlan);
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] polish-plan error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/plan-from-file", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await planFromFile(apiKey, body.topicName, body.fileContent);
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] plan-from-file error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/ai/adjust-plan", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  const body = req.body;
  try {
    const content = await adjustPlan(
      apiKey,
      body.currentPlan,
      body.currentState
    );
    res.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] adjust-plan error:", message);
    res.status(500).json({ error: message });
  }
});
app.post("/api/validate-key", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key in Authorization header" });
    return;
  }
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        temperature: 0
      }),
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      res.status(response.status).json({ valid: false, error: errText });
      return;
    }
    res.json({ valid: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    res.status(500).json({ valid: false, error: message });
  }
});
app.get("/api/config/data-dir", (_req, res) => {
  res.json({ dataDir: getDataRoot() });
});
app.post("/api/config/data-dir", (req, res) => {
  const body = req.body;
  if (!body.dataDir || typeof body.dataDir !== "string") {
    res.status(400).json({ error: "dataDir (string) is required" });
    return;
  }
  const normalized = import_node_path3.default.resolve(body.dataDir);
  if (!import_node_fs3.default.existsSync(normalized)) {
    res.status(400).json({ error: `Directory does not exist: ${normalized}` });
    return;
  }
  process.env.LEARN_ANYTHING_DATA_DIR = normalized;
  invalidateTopicCache();
  const configDir = process.env.LEARN_ANYTHING_CONFIG_DIR;
  if (configDir) {
    try {
      const configPath = import_node_path3.default.join(configDir, "config.json");
      let cfg = {};
      if (import_node_fs3.default.existsSync(configPath)) {
        cfg = JSON.parse(import_node_fs3.default.readFileSync(configPath, "utf-8"));
      }
      cfg["dataDir"] = normalized;
      import_node_fs3.default.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf-8");
    } catch (err) {
      console.error("[config] Failed to write config.json:", err);
    }
  }
  const envPath = import_node_path3.default.resolve(__dirname, "..", ".env");
  try {
    let envContent = "";
    if (import_node_fs3.default.existsSync(envPath)) {
      envContent = import_node_fs3.default.readFileSync(envPath, "utf-8");
    }
    const lines = envContent.split("\n");
    const key = "LEARN_ANYTHING_DATA_DIR";
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
      if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
        lines.push("");
      }
      lines.push(`${key}=${normalized}`);
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    import_node_fs3.default.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
  } catch (err) {
    console.error("[config] Failed to write .env:", err);
  }
  res.json({ success: true, dataDir: normalized });
});
app.post("/api/save-env", (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== "string" || value === void 0 || typeof value !== "string") {
    res.status(400).json({ error: "key and value (strings) are required" });
    return;
  }
  const envPath = import_node_path3.default.resolve(__dirname, "..", ".env");
  try {
    let content = "";
    if (import_node_fs3.default.existsSync(envPath)) {
      content = import_node_fs3.default.readFileSync(envPath, "utf-8");
    }
    const lines = content.split("\n");
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith(key + "=")) {
        lines[i] = key + "=" + value;
        found = true;
        break;
      }
    }
    if (!found) {
      if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      lines.push(key + "=" + value);
    }
    import_node_fs3.default.writeFileSync(envPath, lines.join("\n"), "utf-8");
    res.json({ success: true });
  } catch (err) {
    console.error("[save-env] Failed to write .env:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to write .env" });
  }
});
app.get("/api/config/scan-topics", (_req, res) => {
  const dataRoot = getDataRoot();
  const topics = [];
  if (!import_node_fs3.default.existsSync(dataRoot)) {
    res.json({ topics });
    return;
  }
  const skipDirs = /* @__PURE__ */ new Set(["app", "docs", "node_modules", ".git", ".claude", ".superpowers"]);
  let entries;
  try {
    entries = import_node_fs3.default.readdirSync(dataRoot, { withFileTypes: true });
  } catch {
    res.json({ topics });
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || skipDirs.has(entry.name)) continue;
    const learnTopicsPath = import_node_path3.default.join(dataRoot, entry.name, ".learn", "topics");
    if (import_node_fs3.default.existsSync(learnTopicsPath)) {
      topics.push(entry.name);
    }
  }
  res.json({ topics });
});
app.use(import_express.default.static(distPath));
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const indexPath = import_node_path3.default.join(distPath, "index.html");
  if (import_node_fs3.default.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "index.html not found \u2014 did you run `npm run build`?" });
  }
});
app.use((err, _req, res, _next) => {
  console.error("[api] Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});
app.listen(PORT, () => {
  console.log(`[learn-anything] API server running at http://localhost:${PORT}`);
  console.log(`[learn-anything] Data root: ${getDataRoot()}`);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
