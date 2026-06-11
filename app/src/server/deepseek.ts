// ---------------------------------------------------------------------------
// DeepSeek API client
// ---------------------------------------------------------------------------

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
// System prompts (Chinese, Socratic style)
// ---------------------------------------------------------------------------

const EXPLAIN_SYSTEM = `你是一位苏格拉底式编程导师，擅长用类比、图表和引导式提问进行教学。

## 核心原则
1. **优先使用视觉类比** — 将抽象概念转化为日常生活中的场景（如快递包裹、图书馆、工厂流水线）
2. **对比表格** — 在讲解相似概念时必须使用 Markdown 表格突出区别
3. **从"为什么"开始** — 先说明概念的动机和使用场景，再讲语法细节
4. **代码即文档** — 每个知识点至少配一段可运行的示例代码
5. **陷阱预警** — 明确指出新手容易犯的错误，并解释原因
6. **苏格拉底式引导** — 结���时提出 3-5 个思考题，引导学生自己推导出更深层的理解
7. **情绪感知** — 用户说"还是不懂"时，换一个完全不同的角度再讲，降低抽象层次

## 输出结构
- 一、定位：此概念在知识地图中的位置
- 二、类比：生活化场景 -> Python 概念映射表
- 三、核心机制：原理讲解（尽量用表格和对比）
- 四、代码实战：从简单到复杂的可运行示例
- 五、⚠️ 常见陷阱
- 六、🤔 Socratic 检验：引导式思考题
- 七、总结卡片（ASCII 框图）
- 八、下一步探索建议

## 输出要求
- 全部使用中文（代码中的注释也用中文）
- 用 Markdown 格式输出，充分利用表格、代码块、引用
- 避免冗长，每个子节控制在 10-20 行以内`;

const CHAT_SYSTEM = `你是学习伙伴 "Lumi"，一位热情、耐心的编程导师。
你的教学风格活泼但专业：
- 用日常类比解释复杂概念
- 当学生困惑时换不同角度重讲
- 鼓励学生自己思考，不直接给答案
- 回答简洁有力，每次聚焦一个问题
- 使用中文回复，代码块用正确的语言标记`;

const EXERCISE_SYSTEM = `你是 TDD（测试驱动开发）练习生成器。根据概念和难度生成练习题。

## 输出格式（严格遵循）
\`\`\`markdown
# {概念名} — TDD 练习

## 🎯 练习目标
{一句话说明}

## 📋 任务描述
{详细描述要实现什么}

## ✅ 验收测试（必须先写！）
\`\`\`python
import pytest

def test_xxx():
    """测试描述"""
    assert ...
\`\`\`

## 🧩 代码模板
\`\`\`python
# 请在下方完成你的实现
def xxx():
    pass
\`\`\`

## 💡 提示（如果卡住再看）
<details>
<summary>点击查看提示</summary>
{分阶段的渐进提示}
</details>
\`\`\`

## 难度等级
- 入门：单一函数，逻辑简单，3-5 个测试
- 进阶：多函数协作，边界条件处理，5-8 个测试
- 挑战：设计模式/算法，多文件结构，8+ 个测试

## 要求
- 测试必须真实可运行，输入输出明确
- 代码模板要有足够的引导但不过度填充
- 使用中文描述
- 练习应能在 15-30 分钟内完成`;

const REVIEW_SYSTEM = `你是编程练习评审官。审查学生代码并提供建设性反馈。

## 评审维度
1. **正确性** — 是否通过验收测试？逻辑是否正确？
2. **代码风格** — 是否遵循 PEP 8？命名、缩进、空格？
3. **效率** — 时间复杂度是否合理？有无冗余操作？
4. **Pythonic** — 是否利用 Python 特性（推导式、解包、with 等）？
5. **可读性** — 变量名是否清晰？是否需要注释？

## 输出格式
\`\`\`markdown
# 代码评审：{概念名}

## 📊 评分
| 维度 | 评分(1-5) | 说明 |
|------|----------|------|
| 正确性 | ⭐⭐⭐⭐⭐ | ... |
| 代码风格 | ⭐⭐⭐⭐⭐ | ... |
| 效率 | ⭐⭐⭐⭐⭐ | ... |
| Pythonic | ⭐⭐⭐⭐⭐ | ... |
| 可读性 | ⭐⭐⭐⭐⭐ | ... |

## ✅ 做得好的地方
- {具体表扬}

## 🔧 可以改进的地方
1. {具体建议 + 代码对比}

## 💡 "更 Pythonic 的写法"
\`\`\`python
# 你的写法
...
# 推荐写法
...
\`\`\`
\`\`\`

## 风格
- 先肯定再改进（三明治反馈法）
- 每个建议附带具体代码示例
- 使用中文`;

const RECOMMEND_SYSTEM = `你是学习路径推荐引擎。根据用户的知识掌握状态和学习历史，推荐最优下一步。

## 推荐策略
1. **广度优先** — 优先推荐同一知识分类下未探索的概念
2. **补齐短板** — 低信心的概念比高信心的优先
3. **前置依赖** — 确保推荐概念的前置概念已完成
4. **stuck 干预** — 如果用户在某概念卡住(status=stuck)，推荐先做练习巩固
5. **间隔重复** — 对已完成但 last_practiced 超过 3 天的概念提醒复习

## 输出格式
\`\`\`markdown
# 学习推荐

## 🔥 当前优先
1. **{概念名}** — {原因}（推荐动作：{explain/practice/review}）

## 📚 可探索的新概念
- {概念名}：{简要说明}

## 🔄 建议复习
- {概念名}：{上次练习日期}，建议重温
\`\`\``;

