/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import type { PlanHistoryItem } from '../types/plan.ts';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import { formatINR } from '../utils/planLogic.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  history: PlanHistoryItem[];
  currentIndex: number;
  onRestore: (index: number) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  history,
  currentIndex,
  onRestore,
  onClose,
  onClearHistory,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;

      // Move focus into the drawer on open
      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    } else if (triggerRef.current) {
      // Return focus to the trigger button on close
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap and Escape listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#1E1125] h-full shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#B45309] dark:text-[#F5A623]" />
            <h3 id="history-drawer-title" className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Plan Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close history drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Versions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-sm">
              No plan versions recorded yet.
            </div>
          ) : (
            history.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-[#B45309] dark:border-[#F5A623] bg-amber-500/[0.06] dark:bg-amber-500/[0.1] shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{dateStr}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] dark:text-[#F5A623] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-600/30 dark:border-[#F5A623]/30">
                            Current Active
                          </span>
                        )}
                      </div>

                      <h4 className="font-medium text-sm text-stone-900 dark:text-stone-100 mt-1">
                        {item.label}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300 mt-2 font-mono">
                        <span className="font-semibold text-[#3B1F4A] dark:text-[#FFF8EE]">
                          {formatINR(item.plan.total_budget, true)}
                        </span>
                        <span>·</span>
                        <span>{item.plan.guests} guests</span>
                        <span>·</span>
                        <span>{item.plan.city}</span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onRestore(idx);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-[#B45309] dark:hover:border-[#F5A623] transition-colors cursor-pointer"
                        aria-label={`Restore version from ${dateStr}`}
                      >
                        <RotateCcw className="w-3 h-3 text-[#B45309] dark:text-[#F5A623]" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/60 dark:bg-stone-900/60">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {history.length} snapshot{history.length > 1 ? 's' : ''} saved in localStorage
          </span>
          <button
            onClick={onClearHistory}
            className="text-xs text-stone-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};
