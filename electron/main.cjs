const { app, BrowserWindow, ipcMain, shell, clipboard, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const { exec, execFile } = require('child_process');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Chromium Memory Optimizations for background utility app
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');

function trimMemory() {
  if (process.platform === 'win32') {
    const copyExe = path.join(__dirname, 'copy_native.exe');
    if (fs.existsSync(copyExe)) {
      execFile(copyExe, ['trim'], () => {});
    }
  }
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

let translateHotkey = 'CommandOrControl+Alt+T';
let explainHotkey = 'CommandOrControl+Alt+J';
let startMinimized = false;
let savedApiKey = '';
let savedTargetLang = 'uk';
let savedModel = 'gemini-flash-lite-latest';

// BYOM (Bring Your Own Model) state
let savedAiProvider = 'gemini'; // 'gemini' | 'openai_compatible'
let savedCustomGeminiModel = '';
let savedCustomEndpoint = 'http://localhost:11434/v1';
let savedCustomApiKey = '';
let savedCustomModel = 'llama3.2';

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
  if (savedAiProvider === 'gemini') {
    fetch('https://generativelanguage.googleapis.com', { method: 'HEAD' }).catch(() => {});
  }
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
      if (data.model) {
        if (data.model === 'gemini-3.8-flash' || data.model === 'gemini-2.5-flash' || data.model === 'gemini-3.6-flash' || data.model === 'gemini-2.0-flash') {
          savedModel = 'gemini-flash-lite-latest';
        } else {
          savedModel = data.model;
        }
      }
      if (data.aiProvider) savedAiProvider = data.aiProvider;
      if (data.customGeminiModel) savedCustomGeminiModel = data.customGeminiModel;
      if (data.customEndpoint) savedCustomEndpoint = data.customEndpoint;
      if (data.customApiKey) savedCustomApiKey = data.customApiKey;
      if (data.customModel) savedCustomModel = data.customModel;
      if (data.quickPromptSlots && Array.isArray(data.quickPromptSlots)) {
        quickPromptSlots = data.quickPromptSlots;
      }
    }

    // Auto-migrate from legacy config if apiKey is empty
    if (!savedApiKey) {
      const appData = app.getPath('appData');
      const legacyPath = path.join(appData, 'gemini-desktop-translator', 'config.json');
      if (fs.existsSync(legacyPath)) {
        try {
          const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
          if (legacyData.apiKey) {
            savedApiKey = legacyData.apiKey;
            if (legacyData.primaryTargetLanguage) savedTargetLang = legacyData.primaryTargetLanguage;
            if (legacyData.model) savedModel = legacyData.model;
            saveConfig({ apiKey: savedApiKey, primaryTargetLanguage: savedTargetLang, model: savedModel });
          }
        } catch {}
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
      aiProvider: savedAiProvider,
      customGeminiModel: savedCustomGeminiModel,
      customEndpoint: savedCustomEndpoint,
      customApiKey: savedCustomApiKey,
      customModel: savedCustomModel,
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
  return icoPath;
}

function getStartupShortcutPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'NativeLingo.lnk');
}

function cleanRogueRegistryEntries() {
  if (process.platform === 'win32') {
    try {
      exec('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Electron" /f', () => {});
      exec('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run" /v "electron.app.Electron" /f', () => {});
    } catch {}
  }
}

function isAutoStartEnabled() {
  if (process.platform === 'win32') {
    const startupPath = getStartupShortcutPath();
    return fs.existsSync(startupPath);
  }
  return app.getLoginItemSettings().openAtLogin;
}

function setAutoStartEnabled(enable) {
  if (process.platform === 'win32') {
    cleanRogueRegistryEntries();
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
        `$Shortcut.Description = 'NativeLingo (Silent Auto-start)'`,
        '$Shortcut.Save()'
      ].join('; ');

      execFile('powershell', ['-NoProfile', '-Command', psScript], (err) => {
        if (err) console.warn('Autostart shortcut creation warning:', err);
      });
      return true;
    } else {
      if (fs.existsSync(startupPath)) {
        try {
          fs.unlinkSync(startupPath);
        } catch (e) {
          console.warn('Could not remove autostart shortcut:', e);
        }
      }
      return false;
    }
  }

  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true
  });

  return enable;
}

