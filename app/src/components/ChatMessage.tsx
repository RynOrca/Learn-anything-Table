import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSave?: () => void;
  showSaved?: boolean;
}

// Helper: extract plain text from React children for pattern matching
function extractText(children: any): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText(children.props.children);
  }
  return '';
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
            // Render paragraphs starting with ⚠️ with warning style
            p({ children, ...props }: any) {
              const text = extractText(children);
              const isWarning = text?.startsWith('⚠️');
              return (
                <p
                  style={isWarning ? {
                    background: 'rgba(255, 193, 7, 0.08)',
                    borderLeft: '3px solid var(--color-accent-yellow, #ffc107)',
                    padding: '8px 12px',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    margin: '8px 0',
                  } : undefined}
                  title={isWarning ? '此信息未在官方文档中验证' : undefined}
                  {...props}
                >
                  {children}
                </p>
              );
            },
            // Render blockquotes with warning style when they contain ⚠️
            blockquote({ children, ...props }: any) {
              const text = extractText(children);
              const isDegradationBanner = text?.includes('⚠️') && (
                text?.includes('未经过实时') ||
                text?.includes('训练数据生成') ||
                text?.includes('官方文档验证')
              );
              return (
                <blockquote
                  style={isDegradationBanner ? {
                    background: 'rgba(255, 152, 0, 0.1)',
                    borderLeft: '4px solid #ff9800',
                    padding: '10px 14px',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    margin: '8px 0',
                    fontStyle: 'normal',
                  } : {
                    borderLeft: '3px solid var(--color-border)',
                    paddingLeft: 12,
                    color: 'var(--color-text-secondary)',
                    margin: '8px 0',
                  }}
                  {...props}
                >
                  {children}
                </blockquote>
              );
            },
            // Style source links with icon
            a({ href, children, ...props }: any) {
              const isSourceLink = href?.includes('github.com') || href?.includes('raw.githubusercontent');
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-accent-blue)',
                    textDecoration: 'underline',
                    fontSize: 'var(--font-size-xs)',
                  }}
                  {...props}
                >
                  {isSourceLink ? `📋 ${children}` : children}
                </a>
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
