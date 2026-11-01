/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TimelineTab } from './TimelineTab.tsx';
import type { TimelineTask, EventPlan, RunSheetItem } from '../types/plan.ts';

const MOCK_PLAN: EventPlan = {
  id: 'plan-1',
  title: 'Royal Sangeet Celebration',
  event_type: 'Sangeet',
  event_date: '2026-11-20',
  city: 'Jaipur',
  theme: 'Royal Rajasthani Heritage',
  guests: 200,
  total_budget: 1000000,
  budget: [],
  timeline: [
    { t_minus_days: 30, title: 'Book DJ and Sound Tech', owner: 'Family Host', done: false },
    { t_minus_days: 7, title: 'Finalize Dance Sequence', owner: 'Choreographer', done: true },
  ],
  vendors: [],
  ideas: [],
  risks: [],
  payments: [],
  runSheet: [
    { id: 'rs-1', time: '17:00', title: 'Welcome Drinks & Live Chaat', owner: 'Catering Lead' },
    { id: 'rs-2', time: '19:30', title: 'Grand Family Dance Battles', owner: 'Family Host' },
    { id: 'rs-3', time: '22:00', title: 'Open Dance Floor DJ Night', owner: 'DJ Rohit' },
  ],
};

function TimelineTabTestHarness(props: {
  initialPlan?: EventPlan;
  initialTimeline?: TimelineTask[];
  initialRunSheet?: RunSheetItem[];
  onUpdateTimelineSpy?: (timeline: TimelineTask[]) => void;
  onUpdateRunSheetSpy?: (runSheet: RunSheetItem[]) => void;
}) {
  const plan = props.initialPlan || MOCK_PLAN;
  const [timeline, setTimeline] = useState<TimelineTask[]>(props.initialTimeline || plan.timeline);
  const [runSheet, setRunSheet] = useState<RunSheetItem[]>(props.initialRunSheet || plan.runSheet || []);

  return (
    <TimelineTab
      timeline={timeline}
      eventDate={plan.event_date}
      plan={plan}
      runSheet={runSheet}
      onUpdateTimeline={(updated) => {
        setTimeline(updated);
        props.onUpdateTimelineSpy?.(updated);
      }}
      onUpdateRunSheet={(updated) => {
        setRunSheet(updated);
        props.onUpdateRunSheetSpy?.(updated);
      }}
    />
  );
}

