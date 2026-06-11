import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-page)',
      color: 'var(--color-text-primary)',
    }}>
      <NavBar />
      <main style={{
        flex: 1,
        overflow: 'auto',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
