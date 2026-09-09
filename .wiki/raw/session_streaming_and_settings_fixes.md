# Streaming Robustness & Settings Synchronization Fixes

## Date
2026-09-09

## Issues Addressed
1. **"ReferenceError: isStreaming is not defined"**:
   - `geminiService.js` referenced `isStreaming` at line 404 without declaring it in `translateText`.
   - Fixed by explicitly defining `const isStreaming = Boolean(onStreamChunk) && !explainJargon;`.

2. **Long Translation Latencies & Premature Timeouts**:
   - In `electron/main.cjs`, `executeDirectNodeStream` and `native:translate` were using aggressive 6000ms timeouts, and `runAiGeneration` was using a 4000ms timeout.
   - When network jitter occurred or cold connections took ~1-2 seconds, the 4000ms/6000ms timer aborted the request, cascading down to slower fallback candidates or failing completely.
   - Fixed by increasing streaming network timeouts to 10-12s, raising candidate model timeout to 10s.

3. **SSE Reader Cancel Exception inside Nested Loops**:
   - In both `executeDirectNodeStream` and `native:translate`, when `candidate?.finishReason` was detected, `try { reader.cancel(); } catch {}` was executed followed by `break;`.
   - Because `break;` only broke the inner `for (const line of lines)` loop, the outer `while (true)` loop continued and called `await reader.read()` on a cancelled stream, throwing an unhandled cancellation error in Node.js 18+ undici fetch streams.
   - The error caused the already accumulated translation tokens to be discarded and forced an unnecessary fallback to non-streaming `generateContent`.
   - Fixed with clean loop control (`let isDone = false; while (!isDone)`), terminating cleanly and only cancelling the reader after exiting the loop.
   - In addition, both handlers now return `accumulatedText` if tokens were already collected even if the stream terminated unexpectedly.

4. **Settings Not Persisting ("setting dont save")**:
   - `storageService.syncToElectron()` was attempting to call `window.electronAPI.syncConfig()`, which sent IPC `config:sync`.
   - `main.cjs` had no IPC handler registered for `config:sync`, throwing an unhandled IPC rejection and preventing frontend settings from updating Electron's persistent `config.json`.
   - Registered `ipcMain.handle('config:sync', async (event, cfg) => { ... saveConfig(cfg); return true; })` to keep Electron and the frontend settings synchronized.
