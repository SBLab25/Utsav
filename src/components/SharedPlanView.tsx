/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { EventPlan } from '../types/plan.ts';
import { PrintPlanView } from './PrintPlanView.tsx';
import { formatINR } from '../utils/planLogic.ts';

interface SharedPlanViewProps {
  plan: EventPlan;
  onMakeCopy: () => void;
}

export const SharedPlanView: React.FC<SharedPlanViewProps> = ({ plan, onMakeCopy }) => (
  <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
    <div className="no-print mb-6 rounded-2xl border border-[#B45309]/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="font-bold">Shared plan: make a copy to edit</p>
        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">This read-only link contains no guest list or personal guest data.</p>
      </div>
      <button onClick={onMakeCopy} className="rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 px-4 py-2 text-sm font-bold cursor-pointer">Make my own copy</button>
    </div>
    <article className="space-y-6">
      <section className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#23152C] p-6">
        <p className="text-xs uppercase tracking-wide text-stone-500">{plan.event_type}</p>
        <h1 className="font-serif text-3xl font-bold mt-1">{plan.title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">{plan.theme}</p>
        <div className="flex flex-wrap gap-3 mt-5 text-sm">
          <span><Calendar className="inline w-4 h-4 mr-1" />{plan.event_date}</span>
          <span><MapPin className="inline w-4 h-4 mr-1" />{plan.city}</span>
          <span><Users className="inline w-4 h-4 mr-1" />{plan.guests} guests</span>
          <span>{formatINR(plan.total_budget)}</span>
        </div>
      </section>
      <PrintPlanView plan={plan} />
    </article>
  </main>
);
