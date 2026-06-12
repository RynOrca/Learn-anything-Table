// ---------------------------------------------------------------------------
// PromptBuilder — assemble final system prompt with Context7 + annotation rules
// ---------------------------------------------------------------------------

import { getSkillManager } from './skills.js';
import { getContext7Service } from './context7.js';
import type { Context7QueryResult, DocSnippet } from './context7.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AICallMeta {
  degraded: boolean;
  degradationReason?: string;
  verifiedSources: string[];
  context7Used: boolean;
}

export interface BuiltPrompt {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  meta: AICallMeta;
}

// ---------------------------------------------------------------------------
// Annotation rule templates
// ---------------------------------------------------------------------------

const ANNOTATION_RULES_WITH_CONTEXT7 = `
---
## 📋 实时文档上下文
以下内容来自 Context7 官方文档查询，标记为 📋 的内容已通过官方文档验证：

{contextText}

## ⚠️ 标注规则
- 基于上述实时文档的内容必须标注来源链接
- 基于你训练数据（非上述文档验证）的内容必须标注 ⚠️ [未经验证]
- 如果你不确定某条信息的准确性，必须明确说明并标注 ⚠️ [推断内容]
- API 细节、版本相关特性、性能数据等容易过时的信息必须标注 ⚠️ [需验证版本]
`;

const ANNOTATION_RULES_WITHOUT_CONTEXT7 = `
---
## ⚠️ 标注规则（无实时文档验证）
由于无法获取最新官方文档，你的回复完全基于训练数据。你必须严格遵守：

1. **核心概念**（语言基础语法、通用算法等不随版本变化的内容）→ 正常讲解，无需标注
2. **API 细节、版本特性、性能数据** → 必须标注 ⚠️ [未经验证，请以官方文档为准]
3. **最佳实践建议、框架用法** → 必须标注 ⚠️ [基于训练数据，非实时文档]
4. **不确定或推测的内容** → 必须标注 ⚠️ [推断内容，建议查阅官方文档]
5. 如果用户问的是最新版本特性而你无法确认 → 明确说明并标注 ⚠️ [版本信息可能已过时]
`;

const ANNOTATION_RULES_CONTEXT7_UNAVAILABLE = `
---
## ⚠️ 标注规则（Context7 不可用）
{reason}

你的回复完全基于训练数据。你必须严格遵守：

1. **核心概念**（语言基础语法、通用算法等不随版本变化的内容）→ 正常讲解
2. **API 细节、版本特性、性能数据** → 必须标注 ⚠️ [未经验证]
3. **不确定或推测的内容** → 必须标注 ⚠️ [推断内容，建议查阅官方文档]
4. 回复开头请添加：> ⚠️ 注意：本回复基于 AI 训练数据生成，未经过实时官方文档验证。关键信息请以官方文档为准。
`;

// ---------------------------------------------------------------------------
// PromptBuilder
// ---------------------------------------------------------------------------

/**
 * Build the final AI prompt by combining:
 * 1. Base skill system prompt from SkillManager
 * 2. Context7 documentation context (if available)
 * 3. Annotation rules for uncertainty marking
 */
export function buildPrompt(
  skillName: string,
  userMessageContent: string,
  context7Result?: Context7QueryResult,
): BuiltPrompt {
  // 1. Get the base system prompt
  const mgr = getSkillManager();
  let systemPrompt = mgr.getPrompt(skillName);

  // 2. Build meta
  const meta: AICallMeta = {
    degraded: true,
    degradationReason: 'Context7 not used',
    verifiedSources: [],
    context7Used: false,
  };

  // 3. Append Context7 context + annotation rules
  if (context7Result) {
    meta.context7Used = true;

    if (!context7Result.degraded && context7Result.snippets.length > 0) {
      // Context7 available and returned results ✅
      const ctx7 = getContext7Service();
      const { contextText, verifiedSources } = ctx7.buildContextAugmentation(context7Result);
      meta.degraded = false;
      meta.verifiedSources = verifiedSources;

      const annotationBlock = ANNOTATION_RULES_WITH_CONTEXT7.replace(
        '{contextText}',
        contextText,
      );
      systemPrompt += annotationBlock;
    } else if (context7Result.degraded) {
      // Context7 was attempted but failed or returned no results
      meta.degraded = true;
      meta.degradationReason = context7Result.degradationReason;

      const annotationBlock = ANNOTATION_RULES_CONTEXT7_UNAVAILABLE.replace(
        '{reason}',
        context7Result.degradationReason ?? '服务不可用',
      );
      systemPrompt += annotationBlock;
    }
  } else {
    // Context7 not used at all (not configured or not requested)
    meta.degraded = true;
    meta.degradationReason = '未配置 Context7';
    systemPrompt += ANNOTATION_RULES_WITHOUT_CONTEXT7;
  }

  // 4. Build the messages array
  return {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent },
    ],
    meta,
  };
}

// ---------------------------------------------------------------------------
// Post-processing: ensure annotation banner is present when degraded
// ---------------------------------------------------------------------------

/**
 * Post-process the AI response to ensure the degradation warning is visible.
 * If the AI didn't include the banner, prepend it.
 */
export function postProcessResponse(content: string, meta: AICallMeta): string {
  if (!meta.degraded) {
    // Context7 verified — add source footer
    if (meta.verifiedSources.length > 0) {
      const sources = meta.verifiedSources.map((url, i) => `- [📋 验证来源 ${i + 1}](${url})`).join('\n');
      if (!content.includes('验证来源')) {
        content += `\n\n---\n### 📋 实时文档来源\n${sources}`;
      }
    }
    return content;
  }

  // Degraded — ensure warning banner is present
  const banner = `> ⚠️ **注意：本回复基于 AI 训练数据生成，未经过实时官方文档验证。关键信息请以官方文档为准。**\n\n`;
  if (!content.includes('⚠️') && !content.includes('未经验证')) {
    // AI didn't include any annotation — prepend warning banner
    content = banner + content;
  } else if (!content.includes('基于 AI 训练数据') && !content.includes('未经过实时')) {
    // AI annotated but we still want the banner
    content = banner + content;
  }

  return content;
}
