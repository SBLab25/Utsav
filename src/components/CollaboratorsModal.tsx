/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Users, Mail, Shield, UserMinus, Plus, Copy, Check, Sparkles } from 'lucide-react';
import type { CloudPlanDoc, CollaboratorRole } from '../types/auth.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { addCollaborator, removeCollaborator } from '../services/cloudPlans.ts';

interface CollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudPlan: CloudPlanDoc;
  onPlanUpdated: (updatedPlan: CloudPlanDoc) => void;
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  isOpen,
  onClose,
  cloudPlan,
  onPlanUpdated,
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const isOwner = user?.uid === cloudPlan.ownerId;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      const updated = await addCollaborator(cloudPlan.id, email, role, user);
      onPlanUpdated(updated);
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add collaborator.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await removeCollaborator(cloudPlan.id, targetEmail, user);
      onPlanUpdated(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove collaborator.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?planId=${cloudPlan.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collaborators-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close collaborators modal"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-200">
              Live Collaboration
            </span>
          </div>
          <h2 id="collaborators-modal-title" className="text-2xl font-bold font-serif">
            Collaborative Planning
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Invite family members, partners, or vendors to plan this celebration together in real time.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl"
            >
              {error}
            </div>
          )}

          {/* Quick Collab Link Box */}
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs text-stone-700 dark:text-stone-300 truncate">
              <span className="font-semibold block text-stone-900 dark:text-stone-100">
                Shareable Cloud Link
              </span>
              <span className="text-stone-500 text-[11px] truncate block">
                {`${window.location.origin}${window.location.pathname}?planId=${cloudPlan.id}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Invite Form (Owner Only) */}
          {isOwner ? (
            <form onSubmit={handleInvite} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Invite New Collaborator
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                  className="px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  <option value="editor">Editor (Can edit)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Invite
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl text-xs text-stone-600 dark:text-stone-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              Only the plan owner ({cloudPlan.ownerName}) can invite or remove collaborators.
            </div>
          )}

          {/* Collaborators List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Active Collaborators ({cloudPlan.collaborators.length})
            </h3>
            <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-56 overflow-y-auto pr-1">
              {cloudPlan.collaborators.map((c) => {
                const isCurrent = c.uid === user?.uid;
                const isItemOwner = c.role === 'owner';
                return (
                  <div
                    key={c.email}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-sm">
                        {c.displayName ? c.displayName.charAt(0) : c.email.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                          <span>{c.displayName || c.email.split('@')[0]}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded-md font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {c.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isItemOwner
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : c.role === 'editor'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {c.role}
                      </span>

                      {isOwner && !isItemOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemove(c.email)}
                          aria-label={`Remove collaborator ${c.email}`}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
