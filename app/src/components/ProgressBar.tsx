interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showFraction?: { current: number; total: number };
  height?: number;
  color?: string;
}

export default function ProgressBar({
  value,
  label,
  showFraction,
  height = 6,
  color = 'var(--color-accent-blue)',
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {(label || showFraction) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-serif)',
        }}>
          {label && <span>{label}</span>}
          {showFraction && (
            <span>{showFraction.current}/{showFraction.total}</span>
          )}
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        borderRadius: height / 2,
        background: 'var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${clampedValue}%`,
          height: '100%',
          borderRadius: height / 2,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}
