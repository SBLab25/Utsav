/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Wand2, RefreshCw } from 'lucide-react';

interface BriefInputProps {
  initialBrief?: string;
  onGeneratePlan: (brief: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
  language?: 'en' | 'hi' | 'te' | 'bn';
  onLanguageChange?: (language: 'en' | 'hi' | 'te' | 'bn') => void;
}

const EXAMPLE_BRIEFS = [
  "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag, retro Bollywood",
  "30th Birthday rooftop party, 40 guests, ₹1.5L, Goa, sunset neon vibe",
  "Community Diwali Mela, 500 residents, ₹3L, Delhi RWA, traditional lamps & food stalls",
  "Silver Jubilee Anniversary, 120 guests, ₹8L, Jaipur, royal heritage garden",
];

export const BriefInput: React.FC<BriefInputProps> = ({
  initialBrief = "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag, retro Bollywood",
  onGeneratePlan,
  isLoading,
  onCancel,
  language = 'en',
  onLanguageChange = () => {},
}) => {
  const [brief, setBrief] = useState(initialBrief);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English recognition

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setBrief((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim() || isLoading) return;
    onGeneratePlan(brief.trim());
  };

  const handleSelectExample = (example: string) => {
    setBrief(example);
  };

  return (
    <div className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="brief-language" className="text-xs font-semibold text-stone-500">Content language</label>
        <select id="brief-language" value={language} onChange={(e) => onLanguageChange(e.target.value as 'en' | 'hi' | 'te' | 'bn')} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900">
          <option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="bn">Bengali</option>
        </select>
        <div>
          <h2 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
            Event Brief
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Describe your celebration in one sentence.
          </p>
        </div>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-400'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
            title={isListening ? 'Stop voice recording' : 'Dictate with your microphone (Web Speech API)'}
            aria-label={isListening ? 'Stop voice recording' : 'Dictate event brief with microphone'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#F5A623]" />}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            required
            placeholder="e.g., Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag, retro Bollywood"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-colors resize-none"
            aria-label="Event brief description"
          />

          <div className="flex justify-between items-center text-[11px] text-stone-400 dark:text-stone-500 px-1 mt-1">
            <span>{isListening ? '🎙️ Listening... speak clearly' : 'Auto-extracts dates, budget, city & guest count'}</span>
            <span className="font-mono tabular-nums">{brief.length}/500</span>
          </div>
        </div>

        {/* Example Quick Chips */}
        <div>
          <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 block mb-1.5 uppercase tracking-wider">
            Inspiration Starters
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {EXAMPLE_BRIEFS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(ex)}
                className={`text-left text-xs p-2.5 rounded-xl border transition-colors cursor-pointer leading-relaxed ${
                  brief === ex
                    ? 'bg-[#F5A623]/15 border-[#F5A623] text-[#3B1F4A] dark:text-[#FFF8EE] font-medium shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
                title={ex}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !brief.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#3B1F4A] hover:bg-[#2C1638] text-[#FFF8EE] dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 font-semibold text-xs sm:text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#F5A623] dark:text-stone-950" />
                <span>Generating Living Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F5A623] dark:text-stone-950" />
                <span>Generate Celebration Plan</span>
              </>
            )}
          </button>

          {isLoading && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/70 dark:hover:bg-red-900/70 text-red-700 dark:text-red-300 font-bold text-xs sm:text-sm border border-red-300 dark:border-red-800 transition-colors cursor-pointer shrink-0"
              aria-label="Cancel plan generation"
              title="Cancel plan generation"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
