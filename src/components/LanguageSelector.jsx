import React, { useMemo } from 'react';
import { ArrowLeftRight, ChevronDown, Lightbulb, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../services/geminiService';
import { storageService } from '../services/storageService';

export function LanguageSelector({
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  explainJargon,
  setExplainJargon
}) {
  const preferredCodes = storageService.getPreferredLanguages();

  const { preferredList, otherList } = useMemo(() => {
    const nonAuto = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto');
    const pref = preferredCodes
      .map((c) => nonAuto.find((l) => l.code === c))
      .filter(Boolean);
    const other = nonAuto.filter((l) => !preferredCodes.includes(l.code));
    return { preferredList: pref, otherList: other };
  }, [preferredCodes]);

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
            <option value="auto">Auto-Detect (Автовизначення)</option>
            {preferredList.length > 0 && (
              <optgroup label="⭐ Preferred Languages">
                {preferredList.map((lang) => (
                  <option key={`src-pref-${lang.code}`} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="All Languages">
              {otherList.map((lang) => (
                <option key={`src-all-${lang.code}`} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
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
            {preferredList.length > 0 && (
              <optgroup label="⭐ Preferred Languages">
                {preferredList.map((lang) => (
                  <option key={`tgt-pref-${lang.code}`} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="All Languages">
              {otherList.map((lang) => (
                <option key={`tgt-all-${lang.code}`} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </optgroup>
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
