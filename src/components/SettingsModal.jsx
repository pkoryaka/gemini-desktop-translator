import React, { useState, useEffect } from 'react';
import { 
  X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, 
  Monitor, RotateCw, Power, Keyboard, Zap, BookOpen, Languages, 
  AppWindow, Cpu, Server, Sun, Moon, Palette, Sliders, History 
} from 'lucide-react';
import { AVAILABLE_MODELS, SUPPORTED_LANGUAGES, testGeminiApiKey, fetchLiveAvailableModels } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { HotkeyRecorder } from './HotkeyRecorder';

export function SettingsModal({ isOpen, onClose, onSettingsUpdated, theme: initialTheme, onToggleTheme }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

  const [activeTab, setActiveTab] = useState('models'); // 'models' | 'languages' | 'shortcuts' | 'appearance'
  const [themeMode, setThemeMode] = useState(() => initialTheme || storageService.getTheme());

  const initialModel = currentSettings.model || 'gemini-3.8-flash';

  const [apiKey, setApiKey] = useState(currentKey);
  const [model, setModel] = useState(initialModel);
  const [modelsList, setModelsList] = useState(() => storageService.getCachedModels() || AVAILABLE_MODELS);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [temperature, setTemperature] = useState(currentSettings.temperature ?? 0.1);
  const [showKey, setShowKey] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(currentSettings.startMinimized || false);
  const [saveHistory, setSaveHistory] = useState(currentSettings.saveHistory !== false);

  // BYOM (Bring Your Own Model) state
  const [aiProvider, setAiProvider] = useState(currentSettings.aiProvider || 'gemini');
  const [customGeminiModel, setCustomGeminiModel] = useState(currentSettings.customGeminiModel || '');
  const [customEndpoint, setCustomEndpoint] = useState(currentSettings.customEndpoint || 'http://localhost:11434/v1');
  const [customApiKey, setCustomApiKey] = useState(currentSettings.customApiKey || '');
  const [customModel, setCustomModel] = useState(currentSettings.customModel || 'llama3.2');
  const [endpointTestStatus, setEndpointTestStatus] = useState(null);

  // Primary Target Language & Mini Modal Mode
  const [primaryTargetLanguage, setPrimaryTargetLanguage] = useState(currentSettings.primaryTargetLanguage || 'uk');
  const [instantPopupMode, setInstantPopupMode] = useState(currentSettings.instantPopupMode !== false);

  // Global Hotkeys (Customizable strings)
  const [translateHotkey, setTranslateHotkey] = useState(currentSettings.translateHotkey || 'CommandOrControl+Alt+T');
  const [explainHotkey, setExplainHotkey] = useState(currentSettings.explainHotkey || 'CommandOrControl+Alt+J');

  // 3 Custom Prompt Slots
  const [quickSlots, setQuickSlots] = useState(() => storageService.getQuickSlots());

  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }

  // Detect any hotkey conflicts across all 5 hotkeys
  const allHotkeys = [
    { key: translateHotkey, label: 'Quick Translate' },
    { key: explainHotkey, label: 'Explain Jargon' },
    ...quickSlots.map((s, idx) => ({ key: s.hotkey, label: `Slot ${idx + 1} (${s.name || 'Quick Action'})` }))
  ].filter((item) => item.key && item.key.trim());

  const duplicateKey = allHotkeys.find(
    (item, index) => allHotkeys.findIndex((other, otherIdx) => otherIdx !== index && other.key.toLowerCase() === item.key.toLowerCase()) !== -1
  );

  const hasConflict = Boolean(duplicateKey);

  const selectedModelInfo = modelsList.find((m) => m.id === model) || modelsList[0] || AVAILABLE_MODELS[0];

  const handleRefreshModels = async (keyToUse = apiKey) => {
    const key = keyToUse || apiKey || storageService.getApiKey();
    if (!key || !key.trim()) {
      setRefreshMsg({ error: true, text: 'Please enter an API key above first.' });
      return;
    }
    setIsRefreshingModels(true);
    setRefreshMsg(null);
    try {
      const live = await fetchLiveAvailableModels(key.trim());
      if (live && live.length > 0) {
        setModelsList(live);
        storageService.setCachedModels(live);
        if (!live.some((m) => m.id === model)) {
          setModel(live[0].id);
        }
        setRefreshMsg({ error: false, text: `✓ Found ${live.length} live models directly from Google AI` });
        setTimeout(() => setRefreshMsg(null), 5000);
      }
    } catch (err) {
      console.warn('Failed to refresh models list:', err);
      setRefreshMsg({ error: true, text: err.message || 'Failed to query Google API.' });
    } finally {
      setIsRefreshingModels(false);
    }
  };

  useEffect(() => {
    const key = (apiKey && apiKey.trim()) || storageService.getApiKey();
    if (key && key.trim()) {
      handleRefreshModels(key.trim());
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
        if (keys?.slots && Array.isArray(keys.slots)) setQuickSlots(keys.slots);
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

  const handleSlotChange = (slotId, updates) => {
    setQuickSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))
    );
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

  const handleTestCustomEndpoint = async () => {
    setEndpointTestStatus({ loading: true, message: `Connecting to ${customEndpoint}...` });
    try {
      if (window.electronAPI?.testEndpoint) {
        await window.electronAPI.testEndpoint({
          endpoint: customEndpoint,
          model: customModel,
          apiKey: customApiKey
        });
        setEndpointTestStatus({ success: true, message: `✓ Connected to ${customModel || 'model'} successfully!` });
      } else {
        const url = `${customEndpoint.replace(/\/+$/, '')}/chat/completions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customApiKey || 'ollama'}`
          },
          body: JSON.stringify({
            model: customModel || 'llama3.2',
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 10
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setEndpointTestStatus({ success: true, message: `✓ Connected to ${customModel || 'model'} successfully!` });
      }
    } catch (err) {
      setEndpointTestStatus({ success: false, message: err.message || 'Connection to custom endpoint failed.' });
    }
  };

  const handleSelectTheme = (newTheme) => {
    setThemeMode(newTheme);
    storageService.setTheme(newTheme);
    if (onToggleTheme && initialTheme !== newTheme) {
      onToggleTheme();
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
      saveHistory,
      translateHotkey,
      explainHotkey,
      aiProvider,
      customGeminiModel,
      customEndpoint,
      customApiKey,
      customModel,
      theme: themeMode
    });

    storageService.saveQuickSlots(quickSlots);

    if (window.electronAPI?.setStartMinimized) {
      window.electronAPI.setStartMinimized(startMinimized);
    }

    // Update Electron Global Hotkeys & Slots
    if (window.electronAPI?.updateHotkeys) {
      window.electronAPI.updateHotkeys({
        translateKey: translateHotkey,
        explainKey: explainHotkey,
        slots: quickSlots
      });
    }

    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
    onClose();
  };

  const quickLanguages = [
    { code: 'uk', name: 'Ukrainian', native: 'Українська' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'pl', name: 'Polish', native: 'Polski' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Preferences & Configuration</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configure AI models, target languages, hotkeys, and appearance</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Categorized Tabs Bar */}
        <nav className="settings-tabs-nav" aria-label="Settings Categories">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <Cpu size={15} />
            <span>AI Models & BYOM</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'languages' ? 'active' : ''}`}
            onClick={() => setActiveTab('languages')}
          >
            <Languages size={15} />
            <span>Languages & Quality</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={15} />
            <span>Shortcuts & Slots</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={15} />
            <span>Appearance & System</span>
          </button>
        </nav>

        {/* ================= TAB 1: AI MODELS & BYOM ================= */}
        {activeTab === 'models' && (
          <div className="settings-tab-body">
            {/* AI Engine Provider Switcher */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <Cpu size={16} color="#6366f1" />
                  <span>AI Engine / Model Provider</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600, background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  BYOM Enabled
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAiProvider('gemini')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: aiProvider === 'gemini' ? '1px solid #6366f1' : '1px solid var(--border-color)',
                    background: aiProvider === 'gemini' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: aiProvider === 'gemini' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Sparkles size={14} color={aiProvider === 'gemini' ? '#818cf8' : '#64748b'} />
                  <span>Google Gemini (Cloud)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('openai_compatible')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: aiProvider === 'openai_compatible' ? '1px solid #a855f7' : '1px solid var(--border-color)',
                    background: aiProvider === 'openai_compatible' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: aiProvider === 'openai_compatible' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Server size={14} color={aiProvider === 'openai_compatible' ? '#c084fc' : '#64748b'} />
                  <span>BYOM (Ollama / Local LLM)</span>
                </button>
              </div>

              {/* Provider 1: Gemini Cloud Details */}
              {aiProvider === 'gemini' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  {/* API Key */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="api-key-input">Gemini API Key</label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        Get Free Key <ExternalLink size={12} />
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="api-key-input"
                        type={showKey ? 'text' : 'password'}
                        className="form-input"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        style={{ paddingRight: '70px', fontFamily: 'var(--font-mono)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {showKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="model-select">Gemini Model</label>
                      <button
                        type="button"
                        onClick={() => handleRefreshModels()}
                        disabled={isRefreshingModels}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isRefreshingModels ? '#64748b' : '#818cf8',
                          fontSize: '0.75rem',
                          cursor: isRefreshingModels ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCw size={12} className={isRefreshingModels ? 'spinner' : ''} />
                        {isRefreshingModels ? 'Fetching Models...' : 'Refresh from Google AI'}
                      </button>
                    </div>

                    <select
                      id="model-select"
                      className="form-input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      {modelsList.map((m) => (
                        <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>
                          {m.name || m.id} {m.tag ? `— ${m.tag}` : ''}
                        </option>
                      ))}
                    </select>

                    {refreshMsg && (
                      <span style={{ fontSize: '0.75rem', color: refreshMsg.error ? '#f87171' : '#34d399' }}>
                        {refreshMsg.text}
                      </span>
                    )}

                    {selectedModelInfo && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {selectedModelInfo.description}
                      </p>
                    )}
                  </div>

                  {/* Custom Model ID Override */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Custom Gemini Model ID (Optional Override)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. gemini-2.5-pro or fine-tuned model"
                      value={customGeminiModel}
                      onChange={(e) => setCustomGeminiModel(e.target.value)}
                      style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  {/* Test Connection Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={handleTestConnection}
                      disabled={testStatus?.loading}
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      {testStatus?.loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Loader2 size={13} className="spinner" /> Testing...
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={13} /> Test Gemini Connection
                        </span>
                      )}
                    </button>
                    {testStatus && !testStatus.loading && (
                      <span style={{ fontSize: '0.78rem', color: testStatus.success ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {testStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Provider 2: BYOM (Local Offline LLMs) */}
              {aiProvider === 'openai_compatible' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEndpoint('http://localhost:11434/v1');
                        setCustomModel('llama3.2');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: '#c084fc',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Preset: Ollama (:11434)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEndpoint('http://localhost:1234/v1');
                        setCustomModel('local-model');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        background: 'rgba(6, 182, 212, 0.1)',
                        color: '#67e8f9',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Preset: LM Studio (:1234)
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">API Endpoint URL</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="http://localhost:11434/v1"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Model Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="llama3.2, mistral, qwen2.5, deepseek-r1..."
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">API Key / Token (Optional for Local)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Leave empty for local Ollama / LM Studio"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={handleTestCustomEndpoint}
                      disabled={endpointTestStatus?.loading}
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      {endpointTestStatus?.loading ? 'Testing...' : 'Test Endpoint Connection'}
                    </button>
                    {endpointTestStatus && (
                      <span style={{ fontSize: '0.78rem', color: endpointTestStatus.success ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {endpointTestStatus.message}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: LANGUAGES & QUALITY ================= */}
        {activeTab === 'languages' && (
          <div className="settings-tab-body">
            {/* RESTORED: Default Target Language */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <Languages size={17} color="#6366f1" />
                  <span>Default Target Language</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700 }}>
                  Active: {primaryTargetLanguage.toUpperCase()}
                </span>
              </div>
              <p className="settings-card-desc">
                When you highlight text and press Quick Translate (or when the app launches), it will automatically translate into this target language:
              </p>

              {/* Language Grid */}
              <div className="language-picker-grid">
                {quickLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`language-card-btn ${primaryTargetLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => setPrimaryTargetLanguage(lang.code)}
                  >
                    <span className="language-name">{lang.name}</span>
                    <span className="language-native">{lang.native}</span>
                  </button>
                ))}
              </div>

              {/* Or Select from full dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All Languages:</span>
                <select
                  className="form-input"
                  value={primaryTargetLanguage}
                  onChange={(e) => setPrimaryTargetLanguage(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                    <option key={l.code} value={l.code} style={{ background: '#0f172a', color: '#fff' }}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Translation Temperature */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <Sliders size={16} color="#06b6d4" />
                  <span>Creativity & Temperature</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
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
                style={{ accentColor: '#6366f1', cursor: 'pointer', width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>0.0 (Precise / Literal)</span>
                <span>0.1 - 0.2 (Optimal Speed)</span>
                <span>1.0 (Creative Nuance)</span>
              </div>
            </div>

            {/* Save History Toggle */}
            <div className="settings-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} color="#10b981" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Save Translation History</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Keep local record of translations in History Drawer</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={saveHistory}
                onChange={(e) => setSaveHistory(e.target.checked)}
                style={{ accentColor: '#6366f1', width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* ================= TAB 3: SHORTCUTS & PROMPT SLOTS ================= */}
        {activeTab === 'shortcuts' && (
          <div className="settings-tab-body">
            {/* Global Hotkeys */}
            <div className="settings-card">
              <div className="settings-card-title">
                <Keyboard size={16} color="#6366f1" />
                <span>Global Windows Hotkeys</span>
              </div>

              <HotkeyRecorder
                label="1. Quick Translate Selected Text"
                value={translateHotkey}
                onChange={setTranslateHotkey}
                otherHotkey={[explainHotkey, ...quickSlots.map((s) => s.hotkey)].filter(Boolean)}
                defaultKey="CommandOrControl+Alt+T"
                icon={Zap}
                description="Highlight text in any app & press this combination to translate immediately."
              />

              <HotkeyRecorder
                label="2. Translate & Explain Jargon / Slang"
                value={explainHotkey}
                onChange={setExplainHotkey}
                otherHotkey={[translateHotkey, ...quickSlots.map((s) => s.hotkey)].filter(Boolean)}
                defaultKey="CommandOrControl+Alt+J"
                icon={BookOpen}
                description="Highlight text & press to de-jargonize and explain idioms in plain words."
              />
            </div>

            {/* 3 Quick Prompt Slots */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <Sparkles size={17} color="#a855f7" />
                  <span>3 In-Place Rewrite Slots</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.12)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  ⚡ Auto Paste-Back
                </span>
              </div>
              <p className="settings-card-desc">
                Select text anywhere in Windows and press the slot's shortcut. The AI transforms text per prompt and pastes it back directly without opening windows!
              </p>

              {quickSlots.map((slot, index) => {
                const otherKeys = [
                  translateHotkey,
                  explainHotkey,
                  ...quickSlots.filter((s) => s.id !== slot.id).map((s) => s.hotkey)
                ].filter(Boolean);

                const defaultKeys = ['CommandOrControl+Alt+1', 'CommandOrControl+Alt+2', 'CommandOrControl+Alt+3'];
                const defKey = defaultKeys[index] || '';

                return (
                  <div
                    key={slot.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: slot.enabled ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      opacity: slot.enabled ? 1 : 0.65
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <input
                          type="checkbox"
                          id={`slot-enable-${slot.id}`}
                          checked={slot.enabled !== false}
                          onChange={(e) => handleSlotChange(slot.id, { enabled: e.target.checked })}
                          style={{ accentColor: '#6366f1', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        <label htmlFor={`slot-enable-${slot.id}`} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                          Slot {index + 1}:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={slot.name || ''}
                          onChange={(e) => handleSlotChange(slot.id, { name: e.target.value })}
                          placeholder={`Action ${index + 1}`}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600, height: '28px', flex: 1 }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSlotChange(slot.id, { pasteBack: !slot.pasteBack })}
                        style={{
                          background: slot.pasteBack ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          border: slot.pasteBack ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                          color: slot.pasteBack ? '#34d399' : '#a5b4fc',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {slot.pasteBack ? '⚡ In-Place Paste' : '🪟 Show in HUD'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Prompt Directives:
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSlotChange(slot.id, {
                              name: 'Fix Grammar & Polish',
                              prompt: 'Fix grammar, spelling, typos, and phrasing. Keep the exact same language and meaning intact. Output ONLY the polished text without any introduction, explanations, or quotes.'
                            })}
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
                          >
                            Grammar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSlotChange(slot.id, {
                              name: 'American Business Casual',
                              prompt: 'Rewrite the text into natural, polite, concise American business casual tone. Keep the original language intact. Output ONLY the rewritten text without commentary.'
                            })}
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
                          >
                            Business Casual
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSlotChange(slot.id, {
                              name: 'Translate to English',
                              prompt: 'Translate the text into fluent, natural English. Output ONLY the translated text without extra explanations or quotes.'
                            })}
                            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
                          >
                            To English
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="form-input"
                        rows={2}
                        value={slot.prompt || ''}
                        onChange={(e) => handleSlotChange(slot.id, { prompt: e.target.value })}
                        placeholder="Instructions for how the AI should rewrite the text..."
                        style={{ fontSize: '0.78rem', resize: 'vertical', minHeight: '44px', lineHeight: 1.3 }}
                      />
                    </div>

                    <HotkeyRecorder
                      label={`Slot ${index + 1} Hotkey`}
                      value={slot.hotkey || ''}
                      onChange={(newKey) => handleSlotChange(slot.id, { hotkey: newKey })}
                      otherHotkey={otherKeys}
                      defaultKey={defKey}
                      icon={Keyboard}
                      description={slot.pasteBack ? 'Transforms & replaces selected text in-place.' : 'Opens floating HUD with transformed text.'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 4: APPEARANCE & SYSTEM ================= */}
        {activeTab === 'appearance' && (
          <div className="settings-tab-body">
            {/* Theme Switcher Widget */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <Palette size={16} color="#6366f1" />
                  <span>Color Theme</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                  {themeMode === 'light' ? 'Light Theme' : 'Dark Theme'}
                </span>
              </div>
              <p className="settings-card-desc">
                Choose between Obsidian Dark glassmorphism or Clean Bright modern mode:
              </p>

              <div className="theme-switch-container">
                <button
                  type="button"
                  className={`theme-switch-btn ${themeMode === 'dark' ? 'active' : ''}`}
                  onClick={() => handleSelectTheme('dark')}
                >
                  <Moon size={18} color="#818cf8" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>Obsidian Dark</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Sleek glassmorphism</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`theme-switch-btn ${themeMode === 'light' ? 'active' : ''}`}
                  onClick={() => handleSelectTheme('light')}
                >
                  <Sun size={18} color="#f59e0b" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>Crisp Light</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Bright & high-contrast</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Instant Floating Mini Window Toggle */}
            <div className="settings-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <AppWindow size={15} color="#818cf8" />
                  <span>Instant Floating Mini Window (HUD)</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Show a compact cursor-positioned HUD on hotkey press (expandable to full window).
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

            {/* Launch on Windows Startup */}
            <div className="settings-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Power size={15} color="#10b981" />
                <div>
                  <div>Launch on Windows Startup</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Silent background logon into system tray in &lt;100ms</div>
                </div>
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

            {/* Start Minimized to Tray */}
            <div className="settings-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Monitor size={15} color="#38bdf8" />
                  <span>Start Minimized (in System Tray)</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Start silently without popping up the main window until summoned via hotkey or tray.
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
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            {hasConflict && (
              <span style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> Duplicate shortcut: {duplicateKey.key}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
              Save Preferences
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
