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
    id: 'rain',
    title: 'Sudden rain in Vizag outdoor venue',
    category: 'weather',
    likelihood: 'medium',
    impact: 'high',
    mitigation: 'Cover with waterproof canopy 48h prior',
    backup_plan: 'Move indoors',
  },
  {
    id: 'curfew',
    title: 'Local police sound curfew after 10 PM',
    category: 'legal',
    likelihood: 'high',
    impact: 'high',
    mitigation: 'Acquire entertainment permit and move indoors',
    backup_plan: 'Use acoustic music',
  },
];

describe('RisksTab Component', () => {
  it('renders risks list and severity badges', () => {
    render(<RisksTab risks={SAMPLE_RISKS} />);

    expect(screen.getByText('Risk Radar')).toBeInTheDocument();
    expect(screen.getAllByText('Sudden rain in Vizag outdoor venue').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Local police sound curfew after 10 PM').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Impact: High').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Likelihood: Medium')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    const { container } = render(<RisksTab risks={[]} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('allows adding a custom risk', () => {
    const onUpdateMock = vi.fn();
    render(<RisksTab risks={SAMPLE_RISKS} onUpdateRisks={onUpdateMock} />);

    const addBtn = screen.getByRole('button', { name: /add risk/i });
    fireEvent.click(addBtn);

    // Form should appear
    const riskInput = screen.getByLabelText(/risk title/i);
    const mitigationInput = screen.getByLabelText(/risk mitigation/i);
    const backupInput = screen.getByLabelText(/risk backup plan/i);

    fireEvent.change(riskInput, { target: { value: 'Guest transportation bottleneck' } });
    fireEvent.change(mitigationInput, { target: { value: 'Book two 20-seater shuttle minibuses' } });
    fireEvent.change(backupInput, { target: { value: 'Use volunteer drivers' } });

    const saveBtn = screen.getByRole('button', { name: /save risk/i });
    fireEvent.click(saveBtn);

    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    const updatedRisks = onUpdateMock.mock.calls[0][0];
    expect(updatedRisks[0].title).toBe('Guest transportation bottleneck');
    expect(updatedRisks[0].mitigation).toBe('Book two 20-seater shuttle minibuses');
  });
});
