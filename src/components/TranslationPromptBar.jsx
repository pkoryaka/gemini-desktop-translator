import React from 'react';
import { SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { storageService } from '../services/storageService';

export function TranslationPromptBar({ customPrompt, setCustomPrompt, activePreset, setActivePreset }) {
  const presets = storageService.getPresets();

  const handleSelectPreset = (preset) => {
    if (activePreset === preset.id) {
      // Toggle off
      setActivePreset(null);
      setCustomPrompt('');
    } else {
      setActivePreset(preset.id);
      setCustomPrompt(preset.prompt);
    }
  };

  const handleCustomInputChange = (e) => {
    setCustomPrompt(e.target.value);
    setActivePreset(null); // Clear preset selection if user manually edits
  };

  const handleClear = () => {
    setCustomPrompt('');
    setActivePreset(null);
  };

  return (
    <div className="prompt-bar-section">
      <div className="prompt-bar-header">
        <span className="prompt-bar-title">
          <SlidersHorizontal size={14} />
          Translation Style / Custom Prompt
        </span>
        <div className="preset-chips-container">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
              title={preset.prompt}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-prompt-input-wrapper">
        <input
          type="text"
          className="custom-prompt-input"
          placeholder="e.g. 'Translate in polite diplomatic tone', 'Translate as if for a teenager', 'Use concise bullet points'..."
          value={customPrompt}
          onChange={handleCustomInputChange}
        />
        {customPrompt && (
          <button
            type="button"
            className="custom-prompt-clear"
            onClick={handleClear}
            title="Clear prompt"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
