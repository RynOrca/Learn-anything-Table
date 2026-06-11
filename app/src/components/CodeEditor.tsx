interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, readOnly }: CodeEditorProps) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      readOnly={readOnly}
      spellCheck={false}
      style={{
        width: '100%',
        minHeight: 600,
        background: 'var(--color-bg-page)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
        lineHeight: 1.6,
        resize: 'vertical',
        outline: 'none',
        tabSize: 4,
      }}
    />
  );
}
