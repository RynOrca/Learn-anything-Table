// Electron main process
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
let mainWindow = null;
let serverStarted = false;

// ── Config persistence (userData/config.json) ─────────────────────

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return {};
}

function saveConfig(key, value) {
  try {
    const p = getConfigPath();
    const cfg = loadConfig();
    cfg[key] = value;
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch {}
}

// ── Window state persistence ──────────────────────────────────────

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const p = getWindowStatePath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return { width: 1280, height: 860 };
}

// Debounced save to avoid excessive writes during move/resize
let saveTimer = null;
function saveWindowState() {
  if (!mainWindow) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    try {
      const b = mainWindow.getBounds();
      fs.writeFileSync(getWindowStatePath(), JSON.stringify({
        width: b.width, height: b.height, x: b.x, y: b.y,
        isMaximized: mainWindow.isMaximized(),
      }, null, 2), 'utf-8');
    } catch {}
  }, 500);
}

// ── Express server (in-process, production only) ──────────────────

async function startServer() {
  if (serverStarted) return;

  // Set data directory: load from saved config, fallback to default
  var cfg = loadConfig();
  var dataDir;
  if (cfg.dataDir) {
    dataDir = cfg.dataDir;
  } else if (isDev) {
    dataDir = path.resolve(__dirname, '..', '..');
  } else {
    dataDir = path.dirname(app.getPath('exe'));
  }

  // Pass userData path to Express so it can persist config
  process.env.LEARN_ANYTHING_CONFIG_DIR = app.getPath('userData');
  process.env.LEARN_ANYTHING_DATA_DIR = dataDir;
  process.env.API_PORT = process.env.API_PORT || '17345';

  try {
    // Load and start compiled CJS server, wait until it's listening
    var server = require('../dist-server/index.cjs');
    await server.startServer();
    serverStarted = true;
    console.log('[server] Express started in-process on port ' + process.env.API_PORT);
  } catch (err) {
    console.error('[server] Failed to start Express in-process:', err.message);
  }
}

// ── Window ────────────────────────────────────────────────────────

function createWindow() {
  var state = loadWindowState();
  var opts = {
    width: state.width, height: state.height,
    minWidth: 900, minHeight: 600,
    frame: false, titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  };
  if (state.x !== undefined) { opts.x = state.x; opts.y = state.y; }

  var win = new BrowserWindow(opts);
  mainWindow = win;
  if (state.isMaximized) win.maximize();

  // Dev: load from Vite. Production: load from Express (in-process)
  win.loadURL(isDev ? 'http://localhost:5173' : 'http://localhost:17345');

  win.once('ready-to-show', function() { win.show(); });
  win.webContents.setWindowOpenHandler(function(d) { shell.openExternal(d.url); return { action: 'deny' }; });
  win.on('maximize', function() { win.webContents.send('window:maximize-change', true); });
  win.on('unmaximize', function() { win.webContents.send('window:maximize-change', false); });
  win.on('resize', saveWindowState);
  win.on('move', saveWindowState);
  win.on('close', saveWindowState);
  win.on('closed', function() { mainWindow = null; });

  // Open devtools in dev mode for debugging
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── IPC ───────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.on('window:minimize', function(e) { BrowserWindow.fromWebContents(e.sender)?.minimize(); });
  ipcMain.on('window:maximize', function(e) {
    var w = BrowserWindow.fromWebContents(e.sender);
    w?.isMaximized() ? w.unmaximize() : w?.maximize();
  });
  ipcMain.on('window:close', function(e) { BrowserWindow.fromWebContents(e.sender)?.close(); });
  ipcMain.handle('dialog:selectFolder', async function() {
    var result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择数据目录',
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('config:getDataDir', function() {
    var cfg = loadConfig();
    return cfg.dataDir || process.env.LEARN_ANYTHING_DATA_DIR;
  });
  ipcMain.handle('config:setDataDir', function(_e, dataDir) {
    saveConfig('dataDir', dataDir);
    process.env.LEARN_ANYTHING_DATA_DIR = dataDir;
    return true;
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────

app.whenReady().then(async function() {
  setupIPC();

  if (!isDev) {
    // Production: start Express and wait for it to be fully listening
    await startServer();
  }

  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  app.quit();
});
