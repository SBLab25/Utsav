/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BudgetTab } from './BudgetTab.tsx';
import type { BudgetItem } from '../types/plan.ts';

function BudgetTabTestHarness() {
  const [budget, setBudget] = useState<BudgetItem[]>([
    { category: 'Venue', pct: 50, locked: false, amount: 300000 },
    { category: 'Catering', pct: 50, locked: false, amount: 300000 },
  ]);
  const [totalBudget, setTotalBudget] = useState(600000);

  return (
    <BudgetTab
      budget={budget}
      totalBudget={totalBudget}
      guests={150}
      onUpdateBudget={(newBudget, newTotal) => {
        setBudget(newBudget);
        setTotalBudget(newTotal);
      }}
    />
  );
}

describe('BudgetTab Component', () => {
  it('toggling a lock keeps that amount after the slider changes', () => {
    render(<BudgetTabTestHarness />);

    // Verify initial rendering
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Catering')).toBeInTheDocument();

    // Lock Venue category
    const lockButton = screen.getByRole('button', { name: /Lock Venue/i });
    fireEvent.click(lockButton);

    // Button should now be in locked state
    expect(screen.getByRole('button', { name: /Unlock Venue/i })).toBeInTheDocument();

    // Adjust budget slider from 600,000 down to 480,000 (-20%)
    const slider = screen.getByLabelText(/Adjust total celebration budget/i);
    fireEvent.change(slider, { target: { value: '480000' } });

    // Locked Venue retains exact ₹3,00,000 allocation while unlocked Catering drops to ₹1,80,000
    expect(screen.getByText('₹3,00,000')).toBeInTheDocument();
    expect(screen.getByText('₹1,80,000')).toBeInTheDocument();
  });
});
