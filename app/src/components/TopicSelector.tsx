import { useState, useEffect, useRef } from 'react';
import { fetchTopics, createTopic, createTopicWithPlan } from '../api/files';
import { generateLearningPlan } from '../api/deepseek';
import { useLearningStore } from '../store/useLearningStore';
import { useSettingsStore } from '../store/useSettingsStore';
import RoadmapEditor from './RoadmapEditor';

export default function TopicSelector() {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createStep, setCreateStep] = useState<'input' | 'editor'>('input');
  const [aiPlanMd, setAiPlanMd] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const topicName = useLearningStore((s) => s.topicName);
  const loadTopic = useLearningStore((s) => s.loadTopic);
  const deleteTopicStore = useLearningStore((s) => s.deleteTopic);
  const deepseekApiKey = useSettingsStore((s) => s.deepseekApiKey);
  const dataDir = useSettingsStore((s) => s.dataDir);
  const [deletingTopic, setDeletingTopic] = useState<string | null>(null);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState<string | null>(null);

  // Fetch topic list
  const refreshTopics = () => {
    setLoading(true);
    fetchTopics()
      .then((list) => {
        setTopics(list);
        setLoading(false);
        if (list.length > 0 && !topicName) {
          loadTopic(list[0]);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refreshTopics();
  }, [dataDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for custom event dispatched from Settings page
  useEffect(() => {
    const handler = () => refreshTopics();
    window.addEventListener('datadir-changed', handler);
    return () => window.removeEventListener('datadir-changed', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when create dialog opens
  useEffect(() => {
    if (showCreate) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showCreate]);

  const handleSelect = (name: string) => {
    loadTopic(name);
    setOpen(false);
  };

  const handleDeleteTopic = async (name: string) => {
    if (confirmDeleteTopic !== name) {
      setConfirmDeleteTopic(name);
      setTimeout(() => setConfirmDeleteTopic(null), 3000);
      return;
    }
    setDeletingTopic(name);
    try {
      await deleteTopicStore(name);
      // Refresh list and auto-load if needed
      const list = await fetchTopics();
      setTopics(list);
      if (list.length > 0) {
        loadTopic(list[0]);
      }
      setConfirmDeleteTopic(null);
      setDeletingTopic(null);
    } catch {
      setDeletingTopic(null);
    }
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      await createTopic(trimmed);
      await refreshTopics();
      setNewName('');
      setShowCreate(false);
      setCreateStep('input');
      loadTopic(trimmed);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleAIGenerate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || aiGenerating) return;
    setCreateError('');
    setAiGenerating(true);
    try {
      const md = await generateLearningPlan(trimmed);
      setAiPlanMd(md);
      setCreateStep('editor');
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateWithPlan = async (planMd: string, kmMd: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createTopicWithPlan(trimmed, planMd, kmMd);
    await refreshTopics();
    setNewName('');
    setShowCreate(false);
    setCreateStep('input');
    setAiPlanMd('');
    loadTopic(trimmed);
  };

  const displayName = topicName ?? (topics.length > 0 ? '选择主题' : '无主题');

  const selectStyle: React.CSSProperties = {
    position: 'relative',
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--font-size-sm)',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 12px',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-serif)',
    minWidth: 130,
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s',
    userSelect: 'none',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '100%',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 200,
    overflow: 'hidden',
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    color: active ? 'var(--color-accent-blue)' : 'var(--color-text-primary)',
    background: active ? 'var(--color-bg-blue)' : 'transparent',
    borderBottom: '1px solid var(--color-border)',
    transition: 'background 0.1s',
    whiteSpace: 'nowrap',
  });

  const dialogOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  };

  const dialogCard: React.CSSProperties = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
    width: 380,
    maxWidth: '90vw',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-serif)',
    outline: 'none',
    marginTop: 12,
    marginBottom: 8,
  };

  const btnStyle = (primary: boolean): React.CSSProperties => ({
    padding: '7px 18px',
    borderRadius: 'var(--radius-sm)',
    border: primary ? 'none' : '1px solid var(--color-border)',
    background: primary ? 'var(--color-accent-blue)' : 'transparent',
    color: primary ? '#fff' : 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-serif)',
    cursor: 'pointer',
    fontWeight: primary ? 600 : 400,
  });

  return (
    <div style={selectStyle} ref={containerRef}>
      {/* Trigger */}
      <div
        style={triggerStyle}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {loading ? '加载中...' : displayName}
        </span>
        <span style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-xs)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={dropdownStyle}>
          {topics.length === 0 ? (
            <div style={{ padding: '12px 14px', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              暂无主题
            </div>
          ) : (
            topics.map((t) => (
              <div
                key={t}
                style={{
                  ...itemStyle(t === topicName),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  if (t !== topicName) {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-input)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (t !== topicName) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }
                }}
              >
                <span
                  style={{ flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  onClick={() => handleSelect(t)}
                >
                  {t}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTopic(t);
                  }}
                  disabled={deletingTopic === t}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: confirmDeleteTopic === t ? 'var(--color-accent-red)' : 'var(--color-border)',
                    background: confirmDeleteTopic === t ? 'var(--color-bg-yellow)' : 'transparent',
                    color: confirmDeleteTopic === t ? 'var(--color-accent-red)' : 'var(--color-text-tertiary)',
                    fontSize: '10px',
                    fontFamily: 'var(--font-serif)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {deletingTopic === t ? '...' : confirmDeleteTopic === t ? '确认删除' : '删除'}
                </button>
              </div>
            ))
          )}
          <div
            style={{
              ...itemStyle(false),
              borderBottom: 'none',
              color: 'var(--color-accent-blue)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => {
              setOpen(false);
              setShowCreate(true);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-blue)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: 'var(--font-size-md)', lineHeight: 1 }}>+</span>
            新建主题
          </div>
        </div>
      )}

      {/* Create dialog — step 1: input name */}
      {showCreate && createStep === 'input' && (
        <div
          style={dialogOverlay}
          onClick={() => {
            setShowCreate(false);
            setCreateStep('input');
          }}
        >
          <div style={dialogCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 4px',
              fontFamily: 'var(--font-serif)',
            }}>
              新建学习主题
            </h3>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: '0 0 8px',
              fontFamily: 'var(--font-serif)',
            }}>
              输入主题名称（如 Python、Rust、数学）
            </p>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowCreate(false);
                  setCreateStep('input');
                }
              }}
              placeholder="Python"
              style={inputStyle}
              disabled={creating || aiGenerating}
            />
            {!deepseekApiKey && (
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                margin: '0 0 8px',
              }}>
                提示：先在设置中配置 DeepSeek API Key 以启用 AI 生成路线
              </p>
            )}
            {createError && (
              <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-accent-red)',
                margin: '0 0 8px',
              }}>
                {createError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateStep('input');
                }}
                style={btnStyle(false)}
                disabled={creating || aiGenerating}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                style={btnStyle(false)}
                disabled={creating || aiGenerating || !newName.trim()}
              >
                {creating ? '创建中...' : '直接创建'}
              </button>
              <button
                onClick={handleAIGenerate}
                style={btnStyle(true)}
                disabled={!newName.trim() || aiGenerating || creating || !deepseekApiKey}
                title={!deepseekApiKey ? '请先在设置中配置 API Key' : undefined}
              >
                {aiGenerating ? 'AI 生成中...' : 'AI 生成学习路线'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create dialog — step 2: editor */}
      {showCreate && createStep === 'editor' && (
        <RoadmapEditor
          mode="create"
          topicName={newName.trim()}
          initialPlanMd={aiPlanMd}
          generating={aiGenerating}
          onBack={() => setCreateStep('input')}
          onSkip={() => {
            setAiPlanMd('');
            setCreateStep('input');
            handleCreate();
          }}
          onConfirm={handleCreateWithPlan}
          onRegenerate={async () => {
            setAiGenerating(true);
            try {
              const md = await generateLearningPlan(newName.trim());
              setAiPlanMd(md);
              setAiGenerating(false);
              return md;
            } catch (e) {
              setAiGenerating(false);
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}
