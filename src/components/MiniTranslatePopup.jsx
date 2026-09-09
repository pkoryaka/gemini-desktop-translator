import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  ArrowRight, 
  Loader2,
  ChevronDown,
  AlertCircle,
  Settings,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../services/geminiService';
import { storageService } from '../services/storageService';

export function MiniTranslatePopup({
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  setTargetLang,
  explanationData,
  isLoading,
  errorMessage,
  onOpenSettings,
  onCopy
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);

  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);

  const preferredCodes = storageService.getPreferredLanguages();
  const { preferredList, otherList } = useMemo(() => {
    const nonAuto = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto');
    const pref = preferredCodes
      .map((c) => nonAuto.find((l) => l.code === c))
      .filter(Boolean);
    const other = nonAuto.filter((l) => !preferredCodes.includes(l.code));
    return { preferredList: pref, otherList: other };
  }, [preferredCodes]);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      if (window.electronAPI?.copyToClipboard) {
        await window.electronAPI.copyToClipboard(translatedText);
      } else {
        await navigator.clipboard.writeText(translatedText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopy) onCopy();
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleSpeak = async () => {
    if (!translatedText || !translatedText.trim()) return;

    if (ttsService.isSpeaking()) {
      ttsService.stop();
      setIsSpeaking(false);
      setIsSpeakingSource(false);
      return;
    }

    await ttsService.speak({
      text: translatedText,
      lang: targetLang,
      onStart: () => {
        setIsSpeaking(true);
        setIsSpeakingSource(false);
      },
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleSpeakSource = async () => {
    if (!sourceText || !sourceText.trim()) return;

    if (ttsService.isSpeaking()) {
      ttsService.stop();
      setIsSpeaking(false);
      setIsSpeakingSource(false);
      return;
    }

    await ttsService.speak({
      text: sourceText,
      lang: sourceLang,
      onStart: () => {
        setIsSpeakingSource(true);
        setIsSpeaking(false);
      },
      onEnd: () => setIsSpeakingSource(false),
      onError: () => setIsSpeakingSource(false)
    });
  };

  const sourceCharCount = sourceText ? sourceText.trim().length : 0;
  const targetCharCount = translatedText ? translatedText.trim().length : 0;

  return (
    <div className="mini-popup-container">
      {/* Top Header Bar */}
      <div className="mini-popup-header">
        <div className="mini-lang-selector-group">
          <span className="mini-lang-badge">
            {sourceLangObj?.name || 'Auto-Detect'}
          </span>
          <ArrowRight size={13} color="var(--primary)" />

          {/* Target Language Dropdown Selector */}
          <div className="mini-lang-select-wrapper">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang && setTargetLang(e.target.value)}
              className="mini-lang-select"
            >
              {preferredList.length > 0 && (
                <optgroup label="⭐ Preferred" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-amber)' }}>
                  {preferredList.map((l) => (
                    <option key={`mini-pref-${l.code}`} value={l.code} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All Languages" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {otherList.map((l) => (
                  <option key={`mini-all-${l.code}`} value={l.code} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={12} color="var(--primary)" style={{ position: 'absolute', right: '6px', pointerEvents: 'none' }} />
          </div>

          {explanationData && (
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: 'rgba(168,85,247,0.15)', 
              color: 'var(--accent-purple)', 
              padding: '2px 8px', 
              borderRadius: '999px', 
              fontSize: '0.72rem', 
              fontWeight: 600 
            }}>
              <BookOpen size={11} /> Jargon Mode
            </span>
          )}

          {/* Compact Data Routing Indicator */}
          <span 
            title={storageService.getSettings()?.aiProvider === 'openai_compatible' ? "Processing via Localhost (Ollama)" : "Processing via Google Gemini Direct Cloud"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '3px', 
              background: storageService.getSettings()?.aiProvider === 'openai_compatible' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)', 
              color: storageService.getSettings()?.aiProvider === 'openai_compatible' ? '#10b981' : 'var(--primary)', 
              padding: '2px 7px', 
              borderRadius: '999px', 
              fontSize: '0.68rem', 
              fontWeight: 600 
            }}
          >
            {storageService.getSettings()?.aiProvider === 'openai_compatible' ? <ShieldCheck size={10} /> : <Cloud size={10} />}
            <span>{storageService.getSettings()?.aiProvider === 'openai_compatible' ? 'Local' : 'Cloud'}</span>
          </span>
        </div>

        {/* Quick Utility Actions (Copy & TTS only - no duplicate close or special buttons) */}
        <div className="mini-header-actions">
          {translatedText && (
            <>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                title={copied ? 'Copied to Clipboard!' : 'Copy Translation'}
                style={{ width: '28px', height: '28px' }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={13} />}
              </button>

              <button
                type="button"
                className={`btn-icon ${isSpeaking ? 'active' : ''}`}
                onClick={handleSpeak}
                title={isSpeaking ? 'Stop Listening' : 'Listen (Text-to-Speech)'}
                style={{ width: '28px', height: '28px' }}
              >
                {isSpeaking ? <VolumeX size={13} color="var(--accent-cyan)" /> : <Volume2 size={13} />}
              </button>
            </>
          )}

          {onOpenSettings && (
            <button
              type="button"
              className="btn-icon"
              onClick={onOpenSettings}
              title="Settings"
              style={{ width: '28px', height: '28px' }}
            >
              <Settings size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Dual-Panel Aligned Content Grid */}
      <div className="mini-panels-grid">
        {/* Left Panel: Original Source Text */}
        <div className="mini-panel-card mini-panel-source">
          <div className="mini-panel-header">
            <span>ORIGINAL ({sourceLangObj?.name || 'Detected'})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{sourceCharCount} chars</span>
              {sourceText && (
                <button
                  type="button"
                  className={`btn-icon ${isSpeakingSource ? 'active' : ''}`}
                  onClick={handleSpeakSource}
                  title={isSpeakingSource ? 'Stop Listening' : 'Listen (Original)'}
                  style={{ width: '20px', height: '20px', padding: 0 }}
                >
                  {isSpeakingSource ? <VolumeX size={11} color="var(--accent-cyan)" /> : <Volume2 size={11} />}
                </button>
              )}
            </div>
          </div>
          <div className="mini-panel-body">
            {sourceText || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No text selected...</span>}
          </div>
        </div>

        {/* Right Panel: Translated Output */}
        <div className="mini-panel-card mini-panel-target">
          <div className="mini-panel-header">
            <span>TRANSLATION ({targetLangObj?.name || targetLang})</span>
            {isLoading && !translatedText ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textTransform: 'none', fontWeight: 600 }}>
                <Loader2 size={11} className="spinner" /> Streaming...
              </span>
            ) : (
              <span>{targetCharCount} chars</span>
            )}
          </div>

          <div className="mini-panel-body">
            {errorMessage ? (
              <div style={{
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <AlertCircle size={14} color="#f87171" />
                  <span>Translation Error</span>
                </div>
                <div style={{ lineHeight: 1.4 }}>{errorMessage}</div>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: '4px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Open Settings
                  </button>
                )}
              </div>
            ) : isLoading && !translatedText ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--primary)',
                gap: '8px',
                fontSize: '0.88rem'
              }}>
                <Loader2 size={16} className="spinner" />
                <span>Translating in real-time...</span>
              </div>
            ) : (
              translatedText || (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {isLoading ? 'Waiting for response...' : 'Translation will appear here...'}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Jargon & Nuance Breakdown (if active) */}
      {!errorMessage && explanationData && (
        <div className="mini-jargon-section">
          {explanationData.plainLanguageMeaning && (
            <div>
              <strong style={{ color: 'var(--accent-purple)' }}>Meaning: </strong>
              <span style={{ color: 'var(--text-primary)' }}>{explanationData.plainLanguageMeaning}</span>
            </div>
          )}

          {explanationData.detectedTone && (
            <div style={{ fontSize: '0.74rem', color: 'var(--accent-amber)' }}>
              <strong>Tone:</strong> {explanationData.detectedTone}
            </div>
          )}

          {explanationData.jargonBreakdown?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
              {explanationData.jargonBreakdown.map((j, i) => (
                <span
                  key={i}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    color: 'var(--text-primary)'
                  }}
                  title={`Literal: ${j.literalMeaning || 'N/A'} | Nuance: ${j.nuance || ''}`}
                >
                  "{j.term}" = {j.intendedMeaning}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
