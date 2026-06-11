import { useState, useEffect, type ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const;

const saveButtonStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--color-accent-green)',
  background: 'var(--color-bg-green)',
  color: 'var(--color-accent-green)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-serif)',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
  transition: 'opacity 0.15s',
} as const;

const secondaryButtonStyle = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-serif)',
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 0.15s',
} as const;

// ---------------------------------------------------------------------------
// Section card helper
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        marginBottom: 16,
        border: '1px solid var(--color-border)',
      }}
    >
      <label
        style={{
          display: 'block',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          marginBottom: 10,
          fontFamily: 'var(--font-serif)',
        }}
      >
        {title}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Electron API helper
// ---------------------------------------------------------------------------

function getElectronAPI() {
  return (window as any).electronAPI as {
    selectFolder: () => Promise<string | null>;
    isElectron: boolean;
  } | undefined;
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  const store = useSettingsStore();
  const [localApiKey, setLocalApiKey] = useState(store.deepseekApiKey);
  const [localDataDir, setLocalDataDir] = useState(store.dataDir);
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundTopics, setFoundTopics] = useState<string[]>([]);
  const [scanError, setScanError] = useState('');

  const electronAPI = getElectronAPI();
  const isElectron = !!electronAPI?.isElectron;

  // Fetch current data directory and topics on mount
  useEffect(() => {
    fetch('/api/config/data-dir')
      .then(r => r.json())
      .then(d => {
        if (d.dataDir && d.dataDir !== localDataDir) {
          setLocalDataDir(d.dataDir);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  const handleSave = () => {
    store.setApiKey(localApiKey);
    store.setDataDir(localDataDir);
    store.saveSettings();

    // Also persist to .env on server side
    fetch('/api/config/data-dir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataDir: localDataDir }),
    }).catch(() => {});

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBrowse = async () => {
    if (!electronAPI?.selectFolder) return;
    const folder = await electronAPI.selectFolder();
    if (folder) {
      setLocalDataDir(folder);
    }
  };

  const handleScanTopics = async () => {
    setScanning(true);
    setScanError('');
    setFoundTopics([]);
    try {
      const resp = await fetch('/api/config/scan-topics');
      const data = await resp.json();
      if (data.topics && Array.isArray(data.topics)) {
        setFoundTopics(data.topics);
      } else {
        setScanError('未找到主题文件夹');
      }
    } catch {
      setScanError('扫描失败，请检查服务器是否运行');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 600,
          marginBottom: 24,
          color: 'var(--color-text-primary)',
        }}
      >
        设置
      </h1>

      {/* DeepSeek API Key */}
      <SectionCard title="DeepSeek API Key">
        <input
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.currentTarget.value)}
          placeholder="sk-..."
          style={inputStyle}
        />
      </SectionCard>

      {/* Data Directory */}
      <SectionCard title="数据目录">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={localDataDir}
            onChange={(e) => setLocalDataDir(e.currentTarget.value)}
            placeholder="例如: D:\Code\Learn-anything"
            style={{ ...inputStyle, flex: 1 }}
          />
          {isElectron && (
            <button onClick={handleBrowse} style={secondaryButtonStyle}>
              浏览...
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleScanTopics}
            disabled={scanning}
            style={secondaryButtonStyle}
          >
            {scanning ? '扫描中...' : '检测主题'}
          </button>
          {scanError && (
            <span style={{ color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
              {scanError}
            </span>
          )}
        </div>
        {foundTopics.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 8,
                fontFamily: 'var(--font-serif)',
              }}
            >
              检测到 {foundTopics.length} 个主题：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {foundTopics.map((topic) => (
                <span
                  key={topic}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-bg-blue)',
                    color: 'var(--color-accent-blue)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Save Button */}
      <div style={{ marginBottom: 32 }}>
        <button onClick={handleSave} style={saveButtonStyle}>
          {saved ? '已保存' : '保存设置'}
        </button>
      </div>

      {/* Version */}
      <SectionCard title="版本">
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          当前版本: v0.2.0
        </div>
      </SectionCard>
    </div>
  );
}
