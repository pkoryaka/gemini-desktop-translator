import React from 'react';
import { ArrowLeftRight, ChevronDown, Lightbulb, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../services/geminiService';

export function LanguageSelector({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  explainJargon,
  setExplainJargon
}) {
  const handleSwap = () => {
    if (sourceLang === 'auto') {
      // If auto-detect, swap target into source and default target to English or Ukrainian
      setSourceLang(targetLang);
      setTargetLang(targetLang === 'en' ? 'uk' : 'en');
    } else {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    }
  };

  return (
    <div className="control-bar">
      <div className="language-switch-group">
        {/* Source Language */}
        <div className="lang-select-container">
          <select
            className="lang-select"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`src-${lang.code}`} value={lang.code}>
                {lang.name} {lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="lang-select-arrow" />
        </div>

        {/* Swap Button */}
        <button
          type="button"
          className="btn-swap-languages"
          onClick={handleSwap}
          title="Swap source and target languages"
          aria-label="Swap languages"
        >
          <ArrowLeftRight size={18} />
        </button>

        {/* Target Language */}
        <div className="lang-select-container">
          <select
            className="lang-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
              <option key={`tgt-${lang.code}`} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="lang-select-arrow" />
        </div>
      </div>

      {/* Jargon & Plain Language Explanation Toggle */}
      <div
        className={`jargon-toggle-card ${explainJargon ? 'active' : ''}`}
        onClick={() => setExplainJargon(!explainJargon)}
        role="button"
        tabIndex={0}
      >
        <Lightbulb size={20} color={explainJargon ? '#c084fc' : '#94a3b8'} />
        <div className="jargon-toggle-text">
          <span className="jargon-toggle-title">Explain Jargon & Meaning</span>
          <span className="jargon-toggle-desc">
            {explainJargon ? 'Active (Plain language breakdown)' : 'Click to enable slang & tone analysis'}
          </span>
        </div>
      </div>
    </div>
  );
}
