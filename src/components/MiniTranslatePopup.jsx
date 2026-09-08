import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  X, 
  BookOpen, 
  ArrowRight, 
  Loader2,
  ChevronDown,
  AlertCircle,
  Settings
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
  onExpandToFull,
  onOpenSettings,
  onClose,
  onCopy
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  const handleSpeak = () => {
    if (!('speechSynthesis' in window) || !translatedText) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(translatedText);
    const langMap = { uk: 'uk-UA', ru: 'ru-RU', es: 'es-ES', en: 'en-US' };
    if (langMap[targetLang]) utterance.lang = langMap[targetLang];

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      backdropFilter: 'blur(20px)',
      color: 'var(--text-primary)',
      padding: '14px 18px',
      gap: '10px',
      userSelect: 'text',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {sourceLangObj?.name || 'Auto-Detect'}
          </span>
          <ArrowRight size={13} color="var(--primary)" />

          {/* Quick Target Language Selector */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang && setTargetLang(e.target.value)}
              style={{
                appearance: 'none',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '3px 22px 3px 8px',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
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
            <ChevronDown size={12} color="var(--primary)" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {explanationData && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(168,85,247,0.15)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>
              <BookOpen size={10} /> Jargon Mode
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {translatedText && (
            <>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy Translation'}
                style={{ width: '28px', height: '28px' }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={13} />}
              </button>

              <button
                type="button"
                className={`btn-icon ${isSpeaking ? 'active' : ''}`}
                onClick={handleSpeak}
                title="Listen (Text-to-Speech)"
                style={{ width: '28px', height: '28px' }}
              >
                {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            </>
          )}

          {/* Prominent Expand Button */}
          <button
            type="button"
            onClick={onExpandToFull}
            title="Open Full NativeLingo Application"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.72rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            <Maximize2 size={12} />
            <span>Full App</span>
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Close to Tray (Esc)"
            style={{ width: '28px', height: '28px' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Source Selected Text snippet */}
      {sourceText && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-input)',
          borderRadius: '6px',
          padding: '6px 10px',
          maxHeight: '50px',
          overflowY: 'auto',
          borderLeft: '3px solid var(--primary)',
          lineHeight: 1.4,
          wordBreak: 'normal',
          overflowWrap: 'break-word',
          hyphens: 'none',
          whiteSpace: 'pre-wrap'
        }}>
          "{sourceText}"
        </div>
      )}

      {/* Error Message Box (if any) */}
      {errorMessage && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          padding: '10px 12px',
          color: '#fca5a5',
          fontSize: '0.82rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <AlertCircle size={15} color="#f87171" />
            <span>Translation Issue</span>
          </div>
          <div style={{ color: '#fecaca', lineHeight: 1.4 }}>{errorMessage}</div>
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
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Settings size={12} /> Open Settings
            </button>
          )}
        </div>
      )}

      {/* Main Translated Text Area */}
      {!errorMessage && (
        <div style={{
          flex: 1,
          fontSize: '1.05rem',
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-main)',
          minHeight: '70px',
          display: 'flex',
          alignItems: isLoading && !translatedText ? 'center' : 'flex-start',
          justifyContent: isLoading && !translatedText ? 'center' : 'flex-start'
        }}>
          {isLoading && !translatedText ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
              <Loader2 size={18} className="spinner" />
              <span>Translating into {targetLangObj?.name || targetLang}...</span>
            </div>
          ) : (
            <div style={{
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'normal',
              overflowWrap: 'break-word',
              hyphens: 'none',
              fontWeight: 500
            }}>
              {translatedText}
            </div>
          )}
        </div>
      )}

      {/* Plain Language & Jargon Breakdown (if active) */}
      {!errorMessage && explanationData && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.8rem'
        }}>
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
                    fontSize: '0.72rem',
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
