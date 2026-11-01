/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BudgetItem, EventPlan, PlanDiff, TimelineTask } from '../types/plan.ts';

/**
 * Format Indian Rupee currency with standard Indian numbering system (lakhs & crores)
 */
export function formatINR(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const clean = Math.round(amount);

  if (compact) {
    if (Math.abs(clean) >= 10000000) {
      return `₹${(clean / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }
    if (Math.abs(clean) >= 100000) {
      return `₹${(clean / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (Math.abs(clean) >= 1000) {
      return `₹${(clean / 1000).toFixed(0)}k`;
    }
    return `₹${clean}`;
  }

  // Full Indian number format: 12,34,567
  const isNegative = clean < 0;
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
    `X-WR-CALNAME:Utsav - ${plan.title || 'Event Plan'}`,
  ];

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';

  // Add event day itself
  if (plan.event_date) {
    const eventDayClean = plan.event_date.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:utsav-main-${Date.now()}@utsav.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${eventDayClean}`,
      `DTEND;VALUE=DATE:${eventDayClean}`,
      `SUMMARY:🎉 ${plan.title || 'Celebration Day'}`,
      `DESCRIPTION:Celebration: ${plan.title}\\nGuests: ${plan.guests}\\nCity: ${plan.city}\\nTheme: ${plan.theme}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }

  // Add each timeline task with calculated target date
  const eventBase = new Date(plan.event_date || new Date().toISOString().slice(0, 10));

  plan.timeline.forEach((task, index) => {
    const taskDate = new Date(eventBase);
    taskDate.setDate(taskDate.getDate() - task.t_minus_days);
    const dateFormatted = taskDate.toISOString().slice(0, 10).replace(/-/g, '');

    lines.push(
      'BEGIN:VEVENT',
      `UID:utsav-task-${index}-${Date.now()}@utsav.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateFormatted}`,
      `DTEND;VALUE=DATE:${dateFormatted}`,
      `SUMMARY:[T-${task.t_minus_days}] ${task.title}`,
      `DESCRIPTION:Milestone for ${plan.title}\\nOwner: ${task.owner || 'Lead'}\\nTimeline: T-${task.t_minus_days} days before celebration.`,
      task.done ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
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

  return `🎉 *${plan.title.toUpperCase()}*
📍 City: ${plan.city} | 👥 Guests: ${plan.guests}
📅 Date: ${plan.event_date} | ✨ Theme: ${plan.theme}
💰 Total Budget: *${budgetStr}*

📊 *Budget Breakdown:*
${categoriesStr}

⏳ *Upcoming Milestones:*
${milestonesStr}

_Generated with Utsav - AI Celebration & Event Planner_`;
}
