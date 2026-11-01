/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Check, MessageCircle, Send, X } from 'lucide-react';
import type { EventPlan } from '../types/plan.ts';
import type { PlanChange } from '../schemas/changes.ts';
import { applyChange, formatINR } from '../utils/planLogic.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposals?: PlanChange[];
}

interface CoPlannerPanelProps {
  plan: EventPlan;
  onApply: (change: PlanChange) => void;
}

const examples = [
  'Move ₹20,000 from decor to catering',
  'Mark the venue as booked at ₹90,000',
];

function summary(change: PlanChange): string {
  switch (change.op) {
    case 'moveBudget': return `Move ${formatINR(change.amount)} from ${change.from} to ${change.to}`;
    case 'logSpend': return `Log ${formatINR(change.amount)} spent in ${change.category}`;
    case 'addTask': return `Add "${change.title}" at T-${change.t_minus_days} days`;
    case 'toggleTask': return `Toggle "${change.title}"`;
    case 'addVendor': return `Add ${change.type} vendor (${formatINR(change.est_low)}–${formatINR(change.est_high)})`;
    case 'setVendorStatus': return `Mark ${change.type} as ${change.status}${change.quote ? ` at ${formatINR(change.quote)}` : ''}`;
    case 'addIdea': return `Add ${change.category} idea: ${change.title}`;
    case 'setGuests': return `Set the plan to ${change.guests} guests`;
    case 'setBudget': return `Set the total budget to ${formatINR(change.total_budget)}`;
  }
}

function preview(plan: EventPlan, change: PlanChange): { before: string; after: string } {
  const after = applyChange(plan, change);
  const before = change.op === 'moveBudget'
    ? `${change.from}: ${formatINR(plan.budget.find((item) => item.category.toLowerCase() === change.from.toLowerCase())?.amount || 0)}`
    : `${plan.guests} guests · ${formatINR(plan.total_budget)} budget`;
  const afterText = change.op === 'moveBudget'
    ? `${change.from} → ${change.to}: ${formatINR(after.budget.find((item) => item.category.toLowerCase() === change.from.toLowerCase())?.amount || 0)}`
    : `${after.guests} guests · ${formatINR(after.total_budget)} budget`;
  return { before, after: afterText };
}

export const CoPlannerPanel: React.FC<CoPlannerPanelProps> = ({ plan, onApply }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || pending) return;
    setInput('');
    setError(null);
    setPending(true);
    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: 'user', content: message };
    setMessages((current) => [...current, userMessage]);
    try {
      const history = [...messages, userMessage].slice(-6).map((item) => ({
        role: item.role === 'assistant' ? 'model' as const : 'user' as const,
        content: item.content,
      }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, plan, history }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Co-planner unavailable');
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply || 'Here are some suggestions for your review.',
        proposals: Array.isArray(data.proposals) ? data.proposals : [],
      }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Co-planner unavailable');
    } finally {
      setPending(false);
    }
  };

  const updateProposal = (messageId: string, proposalIndex: number, apply: boolean) => {
    const message = messages.find((item) => item.id === messageId);
    const change = message?.proposals?.[proposalIndex];
    if (!change) return;
    if (apply) onApply(change);
    setMessages((current) => current.map((item) => item.id !== messageId ? item : {
      ...item,
      proposals: item.proposals?.filter((_, index) => index !== proposalIndex),
    }));
  };

  return (
    <section className="bg-white/95 dark:bg-[#23152C]/95 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs p-5 space-y-4" aria-label="Co-planner chat">
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950"><Bot className="w-5 h-5" /></span>
        <div>
          <h2 className="font-serif text-lg font-bold">Co-planner</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Ask for changes. Nothing is applied without your approval.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => send(example)} disabled={pending} className="text-left text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-[#B45309] dark:hover:border-[#F5A623] transition-colors disabled:opacity-50">
            {example}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[34rem] overflow-y-auto" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-stone-50 dark:bg-stone-900/60 p-4 text-sm text-stone-600 dark:text-stone-300">
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Try asking me to rebalance the budget, book a vendor, or add a task.
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`rounded-2xl p-3 ${message.role === 'user' ? 'bg-[#3B1F4A] text-white ml-8' : 'bg-stone-50 dark:bg-stone-900/70 mr-4'}`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.proposals && message.proposals.length > 0 && (
              <div className="mt-3 space-y-3">
                {message.proposals.map((change, index) => {
                  const comparison = preview(plan, change);
                  return (
                    <div key={`${message.id}-${index}`} className="rounded-xl border border-amber-500/30 bg-white dark:bg-[#23152C] p-3 text-stone-800 dark:text-stone-100">
                      <p className="text-sm font-semibold">{summary(change)}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="rounded-lg bg-stone-100 dark:bg-stone-900 p-2"><span className="block text-stone-500">Before</span>{comparison.before}</div>
                        <div className="rounded-lg bg-emerald-500/10 p-2"><span className="block text-stone-500">After</span>{comparison.after}</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => updateProposal(message.id, index, true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3B1F4A] text-white text-xs font-bold hover:opacity-90">
                          <Check className="w-3.5 h-3.5" /> Apply
                        </button>
                        <button type="button" onClick={() => updateProposal(message.id, index, false)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold">
                          <X className="w-3.5 h-3.5" /> Discard
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {pending && <p className="text-xs text-stone-500">Co-planner is thinking…</p>}
      </div>

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2">
        <label htmlFor="co-planner-message" className="sr-only">Ask the co-planner</label>
        <input id="co-planner-message" value={input} maxLength={300} onChange={(event) => setInput(event.target.value)} placeholder="Ask for a safe plan change…" className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm" disabled={pending} />
        <button type="submit" disabled={!input.trim() || pending} aria-label="Send message" className="p-2.5 rounded-xl bg-[#B45309] text-white hover:bg-[#92400E] disabled:opacity-40"><Send className="w-4 h-4" /></button>
      </form>
    </section>
  );
};
