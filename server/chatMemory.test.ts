/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { optimizeChatMemory } from './chatMemory.ts';
import type { EventPlan } from '../src/types/plan.ts';
import type { ChatTurn } from '../src/schemas/changes.ts';

const mockPlan: EventPlan = {
  title: "Sister's Retro Bollywood Sangeet",
  event_type: 'sangeet',
  event_date: '2026-12-14',
  guests: 150,
  total_budget: 600000,
  city: 'Vizag',
  theme: 'Retro Bollywood',
  budget: [
    { category: 'Venue', pct: 50, amount: 300000, locked: true },
    { category: 'Catering', pct: 50, amount: 300000, locked: false },
  ],
  timeline: [],
  vendors: [],
  ideas: [],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'low', impact: 'low', mitigation: 'None', backup_plan: 'None' },
    { title: 'Delay', category: 'vendor', likelihood: 'low', impact: 'low', mitigation: 'None', backup_plan: 'None' },
    { title: 'Curfew', category: 'legal', likelihood: 'low', impact: 'low', mitigation: 'None', backup_plan: 'None' },
  ],
};

describe('chatMemory optimizer', () => {
  it('keeps short conversations verbatim without truncation', () => {
    const history: ChatTurn[] = [
      { role: 'user', content: 'Can we move budget to catering?' },
      { role: 'assistant', content: 'Yes, I can move ₹20,000 from venue to catering.' },
    ];

    const result = optimizeChatMemory(history, mockPlan);
    expect(result.historyBlock).toContain('Can we move budget to catering?');
    expect(result.historyBlock).toContain('Yes, I can move ₹20,000');
    expect(result.historyBlock).not.toContain('<PRIOR_DECISION_MEMORY>');
    expect(result.memorySummary).toBe('');
  });

  it('compresses conversations longer than 6 turns into decision memory plus recent turns', () => {
    const history: ChatTurn[] = [
      { role: 'user', content: 'Turn 1: set guests to 200' },
      { role: 'assistant', content: 'Turn 1 proposal: setGuests' },
      { role: 'user', content: 'Turn 2: add Live Chaat counter' },
      { role: 'assistant', content: 'Turn 2 proposal: addIdea' },
      { role: 'user', content: 'Turn 3: lock the catering budget' },
      { role: 'assistant', content: 'Turn 3 proposal: lockBudget' },
      { role: 'user', content: 'Turn 4: check photography vendors' },
      { role: 'assistant', content: 'Turn 4: here are photographer options' },
      { role: 'user', content: 'Turn 5: what about sound backup?' },
      { role: 'assistant', content: 'Turn 5: check generator requirements' },
      { role: 'user', content: 'Turn 6: final countdown timeline' },
      { role: 'assistant', content: 'Turn 6: updated countdown' },
      { role: 'user', content: 'Turn 7: add choreography rehearsal' },
      { role: 'assistant', content: 'Turn 7: added choreography' },
    ];

    const result = optimizeChatMemory(history, mockPlan, 'User prefers vegetarian catering only');
    expect(result.historyBlock).toContain('<PRIOR_DECISION_MEMORY>');
    expect(result.memorySummary).toContain('User prefers vegetarian catering only');
    expect(result.memorySummary).toContain('Turn 1: set guests to 200');
    expect(result.historyBlock).toContain('<RECENT_TURNS>');
    expect(result.historyBlock).toContain('Turn 7: add choreography rehearsal');
  });

  it('prunes plannerContext so large unnecessary fields are omitted from token payload', () => {
    const result = optimizeChatMemory([], mockPlan);
    expect(result.plannerContext.title).toBe("Sister's Retro Bollywood Sangeet");
    expect(result.plannerContext.budget).toHaveLength(2);
    expect((result.plannerContext as any).guest_list).toBeUndefined();
  });
});
