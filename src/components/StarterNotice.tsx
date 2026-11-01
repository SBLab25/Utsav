import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface StarterNoticeProps {
  onRedraft: () => void;
  isLoading?: boolean;
}

export function StarterNotice({ onRedraft, isLoading = false }: StarterNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-xs dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span className="text-xs font-semibold sm:text-sm">This is a basic starter plan because AI was unavailable.</span>
      </div>
      <button
        type="button"
        onClick={onRedraft}
        disabled={isLoading}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        Redraft with AI
      </button>
    </div>
  );
}
