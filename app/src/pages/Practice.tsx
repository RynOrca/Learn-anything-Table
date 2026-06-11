import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLearningStore } from '../store/useLearningStore';
import * as deepseekApi from '../api/deepseek';
import * as filesApi from '../api/files';
import CodeEditor from '../components/CodeEditor';
import type { ExercisePrompt, AIReviewResult } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  unexplored: '未探索',
  in_progress: '学习中',
  needs_practice: '需练习',
  mastered: '已掌握',
};

const ASSESSMENT_CONFIG: Record<string, { color: string; label: string; confidenceChange: number }> = {
  excellent: { color: 'var(--color-accent-green)', label: '优秀', confidenceChange: 15 },
  good: { color: 'var(--color-accent-blue)', label: '良好', confidenceChange: 5 },
  needs_work: { color: 'var(--color-accent-yellow)', label: '需改进', confidenceChange: -5 },
};

// ---------------------------------------------------------------------------
// Section extraction helper
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(md: string, headingPatterns: string[]): string | null {
  for (const h of headingPatterns) {
    const regex = new RegExp(
      `##\\s*${escapeRegex(h)}[^\\n]*\\n+([\\s\\S]*?)(?=\\n##|$)`,
      'i',
    );
    const match = md.match(regex);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function extractBulletPoints(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('-') ||
        trimmed.startsWith('*') ||
        /^\d+\./.test(trimmed)
      );
    })
    .map((line) => line.replace(/^[\s\d.\-*]+/, '').trim())
    .filter(Boolean);
}

