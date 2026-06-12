import { useState, useEffect, type ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { fetchSkills, reloadSkills, validateContext7Key, clearContext7Cache } from '../api/skills';
import type { SkillSummary } from '../api/skills';

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

const codeStyle = {
  padding: '1px 6px',
  borderRadius: 3,
  background: 'var(--color-bg-page)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-xs)',
} as const;

// ---------------------------------------------------------------------------
// Section card helper
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      borderRadius: 'var(--radius-md)',
      padding: 20,
      marginBottom: 16,
      border: '1px solid var(--color-border)',
    }}>
      <label style={{
        display: 'block',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        marginBottom: 10,
        fontFamily: 'var(--font-serif)',
      }}>
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
    getDataDir: () => Promise<string>;
    setDataDir: (dir: string) => Promise<boolean>;
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
  const [importing, setImporting] = useState(false);

  // Context7 state
  const [localContext7ApiKey, setLocalContext7ApiKey] = useState(store.context7ApiKey);
  const [localContext7Enabled, setLocalContext7Enabled] = useState(store.context7Enabled);
  const [validatingCtx7, setValidatingCtx7] = useState(false);
  const [ctx7Status, setCtx7Status] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Skills state
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [needsSync, setNeedsSync] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const electronAPI = getElectronAPI();
  const isElectron = !!electronAPI?.isElectron;

  // Fetch current data directory on mount
  useEffect(() => {
    fetch('/api/config/data-dir')
      .then(r => r.json())
      .then(d => {
        if (d.dataDir && d.dataDir !== localDataDir) {
          setLocalDataDir(d.dataDir);
        }
      })
      .catch(() => {});
  }, []);

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setSkillsLoading(true);
    try {
      const data = await fetchSkills();
      setSkills(data.skills);
      setNeedsSync(data.needsSync);
    } catch { /* ignore */ }
    setSkillsLoading(false);
  };

  const handleSave = () => {
    store.setApiKey(localApiKey);
    store.setDataDir(localDataDir);
    store.setContext7ApiKey(localContext7ApiKey);
    store.setContext7Enabled(localContext7Enabled);
    store.saveSettings();

    fetch('/api/config/data-dir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataDir: localDataDir }),
    }).catch(() => {});

    if (electronAPI?.setDataDir) {
      electronAPI.setDataDir(localDataDir).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('datadir-changed', { detail: localDataDir }));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBrowse = async () => {
    if (!electronAPI?.selectFolder) return;
    const folder = await electronAPI.selectFolder();
    if (folder) setLocalDataDir(folder);
  };

  const handleContext7Validate = async () => {
    if (!localContext7ApiKey) return;
    setValidatingCtx7(true);
    setCtx7Status('idle');
    try {
      const result = await validateContext7Key(localContext7ApiKey);
      setCtx7Status(result.valid ? 'valid' : 'invalid');
    } catch {
      setCtx7Status('invalid');
    }
    setValidatingCtx7(false);
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
      <h1 style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 600,
        marginBottom: 24,
        color: 'var(--color-text-primary)',
      }}>
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
          <button onClick={handleScanTopics} disabled={scanning} style={secondaryButtonStyle}>
            {scanning ? '扫描中...' : '检测主题'}
          </button>
          {scanError && (
            <span style={{ color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
              {scanError}
            </span>
          )}
        </div>
        {foundTopics.length > 0 && (
          <div style={{
            marginTop: 12, padding: 12, borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-page)', border: '1px solid var(--color-border)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
            }}>
              <span style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-serif)',
              }}>
                检测到 {foundTopics.length} 个主题：
              </span>
              <button
                onClick={async () => {
                  setImporting(true);
                  try {
                    await fetch('/api/config/data-dir', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dataDir: localDataDir }),
                    });
                    if (electronAPI?.setDataDir) {
                      await electronAPI.setDataDir(localDataDir);
                    }
                    store.setDataDir(localDataDir);
                    store.saveSettings();
                    window.dispatchEvent(new CustomEvent('datadir-changed', { detail: localDataDir }));
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  } catch { /* ignore */ }
                  setImporting(false);
                }}
                disabled={importing}
                style={{
                  padding: '3px 12px', borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--color-accent-green)',
                  background: 'var(--color-bg-green)', color: 'var(--color-accent-green)',
                  fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-serif)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {importing ? '导入中...' : '使用此目录'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {foundTopics.map((topic) => (
                <span key={topic} style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-bg-blue)', color: 'var(--color-accent-blue)',
                  fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--color-border)',
                }}>
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

      {/* Context7 Configuration */}
      <SectionCard title="Context7 实时文档">
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            value={localContext7ApiKey}
            onChange={(e) => { setLocalContext7ApiKey(e.currentTarget.value); setCtx7Status('idle'); }}
            placeholder="Context7 API Key（可选）"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <button
            onClick={handleContext7Validate}
            disabled={validatingCtx7 || !localContext7ApiKey}
            style={secondaryButtonStyle}
          >
            {validatingCtx7 ? '验证中...' : '验证 Key'}
          </button>
          {ctx7Status === 'valid' && (
            <span style={{ color: 'var(--color-accent-green)', fontSize: 'var(--font-size-sm)' }}>✅ Key 有效</span>
          )}
          {ctx7Status === 'invalid' && (
            <span style={{ color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>❌ Key 无效</span>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={localContext7Enabled}
            onChange={(e) => setLocalContext7Enabled(e.currentTarget.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            启用 Context7 实时文档查询（AI 讲解时将自动搜索最新官方文档）
          </span>
        </label>
      </SectionCard>

      {/* GitHub Repository */}
      <SectionCard title="GitHub 仓库">
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginTop: 0, marginBottom: 8 }}>
            本项目基于{' '}
            <a href="https://github.com/ChenChenyaqi/learn-anything"
               target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--color-accent-blue)', fontWeight: 600 }}>
              ChenChenyaqi/learn-anything
            </a>
            {' '}构建，原始项目通过 Claude Code CLI 技能文件实现递归学习。
          </p>
          <p style={{ margin: '8px 0' }}>
            网页应用的 AI Skills 存放在{' '}
            <code style={codeStyle}>.learn/skills/</code>{' '}
            目录下，支持两种格式：单个 <code style={codeStyle}>.md</code> 文件，或包含 <code style={codeStyle}>SKILL.md</code> 的子目录。
          </p>
        </div>

        {/* Update guide — two approaches */}
        <div style={{
          marginTop: 12, padding: 12,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-page)',
          border: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
            📝 如何更新 Skills
          </div>

          <div style={{
            marginBottom: 10, padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-green)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-accent-green)', marginBottom: 4 }}>
              🖐 方式一：手动更新
            </div>
            <div>1. 访问{' '}
              <a href="https://github.com/ChenChenyaqi/learn-anything"
                 target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--color-accent-blue)' }}>
                GitHub 仓库
              </a>
              {' '}，找到 skills 目录
            </div>
            <div>2. 下载 skills 文件夹，放入 <code style={codeStyle}>.learn/skills/</code></div>
            <div>3. 每个子目录内含 <code style={codeStyle}>SKILL.md</code> = 一个 AI 行为</div>
            <div>4. 编辑后保存，文件修改会自动热加载（无需重启）</div>
          </div>

          <div style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-blue)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-accent-blue)', marginBottom: 4 }}>
              🤖 方式二：让 Agent 帮你更新
            </div>
            <div>在 Claude Code 对话中输入：</div>
            <div style={{
              marginTop: 4, padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
            }}>
              帮我更新 learn-anything 的 skills 版本
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <a
            href="https://github.com/ChenChenyaqi/learn-anything"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-page)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-serif)',
              textDecoration: 'none', cursor: 'pointer',
            }}
          >
            🔗 访问 GitHub 仓库
          </a>
        </div>
      </SectionCard>

      {/* Skills Management */}
      <SectionCard title="Skills 管理">
        {needsSync && (
          <div style={{
            marginBottom: 12, padding: 10,
            borderRadius: 'var(--radius-sm)',
            background: store.deepseekApiKey ? 'var(--color-bg-blue)' : 'var(--color-bg-yellow)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
          }}>
            ℹ️ 当前使用<strong style={{ color: 'var(--color-text-primary)' }}>内置默认 Skills</strong>（共 10 个）。
            {store.deepseekApiKey
              ? ' AI 功能可用。如需自定义，请按上方教程手动添加文件。'
              : ' 请先在上方配置 DeepSeek API Key，AI 功能才能使用。'
            }
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={loadSkills} disabled={skillsLoading} style={secondaryButtonStyle}>
            {skillsLoading ? '加载中...' : '刷新列表'}
          </button>
          <button onClick={async () => {
            await reloadSkills();
            await loadSkills();
          }} style={secondaryButtonStyle}>
            重新加载
          </button>
        </div>
        {skills.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {skills.map((s) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-page)', border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{s.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{s.displayName}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--font-size-xs)',
                    background: s.source === 'github' ? 'var(--color-bg-green)' : s.source === 'user' ? 'var(--color-bg-yellow)' : 'var(--color-bg-blue)',
                    color: s.source === 'github' ? 'var(--color-accent-green)' : s.source === 'user' ? 'var(--color-accent-yellow)' : 'var(--color-accent-blue)',
                  }}>
                    {s.source}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>v{s.version}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {skillsLoading ? '加载中...' : '暂无已加载的 Skills'}
          </div>
        )}
      </SectionCard>

      {/* Version */}
      <SectionCard title="版本">
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          当前版本: v0.2.0
        </div>
      </SectionCard>
    </div>
  );
}
