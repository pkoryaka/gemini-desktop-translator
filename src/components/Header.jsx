import React from 'react';
import { Languages, Settings, History, Sparkles } from 'lucide-react';

export function Header({ currentModel, onOpenSettings, onOpenHistory, hasApiKey }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Languages size={22} />
        </div>
        <div>
          <h1 className="brand-title">Gemini Translator</h1>
          <p className="brand-subtitle">Ukrainian • Russian • Spanish • English</p>
        </div>
      </div>

      <div className="header-actions">
        <button 
          className="badge-model" 
          onClick={onOpenSettings}
          title="Click to configure Gemini API Key and Model"
        >
          <span className={`badge-pulse-dot ${hasApiKey ? '' : 'warning'}`} />
          <Sparkles size={13} />
          <span>{currentModel}</span>
        </button>

        <button 
          className="btn-icon" 
          onClick={onOpenHistory}
          title="Translation History"
          aria-label="History"
        >
          <History size={18} />
        </button>

        <button 
          className="btn-icon" 
          onClick={onOpenSettings}
          title="Settings & API Key"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
