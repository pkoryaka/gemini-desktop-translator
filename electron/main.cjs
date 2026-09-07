const { app, BrowserWindow, ipcMain, shell, clipboard, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const { exec, execFile } = require('child_process');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

let translateHotkey = 'CommandOrControl+Alt+T';
let explainHotkey = 'CommandOrControl+Alt+J';
let startMinimized = false;
let savedApiKey = '';
let savedTargetLang = 'uk';
let savedModel = 'gemini-3.8-flash';

let quickPromptSlots = [
  {
    id: 1,
    name: 'Fix Grammar & Polish',
    prompt: 'Fix grammar, spelling, typos, and phrasing. Keep the exact same language and meaning intact. Output ONLY the polished text without any introduction, explanations, or quotes.',
    hotkey: 'CommandOrControl+Alt+1',
    pasteBack: true,
    enabled: true
  },
  {
    id: 2,
    name: 'Professional Business Tone',
    prompt: 'Rewrite the text into clear, polite, concise, and professional corporate tone. Output ONLY the rewritten text without any introduction, explanations, or quotes.',
    hotkey: 'CommandOrControl+Alt+2',
    pasteBack: true,
    enabled: true
  },
  {
    id: 3,
    name: 'Translate to English & Replace',
    prompt: 'Translate the text into fluent, natural English. Output ONLY the translated text without extra explanations or quotes.',
    hotkey: 'CommandOrControl+Alt+3',
    pasteBack: true,
    enabled: true
  }
];

function getConfigPath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'config.json');
}

function prewarmGoogleSocket() {
  fetch('https://generativelanguage.googleapis.com', { method: 'HEAD' }).catch(() => {});
}

function loadSavedConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.translateHotkey) translateHotkey = data.translateHotkey;
      if (data.explainHotkey) explainHotkey = data.explainHotkey;
      if (data.startMinimized !== undefined) startMinimized = Boolean(data.startMinimized);
      if (data.apiKey) savedApiKey = data.apiKey;
      if (data.primaryTargetLanguage) savedTargetLang = data.primaryTargetLanguage;
      if (data.model) savedModel = data.model;
      if (data.quickPromptSlots && Array.isArray(data.quickPromptSlots)) {
        quickPromptSlots = data.quickPromptSlots;
      }
    }
  } catch (e) {
    console.warn('Could not load saved config:', e);
  }
}

function saveConfig(updates) {
  try {
    const configPath = getConfigPath();
    let existing = {};
    if (fs.existsSync(configPath)) {
      try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
    }
    fs.writeFileSync(configPath, JSON.stringify({
      ...existing,
      translateHotkey,
      explainHotkey,
      quickPromptSlots,
      startMinimized,
      apiKey: savedApiKey,
      primaryTargetLanguage: savedTargetLang,
      model: savedModel,
      ...updates
    }), 'utf8');
  } catch (e) {
    console.warn('Could not save config:', e);
  }
}

