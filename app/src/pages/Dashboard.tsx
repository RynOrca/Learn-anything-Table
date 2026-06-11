import { useNavigate } from 'react-router-dom';
import { useLearningStore } from '../store/useLearningStore';
import ProgressBar from '../components/ProgressBar';

function formatChineseDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: 64,
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--font-size-base)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, stats, sessions, loading, error } = useLearningStore();

  // Loading
  if (loading) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        加载中...
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-accent-red)' }}>
        {error}
      </div>
    );
  }

  // No data
  if (!stats) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        暂无学习数据
      </div>
    );
  }

  const dateStr = formatChineseDate(new Date());

  // Find next practice and next learn recommendations
  const needsPractice = stats.recommendations.filter((r) => r.type === 'practice');
  const needsLearn = stats.recommendations.filter((r) => r.type === 'learn');

  // Check if concept has sessions
  const hasSessions = (conceptName: string): boolean => {
    return sessions.some((s) => s.conceptName === conceptName);
  };

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '36px 40px 48px',
        fontFamily: 'var(--font-serif)',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      {/* Header */}
      <header>
        <h1
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {stats.topicName}
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            margin: '6px 0 0',
          }}
        >
          {dateStr}
        </p>
      </header>

      {/* Overall progress */}
      <ProgressBar
        value={stats.overallProgress}
        label="总体进度"
        showFraction={{
          current: stats.masteredCount,
          total: stats.totalConcepts,
        }}
        height={10}
        color="var(--color-accent-green)"
      />

      {/* Heatmap */}
      {state && state.concepts.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: 12,
              letterSpacing: '0.05em',
            }}
          >
            学习热力图
          </h2>
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '16px 20px',
            }}
          >
            {(() => {
              const domainMap = new Map<string, typeof state.concepts>();
              for (const c of state.concepts) {
                const domain = c.path.split('/')[0] || '其他';
                const list = domainMap.get(domain);
                if (list) list.push(c);
                else domainMap.set(domain, [c]);
              }

              const statusColor = (status: string): string => {
                switch (status) {
                  case 'mastered': return 'var(--color-accent-green)';
                  case 'in_progress': return 'var(--color-accent-blue)';
                  case 'needs_practice': return 'var(--color-accent-yellow)';
                  default: return '#1a1d2a';
                }
              };

              return Array.from(domainMap.entries()).map(([domain, concepts]) => {
                const mastered = concepts.filter(c => c.status === 'mastered').length;
                return (
                  <div key={domain} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 10,
                  }}>
                    <div style={{
                      width: 120,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {domain}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--color-text-tertiary)',
                      }}>
                        {mastered}/{concepts.length}
                      </span>
                    </div>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      gap: 4,
                      flexWrap: 'wrap',
                    }}>
                      {concepts.map((c) => (
                        <div
                          key={c.path}
                          title={`${c.path} — ${
                            c.status === 'mastered' ? '已掌握' :
                            c.status === 'in_progress' ? '进行中' :
                            c.status === 'needs_practice' ? '待练习' : '未开始'
                          }`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background: statusColor(c.status),
                            border: '1px solid var(--color-border)',
                            flexShrink: 0,
                            cursor: 'pointer',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'scale(1.5)';
                            el.style.boxShadow = `0 0 6px ${statusColor(c.status)}`;
                            el.style.zIndex = '1';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = 'none';
                            el.style.zIndex = '0';
                          }}
                          onClick={() => {
                            if (hasSessions(c.path)) {
                              navigate(`/history?concept=${encodeURIComponent(c.path)}`);
                            } else {
                              navigate(`/chat?concept=${encodeURIComponent(c.path)}`);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                gap: 18,
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {[
                { label: '已掌握', color: 'var(--color-accent-green)' },
                { label: '进行中', color: 'var(--color-accent-blue)' },
                { label: '待练习', color: 'var(--color-accent-yellow)' },
                { label: '未开始', color: '#1a1d2a' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: item.color,
                      border: '1px solid var(--color-border)',
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Two recommendation cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {/* Next: Practice */}
        <div
          role="button"
          tabIndex={0}
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-accent-yellow)',
            cursor: needsPractice.length > 0 ? 'pointer' : 'default',
            opacity: needsPractice.length > 0 ? 1 : 0.5,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => {
            if (needsPractice.length > 0) {
              navigate(`/practice?concept=${encodeURIComponent(needsPractice[0].conceptName)}`);
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && needsPractice.length > 0) {
              e.preventDefault();
              navigate(`/practice?concept=${encodeURIComponent(needsPractice[0].conceptName)}`);
            }
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-accent-yellow)',
              fontWeight: 600,
              marginBottom: 4,
              letterSpacing: '0.05em',
            }}
          >
            下次练习
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 6,
            }}
          >
            {needsPractice.length > 0 ? needsPractice[0].conceptName : '暂无'}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {needsPractice.length > 0
              ? needsPractice[0].reason
              : '所有知识点已掌握'}
          </div>
        </div>

        {/* Next: Learn */}
        <div
          role="button"
          tabIndex={0}
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-accent-blue)',
            cursor: needsLearn.length > 0 ? 'pointer' : 'default',
            opacity: needsLearn.length > 0 ? 1 : 0.5,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => {
            if (needsLearn.length > 0) {
              const concept = needsLearn[0].conceptName;
              if (hasSessions(concept)) {
                navigate(`/history?concept=${encodeURIComponent(concept)}`);
              } else {
                navigate(`/chat?concept=${encodeURIComponent(concept)}`);
              }
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && needsLearn.length > 0) {
              e.preventDefault();
              const concept = needsLearn[0].conceptName;
              if (hasSessions(concept)) {
                navigate(`/history?concept=${encodeURIComponent(concept)}`);
              } else {
                navigate(`/chat?concept=${encodeURIComponent(concept)}`);
              }
            }
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-accent-blue)',
              fontWeight: 600,
              marginBottom: 4,
              letterSpacing: '0.05em',
            }}
          >
            下次学习
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 6,
            }}
          >
            {needsLearn.length > 0 ? needsLearn[0].conceptName : '暂无'}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {needsLearn.length > 0
              ? (hasSessions(needsLearn[0].conceptName) ? '继续上次学习' : needsLearn[0].reason)
              : '所有知识点已开始学习'}
          </div>
        </div>
      </div>
    </div>
  );
}
