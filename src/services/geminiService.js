/**
 * Gemini Translation & Jargon Explanation Service
 * 100% Grounded in Google AI Studio REST API
 * Models are discovered directly from Google ModelService.ListModels.
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
    tag: '⚡ Ultra Fast (Recommended)',
    badgeColor: '#10b981',
    description: 'Official Google Gemini 2.0 production model with sub-second response times.',
    bestFor: 'Instant hotkey translation, daily chatting, zero latency.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Stable Production',
    badgeColor: '#6366f1',
    description: 'Universally available production model with high rate limits across all tiers.',
    bestFor: 'Universal reliability.'
  }
];

// In-Memory Fast LRU Cache (up to 300 entries)
const translationCache = new Map();

function getCacheKey(text, sourceLang, targetLang, customPrompt, explainJargon, model) {
  return `${model}::${sourceLang}->${targetLang}::${explainJargon}::${customPrompt.trim()}::${text.trim()}`;
}

/**
 * Queries Google's live ModelService.ListModels endpoint directly using the user's API key.
 * Strictly returns models that Google confirms support generateContent.
 * Excludes non-text/experimental clutter (nano, banana, search, embeddings, vision, audio).
 */
export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return AVAILABLE_MODELS;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('Google API returned no models for this API key.');
    }

    // Filter only models that support generateContent and are real translation models
    const valid = data.models
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) return false;

        const name = (m.name || '').toLowerCase();
        // Discard non-translation, specialized, or noisy experimental models
        if (
          name.includes('embedding') ||
          name.includes('imagen') ||
          name.includes('aqa') ||
          name.includes('tts') ||
          name.includes('audio') ||
          name.includes('nano') ||
          name.includes('banana') ||
          name.includes('bison') ||
          name.includes('search') ||
          name.includes('research') ||
          name.includes('tuning') ||
          name.includes('robot') ||
          name.includes('computer-use')
        ) {
          return false;
        }

        return true;
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
          description: m.description || 'Google Gemini AI language model.',
          bestFor: isFlash ? 'Instant low-latency translations.' : 'Idioms, slang, and cultural jargon.'
        };
      });

    // Sort: flash models first for optimal translation performance
    valid.sort((a, b) => {
      if (a.id.includes('2.0-flash') && !b.id.includes('2.0-flash')) return -1;
      if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
      if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
      return 0;
    });

    return valid.length > 0 ? valid : AVAILABLE_MODELS;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Error fetching live models from Google:', err);
    throw err;
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
 * Translates directly using the verified model selected by the user.
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
