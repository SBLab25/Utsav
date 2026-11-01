/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BudgetItem, EventPlan, PlanDiff, TimelineTask, PlanPatch, EventDay, VendorQuote, VendorRequirement, PaymentRecord, RunSheetItem } from '../types/plan.ts';
import { eventPlanSchema } from '../schemas/plan.ts';
import { planChangeSchema, type PlanChange } from '../schemas/changes.ts';

/**
 * Format Indian Rupee currency with standard Indian numbering system (lakhs & crores)
 */
export function formatINR(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const clean = Math.round(amount);
  const isNegative = clean < 0;
  const absClean = Math.abs(clean);

  if (compact) {
    const prefix = isNegative ? '-' : '';
    if (absClean >= 10000000) {
      return `${prefix}₹${(absClean / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }
    if (absClean >= 100000) {
      return `${prefix}₹${(absClean / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (absClean >= 1000) {
      return `${prefix}₹${(absClean / 1000).toFixed(0)}k`;
    }
    return `${prefix}₹${absClean}`;
  }

  // Full Indian number format: 12,34,567
  const absStr = Math.abs(clean).toString();
  let lastThree = absStr.substring(absStr.length - 3);
  const otherNumbers = absStr.substring(0, absStr.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Enforces that budget percentages strictly sum to 100, and calculates exact rupee amounts.
 */
export function normalizeBudgetPercentages(items: BudgetItem[], totalBudget: number): BudgetItem[] {
  if (!items || items.length === 0) return [];

  const rawSum = items.reduce((acc, it) => acc + (Number(it.pct) || 0), 0);
  const safeSum = rawSum > 0 ? rawSum : items.length;

  // First pass: compute proportional percentages rounded to 1 decimal place
  let roundedItems = items.map((it) => {
    const rawRatio = rawSum > 0 ? (Number(it.pct) || 0) / safeSum : 1 / items.length;
    const pct = Math.round(rawRatio * 1000) / 10; // 1 decimal place
    return {
      ...it,
      pct,
      locked: Boolean(it.locked),
    };
  });

  // Calculate sum of rounded percentages
  let sumPct = Math.round(roundedItems.reduce((acc, it) => acc + it.pct, 0) * 10) / 10;
  let diff = Math.round((100 - sumPct) * 10) / 10;

  // Distribute any rounding difference to the first unlocked item (or first item if all locked)
  if (Math.abs(diff) > 0.001) {
    const targetIdx = roundedItems.findIndex((it) => !it.locked);
    const adjustIdx = targetIdx >= 0 ? targetIdx : 0;
    roundedItems[adjustIdx] = {
      ...roundedItems[adjustIdx],
      pct: Math.round((roundedItems[adjustIdx].pct + diff) * 10) / 10,
    };
  }

  // Final pass: calculate rupee amounts and ensure whole percentage display
  return roundedItems.map((it) => {
    const amount = Math.round((it.pct / 100) * totalBudget);
    return {
      ...it,
      amount,
    };
  });
}

/**
 * When total budget changes or "What if -20%" is clicked:
 * Locked categories preserve their exact rupee amount.
 * Unlocked categories share the remaining rupee amount proportionally.
 * Percentages are updated and strictly sum to 100%.
 */
export function recalculateBudgetWithLocked(
  currentItems: BudgetItem[],
  newTotalBudget: number
): BudgetItem[] {
  if (!currentItems || currentItems.length === 0) return [];
  const safeTotal = Math.max(1000, Math.round(newTotalBudget));

  // Determine existing rupee amount for each item
  const itemsWithAmounts = currentItems.map((it) => {
    const currentAmount =
      typeof it.amount === 'number' && it.amount > 0
        ? it.amount
        : Math.round(((it.pct || 0) / 100) * safeTotal);
    return {
      ...it,
      amount: currentAmount,
      locked: Boolean(it.locked),
    };
  });

  const lockedItems = itemsWithAmounts.filter((it) => it.locked);
  const unlockedItems = itemsWithAmounts.filter((it) => !it.locked);

  const lockedAmountSum = lockedItems.reduce((acc, it) => acc + (it.amount || 0), 0);

  // If locked amounts already exceed or equal the new budget, cap locked items proportionately
  if (lockedAmountSum >= safeTotal) {
    const scale = safeTotal / (lockedAmountSum || 1);
    return itemsWithAmounts.map((it) => {
      const scaledAmount = it.locked ? Math.round((it.amount || 0) * scale) : 0;
      const pct = Math.round((scaledAmount / safeTotal) * 1000) / 10;
      return {
        ...it,
        amount: scaledAmount,
        pct,
      };
    });
  }

  const remainingBudget = safeTotal - lockedAmountSum;
  const unlockedWeightsSum = unlockedItems.reduce((acc, it) => acc + (Number(it.pct) || 0), 0);
  const safeUnlockedSum = unlockedWeightsSum > 0 ? unlockedWeightsSum : unlockedItems.length;

  const updatedItems = itemsWithAmounts.map((it) => {
    if (it.locked) {
      const pct = Math.round(((it.amount || 0) / safeTotal) * 1000) / 10;
      return {
        ...it,
        pct,
      };
    } else {
      const weightRatio =
        unlockedWeightsSum > 0 ? (Number(it.pct) || 0) / safeUnlockedSum : 1 / unlockedItems.length;
      const amount = Math.round(weightRatio * remainingBudget);
      const pct = Math.round((amount / safeTotal) * 1000) / 10;
      return {
        ...it,
        amount,
        pct,
      };
    }
  });

  return normalizeBudgetPercentages(updatedItems, safeTotal);
}

/**
 * Sorts run sheet items strictly by time (HH:MM ascending).
 */
export function sortRunSheet(items: RunSheetItem[]): RunSheetItem[] {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/**
 * Generates sensible default time-ordered run sheet items for the celebration day.
 */
export function generateDefaultRunSheet(eventType?: string): RunSheetItem[] {
  const type = (eventType || '').toLowerCase();
  const isSangeet = type.includes('sangeet') || type.includes('dance') || type.includes('music');

  if (isSangeet) {
    return [
      { id: 'rs-1', time: '14:00', title: 'AV & Sound Setup with DJ Tech Lead', owner: 'DJ Team' },
      { id: 'rs-2', time: '16:00', title: 'Lighting & Stage Backdrop Final Check', owner: 'Decorator' },
      { id: 'rs-3', time: '17:30', title: 'Family Dance Soundcheck & MC Walkthrough', owner: 'Choreographer' },
      { id: 'rs-4', time: '18:30', title: 'Welcome Drinks & Live Chaat Counter Opens', owner: 'Catering Lead' },
      { id: 'rs-5', time: '19:30', title: 'Guest Seating & Emcee Welcome Address', owner: 'Emcee' },
      { id: 'rs-6', time: '20:00', title: 'Family Choreographed Performances & Dance Battles', owner: 'Family Host' },
      { id: 'rs-7', time: '21:30', title: 'Grand Dinner Buffet Served', owner: 'Head Chef' },
      { id: 'rs-8', time: '22:30', title: 'Open Dance Floor & Celebration Beats', owner: 'DJ Team' },
      { id: 'rs-9', time: '23:45', title: 'Wrap-up & Vendor Settlement Sign-off', owner: 'Event Coordinator' },
    ];
  }

  return [
    { id: 'rs-1', time: '08:00', title: 'Vendor Entry & Setup Commences', owner: 'Venue Manager' },
    { id: 'rs-2', time: '10:00', title: 'Stage, AV & Seating Inspection', owner: 'Event Coordinator' },
    { id: 'rs-3', time: '11:30', title: 'Core Family & VIP Arrival Briefing', owner: 'Family Host' },
    { id: 'rs-4', time: '13:00', title: 'Welcome Lunch / Refreshments Service', owner: 'Catering Head' },
    { id: 'rs-5', time: '16:30', title: 'Final Technical & Audio Checks', owner: 'AV Lead' },
    { id: 'rs-6', time: '18:00', title: 'Guest Welcome Desk Opens', owner: 'Hospitality Team' },
    { id: 'rs-7', time: '19:00', title: 'Main Celebration Ceremony & Speeches', owner: 'Emcee' },
    { id: 'rs-8', time: '20:30', title: 'Dinner Buffet & Live Counters Open', owner: 'Catering Supervisor' },
    { id: 'rs-9', time: '22:00', title: 'Celebratory Toasts & Cake Cutting', owner: 'Host Family' },
    { id: 'rs-10', time: '23:00', title: 'Event Concludes & Logistics Teardown', owner: 'Event Coordinator' },
  ];
}

/**
 * Calculates total spent per category by summing payments recorded for that category.
 */
export function calculateSpentByCategory(payments: PaymentRecord[] = []): Record<string, number> {
  const map: Record<string, number> = {};
  if (!Array.isArray(payments)) return map;
  for (const p of payments) {
    if (!p || typeof p.amount !== 'number' || isNaN(p.amount)) continue;
    const key = (p.category || '').trim().toLowerCase();
    map[key] = (map[key] || 0) + p.amount;
  }
  return map;
}

/**
 * Derives each budget item's `spent` field from the plan's payments array.
 */
export function deriveBudgetItemSpent(
  budget: BudgetItem[],
  payments: PaymentRecord[] = []
): BudgetItem[] {
  if (!Array.isArray(budget)) return [];
  const spentMap = calculateSpentByCategory(payments);

  return budget.map((item) => {
    const key = (item.category || '').trim().toLowerCase();
    const paymentsSpent = spentMap[key];
    const spent = typeof paymentsSpent === 'number' ? paymentsSpent : (item.spent ?? 0);
    return {
      ...item,
      spent,
    };
  });
}

/**
 * Detects whether a budget category has overrun its planned allocation and by how much.
 */
export function getCategoryOverrun(
  item: BudgetItem,
  totalBudget: number
): { isOverrun: boolean; overrunAmount: number } {
  const planned = item.amount ?? Math.round(((item.pct || 0) / 100) * totalBudget);
  const spent = item.spent ?? 0;
  const overrunAmount = Math.max(0, spent - planned);
  return {
    isOverrun: overrunAmount > 0,
    overrunAmount,
  };
}

/**
 * Proposes a rebalance when a category is overrun by moving money from categories with unspent, unlocked budget.
 * Strictly respects locks (locked categories are never touched).
 */
export function proposeRebalanceForOverrun(
  budget: BudgetItem[],
  totalBudget: number,
  overrunCategory: string,
  overrunAmount: number
): { proposedBudget: BudgetItem[]; diffs: PlanDiff[] } | null {
  if (!budget || budget.length === 0 || overrunAmount <= 0) return null;

  const targetIndex = budget.findIndex(
    (b) => b.category.trim().toLowerCase() === overrunCategory.trim().toLowerCase()
  );
  if (targetIndex < 0) return null;

  const target = budget[targetIndex];
  const targetPlanned = target.amount ?? Math.round(((target.pct || 0) / 100) * totalBudget);

  // Eligible donors:
  // 1. Not the overrun category itself
  // 2. Unlocked (item.locked === false)
  // 3. Have unspent budget: planned > spent
  const donorsWithSurplus = budget
    .map((item, index) => {
      if (index === targetIndex || item.locked) return null;
      const planned = item.amount ?? Math.round(((item.pct || 0) / 100) * totalBudget);
      const spent = item.spent ?? 0;
      const surplus = Math.max(0, planned - spent);
      return { index, item, planned, spent, surplus };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && d.surplus > 0);

  const totalAvailableSurplus = donorsWithSurplus.reduce((acc, d) => acc + d.surplus, 0);
  if (totalAvailableSurplus <= 0) {
    return null; // Cannot rebalance without touching locked or already-spent budget
  }

  // Amount to move cannot exceed available surplus
  const amountToMove = Math.min(overrunAmount, totalAvailableSurplus);
  if (amountToMove <= 0) return null;

  // Clone budget items with initialized amounts
  const newBudget = budget.map((b) => ({
    ...b,
    amount: b.amount ?? Math.round(((b.pct || 0) / 100) * totalBudget),
  }));

  // Distribute reduction proportionally among eligible donors
  let remainingToDeduct = amountToMove;
  const diffs: PlanDiff[] = [];

  for (let i = 0; i < donorsWithSurplus.length; i++) {
    const donor = donorsWithSurplus[i];
    const isLast = i === donorsWithSurplus.length - 1;
    const share = isLast
      ? remainingToDeduct
      : Math.min(
          donor.surplus,
          Math.round((donor.surplus / totalAvailableSurplus) * amountToMove)
        );

    const actualDeduction = Math.min(share, remainingToDeduct);
    remainingToDeduct -= actualDeduction;

    const newAmount = Math.max(donor.spent, (newBudget[donor.index].amount ?? donor.planned) - actualDeduction);
    newBudget[donor.index].amount = newAmount;
    newBudget[donor.index].pct = Math.round((newAmount / totalBudget) * 1000) / 10;

    diffs.push({
      type: 'budget',
      summary: `Moved ₹${actualDeduction.toLocaleString('en-IN')} from ${donor.item.category}`,
      badge: `-₹${actualDeduction.toLocaleString('en-IN')}`,
      changeType: 'modified',
    });
  }

  // Increase target category
  const newTargetAmount = (newBudget[targetIndex].amount ?? targetPlanned) + amountToMove;
  newBudget[targetIndex].amount = newTargetAmount;
  newBudget[targetIndex].pct = Math.round((newTargetAmount / totalBudget) * 1000) / 10;

  diffs.unshift({
    type: 'budget',
    summary: `Added ₹${amountToMove.toLocaleString('en-IN')} to ${target.category}`,
    badge: `+₹${amountToMove.toLocaleString('en-IN')}`,
    changeType: 'modified',
  });

  // Ensure pct sums to 100 without overriding exact rupee amounts
  const sumPct = Math.round(newBudget.reduce((acc, it) => acc + (it.pct || 0), 0) * 10) / 10;
  const pctDiff = Math.round((100 - sumPct) * 10) / 10;
  if (Math.abs(pctDiff) > 0.001) {
    const adjustIdx = newBudget.findIndex((b) => !b.locked);
    const targetAdjust = adjustIdx >= 0 ? adjustIdx : 0;
    newBudget[targetAdjust] = {
      ...newBudget[targetAdjust],
      pct: Math.round((newBudget[targetAdjust].pct + pctDiff) * 10) / 10,
    };
  }

  return {
    proposedBudget: newBudget,
    diffs,
  };
}

/**
 * Adjust an individual category percentage (+/- delta) and distribute the difference across other unlocked items.
 * Enforces sum of percentages === 100%.
 */
export function adjustCategoryPercentage(
  items: BudgetItem[],
  categoryName: string,
  deltaPct: number,
  totalBudget: number
): BudgetItem[] {
  const target = items.find((i) => i.category === categoryName);
  if (!target) return items;

  const otherUnlocked = items.filter((i) => i.category !== categoryName && !i.locked);
  if (otherUnlocked.length === 0) return items; // Cannot adjust if all others locked

  const newTargetPct = Math.max(1, Math.min(90, Math.round((target.pct + deltaPct) * 10) / 10));
  const actualDelta = newTargetPct - target.pct;
  if (Math.abs(actualDelta) < 0.01) return items;

  const otherSum = otherUnlocked.reduce((sum, it) => sum + it.pct, 0);
  const updated = items.map((it) => {
    if (it.category === categoryName) {
      return { ...it, pct: newTargetPct };
    }
    if (!it.locked) {
      const share = otherSum > 0 ? it.pct / otherSum : 1 / otherUnlocked.length;
      const reducedPct = Math.max(1, it.pct - actualDelta * share);
      return { ...it, pct: Math.round(reducedPct * 10) / 10 };
    }
    return it;
  });

  return normalizeBudgetPercentages(updated, totalBudget);
}

/**
 * Add a new budget category with an initial percentage allocation (e.g. 5%)
 */
export function addBudgetCategory(
  items: BudgetItem[],
  newCategory: string,
  initialPct: number,
  totalBudget: number
): BudgetItem[] {
  if (!newCategory.trim() || items.some((i) => i.category.toLowerCase() === newCategory.trim().toLowerCase())) {
    return items;
  }

  const safePct = Math.max(1, Math.min(30, initialPct || 5));
  const newItem: BudgetItem = {
    category: newCategory.trim(),
    pct: safePct,
    locked: false,
    amount: Math.round((safePct / 100) * totalBudget),
  };

  // Reduce other unlocked items to accommodate
  const unlocked = items.filter((i) => !i.locked);
  const unlockedSum = unlocked.reduce((acc, it) => acc + it.pct, 0);

  const updatedItems = items.map((it) => {
    if (!it.locked) {
      const ratio = unlockedSum > 0 ? it.pct / unlockedSum : 1 / unlocked.length;
      return {
        ...it,
        pct: Math.max(1, Math.round((it.pct - safePct * ratio) * 10) / 10),
      };
    }
    return it;
  });

  return normalizeBudgetPercentages([...updatedItems, newItem], totalBudget);
}

function budgetAmount(item: BudgetItem, totalBudget: number): number {
    return typeof item.amount === 'number'
      ? item.amount
      : Math.round((item.pct / 100) * totalBudget);
}

function sameName(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function taskDateIsPast(eventDate: string, tMinusDays: number): boolean {
  const event = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(event.getTime())) return false;
  event.setDate(event.getDate() - tMinusDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return event.getTime() < today.getTime();
}

/**
 * Apply one user-approved Co-planner proposal without mutating the input plan.
 * Invalid or unsafe changes are rejected by returning the original plan.
 */
export function applyChange(plan: EventPlan, rawChange: PlanChange): EventPlan {
    const parsed = planChangeSchema.safeParse(rawChange);
    if (!parsed.success) return plan;
    const change = parsed.data;
    let next: EventPlan = {
      ...plan,
      budget: plan.budget.map((item) => ({ ...item })),
      timeline: plan.timeline.map((item) => ({ ...item })),
      vendors: plan.vendors.map((item) => ({ ...item, questions: [...item.questions], red_flags: [...item.red_flags] })),
      ideas: plan.ideas.map((item) => ({ ...item })),
      guest_list: plan.guest_list?.map((item) => ({ ...item })),
    };

    if (change.op === 'moveBudget') {
      const from = next.budget.find((item) => sameName(item.category, change.from));
      const to = next.budget.find((item) => sameName(item.category, change.to));
      if (!from || !to || from === to || from.locked || to.locked) return plan;
      const fromAmount = budgetAmount(from, next.total_budget);
      if (change.amount > fromAmount) return plan;
      const updated = next.budget.map((item) => {
        const amount = budgetAmount(item, next.total_budget);
        if (item === from) return { ...item, amount: amount - change.amount, pct: ((amount - change.amount) / next.total_budget) * 100 };
        if (item === to) return { ...item, amount: amount + change.amount, pct: ((amount + change.amount) / next.total_budget) * 100 };
        return { ...item, amount, pct: (amount / next.total_budget) * 100 };
      });
      next = { ...next, budget: normalizeBudgetPercentages(updated, next.total_budget) };
    } else if (change.op === 'logPayment') {
      const currentPayments = Array.isArray(next.payments) ? next.payments : [];
      const newPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: change.category,
        amount: change.amount,
        note: change.note || '',
        date: change.date || new Date().toISOString().slice(0, 10),
      };
      next.payments = [...currentPayments, newPayment];
      next.budget = deriveBudgetItemSpent(next.budget, next.payments);
    } else if (change.op === 'logSpend') {
      const item = next.budget.find((entry) => sameName(entry.category, change.category));
      if (!item) return plan;
      const allocated = budgetAmount(item, next.total_budget);
      const spent = item.spent || 0;
      if (spent + change.amount > allocated) return plan;
      const currentPayments = Array.isArray(next.payments) ? next.payments : [];
      const newPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: item.category,
        amount: change.amount,
        note: 'Co-planner logged spend',
        date: new Date().toISOString().slice(0, 10),
      };
      next.payments = [...currentPayments, newPayment];
      next.budget = next.budget.map((entry) =>
        entry === item ? { ...entry, spent: spent + change.amount, amount: allocated } : entry
      );
    } else if (change.op === 'addTask') {
      if (next.timeline.some((task) => sameName(task.title, change.title))) return plan;
      if (next.timeline.length >= 30) return plan;
      if (taskDateIsPast(next.event_date, change.t_minus_days)) return plan;
      next.timeline = [...next.timeline, {
        title: change.title,
        owner: change.owner,
        t_minus_days: change.t_minus_days,
        done: false,
      }].sort((a, b) => b.t_minus_days - a.t_minus_days);
    } else if (change.op === 'toggleTask') {
      const task = next.timeline.find((entry) => sameName(entry.title, change.title));
      if (!task) return plan;
      next.timeline = next.timeline.map((entry) =>
        entry === task ? { ...entry, done: !entry.done } : entry
      );
    } else if (change.op === 'addVendor') {
      if (change.est_low > change.est_high || next.vendors.length >= 12) return plan;
      if (next.vendors.some((vendor) => sameName(vendor.type, change.type))) return plan;
      next.vendors = [...next.vendors, {
        type: change.type,
        est_low: change.est_low,
        est_high: change.est_high,
        questions: change.questions,
        red_flags: [],
        outreach_message: '',
        status: 'todo',
      }];
    } else if (change.op === 'setVendorStatus') {
      const vendor = next.vendors.find((entry) => sameName(entry.type, change.type));
      if (!vendor) return plan;
      next.vendors = next.vendors.map((entry) =>
        entry === vendor ? { ...entry, status: change.status, ...(change.quote === undefined ? {} : { quote: change.quote }) } : entry
      );
    } else if (change.op === 'addIdea') {
      if (next.ideas.length >= 20) return plan;
      next.ideas = [...next.ideas, {
        category: change.category,
        title: change.title,
        description: change.description,
        ...(change.image_url ? { image_url: change.image_url } : {}),
      }];
    } else if (change.op === 'setGuests') {
      next.guests = change.guests;
    } else if (change.op === 'setBudget') {
      next.total_budget = change.total_budget;
      next.budget = recalculateBudgetWithLocked(next.budget, change.total_budget);
  }

    const validation = eventPlanSchema.safeParse(next);
    return validation.success ? validation.data : plan;
}

/**
 * Remove a budget category and reallocate its percentage to remaining items
 */
export function removeBudgetCategory(
  items: BudgetItem[],
  categoryName: string,
  totalBudget: number
): BudgetItem[] {
  if (items.length <= 2) return items; // Keep at least 2 categories
  const target = items.find((i) => i.category === categoryName);
  if (!target) return items;

  const remaining = items.filter((i) => i.category !== categoryName);
  const freedPct = target.pct;
  const unlockedRemaining = remaining.filter((i) => !i.locked);
  const adjustPool = unlockedRemaining.length > 0 ? unlockedRemaining : remaining;
  const poolSum = adjustPool.reduce((acc, it) => acc + it.pct, 0);

  const reallocated = remaining.map((it) => {
    const isInPool = adjustPool.some((p) => p.category === it.category);
    if (isInPool) {
      const ratio = poolSum > 0 ? it.pct / poolSum : 1 / adjustPool.length;
      return {
        ...it,
        pct: Math.round((it.pct + freedPct * ratio) * 10) / 10,
      };
    }
    return it;
  });

  return normalizeBudgetPercentages(reallocated, totalBudget);
}

/**
 * Calculate whether a task is overdue given event date and t_minus_days
 */
export function getTaskTargetDate(eventDateStr: string, tMinusDays: number): { dateStr: string; isOverdue: boolean } {
  if (!eventDateStr) {
    return { dateStr: '', isOverdue: false };
  }
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) {
    return { dateStr: '', isOverdue: false };
  }

  const targetDate = new Date(eventDate);
  targetDate.setDate(targetDate.getDate() - tMinusDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);

  const isOverdue = targetMidnight.getTime() < today.getTime();

  const formattedDate = targetDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    dateStr: formattedDate,
    isOverdue,
  };
}

/**
 * Compute differences between old plan and new plan for the re-plan feature
 */
export function computePlanDiff(oldPlan: EventPlan, newPlan: EventPlan): PlanDiff[] {
  const diffs: PlanDiff[] = [];

  // 1. Budget delta
  if (oldPlan.total_budget !== newPlan.total_budget) {
    const delta = newPlan.total_budget - oldPlan.total_budget;
    const sign = delta > 0 ? '+' : '';
    diffs.push({
      type: 'budget',
      summary: `Total budget adjusted by ${sign}${formatINR(delta)} (${formatINR(oldPlan.total_budget, true)} → ${formatINR(newPlan.total_budget, true)})`,
      badge: `${sign}${formatINR(delta, true)}`,
      changeType: 'modified',
    });
  }

  // 2. Guest count delta
  if (oldPlan.guests !== newPlan.guests) {
    const delta = newPlan.guests - oldPlan.guests;
    const sign = delta > 0 ? '+' : '';
    diffs.push({
      type: 'guests',
      summary: `Guest list updated: ${oldPlan.guests} → ${newPlan.guests} guests (${sign}${delta})`,
      badge: `${sign}${delta} guests`,
      changeType: 'modified',
    });
  }

  // 3. Date change
  if (oldPlan.event_date !== newPlan.event_date) {
    diffs.push({
      type: 'date',
      summary: `Event date rescheduled from ${oldPlan.event_date} to ${newPlan.event_date}`,
      badge: `Rescheduled`,
      changeType: 'modified',
    });
  }

  // 4. City or theme change
  if (oldPlan.city && newPlan.city && oldPlan.city.toLowerCase() !== newPlan.city.toLowerCase()) {
    diffs.push({
      type: 'city',
      summary: `Location moved from ${oldPlan.city} to ${newPlan.city}`,
      badge: newPlan.city,
      changeType: 'modified',
    });
  }

  if (oldPlan.theme && newPlan.theme && oldPlan.theme.toLowerCase() !== newPlan.theme.toLowerCase()) {
    diffs.push({
      type: 'theme',
      summary: `Theme refreshed: "${newPlan.theme}"`,
      badge: 'Theme update',
      changeType: 'modified',
    });
  }

  // 5. Timeline task changes
  const oldTitles = new Set(oldPlan.timeline.map((t) => t.title.toLowerCase()));
  const newTitles = new Set(newPlan.timeline.map((t) => t.title.toLowerCase()));

  for (const task of newPlan.timeline) {
    if (!oldTitles.has(task.title.toLowerCase())) {
      diffs.push({
        type: 'timeline',
        summary: `Added milestone: "${task.title}" at T-${task.t_minus_days}`,
        badge: `+T-${task.t_minus_days}`,
        changeType: 'added',
      });
    }
  }

  // Check shifted days on matching tasks
  for (const newTask of newPlan.timeline) {
    const matchingOld = oldPlan.timeline.find(
      (o) => o.title.toLowerCase() === newTask.title.toLowerCase()
    );
    if (matchingOld && matchingOld.t_minus_days !== newTask.t_minus_days) {
      diffs.push({
        type: 'timeline',
        summary: `Milestone "${newTask.title}" shifted from T-${matchingOld.t_minus_days} to T-${newTask.t_minus_days}`,
        badge: `T-${newTask.t_minus_days}`,
        changeType: 'modified',
      });
    }
  }

  // 6. Vendor changes
  const oldVendors = new Set(oldPlan.vendors.map((v) => v.type.toLowerCase()));
  for (const v of newPlan.vendors) {
    if (!oldVendors.has(v.type.toLowerCase())) {
      diffs.push({
        type: 'vendor',
        summary: `New vendor category added: ${v.type} (${formatINR(v.est_low, true)}–${formatINR(v.est_high, true)})`,
        badge: `+${v.type}`,
        changeType: 'added',
      });
    }
  }

  return diffs;
}

function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function addDaysToDateOnly(value: string, days: number): string {
  const { year, month, day } = parseDateOnly(value);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function getTaskDateOnly(eventDate: string, tMinusDays: number): string {
  return addDaysToDateOnly(eventDate, -tMinusDays);
}

function formatIcsDate(value: string): string {
  return value.replace(/-/g, '');
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = new TextEncoder().encode(character).length;
    if (currentBytes + characterBytes > 75) {
      chunks.push(current);
      current = ' ' + character;
      currentBytes = 1 + characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  if (current) chunks.push(current);
  return chunks.join('\r\n');
}

function addIcsEvent(lines: string[], eventLines: string[]): void {
  lines.push(...eventLines.map((line) => foldIcsLine(line)));
}

export function generateGoogleCalendarUrl(
  title: string,
  date: string,
  details: string,
  location?: string
): string {
  const start = formatIcsDate(date);
  const end = formatIcsDate(addDaysToDateOnly(date, 1));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details,
  });
  if (location) params.set('location', location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate iCalendar .ics format for calendar import
 */
export function generateICS(plan: EventPlan): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Utsav//Celebration Event Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(`Utsav - ${plan.title || 'Event Plan'}`)}`,
  ];

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const stablePlanId = plan.id || `plan-${(plan.title || 'event-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Add event day itself
  if (plan.event_date) {
    addIcsEvent(lines, [
      'BEGIN:VEVENT',
      `UID:utsav-${stablePlanId}-main@utsav.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(plan.event_date)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(addDaysToDateOnly(plan.event_date, 1))}`,
      `SUMMARY:${escapeIcsText(`🎉 ${plan.title || 'Celebration Day'}`)}`,
      `DESCRIPTION:${escapeIcsText(`Celebration: ${plan.title}\nGuests: ${plan.guests}\nCity: ${plan.city}\nTheme: ${plan.theme}`)}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]);
  }

  // Add each timeline task with calculated target date
  plan.timeline.forEach((task, index) => {
    const taskDate = getTaskDateOnly(plan.event_date, task.t_minus_days);

    addIcsEvent(lines, [
      'BEGIN:VEVENT',
      `UID:utsav-${stablePlanId}-task-${index}@utsav.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(taskDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(addDaysToDateOnly(taskDate, 1))}`,
      `SUMMARY:${escapeIcsText(`[T-${task.t_minus_days}] ${task.title}`)}`,
      `DESCRIPTION:${escapeIcsText(`Milestone for ${plan.title}\nOwner: ${task.owner || 'Lead'}\nTimeline: T-${task.t_minus_days} days before celebration.`)}`,
      task.done ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
      'END:VEVENT',
    ]);
  });

  (plan.risks || []).forEach((risk, index) => {
    const riskDate = addDaysToDateOnly(plan.event_date, -(risk.related_task_t_minus_days ?? 7));
    addIcsEvent(lines, [
      'BEGIN:VEVENT',
      `UID:utsav-${stablePlanId}-risk-${index}@utsav.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(riskDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(addDaysToDateOnly(riskDate, 1))}`,
      `SUMMARY:${escapeIcsText(`[Risk Radar] ${risk.title}`)}`,
      `DESCRIPTION:${escapeIcsText(`Category: ${risk.category}\nLikelihood: ${risk.likelihood}\nImpact: ${risk.impact}\nMitigation: ${risk.mitigation}\nBackup plan: ${risk.backup_plan}`)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ]);
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * WhatsApp ready-to-share plan summary
 */
export function generateWhatsAppSummary(plan: EventPlan): string {
  const budgetStr = formatINR(plan.total_budget);
  const categoriesStr = plan.budget
    .map((b) => `• ${b.category}: ${formatINR(b.amount || (b.pct / 100) * plan.total_budget, true)} (${b.pct}%)`)
    .join('\n');

  const milestonesStr = plan.timeline
    .slice(0, 5)
    .map((t) => `• [T-${t.t_minus_days}] ${t.title} (${t.owner}) ${t.done ? '✅' : '⏳'}`)
    .join('\n');

  const risksStr = (plan.risks || [])
    .slice(0, 6)
    .map((risk) => `• ${risk.title} — ${risk.likelihood} likelihood / ${risk.impact} impact\n  Mitigation: ${risk.mitigation}\n  Backup: ${risk.backup_plan}`)
    .join('\n');

  const runSheetStr = Array.isArray(plan.runSheet) && plan.runSheet.length > 0
    ? `\n\n📋 *Day-of Run Sheet:*\n` + plan.runSheet
        .slice(0, 10)
        .map((r) => `• ${r.time} — ${r.title} (${r.owner})`)
        .join('\n')
    : '';

  return `🎉 *${plan.title.toUpperCase()}*
📍 City: ${plan.city} | 👥 Guests: ${plan.guests}
📅 Date: ${plan.event_date} | ✨ Theme: ${plan.theme}
💰 Total Budget: *${budgetStr}*

📊 *Budget Breakdown:*
${categoriesStr}

⏳ *Upcoming Milestones:*
${milestonesStr}

🛡️ *Risk Radar:*
${risksStr}${runSheetStr}

_Generated with Utsav - AI Celebration & Event Planner_`;
}

/**
 * Apply a PlanPatch to an EventPlan without mutating the original input.
 * Preserves locked budget categories, re-normalises percentages to exactly 100%,
 * and updates timeline tasks, vendors, and ideas.
 */
export function applyPatch(plan: EventPlan, patch: PlanPatch): EventPlan {
  // Ensure the input is never mutated: create a deep clone
  const updated: EventPlan = JSON.parse(JSON.stringify(plan));

  // 1. Apply top-level scalar changes
  if (patch.changes) {
    if (patch.changes.event_date) updated.event_date = patch.changes.event_date;
    if (typeof patch.changes.guests === 'number') updated.guests = patch.changes.guests;
    if (typeof patch.changes.total_budget === 'number') updated.total_budget = patch.changes.total_budget;
    if (patch.changes.city) updated.city = patch.changes.city;
    if (patch.changes.theme) updated.theme = patch.changes.theme;
  }

  // 2. Budget changes & locked category preservation
  const safeTotal = Math.max(1000, Math.round(updated.total_budget));
  updated.total_budget = safeTotal;

  // Track budget changes by lowercase category
  const patchBudgetMap = new Map<string, number>();
  if (Array.isArray(patch.budget_changes)) {
    for (const b of patch.budget_changes) {
      if (b && typeof b.category === 'string') {
        patchBudgetMap.set(b.category.trim().toLowerCase(), b.new_pct);
      }
    }
  }

  // Prepare items with locked status preserved
  // Locked items keep their exact rupee amount!
  const budgetItems = updated.budget.map((item) => {
    const isLocked = Boolean(item.locked);
    const existingAmount =
      typeof item.amount === 'number' && item.amount > 0
        ? item.amount
        : Math.round(((item.pct || 0) / 100) * plan.total_budget);

    // If unlocked and has a patch percentage, update pct
    const patchedPct = patchBudgetMap.get(item.category.trim().toLowerCase());
    const pct = !isLocked && typeof patchedPct === 'number' ? patchedPct : item.pct;

    return {
      ...item,
      locked: isLocked,
      amount: existingAmount,
      pct,
    };
  });

  const lockedItems = budgetItems.filter((i) => i.locked);
  const unlockedItems = budgetItems.filter((i) => !i.locked);
  const lockedAmountSum = lockedItems.reduce((acc, i) => acc + (i.amount || 0), 0);

  if (lockedItems.length > 0 && lockedAmountSum < safeTotal) {
    const remainingBudget = safeTotal - lockedAmountSum;
    const unlockedPctSum = unlockedItems.reduce((acc, i) => acc + (Number(i.pct) || 0), 0);
    const safeUnlockedSum = unlockedPctSum > 0 ? unlockedPctSum : unlockedItems.length;

    const adjustedItems = budgetItems.map((item) => {
      if (item.locked) {
        const pct = Math.round(((item.amount || 0) / safeTotal) * 1000) / 10;
        return { ...item, pct };
      } else {
        const ratio = unlockedPctSum > 0 ? (Number(item.pct) || 0) / safeUnlockedSum : 1 / unlockedItems.length;
        const amount = Math.round(ratio * remainingBudget);
        const pct = Math.round((amount / safeTotal) * 1000) / 10;
        return { ...item, amount, pct };
      }
    });
    updated.budget = normalizeBudgetPercentages(adjustedItems, safeTotal);
  } else if (lockedItems.length > 0 && lockedAmountSum >= safeTotal) {
    // If locked items exceed or match total, scale proportionally
    const scale = safeTotal / (lockedAmountSum || 1);
    const scaledItems = budgetItems.map((item) => {
      const scaledAmount = item.locked ? Math.round((item.amount || 0) * scale) : 0;
      const pct = Math.round((scaledAmount / safeTotal) * 1000) / 10;
      return { ...item, amount: scaledAmount, pct };
    });
    updated.budget = normalizeBudgetPercentages(scaledItems, safeTotal);
  } else {
    // No locked items: just apply normalized percentages
    updated.budget = normalizeBudgetPercentages(budgetItems, safeTotal);
  }

  // 3. Timeline tasks
  if (Array.isArray(patch.tasks_removed) && patch.tasks_removed.length > 0) {
    const removeSet = new Set(patch.tasks_removed.map((t) => t.trim().toLowerCase()));
    updated.timeline = updated.timeline.filter(
      (t) => !removeSet.has(t.title.trim().toLowerCase())
    );
  }

  if (Array.isArray(patch.tasks_modified) && patch.tasks_modified.length > 0) {
    const modMap = new Map(
      patch.tasks_modified.map((m) => [m.title.trim().toLowerCase(), m.new_t_minus_days])
    );
    updated.timeline = updated.timeline.map((t) => {
      const newDays = modMap.get(t.title.trim().toLowerCase());
      if (typeof newDays === 'number') {
        return { ...t, t_minus_days: newDays };
      }
      return t;
    });
  }

  if (Array.isArray(patch.tasks_added) && patch.tasks_added.length > 0) {
    const existingTitles = new Set(updated.timeline.map((t) => t.title.trim().toLowerCase()));
    for (const newTask of patch.tasks_added) {
      if (newTask && newTask.title && !existingTitles.has(newTask.title.trim().toLowerCase())) {
        updated.timeline.push(newTask);
        existingTitles.add(newTask.title.trim().toLowerCase());
      }
    }
  }

  // Sort timeline in descending order of t_minus_days (e.g. 90, 60, 30, 7, 0)
  updated.timeline.sort((a, b) => b.t_minus_days - a.t_minus_days);

  // 4. Vendors
  if (Array.isArray(patch.vendors_removed) && patch.vendors_removed.length > 0) {
    const removeSet = new Set(patch.vendors_removed.map((v) => v.trim().toLowerCase()));
    updated.vendors = updated.vendors.filter(
      (v) => !removeSet.has(v.type.trim().toLowerCase())
    );
  }

  if (Array.isArray(patch.vendors_added) && patch.vendors_added.length > 0) {
    const existingTypes = new Set(updated.vendors.map((v) => v.type.trim().toLowerCase()));
    for (const newVendor of patch.vendors_added) {
      if (newVendor && newVendor.type && !existingTypes.has(newVendor.type.trim().toLowerCase())) {
        updated.vendors.push(newVendor);
        existingTypes.add(newVendor.type.trim().toLowerCase());
      }
    }
  }

  // 5. Ideas
  if (Array.isArray(patch.ideas_added) && patch.ideas_added.length > 0) {
    for (const newIdea of patch.ideas_added) {
      if (newIdea && newIdea.title) {
        updated.ideas.push(newIdea);
      }
    }
  }

  return updated;
}

/**
 * Build exact diffs directly from a PlanPatch
 */
export function computeDiffsFromPatch(oldPlan: EventPlan, patch: PlanPatch): PlanDiff[] {
  const diffs: PlanDiff[] = [];

  // 1. Budget changes
  if (patch.changes?.total_budget !== undefined && patch.changes.total_budget !== oldPlan.total_budget) {
    const delta = patch.changes.total_budget - oldPlan.total_budget;
    const formattedDelta = delta > 0 ? `+${formatINR(delta, true)}` : formatINR(delta, true);
    diffs.push({
      type: 'budget',
      summary: `Total budget adjusted by ${formattedDelta} (${formatINR(oldPlan.total_budget, true)} → ${formatINR(patch.changes.total_budget, true)})`,
      badge: formattedDelta,
      changeType: 'modified',
    });
  }

  // 2. Guests
  if (patch.changes?.guests !== undefined && patch.changes.guests !== oldPlan.guests) {
    const delta = patch.changes.guests - oldPlan.guests;
    const sign = delta > 0 ? '+' : '';
    diffs.push({
      type: 'guests',
      summary: `Guest list updated: ${oldPlan.guests} → ${patch.changes.guests} guests (${sign}${delta})`,
      badge: `${sign}${delta} guests`,
      changeType: 'modified',
    });
  }

  // 3. Date
  if (patch.changes?.event_date !== undefined && patch.changes.event_date !== oldPlan.event_date) {
    diffs.push({
      type: 'date',
      summary: `Event date rescheduled from ${oldPlan.event_date} to ${patch.changes.event_date}`,
      badge: 'Rescheduled',
      changeType: 'modified',
    });
  }

  // 4. City & Theme
  if (patch.changes?.city && patch.changes.city.toLowerCase() !== oldPlan.city.toLowerCase()) {
    diffs.push({
      type: 'city',
      summary: `Location moved from ${oldPlan.city} to ${patch.changes.city}`,
      badge: patch.changes.city,
      changeType: 'modified',
    });
  }

  if (patch.changes?.theme && patch.changes.theme.toLowerCase() !== oldPlan.theme.toLowerCase()) {
    diffs.push({
      type: 'theme',
      summary: `Theme refreshed: "${patch.changes.theme}"`,
      badge: 'Theme update',
      changeType: 'modified',
    });
  }

  // 5. Category budget changes
  if (Array.isArray(patch.budget_changes)) {
    for (const bc of patch.budget_changes) {
      diffs.push({
        type: 'budget',
        summary: `Adjusted ${bc.category} to ${bc.new_pct}%`,
        badge: `${bc.new_pct}%`,
        changeType: 'modified',
      });
    }
  }

  // 6. Tasks
  if (Array.isArray(patch.tasks_added)) {
    for (const t of patch.tasks_added) {
      diffs.push({
        type: 'timeline',
        summary: `Added milestone: "${t.title}" at T-${t.t_minus_days}`,
        badge: `+T-${t.t_minus_days}`,
        changeType: 'added',
      });
    }
  }

  if (Array.isArray(patch.tasks_modified)) {
    for (const m of patch.tasks_modified) {
      diffs.push({
        type: 'timeline',
        summary: `Milestone "${m.title}" moved to T-${m.new_t_minus_days}`,
        badge: `moved to T-${m.new_t_minus_days}`,
        changeType: 'modified',
      });
    }
  }

  if (Array.isArray(patch.tasks_removed)) {
    for (const title of patch.tasks_removed) {
      diffs.push({
        type: 'timeline',
        summary: `Removed milestone: "${title}"`,
        badge: '-Task',
        changeType: 'removed',
      });
    }
  }

  // 7. Vendors
  if (Array.isArray(patch.vendors_added)) {
    for (const v of patch.vendors_added) {
      diffs.push({
        type: 'vendor',
        summary: `New vendor added: ${v.type}`,
        badge: `+${v.type}`,
        changeType: 'added',
      });
    }
  }

  if (Array.isArray(patch.vendors_removed)) {
    for (const v of patch.vendors_removed) {
      diffs.push({
        type: 'vendor',
        summary: `Removed vendor: ${v}`,
        badge: `-${v}`,
        changeType: 'removed',
      });
    }
  }

  // 8. Ideas
  if (Array.isArray(patch.ideas_added)) {
    for (const i of patch.ideas_added) {
      diffs.push({
        type: 'idea',
        summary: `Added inspiration: "${i.title}"`,
        badge: '+Idea',
        changeType: 'added',
      });
    }
  }

  return diffs;
}

/**
 * Filter timeline tasks by day number ('all', 'pre', or 1, 2, 3...)
 */
export function filterTasksByDay(
  tasks: TimelineTask[],
  filter: number | 'all' | 'pre'
): TimelineTask[] {
  if (filter === 'all') return tasks;
  if (filter === 'pre') return tasks.filter((t) => t.t_minus_days > 0 && !t.day_number);
  return tasks.filter((t) => t.day_number === filter || (t.t_minus_days === 0 && !t.day_number && filter === 1));
}

/**
 * Computes day-wise budget allocation from event days and budget items
 */
export function calculateDayWiseBudget(plan: EventPlan): Array<{
  day_number: number;
  title: string;
  allocated: number;
  items: BudgetItem[];
  pctOfTotal: number;
}> {
  const days = plan.event_days || [];
  if (days.length === 0) return [];

  return days.map((d) => {
    const dayItems = plan.budget.filter((b) => b.day_number === d.day_number);
    const dayTotalFromItems = dayItems.reduce((acc, it) => acc + (it.amount || Math.round((it.pct / 100) * plan.total_budget)), 0);
    const allocated = d.budget_allocated || dayTotalFromItems;
    const pctOfTotal = plan.total_budget > 0 ? Math.round((allocated / plan.total_budget) * 100) : 0;
    return {
      day_number: d.day_number,
      title: d.title,
      allocated,
      items: dayItems,
      pctOfTotal,
    };
  });
}

/**
 * Computes summary statistics for a vendor category's quotes
 */
export function calculateQuoteStats(vendor: VendorRequirement): {
  minQuote: number;
  maxQuote: number;
  avgQuote: number;
  quoteCount: number;
  selectedQuote?: VendorQuote;
} {
  const quotes: VendorQuote[] = vendor.quotes || [];
  if (quotes.length === 0) {
    return {
      minQuote: 0,
      maxQuote: 0,
      avgQuote: 0,
      quoteCount: 0,
    };
  }
  const amounts = quotes.map((q: VendorQuote) => q.quote_amount);
  const minQuote = Math.min(...amounts);
  const maxQuote = Math.max(...amounts);
  const sum = amounts.reduce((acc: number, curr: number) => acc + curr, 0);
  const avgQuote = Math.round(sum / amounts.length);
  const selectedQuote = quotes.find((q: VendorQuote) => q.status === 'selected');

  return {
    minQuote,
    maxQuote,
    avgQuote,
    quoteCount: quotes.length,
    selectedQuote,
  };
}
