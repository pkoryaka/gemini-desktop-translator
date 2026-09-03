# Gemini Desktop Translator Architecture & Design

## Overview
A high-performance desktop translation application tailored for **Ukrainian, Russian, Spanish, and English** with built-in custom prompt engineering and a **"Explain Jargon / Plain Language Breakdown"** engine powered by Google Gemini (Free Tier models).

## Core Architecture
- **Desktop Runtime**: Electron + Node.js 24 + React 19 + Vite 6
- **AI Model Integration**: Direct Google Gemini API (`v1beta`) with live auto-discovery via `ModelService.ListModels` (defaulting to `gemini-2.0-flash`).
- **Styling**: Obsidian Glassmorphism theme with Outfit & Plus Jakarta Sans typography.
- **Key Modules**:
  - `electron/main.cjs`: Single-instance mutex lock, tray management, native Node.js translation engine (`native:translate`), Win32 cursor tracking (`positionWindowAtCursor`), and hotkey orchestration.
  - `electron/CopyNative.cs` (`copy_native.exe`): Compiled C# Win32 key synthesizer for releasing held modifier keys and sending clean `Ctrl+C` in <15ms.
  - `src/components/MiniTranslatePopup.jsx`: Floating instant translate HUD, quick language selector, TTS, and "Full App ↗️" switcher.
  - `src/components/HotkeyRecorder.jsx`: Hardware `e.code` keyboard shortcut recorder with mutual conflict detection.
  - `src/services/geminiService.js`: High-speed translation service with native IPC bridge, live model catalog fetching, and 0ms memory LRU cache.
  - `src/services/storageService.js`: Local persistence for API keys, custom presets, settings, and search-indexed history.
  - `src/components/SettingsModal.jsx`: Live Google model discovery, hotkey configuration, primary language selector, and connection tester.

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
