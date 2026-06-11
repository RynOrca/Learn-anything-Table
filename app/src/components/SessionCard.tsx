import { useState } from 'react';
import type { SessionMeta, SessionDetail } from '../types';
import { useLearningStore } from '../store/useLearningStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SessionCardProps {
  session: SessionMeta;
  compact?: boolean;
}

const typeLabel: Record<string, string> = {
  explain: '讲解',
  practice: '练习',
  review: '回顾',
  chat: '对话',
};

export default function SessionCard({ session, compact }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const loadSessionDetail = useLearningStore((s) => s.loadSessionDetail);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!detail) {
      setLoading(true);
      try {
        const result = await loadSessionDetail(session.filename);
        setDetail(result);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      <button
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 8 : 12,
          padding: compact ? '8px 12px' : '12px 16px',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--font-size-base)',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        <span style={{
          fontSize: 'var(--font-size-sm)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          background: session.type === 'practice' ? 'var(--color-bg-yellow)' : 'var(--color-bg-blue)',
          color: session.type === 'practice' ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)',
          whiteSpace: 'nowrap',
        }}>
          {typeLabel[session.type] ?? session.type}
        </span>
        <span style={{
          flex: 1,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.conceptName}
        </span>
        {!compact && (
          <span style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
          }}>
            {session.date}
          </span>
        )}
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          &#9662;
        </span>
      </button>

      {!compact && session.summary && !expanded && (
        <div style={{
          padding: '0 16px 12px',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.summary}
        </div>
      )}

      {expanded && (
        <div style={{
          padding: '0 16px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-base)',
          lineHeight: 1.7,
          color: 'var(--color-text-primary)',
          maxHeight: 480,
          overflow: 'auto',
        }}>
          {loading ? (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              加载中...
            </span>
          ) : detail ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {detail.content}
            </ReactMarkdown>
          ) : (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              无法加载内容
            </span>
          )}
        </div>
      )}
    </div>
  );
}
