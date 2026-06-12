import { NavLink } from 'react-router-dom';
import TopicSelector from './TopicSelector';

const navItems = [
  { to: '/', label: '概览' },
  { to: '/roadmap', label: '路线' },
  { to: '/history', label: '历史' },
  { to: '/chat', label: '对话' },
  { to: '/practice', label: '练习' },
  { to: '/settings', label: '设置' },
];

export default function NavBar() {
  const isElectron = typeof (window as any).electronAPI?.isElectron !== 'undefined';

  return (
    <nav
      className="electron-titlebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 10px 0 32px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-card)',
        flexShrink: 0,
      }}
    >
      <div style={{
        fontSize: 'var(--font-size-md)',
        fontWeight: 600,
        color: 'var(--color-accent-blue)',
        marginRight: 24,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
      }}>
        Learn-Anything
      </div>
      <div style={{
        display: 'flex',
        gap: 4,
        flex: 1,
        overflow: 'auto',
      }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              padding: '8px 14px',
              fontSize: 'var(--font-size-base)',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'var(--font-serif)',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <div style={{ marginLeft: 16, marginRight: 20 }}>
        <TopicSelector />
      </div>
      {isElectron && (
        <div className="window-controls">
          <button
            className="window-dot window-dot--minimize"
            onClick={() => (window as any).electronAPI?.minimize()}
            title="最小化"
            aria-label="最小化"
          />
          <button
            className="window-dot window-dot--maximize"
            onClick={() => (window as any).electronAPI?.maximize()}
            title="最大化"
            aria-label="最大化"
          />
          <button
            className="window-dot window-dot--close"
            onClick={() => (window as any).electronAPI?.close()}
            title="关闭"
            aria-label="关闭"
          />
        </div>
      )}
    </nav>
  );
}
