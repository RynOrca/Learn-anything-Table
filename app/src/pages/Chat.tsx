import { useState, useRef, useEffect } from 'react';
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

function formatConversation(messages: ChatMessageType[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const speaker = m.role === 'user' ? '你' : 'AI 教师';
      return `**${speaker}**：${m.content}`;
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Chat() {
  const {
    state,
    knowledgeMap,
    topicName,
    saveSession,
    updateConceptStatus,
  } = useLearningStore();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedConceptPath, setSelectedConceptPath] = useState('');
  const isFirstExchange = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset conversation when switching concepts
  useEffect(() => {
    isFirstExchange.current = true;
    setMessages([]);
  }, [selectedConceptPath]);

  // Auto-scroll to bottom on new messages
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

    const previousMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const concept = state?.concepts.find((c) => c.path === selectedConceptPath);
      const history = previousMessages
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

      setMessages((prev) => [...prev, aiMsg]);

      // Save full conversation as a session
      const fullConversation = formatConversation([...previousMessages, userMsg, aiMsg]);
      await saveSession(selectedConceptPath, 'explain', fullConversation);

      // Update concept status to in_progress if currently unexplored
      if (concept && concept.status === 'unexplored') {
        await updateConceptStatus(selectedConceptPath, 'in_progress', 10);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
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

  const handleMarkMastered = async () => {
    if (!selectedConceptPath || !state) return;
    const concept = state.concepts.find((c) => c.path === selectedConceptPath);
    if (!concept || concept.status === 'mastered') return;

    await updateConceptStatus(selectedConceptPath, 'mastered', 95);
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'system',
        content: `已将「${selectedConceptPath}」标记为已掌握`,
        timestamp: Date.now(),
      },
    ]);
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

  // No topic loaded
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

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      height: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Concept selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
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
        <select
          value={selectedConceptPath}
          onChange={(e) => setSelectedConceptPath(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            outline: 'none',
          }}
        >
          <option value="">-- 选择要学习的概念 --</option>
          {concepts.map((c) => (
            <option key={c.path} value={c.path}>
              {c.path} [{STATUS_LABEL[c.status] ?? c.status}]
            </option>
          ))}
        </select>

        {selectedConcept && (
          <button
            onClick={handleMarkMastered}
            disabled={selectedConcept.status === 'mastered'}
            style={{
              padding: '6px 14px',
              background: selectedConcept.status === 'mastered'
                ? 'var(--color-bg-green)'
                : 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: selectedConcept.status === 'mastered'
                ? 'var(--color-accent-green)'
                : 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              cursor: selectedConcept.status === 'mastered' ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-serif)',
              opacity: selectedConcept.status === 'mastered' ? 0.6 : 1,
            }}
          >
            {selectedConcept.status === 'mastered' ? '已掌握' : '标记已掌握'}
          </button>
        )}
      </div>

      {/* Message list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
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
          messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: 10,
        padding: '12px 16px',
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
          rows={2}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-serif)',
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!selectedConceptPath || sending || !input.trim()}
          style={{
            padding: '8px 20px',
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
            alignSelf: 'flex-end',
          }}
        >
          {sending ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
