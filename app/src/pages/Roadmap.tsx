import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLearningStore } from '../store/useLearningStore';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import * as filesApi from '../api/files';
import * as deepseekApi from '../api/deepseek';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Concept } from '../types';

// ---------------------------------------------------------------------------
// Plan parsing
// ---------------------------------------------------------------------------

interface PlanStage {
  name: string;
  index: number;
  topicNames: string[]; // e.g., ["1.1 列表与元组", "1.2 字典与集合"]
}

function parsePlanStages(md: string): PlanStage[] {
  const stages: PlanStage[] = [];
  const lines = md.split('\n');
  let currentStage: PlanStage | null = null;

  for (const line of lines) {
    // Match "## 阶段N：..." or "## 阶段N:..."
    const stageMatch = line.match(/^##\s*阶段\s*([一二三四五六七八九十\d]+)\s*[：:]\s*(.+)/);
    if (stageMatch) {
      if (currentStage) stages.push(currentStage);
      const indexStr = stageMatch[1];
      const index = '一二三四五六七八九十'.indexOf(indexStr) >= 0
        ? '一二三四五六七八九十'.indexOf(indexStr) + 1
        : parseInt(indexStr, 10) || stages.length + 1;
      currentStage = {
        name: `阶段${indexStr}：${stageMatch[2].trim()}`,
        index,
        topicNames: [],
      };
      continue;
    }

    // Match "### N.M name" or "### N.M. name"
    if (currentStage) {
      const topicMatch = line.match(/^###\s+(\d+\.\d+\.?\s*.+)/);
      if (topicMatch) {
        currentStage.topicNames.push(topicMatch[1].trim());
      }
    }
  }
  if (currentStage) stages.push(currentStage);

  return stages;
}

// ---------------------------------------------------------------------------
// Matching concepts from state.yaml to plan stages
// ---------------------------------------------------------------------------

function findConcept(stateConcepts: Concept[], planTopicName: string): Concept | null {
  // Plan topic names are like "1.1 列表与元组"
  // Remove the numbering prefix
  const cleanName = planTopicName.replace(/^\d+\.\d+\.?\s*/, '').trim();

  // Try exact match on the last segment of the concept path
  for (const c of stateConcepts) {
    const lastSegment = c.path.split('/').pop() ?? '';
    if (lastSegment === cleanName) return c;
  }

  // Try partial match
  for (const c of stateConcepts) {
    if (c.path.includes(cleanName)) return c;
  }

  return null;
}

interface StageWithConcepts {
  stage: PlanStage;
  concepts: Concept[];
  totalTopics: number;
  masteredCount: number;
  inProgressCount: number;
}

function matchStagesToConcepts(stages: PlanStage[], stateConcepts: Concept[]): StageWithConcepts[] {
  const usedPaths = new Set<string>();

  return stages.map((stage) => {
    const matched: Concept[] = [];
    for (const topicName of stage.topicNames) {
      const found = findConcept(stateConcepts, topicName);
      if (found && !usedPaths.has(found.path)) {
        matched.push(found);
        usedPaths.add(found.path);
      }
    }

    // If no topics matched from the plan, try matching by domain names in the stage name
    if (matched.length === 0) {
      const stageNameLower = stage.name.toLowerCase();
      for (const c of stateConcepts) {
        if (usedPaths.has(c.path)) continue;
        const domain = c.path.split('/')[0];
        if (domain && stageNameLower.includes(domain.toLowerCase())) {
          matched.push(c);
          usedPaths.add(c.path);
        }
      }
    }

    const masteredCount = matched.filter((c) => c.status === 'mastered').length;
    const inProgressCount = matched.filter((c) => c.status === 'in_progress').length;

    return {
      stage,
      concepts: matched,
      totalTopics: matched.length,
      masteredCount,
      inProgressCount,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Roadmap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, sessions, topicName, loading, error, planOverrides, setPlanOverride } = useLearningStore();

  const hasSessions = (conceptName: string): boolean => {
    return sessions.some((s) => s.conceptName === conceptName);
  };

  const [planContent, setPlanContent] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);

  const phaseFromUrl = searchParams.get('phase');
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  // Fetch plan on mount / topic change — check store override first
  useEffect(() => {
    if (!topicName) return;
    const override = planOverrides[topicName];
    if (override) {
      setPlanContent(override);
      return;
    }
    setLoadingPlan(true);
    filesApi
      .fetchPlan(topicName)
      .then(setPlanContent)
      .catch(() => setPlanContent(''))
      .finally(() => setLoadingPlan(false));
  }, [topicName, planOverrides]);

  // Auto-expand stage from URL param
  useEffect(() => {
    if (phaseFromUrl && state && planContent) {
      const stages = parsePlanStages(planContent);
      const matched = matchStagesToConcepts(stages, state.concepts ?? []);
      const found = matched.findIndex((s) =>
        s.stage.name.toLowerCase().includes(phaseFromUrl.toLowerCase()),
      );
      if (found >= 0) {
        setExpandedStage(found);
        // Scroll to the expanded stage
        setTimeout(() => {
          document.getElementById(`stage-${found}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [phaseFromUrl, state, planContent]);

  // Parse plan into stages matched with concepts
  const stageData = useMemo(() => {
    if (!planContent || !state) return [];
    const stages = parsePlanStages(planContent);
    return matchStagesToConcepts(stages, state.concepts ?? []);
  }, [planContent, state]);

  // AI adjust handler
  const handleAdjust = async () => {
    if (!topicName || !planContent || !state) return;
    setAdjusting(true);
    try {
      const currentStateStr = JSON.stringify(state);
      const adjusted = await deepseekApi.adjustPlan(planContent, currentStateStr);
      setPlanContent(adjusted);
      setPlanOverride(topicName, adjusted);
    } catch (err) {
      console.error('Failed to adjust plan:', err);
    } finally {
      setAdjusting(false);
    }
  };

  // Loading / Error / Empty states
  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 48 }}>
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-accent-red)', textAlign: 'center', padding: 48 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 48 }}>
          请先选择学习主题
        </div>
      </div>
    );
  }

  const overallMastered = state.concepts.filter((c) => c.status === 'mastered').length;
  const overallTotal = state.concepts.length;

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '28px 32px 40px',
        fontFamily: 'var(--font-serif)',
      }}
    >
      {/* ================================================================ */}
      {/*  Header                                                           */}
      {/* ================================================================ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 6px',
            }}
          >
            {topicName} 学习路线图
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {stageData.length} 个阶段 / {overallTotal} 个知识点 / 已掌握 {overallMastered}
          </p>
        </div>
        <button
          onClick={handleAdjust}
          disabled={adjusting || !planContent}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-accent-blue)',
            background: adjusting ? 'var(--color-bg-blue)' : 'transparent',
            color: 'var(--color-accent-blue)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: adjusting ? 'not-allowed' : 'pointer',
            opacity: adjusting ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {adjusting ? '调整中...' : 'AI 调整路线'}
        </button>
      </div>

      {/* ================================================================ */}
      {/*  Overall progress bar                                             */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 32 }}>
        <ProgressBar
          value={overallTotal > 0 ? Math.round((overallMastered / overallTotal) * 100) : 0}
          label="总体进度"
          showFraction={{ current: overallMastered, total: overallTotal }}
          height={6}
          color="var(--color-accent-green)"
        />
      </div>

      {/* ================================================================ */}
      {/*  Stage Timeline                                                   */}
      {/* ================================================================ */}
      {stageData.length === 0 && (
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 32 }}>
          {loadingPlan ? '加载计划中...' : '未找到学习计划数据'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stageData.map((sd, idx) => {
          const isExpanded = expandedStage === idx;
          const progress = sd.totalTopics > 0
            ? Math.round((sd.masteredCount / sd.totalTopics) * 100)
            : 0;

          return (
            <div
              key={sd.stage.index}
              id={`stage-${idx}`}
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-card)',
                border: '1px solid',
                borderColor: isExpanded ? 'var(--color-border-hover)' : 'var(--color-border)',
                borderLeft: '3px solid',
                borderLeftColor: progress === 100
                  ? 'var(--color-accent-green)'
                  : sd.inProgressCount > 0
                    ? 'var(--color-accent-blue)'
                    : 'var(--color-border-hover)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Stage header */}
              <div
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                }}
                onClick={() => setExpandedStage(isExpanded ? null : idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedStage(isExpanded ? null : idx);
                  }
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-input)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: progress === 100
                          ? 'var(--color-accent-green)'
                          : sd.inProgressCount > 0
                            ? 'var(--color-accent-blue)'
                            : 'var(--color-bg-input)',
                        color: progress === 100 || sd.inProgressCount > 0 ? '#fff' : 'var(--color-text-tertiary)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {sd.stage.index}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {sd.stage.name}
                    </span>
                  </div>
                  <div style={{ paddingLeft: 38 }}>
                    <ProgressBar value={progress} height={4} color="var(--color-accent-green)" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    color: progress === 100 ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
                  }}>
                    {sd.masteredCount}/{sd.totalTopics}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-md)',
                    color: 'var(--color-text-tertiary)',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}>
                    ›
                  </span>
                </div>
              </div>

              {/* Expanded: domain groups + concepts */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 20px 20px' }}>
                  {/* Group concepts by domain */}
                  {(() => {
                    const domainMap = new Map<string, Concept[]>();
                    for (const c of sd.concepts) {
                      const domain = c.path.split('/')[0] || '其他';
                      const list = domainMap.get(domain);
                      if (list) list.push(c);
                      else domainMap.set(domain, [c]);
                    }

                    return Array.from(domainMap.entries()).map(([domain, concepts]) => {
                      const domainMastered = concepts.filter((c) => c.status === 'mastered').length;
                      return (
                        <div key={domain} style={{ marginBottom: 16 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                          }}>
                            <span style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 600,
                              color: 'var(--color-text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>
                              {domain}
                            </span>
                            <span style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-tertiary)',
                            }}>
                              {domainMastered}/{concepts.length}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {concepts.map((concept) => {
                              const conceptName = concept.path;
                              const hasHist = hasSessions(conceptName);
                              return (
                                <div
                                  key={concept.path}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--color-bg-page)',
                                    border: '1px solid var(--color-border)',
                                    gap: 12,
                                  }}
                                >
                                  <span style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-primary)',
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {concept.path.split('/').slice(1).join(' / ') || concept.path}
                                  </span>
                                  <StatusBadge status={concept.status} confidence={concept.confidence} />
                                  <button
                                    onClick={() => {
                                      if (hasHist) {
                                        navigate(`/history?concept=${encodeURIComponent(conceptName)}`);
                                      } else {
                                        navigate(`/chat?concept=${encodeURIComponent(conceptName)}`);
                                      }
                                    }}
                                    style={{
                                      padding: '6px 16px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--color-accent-blue)',
                                      background: 'transparent',
                                      color: 'var(--color-accent-blue)',
                                      fontSize: 'var(--font-size-xs)',
                                      fontFamily: 'var(--font-serif)',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}
                                  >
                                    学习
                                  </button>
                                  <button
                                    onClick={() => navigate(`/practice?concept=${encodeURIComponent(conceptName)}`)}
                                    style={{
                                      padding: '6px 16px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--color-accent-yellow)',
                                      background: 'transparent',
                                      color: 'var(--color-accent-yellow)',
                                      fontSize: 'var(--font-size-xs)',
                                      fontFamily: 'var(--font-serif)',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}
                                  >
                                    练习
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {sd.concepts.length === 0 && (
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                      textAlign: 'center',
                      padding: 16,
                    }}>
                      暂无匹配的知识点
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/*  Full plan (collapsible)                                          */}
      {/* ================================================================ */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={() => setShowFullPlan(!showFullPlan)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            完整学习计划
            {loadingPlan ? '（加载中...）' : planContent ? '' : '（暂无）'}
          </span>
          <span style={{
            transition: 'transform 0.2s',
            transform: showFullPlan ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            ›
          </span>
        </button>
        {showFullPlan && planContent && (
          <div
            className="markdown-content"
            style={{
              marginTop: 12,
              padding: '24px 28px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{planContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
