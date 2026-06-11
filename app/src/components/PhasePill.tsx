interface PhasePillProps {
  name: string;
  progress: number;
  isActive?: boolean;
  onClick?: () => void;
}

export default function PhasePill({ name, progress, isActive, onClick }: PhasePillProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 16px',
        borderRadius: 'var(--radius-pill)',
        border: isActive
          ? '2px solid var(--color-accent-green)'
          : '1px solid var(--color-border)',
        background: isActive
          ? 'var(--color-bg-green)'
          : 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--font-size-base)',
        minWidth: 90,
        transition: 'border-color 0.15s, background 0.15s',
        outline: 'none',
      }}
    >
      <span style={{
        fontWeight: 600,
        fontSize: 'var(--font-size-sm)',
        color: isActive ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
      }}>
        {name}
      </span>
      <span style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        marginTop: 2,
      }}>
        {clampedProgress}%
      </span>
    </button>
  );
}
