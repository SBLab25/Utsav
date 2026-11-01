/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlanDiff } from '../types/plan.ts';
import { Sparkles, X, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface DiffViewerProps {
  diffs: PlanDiff[];
  reason?: string | null;
  onDismiss: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, reason, onDismiss }) => {
  if (!diffs || diffs.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 dark:from-amber-500/20 dark:to-purple-500/20 border border-[#B45309]/30 dark:border-[#F5A623]/40 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#B45309] text-white dark:bg-[#F5A623] dark:text-stone-950 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold font-serif text-[#3B1F4A] dark:text-[#FFF8EE]">
              Plan Recalculated · {diffs.length} Change{diffs.length > 1 ? 's' : ''} Detected
            </h4>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Downstream budget and timeline adjustments applied automatically.
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          aria-label="Dismiss changes banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Patch Reason One-Line Summary */}
      {reason && (
        <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2 shadow-xs">
          <span className="font-bold text-[#B45309] dark:text-[#F5A623] shrink-0">Summary:</span>
          <span className="truncate">{reason}</span>
        </div>
      )}

      {/* Diff Chips List */}
      <div className="flex flex-wrap gap-2">
        {diffs.map((diff, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1.5 text-xs bg-white dark:bg-[#23152C] px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-stone-700 shadow-xs"
          >
            {diff.badge && (
              <span className="font-mono font-bold text-[#F5A623] bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 rounded text-[11px]">
                {diff.badge}
              </span>
            )}
            <span className="text-stone-800 dark:text-stone-200">{diff.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
