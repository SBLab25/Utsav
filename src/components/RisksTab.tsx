/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Gavel,
  HeartPulse,
  Info,
  MapPin,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import type { RiskItem } from '../types/plan.ts';

interface RisksTabProps {
  risks: RiskItem[];
  onUpdateRisks?: (newRisks: RiskItem[]) => void;
  onAddMitigationToTimeline?: (risk: RiskItem) => void;
  isLoading?: boolean;
}

const LEVELS: RiskItem['likelihood'][] = ['high', 'medium', 'low'];
const CATEGORY_ICONS: Record<RiskItem['category'], React.ElementType> = {
  weather: CloudRain,
  vendor: Wrench,
  health: HeartPulse,
  legal: Gavel,
  logistics: MapPin,
  budget: WalletCards,
  cultural: Users,
};

const levelLabel = (level: RiskItem['likelihood']) => level.charAt(0).toUpperCase() + level.slice(1);

const levelClasses = (level: RiskItem['likelihood']) => ({
  high: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  medium: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
}[level]);

const getRiskScore = (risk: RiskItem) => {
  const score = { low: 1, medium: 2, high: 3 };
  return score[risk.likelihood] * score[risk.impact];
};

export const RisksTab: React.FC<RisksTabProps> = ({
  risks = [],
  onUpdateRisks,
  onAddMitigationToTimeline,
  isLoading = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<RiskItem['category']>('logistics');
  const [newLikelihood, setNewLikelihood] = useState<RiskItem['likelihood']>('medium');
  const [newImpact, setNewImpact] = useState<RiskItem['impact']>('medium');
  const [newMitigation, setNewMitigation] = useState('');
  const [newBackup, setNewBackup] = useState('');

  const handleAddRisk = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim() || !newMitigation.trim() || !newBackup.trim()) return;
    const item: RiskItem = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      likelihood: newLikelihood,
      impact: newImpact,
      mitigation: newMitigation.trim(),
      backup_plan: newBackup.trim(),
    };
    onUpdateRisks?.([item, ...risks].slice(0, 6));
    setNewTitle('');
    setNewMitigation('');
    setNewBackup('');
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-72 bg-stone-200 dark:bg-stone-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-36 bg-stone-200 dark:bg-stone-800 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-[#23152C]/80 p-5 rounded-3xl border border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="font-serif text-xl font-bold flex items-center gap-2 text-[#3B1F4A] dark:text-[#FFF8EE]">
            <ShieldAlert className="w-5 h-5 text-[#B45309] dark:text-[#F5A623]" />
            Risk Radar
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
            Likelihood × impact view with a concrete mitigation and backup plan for every risk.
          </p>
        </div>
        {onUpdateRisks && (
          <button
            type="button"
            onClick={() => setShowAddForm((value) => !value)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Risk
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">Risk matrix</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Higher and further right means more urgent.</p>
          </div>
          <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Impact →</div>
        </div>
        <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
          <div className="row-span-3 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold text-stone-500 dark:text-stone-400">Likelihood ↑</div>
          {LEVELS.flatMap((likelihood) => LEVELS.map((impact) => {
            const cellRisks = risks.filter((risk) => risk.likelihood === likelihood && risk.impact === impact);
            return (
              <div
                key={`${likelihood}-${impact}`}
                className={`min-h-24 sm:min-h-28 rounded-xl border p-2 ${getRiskScore({ likelihood, impact } as RiskItem) >= 6 ? 'bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900' : getRiskScore({ likelihood, impact } as RiskItem) >= 3 ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' : 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {levelLabel(likelihood)} likelihood · {levelLabel(impact)} impact
                </div>
                <div className="mt-2 space-y-1">
                  {cellRisks.length === 0 ? <span className="text-[11px] text-stone-400">Clear</span> : cellRisks.map((risk) => (
                    <span key={risk.id || risk.title} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${levelClasses(likelihood)}`} title={risk.title}>
                      {risk.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          }))}
          <div />
          {LEVELS.map((impact) => <div key={impact} className="text-center text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">{levelLabel(impact)} impact</div>)}
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddRisk} className="p-5 rounded-3xl bg-white dark:bg-[#23152C] border border-[#B45309]/30 dark:border-[#F5A623]/30 space-y-4">
          <h3 className="text-sm font-bold">Add a custom radar item</h3>
          <input aria-label="Risk title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Risk title" required className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs font-semibold">Category<select value={newCategory} onChange={(event) => setNewCategory(event.target.value as RiskItem['category'])} className="mt-1 w-full px-2 py-2 rounded-xl border bg-stone-50 dark:bg-stone-900"><option value="weather">Weather</option><option value="vendor">Vendor</option><option value="health">Health</option><option value="legal">Legal</option><option value="logistics">Logistics</option><option value="budget">Budget</option><option value="cultural">Cultural</option></select></label>
            <label className="text-xs font-semibold">Likelihood<select value={newLikelihood} onChange={(event) => setNewLikelihood(event.target.value as RiskItem['likelihood'])} className="mt-1 w-full px-2 py-2 rounded-xl border bg-stone-50 dark:bg-stone-900"><option>high</option><option>medium</option><option>low</option></select></label>
            <label className="text-xs font-semibold">Impact<select value={newImpact} onChange={(event) => setNewImpact(event.target.value as RiskItem['impact'])} className="mt-1 w-full px-2 py-2 rounded-xl border bg-stone-50 dark:bg-stone-900"><option>high</option><option>medium</option><option>low</option></select></label>
          </div>
          <textarea aria-label="Risk mitigation" value={newMitigation} onChange={(event) => setNewMitigation(event.target.value)} placeholder="Preventive mitigation" required rows={2} className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 resize-none" />
          <textarea aria-label="Risk backup plan" value={newBackup} onChange={(event) => setNewBackup(event.target.value)} placeholder="Backup plan if it happens" required rows={2} className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 resize-none" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs rounded-xl border cursor-pointer">Cancel</button><button type="submit" className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#B45309] text-white cursor-pointer">Save Risk</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {risks.map((risk) => {
          const Icon = CATEGORY_ICONS[risk.category];
          return (
            <article key={risk.id || risk.title} className="p-5 rounded-3xl bg-white dark:bg-[#23152C] border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Icon className="w-5 h-5 mt-0.5 text-[#B45309] dark:text-[#F5A623]" aria-hidden="true" />
                  <div><h4 className="font-semibold text-sm">{risk.title}</h4><p className="text-[11px] uppercase tracking-wide text-stone-500 mt-1">{risk.category}</p></div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold uppercase ${levelClasses(risk.impact)}`}><AlertTriangle className="w-3 h-3" /> Impact: {levelLabel(risk.impact)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className={`rounded-full border px-2 py-1 ${levelClasses(risk.likelihood)}`}>Likelihood: {levelLabel(risk.likelihood)}</span>
                {risk.related_task_t_minus_days !== undefined && <span className="rounded-full border border-stone-200 px-2 py-1 text-stone-600 dark:border-stone-700 dark:text-stone-300">Plan by T-{risk.related_task_t_minus_days}</span>}
              </div>
              <div className="grid gap-3 text-xs">
                <div className="rounded-2xl bg-stone-50 dark:bg-stone-900/70 p-3"><p className="font-bold text-[#B45309] dark:text-[#F5A623] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Mitigation</p><p className="mt-1 text-stone-600 dark:text-stone-300 leading-relaxed">{risk.mitigation}</p></div>
                <div className="rounded-2xl bg-stone-50 dark:bg-stone-900/70 p-3"><p className="font-bold text-[#3B1F4A] dark:text-[#FFF8EE] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Backup plan</p><p className="mt-1 text-stone-600 dark:text-stone-300 leading-relaxed">{risk.backup_plan}</p></div>
              </div>
              {onAddMitigationToTimeline && <button type="button" onClick={() => onAddMitigationToTimeline(risk)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] dark:text-[#F5A623] hover:underline cursor-pointer"><Info className="w-3.5 h-3.5" /> Add mitigation to timeline</button>}
            </article>
          );
        })}
      </div>
    </div>
  );
};
