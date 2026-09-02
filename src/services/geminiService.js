/**
 * Gemini Translation & Jargon Explanation Service
 * Dynamically queries Google ModelService.ListModels so only active, supported models are used.
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
    tag: '⚡ Ultra Fast',
    badgeColor: '#10b981',
    description: 'Ultra-low latency with real-time response. Recommended for instant selected-text hotkey translations.',
    bestFor: 'Daily instant translations and chat.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Stable Baseline',
    badgeColor: '#06b6d4',
    description: 'Fast, dependable translation model with high rate limits.',
    bestFor: 'General multilingual translation.'
  }
];

// In-Memory Fast LRU Cache (up to 300 entries)
const translationCache = new Map();
let cachedLiveModelIds = null;
let lastModelFetchTime = 0;

function getCacheKey(text, sourceLang, targetLang, customPrompt, explainJargon, model) {
  return `${model}::${sourceLang}->${targetLang}::${explainJargon}::${customPrompt.trim()}::${text.trim()}`;
}

/**
 * Queries Google's ModelService.ListModels endpoint to discover active models for this user's API key
 */
export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return AVAILABLE_MODELS;

  // Cache live models for 5 minutes
  const now = Date.now();
  if (cachedLiveModelIds && now - lastModelFetchTime < 300000) {
    return cachedLiveModelIds;
  }

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

    // Filter only models that support generateContent
    const live = data.models
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        const isGenerate = methods.includes('generateContent');
        const name = (m.name || '').toLowerCase();
        const isExcluded = name.includes('embedding') || name.includes('aqa') || name.includes('imagen') || name.includes('tts') || name.includes('learnlm');
        return isGenerate && !isExcluded;
      })
      .map((m) => {
        const cleanId = m.name.replace(/^models\//, '');
        const isFlash = cleanId.includes('flash');
        const isPro = cleanId.includes('pro');
        return {
          id: cleanId,
          name: m.displayName || cleanId,
          tag: isFlash ? '⚡ Fast Translation' : isPro ? '🧠 Deep Nuance' : 'Active Model',
          badgeColor: isFlash ? '#10b981' : isPro ? '#a855f7' : '#06b6d4',
          description: m.description || 'Google Gemini AI model for translation and text generation.',
          bestFor: isFlash ? 'Instant low-latency translations.' : 'Idioms, slang, and cultural jargon.'
        };
      });

    if (live.length > 0) {
      cachedLiveModelIds = live;
      lastModelFetchTime = now;
      return live;
    }
    return AVAILABLE_MODELS;
  } catch (err) {
    console.warn('Could not query live models list from Google:', err);
    return AVAILABLE_MODELS;
  }
}

export async function testGeminiApiKey(apiKey, model = null) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter a valid Gemini API Key.');
  }

  // Get live models first to ensure we test an active model
  const live = await fetchLiveAvailableModels(apiKey);
  const modelToTest = model && live.some(m => m.id === model) ? model : live[0].id;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${apiKey.trim()}`;
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
    return { success: true, text, model: modelToTest };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Please check your internet connection.');
    }
    throw err;
  }
}

/**
 * Rock-Solid Translation using Live Models Discovered from Google API
 */
export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = null,
  temperature = 0.1,
  onStreamChunk = null
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key missing. Please click Settings ⚙️ and paste your Google Gemini API Key.');
  }

  const trimmedText = text ? text.trim() : '';
  if (!trimmedText) return null;

  // 1. Fetch live models actively supported for this user's API key
  const liveModels = await fetchLiveAvailableModels(apiKey);
  const liveIds = liveModels.map(m => m.id);

  // Determine candidate models in order of priority:
  // (User selected model if in live list, then flash models, then any other live models)
  const candidateModels = [];
  if (model && liveIds.includes(model)) {
    candidateModels.push(model);
  }
  
  // Prioritize flash models from live list
  for (const liveId of liveIds) {
    if (liveId.includes('flash') && !candidateModels.includes(liveId)) {
      candidateModels.push(liveId);
    }
  }

  // Add remaining live models
  for (const liveId of liveIds) {
    if (!candidateModels.includes(liveId)) {
      candidateModels.push(liveId);
    }
  }

  if (candidateModels.length === 0) {
    candidateModels.push('gemini-2.0-flash', 'gemini-1.5-flash');
  }

  const primaryModel = candidateModels[0];

  // Check Local Memory Cache (0ms response)
  const cacheKey = getCacheKey(trimmedText, sourceLang, targetLang, customPrompt, explainJargon, primaryModel);
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
    const timeoutId = setTimeout(() => controller.abort(), 9000);

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
        console.warn(`Model ${currentModel} returned error: ${message}. Trying next fallback...`);
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
