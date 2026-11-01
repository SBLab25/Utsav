/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import type { BudgetItem, PaymentRecord, RunSheetItem } from '../types/plan.ts';
import {
  calculateSpentByCategory,
  deriveBudgetItemSpent,
  getCategoryOverrun,
  proposeRebalanceForOverrun,
  sortRunSheet,
  generateDefaultRunSheet,
  generateWhatsAppSummary,
} from './planLogic.ts';

describe('Money and Vendor Tracking Logic', () => {
  describe('Spent Derivation from Payments', () => {
    it('sums payment amounts per category case-insensitively', () => {
      const payments: PaymentRecord[] = [
        { id: '1', category: 'Catering', amount: 25000, note: 'Advance', date: '2026-11-01' },
        { id: '2', category: 'catering', amount: 15000, note: 'Tasting', date: '2026-11-02' },
        { id: '3', category: 'Decor', amount: 30000, note: 'Stage token', date: '2026-11-03' },
      ];

      const spentMap = calculateSpentByCategory(payments);
      expect(spentMap['catering']).toBe(40000);
      expect(spentMap['decor']).toBe(30000);
      expect(spentMap['photography']).toBeUndefined();
    });

    it('derives spent amounts into budget items properly', () => {
      const budget: BudgetItem[] = [
        { category: 'Catering', pct: 40, locked: false, amount: 240000 },
        { category: 'Decor', pct: 30, locked: true, amount: 180000 },
        { category: 'Photography', pct: 30, locked: false, amount: 180000 },
      ];

      const payments: PaymentRecord[] = [
        { id: '1', category: 'Catering', amount: 50000, note: 'Token', date: '2026-11-01' },
        { id: '2', category: 'Catering', amount: 70000, note: 'Second tranche', date: '2026-11-05' },
        { id: '3', category: 'Decor', amount: 180000, note: 'Full advance', date: '2026-11-02' },
      ];

      const derived = deriveBudgetItemSpent(budget, payments);
      expect(derived[0].spent).toBe(120000);
      expect(derived[1].spent).toBe(180000);
      expect(derived[2].spent).toBe(0);
    });
  });

  describe('Overrun Detection', () => {
    const totalBudget = 600000;

    it('detects overrun when spent exceeds planned allocation', () => {
      const item: BudgetItem = {
        category: 'Catering',
        pct: 30,
        locked: false,
        amount: 180000,
        spent: 210000,
      };

      const overrun = getCategoryOverrun(item, totalBudget);
      expect(overrun.isOverrun).toBe(true);
      expect(overrun.overrunAmount).toBe(30000);
    });

    it('returns isOverrun: false when spent is within planned allocation', () => {
      const item: BudgetItem = {
        category: 'Catering',
        pct: 30,
        locked: false,
        amount: 180000,
        spent: 150000,
      };

      const overrun = getCategoryOverrun(item, totalBudget);
      expect(overrun.isOverrun).toBe(false);
      expect(overrun.overrunAmount).toBe(0);
    });

    it('returns isOverrun: false when spent equals planned allocation exactly', () => {
      const item: BudgetItem = {
        category: 'Decor',
        pct: 20,
        locked: true,
        amount: 120000,
        spent: 120000,
      };

      const overrun = getCategoryOverrun(item, totalBudget);
      expect(overrun.isOverrun).toBe(false);
      expect(overrun.overrunAmount).toBe(0);
    });
  });

  describe('Rebalance Proposal Respects Locks and Spent Surplus', () => {
    const totalBudget = 600000;

    it('rebalances overrun by moving money only from unlocked categories with unspent surplus', () => {
      const budget: BudgetItem[] = [
        { category: 'Catering', pct: 30, locked: false, amount: 180000, spent: 220000 }, // overrun by 40,000
        { category: 'Decor', pct: 30, locked: true, amount: 180000, spent: 50000 }, // LOCKED (surplus 130,000, but locked!)
        { category: 'Photography', pct: 20, locked: false, amount: 120000, spent: 40000 }, // Unlocked (surplus 80,000)
        { category: 'Attire', pct: 20, locked: false, amount: 120000, spent: 120000 }, // Unlocked but 0 surplus (spent = planned)
      ];

      const proposal = proposeRebalanceForOverrun(budget, totalBudget, 'Catering', 40000);
      expect(proposal).not.toBeNull();
      if (!proposal) return;

      const newCatering = proposal.proposedBudget.find((b) => b.category === 'Catering')!;
      const newDecor = proposal.proposedBudget.find((b) => b.category === 'Decor')!;
      const newPhoto = proposal.proposedBudget.find((b) => b.category === 'Photography')!;
      const newAttire = proposal.proposedBudget.find((b) => b.category === 'Attire')!;

      // 1. Target increased by 40,000
      expect(newCatering.amount).toBe(220000);

      // 2. Locked Decor was untouched
      expect(newDecor.amount).toBe(180000);
      expect(newDecor.locked).toBe(true);

      // 3. Fully-spent Attire was untouched (never reduced below spent)
      expect(newAttire.amount).toBe(120000);

      // 4. Eligible donor Photography contributed the 40,000
      expect(newPhoto.amount).toBe(80000);
      expect(newPhoto.amount).toBeGreaterThanOrEqual(newPhoto.spent || 0);

      // Total sum remains totalBudget
      const sum = proposal.proposedBudget.reduce((acc, b) => acc + (b.amount || 0), 0);
      expect(sum).toBe(totalBudget);

      // Diff chips generated
      expect(proposal.diffs.some((d) => d.badge?.includes('+₹40,000'))).toBe(true);
      expect(proposal.diffs.some((d) => d.summary.includes('Photography'))).toBe(true);
      expect(proposal.diffs.some((d) => d.summary.includes('Decor'))).toBe(false);
    });

    it('returns null if all surplus is locked or already spent', () => {
      const budget: BudgetItem[] = [
        { category: 'Catering', pct: 50, locked: false, amount: 300000, spent: 350000 },
        { category: 'Decor', pct: 50, locked: true, amount: 300000, spent: 100000 }, // surplus is locked
      ];

      const proposal = proposeRebalanceForOverrun(budget, totalBudget, 'Catering', 50000);
      expect(proposal).toBeNull();
    });
  });

  describe('Day-of Run Sheet Ordering & Formatting', () => {
    it('sorts run sheet items strictly ascending by HH:MM time', () => {
      const items: RunSheetItem[] = [
        { time: '22:30', title: 'Open Dance Floor', owner: 'DJ Rohit' },
        { time: '09:00', title: 'Vendor Load-in', owner: 'Decor Lead' },
        { time: '14:00', title: 'Soundcheck', owner: 'DJ Rohit' },
        { time: '19:00', title: 'Grand Entry', owner: 'Family' },
      ];

      const sorted = sortRunSheet(items);
      expect(sorted.map((s) => s.time)).toEqual(['09:00', '14:00', '19:00', '22:30']);
    });

    it('generateDefaultRunSheet provides sensible 9-10 item time-ordered run sheet', () => {
      const sangeetSheet = generateDefaultRunSheet('sangeet');
      expect(sangeetSheet.length).toBeGreaterThanOrEqual(6);
      expect(sangeetSheet.length).toBeLessThanOrEqual(15);
      // Verify ascending order
      for (let i = 1; i < sangeetSheet.length; i++) {
        expect(sangeetSheet[i].time.localeCompare(sangeetSheet[i - 1].time)).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes Day-of Run Sheet in WhatsApp plan summary output', () => {
      const plan = {
        title: "Sister's Sangeet",
        event_type: 'sangeet',
        event_date: '2026-12-14',
        guests: 150,
        total_budget: 600000,
        city: 'Vizag',
        theme: 'Retro Bollywood',
        budget: [{ category: 'Catering', pct: 100, locked: false, amount: 600000 }],
        timeline: [{ t_minus_days: 0, title: 'Event Day', owner: 'Lead', done: false }],
        vendors: [],
        ideas: [],
        risks: [],
        payments: [],
        runSheet: [
          { time: '18:00', title: 'Welcome Drinks', owner: 'Catering' },
          { time: '20:00', title: 'Dance Face-off', owner: 'Choreographer' },
        ],
      } as any;

      const summary = generateWhatsAppSummary(plan);
      expect(summary).toContain('Day-of Run Sheet');
      expect(summary).toContain('18:00');
      expect(summary).toContain('Welcome Drinks');
      expect(summary).toContain('20:00');
    });
  });
});
