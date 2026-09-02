const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  hideToTray: () => ipcRenderer.invoke('window:hide-to-tray'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  setWindowMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  setWindowSize: (size) => ipcRenderer.invoke('window:set-size', size),
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enable) => ipcRenderer.invoke('autostart:set', enable),
  getStartMinimized: () => ipcRenderer.invoke('config:get-start-minimized'),
  setStartMinimized: (val) => ipcRenderer.invoke('config:set-start-minimized', val),
  getHotkeys: () => ipcRenderer.invoke('hotkeys:get'),
  updateHotkeys: (config) => ipcRenderer.invoke('hotkeys:update', config),
  nativeTranslate: (options) => ipcRenderer.invoke('native:translate', options),
  onQuickTranslate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('quick-translate', subscription);
    return () => ipcRenderer.removeListener('quick-translate', subscription);
  },
  onOpenSettings: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('open-settings', subscription);
    return () => ipcRenderer.removeListener('open-settings', subscription);
  },
  onShowFullWindow: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('show-full-window', subscription);
    return () => ipcRenderer.removeListener('show-full-window', subscription);
  }
});
