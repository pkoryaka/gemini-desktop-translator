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
      if (data.model) savedModel = data.model;
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
  return path.join(__dirname, 'icon.svg');
}

function getStartupShortcutPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Gemini AI Clipboard Assistant.lnk');
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
        `$Shortcut.Description = 'Gemini AI Clipboard Assistant (Silent Auto-start)'`,
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

// Create Windows Start Menu Shortcut automatically (with app-icon.ico)
function ensureStartMenuShortcut() {
  if (process.platform === 'win32') {
    try {
      const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
      const startMenuDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      const shortcutPath = path.join(startMenuDir, 'Gemini AI Clipboard Assistant.lnk');
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
        `$Shortcut.Description = 'Gemini AI Clipboard Assistant'`,
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
    show: false, // NEVER show immediately to prevent white/empty frame flashing
    title: 'Gemini AI Clipboard Assistant',
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

  mainWindow.once('ready-to-show', () => {
    if (!shouldStartHidden) {
      mainWindow.show();
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
      label: 'Open Gemini AI Clipboard Assistant',
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
      label: 'Quit Gemini AI Clipboard Assistant',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip(`Gemini AI Clipboard Assistant (${translateHotkey.replace('CommandOrControl', 'Ctrl')} to translate)`);
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

async function runAiGeneration({ text, systemInstructionText, isJson = false, maxTokens = 1024, model, apiKey }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    if (savedAiProvider === 'openai_compatible') {
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
    } else {
      // Google Gemini Provider
      const targetModel = savedCustomGeminiModel || model || savedModel || 'gemini-3.8-flash';
      const key = (apiKey && apiKey.trim()) || savedApiKey;
      if (!key) {
        throw new Error('Please configure your Google Gemini API Key.');
      }
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key.trim()}`;

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
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
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

            const outputText = await runAiGeneration({
              text: trimmed,
              systemInstructionText,
              isJson: false,
              maxTokens: Math.max(256, Math.min(2048, trimmed.length * 4))
            });

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
              }, 40);
            }
          } catch (err) {
            console.error(`Slot ${slotId} execution error:`, err);
            // On error, do not force a mistranslation into Ukrainian!
            if (mainWindow) {
              mainWindow.webContents.send('show-full-window');
              focusAppWindow(true);
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
      }, 35);
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
    : `Translate into ${targetLang}. Output translation only.`;

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



