import { useState, type ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { checkLatestVersion } from '../api/github';
import type { GitHubRelease } from '../api/github';

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
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  const store = useSettingsStore();
  const [localApiKey, setLocalApiKey] = useState(store.deepseekApiKey);
  const [localDataDir, setLocalDataDir] = useState(store.dataDir);
  const [localFontSize, setLocalFontSize] = useState(store.fontSize);
  const [saved, setSaved] = useState(false);
  const [versionInfo, setVersionInfo] = useState<GitHubRelease | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSave = () => {
    store.setApiKey(localApiKey);
    store.setDataDir(localDataDir);
    store.setFontSize(localFontSize);
    store.saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const r = await checkLatestVersion();
      setVersionInfo(r);
    } catch {
      setVersionInfo(null);
    } finally {
      setChecking(false);
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
        <input
          type="text"
          value={localDataDir}
          onChange={(e) => setLocalDataDir(e.currentTarget.value)}
          style={inputStyle}
        />
      </SectionCard>

      {/* Font Size */}
      <SectionCard title="字体大小">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={10}
            max={20}
            value={localFontSize}
            onChange={(e) => setLocalFontSize(Number(e.currentTarget.value))}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              minWidth: 40,
              textAlign: 'right',
            }}
          >
            {localFontSize}px
          </span>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div style={{ marginBottom: 32 }}>
        <button onClick={handleSave} style={saveButtonStyle}>
          {saved ? '已保存' : '保存设置'}
        </button>
      </div>

      {/* Version & Sync */}
      <SectionCard title="版本">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            当前版本: v0.1.0
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleCheck}
              disabled={checking}
              style={secondaryButtonStyle}
            >
              {checking ? '检查中...' : '检查更新'}
            </button>
            <button
              onClick={() =>
                window.open('https://github.com/ChenChenyaqi/learn-anything', '_blank')
              }
              style={secondaryButtonStyle}
            >
              同步 GitHub
            </button>
          </div>
          {versionInfo && (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-page)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 4,
                }}
              >
                {versionInfo.name} ({versionInfo.tag_name})
              </div>
              <div>
                发布于:{' '}
                {new Date(versionInfo.published_at).toLocaleDateString('zh-CN')}
              </div>
              <a
                href={versionInfo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-accent-blue)',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                查看详情
              </a>
            </div>
          )}
          {checking === false && versionInfo === null && (
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              点击"检查更新"获取最新版本信息
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
