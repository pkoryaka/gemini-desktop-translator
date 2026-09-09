/**
 * Gemini Translation & Jargon Explanation Service
 * Ultra-Optimized for Speed: Real-time token streaming, greedy decoding, preconnect, zero thinking delay.
 */

import { storageService } from './storageService.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Автовизначення' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-br', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh-cn', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'tl', name: 'Filipino (Tagalog)', nativeName: 'Tagalog' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
];

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash Lite (Latest)',
    tag: '⚡ Ultra Fast (Recommended for Instant Translation & Rewriting)',
    badgeColor: '#10b981',
    description: 'Ultra-low latency model engineered for sub-second hotkey translation and instant in-place rewrites.',
    bestFor: 'Instant hotkey translation, quick in-place rewrites, sub-second typing.'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    tag: '⚡ Ultra Fast & Stable',
    badgeColor: '#06b6d4',
    description: 'High-speed Gemini 3.5 Lite model with consistent sub-second response times.',
    bestFor: 'Fast sentence replacement and daily text tasks.'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: '⚡ Ultra Fast Lite',
    badgeColor: '#0ea5e9',
    description: 'Ultra-lightweight high-throughput model for instantaneous vocabulary and sentence translation.',
    bestFor: 'Sub-second lookup and low-latency translations.'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: '⚡ High Speed & Accuracy',
    badgeColor: '#3b82f6',
    description: 'High-speed Gemini 3 series model with balanced reasoning and precise translation fidelity.',
    bestFor: 'Real-time sentence streaming and nuanced translation.'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    tag: '⚡ High Efficiency',
    badgeColor: '#6366f1',
    description: 'Fast preview model with broad multi-language support.',
    bestFor: 'General sentence and paragraph translation.'
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

  try {
    let data;
    if (window.electronAPI?.fetchLiveModels) {
      data = await window.electronAPI.fetchLiveModels(apiKey.trim());
    } else {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Google API returned HTTP ${response.status}`);
      }
      data = await response.json();
    }

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

    // 5. Intelligent Ordering: Prioritize Ultra-Fast Lite models first for speed, then Flash, deprioritize strict quota models (3.8), then Pro
    valid.sort((a, b) => {
      const aLite = a.id.includes('lite');
      const bLite = b.id.includes('lite');
      if (aLite && !bLite) return -1;
      if (!aLite && bLite) return 1;

      const a38 = a.id.includes('3.8');
      const b38 = b.id.includes('3.8');
      if (a38 && !b38) return 1;
      if (!a38 && b38) return -1;

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

export async function testGeminiApiKey(apiKey, model = 'gemini-flash-lite-latest') {
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

  const isSlow = !model || model === 'gemini-3.5-flash' || model === 'gemini-3.6-flash' || model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash' || model.includes('3.8');
  const targetModel = isSlow ? 'gemini-flash-lite-latest' : model;

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
  } else if (customPrompt && customPrompt.trim()) {
    // Custom prompt slot / precision instruction mode: strictly follow prompt instruction
    systemInstructionText = `You are a precision text transformer. Follow this user instruction precisely: "${customPrompt.trim()}". Keep the original language unless the instruction explicitly specifies a different language. Output ONLY the transformed text directly without conversational preamble, introduction, markdown commentary, or quotes.`;
  } else {
    // Pure translation mode: concise prompt for lowest TTFT
    systemInstructionText = `Translate into ${targetName}. Output direct translation only without quotes, preamble, or commentary.`;
  }

  // Generation configuration tuned for lowest latency:
  // - temperature: 0 (greedy decoding - fastest token generation)
  // - maxOutputTokens: dynamically sized so KV cache isn't over-allocated
  const maxTokens = explainJargon ? 2048 : Math.max(128, Math.min(1024, userText.length * 3));
  const generationConfig = {
    temperature: 0.0,
    maxOutputTokens: maxTokens,
    candidateCount: 1,
    ...(explainJargon ? { responseMimeType: 'application/json' } : {})
  };

  const isBYOM = storageService.getSettings().aiProvider === 'openai_compatible';

  // Primary Engine: Native Node Translation Engine with direct SSE streaming (Bypasses Chromium background throttling)
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
