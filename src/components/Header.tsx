/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Sun,
  Moon,
  History,
  Printer,
  Share2,
  Calendar,
  Users,
  MapPin,
  Download,
  Upload
} from 'lucide-react';
import { EventPlan } from '../types/plan.ts';
import { generateWhatsAppSummary } from '../utils/planLogic.ts';

interface HeaderProps {
  plan: EventPlan | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  onImportPlan?: (importedPlan: EventPlan) => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  darkMode,
  onToggleDarkMode,
  onOpenHistory,
  historyCount,
  onImportPlan,
}) => {
  const [copiedShare, setCopiedShare] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShareWhatsApp = () => {
    if (!plan) return;
    const summary = generateWhatsAppSummary(plan);
    navigator.clipboard.writeText(summary);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!plan) return;
    const jsonString = JSON.stringify(plan, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (plan.title || 'event_plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    link.href = url;
    link.download = `utsav_${safeTitle}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportPlan) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.title && parsed.budget && parsed.timeline) {
          onImportPlan(parsed);
        } else {
          alert('Invalid plan file format. Please upload a valid Utsav plan JSON.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8EE]/90 dark:bg-[#180D1F]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Utsav AI Celebration Planner Home"
          >
            <span className="w-8 h-8 rounded-xl bg-[#3B1F4A] dark:bg-[#F5A623] text-[#F5A623] dark:text-stone-950 flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              U
            </span>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#3B1F4A] dark:text-[#FFF8EE]">
              Utsav
            </span>
          </a>
        </div>

        {/* Zone 2: Event Context Chips (Center) */}
        {plan && (
          <div className="hidden lg:flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300 font-medium truncate">
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span className="font-mono">{plan.event_date}</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span className="font-mono">{plan.guests} guests</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span>{plan.city}</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="truncate max-w-[200px] text-stone-500 dark:text-stone-400 italic">
              "{plan.theme}"
            </span>
          </div>
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {plan && (
            <>
              {/* WhatsApp Share */}
              <button
                onClick={handleShareWhatsApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                title="Copy ready-to-share WhatsApp event summary"
                aria-label="Copy WhatsApp event summary"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedShare ? 'Copied WhatsApp!' : 'Share WhatsApp'}</span>
              </button>

              {/* Export JSON */}
              <button
                onClick={handleExportJSON}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Export entire plan as JSON file"
                aria-label="Export plan as JSON file"
              >
                <Download className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span>JSON</span>
              </button>

              {/* Print View */}
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Print celebration plan view"
                aria-label="Print celebration plan view"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              {/* History Drawer Toggle */}
              <button
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="View undo and version history"
                aria-label={`Version history, ${historyCount} versions available`}
              >
                <History className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span className="hidden md:inline">History</span>
                {historyCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 text-[10px] flex items-center justify-center font-bold">
                    {historyCount}
                  </span>
                )}
              </button>

              {/* Hidden file input for Import */}
              {onImportPlan && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                    aria-label="Upload JSON plan file"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden lg:inline-flex items-center gap-1 p-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Import previously saved JSON plan"
                    aria-label="Import JSON plan file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-[#F5A623]" />
            ) : (
              <Moon className="w-4 h-4 text-[#3B1F4A]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
