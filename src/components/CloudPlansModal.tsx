/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Cloud,
  Calendar,
  Users,
  MapPin,
  Trash2,
  ExternalLink,
  Plus,
  Sparkles,
  Shield,
  Clock,
} from 'lucide-react';
import type { CloudPlanDoc } from '../types/auth.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { listUserCloudPlans, deleteCloudPlan } from '../services/cloudPlans.ts';
import { formatINR } from '../utils/planLogic.ts';

interface CloudPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planDoc: CloudPlanDoc) => void;
  onSaveCurrentAsNew: () => void;
  currentPlanId?: string;
}

export const CloudPlansModal: React.FC<CloudPlansModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  onSaveCurrentAsNew,
  currentPlanId,
}) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<CloudPlanDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadPlans();
    }
  }, [isOpen, user]);

  const loadPlans = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await listUserCloudPlans(user.uid, user.email);
      setPlans(result);
    } catch (e) {
      console.warn('Failed to load user plans:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm('Are you sure you want to delete this cloud plan?')) return;

    setDeletingId(planId);
    try {
      await deleteCloudPlan(planId, user.uid);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      console.error('Failed to delete cloud plan:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-plans-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 px-6 py-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close cloud plans modal"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-200">
              Utsav Cloud Storage
            </span>
          </div>
          <h2 id="cloud-plans-modal-title" className="text-2xl font-bold font-serif">
            My Cloud Celebrations
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Open, manage, or switch between all your cloud-saved events and shared collaborative plans.
          </p>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
            {plans.length} {plans.length === 1 ? 'Celebration' : 'Celebrations'} Found
          </span>
          <button
            type="button"
            onClick={() => {
              onSaveCurrentAsNew();
              onClose();
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <Plus className="w-4 h-4" />
            Save Current as New Cloud Plan
          </button>
        </div>

        {/* Plan List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-stone-500">
              <div className="animate-spin w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full mx-auto mb-2" />
              Loading cloud plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-stone-500 dark:text-stone-400 space-y-3">
              <Cloud className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
              <p className="text-sm font-medium">No cloud plans saved yet.</p>
              <p className="text-xs max-w-sm mx-auto text-stone-400">
                Click &quot;Save to Cloud&quot; to save this celebration so you can access it anywhere and invite collaborators.
              </p>
            </div>
          ) : (
            plans.map((p) => {
              const isOwner = p.ownerId === user?.uid;
              const isCurrent = p.id === currentPlanId;
              const collabRole =
                p.collaborators.find((c) => c.uid === user?.uid || c.email === user?.email)?.role ||
                (isOwner ? 'owner' : 'viewer');

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPlan(p);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-400 dark:border-rose-800 shadow-sm'
                      : 'bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-stone-900 dark:text-stone-100 font-serif">
                        {p.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-rose-600 text-white font-semibold px-2 py-0.5 rounded-full">
                          Active Plan
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isOwner
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {collabRole}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                      {p.plan.event_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          {p.plan.event_date}
                        </span>
                      )}
                      {p.plan.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {p.plan.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-rose-500" />
                        {p.plan.guests} Guests
                      </span>
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {formatINR(p.plan.total_budget)}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 flex items-center gap-3">
                      <span>Owner: {p.ownerName}</span>
                      <span>•</span>
                      <span>{p.collaborators.length} Collaborator(s)</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlan(p);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {isCurrent ? 'Viewing' : 'Open'}
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(p.id, e)}
                        disabled={deletingId === p.id}
                        aria-label={`Delete cloud plan ${p.title}`}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
