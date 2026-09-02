const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  hideToTray: () => ipcRenderer.invoke('window:hide-to-tray'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enable) => ipcRenderer.invoke('autostart:set', enable),
  getHotkeys: () => ipcRenderer.invoke('hotkeys:get'),
  updateHotkeys: (config) => ipcRenderer.invoke('hotkeys:update', config),
  onQuickTranslate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('quick-translate', subscription);
    return () => ipcRenderer.removeListener('quick-translate', subscription);
  },
  onOpenSettings: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('open-settings', subscription);
    return () => ipcRenderer.removeListener('open-settings', subscription);
  }
});
