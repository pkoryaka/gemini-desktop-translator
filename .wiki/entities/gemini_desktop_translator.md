# Gemini AI Clipboard Assistant Architecture & Design

## Overview
A high-performance desktop clipboard assistant tailored for in-place rewriting, translation, and a **"Explain Jargon / Plain Language Breakdown"** engine powered by **Google Gemini** or **Local Offline LLMs via BYOM (Bring Your Own Model: Ollama, LM Studio, OpenAI-compatible endpoints)**.

## Core Architecture
- **Desktop Runtime**: Electron + Node.js 24 + React 19 + Vite 6
- **AI Model Integration**:
  - **Google Gemini Cloud**: Direct Google Gemini API (`v1beta`) with live auto-discovery via `ModelService.ListModels` (defaulting to `gemini-2.5-flash` / `gemini-2.0-flash`). Supports custom Gemini model ID overrides.
  - **BYOM (Bring Your Own Model)**: Supports local offline models through Ollama (`http://localhost:11434/v1`) or LM Studio (`http://localhost:1234/v1`) requiring 0 API keys and zero internet access (100% air-gapped privacy). Also supports OpenAI-compatible gateways (OpenRouter, Groq, self-hosted).
- **Styling**: Obsidian Glassmorphism theme with Outfit & Plus Jakarta Sans typography.
- **Key Modules**:
  - `electron/main.cjs`: Single-instance mutex lock, tray management, native translation/generation engine (`runAiGeneration`), Win32 cursor tracking (`positionWindowAtCursor`), hotkey orchestration, and in-place paste-back synthesizer.
  - `electron/CopyNative.cs` (`copy_native.exe`): Compiled C# Win32 key synthesizer for releasing held modifier keys and sending clean `Ctrl+C` in <15ms.
  - `src/components/MiniTranslatePopup.jsx`: Floating instant translate HUD, quick language selector, TTS, and "Full App ↗️" switcher.
  - `src/components/HotkeyRecorder.jsx`: Hardware `e.code` keyboard shortcut recorder with mutual conflict detection.
  - `src/services/geminiService.js`: High-speed translation service with native IPC bridge, live model catalog fetching, and 0ms memory LRU cache.
  - `src/services/storageService.js`: Local persistence for API keys, custom presets, BYOM settings (`aiProvider`, `customEndpoint`, `customModel`, etc.), and search-indexed history.
  - `src/components/SettingsModal.jsx`: AI provider switcher (Gemini Cloud vs BYOM Local AI), endpoint tester, hotkey configuration, and custom prompt slot management.

## Pot-Desktop Inspired Floating HUD
- **Cursor Tracking**: In Mini Mode, `positionWindowAtCursor()` uses `screen.getCursorScreenPoint()` to position the translation window 12px right and 16px below the cursor.
- **Smart Edge Clamping**: Automatically flips upwards if close to the bottom of the work area and flips inward if close to the right edge.
- **Always-On-Top Layer**: Uses `mainWindow.setAlwaysOnTop(true, 'screen-saver')` in Mini Mode so translations stay visible over full-screen apps and browsers.

## High-Speed Native Node.js Translation Engine
- Network calls for hotkey translations execute in the Electron Main process (`ipcMain.handle('native:translate')`) using Node.js 24's native Libuv/Undici socket pooling.
- Completely bypasses Chromium renderer thread throttling, CORS checks, and web security sandboxes.
- Greedy decoding (`temperature: 0.0`) and prompt minimization deliver sub-250ms translation response.

## Jargon Explanation Schema
When Jargon Explainer mode is activated, Gemini returns structured JSON:
- `detectedSourceLanguage`: Identified source language.
- `translation`: Fluent target translation.
- `plainLanguageMeaning`: Core message in simple words.
- `detectedTone`: Tone analysis (e.g., Casual, Sarcastic, Professional).
- `jargonBreakdown`: Array of `{ term, literalMeaning, intendedMeaning, nuance }`.
- `culturalNotes`: Contextual background.
