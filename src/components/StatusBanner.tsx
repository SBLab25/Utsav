/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

interface StatusBannerProps {
  source: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function StatusBanner({ source, onRetry, isRetrying = false }: StatusBannerProps) {
  if (!source) return null;

  const isAI = source === 'gemini' || source === 'groq';
  const isFallback = source.startsWith('fallback');

  if (!isAI && !isFallback) return null;

  if (isAI) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-6 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold tracking-wide">
            Live {source === 'groq' ? 'Groq' : 'Gemini'} plan
          </span>
        </div>
        <span className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80 hidden sm:inline">
          Connected to AI engine
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold">
          Offline estimate: AI was unavailable, showing a basic plan
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-stone-950 transition-colors shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