// Create Windows Start Menu & Desktop Shortcuts automatically (with app-icon.ico)
function ensureStartMenuShortcut() {
  if (process.platform === 'win32') {
    try {
      const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
      const startMenuDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      const startShortcutPath = path.join(startMenuDir, 'NativeLingo.lnk');
      const desktopDir = path.join(process.env.USERPROFILE, 'Desktop');
      const desktopShortcutPath = path.join(desktopDir, 'NativeLingo.lnk');
      
      // Clean up legacy desktop & start menu shortcuts if present
      const oldShortcuts = [
        path.join(desktopDir, 'Gemini AI Clipboard Assistant.lnk'),
        path.join(desktopDir, 'Gemini Translator.lnk'),
        path.join(startMenuDir, 'Gemini AI Clipboard Assistant.lnk'),
        path.join(startMenuDir, 'Gemini Translator.lnk')
      ];
      for (const oldSc of oldShortcuts) {
        if (fs.existsSync(oldSc)) {
          try { fs.unlinkSync(oldSc); } catch {}
        }
      }

      const vbsScript = path.join(__dirname, '..', 'launch.vbs');
      const iconFile = getIconPath();

      const psScript = [
        '$WshShell = New-Object -comObject WScript.Shell',
        `$s1 = $WshShell.CreateShortcut('${startShortcutPath.replace(/'/g, "''")}')`,
        `$s1.TargetPath = 'wscript.exe'`,
        `$s1.Arguments = '"${vbsScript.replace(/'/g, "''")}"'`,
        `$s1.WorkingDirectory = '${path.join(__dirname, '..').replace(/'/g, "''")}'`,
        `$s1.IconLocation = '${iconFile.replace(/'/g, "''")}'`,
        `$s1.Description = 'NativeLingo — In-Place AI Translator & Assistant'`,
        '$s1.Save()',
        `$s2 = $WshShell.CreateShortcut('${desktopShortcutPath.replace(/'/g, "''")}')`,
        `$s2.TargetPath = 'wscript.exe'`,
        `$s2.Arguments = '"${vbsScript.replace(/'/g, "''")}"'`,
        `$s2.WorkingDirectory = '${path.join(__dirname, '..').replace(/'/g, "''")}'`,
        `$s2.IconLocation = '${iconFile.replace(/'/g, "''")}'`,
        `$s2.Description = 'NativeLingo — In-Place AI Translator & Assistant'`,
        '$s2.Save()'
      ].join('; ');

      execFile('powershell', ['-NoProfile', '-Command', psScript], (err) => {
        if (err) console.warn('Shortcut creation warning:', err);
      });
    } catch (e) {
      console.warn('Could not create shortcuts:', e);
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
  const isHiddenArg = process.argv.some(arg => 
    typeof arg === 'string' && (arg.includes('hidden') || arg.includes('minimized'))
  );
  const shouldStartHidden = isHiddenArg;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 460,
    minHeight: 280,
    show: !shouldStartHidden, // Show immediately on manual launch; hide if launched with --hidden
    title: 'NativeLingo — In-Place AI Translator & Assistant',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: true,
      spellcheck: false
    }
  });

  if (!shouldStartHidden) {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.once('ready-to-show', () => {
    if (!shouldStartHidden && mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
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
    setTimeout(trimMemory, 1000);
  });

  mainWindow.on('minimize', () => {
    setTimeout(trimMemory, 1000);
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
      label: 'Open NativeLingo',
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
      label: 'Quit NativeLingo',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip(`NativeLingo (${translateHotkey.replace('CommandOrControl', 'Ctrl')} to translate)`);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  try {
    const icoPath = getIconPath();
    try {
      tray = new Tray(icoPath);
    } catch {
      try {
        const icon = getAppIcon();
        tray = new Tray(icon);
      } catch (e) {
        console.warn('Fallback tray icon creation failed:', e);
      }
    }

    if (tray) {
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
  } catch (err) {
    console.warn('Could not initialize system tray:', err);
  }
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
          // 1. Tell React to reset state and load the new snippet
          mainWindow.webContents.send('quick-translate', {
            text: trimmed,
            explainJargon
          });

          // 2. Position and show the window immediately with a clean, fresh UI
          focusAppWindow(true);
        }
      }, 10);
    };

    if (fs.existsSync(copyExe)) {
      execFile(copyExe, (err) => {
        if (err) {
          console.warn('Native copy failed, trying fallback vbs:', err);
          if (fs.existsSync(copyVbs)) {
            exec(`wscript.exe "${copyVbs}" copy`, handleClipboardResult);
          }
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

async function runAiGeneration({ text, systemInstructionText, isJson = false, maxTokens = 1024, model, apiKey }) {
  if (savedAiProvider === 'openai_compatible') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const baseUrl = (savedCustomEndpoint || 'http://localhost:11434/v1').replace(/\/+$/, '');
      const endpoint = `${baseUrl}/chat/completions`;
      const bearer = savedCustomApiKey ? `Bearer ${savedCustomApiKey.trim()}` : 'Bearer ollama';

      const payload = {
        model: savedCustomModel || 'llama3.2',
        messages: [
          { role: 'system', content: systemInstructionText },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        ...(isJson ? { response_format: { type: 'json_object' } } : {})
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bearer
        },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Endpoint returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } else {
    // Google Gemini Provider with Multi-Model Auto-Fallback
    const requestedModel = savedCustomGeminiModel || model || savedModel || 'gemini-flash-lite-latest';
    const key = (apiKey && apiKey.trim()) || savedApiKey;
    if (!key) {
      throw new Error('Please configure your Google Gemini API Key.');
    }

    const safeRequested = (requestedModel && !requestedModel.includes('3.8') && requestedModel !== 'gemini-2.0-flash' && requestedModel !== 'gemini-2.5-flash')
      ? requestedModel
      : 'gemini-flash-lite-latest';

    const candidates = Array.from(new Set([
      safeRequested,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash'
    ].filter(Boolean)));

    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidateModel = candidates[i];
      const isLast = (i === candidates.length - 1);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${key.trim()}`;

        const payload = {
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: maxTokens,
            candidateCount: 1,
            ...(isJson ? { responseMimeType: 'application/json' } : {})
          }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const errMsg = err.error?.message || `HTTP ${response.status}`;
          console.warn(`Model ${candidateModel} returned HTTP ${response.status} (${errMsg}).`);
          lastError = new Error(errMsg);

          if ((response.status === 429 || response.status === 503 || response.status === 404 || response.status === 400) && !isLast) {
            console.warn(`Retrying with next Gemini fallback model...`);
            continue;
          }
          throw lastError;
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (!isLast) {
          console.warn(`Attempt with ${candidateModel} error: ${err.message}. Retrying fallback...`);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('All candidate Gemini models failed.');
  }
}

// Quick Action Slot Execution (In-place rewrite & paste back OR open HUD)
function triggerQuickSlotAction(slotId) {
  const slot = (quickPromptSlots || []).find((s) => s.id === slotId);
  if (!slot) return;

  if (process.platform === 'win32') {
    const copyExe = path.join(__dirname, 'copy_native.exe');
    const copyVbs = path.join(__dirname, 'copy.vbs');

    // Save previous clipboard state and clear clipboard before copying
    const previousClipboard = clipboard.readText();
    clipboard.writeText('');

    const handleSlotClipboard = () => {
      setTimeout(async () => {
        const selectedText = clipboard.readText();
        if (!selectedText || !selectedText.trim()) {
          // No text selected: restore user's previous clipboard and exit silently
          if (previousClipboard) {
            clipboard.writeText(previousClipboard);
          }
          return;
        }

        const trimmed = selectedText.trim();

        if (slot.pasteBack) {
          // Direct In-Place Text Processing & Replacement
          if (savedAiProvider === 'gemini' && (!savedApiKey || !savedApiKey.trim())) {
            loadSavedConfig();
          }

          if (savedAiProvider === 'gemini' && (!savedApiKey || !savedApiKey.trim())) {
            focusAppWindow(true);
            if (mainWindow) {
              mainWindow.webContents.send('open-settings');
            }
            return;
          }

          try {
            const systemInstructionText = `You are a precision text transformer. Follow this user instruction precisely: "${slot.prompt}". Keep the original language unless the instruction explicitly specifies a different language. Output ONLY the transformed text directly without conversational preamble, introduction, markdown commentary, or quotes.`;

            // For in-place text replacement, prioritize ultra-low latency model
            const fastModel = (savedModel && savedModel.includes('lite')) ? savedModel : 'gemini-flash-lite-latest';

            const outputText = await runAiGeneration({
              text: trimmed,
              model: fastModel,
              systemInstructionText,
              isJson: false,
              maxTokens: Math.max(4096, trimmed.length * 8)
            });

            if (outputText && outputText.trim()) {
              const cleanOutput = outputText.trim();
              clipboard.writeText(cleanOutput);

              // Synthesize in-place Paste (Ctrl + V) with minimal delay
              setTimeout(() => {
                if (fs.existsSync(copyExe)) {
                  execFile(copyExe, ['paste'], (err) => {
                    if (err) console.warn('Native paste execution error:', err);
                    setTimeout(trimMemory, 2500);
                  });
                } else if (fs.existsSync(copyVbs)) {
                  exec(`wscript.exe "${copyVbs}" paste`);
                  setTimeout(trimMemory, 2500);
                }
              }, 10);
            } else {
              if (previousClipboard) {
                clipboard.writeText(previousClipboard);
              }
            }
          } catch (err) {
            console.error(`Slot ${slotId} execution error:`, err);
            // In-place mode must stay silent: do not open main modal!
            if (previousClipboard) {
              clipboard.writeText(previousClipboard);
            }
          }
        } else {
          // Open Floating HUD with explicit custom prompt
          if (mainWindow) {
            mainWindow.webContents.send('quick-translate', {
              text: trimmed,
              customPrompt: slot.prompt,
              slotName: slot.name
            });
            focusAppWindow(true);
          }
        }
      }, 40);
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
  cleanRogueRegistryEntries();
  loadSavedConfig();
  createWindow();
  createTray();
  registerGlobalHotkeys(translateHotkey, explainHotkey);
  ensureStartMenuShortcut();
  prewarmGoogleSocket();

  // Periodic memory sweep every 15 minutes when app is idle in background
  setInterval(() => {
    if (!mainWindow || !mainWindow.isVisible()) {
      trimMemory();
    }
  }, 15 * 60 * 1000);

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

// High-speed Native Translation Engine (Gemini Cloud OR Local BYOM)
ipcMain.handle('native:translate', async (event, { apiKey, text, targetLang, customPrompt, explainJargon, model }) => {
  const systemInstructionText = explainJargon
    ? `Translate into ${targetLang}, clarify meaning, detect tone, and break down slang/idioms. Respond ONLY in JSON format: {"detectedSourceLanguage":"string","translation":"string","plainLanguageMeaning":"string","detectedTone":"string","jargonBreakdown":[{"term":"string","literalMeaning":"string","intendedMeaning":"string","nuance":"string"}],"culturalNotes":"string"}`
    : customPrompt && customPrompt.trim()
    ? `You are a precision text transformer. Follow this user instruction precisely: "${customPrompt.trim()}". Keep the original language unless the instruction explicitly specifies a different language. Output ONLY the transformed text directly without conversational preamble, introduction, markdown commentary, or quotes.`
    : `Translate into ${targetLang}. Output direct translation only without quotes, preamble, or commentary.`;

  const maxTokens = explainJargon ? 2048 : Math.max(128, Math.min(1024, text.length * 3));

  const rawOutput = await runAiGeneration({
    text,
    systemInstructionText,
    isJson: Boolean(explainJargon),
    maxTokens,
    model,
    apiKey
  });

  return { success: true, rawOutput };
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

ipcMain.handle('endpoint:test', async (event, { endpoint, model, apiKey }) => {
  const url = `${(endpoint || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || 'ollama'}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model || 'llama3.2',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10
      })
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return { success: true, text: data.choices?.[0]?.message?.content || 'OK' };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
});

ipcMain.handle('config:sync', (event, cfg = {}) => {
  if (cfg.apiKey !== undefined) savedApiKey = cfg.apiKey;
  if (cfg.primaryTargetLanguage !== undefined) savedTargetLang = cfg.primaryTargetLanguage;
  if (cfg.model !== undefined) savedModel = cfg.model;
  if (cfg.aiProvider !== undefined) savedAiProvider = cfg.aiProvider;
  if (cfg.customGeminiModel !== undefined) savedCustomGeminiModel = cfg.customGeminiModel;
  if (cfg.customEndpoint !== undefined) savedCustomEndpoint = cfg.customEndpoint;
  if (cfg.customApiKey !== undefined) savedCustomApiKey = cfg.customApiKey;
  if (cfg.customModel !== undefined) savedCustomModel = cfg.customModel;
  saveConfig({});
  return true;
});



