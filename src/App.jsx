import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationPromptBar } from './components/TranslationPromptBar';
import { TranslationPanels } from './components/TranslationPanels';
import { JargonExplainerCard } from './components/JargonExplainerCard';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { translateText } from './services/geminiService';
import { storageService } from './services/storageService';

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

  // Modals & Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [settings, setSettings] = useState(storageService.getSettings());
  const [apiKey, setApiKey] = useState(storageService.getApiKey());

  const refreshSettings = () => {
    setSettings(storageService.getSettings());
    setApiKey(storageService.getApiKey());
  };

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;

    if (!apiKey) {
      setErrorMessage('Please set your free Google Gemini API Key in Settings first.');
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setExplanationData(null);

    try {
      const result = await translateText({
        apiKey,
        text: sourceText,
        sourceLang,
        targetLang,
        customPrompt,
        explainJargon,
        model: settings.model || 'gemini-2.5-flash',
        temperature: settings.temperature ?? 0.3
      });

      if (result) {
        setTranslatedText(result.translation);
        if (result.isExplained) {
          setExplanationData(result);
        }

        // Save to History
        if (settings.saveHistory !== false) {
          storageService.addHistoryItem({
            sourceText,
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
  }, [sourceText, apiKey, sourceLang, targetLang, customPrompt, explainJargon, settings]);

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
