import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, Monitor, RotateCw, Power, Keyboard, Zap, BookOpen, Languages, AppWindow } from 'lucide-react';
import { AVAILABLE_MODELS, SUPPORTED_LANGUAGES, testGeminiApiKey, fetchLiveAvailableModels } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { HotkeyRecorder } from './HotkeyRecorder';

export function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

  const initialModel = (!currentSettings.model || currentSettings.model.includes('3.6') || currentSettings.model.includes('3.7') || currentSettings.model.includes('2.5')) 
    ? 'gemini-1.5-flash' 
    : currentSettings.model;

  const [apiKey, setApiKey] = useState(currentKey);
  const [model, setModel] = useState(initialModel);
  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [temperature, setTemperature] = useState(currentSettings.temperature ?? 0.1);
  const [showKey, setShowKey] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(currentSettings.startMinimized || false);

  // Primary Target Language & Mini Modal Mode
  const [primaryTargetLanguage, setPrimaryTargetLanguage] = useState(currentSettings.primaryTargetLanguage || 'uk');
  const [instantPopupMode, setInstantPopupMode] = useState(currentSettings.instantPopupMode !== false);

  // Global Hotkeys (Customizable strings)
  const [translateHotkey, setTranslateHotkey] = useState(currentSettings.translateHotkey || 'CommandOrControl+Alt+T');
  const [explainHotkey, setExplainHotkey] = useState(currentSettings.explainHotkey || 'CommandOrControl+Alt+J');

  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }

  const hasConflict = Boolean(
    translateHotkey && explainHotkey && translateHotkey.toLowerCase() === explainHotkey.toLowerCase()
  );

  const selectedModelInfo = modelsList.find((m) => m.id === model) || modelsList[0] || AVAILABLE_MODELS[0];

  const handleRefreshModels = async (keyToUse = apiKey) => {
    const key = keyToUse || apiKey;
    if (!key || !key.trim()) return;
    setIsRefreshingModels(true);
    try {
      const live = await fetchLiveAvailableModels(key.trim());
      if (live && live.length > 0) {
        setModelsList(live);
        if (!live.some((m) => m.id === model)) {
          setModel(live[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh models list:', err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      handleRefreshModels(apiKey.trim());
    }
  }, []);

  useEffect(() => {
    // Check autostart status
    if (window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then((enabled) => {
        setAutoStart(Boolean(enabled));
      }).catch((e) => console.warn('Autostart check failed', e));
    }

    if (window.electronAPI?.getStartMinimized) {
      window.electronAPI.getStartMinimized().then((val) => {
        setStartMinimized(Boolean(val));
      }).catch((e) => console.warn('StartMinimized check failed', e));
    }

    if (window.electronAPI?.getHotkeys) {
      window.electronAPI.getHotkeys().then((keys) => {
        if (keys?.translateHotkey) setTranslateHotkey(keys.translateHotkey);
        if (keys?.explainHotkey) setExplainHotkey(keys.explainHotkey);
      }).catch((e) => console.warn('Failed to load hotkeys', e));
    }
  }, []);

  const handleToggleAutoStart = async (e) => {
    const newValue = e.target.checked;
    setAutoStart(newValue);
    if (window.electronAPI?.setAutoStart) {
      try {
        await window.electronAPI.setAutoStart(newValue);
      } catch (err) {
        console.warn('Failed to set autostart', err);
      }
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: 'Please enter an API key first.' });
      return;
    }

    setTestStatus({ loading: true, message: 'Testing connection to Gemini API...' });
    try {
      await testGeminiApiKey(apiKey, model);
      setTestStatus({ success: true, message: 'Connection successful! Model is ready.' });
    } catch (err) {
      setTestStatus({ success: false, message: err.message || 'Connection test failed.' });
    }
  };

  const handleSave = () => {
    if (hasConflict) return;

    storageService.setApiKey(apiKey.trim());
    storageService.saveSettings({
      ...currentSettings,
      model,
      temperature,
      primaryTargetLanguage,
      instantPopupMode,
      startMinimized,
      translateHotkey,
      explainHotkey
    });

    if (window.electronAPI?.setStartMinimized) {
      window.electronAPI.setStartMinimized(startMinimized);
    }

    // Update Electron Global Hotkeys
    if (window.electronAPI?.updateHotkeys) {
      window.electronAPI.updateHotkeys({
        translateKey: translateHotkey,
        explainKey: explainHotkey
      });
    }

    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="#6366f1" />
            <h2 className="modal-title">Settings & Preferences</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Gemini API Key */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Google Gemini API Key (Free Tier)</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Get Free Key from Google AI Studio <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              className="form-input"
              placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ paddingRight: '70px', fontFamily: 'var(--font-mono)' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Your key is stored locally on your device and used only for translation requests.
          </span>
        </div>

        {/* Primary Target Language Selection */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Languages size={15} color="#818cf8" />
            <span>Primary Language to Translate Into</span>
          </label>
          <select
            className="form-input"
            value={primaryTargetLanguage}
            onChange={(e) => setPrimaryTargetLanguage(e.target.value)}
            style={{ cursor: 'pointer', fontWeight: 600 }}
          >
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            Global hotkey and instant translations will default to this language.
          </span>
        </div>

        {/* Translation Model Selection */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Active Translation Model</label>
            <button
              type="button"
              onClick={() => handleRefreshModels()}
              disabled={isRefreshingModels || !apiKey.trim()}
              style={{
                background: 'none',
                border: 'none',
                color: isRefreshingModels ? '#818cf8' : '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
              title="Query Google API for all active models supported by your key"
            >
              <RotateCw size={13} className={isRefreshingModels ? 'spinner' : ''} />
              <span>{isRefreshingModels ? 'Refreshing from Google...' : 'Refresh Models from Google'}</span>
            </button>
          </div>
          <select
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ cursor: 'pointer', fontWeight: 600, marginTop: '6px' }}
          >
            {modelsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.tag}
              </option>
            ))}
          </select>

          {/* Model Explanatory Card */}
          {selectedModelInfo && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0e7ff' }}>
                  {selectedModelInfo.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: selectedModelInfo.badgeColor, fontWeight: 600 }}>
                  {selectedModelInfo.tag}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                {selectedModelInfo.description}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                💡 <strong>Best for:</strong> {selectedModelInfo.bestFor}
              </div>
            </div>
          )}
        </div>

        {/* Global Hotkeys Customization Section */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>
            <Keyboard size={16} color="#6366f1" />
            <span>Custom Global Hotkeys (Press Keys to Record)</span>
          </div>

          {/* Hotkey 1: Quick Translation */}
          <HotkeyRecorder
            label="1. Quick Translate Selected Text"
            value={translateHotkey}
            onChange={setTranslateHotkey}
            otherHotkey={explainHotkey}
            defaultKey="CommandOrControl+Alt+T"
            icon={Zap}
            description="Highlight text in any app & press this combination to translate immediately."
          />

          {/* Hotkey 2: Translate & Explain Jargon */}
          <HotkeyRecorder
            label="2. Translate & Explain Jargon / Slang"
            value={explainHotkey}
            onChange={setExplainHotkey}
            otherHotkey={translateHotkey}
            defaultKey="CommandOrControl+Alt+J"
            icon={BookOpen}
            description="Highlight text & press this combination to de-jargonize and explain idioms in plain words."
          />
        </div>

        {/* Instant Mini Window Mode Toggle */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
              <AppWindow size={15} color="#818cf8" />
              <span>Instant Floating Mini Window</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Show a compact floating popup when hotkey is pressed (can expand to full window anytime).
            </span>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={instantPopupMode}
              onChange={(e) => setInstantPopupMode(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: instantPopupMode ? '#6366f1' : 'rgba(255,255,255,0.15)',
              borderRadius: '999px',
              transition: 'all 0.2s ease'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '14px',
                width: '14px',
                left: instantPopupMode ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.2s ease'
              }} />
            </span>
          </label>
        </div>

        {/* Temperature */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Translation Creativity / Temperature</label>
            <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
              {temperature}
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={{ accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>0.0 (Precise / Literal)</span>
            <span>0.2 (Optimal Speed)</span>
            <span>1.0 (Creative)</span>
          </div>
        </div>

        {/* Windows Startup Toggle */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
            <Power size={15} color="#10b981" />
            <span>Launch on Windows Startup</span>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={handleToggleAutoStart}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: autoStart ? '#6366f1' : 'rgba(255,255,255,0.15)',
              borderRadius: '999px',
              transition: 'all 0.2s ease'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '14px',
                width: '14px',
                left: autoStart ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.2s ease'
              }} />
            </span>
          </label>
        </div>

        {/* Start Minimized to Tray Toggle */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
              <Monitor size={15} color="#38bdf8" />
              <span>Start Minimized (in System Tray)</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              When launched, start silently in background without popping up the main window until summoned.
            </span>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={startMinimized}
              onChange={(e) => setStartMinimized(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: startMinimized ? '#6366f1' : 'rgba(255,255,255,0.15)',
              borderRadius: '999px',
              transition: 'all 0.2s ease'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '14px',
                width: '14px',
                left: startMinimized ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.2s ease'
              }} />
            </span>
          </label>
        </div>

        {/* Test Connection Button & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="preset-chip"
            onClick={handleTestConnection}
            disabled={testStatus?.loading}
            style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.8rem' }}
          >
            {testStatus?.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="spinner" /> Testing...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Test API Key Connection
              </span>
            )}
          </button>

          {testStatus && !testStatus.loading && (
            <div
              style={{
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: testStatus.success ? '#34d399' : '#f87171'
              }}
            >
              {testStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="preset-chip"
            onClick={onClose}
            style={{ padding: '8px 18px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-translate"
            onClick={handleSave}
            disabled={hasConflict}
            style={{ padding: '8px 22px', opacity: hasConflict ? 0.5 : 1 }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
