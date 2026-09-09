# High-Fidelity Text-to-Speech (TTS) System

> Studio-grade Edge Neural Voice synthesis architecture, multilingual voice mapping, and intelligent browser fallback.

## Overview
NativeLingo replaces legacy robotic Windows SAPI5 desktop speech with an ultra-natural, human-grade Text-to-Speech system powered by Microsoft Edge Neural Speech synthesis.

## Architecture

```
[User clicks Listen/Speak] ──> [ttsService.speak({ text, lang, gender, rate })]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       [Electron IPC: tts:synthesize]             [Browser SpeechSynthesis Fallback]
                    │                                           │
       [MsEdgeTTS Neural Engine]                    [Rank voices: Natural/Online]
                    │                                           │
       [Base64 MP3 Audio Stream]                   [Utterance with rate tuning]
                    │
           [HTML5 Audio Player]
```

### Key Components
1. **IPC Handler (`electron/main.cjs` - `tts:synthesize`)**:
   - Uses `msedge-tts` to stream 24kHz MP3 audio from the Azure/Bing speech synthesis endpoints.
   - Zero API key required, sub-250ms synthesis latency.
   - Comprehensive multilingual voice dictionary (`NEURAL_VOICES`) mapping over 50 languages to optimal natural female and male personas (e.g. `uk-UA-PolinaNeural`, `uk-UA-OstapNeural`, `en-US-JennyNeural`, `en-US-GuyNeural`).
   - Intelligent script detector for auto-detect mode (e.g. distinguishing Ukrainian vs. Cyrillic vs. Latin text).

2. **Client Service (`src/services/ttsService.js`)**:
   - Centralized audio controller managing playback state, cancellation, and fallback.
   - Converts base64 audio data into an HTML5 `Audio` element for seamless play/pause/stop control without writing temporary files to disk.
   - Intelligent fallback to `window.speechSynthesis` prioritizing installed neural and natural OS voices if offline.

3. **User Controls (`src/components/SettingsModal.jsx`)**:
   - Persona / Gender selection: Female (Natural) vs. Male (Natural).
   - Speaking rate selection: 0.85x (Deliberate), 1.0x (Normal), 1.15x (Fast).
   - Instant audio test/preview button in the user's primary target language.

4. **Surface Integrations**:
   - Dual panels in main window (`src/components/TranslationPanels.jsx`): speak source or translated text.
   - Mini Instant Popup (`src/components/MiniTranslatePopup.jsx`): speak translated text or original clipboard text directly from the aligned dual panels.
   - Window hide listener (`src/App.jsx`): cancels playback immediately when the window or popup is hidden to prevent orphaned audio.
