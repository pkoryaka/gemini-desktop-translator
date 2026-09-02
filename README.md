# 🌐 Gemini AI Desktop Translator

A desktop application designed for multilingual communication across **Ukrainian (Українська)**, **Russian (Русский)**, **Spanish (Español)**, and **English (English)** with intelligent **Jargon Demystification & Plain Language Breakdown**, powered directly by **Google Gemini API** (Free Tier supported).

---

## ✨ Features

- **Multilingual Hub:**
  - Full bidirectional support for **Ukrainian, Russian, Spanish, and English** with Auto-Detection and 1-click language swapping.
- **Explain Jargon & Plain Language Breakdown:**
  - Deconstructs slang, idioms, metaphors, colloquialisms, and acronyms into clear, everyday language.
  - Returns a clean translation, **what the person actually meant**, a detailed table of slang/idioms with **literal vs intended meaning**, and detected **tone/nuance**.
- **Custom Translation Prompts & Tone Presets:**
  - Preset quick chips: *Natural & Fluent*, *Formal / Business*, *Casual / Chat*, *Explain Like I'm 5 (ELI5)*, *Technical / Exact*.
  - Custom instruction input for specific translation personas or domain-specific needs.
- **Google Gemini Integration (Free Tier):**
  - Curated exclusively for models that excel at multilingual translation:
    - **`gemini-3.6-flash`** ⚡ *Ultra Fast (Default)*: Optimized for lowest latency, instant token streaming, and daily chat/hotkey usage.
    - **`gemini-3.6-pro`** 🧠 *Deep Nuance & Slang Expert*: Advanced reasoning engine for difficult idioms, literary nuances, and complex jargon.
    - **`gemini-2.0-flash`** 🔄 *Fast Multilingual Fallback*: High throughput multilingual translation.
    - **`gemini-1.5-flash`** 📦 *Stable Legacy*: Stable legacy baseline.
  - Built-in connection tester and temperature slider.
- **Desktop Native Experience:**
  - Keyboard shortcuts (`Ctrl+Enter` to translate).
  - Text-To-Speech (TTS) voice playback for both original and translated text.
  - Instant clipboard actions (Copy, Paste).
  - Local persistent translation history with search and star/favoriting.

---

## 🚀 Quick Start

### 1. Run in Development Mode
To launch the full Electron desktop app:
```bash
npm run electron:dev
```

To run in lightweight browser/web mode:
```bash
npm run dev
```

### 2. Enter Free Gemini API Key
1. Open the app and click the **Settings ⚙️** icon or the **Model Badge** in the header.
2. Get your free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Paste the key into the settings modal, click **Test API Key Connection**, and save.

### 3. Build Desktop Installer / Executable
To package the app for Windows:
```bash
npm run electron:build
```

---

## 🛠️ Tech Stack
- **Desktop Framework:** Electron 35
- **UI Framework:** React 19 + Vite 6
- **Styling:** Custom Obsidian Glassmorphism Design System (Vanilla CSS)
- **Icons:** Lucide React
- **AI Backend:** Google Gemini Models via REST & Google Generative AI
