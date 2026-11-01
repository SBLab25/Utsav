/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generateDefaultPlan, applySmartReplan } from './fallback.ts';
import type { EventPlan } from '../src/types/plan.ts';

describe('server/fallback', () => {
  it('"Sister\'s sangeet, 150 guests, ₹6L, 14 Dec, Vizag" gives guests 150, budget 600000, city Vizag', () => {
    const brief = "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag";
    const plan = generateDefaultPlan(brief, new Date('2026-10-01'));

    expect(plan.guests).toBe(150);
    expect(plan.total_budget).toBe(600000);
    expect(plan.city).toBe('Vizag');
  });

  it('"reduce budget by 1L" lowers budget by exactly 100000', () => {
    const initialPlan: EventPlan = {
      title: 'Sister Sangeet',
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [
        { category: 'Venue', pct: 60, locked: false },
        { category: 'Catering', pct: 40, locked: false },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
      clarifying_question: null,
    };

    const replanned = applySmartReplan(initialPlan, 'reduce budget by 1L');
    expect(replanned.total_budget).toBe(500000);
  });

  it('"add 50 guests" adds 50 guests', () => {
    const initialPlan: EventPlan = {
      title: 'Sister Sangeet',
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [
        { category: 'Venue', pct: 60, locked: false },
        { category: 'Catering', pct: 40, locked: false },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
      clarifying_question: null,
    };

    const replanned = applySmartReplan(initialPlan, 'add 50 guests');
    expect(replanned.guests).toBe(200);
  });

  it('text with a letter "l" but no budget words changes nothing', () => {
    const initialPlan: EventPlan = {
      title: 'Sister Sangeet',
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Bollywood',
      budget: [
        { category: 'Venue', pct: 60, locked: false },
        { category: 'Catering', pct: 40, locked: false },
      ],
      timeline: [],
      vendors: [],
      ideas: [],
      clarifying_question: null,
    };

    // Text containing the letter 'l' multiple times but no budget modification phrases
    const replanned = applySmartReplan(initialPlan, 'make it lovely, elegant, and playful for all relatives');
    expect(replanned.total_budget).toBe(600000);
    expect(replanned.guests).toBe(150);
  });
});
