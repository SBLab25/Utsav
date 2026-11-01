import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CoPlannerPanel } from './CoPlannerPanel.tsx';
import { applyChange } from '../utils/planLogic.ts';
import type { EventPlan } from '../types/plan.ts';

const plan: EventPlan = {
  title: 'Test Celebration',
  event_type: 'birthday',
  event_date: '2099-12-14',
  guests: 100,
  total_budget: 100000,
  city: 'Vizag',
  theme: 'Warm',
  budget: [
    { category: 'Decor', pct: 50, locked: false, amount: 50000 },
    { category: 'Catering', pct: 50, locked: false, amount: 50000 },
  ],
  timeline: [],
  vendors: [],
  ideas: [],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'low', impact: 'medium', mitigation: 'Watch forecast', backup_plan: 'Move indoors' },
    { title: 'Delay', category: 'vendor', likelihood: 'low', impact: 'medium', mitigation: 'Confirm arrival', backup_plan: 'Use backup' },
    { title: 'Overflow', category: 'logistics', likelihood: 'low', impact: 'low', mitigation: 'Keep buffer', backup_plan: 'Open counter' },
  ],
};

function Harness() {
  const [current, setCurrent] = useState(plan);
  return (
    <>
      <output aria-label="current budget">{current.budget[0].amount}</output>
      <CoPlannerPanel plan={current} onApply={(change) => setCurrent(applyChange(current, change))} />
    </>
  );
}

describe('CoPlannerPanel', () => {
  it('does not change the plan before Apply is pressed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: 'I suggest moving some decor budget.',
        proposals: [{ op: 'moveBudget', from: 'Decor', to: 'Catering', amount: 10000 }],
      }),
    }));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Move ₹20,000/i }));
    await waitFor(() => expect(screen.getByText('I suggest moving some decor budget.')).toBeInTheDocument());
    expect(screen.getByLabelText('current budget')).toHaveTextContent('50000');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByLabelText('current budget')).toHaveTextContent('40000');
    vi.unstubAllGlobals();
  });
});
