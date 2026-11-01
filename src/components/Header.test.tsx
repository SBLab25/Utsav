/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Header } from './Header.tsx';
import type { EventPlan } from '../types/plan.ts';

const mockPlan: EventPlan = {
  id: 'plan-share-test',
  title: 'Grand Bollywood Sangeet',
  event_type: 'Sangeet',
  event_date: '2026-12-14',
  guests: 150,
  total_budget: 600000,
  city: 'Mumbai',
  theme: 'Retro Glamour',
  budget: [
    { category: 'Venue', pct: 40, amount: 240000, locked: false },
    { category: 'Catering', pct: 60, amount: 360000, locked: false },
  ],
  timeline: [
    { t_minus_days: 14, title: 'Rehearsal Session', owner: 'Choreographer', done: false },
  ],
  vendors: [
    {
      type: 'DJ & Sound Tech',
      est_low: 50000,
      est_high: 80000,
      questions: ['Are lights included?'],
      red_flags: ['No backup equipment'],
      outreach_message: 'Hi, inquiring about Sangeet DJ services.',
    },
  ],
  ideas: [
    { category: 'decor', title: 'Vintage Cassette Photo Booth', description: 'Retro 90s aesthetic' },
  ],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'low', impact: 'high', mitigation: 'Canopy', backup_plan: 'Indoors' },
    { title: 'Power surge', category: 'logistics', likelihood: 'low', impact: 'high', mitigation: 'Generator', backup_plan: 'Backup power' },
    { title: 'Catering delay', category: 'vendor', likelihood: 'low', impact: 'medium', mitigation: 'Buffer time', backup_plan: 'Start live counters' },
  ],
  payments: [],
};

describe('Header Component - Combined Share Button', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders only one single Share button at the top instead of separate buttons', () => {
    render(
      <Header
        plan={mockPlan}
        darkMode={false}
        onToggleDarkMode={vi.fn()}
        onOpenHistory={vi.fn()}
        historyCount={0}
      />
    );

    // Only one single Share button exists at the top
    const shareButton = screen.getByRole('button', { name: /Share celebration plan/i });
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveTextContent('Share');

    // Separate standalone buttons from before are NOT directly in the top header
    expect(screen.queryByRole('button', { name: /Copy WhatsApp event summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy share link for this plan/i })).not.toBeInTheDocument();
  });

  it('toggles share menu with Copy Link, WhatsApp Summary, and Open WhatsApp options', async () => {
    render(
      <Header
        plan={mockPlan}
        darkMode={false}
        onToggleDarkMode={vi.fn()}
        onOpenHistory={vi.fn()}
        historyCount={0}
      />
    );

    const shareButton = screen.getByRole('button', { name: /Share celebration plan/i });
    expect(screen.queryByRole('menu', { name: /Share plan options/i })).not.toBeInTheDocument();

    // Click to open share dropdown
    fireEvent.click(shareButton);

    // Dropdown menu is now open
    expect(screen.getByRole('menu', { name: /Share plan options/i })).toBeInTheDocument();
    expect(screen.getByText('Copy Shareable Link')).toBeInTheDocument();
    expect(screen.getByText('Copy WhatsApp Summary')).toBeInTheDocument();
    expect(screen.getByText('Open in WhatsApp')).toBeInTheDocument();

    // Test Copy Shareable Link
    const copyLinkItem = screen.getByText('Copy Shareable Link');
    fireEvent.click(copyLinkItem);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('plan=')
    );

    // Test Copy WhatsApp Summary
    const copyWhatsAppItem = screen.getByText('Copy WhatsApp Summary');
    fireEvent.click(copyWhatsAppItem);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('GRAND BOLLYWOOD SANGEET')
    );
  });

  it('closes share menu on Escape key', () => {
    render(
      <Header
        plan={mockPlan}
        darkMode={false}
        onToggleDarkMode={vi.fn()}
        onOpenHistory={vi.fn()}
        historyCount={0}
      />
    );

    const shareButton = screen.getByRole('button', { name: /Share celebration plan/i });
    fireEvent.click(shareButton);
    expect(screen.getByRole('menu', { name: /Share plan options/i })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: /Share plan options/i })).not.toBeInTheDocument();
  });
});
