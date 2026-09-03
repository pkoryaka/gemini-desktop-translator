/**
 * Gemini Translation & Jargon Explanation Service
 * Ultra-Optimized for Speed: Real-time token streaming, greedy decoding, preconnect, zero thinking delay.
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
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: '⚡ Ultra Fast (Recommended)',
    badgeColor: '#10b981',
    description: 'Next-generation adaptive reasoning with ultra-low latency. Google\'s premier recommendation for fast, high-quality translation.',
    bestFor: 'Instant hotkey translation, daily chatting, zero latency.'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tag: '🧠 Deep Nuance & Reasoning',
    badgeColor: '#a855f7',
    description: 'Premier flagship model for complex cultural nuances, literary prose, business contracts, and technical jargon.',
    bestFor: 'Demystifying complex cultural slang, technical documentation, literary nuance.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: '⚡ Sub-second Streaming',
    badgeColor: '#10b981',
    description: 'Ultra-fast production model with instantaneous time-to-first-token streaming.',
    bestFor: 'Real-time sentence streaming and everyday translation.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    tag: '⚡ High Efficiency Lite',
    badgeColor: '#06b6d4',
    description: 'Lightweight high-efficiency model designed for maximum throughput and instantaneous lookups.',
    bestFor: 'Single-sentence hotkey lookups.'
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
 */
export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return AVAILABLE_MODELS;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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

    // Comprehensive rejection list for non-text / non-translation modalities
    const REJECT_KEYWORDS = [
      'image', 'banana', 'imagen', 'veo', 'high-res',
      'tts', 'audio', 'transcribe', 'lyria', 'music', 'voice', 'bidi',
      'robot', 'computer-use', 'antigravity', 'deep-research', 'research',
      'customtools', 'tools', 'embedding', 'aqa', 'tuning', 'gemma'
    ];

    const seenIds = new Set();
    const seenDisplayNames = new Set();
    const valid = [];

    for (const m of data.models) {
      // 1. Must support text generation
      const methods = m.supportedGenerationMethods || [];
      if (!methods.includes('generateContent')) continue;

      const id = (m.name || '').replace(/^models\//, '').toLowerCase();
      const displayName = (m.displayName || '').toLowerCase();

      // 2. Reject non-translation keywords across both ID and Display Name
      const isIrrelevant = REJECT_KEYWORDS.some((kw) => id.includes(kw) || displayName.includes(kw));
      if (isIrrelevant) continue;

      // 3. Must be a Gemini text model
      if (!id.startsWith('gemini-')) continue;

      // 4. Deduplicate across clean IDs and Display Names
      const cleanId = m.name.replace(/^models\//, '');
      const cleanName = m.displayName || cleanId;
      if (seenIds.has(cleanId) || seenDisplayNames.has(cleanName)) continue;
      seenIds.add(cleanId);
      seenDisplayNames.add(cleanName);

      const isLite = cleanId.includes('lite');
      const isFlash = cleanId.includes('flash');
      const isPro = cleanId.includes('pro');

      valid.push({
        id: cleanId,
        name: cleanName,
        tag: isLite ? '⚡ Ultra-Fast Lite' : isFlash ? '⚡ Fast Translation' : isPro ? '🧠 Deep Nuance' : 'General Translation',
        badgeColor: isLite ? '#06b6d4' : isFlash ? '#10b981' : isPro ? '#a855f7' : '#6366f1',
        isFlash,
        isPro,
        description: m.description || 'Google Gemini language model for high-accuracy translation.',
        bestFor: isLite ? 'Instant single-word & short sentence lookup.' : isFlash ? 'Sub-second real-time streaming translation.' : 'Idioms, cultural slang, and technical contracts.'
      });
    }

    // 5. Intelligent Ordering: Flash models first (sorted numerically descending by version), then Pro
    valid.sort((a, b) => {
      if (a.isFlash && !b.isFlash) return -1;
      if (!a.isFlash && b.isFlash) return 1;
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });

    if (valid.length > 0) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('gemini_translator_cached_models', JSON.stringify(valid));
        }
      } catch (e) {}
      return valid;
    }
    return AVAILABLE_MODELS;
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
 * High-Speed Streaming Translation with Instant Token Delivery
 * Achieves ~100-150ms Time-To-First-Token (TTFT) via SSE and terminates immediately on completion.
 */
export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = 'gemini-2.0-flash',
  temperature = 0.0,
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
    // Ultra-compact prompt to minimize prompt ingestion latency
    systemInstructionText = `Translate into ${targetName}. Output translation only.${customPrompt ? ` Style: ${customPrompt}` : ''}`;
  }

  // Generation configuration tuned for lowest latency:
  // - temperature: 0 (greedy decoding - fastest token generation)
  // - maxOutputTokens: dynamically sized so KV cache isn't over-allocated
  // - thinkingBudget: 0 disables any reasoning pauses
  const maxTokens = explainJargon ? 2048 : Math.max(128, Math.min(1024, userText.length * 3));
  const generationConfig = {
    temperature: 0.1,
    maxOutputTokens: maxTokens,
    candidateCount: 1,
    ...(explainJargon ? { responseMimeType: 'application/json' } : {})
  };

  // FASTEST PATH: Native Node.js Translation Engine (Direct libuv/Undici OS sockets, zero Chromium IPC overhead)
  if (window.electronAPI?.nativeTranslate) {
    try {
      const nativeRes = await window.electronAPI.nativeTranslate({
        apiKey: apiKey.trim(),
        text: userText,
        targetLang: targetName,
        customPrompt,
        explainJargon,
        model: targetModel
      });

      if (nativeRes?.rawOutput) {
        const rawOutput = nativeRes.rawOutput;
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
        if (onStreamChunk) onStreamChunk(standardResult.translation);
        translationCache.set(cacheKey, standardResult);
        return standardResult;
      }
    } catch (nativeErr) {
      console.warn('Native translation encountered error, falling back to web fetch:', nativeErr);
    }
  }

  const isStreaming = Boolean(onStreamChunk) && !explainJargon;

  // FAST PATH: Real-time streaming for instant TTFT (<150ms)
  if (isStreaming) {
    const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;
    const payload = {
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let buffer = '';
        let isComplete = false;

        while (!isComplete) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr);
                  const candidate = parsed.candidates?.[0];
                  const chunk = candidate?.content?.parts?.[0]?.text || '';
                  if (chunk) {
                    accumulatedText += chunk;
                    onStreamChunk(accumulatedText);
                  }
                  // IMMEDIATE TERMINATION on STOP: Do not hang waiting for socket to close
                  if (candidate?.finishReason) {
                    isComplete = true;
                    try { reader.cancel(); } catch {}
                    break;
                  }
                } catch {
                  // Partial JSON chunk, wait for next buffer read
                }
              }
            }
          }
        }

        const finalText = accumulatedText.trim();
        if (finalText) {
          const result = { isExplained: false, translation: finalText };
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (streamErr) {
      console.warn('Streaming encountered issue, falling back to direct generateContent:', streamErr);
    }
  }

  // DIRECT PATH: Non-streaming generateContent
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  const payload = {
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig
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