describe('TimelineTab Component', () => {
  it('switches between Countdown Milestones and Day-of Run Sheet views', () => {
    render(<TimelineTabTestHarness />);

    // Initial view: Countdown Milestones
    expect(screen.getByText('Book DJ and Sound Tech')).toBeInTheDocument();
    expect(screen.getByText('Finalize Dance Sequence')).toBeInTheDocument();

    // Switch to Day-of Run Sheet
    const runSheetTab = screen.getByRole('button', { name: /Day-of Run Sheet/i });
    fireEvent.click(runSheetTab);

    // Run sheet items are displayed
    expect(screen.getByText('Welcome Drinks & Live Chaat')).toBeInTheDocument();
    expect(screen.getByText('Grand Family Dance Battles')).toBeInTheDocument();
    expect(screen.getByText('Open Dance Floor DJ Night')).toBeInTheDocument();
  });

  it('renders time-ordered run sheet items with time, title, and owner', () => {
    render(<TimelineTabTestHarness />);

    // Switch to Day-of Run Sheet
    fireEvent.click(screen.getByRole('button', { name: /Day-of Run Sheet/i }));

    // Verify time badges
    expect(screen.getByText('17:00')).toBeInTheDocument();
    expect(screen.getByText('19:30')).toBeInTheDocument();
    expect(screen.getByText('22:00')).toBeInTheDocument();

    // Verify owners
    expect(screen.getByText('Catering Lead')).toBeInTheDocument();
    expect(screen.getByText('DJ Rohit')).toBeInTheDocument();
  });

  it('adds a new run sheet item, validates inputs and auto-sorts by start time', () => {
    const updateRunSheetSpy = vi.fn();
    render(<TimelineTabTestHarness onUpdateRunSheetSpy={updateRunSheetSpy} />);

    // Switch to Run Sheet view
    fireEvent.click(screen.getByRole('button', { name: /Day-of Run Sheet/i }));

    // Click "Add Run Sheet Item" button
    const addButtons = screen.getAllByRole('button', { name: /Add Run Sheet Item|Add Item/i });
    fireEvent.click(addButtons[0]);

    // Modal opens
    expect(screen.getByRole('heading', { name: /Add Day-of Run Sheet Item/i })).toBeInTheDocument();

    const timeInput = screen.getByPlaceholderText(/e.g. 14:30 or 09:00/i);
    const titleInput = screen.getByPlaceholderText(/e.g. Red carpet grand entry/i);
    const ownerInput = screen.getByPlaceholderText(/e.g. Choreographer/i);
    const form = timeInput.closest('form')!;

    // Add item scheduled at 18:30 (between 17:00 and 19:30)
    fireEvent.change(timeInput, { target: { value: '18:30' } });
    fireEvent.change(titleInput, { target: { value: 'Soundcheck & Lighting Walkthrough' } });
    fireEvent.change(ownerInput, { target: { value: 'Stage Manager' } });
    fireEvent.submit(form);

    expect(updateRunSheetSpy).toHaveBeenCalled();
    const updatedSheet: RunSheetItem[] = updateRunSheetSpy.mock.calls[0][0];

    // Auto-sorted by start time: 17:00 -> 18:30 -> 19:30 -> 22:00
    expect(updatedSheet.length).toBe(4);
    expect(updatedSheet[0].time).toBe('17:00');
    expect(updatedSheet[1].time).toBe('18:30');
    expect(updatedSheet[1].title).toBe('Soundcheck & Lighting Walkthrough');
    expect(updatedSheet[2].time).toBe('19:30');
    expect(updatedSheet[3].time).toBe('22:00');
  });

  it('edits an existing run sheet item', () => {
    const updateRunSheetSpy = vi.fn();
    render(<TimelineTabTestHarness onUpdateRunSheetSpy={updateRunSheetSpy} />);

    // Switch to Run Sheet view
    fireEvent.click(screen.getByRole('button', { name: /Day-of Run Sheet/i }));

    // Click edit on "Welcome Drinks & Live Chaat"
    const editBtn = screen.getByRole('button', { name: /Edit Welcome Drinks & Live Chaat/i });
    fireEvent.click(editBtn);

    // Modal opens in edit mode
    expect(screen.getByRole('heading', { name: /Edit Run Sheet Item/i })).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(/e.g. Red carpet grand entry/i);
    expect(titleInput).toHaveValue('Welcome Drinks & Live Chaat');

    // Update title
    fireEvent.change(titleInput, { target: { value: 'Welcome Drinks & Live Mocktail Bar' } });
    const form = titleInput.closest('form')!;
    fireEvent.submit(form);

    expect(updateRunSheetSpy).toHaveBeenCalled();
    const updatedSheet: RunSheetItem[] = updateRunSheetSpy.mock.calls[0][0];
    expect(updatedSheet[0].title).toBe('Welcome Drinks & Live Mocktail Bar');
  });

  it('deletes a run sheet item', () => {
    const updateRunSheetSpy = vi.fn();
    render(<TimelineTabTestHarness onUpdateRunSheetSpy={updateRunSheetSpy} />);

    // Switch to Run Sheet view
    fireEvent.click(screen.getByRole('button', { name: /Day-of Run Sheet/i }));

    // Delete "Open Dance Floor DJ Night"
    const deleteBtn = screen.getByRole('button', { name: /Delete Open Dance Floor DJ Night/i });
    fireEvent.click(deleteBtn);

    expect(updateRunSheetSpy).toHaveBeenCalled();
    const updatedSheet: RunSheetItem[] = updateRunSheetSpy.mock.calls[0][0];
    expect(updatedSheet.length).toBe(2);
    expect(updatedSheet.some((item) => item.title === 'Open Dance Floor DJ Night')).toBe(false);
  });

  it('falls back to default template run sheet when plan has no runSheet', () => {
    const emptyPlan: EventPlan = {
      ...MOCK_PLAN,
      runSheet: [],
    };

    render(<TimelineTabTestHarness initialPlan={emptyPlan} initialRunSheet={[]} />);

    // Switch to Run Sheet view
    fireEvent.click(screen.getByRole('button', { name: /Day-of Run Sheet/i }));

    // Fallback template for Sangeet has AV & Sound Setup
    expect(screen.getByText(/AV & Sound Setup with DJ Tech Lead/i)).toBeInTheDocument();
  });
});
