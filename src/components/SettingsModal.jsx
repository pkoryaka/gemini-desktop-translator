import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, Monitor, RotateCw, Power } from 'lucide-react';
import { AVAILABLE_MODELS, testGeminiApiKey, fetchLiveAvailableModels } from '../services/geminiService';
import { storageService } from '../services/storageService';

export function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

  const initialModel = (!currentSettings.model || currentSettings.model.includes('2.5')) 
    ? 'gemini-3.6-flash' 
    : currentSettings.model;

  const [apiKey, setApiKey] = useState(currentKey);
  const [model, setModel] = useState(initialModel);
  const [temperature, setTemperature] = useState(currentSettings.temperature ?? 0.3);
  const [showKey, setShowKey] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  const [modelsList, setModelsList] = useState(AVAILABLE_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }

  const handleRefreshModels = async (keyToUse) => {
    const activeKey = keyToUse !== undefined ? keyToUse : apiKey;
    if (!activeKey || !activeKey.trim()) return;

    setIsFetchingModels(true);
    try {
      const liveModels = await fetchLiveAvailableModels(activeKey);
      if (liveModels && liveModels.length > 0) {
        setModelsList(liveModels);
        if (!liveModels.some((m) => m.id === model)) {
          const defaultMatch = liveModels.find((m) => m.id.includes('3.6-flash') || m.id.includes('flash')) || liveModels[0];
          if (defaultMatch) setModel(defaultMatch.id);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh models:', e);
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      handleRefreshModels(apiKey);
    }
    // Check autostart status
    if (window.electronAPI?.getAutoStart) {
      window.electronAPI.getAutoStart().then((enabled) => {
        setAutoStart(Boolean(enabled));
      }).catch((e) => console.warn('Autostart check failed', e));
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
      setTestStatus({ success: true, message: 'Connection successful! Gemini is ready.' });
      handleRefreshModels(apiKey);
    } catch (err) {
      setTestStatus({ success: false, message: err.message || 'Connection test failed.' });
    }
  };

  const handleSave = () => {
    storageService.setApiKey(apiKey.trim());
    storageService.saveSettings({
      ...currentSettings,
      model,
      temperature
    });
    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="#6366f1" />
            <h2 className="modal-title">Settings & Gemini API</h2>
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

        {/* Model Selection with Refresh Button */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Gemini Model</label>
            <button
              type="button"
              onClick={() => handleRefreshModels(apiKey)}
              disabled={isFetchingModels || !apiKey.trim()}
              style={{
                background: 'none',
                border: 'none',
                color: '#a5b4fc',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Query Google API for live active models"
            >
              <RotateCw size={12} className={isFetchingModels ? 'spinner' : ''} />
              <span>{isFetchingModels ? 'Fetching...' : 'Refresh Live Models'}</span>
            </button>
          </div>

          <select
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {modelsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
            <span>0.3 (Recommended)</span>
            <span>1.0 (Creative)</span>
          </div>
        </div>

        {/* Windows Startup & Desktop Integration Box */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
              <Power size={15} color="#10b981" />
              <span>Launch with Windows</span>
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

          <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
            • <strong>Global Hotkey:</strong> Highlight text in any app & press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>Ctrl + Alt + T</kbd> to translate instantly.
            <br />
            • <strong>System Tray:</strong> Closing window keeps it active in tray for instant global hotkey access.
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
