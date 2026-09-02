/**
 * Gemini Translation & Jargon Explanation Service (High-Speed Streaming & Automatic Fallback)
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
    description: 'Blazing fast real-time token streaming with lowest latency. Recommended for instant hotkey translation.',
    bestFor: 'Instant hotkey translation, zero-lag daily chatting, high rate limits.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '📦 Universal Stable',
    badgeColor: '#06b6d4',
    description: 'Broadly available, ultra-reliable translation model with high speed.',
    bestFor: 'Universal reliability, fast multilingual translation.'
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: '⚡ Next-Gen Flash',
    badgeColor: '#3b82f6',
    description: 'Latest high-throughput model with enhanced reasoning and high context retention.',
    bestFor: 'Long text translation, articles, complex sentence structures.'
  },
  {
    id: 'gemini-3.6-pro',
    name: 'Gemini 3.6 Pro',
    tag: '🧠 Deep Nuance & Slang Expert',
    badgeColor: '#a855f7',
    description: 'Advanced reasoning model. Excels at complex idioms, literary context, technical documents, and in-depth cultural jargon explanations.',
    bestFor: 'Demystifying complex slang, professional/diplomatic correspondence, literary texts.'
  }
];

// In-Memory Fast LRU Cache (up to 300 entries)
const translationCache = new Map();

function getCacheKey(text, sourceLang, targetLang, customPrompt, explainJargon, model) {
  return `${model}::${sourceLang}->${targetLang}::${explainJargon}::${customPrompt.trim()}::${text.trim()}`;
}

export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return AVAILABLE_MODELS;
  return AVAILABLE_MODELS;
}

export async function testGeminiApiKey(apiKey, model = 'gemini-2.0-flash') {
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
 * Fast Streaming Translation with Automatic Model Fallback
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

  // 1. Check Local Memory Cache (0ms response)
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

  const candidateModels = [model, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );

  let lastError = null;

  for (const currentModel of candidateModels) {
    const isStreaming = Boolean(onStreamChunk) && !explainJargon;
    const endpoint = isStreaming
      ? `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

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
        temperature: parseFloat(temperature) ?? 0.1,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: explainJargon ? 2048 : 1024,
        candidateCount: 1,
        ...(explainJargon ? { responseMimeType: 'application/json' } : {})
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `HTTP Error ${response.status}`;
        lastError = new Error(message);
        console.warn(`Model ${currentModel} failed: ${message}. Trying next fallback...`);
        continue;
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
          buffer = lines.pop() || '';

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
              } catch {
                // Incomplete chunk
              }
            }
          }
        }

        const finalResult = {
          isExplained: false,
          translation: accumulatedText.trim()
        };

        if (finalResult.translation) {
          translationCache.set(cacheKey, finalResult);
          if (translationCache.size > 300) {
            const firstKey = translationCache.keys().next().value;
            translationCache.delete(firstKey);
          }
        }

        return finalResult;
      }

      // Non-streaming mode
      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
          translationCache.set(cacheKey, fallbackResult);
          return fallbackResult;
        }
      }

      const standardResult = {
        isExplained: false,
        translation: rawOutput.trim()
      };
      translationCache.set(cacheKey, standardResult);
      return standardResult;
    } catch (err) {
      lastError = err;
      console.warn(`Attempt with ${currentModel} encountered error:`, err);
    }
  }

  throw lastError || new Error('All model translation attempts failed. Please verify your internet connection and API Key.');
}
