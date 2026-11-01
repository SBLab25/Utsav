/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Wand2, Lightbulb } from 'lucide-react';

interface ReplanBoxProps {
  onReplan: (instruction: string) => void;
  isLoading: boolean;
}

const QUICK_CHANGES = [
  "Add 50 guests",
  "Reduce budget by ₹1L",
  "Make it eco-friendly with sustainable decor",
  "Move date to 10 Jan 2027",
  "Add live Sufi / Ghazal music counter",
];

export const ReplanBox: React.FC<ReplanBoxProps> = ({ onReplan, isLoading }) => {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    onReplan(instruction.trim());
    setInstruction('');
  };

  const handleQuickClick = (text: string) => {
    onReplan(text);
  };

  return (
    <div className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#F5A623]" />
          <h3 className="font-serif text-base font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
            Live Re-plan & Recalculate
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Ask to adjust guests, budget, timeline, or theme. Everything else remains untouched.
        </p>
      </div>

      {/* Quick Change Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
          One-Click Adjustments
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHANGES.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickClick(chip)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-500/15 dark:bg-stone-800 dark:hover:bg-amber-500/20 text-stone-700 dark:text-stone-300 hover:text-[#3B1F4A] dark:hover:text-[#F5A623] border border-stone-200/60 dark:border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value.slice(0, 300))}
            maxLength={300}
            disabled={isLoading}
            placeholder="e.g., add 50 guests and adjust catering budget"
            className="w-full pl-3.5 pr-20 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
            aria-label="Re-plan instructions"
          />
          <button
            type="submit"
            disabled={isLoading || !instruction.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#3B1F4A] hover:bg-[#2C1638] text-white dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 font-semibold text-xs flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Apply</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
