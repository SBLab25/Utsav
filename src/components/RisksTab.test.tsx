/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RisksTab } from './RisksTab.tsx';
import type { RiskItem } from '../types/plan.ts';

const SAMPLE_RISKS: RiskItem[] = [
  {
    risk: 'Sudden rain in Vizag outdoor venue',
    mitigation: 'Cover with waterproof canopy 48h prior',
    severity: 'medium',
  },
  {
    risk: 'Local police sound curfew after 10 PM',
    mitigation: 'Acquire entertainment permit and move indoors',
    severity: 'high',
  },
];

describe('RisksTab Component', () => {
  it('renders risks list and severity badges', () => {
    render(<RisksTab risks={SAMPLE_RISKS} />);

    expect(screen.getByText('Risk Assessment & Contingency Kit')).toBeInTheDocument();
    expect(screen.getByText('Sudden rain in Vizag outdoor venue')).toBeInTheDocument();
    expect(screen.getByText('Local police sound curfew after 10 PM')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    const { container } = render(<RisksTab risks={[]} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('allows adding a custom risk', () => {
    const onUpdateMock = vi.fn();
    render(<RisksTab risks={SAMPLE_RISKS} onUpdateRisks={onUpdateMock} />);

    // Click "Add Custom Risk"
    const addBtn = screen.getByRole('button', { name: /add custom risk/i });
    fireEvent.click(addBtn);

    // Form should appear
    const riskInput = screen.getByLabelText(/potential risk or bottleneck/i);
    const mitigationInput = screen.getByLabelText(/actionable contingency/i);

    fireEvent.change(riskInput, { target: { value: 'Guest transportation bottleneck' } });
    fireEvent.change(mitigationInput, { target: { value: 'Book two 20-seater shuttle minibuses' } });

    const saveBtn = screen.getByRole('button', { name: /save risk/i });
    fireEvent.click(saveBtn);

    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    const updatedRisks = onUpdateMock.mock.calls[0][0];
    expect(updatedRisks[0].risk).toBe('Guest transportation bottleneck');
    expect(updatedRisks[0].mitigation).toBe('Book two 20-seater shuttle minibuses');
  });
});
