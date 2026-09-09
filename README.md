<div align="center">

<img src="./public/app-icon.png" width="128" height="128" alt="NativeLingo Logo" style="border-radius: 28px;" />

# ⚡ NativeLingo
### *Understand messages and write clearer replies without leaving your Windows app.*
#### *Zero-Tab-Switching AI Copilot • 53+ Languages • Jargon Demystifier • Cloud & 100% Offline Local LLMs*

**Highlight text anywhere in Windows, press a shortcut, and translate, demystify corporate jargon, or polish your draft in-place — powered by Google Gemini or 100% air-gapped local Ollama models.**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=for-the-badge&logo=windows)](https://github.com/pkoryaka/nativelingo)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Gemini%20%7C%20Ollama%20%7C%20LM%20Studio-8A2BE2?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![BYOM](https://img.shields.io/badge/BYOM-Local%20%26%20OpenAI--Compatible-success?style=for-the-badge)](https://ollama.com/)
[![Latency](https://img.shields.io/badge/Latency-%3C700ms%20TTFT-brightgreen?style=for-the-badge)](https://github.com/pkoryaka/nativelingo)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Air--Gapped%20Option-orange?style=for-the-badge)](https://github.com/pkoryaka/nativelingo)

<p align="center">
  <a href="#-the-three-jobs-nativelingo-solves">🎯 The 3 Jobs</a> •
  <a href="#-role-preset-packs">📦 Role Preset Packs</a> •
  <a href="#-why-byom-bring-your-own-model">🧠 BYOM Engine</a> •
  <a href="#-application-compatibility">🖥️ Compatibility</a> •
  <a href="#-pricing--licensing">💳 Pricing & Licenses</a> •
  <a href="#-quick-start">🚀 Quick Start</a>
</p>

</div>

---

## 🎯 The Three Jobs NativeLingo Solves

Most translation tools were built for the browser era: *copy text $\rightarrow$ switch tabs $\rightarrow$ paste into ChatGPT/DeepL $\rightarrow$ copy response $\rightarrow$ switch back $\rightarrow$ paste*.

NativeLingo keeps you completely in flow:

| Job | The Daily Situation | The NativeLingo Solution |
| :--- | :--- | :--- |
| **1. Understand** | *"This customer or colleague message contains confusing slang, idioms, or subtle corporate pushback."* | **Press `Ctrl + Alt + J`**: Instant floating breakdown explaining literal meaning vs intended nuance, tone, and slang. |
| **2. Respond** | *"I know what I want to say, but drafting it professionally in English takes too much time."* | **Press `Ctrl + Alt + 1` or `2`**: Replaces your rough bullet points with a clear, polite, empathetic reply directly in the text field. |
| **3. Adapt** | *"I need this passage translated or reformatted without losing my place."* | **Press `Ctrl + Alt + T`**: Sub-700ms streaming translation in a floating cursor HUD across 53+ languages. |

---

## 📦 1-Click Role Preset Packs

NativeLingo includes 1-click curated prompt packs configured for common professional workflows:

### 🎧 Customer Support & CX Pack
* **Slot 1 (`Ctrl + Alt + 1`)**: *Polite Support Reply* — Rewrites rough drafts into polite, clear, concise ticket responses.
* **Slot 2 (`Ctrl + Alt + 2`)**: *Empathetic De-escalation* — Acknowledges customer frustration and clarifies next steps with reassurance.
* **Slot 3 (`Ctrl + Alt + 3`)**: *Translate to Fluent English* — Translates incoming foreign tickets or outgoing drafts to natural business English.

### 💻 Developer & Engineering Pack
* **Slot 1 (`Ctrl + Alt + 1`)**: *Fix Grammar & Polish* — Fixes typos and phrasing while preserving code blocks, variable names, and technical terms.
* **Slot 2 (`Ctrl + Alt + 2`)**: *Concise PR / Slack Update* — Transforms verbose thoughts into crisp, constructive technical comments.
* **Slot 3 (`Ctrl + Alt + 3`)**: *Translate to English & Replace* — Flawless English transformation without preamble.

### 💼 Executive & Deal Closer Pack
* **Slot 1 (`Ctrl + Alt + 1`)**: *Executive Corporate Tone* — Polishes text into executive-level clarity for clients and leadership.
* **Slot 2 (`Ctrl + Alt + 2`)**: *Crisp Action Summary* — Condenses verbose updates into bulleted action items with clear owners.
* **Slot 3 (`Ctrl + Alt + 3`)**: *Translate to English & Replace* — Clean multilingual communication.

---

## 🧠 Why BYOM (Bring Your Own Model)?

Workplaces, enterprise policies, and privacy-conscious users cannot always upload sensitive customer tickets or proprietary source code to third-party cloud APIs.

<div align="center">
  <img src="public/bpmn-architecture-light.svg" alt="NativeLingo BPMN 2.0 Architecture" width="100%" style="border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 20px rgba(0,0,0,0.06);" />
</div>

### 1. 🦙 100% Offline Local LLMs (Ollama & LM Studio)
* **Zero Cloud Data Transmission**: Run locally via `localhost:11434` (Ollama) or `localhost:1234` (LM Studio).
* **Total Air-Gapped Privacy**: 100% of data remains on your physical machine. Ideal for HIPAA, GDPR, confidential customer communications, and NDA codebases.
* Compatible with any model: `llama3.2`, `mistral`, `deepseek-r1`, `qwen2.5`, `phi-4`, etc.

### 2. ⚡ Google Gemini Cloud Powerhouse
* **Sub-700ms Streaming Latency**: Native Node.js Server-Sent Events (SSE) direct pipeline bypasses Chromium background throttling for instant token generation.
* Free tier available with generous rate limits directly from Google AI Studio.

### 3. 🌐 Custom OpenAI-Compatible Endpoints
* Easily connect to **Groq**, **OpenRouter**, **DeepSeek**, **Together AI**, or internal company LLM gateways.

---

## 🖥️ Application Compatibility

NativeLingo works natively across standard Windows applications via custom Win32 low-level hooks:

| Application | Highlight & Translate (`Ctrl+Alt+T`) | Jargon Explainer (`Ctrl+Alt+J`) | In-Place Rewrite (`Ctrl+Alt+1/2/3`) |
| :--- | :---: | :---: | :---: |
| **Zendesk / Intercom / Freshdesk** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |
| **Slack / Microsoft Teams / Discord** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |
| **VS Code / Cursor / Visual Studio** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |
| **Google Chrome / Microsoft Edge** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |
| **Microsoft Word / Outlook / Excel** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |
| **Notion / Obsidian / OneNote** | ✅ Supported | ✅ Supported | ✅ Direct In-Place Replace |

*(Note: In read-only PDF viewers or elevated admin applications, NativeLingo copies the result to your clipboard with an on-screen confirmation instead of overwriting text).*

---

## 💳 Pricing & Commercial Licenses

NativeLingo uses a **14-Day Reverse Trial** and a **client-side software license**. You bring your own free Gemini API key or local Ollama model—meaning **zero token markups** or surprise usage bills. See [`PRICING.md`](./PRICING.md) for the full commercial and refund policy.

| Tier | Price | What's Included |
| :--- | :---: | :--- |
| **Free Edition** | **$0** (Forever) | Unlimited translation hotkey, Slot 1 rewrite HUD preview + manual copy, $0 BYOK inference. |
| **14-Day Pro Trial** | **$0** (No Card) | Full Pro Edition access for 14 days on first install. Gracefully continues as Free Edition. |
| **Pro Annual** | **$34 / year** | Instant in-place auto-paste (<250ms), all 3 rewrite slots, 2 personal devices, all updates ($2.85/mo). |
| **Pro Perpetual** | **$74 one-time** | **$59 Launch Deal** (first 200 copies). Own your version forever + 12 months updates ($24/yr renewal). |
| **Team Annual** | **$49 / seat / yr** | Minimum 3 seats. Centralized license dashboard, standard business invoicing, priority support. |

---

## 🚀 Quick Start

### Installation
1. Download the latest `NativeLingo-Setup-x64.exe` from the [Releases](https://github.com/pkoryaka/nativelingo/releases) tab.
2. Run the installer. NativeLingo will launch silently into your Windows System Tray.
3. Open Settings (`Ctrl + Alt + T` $\rightarrow$ Settings gear icon):
   - Choose **Google Gemini** (paste your free key from [Google AI Studio](https://aistudio.google.com/)) or select **Local Ollama** (`localhost:11434`).
4. Select your target language and you are ready!

### Developer Setup (Build from Source)
```bash
# Clone the repository
git clone https://github.com/pkoryaka/nativelingo.git
cd nativelingo

# Install dependencies (git hooks automatically configured)
npm install

# Start development workstation
npm run dev

# Build production Windows distribution
npm run build
```

---

## 📜 License & Support
* **Personal & Evaluation Use**: Free to use with personal Gemini or local models.
* **Commercial Teams & Support Inquiries**: Open an issue or contact `support@nativelingo.app`.
