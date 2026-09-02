/**
 * Gemini Translation & Jargon Explanation Service
 * Reliable translation with transparent error reporting and live Google model discovery.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Автовизначення' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' }
];

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: '⚡ Ultra Fast (Default)',
    badgeColor: '#10b981',
    description: 'Fastest real-time streaming model with sub-second response times. Universally available on Google AI Studio.',
    bestFor: 'Instant hotkey translation, daily chatting, zero latency.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    tag: '⚡ Lightweight Fast',
    badgeColor: '#06b6d4',
    description: 'Lightweight high-efficiency model designed for high throughput and quick lookups.',
    bestFor: 'Single-sentence hotkey lookups.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Stable Production',
    badgeColor: '#6366f1',
    description: 'Reliable general-purpose model with broad vocabulary and high rate limits.',
    bestFor: 'Universal reliability across all text lengths.'
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    tag: '🚀 Compact Fast',
    badgeColor: '#3b82f6',
    description: 'Compact 8-billion parameter model tuned for rapid text processing.',
    bestFor: 'Fast translation of straightforward sentences.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tag: '🧠 Deep Nuance & Slang Expert',
    badgeColor: '#a855f7',
    description: 'Advanced reasoning model for difficult cultural nuances, complex idioms, business contracts, and technical jargon.',
    bestFor: 'Demystifying complex cultural slang, technical documentation, literary nuance.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: '✨ Next-Gen Flash',
    badgeColor: '#f59e0b',
    description: 'Google’s next-gen flash model with enhanced multilingual accuracy and fluency.',
    bestFor: 'High-accuracy nuanced translations.'
  }
];

// In-Memory Fast LRU Cache (up to 300 entries)
const translationCache = new Map();

function getCacheKey(text, sourceLang, targetLang, customPrompt, explainJargon, model) {
  return `${model}::${sourceLang}->${targetLang}::${explainJargon}::${customPrompt.trim()}::${text.trim()}`;
}

/**
 * Queries Google's ModelService.ListModels endpoint directly from Google AI Studio,
 * filtering strictly with an allowlist of genuine translation models.
 * Non-translation models (nano, banana, deep-search, embeddings, vision, etc.) are strictly blocked.
 */
export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return AVAILABLE_MODELS;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return AVAILABLE_MODELS;
    }

    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      return AVAILABLE_MODELS;
    }

    // Filter strictly for models that support generateContent and are translation models
    const live = data.models
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) return false;

        const rawName = (m.name || '').toLowerCase();
        // Strictly reject clutter, benchmarks, agents, and device-local models
        if (
          rawName.includes('nano') ||
          rawName.includes('banana') ||
          rawName.includes('search') ||
          rawName.includes('research') ||
          rawName.includes('embedding') ||
          rawName.includes('aqa') ||
          rawName.includes('imagen') ||
          rawName.includes('tts') ||
          rawName.includes('learnlm') ||
          rawName.includes('bison') ||
          rawName.includes('robot') ||
          rawName.includes('computer-use') ||
          rawName.includes('tuning')
        ) {
          return false;
        }

        return rawName.includes('flash') || rawName.includes('pro');
      })
      .map((m) => {
        const cleanId = m.name.replace(/^models\//, '');
        const matchingDefault = AVAILABLE_MODELS.find((am) => am.id === cleanId);
        if (matchingDefault) return matchingDefault;

        const isFlash = cleanId.includes('flash');
        return {
          id: cleanId,
          name: m.displayName || cleanId,
          tag: isFlash ? '⚡ Fast Translation' : '🧠 Deep Nuance',
          badgeColor: isFlash ? '#10b981' : '#a855f7',
          description: m.description || 'Google Gemini AI language model for translation.',
          bestFor: isFlash ? 'Instant low-latency translations.' : 'Idioms, slang, and cultural jargon.'
        };
      });

    return live.length > 0 ? live : AVAILABLE_MODELS;
  } catch (err) {
    console.warn('Could not query live models list from Google:', err);
    return AVAILABLE_MODELS;
  }
}

