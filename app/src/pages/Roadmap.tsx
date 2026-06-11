import { useState, useEffect } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import PhasePill from '../components/PhasePill';
import * as filesApi from '../api/files';
import * as deepseekApi from '../api/deepseek';
import ReactMarkdown from 'react-markdown';

export default function Roadmap() {
  const { state, stats, topicName, loading, error } = useLearningStore();
  const [planContent, setPlanContent] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  // Fetch plan on mount / topic change
  useEffect(() => {
    if (!topicName) return;
    setLoadingPlan(true);
    filesApi
      .fetchPlan(topicName)
      .then(setPlanContent)
      .catch(() => setPlanContent(''))
      .finally(() => setLoadingPlan(false));
  }, [topicName]);

  // AI adjust handler
  const handleAdjust = async () => {
    if (!topicName || !planContent || !state) return;
    setAdjusting(true);
    try {
      const currentStateStr = JSON.stringify(state);
      const adjusted = await deepseekApi.adjustPlan(planContent, currentStateStr);
      setPlanContent(adjusted);
    } catch (err) {
      console.error('Failed to adjust plan:', err);
    } finally {
      setAdjusting(false);
    }
  };

  // Loading / Error / Empty states
  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 48 }}>
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-accent-red)', textAlign: 'center', padding: 48 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats || !state) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 48 }}>
          请先选择学习主题
        </div>
      </div>
    );
  }

  // Get concepts for expanded phase
  const expandedPhaseData = expandedPhase !== null ? stats.phases[expandedPhase] : null;
  const expandedConcepts = expandedPhaseData
    ? state.concepts.filter((c) => c.path.split('.')[0] === expandedPhaseData.name)
    : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            学习路线图
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            预计 14-21 周 / 每日 1 个知识点
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
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-serif)',
            cursor: adjusting || !planContent ? 'not-allowed' : 'pointer',
            opacity: adjusting ? 0.7 : 1,
            transition: 'background 0.15s',
            outline: 'none',
          }}
        >
          {adjusting ? '调整中...' : 'AI 调整路线'}
        </button>
      </div>

      {/* Phase overview grid */}
      {stats.phases.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 32,
          }}
        >
          {stats.phases.map((phase) => (
            <PhasePill
              key={phase.index}
              name={phase.name}
              progress={phase.progress}
              isActive={expandedPhase === phase.index}
              onClick={() =>
                setExpandedPhase(expandedPhase === phase.index ? null : phase.index)
              }
            />
          ))}
        </div>
      )}

      {/* Expanded phase detail */}
      {expandedPhase !== null && expandedPhaseData && (
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            marginBottom: 32,
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {expandedPhaseData.name}
            </h2>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {expandedPhaseData.masteredCount}/{expandedPhaseData.topicCount} 已掌握
            </span>
          </div>
          <ProgressBar value={expandedPhaseData.progress} height={4} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 16,
            }}
          >
            {expandedConcepts.map((concept) => (
              <div
                key={concept.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {concept.path}
                </span>
                <StatusBadge status={concept.status} confidence={concept.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan markdown section */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          border: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 600,
            marginBottom: 16,
            color: 'var(--color-text-primary)',
          }}
        >
          学习计划
        </h2>
        {loadingPlan ? (
          <div
            style={{
              color: 'var(--color-text-secondary)',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            加载中...
          </div>
        ) : !planContent ? (
          <div
            style={{
              color: 'var(--color-text-secondary)',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            暂无学习计划文件
          </div>
        ) : (
          <div
            style={{
              fontSize: 'var(--font-size-base)',
              lineHeight: 1.8,
              color: 'var(--color-text-primary)',
            }}
          >
            <ReactMarkdown>{planContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
