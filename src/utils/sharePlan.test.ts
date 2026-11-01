/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { decodeSharedPlan, encodeSharedPlan, stripGuestsForSharing } from './sharePlan.ts';
import type { EventPlan } from '../types/plan.ts';

const plan: EventPlan = {
  id: 'share-test',
  title: 'Private Celebration',
  event_type: 'birthday',
  event_date: '2026-12-14',
  guests: 20,
  total_budget: 50000,
  city: 'Pune',
  theme: 'Garden',
  budget: [
    { category: 'Venue', pct: 60, locked: false },
    { category: 'Food', pct: 40, locked: false },
  ],
  timeline: [],
  vendors: [],
  ideas: [{ category: 'theme', title: 'Garden', description: 'Flowers' }],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'medium', impact: 'high', mitigation: 'Canopy', backup_plan: 'Indoor' },
    { title: 'Delay', category: 'logistics', likelihood: 'low', impact: 'medium', mitigation: 'Buffer', backup_plan: 'Shorten' },
    { title: 'Cost', category: 'budget', likelihood: 'low', impact: 'low', mitigation: 'Reserve', backup_plan: 'Trim' },
  ],
  guest_list: [
    { id: 'g1', name: 'Asha Secret', group: 'family', status: 'confirmed', diet: 'veg', allergy_note: 'private note', plus_ones: 1 },
  ],
  clarifying_question: null,
};

describe('sharePlan', () => {
  it('round-trips a plan through compressed URL-safe encoding', () => {
    const encoded = encodeSharedPlan(plan);
    expect(encoded).not.toContain('Asha');
    const decoded = decodeSharedPlan(encoded);
    expect(decoded).toEqual(expect.objectContaining({
      title: plan.title,
      event_date: plan.event_date,
    }));
    expect(decoded?.guest_list).toBeUndefined();
  });

  it('strips guest data and phone numbers before sharing', () => {
    const safe = stripGuestsForSharing({
      ...plan,
      theme: 'Call 98765 43210 for details',
    });
    expect(safe.guest_list).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain('Asha Secret');
    expect(JSON.stringify(safe)).not.toContain('98765');
  });

  it('fails gracefully for corrupt or invalid links', () => {
    expect(decodeSharedPlan('not-a-valid-plan')).toBeNull();
  });
});
