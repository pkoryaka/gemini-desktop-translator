import React from 'react';
import { Languages, Settings, History, Sparkles, Sun, Moon, ShieldCheck, Cloud } from 'lucide-react';
import { storageService } from '../services/storageService';
import appLogo from '../assets/app-icon.png';

export function Header({ currentModel, onOpenSettings, onOpenHistory, hasApiKey, theme, onToggleTheme }) {
  const settings = storageService.getSettings();
  const isLocalAi = settings.aiProvider === 'openai_compatible';

  return (
    <header className="app-header">
      <div className="brand-section">
        <img 
          src={appLogo} 
          alt="NativeLingo" 
          className="brand-logo" 
          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
        />
        <div>
          <h1 className="brand-title">NativeLingo</h1>
          <p className="brand-subtitle">Zero-Tab-Switching AI Assistant & Jargon Demystifier</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Transparent Data Routing Badge */}
        <button
          type="button"
          onClick={onOpenSettings}
          title={isLocalAi ? "Routing: 100% Private Local AI (Ollama/LM Studio)" : "Routing: Google Gemini Direct Cloud"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: isLocalAi ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${isLocalAi ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            color: isLocalAi ? '#10b981' : 'var(--primary)',
            padding: '4px 9px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {isLocalAi ? <ShieldCheck size={13} /> : <Cloud size={13} />}
          <span>{isLocalAi ? 'Local AI' : 'Cloud Direct'}</span>
        </button>

        <button 
          className="badge-model" 
          onClick={onOpenSettings}
          title="Click to configure AI Model and API Key"
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
