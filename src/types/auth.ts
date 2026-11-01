/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EventPlan } from './plan.ts';

export type UserRole = 'user' | 'admin';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanCollaborator {
  uid: string;
  email: string;
  displayName?: string;
  role: CollaboratorRole;
  addedAt?: string;
}

export interface CloudPlanDoc {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  collaboratorIds: string[];
  collaboratorEmails: string[];
  collaborators: PlanCollaborator[];
  plan: EventPlan;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
