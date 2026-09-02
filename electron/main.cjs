const { app, BrowserWindow, ipcMain, shell, clipboard, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

let translateHotkey = 'CommandOrControl+Alt+T';
let explainHotkey = 'CommandOrControl+Alt+J';

function getIconPath() {
  const icoPath = path.join(__dirname, 'app-icon.ico');
  if (fs.existsSync(icoPath)) return icoPath;
  const pngPath = path.join(__dirname, 'app-icon.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return path.join(__dirname, 'icon.svg');
}

function getStartupShortcutPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Gemini Translator.lnk');
}

function isAutoStartEnabled() {
  if (process.platform === 'win32') {
    const startupPath = getStartupShortcutPath();
    if (fs.existsSync(startupPath)) return true;
    return app.getLoginItemSettings().openAtLogin;
  }
  return app.getLoginItemSettings().openAtLogin;
}

function setAutoStartEnabled(enable) {
  if (process.platform === 'win32') {
    const startupPath = getStartupShortcutPath();
    if (enable) {
      const vbsScript = path.join(__dirname, '..', 'launch.vbs');
      const iconFile = getIconPath();
      const psCommand = `
        $WshShell = New-Object -comObject WScript.Shell;
        $Shortcut = $WshShell.CreateShortcut("${startupPath.replace(/\\/g, '\\\\')}");
        $Shortcut.TargetPath = "wscript.exe";
        $Shortcut.Arguments = "\\"${vbsScript.replace(/\\/g, '\\\\')}\\"";
        $Shortcut.WorkingDirectory = "${path.join(__dirname, '..').replace(/\\/g, '\\\\')}";
        $Shortcut.IconLocation = "${iconFile.replace(/\\/g, '\\\\')}";
        $Shortcut.Description = "Gemini AI Desktop Translator (Silent Auto-start)";
        $Shortcut.Save();
      `;
      exec(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
        if (err) console.warn('Autostart shortcut creation warning:', err);
      });
    } else {
      if (fs.existsSync(startupPath)) {
        try {
          fs.unlinkSync(startupPath);
        } catch (e) {
          console.warn('Could not remove autostart shortcut:', e);
        }
      }
    }
  }

  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true
  });

  return enable;
}

// Create Windows Start Menu Shortcut automatically (with app-icon.ico)
function ensureStartMenuShortcut() {
  if (process.platform === 'win32') {
    try {
      const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
      const startMenuDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      const shortcutPath = path.join(startMenuDir, 'Gemini Translator.lnk');
      const vbsScript = path.join(__dirname, '..', 'launch.vbs');
      const iconFile = getIconPath();

      const psCommand = `
        $WshShell = New-Object -comObject WScript.Shell;
        $Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}");
        $Shortcut.TargetPath = "wscript.exe";
        $Shortcut.Arguments = "\\"${vbsScript.replace(/\\/g, '\\\\')}\\"";
        $Shortcut.WorkingDirectory = "${path.join(__dirname, '..').replace(/\\/g, '\\\\')}";
        $Shortcut.IconLocation = "${iconFile.replace(/\\/g, '\\\\')}";
        $Shortcut.Description = "Gemini AI Desktop Translator";
        $Shortcut.Save();
      `;
      exec(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
        if (err) console.warn('Start menu shortcut creation warning:', err);
      });
    } catch (e) {
      console.warn('Could not create start menu shortcut:', e);
    }
  }
}

function getAppIcon() {
  const iconPath = getIconPath();
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

function createWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'Gemini AI Desktop Translator',
    backgroundColor: '#090d16',
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Intercept window close to minimize to system tray
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Gemini Translator',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: `Quick Translate (${translateHotkey.replace('CommandOrControl', 'Ctrl')})`,
      click: () => {
        triggerGlobalSelectionTranslation(false);
      }
    },
    {
      label: `Translate & Explain Jargon (${explainHotkey.replace('CommandOrControl', 'Ctrl')})`,
      click: () => {
        triggerGlobalSelectionTranslation(true);
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Translator',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip(`Gemini Translator (${translateHotkey.replace('CommandOrControl', 'Ctrl')} to translate)`);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  const icon = getAppIcon();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  updateTrayMenu();

  // Toggle window on single/double click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Global hotkey handler: Grabs highlighted text from any Windows app and translates it
function triggerGlobalSelectionTranslation(explainJargon = false) {
  if (process.platform === 'win32') {
    // Send Ctrl+C to active foreground window via PowerShell SendKeys
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms;
      [System.Windows.Forms.SendKeys]::SendWait("^c");
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, () => {
      setTimeout(() => {
        const selectedText = clipboard.readText();
        
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          
          if (selectedText && selectedText.trim()) {
            mainWindow.webContents.send('quick-translate', {
              text: selectedText.trim(),
              explainJargon
            });
          }
        }
      }, 120);
    });
  } else {
    const text = clipboard.readText();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (text && text.trim()) {
        mainWindow.webContents.send('quick-translate', {
          text: text.trim(),
          explainJargon
        });
      }
    }
  }
}

function registerGlobalHotkeys(newTranslateKey, newExplainKey) {
  globalShortcut.unregisterAll();

  if (newTranslateKey) translateHotkey = newTranslateKey;
  if (newExplainKey) explainHotkey = newExplainKey;

  try {
    globalShortcut.register(translateHotkey, () => {
      triggerGlobalSelectionTranslation(false);
    });
  } catch (e) {
    console.warn(`Failed to register translate hotkey ${translateHotkey}:`, e);
  }

  try {
    globalShortcut.register(explainHotkey, () => {
      triggerGlobalSelectionTranslation(true);
    });
  } catch (e) {
    console.warn(`Failed to register explain hotkey ${explainHotkey}:`, e);
  }

  updateTrayMenu();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalHotkeys(translateHotkey, explainHotkey);
  ensureStartMenuShortcut();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Do not quit on window close, keep running in system tray
});

// IPC Handlers
ipcMain.handle('clipboard:copy', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('clipboard:read', async () => {
  return clipboard.readText();
});

ipcMain.handle('window:hide-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  return true;
});

ipcMain.handle('window:show', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

ipcMain.handle('autostart:get', async () => {
  return isAutoStartEnabled();
});

ipcMain.handle('autostart:set', async (event, enable) => {
  return setAutoStartEnabled(enable);
});

ipcMain.handle('hotkeys:get', async () => {
  return {
    translateHotkey,
    explainHotkey
  };
});

ipcMain.handle('hotkeys:update', async (event, { translateKey, explainKey }) => {
  registerGlobalHotkeys(translateKey, explainKey);
  return { success: true, translateHotkey, explainHotkey };
});
