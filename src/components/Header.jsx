import React from 'react';
import { Languages, Settings, History, Sparkles, Sun, Moon } from 'lucide-react';

export function Header({ currentModel, onOpenSettings, onOpenHistory, hasApiKey, theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <img 
          src="/app-icon.png" 
          alt="Gemini AI Assistant Logo" 
          className="brand-logo" 
          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
        />
        <div>
          <h1 className="brand-title">NativeLingo</h1>
          <p className="brand-subtitle">In-Place AI • 53+ Languages • Jargon Demystifier • BYOM Local AI</p>
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
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
          title="Settings & Preferences"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
