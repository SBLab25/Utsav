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
} from './planLogic.ts';
import type { BudgetItem, EventPlan } from '../types/plan.ts';

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
});
