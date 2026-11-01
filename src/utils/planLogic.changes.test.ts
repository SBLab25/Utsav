import { describe, expect, it } from 'vitest';
import type { EventPlan } from '../types/plan.ts';
import { applyChange } from './planLogic.ts';

const plan: EventPlan = {
  title: 'Test Celebration',
  event_type: 'birthday',
  event_date: '2099-12-14',
  guests: 100,
  total_budget: 100000,
  city: 'Vizag',
  theme: 'Warm',
  budget: [
    { category: 'Decor', pct: 50, locked: false, amount: 50000, spent: 0 },
    { category: 'Catering', pct: 50, locked: false, amount: 50000, spent: 0 },
  ],
  timeline: [{ title: 'Book venue', owner: 'Family', t_minus_days: 30, done: false }],
  vendors: [{
    type: 'Venue',
    est_low: 50000,
    est_high: 80000,
    questions: [],
    red_flags: [],
    outreach_message: '',
    status: 'todo',
  }],
  ideas: [],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'low', impact: 'medium', mitigation: 'Watch forecast', backup_plan: 'Move indoors' },
    { title: 'Delay', category: 'vendor', likelihood: 'low', impact: 'medium', mitigation: 'Confirm arrival', backup_plan: 'Use backup' },
    { title: 'Overflow', category: 'logistics', likelihood: 'low', impact: 'low', mitigation: 'Keep buffer', backup_plan: 'Open counter' },
  ],
  guest_list: [],
};

describe('applyChange', () => {
  it('applies moveBudget while preserving the total', () => {
    const updated = applyChange(plan, { op: 'moveBudget', from: 'Decor', to: 'Catering', amount: 10000 });
    expect(updated.total_budget).toBe(plan.total_budget);
    expect(updated.budget.find((item) => item.category === 'Decor')?.amount).toBe(40000);
    expect(updated.budget.find((item) => item.category === 'Catering')?.amount).toBe(60000);
  });

  it('applies logSpend', () => {
    expect(applyChange(plan, { op: 'logSpend', category: 'Decor', amount: 5000 }).budget[0].spent).toBe(5000);
  });

  it('adds and toggles tasks', () => {
    const added = applyChange(plan, { op: 'addTask', title: 'Send invitations', owner: 'Friends', t_minus_days: 14 });
    expect(added.timeline.some((task) => task.title === 'Send invitations')).toBe(true);
    const toggled = applyChange(plan, { op: 'toggleTask', title: 'Book venue' });
    expect(toggled.timeline[0].done).toBe(true);
  });

  it('adds a vendor and updates vendor status', () => {
    const added = applyChange(plan, { op: 'addVendor', type: 'Caterer', est_low: 30000, est_high: 50000, questions: ['Menu?'] });
    expect(added.vendors.some((vendor) => vendor.type === 'Caterer')).toBe(true);
    const updated = applyChange(plan, { op: 'setVendorStatus', type: 'Venue', status: 'booked', quote: 70000 });
    expect(updated.vendors[0].status).toBe('booked');
    expect(updated.vendors[0].quote).toBe(70000);
  });

  it('adds an idea and updates guests and budget', () => {
    expect(applyChange(plan, { op: 'addIdea', category: 'decor', title: 'Neon wall', description: 'A bright photo wall.' }).ideas).toHaveLength(1);
    expect(applyChange(plan, { op: 'setGuests', guests: 140 }).guests).toBe(140);
    expect(applyChange(plan, { op: 'setBudget', total_budget: 120000 }).total_budget).toBe(120000);
  });

  it('rejects unsafe changes and leaves the plan untouched', () => {
    const locked = { ...plan, budget: plan.budget.map((item, index) => ({ ...item, locked: index === 0 })) };
    expect(applyChange(plan, { op: 'moveBudget', from: 'Decor', to: 'Catering', amount: 60000 })).toEqual(plan);
    expect(applyChange(locked, { op: 'moveBudget', from: 'Decor', to: 'Catering', amount: 1000 })).toEqual(locked);
    expect(applyChange(plan, { op: 'setVendorStatus', type: 'Unknown', status: 'booked' })).toEqual(plan);
  });
});
