import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Clipboard, 
  ArrowRight, 
  Loader2,
  CornerDownLeft
} from 'lucide-react';

export function TranslationPanels({
  sourceText,
  setSourceText,
  translatedText,
  sourceLang,
  targetLang,
  isLoading,
  onTranslate,
  errorMessage
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);

  // Copy to clipboard
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
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      let text = '';
      if (window.electronAPI?.readClipboard) {
        text = await window.electronAPI.readClipboard();
      } else {
        text = await navigator.clipboard.readText();
      }
      if (text) {
        setSourceText(text);
      }
    } catch (e) {
      console.error('Paste failed', e);
    }
  };

  // Text-To-Speech
  const speakText = (text, langCode, setSpeakingState) => {
    if (!('speechSynthesis' in window) || !text) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingState(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map langCode to BCP-47
    const langMap = {
      uk: 'uk-UA',
      ru: 'ru-RU',
      es: 'es-ES',
      en: 'en-US'
    };
    if (langMap[langCode]) {
      utterance.lang = langMap[langCode];
    }

    utterance.onstart = () => setSpeakingState(true);
    utterance.onend = () => setSpeakingState(false);
    utterance.onerror = () => setSpeakingState(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onTranslate();
    }
  };

  return (
    <div className="panels-grid">
      {/* Source Text Panel */}
      <div className="translation-panel">
        <div className="panel-header">
          <span className="panel-title-badge">
            Source Text
          </span>
          <div className="action-buttons-group">
            <button
              type="button"
              className="btn-icon"
              onClick={handlePaste}
              title="Paste from clipboard"
              aria-label="Paste"
            >
              <Clipboard size={16} />
            </button>
            {sourceText && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSourceText('')}
                title="Clear text"
                aria-label="Clear"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="panel-textarea-wrapper">
          <textarea
            className="panel-textarea"
            placeholder="Type or paste text to translate (Ukrainian, Russian, Spanish, English)..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="panel-footer">
          <div className="panel-meta">
            <span>{sourceText.length} characters</span>
            <span style={{ opacity: 0.6 }}>• Press Ctrl+Enter to translate</span>
          </div>

          <div className="action-buttons-group">
            {sourceText && (
              <button
                type="button"
                className={`btn-icon ${isSpeakingSource ? 'active' : ''}`}
                onClick={() => speakText(sourceText, sourceLang, setIsSpeakingSource)}
                title="Listen to original text"
              >
                {isSpeakingSource ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}

            <button
              type="button"
              className="btn-translate"
              onClick={onTranslate}
              disabled={isLoading || !sourceText.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>Translate</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Target Translation Panel */}
      <div className="translation-panel">
        <div className="panel-header">
          <span className="panel-title-badge">
            Translation
          </span>
          <div className="action-buttons-group">
            {translatedText && (
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy to clipboard'}
                aria-label="Copy"
              >
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>

        <div className="panel-textarea-wrapper">
          {errorMessage ? (
            <div style={{ padding: '20px', color: '#f87171', fontSize: '0.95rem', lineHeight: 1.5 }}>
              ⚠️ <strong>Error:</strong> {errorMessage}
            </div>
          ) : (
            <textarea
              className="panel-textarea"
              placeholder="Translation will appear here..."
              value={translatedText}
              readOnly
            />
          )}
        </div>

        <div className="panel-footer">
          <div className="panel-meta">
            {translatedText ? <span>{translatedText.length} characters</span> : <span>Ready</span>}
          </div>

          <div className="action-buttons-group">
            {translatedText && (
              <button
                type="button"
                className={`btn-icon ${isSpeakingTarget ? 'active' : ''}`}
                onClick={() => speakText(translatedText, targetLang, setIsSpeakingTarget)}
                title="Listen to translation"
              >
                {isSpeakingTarget ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
