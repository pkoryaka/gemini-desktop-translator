import { storageService } from './storageService';

let currentAudio = null;
let currentUtterance = null;

export const ttsService = {
  /**
   * Synthesizes and speaks the given text using high-fidelity Edge Neural voices (via Electron IPC)
   * with automatic fallback to modern browser speech synthesis.
   */
  speak: async ({ text, lang = 'en', gender, rate, onStart, onEnd, onError }) => {
    // 1. Cancel any active speech immediately
    ttsService.stop();

    if (!text || !text.trim()) {
      onEnd?.();
      return;
    }

    const trimmedText = text.trim();
    const settings = storageService.getSettings();
    const voiceGender = gender || settings.ttsVoiceGender || 'female';
    const speechSpeed = rate !== undefined ? rate : (settings.ttsSpeed || 1.0);

    // 2. Primary Engine: High-Fidelity Edge Neural Voice via Electron IPC
    if (window.electronAPI && typeof window.electronAPI.synthesizeSpeech === 'function') {
      try {
        const ratePercent = Math.round((speechSpeed - 1.0) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

        const res = await window.electronAPI.synthesizeSpeech({
          text: trimmedText,
          lang,
          gender: voiceGender,
          rate: rateStr
        });

        if (res && res.ok && res.audioData) {
          const audio = new Audio(res.audioData);
          currentAudio = audio;

          audio.onplay = () => {
            onStart?.();
          };

          audio.onended = () => {
            if (currentAudio === audio) currentAudio = null;
            onEnd?.();
          };

          audio.onerror = (err) => {
            console.warn('Audio element error during playback:', err);
            if (currentAudio === audio) currentAudio = null;
            onError?.(err);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('Neural TTS synthesis failed, falling back to local SpeechSynthesis:', err);
      }
    }

    // 3. Fallback: Local SpeechSynthesis with Intelligent Neural / Natural Voice Ranking
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(trimmedText);
        currentUtterance = utterance;

        const voices = window.speechSynthesis.getVoices() || [];
        const langLower = (lang || 'en').toLowerCase().replace('_', '-');
        const langBase = langLower.split('-')[0];

        // Find voices matching the target language
        const matching = voices.filter(v => {
          const vLang = (v.lang || '').toLowerCase().replace('_', '-');
          return vLang.startsWith(langBase) || vLang.includes(langLower);
        });

        // Prioritize natural / neural / online voices over robotic legacy SAPI5 voices
        const naturalVoice = matching.find(v => {
          const name = (v.name || '').toLowerCase();
          return name.includes('natural') || name.includes('neural') || name.includes('online') || name.includes('google');
        }) || matching[0];

        if (naturalVoice) {
          utterance.voice = naturalVoice;
          utterance.lang = naturalVoice.lang;
        } else {
          utterance.lang = langBase === 'uk' ? 'uk-UA' : (langBase === 'ru' ? 'ru-RU' : 'en-US');
        }

        utterance.rate = Math.max(0.7, Math.min(1.5, speechSpeed * 0.95));
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          onStart?.();
        };

        utterance.onend = () => {
          if (currentUtterance === utterance) currentUtterance = null;
          onEnd?.();
        };

        utterance.onerror = (e) => {
          if (currentUtterance === utterance) currentUtterance = null;
          onError?.(e);
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.error('SpeechSynthesis fallback failed:', err);
        onError?.(err);
      }
    }

    onEnd?.();
  },

  /**
   * Immediately stops any active audio playback or synthesis.
   */
  stop: () => {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }

    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    currentUtterance = null;
  },

  /**
   * Returns true if audio is currently playing.
   */
  isSpeaking: () => {
    return Boolean(
      (currentAudio && !currentAudio.paused && !currentAudio.ended) ||
      ('speechSynthesis' in window && window.speechSynthesis.speaking)
    );
  }
};
