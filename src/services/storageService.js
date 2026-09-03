const STORAGE_KEYS = {
  API_KEY: 'gemini_translator_api_key',
  SETTINGS: 'gemini_translator_settings',
  HISTORY: 'gemini_translator_history',
  CUSTOM_PRESETS: 'gemini_translator_custom_presets',
  CACHED_MODELS: 'gemini_translator_cached_models'
};

const DEFAULT_SETTINGS = {
  model: 'gemini-2.0-flash',
  temperature: 0.1,
  autoDetectLanguage: true,
  autoSpeak: false,
  saveHistory: true,
  enableStreaming: true,
  primaryTargetLanguage: 'uk',
  secondaryTargetLanguage: 'en',
  instantPopupMode: true,
  startMinimized: false,
  translateHotkey: 'CommandOrControl+Alt+T',
  explainHotkey: 'CommandOrControl+Alt+J'
};

const DEFAULT_PRESETS = [
  { id: 'natural', label: 'Natural & Fluent', prompt: 'Translate naturally as a native speaker, maintaining the original emotion and intent.' },
  { id: 'formal', label: 'Formal / Business', prompt: 'Translate in a polite, professional, and corporate tone suitable for business correspondence.' },
  { id: 'casual', label: 'Casual / Chat', prompt: 'Translate casually as if chatting with a close friend on messenger.' },
  { id: 'eli5', label: 'Explain Like I\'m 5', prompt: 'Translate into the simplest possible wording, easy to understand for anyone.' },
  { id: 'technical', label: 'Technical / Exact', prompt: 'Preserve technical precision, industry terminology, and literal fidelity where appropriate.' }
];

export const storageService = {
  getApiKey: () => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  setApiKey: (key) => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    storageService.syncToElectron();
  },

  getSettings: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      if (parsed.model && parsed.model.includes('3.6')) {
        parsed.model = 'gemini-2.0-flash';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    storageService.syncToElectron();
  },

  getCachedModels: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CACHED_MODELS);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  },

  setCachedModels: (models) => {
    try {
      if (Array.isArray(models) && models.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CACHED_MODELS, JSON.stringify(models));
      }
    } catch (e) {
      console.warn('Failed to cache models', e);
    }
  },

  syncToElectron: () => {
    if (window.electronAPI?.syncConfig) {
      const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
      const settings = storageService.getSettings();
      window.electronAPI.syncConfig({
        apiKey,
        primaryTargetLanguage: settings.primaryTargetLanguage || 'uk',
        model: settings.model || 'gemini-2.0-flash'
      });
    }
  },

  getPresets: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
      return data ? JSON.parse(data) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  },

  savePresets: (presets) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
  },

  getHistory: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addHistoryItem: (item) => {
    try {
      const history = storageService.getHistory();
      const newItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        favorite: false,
        ...item
      };
      // Keep up to 100 items
      const updated = [newItem, ...history].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return newItem;
    } catch (e) {
      console.error('Failed to save history', e);
    }
  },

  toggleFavoriteHistory: (id) => {
    const history = storageService.getHistory();
    const updated = history.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  },

  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  deleteHistoryItem: (id) => {
    const history = storageService.getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  }
};
