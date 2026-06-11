import { useState, useEffect, useCallback } from 'react';
import { useLearningStore } from '../store/useLearningStore';
import SessionCard from '../components/SessionCard';

export default function History() {
  const { sessions, loadSessions, loading, error } = useLearningStore();
  const [search, setSearch] = useState('');

  const handleSearch = useCallback(() => {
    loadSessions(search || undefined);
  }, [search, loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 64,
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--font-size-base)',
        color: 'var(--color-accent-red)',
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>学习历史</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索知识点..."
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-serif)',
              outline: 'none',
              width: 200,
            }}
          />
          <button onClick={handleSearch} style={{
            background: 'var(--color-bg-blue)',
            color: 'var(--color-accent-blue)',
            border: '1px solid var(--color-accent-blue)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}>
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', padding: 32, textAlign: 'center' }}>加载中...</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 32, textAlign: 'center' }}>暂无学习记录</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map(s => (
            <SessionCard key={s.filename} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