function getIconPath() {
  const icoPath = path.join(__dirname, 'app-icon.ico');
  if (fs.existsSync(icoPath)) return icoPath;
  const pngPath = path.join(__dirname, 'app-icon.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return path.join(__dirname, 'icon.svg');
}

function getStartupShortcutPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Gemini AI Assistant.lnk');
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
      if (fs.existsSync(startupPath)) return true;
      const vbsScript = path.join(__dirname, '..', 'launch.vbs');
      const iconFile = getIconPath();
      const psScript = [
        '$WshShell = New-Object -comObject WScript.Shell',
        `$Shortcut = $WshShell.CreateShortcut('${startupPath.replace(/'/g, "''")}')`,
        `$Shortcut.TargetPath = 'wscript.exe'`,
        `$Shortcut.Arguments = '\"${vbsScript.replace(/'/g, "''")}\" --hidden'`,
        `$Shortcut.WorkingDirectory = '${path.join(__dirname, '..').replace(/'/g, "''")}'`,
        `$Shortcut.IconLocation = '${iconFile.replace(/'/g, "''")}'`,
        `$Shortcut.Description = 'Gemini AI Text & Translation Assistant (Silent Auto-start)'`,
        '$Shortcut.Save()'
      ].join('; ');

      execFile('powershell', ['-NoProfile', '-Command', psScript], (err) => {
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
      const shortcutPath = path.join(startMenuDir, 'Gemini AI Assistant.lnk');
      if (fs.existsSync(shortcutPath)) return;
      const vbsScript = path.join(__dirname, '..', 'launch.vbs');
      const iconFile = getIconPath();

      const psScript = [
        '$WshShell = New-Object -comObject WScript.Shell',
        `$Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
        `$Shortcut.TargetPath = 'wscript.exe'`,
        `$Shortcut.Arguments = '\"${vbsScript.replace(/'/g, "''")}\"'`,
        `$Shortcut.WorkingDirectory = '${path.join(__dirname, '..').replace(/'/g, "''")}'`,
        `$Shortcut.IconLocation = '${iconFile.replace(/'/g, "''")}'`,
        `$Shortcut.Description = 'Gemini AI Text & Translation Assistant'`,
        '$Shortcut.Save()'
      ].join('; ');

      execFile('powershell', ['-NoProfile', '-Command', psScript], (err) => {
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
  const loginSettings = app.getLoginItemSettings();
  const isHiddenArg = process.argv.some(arg => 
    typeof arg === 'string' && (arg.includes('hidden') || arg.includes('minimized'))
  );
  const shouldStartHidden = isHiddenArg || 
    Boolean(loginSettings.wasOpenedAsHidden) ||
    Boolean(loginSettings.wasOpenedAtLogin) ||
    Boolean(startMinimized);


  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 460,
    minHeight: 280,
    show: !shouldStartHidden,
    title: 'Gemini AI Text & Translation Assistant',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distHtml) && process.env.VITE_DEV !== 'true') {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-hidden');
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const slotMenuItems = (quickPromptSlots || [])
    .filter((s) => s && s.enabled && s.name)
    .map((slot) => ({
      label: `⚡ ${slot.name} (${(slot.hotkey || '').replace('CommandOrControl', 'Ctrl')})`,
      click: () => {
        triggerQuickSlotAction(slot.id);
      }
    }));

  const menuTemplate = [
    {
      label: 'Open Gemini Assistant (Full Window)',
      click: () => {
        focusAppWindow();
        if (mainWindow) {
          mainWindow.webContents.send('show-full-window');
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
    }
  ];

  if (slotMenuItems.length > 0) {
    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({ label: '— Quick Prompt Actions —', enabled: false });
    menuTemplate.push(...slotMenuItems);
  }

  menuTemplate.push(
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        focusAppWindow();
        if (mainWindow) {
          mainWindow.webContents.send('show-full-window');
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Assistant',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip(`Gemini AI Assistant (${translateHotkey.replace('CommandOrControl', 'Ctrl')} to translate)`);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  const icon = getAppIcon();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        focusAppWindow();
        mainWindow.webContents.send('show-full-window');
      }
    }
  });

  tray.on('double-click', () => {
    focusAppWindow();
    if (mainWindow) {
      mainWindow.webContents.send('show-full-window');
    }
  });
}

let isMiniWindowMode = false;

function positionWindowAtCursor() {
  if (!mainWindow) return;
  try {
    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    const bounds = currentDisplay.workArea;
    const [winWidth, winHeight] = mainWindow.getSize();

    let targetX = cursor.x + 12;
    let targetY = cursor.y + 16;

    if (targetX + winWidth > bounds.x + bounds.width) {
      targetX = bounds.x + bounds.width - winWidth - 12;
    }
    if (targetY + winHeight > bounds.y + bounds.height) {
      targetY = cursor.y - winHeight - 16;
    }

    if (targetX < bounds.x) targetX = bounds.x + 12;
    if (targetY < bounds.y) targetY = bounds.y + 12;

    mainWindow.setPosition(Math.round(targetX), Math.round(targetY));
  } catch (err) {
    console.warn('Could not position window at cursor:', err);
    mainWindow.center();
  }
}

function focusAppWindow(isMini = false) {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (isMini || isMiniWindowMode) {
    positionWindowAtCursor();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
  mainWindow.show();
  mainWindow.focus();
}

let activeStreamController = null;

async function startNativeStream({ text, targetLang, apiKey, model, explainJargon, onChunk, onError }) {
  if (activeStreamController) {
    try { activeStreamController.abort(); } catch {}
  }
  activeStreamController = new AbortController();

  const targetModel = model || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const systemInstructionText = explainJargon
    ? `Translate into ${targetLang}, clarify meaning, detect tone, and break down slang/idioms. Respond ONLY in JSON format: {"detectedSourceLanguage":"string","translation":"string","plainLanguageMeaning":"string","detectedTone":"string","jargonBreakdown":[{"term":"string","literalMeaning":"string","intendedMeaning":"string","nuance":"string"}],"culturalNotes":"string"}`
    : `Translate into ${targetLang}. Output translation only.`;

  const payload = {
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: explainJargon ? 2048 : Math.max(128, Math.min(1024, text.length * 3)),
      candidateCount: 1,
      ...(explainJargon ? { responseMimeType: 'application/json' } : {})
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: activeStreamController.signal,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      onError(new Error(err.error?.message || `HTTP ${response.status}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed.candidates?.[0];
              const chunk = candidate?.content?.parts?.[0]?.text || '';
              if (chunk) {
                accumulated += chunk;
                onChunk(accumulated);
              }
              if (candidate?.finishReason) {
                try { reader.cancel(); } catch {}
                return;
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      onError(err);
    }
  }
}

// Global hotkey handler: Grabs highlighted text from any Windows app and translates it
function triggerGlobalSelectionTranslation(explainJargon = false) {
  if (process.platform === 'win32') {
    const copyExe = path.join(__dirname, 'copy_native.exe');
    const copyVbs = path.join(__dirname, 'copy.vbs');

    const handleClipboardResult = () => {
      setTimeout(() => {
        const selectedText = clipboard.readText();
        if (!selectedText || !selectedText.trim()) return;

        const trimmed = selectedText.trim();

        if (mainWindow) {
          // 1. Tell React to reset state and load the new snippet FIRST
          mainWindow.webContents.send('quick-translate', {
            text: trimmed,
            explainJargon
          });

          // 2. Position and show the window immediately with a clean, fresh UI
          focusAppWindow(true);

          // 3. Instant Native Prefetch Streaming directly from Node.js (Zero UI lag)
          if (savedApiKey && savedApiKey.trim()) {
            startNativeStream({
              text: trimmed,
              targetLang: savedTargetLang || 'uk',
              apiKey: savedApiKey.trim(),
              model: savedModel || 'gemini-3.8-flash',
              explainJargon,
              onChunk: (chunk) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('quick-translate-chunk', chunk);
                }
              },
              onError: (err) => {
                console.warn('Native prefetch stream warning:', err.message);
              }
            });
          }
        }
      }, 10);
    };

    if (fs.existsSync(copyExe)) {
      execFile(copyExe, (err) => {
        if (err) {
          exec(`wscript.exe "${copyVbs}"`, handleClipboardResult);
        } else {
          handleClipboardResult();
        }
      });
    } else {
      exec(`wscript.exe "${copyVbs}"`, handleClipboardResult);
    }
  } else {
    const text = clipboard.readText();
    focusAppWindow();
    if (mainWindow && text && text.trim()) {
      mainWindow.webContents.send('quick-translate', {
        text: text.trim(),
        explainJargon
      });
    }
  }
}

// Quick Action Slot Execution (In-place rewrite & paste back OR open HUD)
function triggerQuickSlotAction(slotId) {
  const slot = (quickPromptSlots || []).find((s) => s.id === slotId);
  if (!slot) return;

  if (process.platform === 'win32') {
    const copyExe = path.join(__dirname, 'copy_native.exe');
    const copyVbs = path.join(__dirname, 'copy.vbs');

    const handleSlotClipboard = () => {
      setTimeout(async () => {
        const selectedText = clipboard.readText();
        if (!selectedText || !selectedText.trim()) return;

        const trimmed = selectedText.trim();

        if (slot.pasteBack) {
          // Direct In-Place Text Processing & Replacement
          if (!savedApiKey || !savedApiKey.trim()) {
            focusAppWindow(true);
            if (mainWindow) {
              mainWindow.webContents.send('quick-translate', {
                text: trimmed,
                customPrompt: slot.prompt,
                slotName: slot.name
              });
            }
            return;
          }

          try {
            const targetModel = savedModel || 'gemini-3.8-flash';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${savedApiKey.trim()}`;

            const systemInstructionText = `You are a precision text transformer. Follow this user instruction precisely: "${slot.prompt}". Output ONLY the transformed text directly. Do NOT add conversational preamble, markdown meta commentary, or quotes wrapping unless specifically requested.`;

            const payload = {
              systemInstruction: { parts: [{ text: systemInstructionText }] },
              contents: [{ role: 'user', parts: [{ text: trimmed }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: Math.max(256, Math.min(2048, trimmed.length * 4)),
                candidateCount: 1
              }
            };

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (outputText && outputText.trim()) {
              const cleanOutput = outputText.trim();
              clipboard.writeText(cleanOutput);

              // Synthesize in-place Paste (Ctrl + V)
              setTimeout(() => {
                if (fs.existsSync(copyExe)) {
                  execFile(copyExe, ['paste'], (err) => {
                    if (err) console.warn('Native paste execution error:', err);
                  });
                }
              }, 25);
            }
          } catch (err) {
            console.error(`Slot ${slotId} execution error:`, err);
            // Fallback to window so user can see error
            if (mainWindow) {
              mainWindow.webContents.send('quick-translate', {
                text: trimmed,
                customPrompt: slot.prompt,
                slotName: slot.name
              });
              focusAppWindow(true);
            }
          }
        } else {
          // Open Floating HUD
          if (mainWindow) {
            mainWindow.webContents.send('quick-translate', {
              text: trimmed,
              customPrompt: slot.prompt,
              slotName: slot.name
            });
            focusAppWindow(true);
          }
        }
      }, 15);
    };

    if (fs.existsSync(copyExe)) {
      execFile(copyExe, (err) => {
        if (err) {
          exec(`wscript.exe "${copyVbs}"`, handleSlotClipboard);
        } else {
          handleSlotClipboard();
        }
      });
    } else {
      exec(`wscript.exe "${copyVbs}"`, handleSlotClipboard);
    }
  }
}

function registerGlobalHotkeys(newTranslateKey, newExplainKey, newSlots) {
  globalShortcut.unregisterAll();

  if (newTranslateKey) translateHotkey = newTranslateKey;
  if (newExplainKey) explainHotkey = newExplainKey;
  if (newSlots && Array.isArray(newSlots)) quickPromptSlots = newSlots;

  saveConfig({ translateHotkey, explainHotkey, quickPromptSlots });

  if (translateHotkey) {
    try {
      const ok = globalShortcut.register(translateHotkey, () => {
        triggerGlobalSelectionTranslation(false);
      });
      if (!ok) console.warn(`Failed to register ${translateHotkey}`);
    } catch (e) {
      console.warn(`Error registering ${translateHotkey}:`, e);
    }
  }

  if (explainHotkey) {
    try {
      const ok = globalShortcut.register(explainHotkey, () => {
        triggerGlobalSelectionTranslation(true);
      });
      if (!ok) console.warn(`Failed to register ${explainHotkey}`);
    } catch (e) {
      console.warn(`Error registering ${explainHotkey}:`, e);
    }
  }

  if (Array.isArray(quickPromptSlots)) {
    quickPromptSlots.forEach((slot) => {
      if (slot && slot.enabled && slot.hotkey) {
        try {
          const ok = globalShortcut.register(slot.hotkey, () => {
            triggerQuickSlotAction(slot.id);
          });
          if (!ok) console.warn(`Failed to register slot ${slot.id} (${slot.hotkey})`);
        } catch (e) {
          console.warn(`Error registering slot ${slot.id} hotkey (${slot.hotkey}):`, e);
        }
      }
    });
  }

  updateTrayMenu();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
    mainWindow.webContents.send('show-full-window');
  }
});

