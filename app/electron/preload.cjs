// Preload script — exposes safe APIs to renderer via contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Check if running in Electron
  isElectron: true,

  // Window state change events
  onMaximizeChange: function(callback) {
    ipcRenderer.on('window:maximize-change', function(_event, isMaximized) {
      callback(isMaximized);
    });
  },

  // Native folder selection dialog
  selectFolder: function() {
    return ipcRenderer.invoke('dialog:selectFolder');
  },

  // Config persistence (saved to userData/config.json)
  getDataDir: function() {
    return ipcRenderer.invoke('config:getDataDir');
  },
  setDataDir: function(dataDir) {
    return ipcRenderer.invoke('config:setDataDir', dataDir);
  },
});
