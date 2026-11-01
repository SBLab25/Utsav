/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Strips markdown and special characters from assistant responses for natural, fluent voice readout
 */
export function cleanTextForSpeech(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold **text** -> text
    .replace(/\*([^*]+)\*/g, '$1') // Italic *text* -> text
    .replace(/_([^_]+)_/g, '$1') // Italic _text_ -> text
    .replace(/`([^`]+)`/g, '$1') // Code `text` -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links [text](url) -> text
    .replace(/^[\s*•-]+\s+/gm, '') // Bullet lists
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .replace(/\n+/g, ' ') // Line breaks to spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

export interface SpeechOptions {
  language?: 'en' | 'hi' | 'te' | 'bn' | string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeech(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_e) {
    // Ignore error in environments with partial SpeechSynthesis support
  }
  activeUtterance = null;
}

export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}

export function speakText(text: string, options: SpeechOptions = {}): () => void {
  if (!isSpeechSynthesisSupported()) {
    options.onError?.(new Error('Speech synthesis is not supported in this browser'));
    return () => {};
  }

  stopSpeech();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return () => {};

  const utterance = new window.SpeechSynthesisUtterance(cleaned);
  activeUtterance = utterance;

  const targetLang = options.language === 'hi'
    ? 'hi-IN'
    : options.language === 'te'
      ? 'te-IN'
      : options.language === 'bn'
        ? 'bn-IN'
        : 'en-IN';

  utterance.lang = targetLang;
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

  // Try to pick a natural voice matching the target language or Indian English
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const matchingVoice = voices.find(
      (v) => v.lang === targetLang || v.lang.startsWith(targetLang.slice(0, 2))
    ) || voices.find((v) => v.lang.startsWith('en'));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
  }

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    // Cancelled utterances fire error with 'canceled' or 'interrupted' - ignore harmless cancel
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      options.onError?.(e);
    } else {
      options.onEnd?.();
    }
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    options.onError?.(err);
  }

  return () => {
    if (activeUtterance === utterance) {
      stopSpeech();
    }
  };
}
