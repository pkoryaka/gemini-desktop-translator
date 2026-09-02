const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
  readClipboard: () => ipcRenderer.invoke('clipboard:read')
});
