/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  formatINR,
  normalizeBudgetPercentages,
  recalculateBudgetWithLocked,
  computePlanDiff,
  generateICS,
  generateWhatsAppSummary,
  adjustCategoryPercentage,
  addBudgetCategory,
  removeBudgetCategory,
  applyPatch,
  computeDiffsFromPatch,
} from './planLogic.ts';
import type { BudgetItem, EventPlan, PlanPatch } from '../types/plan.ts';

describe('planLogic', () => {
  it('formatINR formats compact and full Indian rupee numbers correctly', () => {
    expect(formatINR(600000)).toBe('₹6,00,000');
    expect(formatINR(600000, true)).toBe('₹6L');
    expect(formatINR(15000000, true)).toBe('₹1.5Cr');
    expect(formatINR(50000, true)).toBe('₹50k');
  });

  it('normalizeBudgetPercentages ensures total percentage is exactly 100', () => {
    const items: BudgetItem[] = [
      { category: 'Venue & Decor', pct: 33.33, locked: false },
      { category: 'Catering', pct: 33.33, locked: false },
      { category: 'Entertainment', pct: 33.34, locked: false },
    ];

    const normalized = normalizeBudgetPercentages(items, 600000);
    const sumPct = Math.round(normalized.reduce((sum, it) => sum + it.pct, 0) * 10) / 10;
    expect(sumPct).toBe(100);

    const sumRupees = normalized.reduce((sum, it) => sum + (it.amount || 0), 0);
    expect(Math.abs(sumRupees - 600000)).toBeLessThan(5); // Within rounding variance
  });

  it('recalculateBudgetWithLocked preserves locked rupee amount while unlocking remainder', () => {
    const initialItems: BudgetItem[] = [
      { category: 'Venue', pct: 50, locked: true, amount: 300000 },
      { category: 'Catering', pct: 30, locked: false, amount: 180000 },
      { category: 'Music & DJ', pct: 20, locked: false, amount: 120000 },
    ];

    // What if budget drops from 6L to 4.8L (-20%)
    const updated = recalculateBudgetWithLocked(initialItems, 480000);

    // Venue is locked at 3,00,000
    const venue = updated.find((it) => it.category === 'Venue');
    expect(venue).toBeDefined();
    expect(venue?.amount).toBe(300000);

    // Total pct should still be 100
    const totalPct = Math.round(updated.reduce((sum, it) => sum + it.pct, 0) * 10) / 10;
    expect(totalPct).toBe(100);

    // Remaining budget is 180,000 distributed 3:2 to Catering & Music
    const catering = updated.find((it) => it.category === 'Catering');
    const music = updated.find((it) => it.category === 'Music & DJ');
    expect(catering?.amount || 0).toBeGreaterThan(music?.amount || 0);
  });

  it('computePlanDiff detects changes in budget, guests, timeline, and vendors', () => {
    const oldPlan: EventPlan = {
      title: "Sister's Sangeet",
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [{ category: 'Catering', pct: 100, locked: false }],
      timeline: [{ t_minus_days: 60, title: 'Book Venue', owner: 'Bride', done: false }],
      vendors: [{ type: 'DJ', est_low: 25000, est_high: 40000, questions: [], red_flags: [], outreach_message: '' }],
      ideas: [],
      clarifying_question: null,
    };

    const newPlan: EventPlan = {
      ...oldPlan,
      guests: 200,
      total_budget: 720000,
      timeline: [
        { t_minus_days: 60, title: 'Book Venue', owner: 'Bride', done: false },
        { t_minus_days: 30, title: 'Hire Choreographer', owner: 'Brother', done: false },
      ],
      vendors: [
        { type: 'DJ', est_low: 25000, est_high: 40000, questions: [], red_flags: [], outreach_message: '' },
        { type: 'Dhol Players', est_low: 15000, est_high: 25000, questions: [], red_flags: [], outreach_message: '' },
      ],
    };

    const diffs = computePlanDiff(oldPlan, newPlan);
    expect(diffs.length).toBeGreaterThanOrEqual(4);

    const budgetDiff = diffs.find((d) => d.type === 'budget');
    expect(budgetDiff).toBeDefined();
    expect(budgetDiff?.badge?.includes('1.2L') || budgetDiff?.summary?.includes('1,20,000')).toBe(true);

    const guestDiff = diffs.find((d) => d.type === 'guests');
    expect(guestDiff).toBeDefined();
    expect(guestDiff?.badge).toBe('+50 guests');

    const timelineDiff = diffs.find((d) => d.type === 'timeline');
    expect(timelineDiff).toBeDefined();
    expect(timelineDiff?.summary.includes('Hire Choreographer')).toBe(true);
  });

  it('generateICS outputs valid iCalendar structure', () => {
    const plan: EventPlan = {
      title: 'Silver Jubilee',
      event_type: 'anniversary',
      event_date: '2026-11-20',
      guests: 100,
      total_budget: 300000,
      city: 'Pune',
      theme: 'Vintage Gold',
      budget: [],
      timeline: [{ t_minus_days: 30, title: 'Book Caterer', owner: 'Family', done: false }],
      vendors: [],
      ideas: [],
      clarifying_question: null,
    };

    const ics = generateICS(plan);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('SUMMARY:🎉 Silver Jubilee');
    expect(ics).toContain('[T-30] Book Caterer');
  });

  it('generateWhatsAppSummary creates formatted message with emojis and bold', () => {
    const plan: EventPlan = {
      title: 'Sister Sangeet',
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [{ category: 'Decor', pct: 40, locked: false, amount: 240000 }],
      timeline: [{ t_minus_days: 30, title: 'Choreography', owner: 'Me', done: true }],
      vendors: [],
      ideas: [],
      clarifying_question: null,
    };

    const wa = generateWhatsAppSummary(plan);
    expect(wa).toContain('*SISTER SANGEET*');
    expect(wa).toContain('₹6,00,000');
    expect(wa).toContain('Vizag');
    expect(wa).toContain('Retro Bollywood');
  });

  it('adjustCategoryPercentage adjusts target category while keeping total sum at 100', () => {
    const items: BudgetItem[] = [
      { category: 'Venue', pct: 40, locked: false },
      { category: 'Catering', pct: 40, locked: false },
      { category: 'DJ', pct: 20, locked: false },
    ];

    const updated = adjustCategoryPercentage(items, 'Catering', 5, 500000);
    const catering = updated.find((i) => i.category === 'Catering');
    expect(catering?.pct).toBe(45);

    const totalPct = Math.round(updated.reduce((sum, i) => sum + i.pct, 0) * 10) / 10;
    expect(totalPct).toBe(100);
  });

  it('addBudgetCategory adds new category and normalizes percentages to 100', () => {
    const items: BudgetItem[] = [
      { category: 'Venue', pct: 50, locked: false },
      { category: 'Catering', pct: 50, locked: false },
    ];

    const updated = addBudgetCategory(items, 'Fireworks', 10, 500000);
    expect(updated.length).toBe(3);
    const fireworks = updated.find((i) => i.category === 'Fireworks');
    expect(fireworks).toBeDefined();
    expect(fireworks?.pct).toBe(10);

    const totalPct = Math.round(updated.reduce((sum, i) => sum + i.pct, 0) * 10) / 10;
    expect(totalPct).toBe(100);
  });

  it('removeBudgetCategory deletes category and reallocates percentages to 100', () => {
    const items: BudgetItem[] = [
      { category: 'Venue', pct: 50, locked: false },
      { category: 'Catering', pct: 30, locked: false },
      { category: 'Decor', pct: 20, locked: false },
    ];

    const updated = removeBudgetCategory(items, 'Decor', 500000);
    expect(updated.length).toBe(2);
    expect(updated.some((i) => i.category === 'Decor')).toBe(false);

    const totalPct = Math.round(updated.reduce((sum, i) => sum + i.pct, 0) * 10) / 10;
    expect(totalPct).toBe(100);
  });

  it('applyPatch keeps locked budget categories, re-normalises percentages to 100, and never mutates input', () => {
    const initialPlan: EventPlan = {
      title: "Sister's Sangeet",
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [
        { category: 'Venue', pct: 50, locked: true, amount: 300000 },
        { category: 'Catering', pct: 30, locked: false, amount: 180000 },
        { category: 'DJ', pct: 20, locked: false, amount: 120000 },
      ],
      timeline: [
        { t_minus_days: 60, title: 'Book Venue', owner: 'Family', done: false },
        { t_minus_days: 30, title: 'Hire DJ', owner: 'Brother', done: false },
      ],
      vendors: [
        { type: 'DJ', est_low: 35000, est_high: 60000, questions: [], red_flags: [], outreach_message: 'Hi' },
      ],
      ideas: [
        { category: 'theme', title: 'Disco', description: 'Retro 80s' },
      ],
      clarifying_question: null,
    };

    // Deep freeze input snapshot to guarantee no mutation
    const initialPlanSnapshot = JSON.stringify(initialPlan);

    const patch: PlanPatch = {
      reason: 'Increase budget to ₹8L, add 50 guests, modify DJ timeline, and add photo booth',
      changes: {
        total_budget: 800000,
        guests: 200,
      },
      budget_changes: [
        { category: 'Catering', new_pct: 40 },
      ],
      tasks_added: [
        { t_minus_days: 15, title: 'Photo Booth Props', owner: 'Cousins', done: false },
      ],
      tasks_removed: [],
      tasks_modified: [
        { title: 'Hire DJ', new_t_minus_days: 45 },
      ],
      vendors_added: [
        { type: 'Photographer', est_low: 50000, est_high: 90000, questions: [], red_flags: [], outreach_message: 'Hi' },
      ],
      vendors_removed: [],
      ideas_added: [
        { category: 'decor', title: 'Vinyl Wall', description: 'Vinyl records' },
      ],
    };

    const patched = applyPatch(initialPlan, patch);

    // 1. Verify input was not mutated
    expect(JSON.stringify(initialPlan)).toBe(initialPlanSnapshot);

    // 2. Verify scalar changes
    expect(patched.total_budget).toBe(800000);
    expect(patched.guests).toBe(200);

    // 3. Verify locked budget item retained its rupee amount
    const venue = patched.budget.find((b) => b.category === 'Venue');
    expect(venue).toBeDefined();
    expect(venue?.locked).toBe(true);
    expect(venue?.amount).toBe(300000);

    // 4. Verify sum of percentages is exactly 100
    const sumPct = Math.round(patched.budget.reduce((sum, b) => sum + b.pct, 0) * 10) / 10;
    expect(sumPct).toBe(100);

    // 5. Verify task changes
    const djTask = patched.timeline.find((t) => t.title === 'Hire DJ');
    expect(djTask?.t_minus_days).toBe(45);

    const photoTask = patched.timeline.find((t) => t.title === 'Photo Booth Props');
    expect(photoTask).toBeDefined();
    expect(photoTask?.t_minus_days).toBe(15);

    // 6. Verify vendor and idea added
    expect(patched.vendors.some((v) => v.type === 'Photographer')).toBe(true);
    expect(patched.ideas.some((i) => i.title === 'Vinyl Wall')).toBe(true);
  });

  it('computeDiffsFromPatch produces exact diffs for all patch operations', () => {
    const oldPlan: EventPlan = {
      title: "Sister's Sangeet",
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [],
      timeline: [],
      vendors: [],
      ideas: [],
    };

    const patch: PlanPatch = {
      reason: 'Reduced budget by ₹50k and moved to Jan 10',
      changes: {
        total_budget: 550000,
        event_date: '2027-01-10',
        guests: 180,
      },
      budget_changes: [{ category: 'Decor', new_pct: 25 }],
      tasks_added: [{ t_minus_days: 20, title: 'Sound check', owner: 'Tech', done: false }],
      tasks_removed: ['Old task'],
      tasks_modified: [{ title: 'Cake order', new_t_minus_days: 10 }],
      vendors_added: [{ type: 'Live Band', est_low: 40000, est_high: 70000, questions: [], red_flags: [], outreach_message: '' }],
      vendors_removed: ['Clown'],
      ideas_added: [{ category: 'menu', title: 'Live Chaat', description: 'Sev puri' }],
    };

    const diffs = computeDiffsFromPatch(oldPlan, patch);
    expect(diffs.length).toBe(10);

    const budgetDiff = diffs.find((d) => d.type === 'budget');
    expect(budgetDiff?.badge).toBe('-₹50k');

    const guestDiff = diffs.find((d) => d.type === 'guests');
    expect(guestDiff?.badge).toBe('+30 guests');

    const dateDiff = diffs.find((d) => d.type === 'date');
    expect(dateDiff?.badge).toBe('Rescheduled');

    const modTask = diffs.find((d) => d.badge === 'moved to T-10');
    expect(modTask).toBeDefined();

    const remVendor = diffs.find((d) => d.badge === '-Clown');
    expect(remVendor).toBeDefined();
  });
});
