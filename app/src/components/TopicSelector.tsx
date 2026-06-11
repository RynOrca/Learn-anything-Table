import { useState, useEffect } from 'react';
import { fetchTopics } from '../api/files';
import { useLearningStore } from '../store/useLearningStore';

export default function TopicSelector() {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const topicName = useLearningStore((s) => s.topicName);
  const loadTopic = useLearningStore((s) => s.loadTopic);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopics()
      .then((list) => {
        if (!cancelled) {
          setTopics(list);
          setLoading(false);
          // Auto-load first topic if none selected
          if (list.length > 0 && !topicName) {
            loadTopic(list[0]);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected) {
      loadTopic(selected);
    }
  };

  if (loading && topics.length === 0) {
    return (
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-tertiary)',
      }}>
        加载中...
      </span>
    );
  }

  if (topics.length === 0) {
    return (
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-tertiary)',
      }}>
        无主题
      </span>
    );
  }

  return (
    <select
      value={topicName ?? ''}
      onChange={handleChange}
      style={{
        appearance: 'none',
        padding: '4px 28px 4px 10px',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-text-primary)',
        background: `var(--color-bg-input) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238b949e'/%3E%3C/svg%3E") no-repeat right 8px center`,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        outline: 'none',
        minWidth: 120,
      }}
    >
      {topics.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
