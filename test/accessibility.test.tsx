/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import App from '../src/App.tsx';
import { BudgetTab } from '../src/components/BudgetTab.tsx';
import { TimelineTab } from '../src/components/TimelineTab.tsx';
import { VendorsTab } from '../src/components/VendorsTab.tsx';
import { IdeasTab } from '../src/components/IdeasTab.tsx';
import { DonutChart } from '../src/components/DonutChart.tsx';
import { HistoryDrawer } from '../src/components/HistoryDrawer.tsx';
import { StatusBanner } from '../src/components/StatusBanner.tsx';
import { BriefInput } from '../src/components/BriefInput.tsx';
import { ReplanBox } from '../src/components/ReplanBox.tsx';
import { DiffViewer } from '../src/components/DiffViewer.tsx';
import type { EventPlan, BudgetItem, TimelineTask, VendorRequirement, IdeaItem, PlanHistoryItem } from '../src/types/plan.ts';

// Helper for type-safe vitest-axe matcher invocation
function expectNoViolations(results: any) {
  (expect(results) as any).toHaveNoViolations();
}

const SAMPLE_BUDGET: BudgetItem[] = [
  { category: 'Venue & Decor', pct: 40, locked: false, amount: 240000 },
  { category: 'Catering', pct: 30, locked: true, amount: 180000 },
  { category: 'Entertainment', pct: 15, locked: false, amount: 90000 },
  { category: 'Photography', pct: 15, locked: false, amount: 90000 },
];

const SAMPLE_TIMELINE: TimelineTask[] = [
  { t_minus_days: 60, title: 'Book Venue', owner: 'Planner', done: true },
  { t_minus_days: 30, title: 'Tasting Session', owner: 'Family', done: false },
  { t_minus_days: 0, title: 'Event Day', owner: 'Team', done: false },
];

const SAMPLE_VENDORS: VendorRequirement[] = [
  {
    type: 'Catering & Live Counters',
    est_low: 150000,
    est_high: 220000,
    questions: ['Do you offer live chaat?', 'Is staff uniform included?'],
    red_flags: ['No license', 'Hidden transport fee'],
    outreach_message: 'Hi, looking for catering for 150 guests on 14 Dec.',
  },
];

const SAMPLE_IDEAS: IdeaItem[] = [
  {
    category: 'theme',
    title: 'Retro Bollywood',
    description: 'Gold curtains, vintage cassettes, and classic vinyl records.',
  },
];

const SAMPLE_PLAN: EventPlan = {
  title: "Sister's Retro Bollywood Sangeet",
  event_type: 'sangeet',
  event_date: '2026-12-14',
  guests: 150,
  total_budget: 600000,
  city: 'Vizag',
  theme: 'Retro Bollywood Glamour',
  budget: SAMPLE_BUDGET,
  timeline: SAMPLE_TIMELINE,
  vendors: SAMPLE_VENDORS,
  ideas: SAMPLE_IDEAS,
};

const SAMPLE_HISTORY: PlanHistoryItem[] = [
  {
    id: 'h1',
    plan: SAMPLE_PLAN,
    timestamp: Date.now(),
    label: 'Initial Sangeet Plan',
  },
];

describe('Accessibility (WCAG 2.1 AA) via vitest-axe', () => {
  beforeEach(() => {
    // Mock matchMedia for prefers-reduced-motion
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders App main view with no axe violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders BudgetTab with no axe violations', async () => {
    const { container } = render(
      <BudgetTab
        budget={SAMPLE_BUDGET}
        totalBudget={600000}
        guests={150}
        onUpdateBudget={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders DonutChart in table mode with no axe violations', async () => {
    const slices = SAMPLE_BUDGET.map((b) => ({
      label: b.category,
      pct: b.pct,
      amount: b.amount ?? 0,
      color: '#F5A623',
      locked: b.locked,
    }));
    const { container } = render(
      <DonutChart slices={slices} totalBudget={600000} guests={150} />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders TimelineTab with no axe violations', async () => {
    const { container } = render(
      <TimelineTab
        timeline={SAMPLE_TIMELINE}
        eventDate="2026-12-14"
        plan={SAMPLE_PLAN}
        onUpdateTimeline={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders VendorsTab with no axe violations', async () => {
    const { container } = render(
      <VendorsTab
        vendors={SAMPLE_VENDORS}
        city="Vizag"
        onUpdateVendors={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders IdeasTab with no axe violations', async () => {
    const { container } = render(
      <IdeasTab
        ideas={SAMPLE_IDEAS}
        eventTitle={SAMPLE_PLAN.title}
        onUpdateIdeas={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders HistoryDrawer when open with no axe violations', async () => {
    const { container } = render(
      <HistoryDrawer
        isOpen={true}
        history={SAMPLE_HISTORY}
        currentIndex={0}
        onRestore={vi.fn()}
        onClose={vi.fn()}
        onClearHistory={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders StatusBanner with no axe violations', async () => {
    const { container } = render(
      <StatusBanner
        source="fallback-error"
        onRetry={vi.fn()}
        isRetrying={false}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders BriefInput with no axe violations', async () => {
    const { container } = render(
      <BriefInput
        initialBrief="Sister's sangeet"
        onGeneratePlan={vi.fn()}
        isLoading={false}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders ReplanBox with no axe violations', async () => {
    const { container } = render(
      <ReplanBox
        onReplan={vi.fn()}
        isLoading={false}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });

  it('renders DiffViewer with no axe violations', async () => {
    const { container } = render(
      <DiffViewer
        diffs={[
          {
            type: 'budget',
            summary: '+₹50,000 budget',
            changeType: 'modified',
          },
        ]}
        onDismiss={vi.fn()}
      />
    );
    const results = await axe(container);
    expectNoViolations(results);
  });
});
