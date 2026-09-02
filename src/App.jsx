import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationPromptBar } from './components/TranslationPromptBar';
import { TranslationPanels } from './components/TranslationPanels';
import { JargonExplainerCard } from './components/JargonExplainerCard';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { MiniTranslatePopup } from './components/MiniTranslatePopup';
import { translateText } from './services/geminiService';
import { storageService } from './services/storageService';
import { Zap } from 'lucide-react';

export function App() {
  const [settings, setSettings] = useState(storageService.getSettings());
  const [apiKey, setApiKey] = useState(storageService.getApiKey());

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState(settings.primaryTargetLanguage || 'uk');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  
  const [customPrompt, setCustomPrompt] = useState('');
  const [activePreset, setActivePreset] = useState(null);
  const [explainJargon, setExplainJargon] = useState(false);
  const [explanationData, setExplanationData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [quickTranslateToast, setQuickTranslateToast] = useState(false);
  const [quickToastMessage, setQuickToastMessage] = useState('');

  // Mini Floating Window Mode
  const [isMiniMode, setIsMiniMode] = useState(false);

  // Modals & Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const refreshSettings = () => {
    const updated = storageService.getSettings();
    setSettings(updated);
    setApiKey(storageService.getApiKey());
    if (updated.primaryTargetLanguage) {
      setTargetLang(updated.primaryTargetLanguage);
    }
  };

  const switchToFullMode = () => {
    setIsMiniMode(false);
    if (window.electronAPI?.setWindowMode) {
      window.electronAPI.setWindowMode('full');
    }
  };

  const switchToMiniMode = () => {
    setIsMiniMode(true);
    if (window.electronAPI?.setWindowMode) {
      window.electronAPI.setWindowMode('mini');
    }
  };

  const handleCloseMini = () => {
    if (window.electronAPI?.hideToTray) {
      window.electronAPI.hideToTray();
    }
  };

  const executeTranslationWithMode = useCallback(async (textToTranslate, explicitTargetLang, explicitExplainMode) => {
    const text = (textToTranslate !== undefined ? textToTranslate : sourceText).trim();
    if (!text) return;

    const currentKey = storageService.getApiKey();
    if (!currentKey) {
      setErrorMessage('Please set your free Google Gemini API Key in Settings first.');
      switchToFullMode();
      setIsSettingsOpen(true);
      return;
    }

    const currentSettings = storageService.getSettings();
    const mode = explicitExplainMode !== undefined ? explicitExplainMode : explainJargon;
    const effectiveTarget = explicitTargetLang || targetLang || currentSettings.primaryTargetLanguage || 'uk';

    setIsLoading(true);
    setTranslatedText(''); // Clear stale previous text
    setErrorMessage('');
    setExplanationData(null);

    try {
      const result = await translateText({
        apiKey: currentKey,
        text,
        sourceLang,
        targetLang: effectiveTarget,
        customPrompt,
        explainJargon: mode,
        model: currentSettings.model || 'gemini-3.6-flash',
        temperature: currentSettings.temperature ?? 0.2,
        onStreamChunk: (partialText) => {
          if (!mode) {
            setTranslatedText(partialText);
          }
        }
      });

      if (result) {
        setTranslatedText(result.translation);
        if (result.isExplained) {
          setExplanationData(result);
        }

        // Save to History
        if (currentSettings.saveHistory !== false) {
          storageService.addHistoryItem({
            sourceText: text,
            translatedText: result.translation,
            sourceLang,
            targetLang: effectiveTarget,
            isExplained: result.isExplained,
            customPrompt
          });
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
      setErrorMessage(err.message || 'Translation failed. Please check your network or API Key.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, sourceLang, targetLang, customPrompt, explainJargon]);

  const handleTranslate = useCallback(() => {
    executeTranslationWithMode(sourceText, targetLang, explainJargon);
  }, [executeTranslationWithMode, sourceText, targetLang, explainJargon]);

  const handleMiniTargetLangChange = (newTarget) => {
    setTargetLang(newTarget);
    if (sourceText && sourceText.trim()) {
      executeTranslationWithMode(sourceText, newTarget, explainJargon);
    }
  };

  // Setup Global Quick Translate & Settings IPC Listeners
  useEffect(() => {
    if (window.electronAPI?.onQuickTranslate) {
      const unsubscribe = window.electronAPI.onQuickTranslate((payload) => {
        const text = typeof payload === 'string' ? payload : payload?.text;
        const shouldExplain = typeof payload === 'object' ? Boolean(payload.explainJargon) : false;

        if (text && text.trim()) {
          const currentSettings = storageService.getSettings();
          const target = currentSettings.primaryTargetLanguage || 'uk';
          
          setTargetLang(target);
          setSourceText(text);
          setExplainJargon(shouldExplain);

          // If Instant Mini Popup mode is enabled
          if (currentSettings.instantPopupMode !== false) {
            switchToMiniMode();
          } else {
            switchToFullMode();
          }

          setQuickTranslateToast(true);
          setQuickToastMessage(
            shouldExplain 
              ? '💡 Translated & Explained Jargon' 
              : '⚡ Quick Translated Selected Text'
          );
          setTimeout(() => setQuickTranslateToast(false), 3000);

          // Trigger execution immediately with current text & target
          executeTranslationWithMode(text, target, shouldExplain);
        }
      });
      return () => unsubscribe && unsubscribe();
    }
  }, [executeTranslationWithMode]);

  useEffect(() => {
    if (window.electronAPI?.onOpenSettings) {
      const unsubscribe = window.electronAPI.onOpenSettings(() => {
        switchToFullMode();
        setIsSettingsOpen(true);
      });
      return () => unsubscribe && unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onShowFullWindow) {
      const unsubscribe = window.electronAPI.onShowFullWindow(() => {
        switchToFullMode();
      });
      return () => unsubscribe && unsubscribe();
    }
  }, []);

  // Keyboard shortcut Esc to hide or close mini window
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isMiniMode) {
          handleCloseMini();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMiniMode]);

  const handleSelectHistoryItem = (item) => {
    setSourceText(item.sourceText || '');
    setTranslatedText(item.translatedText || '');
    if (item.sourceLang) setSourceLang(item.sourceLang);
    if (item.targetLang) setTargetLang(item.targetLang);
    if (item.customPrompt) setCustomPrompt(item.customPrompt);
    setExplanationData(null);
  };

  // If in Mini Popup Mode
  if (isMiniMode) {
    return (
      <MiniTranslatePopup
        sourceText={sourceText}
        translatedText={translatedText}
        sourceLang={sourceLang}
        targetLang={targetLang}
        setTargetLang={handleMiniTargetLangChange}
        explanationData={explanationData}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onExpandToFull={switchToFullMode}
        onOpenSettings={() => {
          switchToFullMode();
          setIsSettingsOpen(true);
        }}
        onClose={handleCloseMini}
      />
    );
  }

  // Full Window Mode
  return (
    <div className="app-container">
      {/* Quick Translate Toast Notification */}
      {quickTranslateToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Zap size={16} />
          <span>{quickToastMessage || 'Quick Translated Selected Text'}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentModel={settings.model || 'gemini-3.6-flash'}
        hasApiKey={Boolean(apiKey)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Language & Explainer Switch Bar */}
      <LanguageSelector
        sourceLang={sourceLang}
        setSourceLang={setSourceLang}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        explainJargon={explainJargon}
        setExplainJargon={setExplainJargon}
      />

      {/* Translation Style / Custom Prompt Bar */}
      <TranslationPromptBar
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
      />

      {/* Main Translation Panels */}
      <TranslationPanels
        sourceText={sourceText}
        setSourceText={setSourceText}
        translatedText={translatedText}
        sourceLang={sourceLang}
        targetLang={targetLang}
        isLoading={isLoading}
        onTranslate={handleTranslate}
        errorMessage={errorMessage}
      />

      {/* Jargon & Plain Language Explanation Card (rendered if available) */}
      {explanationData && (
        <JargonExplainerCard explanationData={explanationData} />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={refreshSettings}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistoryItem={handleSelectHistoryItem}
      />
    </div>
  );
}
export default App;
