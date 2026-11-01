/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePlanToCloud,
  getCloudPlan,
  listUserCloudPlans,
  deleteCloudPlan,
  addCollaborator,
  removeCollaborator,
  subscribeToCloudPlan,
} from './cloudPlans.ts';
import type { EventPlan } from '../types/plan.ts';
import type { UserProfile } from '../types/auth.ts';

const mockPlan: EventPlan = {
  title: 'Test Wedding Celebration',
  event_type: 'wedding',
  event_date: '2026-11-20',
  guests: 200,
  total_budget: 1500000,
  city: 'Jaipur',
  theme: 'Royal Palace Glamour',
  budget: [
    { category: 'Venue', pct: 50, amount: 750000, locked: false },
    { category: 'Catering', pct: 50, amount: 750000, locked: false },
  ],
  timeline: [],
  vendors: [],
  ideas: [],
  risks: [
    { title: 'Rain', category: 'weather', likelihood: 'low', impact: 'high', mitigation: 'Canopy', backup_plan: 'Indoors' },
    { title: 'Vendor delay', category: 'vendor', likelihood: 'low', impact: 'medium', mitigation: 'Buffer', backup_plan: 'Call backup' },
    { title: 'Budget overage', category: 'budget', likelihood: 'low', impact: 'low', mitigation: 'Track', backup_plan: 'Trim' },
  ],
};

const mockUser: UserProfile = {
  uid: 'user-priya-123',
  email: 'priya@example.com',
  displayName: 'Priya Host',
  role: 'user',
};

describe('cloudPlans service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves a plan to cloud and retrieves it by ID', async () => {
    const saved = await savePlanToCloud(mockPlan, mockUser);
    expect(saved.id).toBeDefined();
    expect(saved.ownerId).toBe(mockUser.uid);
    expect(saved.collaboratorIds).toContain(mockUser.uid);
    expect(saved.collaborators.length).toBe(1);
    expect(saved.collaborators[0].role).toBe('owner');

    const fetched = await getCloudPlan(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe(mockPlan.title);
    expect(fetched?.plan.total_budget).toBe(1500000);
  });

  it('lists saved plans for the user and allows deletion', async () => {
    const plan1 = await savePlanToCloud(mockPlan, mockUser);
    const plan2 = await savePlanToCloud({ ...mockPlan, title: 'Second Event' }, mockUser);

    const userPlans = await listUserCloudPlans(mockUser.uid, mockUser.email);
    expect(userPlans.length).toBe(2);
    expect(userPlans.map((p) => p.id)).toContain(plan1.id);
    expect(userPlans.map((p) => p.id)).toContain(plan2.id);

    await deleteCloudPlan(plan1.id, mockUser.uid);
    const afterDelete = await listUserCloudPlans(mockUser.uid, mockUser.email);
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe(plan2.id);
  });

  it('invites a collaborator and updates collaborator role', async () => {
    const saved = await savePlanToCloud(mockPlan, mockUser);
    const updated = await addCollaborator(saved.id, 'rohit@example.com', 'editor', mockUser);

    expect(updated.collaboratorEmails).toContain('rohit@example.com');
    const rohitCollab = updated.collaborators.find((c) => c.email === 'rohit@example.com');
    expect(rohitCollab).toBeDefined();
    expect(rohitCollab?.role).toBe('editor');

    // Remove collaborator
    const afterRemoval = await removeCollaborator(saved.id, 'rohit@example.com', mockUser);
    expect(afterRemoval.collaboratorEmails).not.toContain('rohit@example.com');
    expect(afterRemoval.collaborators.find((c) => c.email === 'rohit@example.com')).toBeUndefined();
  });

  it('notifies subscribers via subscribeToCloudPlan when changes occur', async () => {
    const saved = await savePlanToCloud(mockPlan, mockUser);
    const mockCallback = vi.fn();

    const unsubscribe = subscribeToCloudPlan(saved.id, mockCallback);

    // Make an update
    await savePlanToCloud({ ...mockPlan, title: 'Updated Title By Collaborator' }, mockUser, saved.id);

    expect(mockCallback).toHaveBeenCalled();
    const lastCallDoc = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
    expect(lastCallDoc.plan.title).toBe('Updated Title By Collaborator');

    unsubscribe();
  });
});
