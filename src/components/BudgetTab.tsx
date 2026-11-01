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
  AlertTriangle,
  Receipt,
  CheckCircle,
  X,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import type { BudgetItem, EventDay, PaymentRecord, PlanDiff } from '../types/plan.ts';
import { DonutChart } from './DonutChart.tsx';
import {
  formatINR,
  recalculateBudgetWithLocked,
  normalizeBudgetPercentages,
  adjustCategoryPercentage,
  addBudgetCategory,
  removeBudgetCategory,
  deriveBudgetItemSpent,
  getCategoryOverrun,
  proposeRebalanceForOverrun,
} from '../utils/planLogic.ts';

export interface BudgetTabProps {
  budget: BudgetItem[];
  totalBudget: number;
  guests: number;
  onUpdateBudget: (newBudget: BudgetItem[], newTotal: number) => void;
  eventDays?: EventDay[];
  payments?: PaymentRecord[];
  onLogPayment?: (payment: Omit<PaymentRecord, 'id'>) => void;
  onDeletePayment?: (id: string) => void;
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

interface ActiveRebalanceProposal {
  category: string;
  proposedBudget: BudgetItem[];
  diffs: PlanDiff[];
}

export const BudgetTab: React.FC<BudgetTabProps> = ({
  budget,
  totalBudget,
  guests,
  onUpdateBudget,
  eventDays = [],
  payments = [],
  onLogPayment,
  onDeletePayment,
}) => {
  const [showTableView, setShowTableView] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'categories' | 'days'>('categories');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPct, setNewCategoryPct] = useState(10);

  // Log Payment modal state
  const [activePaymentCategory, setActivePaymentCategory] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Active Rebalance Proposal modal/drawer state
  const [activeProposal, setActiveProposal] = useState<ActiveRebalanceProposal | null>(null);
  const [rebalanceMessage, setRebalanceMessage] = useState<string | null>(null);

  // View payments drawer for a category
  const [expandedPaymentsCategory, setExpandedPaymentsCategory] = useState<string | null>(null);

  // Derive budget items with spent values from payments array
  const effectiveBudget = deriveBudgetItemSpent(budget, payments);

  // Calculate totals
  const totalPlanned = effectiveBudget.reduce(
    (sum, b) => sum + (b.amount ?? Math.round(((b.pct || 0) / 100) * totalBudget)),
    0
  );
  const totalSpent = effectiveBudget.reduce((sum, b) => sum + (b.spent ?? 0), 0);
  const totalRemaining = totalPlanned - totalSpent;
  const isOverallOverBudget = totalSpent > totalPlanned;

  // Toggle lock on an item
  const handleToggleLock = (category: string) => {
    const updated = effectiveBudget.map((b) => {
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
    const recalculated = recalculateBudgetWithLocked(effectiveBudget, newTotal);
    onUpdateBudget(recalculated, newTotal);
  };

  // "What if -20%?" button
  const handleWhatIfReduction = () => {
    const reducedTotal = Math.round(totalBudget * 0.8);
    const recalculated = recalculateBudgetWithLocked(effectiveBudget, reducedTotal);
    onUpdateBudget(recalculated, reducedTotal);
  };

  // "What if +20%?" button
  const handleWhatIfExpansion = () => {
    const expandedTotal = Math.round(totalBudget * 1.2);
    const recalculated = recalculateBudgetWithLocked(effectiveBudget, expandedTotal);
    onUpdateBudget(recalculated, expandedTotal);
  };

  // Reset to original proportion
  const handleUnlockAll = () => {
    const unlocked = effectiveBudget.map((b) => ({ ...b, locked: false }));
    onUpdateBudget(normalizeBudgetPercentages(unlocked, totalBudget), totalBudget);
  };

  // Adjust percentage stepper
  const handleStepPercentage = (category: string, delta: number) => {
    const updated = adjustCategoryPercentage(effectiveBudget, category, delta, totalBudget);
    onUpdateBudget(updated, totalBudget);
  };

  // Add custom category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const updated = addBudgetCategory(effectiveBudget, newCategoryName.trim(), Number(newCategoryPct) || 10, totalBudget);
    onUpdateBudget(updated, totalBudget);
    setNewCategoryName('');
    setShowAddModal(false);
  };

  // Delete category
  const handleDeleteCategory = (category: string) => {
    const updated = removeBudgetCategory(effectiveBudget, category, totalBudget);
    onUpdateBudget(updated, totalBudget);
  };

  // Open Log Payment form for category
  const handleOpenPaymentForm = (category: string) => {
    setActivePaymentCategory(category);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentError(null);
  };

  // Submit payment
  const handleLogPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentCategory) return;