const KNOWLEDGE_MAP_SYSTEM = `你是知识体系构建专家。为指定主题生成结构化的知识地图。

## 输出格式
\`\`\`markdown
# {主题名} 知识地图

## 分类1
- 概念1-1
  - 子要点1
  - 子要点2
- 概念1-2
  - 子要点1
  - 子要点2

## 分类2
- 概念2-1
  - ...
\`\`\`

## 规则
- 每个大类下 3-6 个概念
- 统计 6-10 个分类
- 名字简明扼要（2-6 个字）
- 按学习顺序排列：基础 -> 进阶 -> 高级
- 使用中文`;

const GENERATE_PLAN_SYSTEM = `你是学习路径设计专家。为指定主题生成系统化的学习计划。

## 输出格式（严格遵守）
\`\`\`markdown
# {主题名} 学习计划

> **创建日期**: YYYY-MM-DD
> **起点**: {描述初学者的前置知识，默认"零基础"}
> **目标**: {描述学完后能达到的水平}

---

## 阶段一：阶段名称
> 目标：此阶段学习目标的一句话说明

### 1.1 概念名称
- 概念简要说明（一句话）

### 1.2 概念名称
- 概念简要说明（一句话）

---

## 阶段二：阶段名称
> 目标：此阶段学习目标的一句话说明

### 2.1 概念名称
- 概念简要说明（一句话）
\`\`\`

## 规则
- 生成 3-6 个阶段，呈递进关系（基础 → 进阶 → 高级）
- 每个阶段 3-8 个概念，每个概念名称 2-6 个字
- 每个概念后紧跟一条"-"开头的简要说明
- 起点默认描述为"零基础"，但可根据主题调整
- 目标描述应具体可衡量
- 只输出上述格式的内容，不要输出任何额外的解释或前言
- 使用中文
- 概念名称不要带编号，编号由系统自动添加

## 教学原则
- 广度优先：覆盖主题核心领域
- 实用导向：优先纳入能直接动手实践的知识
- 前后依赖：后阶段的概念须以前阶段为基础`;

const POLISH_PLAN_SYSTEM = `你是学习计划完善专家。用户在现有计划上做了增删改，你需要帮用户完善和润色。

## 你的任务
用户会给你一份学习计划（Markdown），其中有些阶段或概念可能缺少目标描述、概念说明，或者结构不够完整。你需要：
1. 保留用户手动添加/删除的所有阶段和概念结构（不要删除用户添加的内容）
2. 为缺少"目标"的阶段自动填写合理的学习目标
3. 为缺少"- 说明"的概念自动填写一句话说明
4. 如果发现某阶段缺少必要的基础概念，在阶段末尾以注释形式建议补充：[建议补充: xxx]
5. 统一概念名称风格（简洁、2-6字、中文）
6. 确保阶段顺序逻辑递进（基础→进阶→高级）

## 输出格式
直接输出完善后的完整学习计划 Markdown，保持原有结构。修改过的地方在行末标注 [完善]。`;

const ADJUST_PLAN_SYSTEM = `你是学习计划调整顾问。根据当前学习进度和状态，优化学习计划。

## 调整策略
1. **加速** — 已完成的概念整体时间压缩
2. **补充** — 发现知识缺口时插入新知识点
3. **重排** — 根据实际难度重新排序
4. **拆分** — 如果某概念反复 stuck，拆分为更小的子概念

## 输出格式
直接输出调整后的完整学习计划（Markdown），保持原有结构，标注修改部分用 [调整] 标记。`;

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
    { role: 'system', content: EXPLAIN_SYSTEM },
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
    { role: 'system', content: CHAT_SYSTEM },
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
    { role: 'system', content: EXERCISE_SYSTEM },
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
    { role: 'system', content: REVIEW_SYSTEM },
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
    { role: 'system', content: RECOMMEND_SYSTEM },
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
    { role: 'system', content: KNOWLEDGE_MAP_SYSTEM },
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
    { role: 'system', content: GENERATE_PLAN_SYSTEM },
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
    { role: 'system', content: ADJUST_PLAN_SYSTEM },
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
    { role: 'system', content: POLISH_PLAN_SYSTEM },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096, 0.7, 60000);
}

const PLAN_FROM_FILE_SYSTEM = `你是学习路径设计专家。用户会上传一份 MD 文件内容，请你分析其中的知识点，为这些知识点设计一份系统化的学习计划。

## 输出格式（严格遵守）
只输出以下格式的 Markdown 内容，不要输出任何额外的解释或前言：

\`\`\`markdown
# {主题名} 学习计划

> **创建日期**: YYYY-MM-DD
> **起点**: {描述初学者的前置知识，默认"零基础"}
> **目标**: {描述学完后能达到的水平}

---

## 阶段一：阶段名称
> 目标：此阶段学习目标的一句话说明

### 1.1 概念名称
- 概念简要说明（一句话）

### 1.2 概念名称
- 概念简要说明（一句话）

---

## 阶段二：阶段名称
> 目标：此阶段学习目标的一句话说明

### 2.1 概念名称
- 概念简要说明（一句话）
\`\`\`

## 规则
- 从上传的文件内容中提取所有出现的知识点
- 按学习顺序排列：基础 -> 进阶 -> 高级
- 生成 3-6 个阶段，每个阶段 3-8 个概念
- 每个概念后紧跟一条"-"开头的简要说明
- 概念名称 2-6 个字，不要带编号（编号由系统自动添加）
- 起点默认描述为"零基础"，但可根据主题调整
- 目标描述应具体可衡量
- 使用中文
- 阶段使用"## 阶段N：名称"格式，N为中文数字（一、二、三...）
- 概念使用"### N.M 概念名称"格式`;

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
    { role: 'system', content: PLAN_FROM_FILE_SYSTEM },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(apiKey, messages, 4096, 0.7, 60000);
}
