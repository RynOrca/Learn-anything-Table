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
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadSessionDetail = useLearningStore((s) => s.loadSessionDetail);
  const deleteSession = useLearningStore((s) => s.deleteSession);

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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteSession(session.filename);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-card)',
      overflow: 'hidden',
      marginBottom: 28,
      transition: 'border-color 0.15s',
    }}>
      <button
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 8 : 14,
          padding: compact ? '10px 16px' : '16px 20px',
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
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          background: session.type === 'practice' ? 'var(--color-bg-yellow)' : 'var(--color-bg-blue)',
          color: session.type === 'practice' ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)',
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}>
          {typeLabel[session.type] ?? session.type}
        </span>
        <span style={{
          flex: 1,
          fontWeight: 600,
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

      {/* Summary line (always visible unless compact) */}
      {!compact && session.summary && !expanded && (
        <div style={{
          padding: '0 20px 16px',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.summary}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div>
          <div className="markdown-content" style={{
            padding: '0 20px 20px',
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-base)',
            maxHeight: 600,
            overflow: 'auto',
            paddingTop: 16,
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

          {/* Action bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 20px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-page)',
          }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '5px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: confirmDelete ? 'var(--color-accent-red)' : 'var(--color-border)',
                background: confirmDelete ? 'var(--color-bg-yellow)' : 'transparent',
                color: confirmDelete ? 'var(--color-accent-red)' : 'var(--color-text-tertiary)',
                fontSize: '10px',
                fontFamily: 'var(--font-serif)',
                cursor: 'pointer',
              }}
            >
              {deleting ? '删除中...' : confirmDelete ? '确认删除' : '删除此记录'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
