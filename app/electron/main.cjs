// Electron main process
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const isDev = !app.isPackaged;
let serverProcess = null;
let mainWindow = null;

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

// ── Express server ────────────────────────────────────────────────

function startServer() {
  return new Promise(function(resolve, reject) {
    var serverPath = path.join(__dirname, '..', 'server', 'index.ts');
    var dataDir = isDev
      ? path.resolve(__dirname, '..', '..')
      : path.dirname(app.getPath('exe'));

    serverProcess = spawn('npx', ['tsx', serverPath], {
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, {
        LEARN_ANYTHING_DATA_DIR: dataDir,
        API_PORT: '3456',
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    var started = false;
    serverProcess.stdout.on('data', function(d) {
      var m = d.toString();
      console.log('[server]', m.trim());
      if (!started && m.indexOf('localhost:3456') !== -1) { started = true; resolve(); }
    });
    serverProcess.stderr.on('data', function(d) { console.error('[server:err]', d.toString().trim()); });
    serverProcess.on('error', reject);
    serverProcess.on('exit', function(c) { console.log('[server] exited', c); serverProcess = null; });
    setTimeout(function() { if (!started) { started = true; resolve(); } }, 5000);
  });
}

function stopServer() {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
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

  win.loadURL(isDev ? 'http://localhost:5173' : 'http://localhost:3456');
  win.once('ready-to-show', function() { win.show(); });
  win.webContents.setWindowOpenHandler(function(d) { shell.openExternal(d.url); return { action: 'deny' }; });
  win.on('maximize', function() { win.webContents.send('window:maximize-change', true); });
  win.on('unmaximize', function() { win.webContents.send('window:maximize-change', false); });
  win.on('resize', saveWindowState);
  win.on('move', saveWindowState);
  win.on('close', saveWindowState);
  win.on('closed', function() { mainWindow = null; });
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

app.whenReady().then(async function() {
  setupIPC();
  if (!isDev) {
    try { await startServer(); } catch(e) { console.error('Failed to start server:', e); }
  }
  createWindow();
  app.on('activate', function() { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', function() { stopServer(); app.quit(); });
app.on('before-quit', function() { stopServer(); });
