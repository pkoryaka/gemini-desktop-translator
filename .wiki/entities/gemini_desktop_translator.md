# Gemini Desktop Translator Architecture & Design

## Overview
A desktop translation application tailored for **Ukrainian, Russian, Spanish, and English** with built-in custom prompt engineering and a **"Explain Jargon / Plain Language Breakdown"** engine powered by Google Gemini (Free Tier models).

## Core Architecture
- **Desktop Runtime**: Electron + React 19 + Vite 6
- **AI Model Integration**: Direct Google Gemini API integration supporting `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`.
- **Styling**: Obsidian Glassmorphism theme with Outfit & Plus Jakarta Sans typography.
- **Key Modules**:
  - `src/services/geminiService.js`: Implements structured JSON schema for jargon breakdown and translation queries.
  - `src/services/storageService.js`: Local persistence for API keys, prompt presets, settings, and search-indexed history.
  - `src/components/LanguageSelector.jsx`: Multilingual source/target selector and auto-detection.
  - `src/components/TranslationPromptBar.jsx`: Style presets and custom persona prompting.
  - `src/components/TranslationPanels.jsx`: Split panel translation interface with TTS and keyboard shortcuts.
  - `src/components/JargonExplainerCard.jsx`: Slang/idiom breakdown cards and tone analysis display.
  - `src/components/SettingsModal.jsx`: API key configuration, model selection, temperature tuning, and live connection test.
  - `src/components/HistoryDrawer.jsx`: History drawer with search and favorite filtering.

## Jargon Explanation Schema
When Jargon Explainer mode is activated, Gemini returns structured JSON:
- `detectedSourceLanguage`: Identified source language.
- `translation`: Fluent target translation.
- `plainLanguageMeaning`: Core message in simple words.
- `detectedTone`: Tone analysis (e.g., Casual, Sarcastic, Professional).
- `jargonBreakdown`: Array of `{ term, literalMeaning, intendedMeaning, nuance }`.
- `culturalNotes`: Contextual background.
