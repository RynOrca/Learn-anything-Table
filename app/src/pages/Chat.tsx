import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLearningStore } from '../store/useLearningStore';
import ChatMessage from '../components/ChatMessage';
import * as deepseekApi from '../api/deepseek';
import type { ChatMessage as ChatMessageType, TopicState } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  unexplored: '未探索',
  in_progress: '学习中',
  needs_practice: '需练习',
  mastered: '已掌握',
};

function getUserLevel(state: TopicState | null): string {
  if (!state) return 'beginner';
  const mastered = state.concepts.filter((c) => c.status === 'mastered').length;
  const total = state.concepts.length;
  if (total === 0) return 'beginner';
  const ratio = mastered / total;
  if (ratio > 0.7) return 'advanced';
  if (ratio > 0.3) return 'intermediate';
  return 'beginner';
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatQA(userMsg: ChatMessageType, aiMsg: ChatMessageType): string {
  return `**你**：${userMsg.content}\n\n**AI 教师**：${aiMsg.content}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Chat() {
  const [searchParams] = useSearchParams();
  const {
    state,
    knowledgeMap,
    topicName,
    chatMessages,
    setChatMessages,
    saveSession,
    updateConceptStatus,
  } = useLearningStore();

  const conceptFromUrl = searchParams.get('concept') ?? '';
  const [selectedConceptPath, setSelectedConceptPath] = useState(conceptFromUrl);
  const messages = chatMessages[selectedConceptPath] ?? [];
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conceptDropdownOpen, setConceptDropdownOpen] = useState(false);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState('');
  const conceptDropdownRef = useRef<HTMLDivElement>(null);
  const isFirstExchange = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close concept dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (conceptDropdownRef.current && !conceptDropdownRef.current.contains(e.target as Node)) {
        setConceptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update selected concept when URL param changes
  useEffect(() => {
    if (conceptFromUrl) {
      setSelectedConceptPath(conceptFromUrl);
    }
  }, [conceptFromUrl]);

  // Reset first-exchange flag when switching concepts
  useEffect(() => {
    isFirstExchange.current = true;
    setSavedIndices(new Set());
  }, [selectedConceptPath]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when concept is selected
  useEffect(() => {
    if (selectedConceptPath) {
      inputRef.current?.focus();
    }
  }, [selectedConceptPath]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !selectedConceptPath || !topicName) return;

    const userMsg: ChatMessageType = {
      id: uid(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const currentMessages = messages;
    setChatMessages(selectedConceptPath, [...currentMessages, userMsg]);
    setInput('');
    setSending(true);

    try {
      const concept = state?.concepts.find((c) => c.path === selectedConceptPath);
      const history = currentMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      let aiContent: string;

      if (isFirstExchange.current) {
        aiContent = await deepseekApi.explain(
          selectedConceptPath,
          knowledgeMap ?? '',
          getUserLevel(state),
          [{ role: 'user', content: userMsg.content }],
        );
        isFirstExchange.current = false;
      } else {
        aiContent = await deepseekApi.chat(
          selectedConceptPath,
          userMsg.content,
          history,
        );
      }

      const aiMsg: ChatMessageType = {
        id: uid(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };

      const updated = useLearningStore.getState().chatMessages[selectedConceptPath] ?? currentMessages;
      setChatMessages(selectedConceptPath, [...updated, aiMsg]);

      // Update concept status to in_progress if currently unexplored
      if (concept && concept.status === 'unexplored') {
        await updateConceptStatus(selectedConceptPath, 'in_progress', 10);
      }
    } catch (e) {
      const updated = useLearningStore.getState().chatMessages[selectedConceptPath] ?? currentMessages;
      setChatMessages(selectedConceptPath, [
        ...updated,
        {
          id: uid(),
          role: 'system',
          content: `错误：${(e as Error).message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSaveQA = useCallback(async (msgIndex: number) => {
    if (!selectedConceptPath || !topicName) return;
    // Find the Q&A pair: the message at msgIndex is the assistant response,
    // the user message is right before it
    const currentMsgs = chatMessages[selectedConceptPath] ?? [];
    if (msgIndex < 1) return;
    const aiMsg = currentMsgs[msgIndex];
    const userMsg = currentMsgs[msgIndex - 1];
    if (!aiMsg || !userMsg || aiMsg.role !== 'assistant' || userMsg.role !== 'user') return;

    const content = formatQA(userMsg, aiMsg);
    setSaveError('');
    try {
      await saveSession(selectedConceptPath, 'explain', content);
      setSavedIndices((prev) => new Set(prev).add(msgIndex));
    } catch (e) {
      setSaveError(`保存失败：${(e as Error).message}`);
      setTimeout(() => setSaveError(''), 4000);
    }
  }, [selectedConceptPath, topicName, chatMessages, saveSession]);

  const handleMarkMastered = async () => {
    if (!selectedConceptPath || !state) return;
    const concept = state.concepts.find((c) => c.path === selectedConceptPath);
    if (!concept) return;

    if (concept.status === 'mastered') {
      // Toggle off: revert to in_progress
      await updateConceptStatus(selectedConceptPath, 'in_progress', 50);
    } else {
      await updateConceptStatus(selectedConceptPath, 'mastered', 95);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const concepts = state?.concepts ?? [];
  const selectedConcept = concepts.find((c) => c.path === selectedConceptPath);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!topicName) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
      }}>
        请先在顶部选择一个学习主题
      </div>
    );
  }

  const btnHeight = 44;

  return (
    <div style={{
      maxWidth: 860,
      margin: '0 auto',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Concept selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <label style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}>
          学习概念
        </label>
        <div ref={conceptDropdownRef} style={{ position: 'relative', flex: 1 }}>
          <div
            role="button"
            tabIndex={0}
            style={{
              padding: '10px 16px',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: selectedConceptPath ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
            onClick={() => setConceptDropdownOpen(!conceptDropdownOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setConceptDropdownOpen(!conceptDropdownOpen);
              }
            }}
          >
            <span>
              {selectedConceptPath
                ? `${selectedConceptPath} [${STATUS_LABEL[selectedConcept?.status ?? 'unexplored']}]`
                : '-- 选择要学习的概念 --'}
            </span>
            <span style={{
              color: 'var(--color-text-tertiary)',
              fontSize: '10px',
              transition: 'transform 0.2s',
              transform: conceptDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              ▼
            </span>
          </div>
          {conceptDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: 360,
              overflow: 'auto',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 200,
            }}>
              {concepts.map((c) => (
                <div
                  key={c.path}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: c.path === selectedConceptPath ? 'var(--color-accent-blue)' : 'var(--color-text-primary)',
                    background: c.path === selectedConceptPath ? 'var(--color-bg-blue)' : 'transparent',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onClick={() => {
                    setSelectedConceptPath(c.path);
                    setConceptDropdownOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    if (c.path !== selectedConceptPath) {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }
                  }}
                >
                  <span>{c.path}</span>
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: c.status === 'mastered'
                      ? 'var(--color-accent-green)'
                      : c.status === 'in_progress'
                        ? 'var(--color-accent-blue)'
                        : c.status === 'needs_practice'
                          ? 'var(--color-accent-yellow)'
                          : 'var(--color-text-tertiary)',
                  }}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedConcept && (
          <button
            onClick={handleMarkMastered}
            style={{
              padding: '10px 20px',
              background: selectedConcept.status === 'mastered'
                ? 'var(--color-bg-green)'
                : 'var(--color-bg-card)',
              border: '1px solid',
              borderColor: selectedConcept.status === 'mastered'
                ? 'var(--color-accent-green)'
                : 'var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: selectedConcept.status === 'mastered'
                ? 'var(--color-accent-green)'
                : 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {selectedConcept.status === 'mastered' ? '取消已掌握' : '标记已掌握'}
          </button>
        )}
      </div>

      {/* Message list */}
      {saveError && (
        <div style={{
          margin: '0 20px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-yellow)',
          border: '1px solid var(--color-accent-yellow)',
          color: 'var(--color-accent-yellow)',
          fontSize: 'var(--font-size-xs)',
          textAlign: 'center',
        }}>
          {saveError}
        </div>
      )}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px',
      }}>
        {!selectedConceptPath ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}>
            请选择一个概念，开始 AI 对话学习
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}>
            输入你的第一个问题，AI 教师将为你讲解「{selectedConceptPath}」
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage
              key={m.id}
              message={m}
              onSave={m.role === 'assistant' ? () => handleSaveQA(i) : undefined}
              showSaved={savedIndices.has(i)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        padding: '14px 20px',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedConceptPath
              ? '输入消息，Enter 发送，Shift+Enter 换行...'
              : '请先选择概念'
          }
          disabled={!selectedConceptPath || sending}
          style={{
            flex: 1,
            height: btnHeight,
            padding: '10px 14px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!selectedConceptPath || sending || !input.trim()}
          style={{
            height: btnHeight,
            padding: '0 24px',
            background: 'var(--color-accent-blue)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            cursor: selectedConceptPath && !sending && input.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-serif)',
            opacity: selectedConceptPath && !sending && input.trim() ? 1 : 0.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {sending ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
