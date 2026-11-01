/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isSpeechSynthesisSupported,
  cleanTextForSpeech,
  speakText,
  stopSpeech,
  isSpeaking,
} from './speechSynthesis.ts';

describe('speechSynthesis utility', () => {
  it('cleanTextForSpeech strips markdown formatting for natural voice output', () => {
    const raw = `### Sangeet Decor Update\n\n**Great news!** We have allocated:\n* ₹50,000 for \`stage lighting\`\n* ₹30,000 for floral arch\n\nCheck [link](https://example.com) for details.`;
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).not.toContain('###');
    expect(cleaned).not.toContain('**');
    expect(cleaned).not.toContain('`');
    expect(cleaned).not.toContain('*');
    expect(cleaned).not.toContain('[link]');
    expect(cleaned).toContain('Great news! We have allocated:');
    expect(cleaned).toContain('₹50,000 for stage lighting');
  });

  describe('with mock SpeechSynthesis', () => {
    let mockSpeak: any;
    let mockCancel: any;
    let mockGetVoices: any;

    beforeEach(() => {
      mockSpeak = vi.fn();
      mockCancel = vi.fn();
      mockGetVoices = vi.fn().mockReturnValue([
        { name: 'Google Hindi', lang: 'hi-IN' },
        { name: 'Microsoft Ravi', lang: 'en-IN' },
      ]);

      (window as any).speechSynthesis = {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices,
        speaking: false,
      };

      (window as any).SpeechSynthesisUtterance = function (this: any, text: string) {
        this.text = text;
        this.lang = 'en-US';
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
      };
    });

    afterEach(() => {
      delete (window as any).speechSynthesis;
      delete (window as any).SpeechSynthesisUtterance;
    });

    it('detects speech synthesis support', () => {
      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    it('speaks text with language configuration', () => {
      speakText('Welcome to Utsav', { language: 'hi' });
      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('Welcome to Utsav');
      expect(utterance.lang).toBe('hi-IN');
      expect(utterance.voice?.lang).toBe('hi-IN');
    });

    it('stops speech cleanly', () => {
      stopSpeech();
      expect(mockCancel).toHaveBeenCalled();
    });

    it('tracks isSpeaking accurately', () => {
      (window as any).speechSynthesis.speaking = true;
      expect(isSpeaking()).toBe(true);
      (window as any).speechSynthesis.speaking = false;
      expect(isSpeaking()).toBe(false);
    });
  });
});
