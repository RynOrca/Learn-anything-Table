import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLearningStore } from '../store/useLearningStore';
import StatusBadge from '../components/StatusBadge';
import type { Concept, ConceptStatus } from '../types';

interface DomainGroup {
  name: string;
  concepts: Concept[];
  masteredCount: number;
}

const legendItems: { status: ConceptStatus; label: string; color: string }[] = [
  { status: 'mastered',       label: '已掌握', color: 'var(--color-accent-green)' },
  { status: 'in_progress',    label: '进行中', color: 'var(--color-accent-blue)' },
  { status: 'needs_practice', label: '待练习', color: 'var(--color-accent-yellow)' },
  { status: 'unexplored',     label: '未开始', color: 'var(--color-text-tertiary)' },
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

function getDomain(path: string): string {
  const idx = path.indexOf('/');
  return idx === -1 ? path : path.slice(0, idx);
}

function groupByDomain(concepts: Concept[]): DomainGroup[] {
  const map = new Map<string, Concept[]>();
  for (const c of concepts) {
    const domain = getDomain(c.path);
    const list = map.get(domain);
    if (list) {
      list.push(c);
    } else {
      map.set(domain, [c]);
    }
  }
  const groups: DomainGroup[] = [];
  for (const [name, cs] of map) {
    groups.push({
      name,
      concepts: cs,
      masteredCount: cs.filter((c) => c.status === 'mastered').length,
    });
  }
  // sort by domain name
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

export default function KnowledgeMap() {
  const navigate = useNavigate();
  const { topicName, state, knowledgeMap, loading, error } = useLearningStore();

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const domainGroups = useMemo(
    () => (state ? groupByDomain(state.concepts) : []),
    [state],
  );

  const toggleDomain = (name: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

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

  // --- no state ---
  if (!state) {
    return (
      <div style={{ ...centerStyle, color: 'var(--color-text-secondary)' }}>
        暂无学习数据，请先创建主题
      </div>
    );
  }

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
          {topicName} 知识地图
        </h1>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
          }}
        >
          {legendItems.map((item) => (
            <div
              key={item.status}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </header>

      {/* ======== Knowledge Map Markdown ======== */}
      {knowledgeMap && (
        <section
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-serif)',
            maxHeight: 400,
            overflowY: 'auto',
          }}
          className="markdown-content"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{knowledgeMap}</ReactMarkdown>
        </section>
      )}

      {/* ======== Domain Cards Grid ======== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 12,
        }}
      >
        {domainGroups.map((domain) => {
          const isExpanded = expandedDomains.has(domain.name);
          const progressFraction = `${domain.masteredCount}/${domain.concepts.length}`;

          return (
            <div
              key={domain.name}
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {/* Domain header -- toggle expand/collapse */}
              <div
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                }}
                onClick={() => toggleDomain(domain.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDomain(domain.name);
                  }
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'var(--color-bg-input)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'transparent';
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {domain.name}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color:
                        domain.masteredCount === domain.concepts.length
                          ? 'var(--color-accent-green)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {progressFraction}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ›
                  </span>
                </div>
              </div>

              {/* Domain concepts list */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {domain.concepts.map((concept) => {
                    const isSelected =
                      selectedConcept?.path === concept.path;
                    return (
                      <div
                        key={concept.path}
                        role="button"
                        tabIndex={0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: isSelected
                            ? 'var(--color-bg-page)'
                            : 'transparent',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                        onClick={() =>
                          setSelectedConcept(
                            isSelected ? null : concept,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedConcept(
                              isSelected ? null : concept,
                            );
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background =
                              'var(--color-bg-input)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background =
                              'transparent';
                          }
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
                        <StatusBadge
                          status={concept.status}
                          confidence={concept.confidence}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ======== Bottom Action Bar ======== */}
      {selectedConcept && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--color-bg-card)',
            borderTop: '1px solid var(--color-border)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.4)',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
          }}
        >
          {/* Selected concept info */}
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              marginRight: 'auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            已选: {selectedConcept.path}
          </span>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-accent-blue)',
                background: 'transparent',
                color: 'var(--color-accent-blue)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                transition: 'background 0.15s',
              }}
              onClick={() => navigate(`/chat?concept=${encodeURIComponent(selectedConcept.path)}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--color-bg-blue)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
              }}
            >
              去讲解
            </button>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-accent-yellow)',
                background: 'transparent',
                color: 'var(--color-accent-yellow)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                transition: 'background 0.15s',
              }}
              onClick={() => navigate(`/practice?concept=${encodeURIComponent(selectedConcept.path)}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--color-bg-yellow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
              }}
            >
              去练习
            </button>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-hover)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                transition: 'background 0.15s',
              }}
              onClick={() => navigate(`/history?concept=${encodeURIComponent(selectedConcept.path)}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--color-bg-input)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
              }}
            >
              看历史
            </button>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                transition: 'background 0.15s',
              }}
              onClick={() => setSelectedConcept(null)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--color-bg-input)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Bottom spacing when action bar is visible */}
      {selectedConcept && <div style={{ height: 56 }} />}
    </div>
  );
}
