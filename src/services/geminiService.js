/**
 * Gemini Translation & Jargon Explanation Service (High-Speed Streaming & Caching)
 * Curated for models that excel specifically at multilingual translation.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Автовизначення' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' }
];

/**
 * Curated list of Gemini models verified for translation & jargon explanation
 */
export const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: '⚡ Ultra Fast (Recommended)',
    badgeColor: '#10b981',
    description: 'Fastest response time with real-time token streaming. Ideal for daily translation, rapid chat, and global hotkey usage.',
    bestFor: 'Daily communication, instant selected-text hotkey, high free-tier rate limits.'
  },
  {
    id: 'gemini-3.6-pro',
    name: 'Gemini 3.6 Pro',
    tag: '🧠 Deep Nuance & Slang Expert',
    badgeColor: '#a855f7',
    description: 'Advanced reasoning model. Excels at complex idioms, literary context, technical documents, and in-depth cultural jargon explanations.',
    bestFor: 'Demystifying complex slang, professional/diplomatic correspondence, literary texts.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: '🔄 Fast Multilingual Fallback',
    badgeColor: '#06b6d4',
    description: 'High-throughput generation model with strong multilingual vocabulary across Ukrainian, Russian, Spanish, and English.',
    bestFor: 'General translation, bulk text, reliable fallback.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Stable Legacy',
    badgeColor: '#64748b',
    description: 'Legacy baseline model. Stable and lightweight for standard dictionary translation.',
    bestFor: 'Legacy compatibility and lightweight translation.'
  }
];

// In-Memory Fast LRU Cache (up to 200 entries)
const translationCache = new Map();

function getCacheKey(text, sourceLang, targetLang, customPrompt, explainJargon, model) {
  return `${model}::${sourceLang}->${targetLang}::${explainJargon}::${customPrompt.trim()}::${text.trim()}`;
}

export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return AVAILABLE_MODELS;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const response = await fetch(endpoint);
    if (!response.ok) return AVAILABLE_MODELS;

    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      // Filter strictly to generative text/multimodal models suitable for translation (excluding embedding, imagen, aqa, etc.)
      const translationEligible = data.models.filter((m) => {
        const id = m.name.toLowerCase();
        return (
          m.supportedGenerationMethods?.includes('generateContent') &&
          !id.includes('embedding') &&
          !id.includes('imagen') &&
          !id.includes('aqa') &&
          !id.includes('text-bison') &&
          (id.includes('flash') || id.includes('pro'))
        );
      });

      if (translationEligible.length > 0) {
        return AVAILABLE_MODELS; // Keep the curated, richly annotated list prioritized
      }
    }
  } catch (err) {
    console.warn('Could not fetch live models, using defaults:', err);
  }

  return AVAILABLE_MODELS;
}

export async function testGeminiApiKey(apiKey, model = 'gemini-3.6-flash') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter a valid Gemini API Key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'OK' }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP Error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { success: true, text };
}

/**
 * Fast Streaming Translation
 */
export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = 'gemini-3.6-flash',
  temperature = 0.2,
  onStreamChunk = null
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key is missing. Please set your Gemini API Key in Settings.');
  }

  const trimmedText = text ? text.trim() : '';
  if (!trimmedText) return null;

  // 1. Check Local Memory Cache
  const cacheKey = getCacheKey(trimmedText, sourceLang, targetLang, customPrompt, explainJargon, model);
  if (translationCache.has(cacheKey)) {
    const cachedResult = translationCache.get(cacheKey);
    if (onStreamChunk) {
      onStreamChunk(cachedResult.translation);
    }
    return cachedResult;
  }

  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

  const sourceName = sourceLang === 'auto' ? 'the source language (auto-detect)' : `${sourceLangObj?.name || sourceLang}`;
  const targetName = `${targetLangObj?.name || targetLang}`;

  let systemInstructionText = '';
  let userText = trimmedText;

  if (explainJargon) {
    systemInstructionText = `You are a world-class polyglot translator and cultural communication expert for Ukrainian, Russian, Spanish, and English.
Task:
1. Translate from ${sourceName} into ${targetName}.
2. Explain clearly in plain, simple everyday language what the speaker meant.
3. Identify any slang, idioms, or technical terms with literal vs intended meaning.
4. Detect the tone.
${customPrompt ? `Style Instruction: "${customPrompt}"` : ''}

Respond ONLY with this JSON schema (no markdown formatting, no code blocks):
{
  "detectedSourceLanguage": "string",
  "translation": "string",
  "plainLanguageMeaning": "string",
  "detectedTone": "string",
  "jargonBreakdown": [
    {
      "term": "string",
      "literalMeaning": "string",
      "intendedMeaning": "string",
      "nuance": "string"
    }
  ],
  "culturalNotes": "string or null"
}`;
  } else {
    systemInstructionText = `You are an ultra-fast professional translator. Translate from ${sourceName} into ${targetName}.
Deliver ONLY the translation. No quotes, no markdown fences, no preamble, no explanations.
${customPrompt ? `Style: "${customPrompt}"` : 'Deliver fluent, natural native phrasing.'}`;
  }

  // Use Server-Sent Events (SSE) streaming endpoint for instantaneous token delivery
  const isStreaming = Boolean(onStreamChunk) && !explainJargon;
  const endpoint = isStreaming
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }]
      }
    ],
    generationConfig: {
      temperature: parseFloat(temperature) || 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: explainJargon ? 2048 : 1024,
      candidateCount: 1,
      ...(explainJargon ? { responseMimeType: 'application/json' } : {})
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Translation error (${response.status})`;
    throw new Error(message);
  }

  // Handle Streaming Responses
  if (isStreaming && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep remainder in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              const parsed = JSON.parse(jsonStr);
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunk) {
                accumulatedText += chunk;
                onStreamChunk(accumulatedText);
              }
            }
          } catch (e) {
            // Partial JSON chunk, continue
          }
        }
      }
    }

    const finalResult = {
      isExplained: false,
      translation: accumulatedText.trim()
    };

    // Cache the result
    if (translationCache.size > 200) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, finalResult);

    return finalResult;
  }

  // Non-streaming / Jargon Mode
  const data = await response.json();
  const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let finalResult;
  if (explainJargon) {
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      finalResult = {
        isExplained: true,
        translation: parsed.translation || '',
        plainLanguageMeaning: parsed.plainLanguageMeaning || '',
        detectedTone: parsed.detectedTone || '',
        jargonBreakdown: parsed.jargonBreakdown || [],
        culturalNotes: parsed.culturalNotes || '',
        detectedSourceLanguage: parsed.detectedSourceLanguage || ''
      };
    } catch {
      finalResult = {
        isExplained: true,
        translation: rawResponse.trim(),
        plainLanguageMeaning: 'Could not structure JSON breakdown automatically.',
        detectedTone: 'Unknown',
        jargonBreakdown: [],
        culturalNotes: ''
      };
    }
  } else {
    finalResult = {
      isExplained: false,
      translation: rawResponse.trim()
    };
  }

  // Cache result
  if (translationCache.size > 200) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(cacheKey, finalResult);

  return finalResult;
}
