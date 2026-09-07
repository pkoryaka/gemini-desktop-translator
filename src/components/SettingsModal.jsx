import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Sparkles, Monitor, RotateCw, Power, Keyboard, Zap, BookOpen, Languages, AppWindow, Cpu, Server } from 'lucide-react';
import { AVAILABLE_MODELS, SUPPORTED_LANGUAGES, testGeminiApiKey, fetchLiveAvailableModels } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { HotkeyRecorder } from './HotkeyRecorder';

export function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  if (!isOpen) return null;

  const currentSettings = storageService.getSettings();
  const currentKey = storageService.getApiKey();

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
      explainHotkey,
      aiProvider,
      customGeminiModel,
      customEndpoint,
      customApiKey,
      customModel
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

        {/* AI Engine & BYOM Provider Switcher */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} color="#6366f1" />
              <span>AI Engine / Model Provider</span>
            </label>
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
                border: aiProvider === 'gemini' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                background: aiProvider === 'gemini' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: aiProvider === 'gemini' ? '#fff' : '#94a3b8',
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
                border: aiProvider === 'openai_compatible' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                background: aiProvider === 'openai_compatible' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: aiProvider === 'openai_compatible' ? '#fff' : '#94a3b8',
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
              <span>BYOM / Local AI (Ollama, LM Studio)</span>
            </button>
          </div>

          {/* Option A: Google Gemini */}
          {aiProvider === 'gemini' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Gemini API Key */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Google Gemini API Key (Free Tier)</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.72rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Get Free Key <ExternalLink size={11} />
                  </a>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="form-input"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiKey(val);
                      if (val.trim().length >= 30) handleRefreshModels(val.trim());
                    }}
                    style={{ paddingRight: '70px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Gemini Model Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0 }}>Active Model</label>
                  <button
                    type="button"
                    onClick={() => handleRefreshModels()}
                    disabled={isRefreshingModels || !apiKey.trim()}
                    style={{ background: 'none', border: 'none', color: isRefreshingModels ? '#818cf8' : '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    <RotateCw size={11} className={isRefreshingModels ? 'spinner' : ''} />
                    <span>{isRefreshingModels ? 'Querying Google...' : 'Refresh Models'}</span>
                  </button>
                </div>
                <select
                  className="form-input"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {modelsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Custom Gemini Model Override (BYOM) */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>
                  Custom Gemini Model ID (Optional Override)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. tunedModels/my-custom-model or gemini-2.0-flash-thinking-exp"
                  value={customGeminiModel}
                  onChange={(e) => setCustomGeminiModel(e.target.value.trim())}
                  style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

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
          ) : (
            /* Option B: BYOM / Local LLM (Ollama, LM Studio, OpenRouter) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEndpoint('http://localhost:11434/v1');
                    setCustomModel('llama3.2');
                  }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', padding: '3px 8px', cursor: 'pointer' }}
                >
                  🦙 Ollama (11434)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEndpoint('http://localhost:1234/v1');
                    setCustomModel('local-model');
                  }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', padding: '3px 8px', cursor: 'pointer' }}
                >
                  💻 LM Studio (1234)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEndpoint('https://openrouter.ai/api/v1');
                    setCustomModel('google/gemini-2.5-flash');
                  }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.7rem', padding: '3px 8px', cursor: 'pointer' }}
                >
                  🌐 OpenRouter
                </button>
              </div>

              {/* Custom Base URL */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                  OpenAI-Compatible Base URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="http://localhost:11434/v1"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Custom Model Name */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                  Model Name / Tag
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. llama3.2, mistral, deepseek-r1:8b, qwen2.5"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Optional API Key */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                  API Key (Optional / Leave blank for local Ollama / LM Studio)
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Bearer token (if required by provider)"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Test Custom Endpoint Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={handleTestCustomEndpoint}
                  disabled={endpointTestStatus?.loading}
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  {endpointTestStatus?.loading ? 'Testing...' : 'Test Endpoint Connection'}
                </button>
                {endpointTestStatus && (
                  <span style={{ fontSize: '0.75rem', color: endpointTestStatus.success ? '#34d399' : '#f87171', fontWeight: 600 }}>
                    {endpointTestStatus.message}
                  </span>
                )}
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
            otherHotkey={[explainHotkey, ...quickSlots.map((s) => s.hotkey)].filter(Boolean)}
            defaultKey="CommandOrControl+Alt+T"
            icon={Zap}
            description="Highlight text in any app & press this combination to translate immediately."
          />

          {/* Hotkey 2: Translate & Explain Jargon */}
          <HotkeyRecorder
            label="2. Translate & Explain Jargon / Slang"
            value={explainHotkey}
            onChange={setExplainHotkey}
            otherHotkey={[translateHotkey, ...quickSlots.map((s) => s.hotkey)].filter(Boolean)}
            defaultKey="CommandOrControl+Alt+J"
            icon={BookOpen}
            description="Highlight text & press this combination to de-jargonize and explain idioms in plain words."
          />
        </div>

        {/* 3 Quick Action Custom Prompt Slots (In-Place Rewrite & Paste Back) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 700 }}>
              <Sparkles size={17} color="#a855f7" />
              <span>3 Quick Prompt Actions (In-Place Rewrite & Hotkeys)</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.12)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
              ⚡ Auto Paste-Back
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Highlight text anywhere in Windows and press the slot's shortcut. The AI will transform the text according to your prompt and <strong>automatically paste it back in-place</strong> into your active app!
          </span>

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
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: slot.enabled ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  opacity: slot.enabled ? 1 : 0.65,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Slot Header: Toggle & Title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <input
                      type="checkbox"
                      id={`slot-enable-${slot.id}`}
                      checked={slot.enabled !== false}
                      onChange={(e) => handleSlotChange(slot.id, { enabled: e.target.checked })}
                      style={{ accentColor: '#6366f1', cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                    <label htmlFor={`slot-enable-${slot.id}`} style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Slot {index + 1}:</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={slot.name || ''}
                      onChange={(e) => handleSlotChange(slot.id, { name: e.target.value })}
                      placeholder={`e.g. Action ${index + 1}`}
                      style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600, height: '28px', flex: 1 }}
                    />
                  </div>

                  {/* Paste Back vs Window Badge */}
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
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Click to toggle between in-place replacement vs popup window"
                  >
                    {slot.pasteBack ? '⚡ In-Place Paste' : '🪟 Show in HUD'}
                  </button>
                </div>

                {/* Prompt Input & Quick Templates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      AI Instructions / Prompt:
                    </label>
                    {/* Quick Template Fillers */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleSlotChange(slot.id, {
                          name: 'Fix Grammar & Polish',
                          prompt: 'Fix grammar, spelling, typos, and phrasing. Keep the exact same language and meaning intact. Output ONLY the polished text without any introduction, explanations, or quotes.'
                        })}
                        style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: '#cbd5e1', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
                      >
                        Grammar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSlotChange(slot.id, {
                          name: 'Professional Business Tone',
                          prompt: 'Rewrite the text into clear, polite, concise, and professional corporate tone. Output ONLY the rewritten text without any introduction, explanations, or quotes.'
                        })}
                        style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: '#cbd5e1', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
                      >
                        Formal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSlotChange(slot.id, {
                          name: 'Translate to English',
                          prompt: 'Translate the text into fluent, natural English. Output ONLY the translated text without extra explanations or quotes.'
                        })}
                        style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '3px', color: '#cbd5e1', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
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
                    placeholder="Enter instructions for what Gemini should do with selected text..."
                    style={{ fontSize: '0.78rem', resize: 'vertical', minHeight: '44px', lineHeight: 1.3 }}
                  />
                </div>

                {/* Hotkey Recorder for Slot */}
                <HotkeyRecorder
                  label={`Slot ${index + 1} Shortcut`}
                  value={slot.hotkey || ''}
                  onChange={(newKey) => handleSlotChange(slot.id, { hotkey: newKey })}
                  otherHotkey={otherKeys}
                  defaultKey={defKey}
                  icon={Keyboard}
                  description={slot.pasteBack ? 'Highlights & replaces selection in-place.' : 'Opens floating HUD with prompt applied.'}
                />
              </div>
            );
          })}
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
