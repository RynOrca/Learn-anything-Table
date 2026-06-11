// Electron main process
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
let mainWindow = null;
let serverStarted = false;

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

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const b = mainWindow.getBounds();
    fs.writeFileSync(getWindowStatePath(), JSON.stringify({
      width: b.width, height: b.height, x: b.x, y: b.y,
      isMaximized: mainWindow.isMaximized(),
    }, null, 2), 'utf-8');
  } catch {}
}

// ── Express server (in-process, production only) ──────────────────

function startServer() {
  if (serverStarted) return;

  // Set data directory: in production, use the folder containing the exe
  var dataDir = isDev
    ? path.resolve(__dirname, '..', '..')
    : path.dirname(app.getPath('exe'));

  process.env.LEARN_ANYTHING_DATA_DIR = dataDir;
  process.env.API_PORT = process.env.API_PORT || '17345';

  try {
    // Load pre-compiled CJS server (compiled by esbuild during build step)
    require('../dist-server/index.cjs');
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
}

// ── Lifecycle ─────────────────────────────────────────────────────

app.whenReady().then(function() {
  setupIPC();

  if (!isDev) {
    // Production: start Express in-process before creating window
    startServer();
  }

  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  app.quit();
});
