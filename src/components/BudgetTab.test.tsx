/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BudgetTab } from './BudgetTab.tsx';
import type { BudgetItem, PaymentRecord } from '../types/plan.ts';

function BudgetTabTestHarness(props: {
  initialBudget?: BudgetItem[];
  initialTotalBudget?: number;
  initialPayments?: PaymentRecord[];
  onLogPayment?: (payment: Omit<PaymentRecord, 'id'>) => void;
  onUpdateBudgetSpy?: (budget: BudgetItem[], total: number) => void;
}) {
  const [budget, setBudget] = useState<BudgetItem[]>(
    props.initialBudget || [
      { category: 'Venue', pct: 50, locked: false, amount: 300000, spent: 0 },
      { category: 'Catering', pct: 50, locked: false, amount: 300000, spent: 0 },
    ]
  );
  const [totalBudget, setTotalBudget] = useState(props.initialTotalBudget || 600000);
  const [payments, setPayments] = useState<PaymentRecord[]>(props.initialPayments || []);

  return (
    <BudgetTab
      budget={budget}
      totalBudget={totalBudget}
      guests={150}
      payments={payments}
      onUpdateBudget={(newBudget, newTotal) => {
        setBudget(newBudget);
        setTotalBudget(newTotal);
        props.onUpdateBudgetSpy?.(newBudget, newTotal);
      }}
      onLogPayment={(payment) => {
        const newRecord: PaymentRecord = {
          id: `p-${Date.now()}`,
          ...payment,
        };
        setPayments((prev) => [...prev, newRecord]);
        props.onLogPayment?.(payment);
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
    const venueAmounts = screen.getAllByText('₹3,00,000');
    expect(venueAmounts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹1,80,000').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Planned, Spent, Remaining metrics and progress bar with text labels', () => {
    const budget: BudgetItem[] = [
      { category: 'Catering', pct: 50, locked: false, amount: 300000, spent: 100000 },
      { category: 'Decor', pct: 50, locked: false, amount: 300000, spent: 0 },
    ];
    const payments: PaymentRecord[] = [
      { id: 'p1', category: 'Catering', amount: 100000, note: 'Tasting advance', date: '2026-11-01' },
    ];

    render(
      <BudgetTabTestHarness
        initialBudget={budget}
        initialTotalBudget={600000}
        initialPayments={payments}
      />
    );

    // Progress bar has role="progressbar", aria-valuenow and aria-valuetext
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThanOrEqual(1);

    // Catering progress bar reflects spent amount and planned limits
    const cateringBar = progressBars[0];
    expect(cateringBar).toHaveAttribute('aria-valuenow', '100000');
    expect(cateringBar).toHaveAttribute('aria-valuemax', '300000');
    expect(cateringBar).toHaveAttribute('aria-valuetext', '₹1,00,000 spent of ₹3,00,000 planned');

    // Text labels ensure color is not the only signal
    expect(screen.getByText('33% spent')).toBeInTheDocument();
    expect(screen.getByText('₹2,00,000 remaining')).toBeInTheDocument();
  });

  it('opens Log Payment form, validates inputs, and records payment', () => {
    const onLogPaymentSpy = vi.fn();
    render(<BudgetTabTestHarness onLogPayment={onLogPaymentSpy} />);

    // Click "Log payment" button for Venue
    const logButtons = screen.getAllByRole('button', { name: /Log payment/i });
    fireEvent.click(logButtons[0]);

    // Modal opens
    expect(screen.getByRole('heading', { name: /Log Payment/i })).toBeInTheDocument();
    expect(screen.getByText(/Record a payment disbursed for/i)).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText(/e.g. 25000/i);
    const noteInput = screen.getByPlaceholderText(/e.g. Booking Advance/i);
    const form = amountInput.closest('form')!;

    // Validation: Exceeding total celebration budget
    fireEvent.change(amountInput, { target: { value: '999999999' } });
    fireEvent.submit(form);
    expect(screen.getByText(/Payment cannot exceed total celebration budget/i)).toBeInTheDocument();
    expect(onLogPaymentSpy).not.toHaveBeenCalled();

    // Valid payment submission
    fireEvent.change(amountInput, { target: { value: '50000' } });
    fireEvent.change(noteInput, { target: { value: 'Token advance' } });
    fireEvent.submit(form);

    expect(onLogPaymentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Venue',
        amount: 50000,
        note: 'Token advance',
      })
    );
  });

  it('detects category overrun, displays overrun warning and rebalances on confirmation', () => {
    const initialBudget: BudgetItem[] = [
      { category: 'Catering', pct: 40, locked: false, amount: 240000, spent: 300000 }, // Overrun by 60,000
      { category: 'Decor', pct: 60, locked: false, amount: 360000, spent: 100000 }, // Unlocked surplus 260,000
    ];
    const payments: PaymentRecord[] = [
      { id: 'p1', category: 'Catering', amount: 300000, note: 'Exceeded', date: '2026-11-01' },
      { id: 'p2', category: 'Decor', amount: 100000, note: 'Advance', date: '2026-11-01' },
    ];
    const updateSpy = vi.fn();

    render(
      <BudgetTabTestHarness
        initialBudget={initialBudget}
        initialTotalBudget={600000}
        initialPayments={payments}
        onUpdateBudgetSpy={updateSpy}
      />
    );

    // Overrun warning is displayed
    expect(screen.getByText(/Spent exceeds planned by ₹60,000/i)).toBeInTheDocument();

    // Click "Rebalance" button
    const rebalanceBtn = screen.getByRole('button', { name: /Rebalance/i });
    fireEvent.click(rebalanceBtn);

    // Proposal confirmation box appears with diff chips
    expect(screen.getByText(/Rebalance Proposal for Catering/i)).toBeInTheDocument();
    expect(screen.getByText('+₹60,000')).toBeInTheDocument();
    expect(screen.getAllByText('-₹60,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Moved ₹60,000 from Decor/i)).toBeInTheDocument();

    // Confirm and apply rebalance
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply Rebalance/i });
    fireEvent.click(confirmBtn);

    expect(updateSpy).toHaveBeenCalled();
    const calledBudget: BudgetItem[] = updateSpy.mock.calls[0][0];
    const cateringItem = calledBudget.find((b) => b.category === 'Catering')!;
    const decorItem = calledBudget.find((b) => b.category === 'Decor')!;

    expect(cateringItem.amount).toBe(300000);
    expect(decorItem.amount).toBe(300000);
  });

  it('displays totals row with plain-text status', () => {
    // 1. Within budget
    const { unmount } = render(<BudgetTabTestHarness />);
    expect(screen.getByText('Total Planned')).toBeInTheDocument();
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
    expect(screen.getByText('Total Remaining')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
    unmount();

    // 2. Over budget
    const overrunBudget: BudgetItem[] = [
      { category: 'Venue', pct: 50, locked: false, amount: 300000, spent: 400000 },
      { category: 'Catering', pct: 50, locked: false, amount: 300000, spent: 350000 },
    ];
    const overrunPayments: PaymentRecord[] = [
      { id: '1', category: 'Venue', amount: 400000, note: '', date: '2026-11-01' },
      { id: '2', category: 'Catering', amount: 350000, note: '', date: '2026-11-01' },
    ];

    render(
      <BudgetTabTestHarness
        initialBudget={overrunBudget}
        initialTotalBudget={600000}
        initialPayments={overrunPayments}
      />
    );
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });
});
