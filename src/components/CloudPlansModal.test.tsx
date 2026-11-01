/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CloudPlansModal } from './CloudPlansModal.tsx';
import { AuthProvider } from '../context/AuthContext.tsx';
import { savePlanToCloud } from '../services/cloudPlans.ts';
import type { EventPlan } from '../types/plan.ts';

const samplePlan: EventPlan = {
  title: 'Cloud Jaipur Sangeet',
  event_type: 'sangeet',
  event_date: '2026-12-14',
  guests: 150,
  total_budget: 600000,
  city: 'Jaipur',
  theme: 'Royal',
  budget: [],
  timeline: [],
  vendors: [],
  ideas: [],
  risks: [],
};

describe('CloudPlansModal Component', () => {
  const mockUser = {
    uid: 'demo-user-priya-101',
    email: 'priya.sharma@example.com',
    displayName: 'Priya Sharma (Host)',
    role: 'user' as const,
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('utsav_demo_user', JSON.stringify(mockUser));
    await savePlanToCloud(samplePlan, mockUser);
  });

  it('lists saved cloud celebrations and triggers selection on click', async () => {
    const handleSelect = vi.fn();
    const handleSaveNew = vi.fn();
    const handleClose = vi.fn();

    render(
      <AuthProvider>
        <CloudPlansModal
          isOpen={true}
          onClose={handleClose}
          onSelectPlan={handleSelect}
          onSaveCurrentAsNew={handleSaveNew}
        />
      </AuthProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('My Cloud Celebrations')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Cloud Jaipur Sangeet')).toBeInTheDocument();
    });

    const openBtn = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(openBtn);

    expect(handleSelect).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
