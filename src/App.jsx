import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationPromptBar } from './components/TranslationPromptBar';
import { TranslationPanels } from './components/TranslationPanels';
import { JargonExplainerCard } from './components/JargonExplainerCard';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { translateText } from './services/geminiService';
import { storageService } from './services/storageService';
import { Zap } from 'lucide-react';

export function App() {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  
  const [customPrompt, setCustomPrompt] = useState('');
  const [activePreset, setActivePreset] = useState(null);
  const [explainJargon, setExplainJargon] = useState(false);
  const [explanationData, setExplanationData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [quickTranslateToast, setQuickTranslateToast] = useState(false);

  // Modals & Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [settings, setSettings] = useState(storageService.getSettings());
  const [apiKey, setApiKey] = useState(storageService.getApiKey());

  const refreshSettings = () => {
    setSettings(storageService.getSettings());
    setApiKey(storageService.getApiKey());
  };

  const executeTranslationWithMode = useCallback(async (textToTranslate, explicitExplainMode) => {
    const text = (textToTranslate !== undefined ? textToTranslate : sourceText).trim();
    if (!text) return;

    const currentKey = storageService.getApiKey();
    if (!currentKey) {
      setErrorMessage('Please set your free Google Gemini API Key in Settings first.');
      setIsSettingsOpen(true);
      return;
    }

    const mode = explicitExplainMode !== undefined ? explicitExplainMode : explainJargon;

    setIsLoading(true);
    setErrorMessage('');
    setExplanationData(null);

    const currentSettings = storageService.getSettings();

    try {
      const result = await translateText({
        apiKey: currentKey,
        text,
        sourceLang,
        targetLang,
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
            targetLang,
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
    executeTranslationWithMode(sourceText, explainJargon);
  }, [executeTranslationWithMode, sourceText, explainJargon]);

  const [quickToastMessage, setQuickToastMessage] = useState('');

  // Setup Global Quick Translate & Settings IPC Listeners
  useEffect(() => {
    if (window.electronAPI?.onQuickTranslate) {
      const unsubscribe = window.electronAPI.onQuickTranslate((payload) => {
        const text = typeof payload === 'string' ? payload : payload?.text;
        const shouldExplain = typeof payload === 'object' ? Boolean(payload.explainJargon) : false;

        if (text && text.trim()) {
          setSourceText(text);
          setExplainJargon(shouldExplain);
          setQuickTranslateToast(true);
          setQuickToastMessage(
            shouldExplain 
              ? '💡 Translated & Explained Jargon' 
              : '⚡ Quick Translated Selected Text'
          );
          setTimeout(() => setQuickTranslateToast(false), 3000);

          // Trigger execution with the specified mode
          executeTranslationWithMode(text, shouldExplain);
        }
      });
      return () => unsubscribe && unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onOpenSettings) {
      const unsubscribe = window.electronAPI.onOpenSettings(() => {
        setIsSettingsOpen(true);
      });
      return () => unsubscribe && unsubscribe();
    }
  }, []);

  const handleSelectHistoryItem = (item) => {
    setSourceText(item.sourceText || '');
    setTranslatedText(item.translatedText || '');
    if (item.sourceLang) setSourceLang(item.sourceLang);
    if (item.targetLang) setTargetLang(item.targetLang);
    if (item.customPrompt) setCustomPrompt(item.customPrompt);
    setExplanationData(null);
  };

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
        currentModel={settings.model || 'gemini-2.5-flash'}
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
