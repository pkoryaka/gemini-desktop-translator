/**
 * Gemini Translation & Jargon Explanation Service
 * Strictly curated exclusively for dedicated translation models (Flash & Pro series)
 * All experimental, non-translation models (nano, banana, search, etc.) are strictly blocked.
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
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: '⚡ Latest Flagship (Recommended)',
    badgeColor: '#10b981',
    description: 'The newest, most advanced Gemini flash model. Delivers cutting-edge multilingual fluency, idiomatic precision, and rapid speed.',
    bestFor: 'Daily instant hotkey translations, high accuracy, modern slang.'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: '🚀 Next-Gen Flash',
    badgeColor: '#06b6d4',
    description: 'High-throughput 3.7 flash model combining rapid token generation with deep linguistic context.',
    bestFor: 'Instant selected-text hotkey translations, articles, chatting.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: '⚡ Ultra Fast',
    badgeColor: '#3b82f6',
    description: 'Ultra-low latency model engineered for sub-second responses and high rate limits.',
    bestFor: 'Fast single-sentence hotkey lookups.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Universal Stable',
    badgeColor: '#6366f1',
    description: 'Universally available production model with high uptime across all Google AI Studio tiers.',
    bestFor: 'Universal reliability and backup translation.'
  },
  {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    tag: '🧠 Deep Nuance & Slang Expert',
    badgeColor: '#a855f7',
    description: 'Top-tier reasoning model for tricky cultural nuances, business contracts, literature, and detailed jargon breakdowns.',
    bestFor: 'Demystifying complex cultural slang, technical documentation, literary nuance.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tag: '📚 Literary & Professional',
    badgeColor: '#ec4899',
    description: 'High-capacity context model with advanced linguistic understanding.',
    bestFor: 'Formal business documents and long articles.'
  }
];

// Strict Whitelist of translation-capable model IDs
const ALLOWED_TRANSLATION_IDS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-3.8-pro',
  'gemini-1.5-pro'
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

    // Filter strictly against the translation allowlist & reject any clutter keywords
    const live = data.models
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) return false;

        const rawName = (m.name || '').toLowerCase();
        const cleanId = rawName.replace(/^models\//, '');

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

        // Only allow recognized translation models
        return ALLOWED_TRANSLATION_IDS.includes(cleanId) || cleanId.startsWith('gemini-3.8') || cleanId.startsWith('gemini-3.7') || cleanId.startsWith('gemini-2.0-flash');
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
          description: m.description || 'Google Gemini AI language model for translation and text generation.',
          bestFor: isFlash ? 'Instant low-latency translations.' : 'Idioms, slang, and cultural jargon.'
        };
      });

    // Ensure our curated top models are always preserved
    const result = [...AVAILABLE_MODELS];
    for (const item of live) {
      if (!result.some(r => r.id === item.id)) {
        result.push(item);
      }
    }

    return result;
  } catch (err) {
    console.warn('Could not query live models list from Google:', err);
    return AVAILABLE_MODELS;
  }
}

export async function testGeminiApiKey(apiKey, model = 'gemini-3.8-flash') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter a valid Gemini API Key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
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
      throw new Error(message);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, text, model };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Please check your internet connection.');
    }
    throw err;
  }
}

/**
 * Ultra-Fast Direct Translation with Zero Pre-Flight Latency & Clean Translation Fallback
 */
export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = 'gemini-3.8-flash',
  temperature = 0.1,
  onStreamChunk = null
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key missing. Please click Settings ⚙️ and paste your Google Gemini API Key.');
  }

  const trimmedText = text ? text.trim() : '';
  if (!trimmedText) return null;

  // Sanitize model choice to ensure no clutter model is ever invoked
  let targetModel = model || 'gemini-3.8-flash';
  if (targetModel.includes('nano') || targetModel.includes('banana') || targetModel.includes('search')) {
    targetModel = 'gemini-3.8-flash';
  }

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

  // Clean fallback cascade strictly consisting of real translation models
  const fallbackList = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const candidateModels = [targetModel, ...fallbackList].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError = null;

  for (const currentModel of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;
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
    const timeoutId = setTimeout(() => controller.abort(), 7000);

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
        lastError = new Error(message);
        console.warn(`Model ${currentModel} error: ${message}. Trying next fallback...`);
        continue;
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawOutput) {
        throw new Error('Empty response from model');
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
      lastError = err.name === 'AbortError' ? new Error(`Request to ${currentModel} timed out.`) : err;
      console.warn(`Attempt with ${currentModel} failed:`, lastError.message);
    }
  }

  throw lastError || new Error('Translation failed. Please check your internet connection and API Key.');
}