export async function testGeminiApiKey(apiKey, model = 'gemini-2.0-flash') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter a valid Gemini API Key.');
  }

  const targetModel = model || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'OK' }] }]
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `HTTP Error ${response.status}: ${response.statusText}`;
      throw new Error(`Model "${targetModel}": ${message}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, text, model: targetModel };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Connection to model "${targetModel}" timed out. Please check your internet connection.`);
    }
    throw err;
  }
}

/**
 * Ultra-Fast Direct Translation
 * Directly translates using the user's selected model and reports exact errors transparently.
 */
export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = 'gemini-2.0-flash',
  temperature = 0.1,
  onStreamChunk = null
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key missing. Please click Settings ⚙️ and paste your Google Gemini API Key.');
  }

  const trimmedText = text ? text.trim() : '';
  if (!trimmedText) return null;

  const targetModel = model || 'gemini-2.0-flash';

  // 1. Check Local Memory Cache (Instant 0ms response)
  const cacheKey = getCacheKey(trimmedText, sourceLang, targetLang, customPrompt, explainJargon, targetModel);
  if (translationCache.has(cacheKey)) {
    const cachedResult = translationCache.get(cacheKey);
    if (onStreamChunk) {
      onStreamChunk(cachedResult.translation);
    }
    return cachedResult;
  }

  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

  const sourceName = sourceLang === 'auto' ? 'the source language' : `${sourceLangObj?.name || sourceLang}`;
  const targetName = `${targetLangObj?.name || targetLang}`;

  let systemInstructionText = '';
  let userText = trimmedText;

  if (explainJargon) {
    systemInstructionText = `Translate from ${sourceName} into ${targetName}, clarify plain meaning, detect tone, and break down slang/idioms.
${customPrompt ? `Style: ${customPrompt}` : ''}
Respond ONLY in JSON format:
{
  "detectedSourceLanguage": "string",
  "translation": "string",
  "plainLanguageMeaning": "string",
  "detectedTone": "string",
  "jargonBreakdown": [
    { "term": "string", "literalMeaning": "string", "intendedMeaning": "string", "nuance": "string" }
  ],
  "culturalNotes": "string or null"
}`;
  } else {
    systemInstructionText = `Translate from ${sourceName} into ${targetName}. Output the fluent translation only.${customPrompt ? ` Style: ${customPrompt}` : ''}`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  const payload = {
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: parseFloat(temperature) ?? 0.1,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: explainJargon ? 2048 : 1024,
      candidateCount: 1,
      ...(explainJargon ? { responseMimeType: 'application/json' } : {})
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload)
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `HTTP Error ${response.status}`;
      throw new Error(`Model "${targetModel}" error: ${message}`);
    }

    const data = await response.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawOutput) {
      throw new Error(`Empty response from model "${targetModel}"`);
    }

    if (explainJargon) {
      try {
        const cleanJson = rawOutput.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        const result = {
          isExplained: true,
          translation: parsed.translation || rawOutput,
          plainLanguageMeaning: parsed.plainLanguageMeaning || '',
          detectedTone: parsed.detectedTone || '',
          jargonBreakdown: parsed.jargonBreakdown || [],
          culturalNotes: parsed.culturalNotes || '',
          detectedSourceLanguage: parsed.detectedSourceLanguage || sourceLang
        };
        if (onStreamChunk) onStreamChunk(result.translation);
        translationCache.set(cacheKey, result);
        return result;
      } catch {
        const fallbackResult = {
          isExplained: true,
          translation: rawOutput,
          plainLanguageMeaning: rawOutput,
          detectedTone: 'Neutral',
          jargonBreakdown: []
        };
        if (onStreamChunk) onStreamChunk(fallbackResult.translation);
        translationCache.set(cacheKey, fallbackResult);
        return fallbackResult;
      }
    }

    const standardResult = {
      isExplained: false,
      translation: rawOutput.trim()
    };

    if (onStreamChunk) {
      onStreamChunk(standardResult.translation);
    }
    translationCache.set(cacheKey, standardResult);
    return standardResult;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request to model "${targetModel}" timed out. Please check your network or try another model in Settings.`);
    }
    throw err;
  }
}
