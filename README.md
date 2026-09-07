# ⚡ Gemini AI Text & Translation Assistant

A fast, intelligent Windows desktop assistant powered directly by **Google Gemini API** (Free Tier supported). It combines **Instant In-Place Text Rewriting & Quick Prompt Actions**, **Jargon Demystification & Slang Explanation**, and **Multilingual Translation** across **Ukrainian, English, Spanish, and Russian**.

---

## ✨ Core Features

- **⚡ 3 Quick Action Prompt Slots & In-Place Paste-Back:**
  - Highlight text anywhere (Word, Slack, browser, IDE, email, Notepad) and press a dedicated shortcut:
    - `Ctrl + Alt + 1` &rarr; **Fix Grammar & Polish** (Corrects spelling, typos, and phrasing; replaces text in-place).
    - `Ctrl + Alt + 2` &rarr; **Professional Business Tone** (Rewrites into polite, executive corporate communication).
    - `Ctrl + Alt + 3` &rarr; **Translate to English & Replace** (Translates foreign text into English and replaces in-place).
  - Fully customizable names, prompts, templates, and shortcuts in Settings.
- **🌐 Multilingual Translation Hub:**
  - Full bidirectional support for **Ukrainian, Russian, Spanish, and English** with Auto-Detection and 1-click language swapping.
- **💡 Explain Jargon & Plain Language Breakdown:**
  - Deconstructs slang, idioms, metaphors, and technical jargon into clear, everyday language.
  - Returns a clean translation, **what the person actually meant**, a detailed table of slang/idioms with **literal vs intended meaning**, and detected **tone/nuance**.
- **🪟 Instant Floating Mini Window HUD:**
  - Press `Ctrl + Alt + T` on highlighted text in any app to summon a sleek compact floating widget near your cursor.
  - Includes sub-150ms streaming, **Copy (📋)**, **Text-to-Speech (🔊)**, **Jargon breakdown pills**, and **1-click Expand (↗️)**.
- **🚀 Ultra-Fast Windows Native Integration:**
  - Sub-15ms Win32 text capture and in-place paste synthesis (`CopyNative.exe`).
  - Silent Windows startup directly into the System Tray with zero popup delay.


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
