import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  X, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../services/geminiService';

export function MiniTranslatePopup({
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  explanationData,
  isLoading,
  onExpandToFull,
  onClose,
  onCopy
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);

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
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      color: '#fff',
      padding: '16px',
      gap: '12px',
      userSelect: 'text',
      overflowY: 'auto'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>
          <span style={{ color: '#cbd5e1' }}>{sourceLangObj?.name || 'Auto'}</span>
          <ArrowRight size={13} />
          <span style={{ color: '#818cf8', fontWeight: 700 }}>{targetLangObj?.name || targetLang}</span>
          {explanationData && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
              <BookOpen size={11} /> Jargon Explainer
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {translatedText && (
            <>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy Translation'}
                style={{ width: '30px', height: '30px' }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>

              <button
                type="button"
                className={`btn-icon ${isSpeaking ? 'active' : ''}`}
                onClick={handleSpeak}
                title="Listen"
                style={{ width: '30px', height: '30px' }}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-icon"
            onClick={onExpandToFull}
            title="Expand to Full Window"
            style={{ width: '30px', height: '30px' }}
          >
            <Maximize2 size={14} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Close (Esc)"
            style={{ width: '30px', height: '30px' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Source snippet */}
      {sourceText && (
        <div style={{
          fontSize: '0.8rem',
          color: '#94a3b8',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          padding: '6px 10px',
          maxHeight: '60px',
          overflowY: 'auto',
          borderLeft: '3px solid #6366f1'
        }}>
          "{sourceText}"
        </div>
      )}

      {/* Main Translated Text */}
      <div style={{
        flex: 1,
        fontSize: '1.05rem',
        lineHeight: 1.5,
        color: '#f8fafc',
        fontFamily: 'var(--font-main)',
        minHeight: '80px',
        display: 'flex',
        alignItems: isLoading && !translatedText ? 'center' : 'flex-start',
        justifyContent: isLoading && !translatedText ? 'center' : 'flex-start'
      }}>
        {isLoading && !translatedText ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontSize: '0.9rem' }}>
            <Loader2 size={18} className="spinner" />
            <span>Translating...</span>
          </div>
        ) : (
          <div style={{ width: '100%', whiteSpace: 'pre-wrap' }}>{translatedText}</div>
        )}
      </div>

      {/* Plain Language & Jargon Breakdown (if active) */}
      {explanationData && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.82rem'
        }}>
          {explanationData.plainLanguageMeaning && (
            <div>
              <strong style={{ color: '#c084fc' }}>Meaning in Plain Words: </strong>
              <span style={{ color: '#e2e8f0' }}>{explanationData.plainLanguageMeaning}</span>
            </div>
          )}

          {explanationData.detectedTone && (
            <div style={{ fontSize: '0.75rem', color: '#fde68a' }}>
              <strong>Tone:</strong> {explanationData.detectedTone}
            </div>
          )}

          {explanationData.jargonBreakdown?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
              {explanationData.jargonBreakdown.map((j, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    color: '#e9d5ff'
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