    const parsedAmount = parseInt(paymentAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setPaymentError('Payment amount must be a positive whole number.');
      return;
    }

    if (parsedAmount > totalBudget) {
      setPaymentError(`Payment cannot exceed total celebration budget (${formatINR(totalBudget)}).`);
      return;
    }

    if (onLogPayment) {
      onLogPayment({
        category: activePaymentCategory,
        amount: parsedAmount,
        note: paymentNote.trim(),
        date: paymentDate || new Date().toISOString().slice(0, 10),
      });
    }

    setActivePaymentCategory(null);
  };

  // Handle rebalance click for overrun category
  const handleRebalanceClick = (category: string, overrunAmount: number) => {
    setRebalanceMessage(null);
    const proposal = proposeRebalanceForOverrun(effectiveBudget, totalBudget, category, overrunAmount);
    if (!proposal || proposal.diffs.length === 0) {
      setRebalanceMessage(
        `Unable to rebalance automatically: all other categories are either locked or have no unspent budget. Unlock categories or increase the celebration budget.`
      );
      setActiveProposal(null);
      return;
    }

    setActiveProposal({
      category,
      proposedBudget: proposal.proposedBudget,
      diffs: proposal.diffs,
    });
  };

  // Confirm and apply rebalance
  const handleConfirmRebalance = () => {
    if (!activeProposal) return;
    onUpdateBudget(activeProposal.proposedBudget, totalBudget);
    setActiveProposal(null);
    setRebalanceMessage(null);
  };

  // Prepare slices for DonutChart
  const slices = effectiveBudget.map((b, idx) => ({
    label: b.category,
    pct: b.pct,
    amount: b.amount || Math.round((b.pct / 100) * totalBudget),
    color: PALETTE[idx % PALETTE.length],
    locked: b.locked,
  }));

  const lockedCount = effectiveBudget.filter((b) => b.locked).length;
  const totalAllocatedPct = Math.round(effectiveBudget.reduce((acc, b) => acc + b.pct, 0) * 10) / 10;

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

            {eventDays.length > 0 && (
              <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('categories')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeViewMode === 'categories'
                      ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('days')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeViewMode === 'days'
                      ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Day-by-Day ({eventDays.length} Days)
                </button>
              </div>
            )}

            {lockedCount > 0 && (
              <button
                onClick={handleUnlockAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock All ({lockedCount})
              </button>
            )}

            {activeViewMode === 'categories' && (
              <button
                onClick={() => setShowTableView(!showTableView)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label={showTableView ? 'Switch to Donut Chart View' : 'Switch to Accessible Table View'}
              >
                {showTableView ? <PieChart className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
                {showTableView ? 'Chart View' : 'Table View'}
              </button>
            )}
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
            aria-valuenow={totalBudget}
            aria-valuemin={Math.max(50000, Math.round(totalBudget * 0.4))}
            aria-valuemax={Math.round(totalBudget * 2.2)}
            aria-valuetext={formatINR(totalBudget)}
          />
          <div className="flex justify-between text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            <span>Min: {formatINR(Math.max(50000, Math.round(totalBudget * 0.4)), true)}</span>
            <span className="italic">Locked categories retain their rupee amount</span>
            <span>Max: {formatINR(Math.round(totalBudget * 2.2), true)}</span>
          </div>
        </div>
      </div>

      {/* Money & Spend Totals Summary Ribbon */}
      <div className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 block">
              Total Planned
            </span>
            <span className="text-lg font-bold font-mono text-[#3B1F4A] dark:text-[#FFF8EE] tabular-nums mt-0.5 block">
              {formatINR(totalPlanned)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 block">
              Total Spent
            </span>
            <span className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 tabular-nums mt-0.5 block">
              {formatINR(totalSpent)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 block">
              Total Remaining
            </span>
            <span
              className={`text-lg font-bold font-mono tabular-nums mt-0.5 block ${
                totalRemaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {totalRemaining < 0 ? `-₹${Math.abs(totalRemaining).toLocaleString('en-IN')}` : formatINR(totalRemaining)}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex flex-col justify-center ${
              isOverallOverBudget
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 block">
              Overall Status
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
              {isOverallOverBudget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">
                    Over budget
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    On track
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rebalance Warning / Notification Banner */}
      {rebalanceMessage && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>{rebalanceMessage}</p>
          </div>
          <button
            onClick={() => setRebalanceMessage(null)}
            className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rebalance Proposal Confirmation Box */}
      {activeProposal && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-[#331C38] border-2 border-[#F5A623] shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#F5A623] text-stone-950">
                <Receipt className="w-4 h-4" />
              </span>
              <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                Rebalance Proposal for {activeProposal.category}
              </h4>
            </div>
            <button
              onClick={() => setActiveProposal(null)}
              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500"
              aria-label="Dismiss rebalance proposal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-300">
            Moving money from categories with unlocked, unspent surplus to cover this overrun without altering your total celebration budget:
          </p>

          {/* Diff Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {activeProposal.diffs.map((diff, dIdx) => (
              <span
                key={dIdx}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  diff.badge?.startsWith('+')
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                <span>{diff.badge}</span>
                <span className="text-stone-500">·</span>
                <span>{diff.summary}</span>
              </span>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setActiveProposal(null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRebalance}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer shadow-xs"
            >
              Confirm & Apply Rebalance
            </button>
          </div>
        </div>
      )}

      {/* Main Budget Display */}
      {activeViewMode === 'days' && eventDays.length > 0 ? (
        /* Day-by-Day Allocation View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {eventDays.map((day) => {
              const dayItems = effectiveBudget.filter((b) => b.day_number === day.day_number);
              const dayItemsTotal = dayItems.reduce(
                (acc, it) => acc + (it.amount || Math.round((it.pct / 100) * totalBudget)),
                0
              );
              const targetAlloc = day.budget_allocated || dayItemsTotal;
              const pctOfBudget = totalBudget > 0 ? Math.round((targetAlloc / totalBudget) * 100) : 0;

              return (
                <div
                  key={day.id}
                  className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950">
                      Day {day.day_number}
                    </span>
                    <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100">
                      {formatINR(targetAlloc)} ({pctOfBudget}%)
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                      {day.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {day.venue || 'Venue to be confirmed'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F5A623] rounded-full"
                      style={{ width: `${Math.min(100, pctOfBudget)}%` }}
                    />
                  </div>

                  {/* Categories assigned to this day */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase text-stone-400 block">
                      Assigned Categories ({dayItems.length})
                    </span>
                    {dayItems.length === 0 ? (
                      <p className="text-[11px] text-stone-400 italic">No budget categories tagged to Day {day.day_number}</p>
                    ) : (
                      dayItems.map((item) => (
                        <div key={item.category} className="flex items-center justify-between text-xs py-1">
                          <span className="text-stone-700 dark:text-stone-300 truncate">{item.category}</span>
                          <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                            {formatINR(item.amount || Math.round((item.pct / 100) * totalBudget))}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shared / General Categories */}
          {effectiveBudget.some((b) => !b.day_number) && (
            <div className="bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
                Shared & Overall Celebration Categories (Hospitality, Buffers, Multi-day Photographers)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {effectiveBudget.filter((b) => !b.day_number).map((item) => (
                  <div key={item.category} className="p-2.5 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <span className="truncate pr-2">{item.category}</span>
                    <span className="font-mono font-bold">{formatINR(item.amount || Math.round((item.pct / 100) * totalBudget))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : showTableView ? (
        /* Accessible Text Table View */
        <div className="bg-white dark:bg-[#23152C] rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Detailed Budget Breakdown Table
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Planned, Spent, and Remaining spend tracker
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Category</th>
                  <th scope="col" className="py-3 px-4 text-right">Share (%)</th>
                  <th scope="col" className="py-3 px-4 text-right">Planned</th>
                  <th scope="col" className="py-3 px-4 text-right">Spent</th>
                  <th scope="col" className="py-3 px-4 text-right">Remaining</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-center">Lock</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {effectiveBudget.map((item, idx) => {
                  const planned = item.amount || Math.round((item.pct / 100) * totalBudget);
                  const spent = item.spent || 0;
                  const remaining = planned - spent;
                  const { isOverrun, overrunAmount } = getCategoryOverrun(item, totalBudget);

                  return (
                    <tr key={item.category} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <span>{item.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                        {item.pct}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#3B1F4A] dark:text-[#FFF8EE]">
                        {formatINR(planned)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-900 dark:text-stone-100">
                        {formatINR(spent)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${
                          remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {remaining < 0 ? `-₹${Math.abs(remaining).toLocaleString('en-IN')}` : formatINR(remaining)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOverrun ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                              Over budget by {formatINR(overrunAmount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRebalanceClick(item.category, overrunAmount)}
                              className="text-[11px] font-semibold text-[#B45309] dark:text-[#F5A623] hover:underline cursor-pointer"
                            >
                              Rebalance
                            </button>
                          </div>
                        ) : remaining === 0 && spent > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                            Fully spent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            On track
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleLock(item.category)}
                          aria-pressed={item.locked}
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
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentForm(item.category)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-[#B45309] dark:text-[#F5A623] transition-colors cursor-pointer"
                            title={`Log payment for ${item.category}`}
                          >
                            + Payment
                          </button>
                          {effectiveBudget.length > 2 && (
                            <button
                              onClick={() => handleDeleteCategory(item.category)}
                              className="p-1 rounded text-stone-400 hover:text-red-500 transition-colors"
                              title={`Remove ${item.category}`}
                              aria-label={`Remove category ${item.category}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-50/80 dark:bg-stone-900/80 font-semibold border-t border-stone-200 dark:border-stone-800">
                <tr>
                  <td className="py-3 px-4 text-stone-900 dark:text-stone-100">Total</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{totalAllocatedPct}%</td>
                  <td className="py-3 px-4 text-right font-mono text-[#F5A623] tabular-nums">{formatINR(totalPlanned)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(totalSpent)}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums ${
                      totalRemaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {totalRemaining < 0 ? `-₹${Math.abs(totalRemaining).toLocaleString('en-IN')}` : formatINR(totalRemaining)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-bold ${isOverallOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isOverallOverBudget ? 'Over budget' : 'On track'}
                    </span>
                  </td>
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
          <div className="lg:col-span-7 space-y-3">
            {effectiveBudget.map((item, idx) => {
              const planned = item.amount || Math.round((item.pct / 100) * totalBudget);
              const spent = item.spent || 0;
              const remaining = planned - spent;
              const { isOverrun, overrunAmount } = getCategoryOverrun(item, totalBudget);
              const color = PALETTE[idx % PALETTE.length];
              const pctSpent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
              const categoryPayments = payments.filter(
                (p) => p.category.trim().toLowerCase() === item.category.trim().toLowerCase()
              );
              const isPaymentsExpanded = expandedPaymentsCategory === item.category;

              return (
                <div
                  key={item.category}
                  className={`p-4 rounded-xl border transition-colors ${
                    isOverrun
                      ? 'bg-red-500/[0.04] dark:bg-red-500/[0.06] border-red-500/40 shadow-xs'
                      : item.locked
                      ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-[#F5A623]/40 shadow-xs'
                      : 'bg-white dark:bg-[#23152C] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {item.category}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                            ({item.pct}%)
                          </span>
                        </div>
                        {categoryPayments.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPaymentsCategory(isPaymentsExpanded ? null : item.category)
                            }
                            className="text-[11px] text-[#B45309] dark:text-[#F5A623] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>
                              {categoryPayments.length} {categoryPayments.length === 1 ? 'payment' : 'payments'} logged
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Log payment trigger */}
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentForm(item.category)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#B45309] dark:text-[#F5A623] border border-[#F5A623]/30 transition-colors cursor-pointer"
                        title="Log a payment for this category"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Log Payment</span>
                      </button>

                      {/* Stepper buttons for unlocked items */}
                      {!item.locked && (
                        <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
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

                      <button
                        onClick={() => handleToggleLock(item.category)}
                        aria-pressed={item.locked}
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

                      {effectiveBudget.length > 2 && (
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

                  {/* Planned, Spent, Remaining Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-400 block">Planned</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatINR(planned)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-400 block">Spent</span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                        {formatINR(spent)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-400 block">Remaining</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {remaining < 0 ? `-₹${Math.abs(remaining).toLocaleString('en-IN')}` : formatINR(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with explicit non-color text labels */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500 dark:text-stone-400 font-medium">
                        {pctSpent}% spent
                      </span>
                      {isOverrun ? (
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Over budget by {formatINR(overrunAmount)}
                        </span>
                      ) : remaining === 0 && spent > 0 ? (
                        <span className="font-medium text-stone-600 dark:text-stone-400">
                          Fully spent
                        </span>
                      ) : (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {formatINR(remaining)} remaining
                        </span>
                      )}
                    </div>

                    <div
                      role="progressbar"
                      aria-label={`Budget spending progress for ${item.category}`}
                      aria-valuenow={spent}
                      aria-valuemin={0}
                      aria-valuemax={planned}
                      aria-valuetext={`${formatINR(spent)} spent of ${formatINR(planned)} planned`}
                      className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverrun ? 'bg-red-500' : ''
                        }`}
                        style={{
                          width: `${Math.min(100, pctSpent)}%`,
                          backgroundColor: isOverrun ? '#EF4444' : color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Overrun Warning & Rebalance Action */}
                  {isOverrun && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="text-red-900 dark:text-red-200 font-medium truncate">
                          Spent exceeds planned by {formatINR(overrunAmount)}.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRebalanceClick(item.category, overrunAmount)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                      >
                        <span>Rebalance</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Expandable Category Payments List */}
                  {isPaymentsExpanded && categoryPayments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
                        <span>Logged Payments</span>
                        <span>Total: {formatINR(spent)}</span>
                      </div>
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {categoryPayments.map((p) => (
                          <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                                {formatINR(p.amount)}
                              </span>
                              {p.note && <span className="text-stone-500 ml-2">{p.note}</span>}
                              <span className="text-[10px] text-stone-400 block font-mono">{p.date}</span>
                            </div>
                            {onDeletePayment && (
                              <button
                                type="button"
                                onClick={() => onDeletePayment(p.id)}
                                className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                title="Delete payment entry"
                                aria-label={`Delete payment of ${formatINR(p.amount)}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {activePaymentCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#23152C] rounded-2xl max-w-sm w-full p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                Log Payment
              </h3>
              <button
                type="button"
                onClick={() => setActivePaymentCategory(null)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              Record a payment disbursed for{' '}
              <strong className="text-stone-900 dark:text-stone-100 font-semibold">{activePaymentCategory}</strong>.
            </p>

            {paymentError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleLogPaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Amount in INR (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={totalBudget}
                  step="1"
                  placeholder="e.g. 25000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Booking Advance 20%, Raw material deposit"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePaymentCategory(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer"
                >
                  Save Payment
                </button>
              </div>
            </form>
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
