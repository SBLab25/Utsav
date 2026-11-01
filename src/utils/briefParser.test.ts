/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  parseBudgetFromBrief,
  parseGuestsFromBrief,
  parseEventDate,
  generateDefaultPlan,
  applySmartReplan,
} from './briefParser.ts';
import type { EventPlan } from '../types/plan.ts';

describe('briefParser', () => {
  it('parseBudgetFromBrief correctly parses currency markers and units anywhere in text', () => {
    const brief = "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag, retro Bollywood";
    const budget = parseBudgetFromBrief(brief);
    const guests = parseGuestsFromBrief(brief);

    expect(budget).toBe(600000);
    expect(guests).toBe(150);

    expect(parseBudgetFromBrief('Wedding in Jaipur, 200 guests, Rs 15L')).toBe(1500000);
    expect(parseBudgetFromBrief('Birthday party, 25 people, budget 50k, Delhi')).toBe(50000);
    expect(parseBudgetFromBrief('Grand corporate gala, ₹1.5 Cr, Mumbai')).toBe(15000000);
    expect(parseBudgetFromBrief('Intimate dinner, INR 75,000, 20 guests')).toBe(75000);
    expect(parseBudgetFromBrief('Anniversary dinner, 8L budget')).toBe(800000);
  });

  it('parseEventDate uses current year and rolls to next year if date has already passed', () => {
    const refNov2026 = new Date('2026-11-01T12:00:00Z');

    expect(parseEventDate('Event on 14 Dec in Vizag', refNov2026)).toBe('2026-12-14');
    expect(parseEventDate('Event on 10 Jan in Delhi', refNov2026)).toBe('2027-01-10');

    const ref2028 = new Date('2028-02-15T12:00:00Z');
    expect(parseEventDate('Party on 10 Jan', ref2028)).toBe('2029-01-10');
    expect(parseEventDate('Party on 20 Dec', ref2028)).toBe('2028-12-20');
  });

  it('generateDefaultPlan builds plan strictly from brief without hardcoded Sister Retro Sangeet content', () => {
    const corpPlan = generateDefaultPlan('Corporate annual kickoff, 200 attendees, ₹10L, Bengaluru');
    expect(corpPlan.title.includes('Sister')).toBe(false);
    expect(corpPlan.title.includes('Retro Bollywood')).toBe(false);
    expect(corpPlan.event_type).toBe('corporate');
    expect(corpPlan.guests).toBe(200);
    expect(corpPlan.total_budget).toBe(1000000);
    expect(corpPlan.city).toBe('Bengaluru');

    const sumPct = corpPlan.budget.reduce((acc, it) => acc + it.pct, 0);
    expect(sumPct).toBe(100);
    expect(corpPlan.budget.some((b) => b.category === 'Venue & Production Setup')).toBe(true);

    const bdayPlan = generateDefaultPlan("Aarav's 5th Birthday, 40 guests, 1L, Pune, superhero");
    expect(bdayPlan.title.includes('Sister')).toBe(false);
    expect(bdayPlan.event_type).toBe('birthday');
    expect(bdayPlan.guests).toBe(40);
    expect(bdayPlan.total_budget).toBe(100000);
    expect(bdayPlan.budget.some((b) => b.category === 'Party Venue & Balloon Decor')).toBe(true);

    const sangeetPlan = generateDefaultPlan("Pooja's Sangeet, 120 guests, 5L, Hyderabad, royal heritage");
    expect(sangeetPlan.title.includes('Sister')).toBe(false);
    expect(sangeetPlan.theme).toBe('Royal Heritage & Elegance');
    expect(sangeetPlan.budget.some((b) => b.category === 'Venue & Stage Decor')).toBe(true);
    expect(sangeetPlan.budget.some((b) => b.category === 'DJ & Music Entertainment')).toBe(true);
  });

  it('applySmartReplan removes includes("l") bug and only changes explicit requests', () => {
    const basePlan: EventPlan = {
      title: 'Family Celebration',
      event_type: 'celebration',
      event_date: '2026-12-20',
      guests: 100,
      total_budget: 500000,
      city: 'Delhi NCR',
      theme: 'Celebration & Festivities',
      budget: [
        { category: 'Venue', pct: 40, locked: false },
        { category: 'Catering', pct: 40, locked: false },
        { category: 'Entertainment', pct: 20, locked: false },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
      risks: [
        { id: 'rain', title: 'Rain', category: 'weather', likelihood: 'medium', impact: 'high', mitigation: 'Use a canopy', backup_plan: 'Move indoors' },
        { id: 'curfew', title: 'Curfew', category: 'legal', likelihood: 'high', impact: 'high', mitigation: 'Get a permit', backup_plan: 'Use acoustic music' },
        { id: 'overflow', title: 'Overflow', category: 'logistics', likelihood: 'medium', impact: 'medium', mitigation: 'Keep buffer plates', backup_plan: 'Open a second counter' },
      ],
      clarifying_question: null,
    };

    const replan1 = applySmartReplan(basePlan, 'reduce budget by 1L');
    expect(replan1.total_budget).toBe(400000);
    expect(replan1.guests).toBe(100);

    const replan2 = applySmartReplan(basePlan, 'set budget to 8L');
    expect(replan2.total_budget).toBe(800000);
    expect(replan2.guests).toBe(100);

    const replan3 = applySmartReplan(basePlan, 'please add floral garlands');
    expect(replan3.total_budget).toBe(500000);

    const replan4 = applySmartReplan(basePlan, 'add 50 guests');
    expect(replan4.guests).toBe(150);
    expect(replan4.total_budget).toBe(500000);
  });
});