app.whenReady().then(() => {
  loadSavedConfig();
  createWindow();
  createTray();
  registerGlobalHotkeys(translateHotkey, explainHotkey);
  ensureStartMenuShortcut();
  prewarmGoogleSocket();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      focusAppWindow();
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
  focusAppWindow();
  return true;
});

ipcMain.handle('autostart:get', async () => {
  return isAutoStartEnabled();
});

ipcMain.handle('autostart:set', async (event, enable) => {
  return setAutoStartEnabled(enable);
});

ipcMain.handle('config:get-start-minimized', async () => {
  return startMinimized;
});

ipcMain.handle('config:set-start-minimized', async (event, val) => {
  startMinimized = Boolean(val);
  saveConfig({ startMinimized });
  return startMinimized;
});

ipcMain.handle('hotkeys:get', async () => {
  return {
    translateHotkey,
    explainHotkey,
    slots: quickPromptSlots
  };
});

ipcMain.handle('hotkeys:update', async (event, { translateKey, explainKey, slots }) => {
  registerGlobalHotkeys(translateKey, explainKey, slots);
  return { success: true, translateHotkey, explainHotkey, slots: quickPromptSlots };
});

ipcMain.handle('slots:get', async () => {
  return quickPromptSlots;
});

ipcMain.handle('slots:update', async (event, newSlots) => {
  registerGlobalHotkeys(translateHotkey, explainHotkey, newSlots);
  return { success: true, slots: quickPromptSlots };
});

