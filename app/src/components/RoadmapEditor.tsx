import { useState, useMemo, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditableConcept {
  id: string;
  name: string;
  description: string;
}

interface EditableStage {
  id: string;
  name: string;
  goal: string;
  concepts: EditableConcept[];
}

interface RoadmapEditorProps {
  topicName: string;
  initialPlanMd: string;
  generating: boolean;
  onConfirm: (planMd: string, kmMd: string) => Promise<void>;
  onSkip: () => void;
  onRegenerate: () => Promise<string>;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function uid(): string {
  _idCounter++;
  return `e_${Date.now().toString(36)}_${_idCounter}`;
}

function toChineseNumber(n: number): string {
  const map = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (n <= 10) return map[n];
  if (n < 20) return '十' + map[n - 10];
  return String(n);
}

function parseMarkdownToStages(md: string): EditableStage[] {
  const stages: EditableStage[] = [];
  const lines = md.split('\n');

  let currentStage: EditableStage | null = null;
  let currentConcept: EditableConcept | null = null;

  const flushConcept = () => {
    if (currentStage && currentConcept) {
      currentStage.concepts.push(currentConcept);
      currentConcept = null;
    }
  };

  const flushStage = () => {
    flushConcept();
    if (currentStage) {
      stages.push(currentStage);
      currentStage = null;
    }
  };

  for (const line of lines) {
    // Stage header: ## 阶段一：名称  or  ## 阶段1：名称
    const stageMatch = line.match(/^##\s*阶段\s*[^\s：:]+[：:]\s*(.+)/);
    if (stageMatch) {
      flushStage();
      currentStage = {
        id: uid(),
        name: stageMatch[1].trim(),
        goal: '',
        concepts: [],
      };
      continue;
    }

    if (!currentStage) continue;

    // Stage goal: > 目标：xxx
    const goalMatch = line.match(/^>\s*目标[：:]\s*(.*)/);
    if (goalMatch && goalMatch[1].trim()) {
      currentStage.goal = goalMatch[1].trim();
      continue;
    }

    // Concept header: ### N.M 名称  or  ### N.M. 名称
    const conceptMatch = line.match(/^###\s+\d+\.\d+\.?\s*(.+)/);
    if (conceptMatch) {
      flushConcept();
      currentConcept = {
        id: uid(),
        name: conceptMatch[1].trim(),
        description: '',
      };
      continue;
    }

    // Concept description: - xxx
    if (currentConcept) {
      const descMatch = line.match(/^-\s*(.+)/);
      if (descMatch && descMatch[1].trim()) {
        currentConcept.description = descMatch[1].trim();
      }
    }
  }

  flushStage();

  // Fallback: if parsing yielded nothing, create a minimal stage
  if (stages.length === 0) {
    stages.push({
      id: uid(),
      name: '基础入门',
      goal: '',
      concepts: [
        { id: uid(), name: '新概念', description: '' },
      ],
    });
  }

  return stages;
}

function stagesToMarkdown(stages: EditableStage[], topicName: string): string {
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# ${topicName} 学习计划`);
  lines.push('');
  lines.push(`> **创建日期**: ${today}`);
  lines.push(`> **起点**: 零基础`);
  lines.push(`> **目标**: 系统掌握 ${topicName} 核心知识与实践能力`);
  lines.push('');

  stages.forEach((stage, si) => {
    lines.push('---');
    lines.push('');
    lines.push(`## 阶段${toChineseNumber(si + 1)}：${stage.name}`);
    lines.push('');

    if (stage.goal) {
      lines.push(`> 目标：${stage.goal}`);
      lines.push('');
    }

    stage.concepts.forEach((concept, ci) => {
      lines.push(`### ${si + 1}.${ci + 1} ${concept.name}`);
      if (concept.description) {
        lines.push(`- ${concept.description}`);
      }
      lines.push('');
    });
  });

  return lines.join('\n');
}

function deriveKnowledgeMap(stages: EditableStage[], topicName: string): string {
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# ${topicName} 知识地图`);
  lines.push('');
  lines.push(`> 创建于 ${today}`);
  lines.push('');

  for (const stage of stages) {
    lines.push(`## ${stage.name}`);
    lines.push('');
    for (const concept of stage.concepts) {
      lines.push(`- ${concept.name}`);
      if (concept.description) {
        lines.push(`  - ${concept.description}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 350,
  background: 'var(--color-bg-page)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'var(--font-serif)',
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 24px',
  borderBottom: '1px solid var(--color-border)',
  flexShrink: 0,
  background: 'var(--color-bg-card)',
};

const scrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '20px 24px',
};

const bottomBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 24px',
  borderTop: '1px solid var(--color-border)',
  flexShrink: 0,
  background: 'var(--color-bg-card)',
};

const stageCardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg-card)',
  padding: '18px 20px',
  marginBottom: 16,
};

const inputBase: React.CSSProperties = {
  background: 'var(--color-bg-input)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-serif)',
  outline: 'none',
  padding: '6px 10px',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoadmapEditor({
  topicName,
  initialPlanMd,
  generating,
  onConfirm,
  onSkip,
  onRegenerate,
  onBack,
}: RoadmapEditorProps) {
  const [stages, setStages] = useState<EditableStage[]>(() =>
    parseMarkdownToStages(initialPlanMd),
  );
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parseWarning, setParseWarning] = useState(
    parseMarkdownToStages(initialPlanMd).length === 1 &&
    parseMarkdownToStages(initialPlanMd)[0].name === '基础入门'
      ? 'AI 返回格式异常，已使用默认模板，请手动编辑'
      : '',
  );

  const totalConcepts = useMemo(
    () => stages.reduce((sum, s) => sum + s.concepts.length, 0),
    [stages],
  );

  const planMd = useMemo(() => stagesToMarkdown(stages, topicName), [stages, topicName]);
  const kmMd = useMemo(() => deriveKnowledgeMap(stages, topicName), [stages, topicName]);

  // -------------------------------------------------------------------
  // Stage operations
  // -------------------------------------------------------------------

  const addStage = useCallback(() => {
    setStages((prev) => [
      ...prev,
      {
        id: uid(),
        name: '',
        goal: '',
        concepts: [{ id: uid(), name: '', description: '' }],
      },
    ]);
  }, []);

  const deleteStage = useCallback((stageId: string) => {
    setStages((prev) => prev.filter((s) => s.id !== stageId));
  }, []);

  const updateStageName = useCallback((stageId: string, name: string) => {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name } : s)));
  }, []);

  const updateStageGoal = useCallback((stageId: string, goal: string) => {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, goal } : s)));
  }, []);

  // -------------------------------------------------------------------
  // Concept operations
  // -------------------------------------------------------------------

  const addConcept = useCallback((stageId: string) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? { ...s, concepts: [...s.concepts, { id: uid(), name: '', description: '' }] }
          : s,
      ),
    );
  }, []);

  const deleteConcept = useCallback((stageId: string, conceptId: string) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? { ...s, concepts: s.concepts.filter((c) => c.id !== conceptId) }
          : s,
      ),
    );
  }, []);

  const updateConceptName = useCallback(
    (stageId: string, conceptId: string, name: string) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? {
              ...s,
              concepts: s.concepts.map((c) =>
                c.id === conceptId ? { ...c, name } : c,
              ),
            }
            : s,
        ),
      );
    },
    [],
  );

  const updateConceptDesc = useCallback(
    (stageId: string, conceptId: string, description: string) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? {
              ...s,
              concepts: s.concepts.map((c) =>
                c.id === conceptId ? { ...c, description } : c,
              ),
            }
            : s,
        ),
      );
    },
    [],
  );

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  const handleRegenerate = async () => {
    setError('');
    setParseWarning('');
    try {
      const newMd = await onRegenerate();
      const parsed = parseMarkdownToStages(newMd);
      if (parsed.length === 1 && parsed[0].name === '基础入门') {
        setParseWarning('AI 返回格式异常，已使用默认模板，请手动编辑');
      }
      setStages(parsed);
    } catch (e) {
      setError(`重新生成失败：${(e as Error).message}`);
    }
  };

  const handleConfirm = async () => {
    // Validate
    const validStages = stages.filter(
      (s) => s.name.trim() && s.concepts.filter((c) => c.name.trim()).length > 0,
    );
    if (validStages.length === 0) {
      setError('请至少填写一个阶段和一个概念');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onConfirm(planMd, kmMd);
    } catch (e) {
      setError(`创建失败：${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const canConfirm = totalConcepts > 0 && stages.some((s) => s.name.trim());

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  const conceptIndexStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-tertiary)',
    minWidth: 36,
    flexShrink: 0,
  };

  const warningBannerStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg-yellow)',
    border: '1px solid var(--color-accent-yellow)',
    color: 'var(--color-accent-yellow)',
    fontSize: 'var(--font-size-xs)',
    marginBottom: 16,
  };

  const errorBannerStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg-yellow)',
    border: '1px solid var(--color-accent-red)',
    color: 'var(--color-accent-red)',
    fontSize: 'var(--font-size-xs)',
    marginBottom: 16,
  };

  return (
    <div style={containerStyle}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              ...inputBase,
              cursor: 'pointer',
              padding: '6px 14px',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
            }}
          >
            ← 返回
          </button>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            新建学习路线
          </span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
            主题：{topicName}
          </span>
        </div>
        <button
          onClick={onSkip}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}
        >
          跳过，直接创建空模板
        </button>
      </div>

      {/* Scrollable editor */}
      <div style={scrollStyle}>
        {generating && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}>
            AI 正在生成学习路线...
          </div>
        )}

        {!generating && parseWarning && (
          <div style={warningBannerStyle}>{parseWarning}</div>
        )}

        {!generating && error && (
          <div style={errorBannerStyle}>{error}</div>
        )}

        {!generating && (
          <>
            {stages.map((stage, si) => (
              <div key={stage.id} style={stageCardStyle}>
                {/* Stage header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 600,
                    color: 'var(--color-accent-blue)',
                    flexShrink: 0,
                  }}>
                    阶段{toChineseNumber(si + 1)}
                  </span>
                  <input
                    value={stage.name}
                    onChange={(e) => updateStageName(stage.id, e.target.value)}
                    placeholder="阶段名称"
                    style={{
                      ...inputBase,
                      flex: 1,
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    onClick={() => deleteStage(stage.id)}
                    title="删除此阶段"
                    style={{
                      padding: '4px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-serif)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    删除阶段
                  </button>
                </div>

                {/* Stage goal */}
                <div style={{ marginBottom: 14 }}>
                  <input
                    value={stage.goal}
                    onChange={(e) => updateStageGoal(stage.id, e.target.value)}
                    placeholder="阶段目标（可选）"
                    style={{
                      ...inputBase,
                      width: '100%',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>

                {/* Concepts */}
                <div style={{ paddingLeft: 12 }}>
                  {stage.concepts.map((concept, ci) => (
                    <div
                      key={concept.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span style={conceptIndexStyle}>
                        {si + 1}.{ci + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <input
                            value={concept.name}
                            onChange={(e) =>
                              updateConceptName(stage.id, concept.id, e.target.value)
                            }
                            placeholder="概念名称"
                            style={{ ...inputBase, flex: 1 }}
                          />
                          <button
                            onClick={() => deleteConcept(stage.id, concept.id)}
                            title="删除此概念"
                            style={{
                              padding: '4px 10px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              color: 'var(--color-text-tertiary)',
                              fontSize: 'var(--font-size-xs)',
                              fontFamily: 'var(--font-serif)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            删除
                          </button>
                        </div>
                        <input
                          value={concept.description}
                          onChange={(e) =>
                            updateConceptDesc(stage.id, concept.id, e.target.value)
                          }
                          placeholder="简要说明（可选）"
                          style={{
                            ...inputBase,
                            width: '100%',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)',
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add concept */}
                  <button
                    onClick={() => addConcept(stage.id)}
                    style={{
                      padding: '5px 14px',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-serif)',
                      cursor: 'pointer',
                      marginLeft: 44,
                    }}
                  >
                    + 添加概念
                  </button>
                </div>
              </div>
            ))}

            {/* Add stage */}
            <button
              onClick={addStage}
              style={{
                padding: '10px 20px',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-serif)',
                cursor: 'pointer',
                width: '100%',
                marginBottom: 20,
              }}
            >
              + 添加新阶段
            </button>

            {/* Preview toggle */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <button
                onClick={() => setPreviewExpanded(!previewExpanded)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-serif)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{
                  transition: 'transform 0.2s',
                  transform: previewExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}>
                  ▸
                </span>
                Markdown 预览（{stages.length} 个阶段，{totalConcepts} 个概念）
              </button>

              {previewExpanded && (
                <div
                  className="markdown-content"
                  style={{
                    marginTop: 12,
                    padding: '20px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: 400,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.7,
                  }}
                >
                  {planMd}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div style={bottomBarStyle}>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
        }}>
          {stages.length} 阶段 / {totalConcepts} 概念
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            style={{
              padding: '8px 22px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: generating ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-serif)',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? '生成中...' : '重新生成'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || saving || generating}
            style={{
              padding: '8px 28px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--color-accent-blue)',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              cursor: canConfirm && !saving && !generating ? 'pointer' : 'not-allowed',
              opacity: canConfirm && !saving && !generating ? 1 : 0.5,
            }}
          >
            {saving ? '创建中...' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
