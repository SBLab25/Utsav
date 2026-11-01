/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CollaboratorsModal } from './CollaboratorsModal.tsx';
import { AuthProvider } from '../context/AuthContext.tsx';
import { savePlanToCloud } from '../services/cloudPlans.ts';
import type { CloudPlanDoc } from '../types/auth.ts';

const mockCloudPlan: CloudPlanDoc = {
  id: 'plan-collab-test',
  title: 'Sister Sangeet Gala',
  ownerId: 'demo-user-priya-101',
  ownerEmail: 'priya.sharma@example.com',
  ownerName: 'Priya Sharma (Host)',
  collaboratorIds: ['demo-user-priya-101'],
  collaboratorEmails: ['priya.sharma@example.com'],
  collaborators: [
    {
      uid: 'demo-user-priya-101',
      email: 'priya.sharma@example.com',
      displayName: 'Priya Sharma',
      role: 'owner',
      addedAt: '2026-11-01T21:00:00.000Z',
    },
  ],
  plan: {
    title: 'Sister Sangeet Gala',
    event_type: 'sangeet',
    event_date: '2026-12-14',
    guests: 150,
    total_budget: 600000,
    city: 'Vizag',
    theme: 'Retro Bollywood',
    budget: [],
    timeline: [],
    vendors: [],
    ideas: [],
    risks: [],
  },
  createdAt: '2026-11-01T21:00:00.000Z',
  updatedAt: '2026-11-01T21:00:00.000Z',
  lastModifiedBy: 'demo-user-priya-101',
  lastModifiedByName: 'Priya Sharma',
};

describe('CollaboratorsModal Component', () => {
  const mockUser = {
    uid: 'demo-user-priya-101',
    email: 'priya.sharma@example.com',
    displayName: 'Priya Sharma (Host)',
    role: 'user' as const,
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('utsav_demo_user', JSON.stringify(mockUser));
    await savePlanToCloud(mockCloudPlan.plan, mockUser, mockCloudPlan.id);
  });

  it('displays active collaborators and allows owner to invite new collaborator', async () => {
    const handlePlanUpdated = vi.fn();
    const handleClose = vi.fn();

    render(
      <AuthProvider>
        <CollaboratorsModal
          isOpen={true}
          onClose={handleClose}
          cloudPlan={mockCloudPlan}
          onPlanUpdated={handlePlanUpdated}
        />
      </AuthProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();

    // Invite a collaborator
    const emailInput = screen.getByPlaceholderText(/partner@example\.com/i);
    fireEvent.change(emailInput, { target: { value: 'ananya@example.com' } });

    const inviteBtn = screen.getByRole('button', { name: /Invite/i });
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(handlePlanUpdated).toHaveBeenCalled();
    });
  });
});
