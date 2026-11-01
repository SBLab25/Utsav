/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase.ts';
import type { UserProfile } from '../types/auth.ts';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  signInAsDemoUser: (role?: 'owner' | 'collaborator') => void;
}

const LOCAL_STORAGE_USER_KEY = 'utsav_demo_user';

export const DEMO_USERS: Record<'owner' | 'collaborator', UserProfile> = {
  owner: {
    uid: 'demo-user-priya-101',
    email: 'priya.sharma@example.com',
    displayName: 'Priya Sharma (Host)',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    role: 'user',
  },
  collaborator: {
    uid: 'demo-user-rohit-202',
    email: 'rohit.verma@example.com',
    displayName: 'Rohit Verma (Co-Planner)',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit',
    role: 'user',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isFirebaseConfigured();

  const syncUserProfileToFirestore = async (fbUser: FirebaseUser, displayName?: string) => {
    if (!db) return;
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(
        userRef,
        {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: displayName || fbUser.displayName || 'Event Host',
          photoURL: fbUser.photoURL || null,
          role: 'user',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync user profile to Firestore:', err);
    }
  };

  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Celebration Host',
            photoURL: fbUser.photoURL,
            role: 'user',
          };
          setUser(profile);
          await syncUserProfileToFirestore(fbUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline / Demo fallback
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to parse local demo user:', e);
      }
      setLoading(false);
    }
  }, [isConfigured]);

  const signInWithGoogle = async () => {
    if (isConfigured && auth) {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserProfileToFirestore(result.user);
    } else {
      signInAsDemoUser('owner');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (isConfigured && auth) {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfileToFirestore(result.user);
    } else {
      const profile: UserProfile = {
        uid: `demo-${btoa(email).slice(0, 10)}`,
        email,
        displayName: email.split('@')[0],
        role: 'user',
      };
      setUser(profile);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    if (isConfigured && auth) {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      await syncUserProfileToFirestore(result.user, displayName);
    } else {
      const profile: UserProfile = {
        uid: `demo-${btoa(email).slice(0, 10)}`,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'user',
      };
      setUser(profile);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    }
  };

  const signOut = async () => {
    if (isConfigured && auth) {
      await fbSignOut(auth);
    } else {
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (isConfigured && auth && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      if (db) {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { displayName, photoURL: photoURL || null, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      setUser((prev) => (prev ? { ...prev, displayName, photoURL } : null));
    } else if (user) {
      const updated: UserProfile = { ...user, displayName, photoURL: photoURL || user.photoURL };
      setUser(updated);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
    }
  };

  const signInAsDemoUser = (role: 'owner' | 'collaborator' = 'owner') => {
    const profile = DEMO_USERS[role];
    setUser(profile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateUserProfile,
        signInAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