ipcMain.handle('window:set-mode', (event, mode) => {
  if (!mainWindow) return false;
  isMiniWindowMode = (mode === 'mini');
  if (mode === 'mini') {
    mainWindow.setMinimumSize(420, 240);
    mainWindow.setSize(540, 360);
    positionWindowAtCursor();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setSize(1200, 820);
    mainWindow.center();
  }
  return true;
});

ipcMain.handle('window:set-size', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
  return true;
});

// High-speed Native Node.js Translation Engine
ipcMain.handle('native:translate', async (event, { apiKey, text, targetLang, customPrompt, explainJargon, model }) => {
  const targetModel = model || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const systemInstructionText = explainJargon
    ? `Translate into ${targetLang}, clarify meaning, detect tone, and break down slang/idioms. Respond ONLY in JSON format: {"detectedSourceLanguage":"string","translation":"string","plainLanguageMeaning":"string","detectedTone":"string","jargonBreakdown":[{"term":"string","literalMeaning":"string","intendedMeaning":"string","nuance":"string"}],"culturalNotes":"string"}`
    : `Translate into ${targetLang}. Output translation only.${customPrompt ? ` Style: ${customPrompt}` : ''}`;

  const payload = {
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: explainJargon ? 2048 : Math.max(128, Math.min(1024, text.length * 3)),
      candidateCount: 1,
      ...(explainJargon ? { responseMimeType: 'application/json' } : {})
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload)
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, rawOutput };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
});

ipcMain.handle('models:fetch', async (event, apiKey) => {
  const key = (apiKey && apiKey.trim()) || savedApiKey;
  if (!key) {
    throw new Error('Please enter a Gemini API Key.');
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  return await response.json();
});

ipcMain.handle('config:sync', (event, { apiKey, primaryTargetLanguage, model }) => {
  if (apiKey !== undefined) savedApiKey = apiKey;
  if (primaryTargetLanguage !== undefined) savedTargetLang = primaryTargetLanguage;
  if (model !== undefined) savedModel = model;
  saveConfig({ apiKey: savedApiKey, primaryTargetLanguage: savedTargetLang, model: savedModel });
  return true;
});


