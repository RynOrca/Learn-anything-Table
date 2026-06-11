import { useNavigate } from 'react-router-dom';
import { useLearningStore } from '../store/useLearningStore';
import PhasePill from '../components/PhasePill';
import ProgressBar from '../components/ProgressBar';
import SessionCard from '../components/SessionCard';

function formatChineseDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

const statCardDefs = [
  { label: '已掌握', key: 'masteredCount' as const, color: 'var(--color-accent-green)' },
  { label: '进行中', key: 'inProgressCount' as const, color: 'var(--color-accent-blue)' },
  { label: '待练习', key: 'needsPracticeCount' as const, color: 'var(--color-accent-yellow)' },
  { label: '未开始', key: 'unexploredCount' as const, color: 'var(--color-text-tertiary)' },
];

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
  const { topicName, stats, loading, error } = useLearningStore();

  // --- loading state ---
  if (loading) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        加载中...
      </div>
    );
  }

  // --- error state ---
  if (error) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-accent-red)' }}>
        {error}
      </div>
    );
  }

  // --- no topic / no stats ---
  if (!stats) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        暂无学习数据，请先在终端运行 /learn:topic 创建主题
      </div>
    );
  }

  const dateStr = formatChineseDate(new Date());

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '28px 32px 40px',
        fontFamily: 'var(--font-serif)',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
      }}
    >
      {/* ======== Header ======== */}
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
            margin: '4px 0 0',
          }}
        >
          {dateStr}
        </p>
      </header>

      {/* ======== Phase pills ======== */}
      {stats.phases.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {stats.phases.map((phase) => {
            const isActive = phase.progress > 0 && phase.progress < 100;
            return (
              <PhasePill
                key={phase.name}
                name={phase.name}
                progress={phase.progress}
                isActive={isActive}
                onClick={() => navigate('/roadmap')}
              />
            );
          })}
        </div>
      )}

      {/* ======== Overall progress ======== */}
      <ProgressBar
        value={stats.overallProgress}
        label="总体进度"
        showFraction={{
          current: stats.masteredCount,
          total: stats.totalConcepts,
        }}
        height={8}
        color="var(--color-accent-green)"
      />

      {/* ======== Stat cards grid ======== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {statCardDefs.map((def) => (
          <div
            key={def.label}
            style={{
              padding: '20px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 700,
                color: def.color,
                lineHeight: 1,
              }}
            >
              {stats[def.key]}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {def.label}
            </span>
          </div>
        ))}
      </div>

      {/* ======== Bottom two-column: Recommendations + Recent activity ======== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ------ 今日推荐 ------ */}
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 12px',
            }}
          >
            今日推荐
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recommendations.length === 0 && (
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                暂无推荐
              </span>
            )}
            {stats.recommendations.map((rec, i) => {
              const accentColor =
                rec.type === 'practice'
                  ? 'var(--color-accent-yellow)'
                  : 'var(--color-accent-blue)';
              const targetPath =
                rec.type === 'practice' ? '/practice' : '/chat';

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${accentColor}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onClick={() => navigate(targetPath)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      'var(--color-border-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      'var(--color-border)';
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {rec.conceptName}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 4,
                    }}
                  >
                    {rec.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ------ 最近活动 ------ */}
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 12px',
            }}
          >
            最近活动
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recentSessions.length === 0 && (
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                暂无活动
              </span>
            )}
            {stats.recentSessions.map((session) => (
              <SessionCard
                key={session.filename}
                session={session}
                compact
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
