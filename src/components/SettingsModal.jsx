import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, Monitor, RotateCw, Power, Keyboard, Zap, BookOpen } from 'lucide-react';
import { AVAILABLE_MODELS, testGeminiApiKey } from '../services/geminiService';
import { storageService } from '../services/storageService';

const HOTKEY_TRANSLATE_PRESETS = [
  { label: 'Ctrl + Alt + T (Default)', value: 'CommandOrControl+Alt+T' },
  { label: 'Ctrl + Shift + T', value: 'CommandOrControl+Shift+T' },
  { label: 'Alt + T', value: 'Alt+T' },
  { label: 'Alt + Q', value: 'Alt+Q' },
  { label: 'Ctrl + Space', value: 'CommandOrControl+Space' }
];

const HOTKEY_EXPLAIN_PRESETS = [
  { label: 'Ctrl + Alt + J (Default)', value: 'CommandOrControl+Alt+J' },
  { label: 'Ctrl + Shift + J', value: 'CommandOrControl+Shift+J' },
  { label: 'Ctrl + Alt + E', value: 'CommandOrControl+Alt+E' },
  { label: 'Alt + J', value: 'Alt+J' },
  { label: 'Alt + E', value: 'Alt+E' }
];

export function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

  const initialModel = (!currentSettings.model || currentSettings.model.includes('2.5')) 
    ? 'gemini-3.6-flash' 
    : currentSettings.model;

  const [apiKey, setApiKey] = useState(currentKey);
  const [model, setModel] = useState(initialModel);
  const [temperature, setTemperature] = useState(currentSettings.temperature ?? 0.2);
  const [showKey, setShowKey] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  // Global Hotkeys
  const [translateHotkey, setTranslateHotkey] = useState(currentSettings.translateHotkey || 'CommandOrControl+Alt+T');
  const [explainHotkey, setExplainHotkey] = useState(currentSettings.explainHotkey || 'CommandOrControl+Alt+J');

  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }

  const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === model) || AVAILABLE_MODELS[0];

  useEffect(() => {
    // Check autostart status
    if (window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then((enabled) => {
        setAutoStart(Boolean(enabled));
      }).catch((e) => console.warn('Autostart check failed', e));
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
    storageService.setApiKey(apiKey.trim());
    storageService.saveSettings({
      ...currentSettings,
      model,
      temperature,
      translateHotkey,
      explainHotkey
    });

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="#6366f1" />
            <h2 className="modal-title">Settings & Shortcuts</h2>
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

        {/* Translation Model Selection */}
        <div className="form-group">
          <label className="form-label">Active Translation Model</label>
          <select
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ cursor: 'pointer', fontWeight: 600 }}
          >
            {AVAILABLE_MODELS.map((m) => (
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
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>
            <Keyboard size={16} color="#6366f1" />
            <span>Custom Global Hotkeys (Work Anywhere on Windows)</span>
          </div>

          {/* Hotkey 1: Quick Translation */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="#10b981" />
              <span>1. Quick Translate Selected Text</span>
            </label>
            <select
              className="form-input"
              value={translateHotkey}
              onChange={(e) => setTranslateHotkey(e.target.value)}
              style={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {HOTKEY_TRANSLATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Highlight text & press hotkey to immediately translate.
            </span>
          </div>

          {/* Hotkey 2: Translate & Explain Jargon */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#c084fc" />
              <span>2. Translate & Explain Jargon / Slang</span>
            </label>
            <select
              className="form-input"
              value={explainHotkey}
              onChange={(e) => setExplainHotkey(e.target.value)}
              style={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {HOTKEY_EXPLAIN_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Highlight text & press hotkey to de-jargonize and explain slang in plain words.
            </span>
          </div>
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
            <span>Launch with Windows (Start in Tray)</span>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: 'pointer' }}>
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
            style={{ padding: '8px 22px' }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
