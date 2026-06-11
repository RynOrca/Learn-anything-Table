import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSave?: () => void;
  showSaved?: boolean;
}

export default function ChatMessage({ message, onSave, showSaved }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          background: 'var(--color-bg-card)',
          padding: '6px 16px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-border)',
        }}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        marginBottom: 4,
        marginLeft: isUser ? 0 : 4,
        marginRight: isUser ? 4 : 0,
      }}>
        {isUser ? '你' : 'AI 教师'}
      </div>
      <div className="markdown-content" style={{
        maxWidth: '80%',
        background: isUser ? 'var(--color-bg-blue)' : 'var(--color-bg-card)',
        border: `1px solid ${isUser ? '#1f2b3d' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-primary)',
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }: any) {
              const isBlock = className?.startsWith('language-');
              if (isBlock) {
                return (
                  <div style={{ position: 'relative', margin: '8px 0' }}>
                    <pre style={{
                      background: 'var(--color-bg-page)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      overflow: 'auto',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <code className={className} {...props}>{children}</code>
                    </pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children))}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-secondary)',
                        padding: '2px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-serif)',
                      }}
                    >
                      复制
                    </button>
                  </div>
                );
              }
              return (
                <code style={{
                  background: 'var(--color-bg-page)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-mono)',
                }} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {/* Save button after assistant messages */}
      {!isUser && onSave && (
        <button
          onClick={onSave}
          disabled={showSaved}
          style={{
            marginTop: 6,
            marginLeft: 4,
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: showSaved ? 'var(--color-bg-green)' : 'transparent',
            color: showSaved ? 'var(--color-accent-green)' : 'var(--color-text-tertiary)',
            fontSize: '10px',
            fontFamily: 'var(--font-serif)',
            cursor: showSaved ? 'default' : 'pointer',
            opacity: showSaved ? 0.8 : 1,
          }}
        >
          {showSaved ? '已保存' : '保存至历史'}
        </button>
      )}
    </div>
  );
}
