/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GuestsTab, getConfirmedHeadcount, getDietSummary } from './GuestsTab.tsx';
import type { Guest } from '../types/plan.ts';

const guests: Guest[] = [
  { id: '1', name: 'Asha', group: 'family', status: 'confirmed', diet: 'veg', plus_ones: 1 },
  { id: '2', name: 'Kabir', group: 'friends', status: 'confirmed', diet: 'non-veg', plus_ones: 0 },
  { id: '3', name: 'Mina', group: 'colleagues', status: 'invited', diet: 'vegan', plus_ones: 0 },
  { id: '4', name: 'Ravi', group: 'other', status: 'declined', diet: 'jain', plus_ones: 0 },
];

const renderGuests = (onRequestReplan = vi.fn()) =>
  render(
    <GuestsTab
      guests={guests}
      planGuests={2}
      eventTitle="Test Celebration"
      ideas={[{ category: 'rsvp', title: 'RSVP', description: 'Please join us!' }]}
      onUpdateGuests={vi.fn()}
      onRequestReplan={onRequestReplan}
    />
  );

describe('GuestsTab', () => {
  it('calculates confirmed headcount including plus-ones and warns when it exceeds plan by more than 5%', () => {
    expect(getConfirmedHeadcount(guests)).toBe(3);
    const requestReplan = vi.fn();
    renderGuests(requestReplan);

    expect(screen.getAllByText(/Confirmed headcount/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Confirmed headcount').parentElement).toHaveTextContent('3 of 2 planned');
    fireEvent.click(screen.getByRole('button', { name: /Update plan to 3 guests/i }));
    expect(requestReplan).toHaveBeenCalledWith(expect.stringContaining('3'));
  });

  it('summarizes confirmed catering diets including plus-ones', () => {
    expect(getDietSummary(guests)).toEqual({ veg: 2, 'non-veg': 1, jain: 0, vegan: 0 });
    renderGuests();
    expect(screen.getByText('Catering summary')).toBeInTheDocument();
    expect(screen.getByText('2', { selector: 'strong' })).toBeInTheDocument();
  });
});
