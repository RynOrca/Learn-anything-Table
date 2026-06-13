// ---------------------------------------------------------------------------
// SkillManager — 动态加载/热重载 YAML+Markdown 技能文件
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillFrontmatter {
  name: string;
  displayName: string;
  version: string;
  source: 'file' | 'github' | 'user' | 'builtin';
  updatedAt: string;
}

export interface SkillDefinition {
  frontmatter: SkillFrontmatter;
  prompt: string;
  filePath: string;
}

export interface SkillSummary {
  name: string;
  displayName: string;
  version: string;
  source: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Built-in fallback prompts (extracted from the old deepseek.ts constants)
// These are used when a skill file is missing or corrupted.
// ---------------------------------------------------------------------------

const BUILTIN_PROMPTS: Record<string, string> = {
  explain: `你是一位苏格拉底式编程导师，擅长用类比、图表和引导式提问进行教学。

## 核心原则
1. **优先使用视觉类比** — 将抽象概念转化为日常生活中的场景（如快递包裹、图书馆、工厂流水线）
2. **对比表格** — 在讲解相似概念时必须使用 Markdown 表格突出区别
3. **从"为什么"开始** — 先说明概念的动机和使用场景，再讲语法细节
4. **代码即文档** — 每个知识点至少配一段可运行的示例代码
5. **陷阱预警** — 明确指出新手容易犯的错误，并解释原因
6. **苏格拉底式引导** — 结束时提出 3-5 个思考题，引导学生自己推导出更深层的理解
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
- 避免冗长，每个子节控制在 10-20 行以内`,

  chat: `你是学习伙伴 "Lumi"，一位热情、耐心的编程导师。
你的教学风格活泼但专业：
- 用日常类比解释复杂概念
- 当学生困惑时换不同角度重讲
- 鼓励学生自己思考，不直接给答案
- 回答简洁有力，每次聚焦一个问题
- 使用中文回复，代码块用正确的语言标记`,

  exercise: `你是 TDD（测试驱动开发）练习生成器。根据概念和难度生成练习题。

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
- 练习应能在 15-30 分钟内完成`,

  review: `你是编程练习评审官。审查学生代码并提供建设性反馈。

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
- 使用中文`,

  recommend: `你是学习路径推荐引擎。根据用户的知识掌握状态和学习历史，推���最优下一步。

## 推荐策略
1. **广度优先** — 优先推荐同一知识分类下未探索的概念
2. **补齐短板** — 低信心的概念比高信心的优先
3. **前置依赖** — 确保推荐概念的前置概念已完成
4. **stuck 干预** — 如果用户在某概念卡住(status=stuck)，推荐先做练习巩��
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
\`\`\``,

  'knowledge-map': `你是知识体系构建专家。为指定主题生成结构化的知识地图。

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
- 总计 6-10 个分类
- 名字简明扼要（2-6 个字）
- 按学习顺序排列：基础 -> 进阶 -> 高级
- 使用中文`,

  'generate-plan': `你是学习路径设计专家。为指定主题生成系统化的学习计划。

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
- 前后依赖：后阶段的概念须以前阶段为基础`,

  'polish-plan': `你是学习计划完善专家。用户在现有计划上做了增删改，你需要帮用户完善和润色。

## 你的任务
用户会给你一份学习计划（Markdown），其中有些阶段或概念可能缺少目标描述、概念说明，或者结构不够完整。你需要：
1. 保留用户手动添加/删除的所有阶段和概念结构（不要删除用户添加的内容）
2. 为缺少"目标"的阶段自动填写合理的学习目标
3. 为缺少"- 说明"的概念自动填写一句话说明
4. 如果发现某阶段缺少必要的基础概念，在阶段末尾以注释形式建议补充：[建议补充: xxx]
5. 统一概念名称风格（简洁、2-6字、中文）
6. 确保阶段顺序逻辑递进（基础→进阶→高级）

## 输出格式
直接输出完善后的完整学习计划 Markdown，保持原有结构。修改过的地方在行末标注 [完善]。`,

  'adjust-plan': `你是学习计划调整顾问。根据当前学习进度和状态，优化学习计划。

## 调整策略
1. **加速** — 已完成的概念整体时间压缩
2. **补充** — 发现知识缺口时插入新知识点
3. **重排** — 根据实际难度重新排序
4. **拆分** — 如果某概念反复 stuck，拆分为更小的子概念

## 输出格式
直接输出调整后的完整学习计划（Markdown），保持原有结构，标注修改部分用 [调整] 标记。`,

  'plan-from-file': `你是学习路径设计专家。用户会上传一份 MD 文件内容，请你分析其中的知识点，为这些知识点设计一份系统化的学习计划。

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
- 概念使用"### N.M 概念名称"格式`,
};

const BUILTIN_META: Record<string, SkillFrontmatter> = {
  explain:        { name: 'explain',        displayName: '苏格拉底式讲解', version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  chat:           { name: 'chat',           displayName: 'Lumi 学习伙伴',   version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  exercise:       { name: 'exercise',       displayName: 'TDD 练习生成',    version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  review:         { name: 'review',         displayName: '代码评审',        version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  recommend:      { name: 'recommend',      displayName: '学习路径推荐',    version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  'knowledge-map':{ name: 'knowledge-map',  displayName: '知识体系构建',    version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  'generate-plan':{ name: 'generate-plan',  displayName: '学习计划生成',    version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  'polish-plan':  { name: 'polish-plan',    displayName: '计划完善',        version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  'adjust-plan':  { name: 'adjust-plan',    displayName: '计划调整',        version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
  'plan-from-file':{ name: 'plan-from-file',displayName: '从文件生成计划',  version: '1.0', source: 'builtin', updatedAt: '2026-06-12' },
};

/**
 * Maps short AI-query names to fully-qualified disk skill names.
 * When getPrompt('explain') is called, we first check this map to find
 * 'learn-anything-explain' on disk before falling back to builtin.
 */
const SKILL_ALIAS_MAP: Record<string, string> = {
  explain:  'learn-anything-explain',
  review:   'learn-anything-review',
  practice: 'learn-anything-practice',
  exercise: 'learn-anything-practice',  // AI queries 'exercise', disk skill is 'practice'
  topic:    'learn-anything-topic',
  status:   'learn-anything-status',
};

/** Core AI skill names that should ideally have disk overrides. */
const CORE_AI_NAMES = ['explain', 'review', 'exercise', 'topic', 'status'];

// ---------------------------------------------------------------------------
// YAML frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): { frontmatter: SkillFrontmatter | null; body: string } {
  // Support both LF and CRLF line endings
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: raw };

  const fmBlock = match[1];

  // Manual line-by-line parsing to avoid YAML ambiguity issues
  // (e.g. unquoted colons in description values like "Dual-mode: Project Mode")
  const getField = (key: string): string | undefined => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const m = fmBlock.match(re);
    return m ? m[1].trim() : undefined;
  };

  // Parse metadata sub-fields (indented under "metadata:")
  const getMetaField = (key: string): string | undefined => {
    const re = new RegExp(`^\\s+${key}:\\s*(.+)$`, 'm');
    const m = fmBlock.match(re);
    return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
  };

  const name = getField('name') ?? '';
  // Use explicit displayName if present; fallback to name (NOT description — too verbose for UI)
  const displayName = getField('displayName') ?? name;
  // Format A: version, Format B: metadata.version
  const version = getField('version') ?? getMetaField('version') ?? '1.0';
  // Format A: source, Format B: metadata.author
  const source = validateSource(getField('source') ?? getMetaField('author') ?? 'file');
  const updatedAt = getField('updatedAt') ?? new Date().toISOString().slice(0, 10);

  const fm: SkillFrontmatter = { name, displayName, version, source, updatedAt };
  return { frontmatter: fm, body: match[2] };
}

function validateSource(s: string): SkillFrontmatter['source'] {
  if (s === 'file' || s === 'github' || s === 'user' || s === 'builtin') return s;
  return 'file';
}

function serializeSkill(fm: SkillFrontmatter, prompt: string): string {
  const header = yaml.dump({
    name: fm.name,
    displayName: fm.displayName,
    version: fm.version,
    source: fm.source,
    updatedAt: fm.updatedAt,
  }, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: true });
  return `---\n${header}---\n${prompt}`;
}

// ---------------------------------------------------------------------------
// SkillManager
// ---------------------------------------------------------------------------

let _instance: SkillManager | null = null;

export class SkillManager {
  private skills = new Map<string, SkillDefinition>();
  private skillsDir: string;
  private watcher: fs.FSWatcher | null = null;

  constructor(skillsDir: string) {
    this.skillsDir = skillsDir;
  }

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  /** Load all skill .md files from skillsDir. Returns count loaded from disk. */
  async loadAll(): Promise<number> {
    // Ensure directory exists
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }

    // DO NOT auto-generate skills from builtins.
    // Users should sync from GitHub (or the builtins act as in-memory fallback).
    return this.reloadFromDisk();
  }

  /** Whether any skill files exist on disk. */
  hasSkillsOnDisk(): boolean {
    if (!fs.existsSync(this.skillsDir)) return false;
    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) return true;
      if (entry.isDirectory()) {
        const mdPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(mdPath)) return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Read
  // -----------------------------------------------------------------------

  /** Get a skill by name. Returns undefined if not loaded. */
  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /** Resolve a skill by name — exact match first, then short-name alias lookup. */
  resolve(name: string): SkillDefinition | undefined {
    // 1) Exact match (handles flat .md files and direct name equality)
    const exact = this.skills.get(name);
    if (exact) return exact;
    // 2) Alias lookup (maps short names like 'explain' → 'learn-anything-explain')
    const mappedName = SKILL_ALIAS_MAP[name];
    if (mappedName) return this.skills.get(mappedName);
    return undefined;
  }

  /** Get a skill's prompt only. Falls back to builtin if file missing. */
  getPrompt(name: string): string {
    const skill = this.resolve(name);
    if (skill) return skill.prompt;
    // Fallback to builtin
    return BUILTIN_PROMPTS[name] ?? '';
  }

  /** List all loaded skills as summaries (for API / UI). */
  list(): SkillSummary[] {
    const result: SkillSummary[] = [];
    for (const [, skill] of this.skills) {
      result.push({
        name:        skill.frontmatter.name,
        displayName: skill.frontmatter.displayName,
        version:     skill.frontmatter.version,
        source:      skill.frontmatter.source,
        updatedAt:   skill.frontmatter.updatedAt,
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Get the number of loaded skills. */
  get count(): number {
    return this.skills.size;
  }

  /** Check whether all core AI skills have disk overrides. */
  areCoreSkillsAvailable(): boolean {
    for (const name of CORE_AI_NAMES) {
      if (!this.resolve(name)) return false;
    }
    return true;
  }

  /** Return a complete status object for the API: disk skills + builtin-only fallbacks. */
  getSkillsStatus() {
    const diskSkills = this.list();
    // Collect builtins that are NOT covered by any disk skill
    const builtins: SkillSummary[] = [];
    for (const [name, meta] of Object.entries(BUILTIN_META)) {
      if (!this.resolve(name)) {
        builtins.push({
          name:        meta.name,
          displayName: meta.displayName,
          version:     meta.version,
          source:      meta.source,
          updatedAt:   meta.updatedAt,
        });
      }
    }
    return {
      skills: diskSkills,
      builtins,
      count: this.skills.size,
      hasSkillsOnDisk: this.hasSkillsOnDisk(),
      needsSync: !this.areCoreSkillsAvailable(),
    };
  }

  // -----------------------------------------------------------------------
  // Write
  // -----------------------------------------------------------------------

  /** Write a skill to disk (subdirectory format: name/SKILL.md) and update cache. */
  async writeSkill(fm: SkillFrontmatter, prompt: string): Promise<void> {
    const content = serializeSkill(fm, prompt);
    const dirPath = path.join(this.skillsDir, fm.name);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, 'SKILL.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    this.skills.set(fm.name, { frontmatter: fm, prompt, filePath });
  }

  /** Delete a skill from disk. Supports both subdirectory and flat .md formats. */
  deleteSkill(name: string): boolean {
    // Try subdirectory format first (preferred)
    const dirPath = path.join(this.skillsDir, name);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      fs.rmSync(dirPath, { recursive: true });
      this.skills.delete(name);
      return true;
    }
    // Fallback to flat .md format (legacy)
    const filePath = path.join(this.skillsDir, `${name}.md`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    this.skills.delete(name);
    return true;
  }

  // -----------------------------------------------------------------------
  // Hot reload
  // -----------------------------------------------------------------------

  /** Reload all skills from disk. Returns count loaded. */
  reloadFromDisk(): number {
    this.skills.clear();

    if (!fs.existsSync(this.skillsDir)) return 0;

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      let filePath: string;
      let skillName: string;

      if (entry.isDirectory()) {
        // Format B: .claude/skills/ style — directory with SKILL.md inside
        const mdPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(mdPath)) continue;
        filePath = mdPath;
        skillName = entry.name;
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Format A: flat .md file
        filePath = path.join(this.skillsDir, entry.name);
        skillName = entry.name.replace(/\.md$/, '');
      } else {
        continue;
      }

      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(raw);
        const name = frontmatter?.name ?? skillName;
        const def: SkillDefinition = {
          frontmatter: frontmatter ?? {
            name,
            displayName: name,
            version: '1.0',
            source: 'file',
            updatedAt: '',
          },
          prompt: body.trim(),
          filePath,
        };
        this.skills.set(name, def);
      } catch {
        // Skip corrupted files
      }
    }

    return this.skills.size;
  }

  /** Start fs.watch on the skills directory (debounced 300ms). */
  startWatching(): void {
    if (this.watcher) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    this.watcher = fs.watch(this.skillsDir, (_event, _filename) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        this.reloadFromDisk();
      }, 300);
    });
  }

  /** Stop fs.watch. */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // -----------------------------------------------------------------------
  // Static
  // -----------------------------------------------------------------------

  /** Get or create the singleton instance. */
  static getInstance(skillsDir?: string): SkillManager {
    if (!_instance) {
      _instance = new SkillManager(skillsDir ?? path.join(process.env.LEARN_ANYTHING_DATA_DIR ?? path.resolve(process.cwd(), '..'), '.learn', 'skills'));
    }
    return _instance;
  }

  /** Check if a given name has a builtin fallback. */
  static hasBuiltin(name: string): boolean {
    return name in BUILTIN_PROMPTS;
  }
}

// ---------------------------------------------------------------------------
// Singleton getter (used by deepseek.ts and index.ts)
// ---------------------------------------------------------------------------

let _singleton: SkillManager | null = null;

export function getSkillManager(): SkillManager {
  if (!_singleton) {
    const skillsDir = path.join(
      process.env.LEARN_ANYTHING_DATA_DIR ?? path.resolve(process.cwd(), '..'),
      '.learn',
      'skills',
    );
    _singleton = new SkillManager(skillsDir);
    _singleton.reloadFromDisk(); // Load skills immediately on first access
  }
  return _singleton;
}

export async function initSkillManager(): Promise<SkillManager> {
  const mgr = getSkillManager();
  await mgr.loadAll();
  return mgr;
}
