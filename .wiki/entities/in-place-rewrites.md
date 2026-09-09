# In-Place Rewrite Engine & Model Resilience Architecture

## Overview
The In-Place Rewrite feature allows users to select text in any Windows application and press a dedicated shortcut (e.g., `Alt+A` for Slot 1) to transform the selected text using custom AI prompt directives (e.g. grammar correction, business tone, translation) and replace it directly in-place via simulated keystrokes (`Ctrl+C` -> AI Transform -> `Ctrl+V`).

## Critical Bug Fixes & Architectural Decisions

### 1. Multi-Model Auto-Fallback
- **Problem**: Preview models like `gemini-3.8-flash` face strict free-tier rate limits (`HTTP 429 RESOURCE_EXHAUSTED`).
- **Solution**: `runAiGeneration` and `startNativeStream` implement an automated fallback array:
  `[requestedModel, 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.0-flash']`.
  On 429, 503, or 404 status codes, the engine automatically attempts the next model in sequence.

### 2. Silent In-Place Execution
- **Problem**: When in-place execution failed, the catch block sent `show-full-window` and focused the app window, presenting an empty modal.
- **Solution**: In-place mode (`pasteBack: true`) now runs completely silently. Any failure gracefully restores the user's prior clipboard content without opening any window or stealing window focus.

### 3. Output Truncation / Cutting Fix (Reasoning Token Budget)
- **Problem**: Gemini 3 Flash is a reasoning model that produces `thoughtsTokenCount` (often 250-500 tokens). Because `maxOutputTokens` was artificially constrained (`Math.max(256, trimmed.length * 4)`), the thinking process consumed the token budget, causing `Finish Reason: MAX_TOKENS` and truncating the output text mid-sentence.
- **Solution**: Set `maxTokens` to `Math.max(4096, trimmed.length * 8)` ensuring generous headroom for both internal model reasoning and the full, complete transformed text.

### 4. Latency Optimization & Sub-Second In-Place Pasting
- **Problem**: In-place replacement felt excessively slow (taking 15–16 seconds between pressing hotkey and pasting output). Benchmarking revealed multiple bottlenecks:
  1. `gemini-3.8-flash` hit strict free-tier rate limits (HTTP 429), triggering fallback retries.
  2. The primary fallback `gemini-3.6-flash` took ~15.7 seconds per generation.
  3. Deprecated models (`gemini-2.0-flash`, `gemini-2.5-flash`) returned HTTP 404.
  4. Physical paste simulation in `CopyNative.cs` had unnecessary modifier settling delays (`Thread.Sleep(35)` and `Thread.Sleep(25)`).
- **Solution**:
  1. Promoted Google's ultra-low-latency models (`gemini-flash-lite-latest` and `gemini-3.5-flash-lite`) which benchmark at **700–900ms** for full text transformation.
  2. Updated fallback candidates in `electron/main.cjs` to `[requestedModel, 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash']`.
  3. Optimized `triggerQuickSlotAction` to prioritize `fastModel` (`gemini-flash-lite-latest`) for in-place replacements.
  4. Optimized `CopyNative.cs` keybd_event sequence for `isPaste` to drop redundant settling delays and reduced the setTimeout delay to 10ms, dropping end-to-end replacement time from ~16s to <1s.
