/**
 * Gemini Translation & Jargon Explanation Service
 * Uses Google Gemini API (supporting latest Gemini models like gemini-3.6-flash / gemini-2.0-flash)
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Автовизначення' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' }
];

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Latest & Recommended)', freeTier: true },
  { id: 'gemini-3.6-pro', name: 'Gemini 3.6 Pro (Advanced Reasoning)', freeTier: true },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fast)', freeTier: true },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)', freeTier: true }
];

/**
 * Dynamically fetches all live supported models directly from Google Gemini API
 */
export async function fetchLiveAvailableModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return AVAILABLE_MODELS;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const response = await fetch(endpoint);
    if (!response.ok) return AVAILABLE_MODELS;

    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      const activeModels = data.models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: `${m.displayName || id} (${id})`,
            freeTier: true
          };
        });

      return activeModels.length > 0 ? activeModels : AVAILABLE_MODELS;
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
      contents: [{ parts: [{ text: 'Respond with "OK" if connection is successful.' }] }]
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

export async function translateText({
  apiKey,
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  customPrompt = '',
  explainJargon = false,
  model = 'gemini-3.6-flash',
  temperature = 0.3
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key is missing. Please set your Gemini API Key in Settings.');
  }

  if (!text || !text.trim()) {
    return null;
  }

  const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

  const sourceName = sourceLang === 'auto' ? 'the source language (auto-detect)' : `${sourceLangObj?.name || sourceLang} (${sourceLangObj?.nativeName || ''})`;
  const targetName = `${targetLangObj?.name || targetLang} (${targetLangObj?.nativeName || ''})`;

  let systemPrompt = '';
  let userPrompt = '';

  if (explainJargon) {
    systemPrompt = `You are a world-class polyglot translator and cultural communication expert specializing in Ukrainian, Russian, Spanish, and English.
Your task is to:
1. Translate the provided text from ${sourceName} into ${targetName}.
2. Accurately explain what the person meant in simple, plain, everyday language (demystify complex jargon, corporate speak, slang, idioms, proverbs, or emotional subtext).
3. Identify specific slang, idioms, acronyms, or technical jargon, providing their literal vs. intended meaning.
4. Detect the tone of the message (e.g., Casual, Sarcastic, Urgent, Warm, Formal, Passive-Aggressive).
5. Add any brief cultural or context notes if relevant.

${customPrompt ? `ADDITIONAL TRANSLATION INSTRUCTION: "${customPrompt}"` : ''}

You MUST respond strictly with a valid, clean JSON object in this exact schema (no markdown fences, no preamble):
{
  "detectedSourceLanguage": "string (e.g. Ukrainian)",
  "translation": "string (the primary high-quality translation)",
  "plainLanguageMeaning": "string (1-3 sentences explaining in simple words what the speaker really meant)",
  "detectedTone": "string (e.g. Friendly & Casual, Frustrated, Bureaucratic)",
  "jargonBreakdown": [
    {
      "term": "the exact word/idiom/slang from the source",
      "literalMeaning": "what the words literally mean",
      "intendedMeaning": "what it actually means in this context",
      "nuance": "why the speaker used this specific phrasing"
    }
  ],
  "culturalNotes": "string or null (any relevant cultural context)"
}`;

    userPrompt = `Please translate and explain the following text into ${targetName}:
"""
${text}
"""`;
  } else {
    systemPrompt = `You are an expert multilingual translator specializing in Ukrainian, Russian, Spanish, and English.
Translate the text from ${sourceName} into ${targetName}.
Ensure natural fluency, appropriate register, and accurate idioms.
${customPrompt ? `Specific Style/Persona Instruction: "${customPrompt}"` : 'Deliver a natural, fluent, and accurate translation.'}

Respond ONLY with the final translated text. Do not add quotes, introductory phrases, or meta-commentary.`;

    userPrompt = text;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: parseFloat(temperature) || 0.3,
      ...(explainJargon ? { responseMimeType: 'application/json' } : {})
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Translation failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (explainJargon) {
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        isExplained: true,
        translation: parsed.translation || '',
        plainLanguageMeaning: parsed.plainLanguageMeaning || '',
        detectedTone: parsed.detectedTone || '',
        jargonBreakdown: parsed.jargonBreakdown || [],
        culturalNotes: parsed.culturalNotes || '',
        detectedSourceLanguage: parsed.detectedSourceLanguage || ''
      };
    } catch (parseErr) {
      console.warn('Failed to parse JSON response from Gemini, falling back to raw output:', parseErr);
      return {
        isExplained: true,
        translation: rawResponse,
        plainLanguageMeaning: 'Could not structure breakdown automatically. See translation above.',
        detectedTone: 'Unknown',
        jargonBreakdown: [],
        culturalNotes: ''
      };
    }
  }

  return {
    isExplained: false,
    translation: rawResponse.trim()
  };
}
