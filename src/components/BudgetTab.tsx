/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  TrendingDown,
  TrendingUp,
  Table,
  PieChart,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { BudgetItem } from '../types/plan.ts';
import { DonutChart } from './DonutChart.tsx';
import {
  formatINR,
  recalculateBudgetWithLocked,
  normalizeBudgetPercentages,
  adjustCategoryPercentage,
  addBudgetCategory,
  removeBudgetCategory,
} from '../utils/planLogic.ts';

interface BudgetTabProps {
  budget: BudgetItem[];
  totalBudget: number;
  guests: number;
  onUpdateBudget: (newBudget: BudgetItem[], newTotal: number) => void;
}

const PALETTE = [
  '#F5A623', // Marigold
  '#E05D5D', // Coral Rose
  '#7B3F9A', // Royal Plum
  '#2E7D32', // Emerald Forest
  '#1565C0', // Cobalt Sapphire
  '#D97706', // Amber Gold
  '#00897B', // Persian Teal
  '#C2185B', // Rani Pink
  '#8E24AA', // Amethyst
  '#3949AB', // Indigo
];

export const BudgetTab: React.FC<BudgetTabProps> = ({
  budget,
  totalBudget,
  guests,
  onUpdateBudget,
}) => {
  const [showTableView, setShowTableView] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPct, setNewCategoryPct] = useState(10);

  // Toggle lock on an item
  const handleToggleLock = (category: string) => {
    const updated = budget.map((b) => {
      if (b.category === category) {
        return {
          ...b,
          locked: !b.locked,
          amount: b.amount || Math.round((b.pct / 100) * totalBudget),
        };
      }
      return b;
    });
    onUpdateBudget(normalizeBudgetPercentages(updated, totalBudget), totalBudget);
  };

  // Change total budget slider
  const handleTotalBudgetChange = (newTotal: number) => {
    const recalculated = recalculateBudgetWithLocked(budget, newTotal);
    onUpdateBudget(recalculated, newTotal);
  };

  // "What if -20%?" button
  const handleWhatIfReduction = () => {
    const reducedTotal = Math.round(totalBudget * 0.8);
    const recalculated = recalculateBudgetWithLocked(budget, reducedTotal);
    onUpdateBudget(recalculated, reducedTotal);
  };

  // "What if +20%?" button
  const handleWhatIfExpansion = () => {
    const expandedTotal = Math.round(totalBudget * 1.2);
    const recalculated = recalculateBudgetWithLocked(budget, expandedTotal);
    onUpdateBudget(recalculated, expandedTotal);
  };

  // Reset to original proportion
  const handleUnlockAll = () => {
    const unlocked = budget.map((b) => ({ ...b, locked: false }));
    onUpdateBudget(normalizeBudgetPercentages(unlocked, totalBudget), totalBudget);
  };

  // Adjust percentage stepper
  const handleStepPercentage = (category: string, delta: number) => {
    const updated = adjustCategoryPercentage(budget, category, delta, totalBudget);
    onUpdateBudget(updated, totalBudget);
  };

  // Add custom category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const updated = addBudgetCategory(budget, newCategoryName.trim(), Number(newCategoryPct) || 10, totalBudget);
    onUpdateBudget(updated, totalBudget);
    setNewCategoryName('');
    setShowAddModal(false);
  };

  // Delete category
  const handleDeleteCategory = (category: string) => {
    const updated = removeBudgetCategory(budget, category, totalBudget);
    onUpdateBudget(updated, totalBudget);
  };

  // Prepare slices for DonutChart
  const slices = budget.map((b, idx) => ({
    label: b.category,
    pct: b.pct,
    amount: b.amount || Math.round((b.pct / 100) * totalBudget),
    color: PALETTE[idx % PALETTE.length],
    locked: b.locked,
  }));

  const lockedCount = budget.filter((b) => b.locked).length;
  const totalAllocatedPct = Math.round(budget.reduce((acc, b) => acc + b.pct, 0) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Budget Controls Bar */}
      <div className="bg-white/80 dark:bg-[#23152C]/90 backdrop-blur-sm rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">
                Total Celebration Budget
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">·</span>
              <span className="text-xs font-semibold text-[#F5A623] tabular-nums">
                {totalAllocatedPct}% Allocated
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-serif font-bold text-[#3B1F4A] dark:text-[#FFF8EE] tabular-nums">
                {formatINR(totalBudget)}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                (~{formatINR(guests > 0 ? Math.round(totalBudget / guests) : 0, true)} per guest)
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatIfReduction}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#D97706] dark:text-[#F5A623] border border-[#F5A623]/30 transition-colors cursor-pointer"
              title="Recalculate budget with 20% savings while keeping locked costs unchanged"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              −20% Savings
            </button>

            <button
              onClick={handleWhatIfExpansion}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
              title="Recalculate budget with 20% expansion"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              +20% Expand
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>

            {lockedCount > 0 && (
              <button
                onClick={handleUnlockAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock All ({lockedCount})
              </button>
            )}

            <button
              onClick={() => setShowTableView(!showTableView)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label={showTableView ? 'Switch to Donut Chart View' : 'Switch to Accessible Table View'}
            >
              {showTableView ? <PieChart className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
              {showTableView ? 'Chart View' : 'Table View'}
            </button>
          </div>
        </div>

        {/* Budget Slider */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400 mb-1.5">
            <span>Budget Scale</span>
            <span className="font-mono tabular-nums">{formatINR(totalBudget)}</span>
          </div>
          <input
            type="range"
            min={Math.max(50000, Math.round(totalBudget * 0.4))}
            max={Math.round(totalBudget * 2.2)}
            step={10000}
            value={totalBudget}
            onChange={(e) => handleTotalBudgetChange(Number(e.target.value))}
            className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#F5A623]"
            aria-label="Adjust total celebration budget"
          />
          <div className="flex justify-between text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            <span>Min: {formatINR(Math.max(50000, Math.round(totalBudget * 0.4)), true)}</span>
            <span className="italic">Locked categories retain their rupee amount</span>
            <span>Max: {formatINR(Math.round(totalBudget * 2.2), true)}</span>
          </div>
        </div>
      </div>

      {/* Main Budget Display */}
      {showTableView ? (
        /* Accessible Text Table View */
        <div className="bg-white dark:bg-[#23152C] rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Detailed Budget Breakdown Table
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Screen reader & high contrast view
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Category</th>
                  <th scope="col" className="py-3 px-4 text-right">Share (%)</th>
                  <th scope="col" className="py-3 px-4 text-right">Amount (INR)</th>
                  <th scope="col" className="py-3 px-4 text-center">Lock Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {budget.map((item, idx) => {
                  const amount = item.amount || Math.round((item.pct / 100) * totalBudget);
                  return (
                    <tr key={item.category} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                        {item.pct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#3B1F4A] dark:text-[#FFF8EE]">
                        {formatINR(amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleLock(item.category)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            item.locked
                              ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                          }`}
                          aria-label={`${item.locked ? 'Unlock' : 'Lock'} budget for ${item.category}`}
                        >
                          {item.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          {item.locked ? 'Locked' : 'Unlocked'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {budget.length > 2 && (
                          <button
                            onClick={() => handleDeleteCategory(item.category)}
                            className="p-1 rounded text-stone-400 hover:text-red-500 transition-colors"
                            title={`Remove ${item.category}`}
                            aria-label={`Remove category ${item.category}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-50/80 dark:bg-stone-900/80 font-semibold border-t border-stone-200 dark:border-stone-800">
                <tr>
                  <td className="py-3 px-4 text-stone-900 dark:text-stone-100">Total</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{totalAllocatedPct}%</td>
                  <td className="py-3 px-4 text-right font-mono text-[#F5A623] tabular-nums">{formatINR(totalBudget)}</td>
                  <td className="py-3 px-4 text-center text-xs text-stone-400">{lockedCount} Locked</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Donut Chart + Interactive Category List */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Donut Chart Container */}
          <div className="lg:col-span-5 bg-white/90 dark:bg-[#23152C]/90 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800 flex flex-col items-center justify-center shadow-xs">
            <DonutChart
              slices={slices}
              totalBudget={totalBudget}
              guests={guests}
            />
            <div className="text-center text-xs text-stone-500 dark:text-stone-400 mt-2 px-2">
              Hover over or tap any slice to inspect category allocation.
            </div>
          </div>

          {/* Category Cards List */}
          <div className="lg:col-span-7 space-y-2.5">
            {budget.map((item, idx) => {
              const amount = item.amount || Math.round((item.pct / 100) * totalBudget);
              const color = PALETTE[idx % PALETTE.length];

              return (
                <div
                  key={item.category}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.locked
                      ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-[#F5A623]/40 shadow-xs'
                      : 'bg-white dark:bg-[#23152C] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stepper buttons for unlocked items */}
                      {!item.locked && (
                        <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg mr-1">
                          <button
                            onClick={() => handleStepPercentage(item.category, -1)}
                            className="p-1 rounded text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-700 transition-colors"
                            title="Decrease allocation by 1%"
                            aria-label={`Decrease allocation for ${item.category} by 1%`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStepPercentage(item.category, 1)}
                            className="p-1 rounded text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white dark:hover:bg-stone-700 transition-colors"
                            title="Increase allocation by 1%"
                            aria-label={`Increase allocation for ${item.category} by 1%`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="text-right">
                        <div className="text-sm font-semibold font-mono text-[#3B1F4A] dark:text-[#FFF8EE] tabular-nums">
                          {formatINR(amount)}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                          {item.pct}%
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleLock(item.category)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          item.locked
                            ? 'bg-[#3B1F4A] text-[#F5A623] dark:bg-[#F5A623] dark:text-stone-950'
                            : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400'
                        }`}
                        title={item.locked ? 'Locked: Keeps fixed rupee amount when total budget changes' : 'Unlocked: Proportional share'}
                        aria-label={`${item.locked ? 'Unlock' : 'Lock'} ${item.category}`}
                      >
                        {item.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>

                      {budget.length > 2 && (
                        <button
                          onClick={() => handleDeleteCategory(item.category)}
                          className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove category"
                          aria-label={`Remove category ${item.category}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, item.pct)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#23152C] rounded-2xl max-w-sm w-full p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Add Budget Category
            </h3>
            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Return Favors, Fireworks, Mehendi"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Initial Share: {newCategoryPct}% ({formatINR(Math.round((newCategoryPct / 100) * totalBudget))})
                </label>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={newCategoryPct}
                  onChange={(e) => setNewCategoryPct(Number(e.target.value))}
                  className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#F5A623]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
