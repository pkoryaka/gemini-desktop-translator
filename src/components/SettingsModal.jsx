import React, { useState } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, Sliders } from 'lucide-react';
import { AVAILABLE_MODELS, testGeminiApiKey } from '../services/geminiService';
import { storageService } from '../services/storageService';

export function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

  const [apiKey, setApiKey] = useState(currentKey);
  const [model, setModel] = useState(currentSettings.model || 'gemini-2.5-flash');
  const [temperature, setTemperature] = useState(currentSettings.temperature ?? 0.3);
  const [showKey, setShowKey] = useState(false);

  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus({ success: false, message: 'Please enter an API key first.' });
      return;
    }

    setTestStatus({ loading: true, message: 'Testing connection to Gemini API...' });
    try {
      await testGeminiApiKey(apiKey, model);
      setTestStatus({ success: true, message: 'Connection successful! Gemini is ready.' });
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

        {/* Model Selection */}
        <div className="form-group">
          <label className="form-label">Gemini Model</label>
          <select
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {AVAILABLE_MODELS.map((m) => (
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
