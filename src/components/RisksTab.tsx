/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { RiskItem } from '../types/plan.ts';

interface RisksTabProps {
  risks: RiskItem[];
  onUpdateRisks?: (newRisks: RiskItem[]) => void;
  isLoading?: boolean;
}

export const RisksTab: React.FC<RisksTabProps> = ({
  risks = [],
  onUpdateRisks,
  isLoading = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRisk, setNewRisk] = useState('');
  const [newMitigation, setNewMitigation] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRisk.trim() || !newMitigation.trim()) return;

    const item: RiskItem = {
      risk: newRisk.trim(),
      mitigation: newMitigation.trim(),
      severity: newSeverity,
    };

    onUpdateRisks?.([item, ...risks]);
    setNewRisk('');
    setNewMitigation('');
    setNewSeverity('medium');
    setShowAddForm(false);
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
            High Risk
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Info className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Medium Risk
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Low Risk
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/60 dark:bg-[#23152C]/60 border border-stone-200 dark:border-stone-800 space-y-3"
            >
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded-full"></div>
              <div className="h-5 w-3/4 bg-stone-200 dark:bg-stone-700 rounded-md"></div>
              <div className="h-12 w-full bg-stone-100 dark:bg-stone-800/80 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-[#23152C]/80 backdrop-blur-xs p-5 rounded-3xl border border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="font-serif text-xl font-bold flex items-center gap-2 text-[#3B1F4A] dark:text-[#FFF8EE]">
            <ShieldAlert className="w-5 h-5 text-[#B45309] dark:text-[#F5A623]" />
            <span>Risk Assessment & Contingency Kit</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
            Proactive safeguards for weather, sound curfews, power surges, and guest overflow.
          </p>
        </div>

        {onUpdateRisks && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#2C1638] text-white dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Risk</span>
          </button>
        )}
      </div>

      {/* Add Custom Risk Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRisk}
          className="p-5 rounded-3xl bg-white dark:bg-[#23152C] border border-[#B45309]/30 dark:border-[#F5A623]/30 shadow-xs space-y-4"
        >
          <h3 className="text-sm font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
            Record New Risk & Mitigation
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="risk-description-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Potential Risk or Bottleneck
              </label>
              <input
                id="risk-description-input"
                type="text"
                value={newRisk}
                onChange={(e) => setNewRisk(e.target.value)}
                placeholder="e.g., Heavy monsoon showers delaying outdoor baraat"
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
              />
            </div>

            <div>
              <label htmlFor="risk-mitigation-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Actionable Contingency / Mitigation Strategy
              </label>
              <textarea
                id="risk-mitigation-input"
                value={newMitigation}
                onChange={(e) => setNewMitigation(e.target.value)}
                rows={2}
                placeholder="e.g., Secure waterproof hangar from decorator 48h prior, keep banquet hall ready"
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B45309] resize-none"
              />
            </div>

            <div>
              <label htmlFor="risk-severity-select" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Severity Level
              </label>
              <select
                id="risk-severity-select"
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
              >
                <option value="low">Low Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="high">High Severity</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 transition-colors shadow-2xs cursor-pointer"
            >
              Save Risk
            </button>
          </div>
        </form>
      )}

      {/* Grid of Risk Cards */}
      {risks.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold">No critical risks identified</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Your celebration parameters look smooth and well-balanced.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {risks.map((item, idx) => (
            <div
              key={item.id || `risk-${idx}`}
              className="p-5 rounded-3xl bg-white dark:bg-[#23152C] border border-stone-200 dark:border-stone-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {getSeverityBadge(item.severity)}
                  <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
                    #{(idx + 1).toString().padStart(2, '0')}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-[#3B1F4A] dark:text-[#FFF8EE] leading-snug">
                  {item.risk}
                </h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/70 border border-stone-100 dark:border-stone-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B45309] dark:text-[#F5A623]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Actionable Mitigation</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pl-5">
                  {item.mitigation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