function extractPythonCodeBlock(md: string): string | null {
  const match = md.match(/```python\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Markdown parsers: extract typed data from AI responses
// ---------------------------------------------------------------------------

function parseExercise(md: string): ExercisePrompt {
  const goal = extractSection(md, ['🎯 练习目标', '练习目标']) ?? '';
  const background =
    extractSection(md, ['📋 任务描述', '任务描述']) ?? '';

  // Try to find requirements from the 验收测试 or 任务描述 sections
  const testSection =
    extractSection(md, ['✅ 验收测试（必须先写！）', '✅ 验收测试', '验收测试']) ?? '';
  const requirements = extractBulletPoints(testSection || background);

  // Hints from 💡 section
  const hintsSection = extractSection(md, ['💡 提示（如果卡住再看）', '💡 提示', '提示']) ?? '';
  const hints = extractBulletPoints(hintsSection);

  // Starter code: prefer code block after 代码模板, fallback to first python code block
  let starterCode = '# 请在此编写你的 Python 代码\n';
  const templateIdx = md.search(/代码模板/);
  if (templateIdx >= 0) {
    const afterTemplate = md.slice(templateIdx);
    const code = extractPythonCodeBlock(afterTemplate);
    if (code) starterCode = code;
  } else {
    const code = extractPythonCodeBlock(md);
    if (code) starterCode = code;
  }

  return { goal, background, requirements, hints, starterCode };
}

function parseReview(md: string): AIReviewResult {
  const acknowledgment =
    extractSection(md, ['✅ 做得好的地方', '做得好的地方']) ?? '';

  const improveSection =
    extractSection(md, ['🔧 可以改进的地方', '可以改进的地方']) ?? '';
  const socraticFollowUp = improveSection;
  const edgeCases = extractBulletPoints(improveSection);

  const codeQualityTip =
    extractSection(md, ['💡 "更 Pythonic 的写法"', '💡 更 Pythonic 的写法', '💡']) ?? '';

  // Derive assessment from content heuristics
  let assessment: AIReviewResult['assessment'] = 'good';
  const lower = md.toLowerCase();
  // Check for scoring table
  if (md.includes('评分') || md.includes('⭐')) {
    // Count stars or check for excellence indicators
    const starCount = (md.match(/⭐/g) ?? []).length;
    if (starCount >= 20) {
      assessment = 'excellent';
    } else if (starCount <= 10) {
      assessment = 'needs_work';
    }
  }
  if (
    lower.includes('出色') ||
    lower.includes('完美') ||
    lower.includes('非常好') ||
    lower.includes('几乎完美')
  ) {
    assessment = 'excellent';
  } else if (
    lower.includes('较多问题') ||
    lower.includes('严重') ||
    lower.includes('需要大幅') ||
    lower.includes('重写')
  ) {
    assessment = 'needs_work';
  }

  const conf = ASSESSMENT_CONFIG[assessment].confidenceChange;

  return {
    acknowledgment,
    socraticFollowUp,
    edgeCases: edgeCases.length > 0 ? edgeCases : ['请参考上方改进建议'],
    codeQualityTip,
    assessment,
    confidenceChange: conf,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: 64,
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--font-size-base)',
};

export default function Practice() {
  const {
    state,
    knowledgeMap,
    topicName,
    saveSession,
    updateConceptStatus,
  } = useLearningStore();

  const [selectedConceptPath, setSelectedConceptPath] = useState('');
  const [exercise, setExercise] = useState<ExercisePrompt | null>(null);
  const [exerciseRaw, setExerciseRaw] = useState('');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [review, setReview] = useState<AIReviewResult | null>(null);
  const [reviewRaw, setReviewRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const concepts = state?.concepts ?? [];
  const selectedConcept = concepts.find((c) => c.path === selectedConceptPath);

  // -------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------

  function getDifficulty(): string {
    if (!selectedConcept) return 'beginner';
    const conf = selectedConcept.confidence;
    if (conf < 0.3) return 'beginner';
    if (conf < 0.7) return 'intermediate';
    return 'challenge';
  }

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!selectedConceptPath || !topicName || loading) return;
    setErrorMsg('');
    setExercise(null);
    setExerciseRaw('');
    setCode('');
    setOutput('');
    setReview(null);
    setReviewRaw('');
    setShowHints(false);
    setLoading(true);
    setLoadingLabel('AI 出题中...');

    try {
      const difficulty = getDifficulty();
      const raw = await deepseekApi.generateExercise(
        selectedConceptPath,
        difficulty,
        knowledgeMap ?? '',
      );
      const parsed = parseExercise(raw);
      setExercise(parsed);
      setExerciseRaw(raw);
      setCode(parsed.starterCode);
    } catch (e) {
      setErrorMsg(`出题失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  const handleRun = async () => {
    if (!code.trim() || loading) return;
    setErrorMsg('');
    setOutput('');
    setLoading(true);
    setLoadingLabel('代码运行中...');

    try {
      const result = await filesApi.executePython(code);
      const lines: string[] = [];
      if (result.stdout) {
        lines.push('--- stdout ---');
        lines.push(result.stdout);
      }
      if (result.stderr) {
        lines.push('--- stderr ---');
        lines.push(result.stderr);
      }
      if (result.timedOut) {
        lines.push('[执行超时]');
      }
      if (!result.stdout && !result.stderr) {
        lines.push(`(exit code: ${result.exitCode})`);
      }
      setOutput(lines.join('\n'));
    } catch (e) {
      setOutput(`运行失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  const handleReview = async () => {
    if (!code.trim() || !exercise || !selectedConceptPath || loading) return;
    setErrorMsg('');
    setReview(null);
    setReviewRaw('');
    setLoading(true);
    setLoadingLabel('AI 审阅中...');

    try {
      const goalText = exercise.goal || exercise.background || '代码练习';
      const rawReview = await deepseekApi.reviewCode(
        selectedConceptPath,
        code,
        goalText,
      );
      const parsed = parseReview(rawReview);
      setReview(parsed);
      setReviewRaw(rawReview);
    } catch (e) {
      setErrorMsg(`审阅失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  const handleSubmit = async () => {
    if (!topicName || !selectedConceptPath || !exercise || loading) return;
    setErrorMsg('');
    setLoading(true);
    setLoadingLabel('保存中...');

    try {
      // Build session content
      const parts: string[] = [];
      parts.push(`# 练习：${selectedConceptPath}`);
      parts.push('');
      parts.push('## 练习题目');
      parts.push(exerciseRaw || `目标：${exercise.goal}\n\n${exercise.background}`);
      parts.push('');
      parts.push('## 我的代码');
      parts.push('```python');
      parts.push(code);
      parts.push('```');
      if (output) {
        parts.push('');
        parts.push('## 运行输出');
        parts.push('```');
        parts.push(output);
        parts.push('```');
      }
      if (reviewRaw) {
        parts.push('');
        parts.push('## AI 审阅');
        parts.push(reviewRaw);
      }

      await saveSession(selectedConceptPath, 'practice', parts.join('\n'));

      // Update concept status based on review assessment
      if (review && selectedConcept) {
        const newConfidence = Math.min(
          100,
          Math.max(0, selectedConcept.confidence + review.confidenceChange),
        );

        let newStatus = selectedConcept.status;
        if (review.assessment === 'excellent') {
          newStatus = 'mastered';
        } else if (review.assessment === 'needs_work') {
          newStatus = 'needs_practice';
        } else if (selectedConcept.status === 'unexplored') {
          newStatus = 'in_progress';
        }

        await updateConceptStatus(selectedConceptPath, newStatus, newConfidence);
      }

      setErrorMsg('保存成功');
      setTimeout(() => setErrorMsg(''), 3000);
    } catch (e) {
      setErrorMsg(`保存失败：${(e as Error).message}`);
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  };

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------

  const btnBase: React.CSSProperties = {
    padding: '8px 18px',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-serif)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, background 0.15s',
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const sectionCard: React.CSSProperties = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 'var(--font-size-md)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 10,
  };

  // -------------------------------------------------------------------
  // No topic loaded
  // -------------------------------------------------------------------

  if (!topicName) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        请先在顶部选择一个学习主题
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '24px 32px 40px',
        fontFamily: 'var(--font-serif)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ================================================================ */}
      {/*  Concept selector + Generate button                               */}
      {/* ================================================================ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <label
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          练习概念
        </label>
        <select
          value={selectedConceptPath}
          onChange={(e) => {
            setSelectedConceptPath(e.target.value);
            setExercise(null);
            setExerciseRaw('');
            setCode('');
            setOutput('');
            setReview(null);
            setReviewRaw('');
            setShowHints(false);
            setErrorMsg('');
          }}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
          }}
        >
          <option value="">-- 选择要练习的概念 --</option>
          {concepts.map((c) => (
            <option key={c.path} value={c.path}>
              {c.path} [{STATUS_LABEL[c.status] ?? c.status}]
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={!selectedConceptPath || loading}
          style={!selectedConceptPath || loading ? btnDisabled : btnBase}
        >
          AI 出题
        </button>
      </div>

      {/* ================================================================ */}
      {/*  Error message                                                    */}
      {/* ================================================================ */}
      {errorMsg && (
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background:
              errorMsg === '保存成功'
                ? 'var(--color-bg-green)'
                : 'var(--color-bg-yellow)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            color:
              errorMsg === '保存成功'
                ? 'var(--color-accent-green)'
                : 'var(--color-accent-yellow)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* ================================================================ */}
      {/*  Loading indicator                                                */}
      {/* ================================================================ */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {loadingLabel}
        </div>
      )}

      {/* ================================================================ */}
      {/*  No exercise yet - prompt to select concept                       */}
      {/* ================================================================ */}
      {!exercise && !loading && (
        <div style={{ ...centerStyle, color: 'var(--color-text-secondary)', height: 'auto', padding: '60px 24px' }}>
          {selectedConceptPath
            ? `点击「AI 出题」为「${selectedConceptPath}」生成练习题`
            : '请选择一个概念，然后点击「AI 出题」开始练习'}
        </div>
      )}

      {/* ================================================================ */}
      {/*  Exercise card                                                    */}
      {/* ================================================================ */}
      {exercise && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}>{selectedConceptPath} -- 练习</h2>

          {/* Goal */}
          {exercise.goal && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--color-accent-blue)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                练习目标
              </p>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.7,
                }}
              >
                {exercise.goal}
              </p>
            </div>
          )}

          {/* Background */}
          {exercise.background && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                任务描述
              </p>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const isBlock = className?.startsWith('language-');
                      if (isBlock) {
                        return (
                          <pre
                            style={{
                              background: 'var(--color-bg-page)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 14px',
                              overflow: 'auto',
                              fontSize: 'var(--font-size-xs)',
                              fontFamily: 'var(--font-mono)',
                              margin: '6px 0',
                            }}
                          >
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                      return (
                        <code
                          style={{
                            background: 'var(--color-bg-page)',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontSize: 'var(--font-size-xs)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {exercise.background}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Requirements */}
          {exercise.requirements.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                验收要求
              </p>
              <ul
                style={{
                  paddingLeft: 20,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.8,
                }}
              >
                {exercise.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hints (collapsible) */}
          {exercise.hints.length > 0 && (
            <div>
              <button
                onClick={() => setShowHints(!showHints)}
                style={{
                  ...btnBase,
                  fontSize: 'var(--font-size-xs)',
                  padding: '4px 12px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {showHints ? '收起提示' : '显示提示'}
              </button>
              {showHints && (
                <ul
                  style={{
                    marginTop: 8,
                    paddingLeft: 20,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.8,
                  }}
                >
                  {exercise.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  Code editor                                                      */}
      {/* ================================================================ */}
      {exercise && (
        <div>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            代码编辑器
          </p>
          <CodeEditor
            value={code}
            onChange={(v) => setCode(v)}
            readOnly={loading}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/*  Action buttons                                                   */}
      {/* ================================================================ */}
      {exercise && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleRun}
            disabled={!code.trim() || loading}
            style={!code.trim() || loading ? btnDisabled : btnBase}
          >
            运行测试
          </button>
          <button
            onClick={handleReview}
            disabled={!code.trim() || loading}
            style={!code.trim() || loading ? btnDisabled : btnBase}
          >
            AI 审阅
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            style={!code.trim() || loading ? btnDisabled : btnBase}
          >
            提交并保存
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Output panel                                                     */}
      {/* ================================================================ */}
      {output && (
        <div style={sectionCard}>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            运行输出
          </p>
          <pre
            style={{
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-primary)',
              overflow: 'auto',
              maxHeight: 300,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {output}
          </pre>
        </div>
      )}

      {/* ================================================================ */}
      {/*  AI Review panel                                                  */}
      {/* ================================================================ */}
      {review && (
        <div style={sectionCard}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>AI 审阅结果</h3>
            <span
              style={{
                padding: '4px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: ASSESSMENT_CONFIG[review.assessment].color,
                color: ASSESSMENT_CONFIG[review.assessment].color,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
              }}
            >
              {ASSESSMENT_CONFIG[review.assessment].label}
            </span>
          </div>

          {/* Acknowledgment */}
          {review.acknowledgment && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-accent-green)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                做得好的地方
              </p>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {review.acknowledgment}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Socratic follow-up / improvement suggestions */}
          {review.socraticFollowUp && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-accent-yellow)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                改进建议
              </p>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {review.socraticFollowUp}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Edge cases */}
          {review.edgeCases.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                边界情况
              </p>
              <ul
                style={{
                  paddingLeft: 20,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.8,
                }}
              >
                {review.edgeCases.map((ec, i) => (
                  <li key={i}>{ec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Code quality tip */}
          {review.codeQualityTip && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-accent-blue)',
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                代码质量建议
              </p>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const isBlock = className?.startsWith('language-');
                      if (isBlock) {
                        return (
                          <pre
                            style={{
                              background: 'var(--color-bg-page)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 14px',
                              overflow: 'auto',
                              fontSize: 'var(--font-size-xs)',
                              fontFamily: 'var(--font-mono)',
                              margin: '6px 0',
                            }}
                          >
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                      return (
                        <code
                          style={{
                            background: 'var(--color-bg-page)',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontSize: 'var(--font-size-xs)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {review.codeQualityTip}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Submit button inside review panel */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={loading ? btnDisabled : btnBase}
          >
            {loading ? '保存中...' : '提交并保存'}
          </button>
        </div>
      )}
    </div>
  );
}
