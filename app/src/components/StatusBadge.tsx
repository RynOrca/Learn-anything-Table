import type { ConceptStatus } from '../types';

interface StatusBadgeProps {
  status: ConceptStatus;
  confidence?: number;
}

const config: Record<ConceptStatus, { label: string; bg: string; dot: string; text: string }> = {
  mastered:       { label: '已掌握',  bg: 'var(--color-bg-green)',  dot: 'var(--color-accent-green)',  text: 'var(--color-accent-green)' },
  in_progress:    { label: '学习中',  bg: 'var(--color-bg-blue)',   dot: 'var(--color-accent-blue)',   text: 'var(--color-accent-blue)' },
  needs_practice: { label: '需练习',  bg: 'var(--color-bg-yellow)', dot: 'var(--color-accent-yellow)', text: 'var(--color-accent-yellow)' },
  unexplored:     { label: '未探索',  bg: 'transparent',            dot: 'var(--color-text-tertiary)', text: 'var(--color-text-tertiary)' },
};

export default function StatusBadge({ status, confidence }: StatusBadgeProps) {
  const c = config[status] ?? config.unexplored;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 10px',
      borderRadius: 'var(--radius-pill)',
      background: c.bg,
      border: `1px solid ${c.dot}`,
      fontSize: 'var(--font-size-sm)',
      color: c.text,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-serif)',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
      }} />
      {c.label}
      {confidence !== undefined && (
        <span style={{
          marginLeft: 2,
          opacity: 0.8,
          fontSize: 'var(--font-size-xs)',
        }}>
          {confidence}%
        </span>
      )}
    </span>
  );
}
