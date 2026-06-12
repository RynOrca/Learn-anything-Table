// ---------------------------------------------------------------------------
// DeepSeek API client
// ---------------------------------------------------------------------------

import { getSkillManager } from './skills.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callDeepSeek(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens = 4096,
  temperature = 0.7,
  timeoutMs = 30000,
): Promise<string> {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? '';
}

// ---------------------------------------------------------------------------
// System prompts — loaded dynamically from SkillManager (.learn/skills/*.md)
// Fallback builtins are embedded in skills.ts
// ---------------------------------------------------------------------------

function getSystemPrompt(skillName: string): string {
  const mgr = getSkillManager();
  return mgr.getPrompt(skillName);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function explain(
  apiKey: string,
  conceptName: string,
  knowledgeMap: string,
  userLevel: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<string> {
  const userMessage = `请讲解概念：**${conceptName}**

知识地图（上下文）：
\`\`\`markdown
${knowledgeMap}
\`\`\`

学习者水平：${userLevel}

请按照你的教学结构，用苏格拉底式教学法讲解此概念。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('explain') },
    ...history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096);
}

export async function chat(
  apiKey: string,
  conceptName: string,
  message: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<string> {
  const userMessage = `当前讨论的概念：${conceptName}\n\n${message}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('chat') },
    ...history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 2048);
}

export async function generateExercise(
  apiKey: string,
  conceptName: string,
  difficulty: string,
  knowledgeMap: string,
): Promise<string> {
  const userMessage = `请为概念 **${conceptName}** 生成一个 TDD 练习。

难度：${difficulty}

相关知识上下文：
\`\`\`markdown
${knowledgeMap}
\`\`\`

请严格按照 TDD 格式输出，包含验收测试和代码模板。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('exercise') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096);
}

export async function reviewCode(
  apiKey: string,
  conceptName: string,
  userCode: string,
  exerciseGoal: string,
): Promise<string> {
  const userMessage = `请评审以下代码：

概念：${conceptName}
练习目标：${exerciseGoal}

\`\`\`python
${userCode}
\`\`\``;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('review') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096);
}

export async function recommend(
  apiKey: string,
  topicState: string,
  sessions: string,
): Promise<string> {
  const userMessage = `当前学习状态：

## 知识状态
\`\`\`yaml
${topicState}
\`\`\`

## 学习历史
${sessions || '(暂无学习记录)'}

请分析上述状态，推荐最优的下一步学习路径。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('recommend') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 2048);
}

export async function generateKnowledgeMap(
  apiKey: string,
  topicName: string,
): Promise<string> {
  const userMessage = `请为主题 **${topicName}** 生成完整知识地图。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('knowledge-map') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096);
}

export async function generateLearningPlan(
  apiKey: string,
  topicName: string,
): Promise<string> {
  const userMessage = `请为主题 **${topicName}** 设计一份完整的学习计划，包含阶段划分和概念列表。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('generate-plan') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096, 0.8, 60000);
}

export async function adjustPlan(
  apiKey: string,
  currentPlan: string,
  currentState: string,
): Promise<string> {
  const userMessage = `当前学习计划：
\`\`\`markdown
${currentPlan}
\`\`\`

当前学习状态：
\`\`\`yaml
${currentState}
\`\`\`

请根据当前进展优化学习计划。标注所有 [调整] 的地方。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('adjust-plan') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096);
}

export async function polishPlan(
  apiKey: string,
  currentPlan: string,
): Promise<string> {
  const userMessage = `请完善以下学习计划，补充缺失的目标和概念说明：

\`\`\`markdown
${currentPlan}
\`\`\`

请保留所有现有的阶段和概念结构，只补充和完善内容。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('polish-plan') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096, 0.7, 60000);
}

export async function planFromFile(
  apiKey: string,
  topicName: string,
  fileContent: string,
): Promise<string> {
  const truncated = fileContent.length > 8000 ? fileContent.slice(0, 8000) + '\n\n...(内容已截断)' : fileContent;
  const userMessage = `请根据以下文件内容，为主题 **${topicName}** 设计一份完整的学习计划：

\`\`\`markdown
${truncated}
\`\`\``;

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt('plan-from-file') },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096, 0.7, 60000);
}
