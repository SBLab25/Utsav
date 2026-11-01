/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase.ts';
import type { EventPlan } from '../types/plan.ts';
import type { CloudPlanDoc, PlanCollaborator, UserProfile, CollaboratorRole } from '../types/auth.ts';

const LOCAL_STORAGE_PLANS_PREFIX = 'utsav_cloud_plan_';
const LOCAL_STORAGE_PLANS_INDEX = 'utsav_cloud_plans_list';

// Custom event for multi-tab/mock collaborative live sync
const COLLAB_EVENT = 'utsav_collab_sync';

function notifyLocalCollaborators(planDoc: CloudPlanDoc) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COLLAB_EVENT, { detail: planDoc }));
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PLANS_PREFIX}${planDoc.id}`, JSON.stringify(planDoc));
    } catch (e) {
      console.warn('Failed to cache cloud plan locally:', e);
    }
  }
}

export async function savePlanToCloud(
  plan: EventPlan,
  user: UserProfile,
  existingPlanId?: string
): Promise<CloudPlanDoc> {
  const planId = existingPlanId || plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let existingDoc: CloudPlanDoc | null = null;
  try {
    existingDoc = await getCloudPlan(planId);
  } catch {
    // New document
  }

  const isOwner = !existingDoc || existingDoc.ownerId === user.uid;

  const planDoc: CloudPlanDoc = {
    id: planId,
    title: plan.title || 'Untitled Celebration',
    ownerId: existingDoc ? existingDoc.ownerId : user.uid,
    ownerEmail: existingDoc ? existingDoc.ownerEmail : (user.email || 'guest@utsav.app'),
    ownerName: existingDoc ? existingDoc.ownerName : (user.displayName || 'Celebration Host'),
    collaboratorIds: existingDoc
      ? Array.from(new Set([...existingDoc.collaboratorIds, user.uid]))
      : [user.uid],
    collaboratorEmails: existingDoc
      ? Array.from(new Set([...existingDoc.collaboratorEmails, (user.email || '').toLowerCase()].filter(Boolean)))
      : [user.email?.toLowerCase() || 'guest@utsav.app'],
    collaborators: existingDoc
      ? existingDoc.collaborators
      : [
          {
            uid: user.uid,
            email: user.email || 'guest@utsav.app',
            displayName: user.displayName || 'Host',
            role: 'owner',
            addedAt: now,
          },
        ],
    plan: {
      ...plan,
      id: planId,
    },
    createdAt: existingDoc ? existingDoc.createdAt : now,
    updatedAt: now,
    lastModifiedBy: user.uid,
    lastModifiedByName: user.displayName || 'Host',
  };

  if (isFirebaseConfigured() && db) {
    try {
      const planRef = doc(db, 'plans', planId);
      await setDoc(
        planRef,
        {
          ...planDoc,
          createdAt: existingDoc ? Timestamp.fromDate(new Date(existingDoc.createdAt)) : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore save failed, caching locally:', err);
    }
  }

  // Cache locally
  notifyLocalCollaborators(planDoc);
  updateLocalPlanIndex(planDoc);

  return planDoc;
}

export async function getCloudPlan(planId: string): Promise<CloudPlanDoc | null> {
  if (isFirebaseConfigured() && db) {
    try {
      const planRef = doc(db, 'plans', planId);
      const snapshot = await getDoc(planRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as CloudPlanDoc;
      }
    } catch (e) {
      console.warn('Failed to get plan from Firestore, falling back to local cache:', e);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_PLANS_PREFIX}${planId}`);
    if (cached) {
      try {
        return JSON.parse(cached) as CloudPlanDoc;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function subscribeToCloudPlan(
  planId: string,
  onUpdate: (planDoc: CloudPlanDoc) => void,
  onError?: (err: any) => void
): () => void {
  let unsubFirestore: (() => void) | null = null;

  if (isFirebaseConfigured() && db) {
    try {
      const planRef = doc(db, 'plans', planId);
      unsubFirestore = onSnapshot(
        planRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const formatted: CloudPlanDoc = {
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as CloudPlanDoc;
            onUpdate(formatted);
          }
        },
        (err) => {
          console.warn('Firestore onSnapshot error:', err);
          if (onError) onError(err);
        }
      );
    } catch (e) {
      console.warn('Failed to attach Firestore snapshot listener:', e);
    }
  }

  // Also listen for local collaborative events (cross-tab / offline mock)
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<CloudPlanDoc>;
    if (custom.detail && custom.detail.id === planId) {
      onUpdate(custom.detail);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === `${LOCAL_STORAGE_PLANS_PREFIX}${planId}` && e.newValue) {
      try {
        onUpdate(JSON.parse(e.newValue));
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(COLLAB_EVENT, handleLocalEvent);
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(COLLAB_EVENT, handleLocalEvent);
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export async function listUserCloudPlans(userId: string, userEmail?: string | null): Promise<CloudPlanDoc[]> {
  const plansMap = new Map<string, CloudPlanDoc>();

  if (isFirebaseConfigured() && db) {
    try {
      const plansCol = collection(db, 'plans');

      // 1. Query plans owned by user
      const qOwner = query(plansCol, where('ownerId', '==', userId));
      const ownerSnap = await getDocs(qOwner);
      ownerSnap.forEach((docSnap) => {
        const d = docSnap.data();
        plansMap.set(docSnap.id, {
          ...d,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt,
        } as CloudPlanDoc);
      });

      // 2. Query plans where user is in collaboratorIds
      const qCollab = query(plansCol, where('collaboratorIds', 'array-contains', userId));
      const collabSnap = await getDocs(qCollab);
      collabSnap.forEach((docSnap) => {
        const d = docSnap.data();
        plansMap.set(docSnap.id, {
          ...d,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt,
        } as CloudPlanDoc);
      });

      // 3. Query plans by email if available
      if (userEmail) {
        const qEmail = query(plansCol, where('collaboratorEmails', 'array-contains', userEmail.toLowerCase()));
        const emailSnap = await getDocs(qEmail);
        emailSnap.forEach((docSnap) => {
          const d = docSnap.data();
          plansMap.set(docSnap.id, {
            ...d,
            createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
            updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt,
          } as CloudPlanDoc);
        });
      }
    } catch (e) {
      console.warn('Error fetching plans from Firestore:', e);
    }
  }

  // Merge with locally stored plans
  if (typeof window !== 'undefined') {
    try {
      const indexStr = localStorage.getItem(LOCAL_STORAGE_PLANS_INDEX);
      const planIds: string[] = indexStr ? JSON.parse(indexStr) : [];
      for (const id of planIds) {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_PLANS_PREFIX}${id}`);
        if (cached) {
          const p = JSON.parse(cached) as CloudPlanDoc;
          const isRelated =
            p.ownerId === userId ||
            p.collaboratorIds?.includes(userId) ||
            (userEmail && p.collaboratorEmails?.includes(userEmail.toLowerCase()));
          if (isRelated && !plansMap.has(p.id)) {
            plansMap.set(p.id, p);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local plans index:', e);
    }
  }

  return Array.from(plansMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function deleteCloudPlan(planId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'plans', planId));
    } catch (e) {
      console.error('Failed to delete plan from Firestore:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${LOCAL_STORAGE_PLANS_PREFIX}${planId}`);
    try {
      const indexStr = localStorage.getItem(LOCAL_STORAGE_PLANS_INDEX);
      if (indexStr) {
        const planIds: string[] = JSON.parse(indexStr);
        const filtered = planIds.filter((id) => id !== planId);
        localStorage.setItem(LOCAL_STORAGE_PLANS_INDEX, JSON.stringify(filtered));
      }
    } catch {}
  }
}

export async function addCollaborator(
  planId: string,
  email: string,
  role: CollaboratorRole,
  currentUser: UserProfile
): Promise<CloudPlanDoc> {
  const currentPlan = await getCloudPlan(planId);
  if (!currentPlan) throw new Error('Plan not found');

  const cleanEmail = email.trim().toLowerCase();
  const existingCollab = currentPlan.collaborators.find((c) => c.email.toLowerCase() === cleanEmail);

  let updatedCollabs: PlanCollaborator[];
  if (existingCollab) {
    updatedCollabs = currentPlan.collaborators.map((c) =>
      c.email.toLowerCase() === cleanEmail ? { ...c, role } : c
    );
  } else {
    updatedCollabs = [
      ...currentPlan.collaborators,
      {
        uid: `pending_${Math.random().toString(36).substring(2, 9)}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role,
        addedAt: new Date().toISOString(),
      },
    ];
  }

  const updatedDoc: CloudPlanDoc = {
    ...currentPlan,
    collaboratorEmails: Array.from(new Set([...currentPlan.collaboratorEmails, cleanEmail])),
    collaborators: updatedCollabs,
    updatedAt: new Date().toISOString(),
    lastModifiedBy: currentUser.uid,
    lastModifiedByName: currentUser.displayName || 'Collaborator',
  };

  if (isFirebaseConfigured() && db) {
    const planRef = doc(db, 'plans', planId);
    await setDoc(
      planRef,
      {
        collaboratorEmails: updatedDoc.collaboratorEmails,
        collaborators: updatedDoc.collaborators,
        updatedAt: serverTimestamp(),
        lastModifiedBy: currentUser.uid,
        lastModifiedByName: currentUser.displayName || 'Collaborator',
      },
      { merge: true }
    );
  }

  notifyLocalCollaborators(updatedDoc);
  return updatedDoc;
}

export async function removeCollaborator(
  planId: string,
  targetEmail: string,
  currentUser: UserProfile
): Promise<CloudPlanDoc> {
  const currentPlan = await getCloudPlan(planId);
  if (!currentPlan) throw new Error('Plan not found');

  const cleanEmail = targetEmail.trim().toLowerCase();
  const updatedCollabs = currentPlan.collaborators.filter((c) => c.email.toLowerCase() !== cleanEmail);
  const updatedEmails = currentPlan.collaboratorEmails.filter((e) => e.toLowerCase() !== cleanEmail);

  const updatedDoc: CloudPlanDoc = {
    ...currentPlan,
    collaboratorEmails: updatedEmails,
    collaborators: updatedCollabs,
    updatedAt: new Date().toISOString(),
    lastModifiedBy: currentUser.uid,
    lastModifiedByName: currentUser.displayName || 'Collaborator',
  };

  if (isFirebaseConfigured() && db) {
    const planRef = doc(db, 'plans', planId);
    await setDoc(
      planRef,
      {
        collaboratorEmails: updatedDoc.collaboratorEmails,
        collaborators: updatedDoc.collaborators,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  notifyLocalCollaborators(updatedDoc);
  return updatedDoc;
}

function updateLocalPlanIndex(planDoc: CloudPlanDoc) {
  if (typeof window === 'undefined') return;
  try {
    const indexStr = localStorage.getItem(LOCAL_STORAGE_PLANS_INDEX);
    const planIds: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!planIds.includes(planDoc.id)) {
      planIds.unshift(planDoc.id);
      localStorage.setItem(LOCAL_STORAGE_PLANS_INDEX, JSON.stringify(planIds.slice(0, 50)));
    }
  } catch (e) {
    console.warn('Failed to update local plans index:', e);
  }
}
