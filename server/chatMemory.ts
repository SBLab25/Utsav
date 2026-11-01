/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EventPlan } from '../src/types/plan.ts';
import type { ChatTurn } from '../src/schemas/changes.ts';
import { sanitizeUserText } from '../src/utils/security.ts';

export interface OptimizedChatMemory {
  historyBlock: string;
  memorySummary: string;
  plannerContext: Record<string, unknown>;
}

/**
 * Optimizes multi-turn chat history into a concise long-term decision memory plus verbatim recent turns
 */
export function optimizeChatMemory(
  history: ChatTurn[],
  plan: EventPlan,
  incomingSummary?: string
): OptimizedChatMemory {
  const turns = Array.isArray(history) ? history : [];

  // Memory distillation for older turns when history exceeds 6 turns
  let memoryNotes: string[] = [];
  if (incomingSummary?.trim()) {
    memoryNotes.push(incomingSummary.trim());
  }

  const recentWindowSize = 6;
  const olderTurns = turns.length > recentWindowSize ? turns.slice(0, -recentWindowSize) : [];
  const recentTurns = turns.length > recentWindowSize ? turns.slice(-recentWindowSize) : turns;

  if (olderTurns.length > 0) {
    const extractedDecisions: string[] = [];
    olderTurns.forEach((turn, idx) => {
      const text = turn.content.trim();
      if (!text) return;

      if (turn.role === 'user') {
        extractedDecisions.push(`User previously requested: "${sanitizeUserText(text).slice(0, 100)}"`);
      } else if (turn.proposals && Array.isArray(turn.proposals) && turn.proposals.length > 0) {
        const ops = turn.proposals.map((p: any) => p.op || (p.change && p.change.op)).filter(Boolean);
        if (ops.length > 0) {
          extractedDecisions.push(`Co-planner proposed [${ops.join(', ')}] in turn ${idx + 1}`);
        }
      }
    });

    if (extractedDecisions.length > 0) {
      memoryNotes.push(...extractedDecisions);
    }
  }

  const compiledMemorySummary = memoryNotes.join('\n');

  // Format recent turns cleanly
  const formattedRecentTurns = recentTurns.map((turn) => {
    const roleLabel = turn.role === 'model' || turn.role === 'assistant' ? 'Co-planner' : 'User';
    return `${roleLabel}: ${sanitizeUserText(turn.content).replace(/</g, '\\u003c')}`;
  }).join('\n\n');

  let historyBlock = '';
  if (compiledMemorySummary) {
    historyBlock += `<PRIOR_DECISION_MEMORY>\n${compiledMemorySummary.replace(/</g, '\\u003c')}\n</PRIOR_DECISION_MEMORY>\n\n`;
  }
  historyBlock += `<RECENT_TURNS>\n${formattedRecentTurns || 'No previous turns.'}\n</RECENT_TURNS>`;

  // Concise pruned planner context
  const plannerContext = {
    title: plan.title,
    event_type: plan.event_type,
    event_date: plan.event_date,
    guests: plan.guests,
    total_budget: plan.total_budget,
    city: plan.city,
    theme: plan.theme,
    budget: plan.budget.map((b) => ({
      category: b.category,
      amount: b.amount,
      pct: b.pct,
      locked: b.locked,
      spent: b.spent,
    })),
    timeline: plan.timeline.slice(0, 15).map((t) => ({
      title: t.title,
      owner: t.owner,
      t_minus_days: t.t_minus_days,
      done: t.done,
      day_number: t.day_number,
    })),
    vendors: plan.vendors.map((v) => ({
      type: v.type,
      status: v.status,
      quote: v.quote,
      est_low: v.est_low,
      est_high: v.est_high,
      quotes_count: v.quotes?.length || 0,
    })),
    event_days_count: plan.event_days?.length || 0,
    ideas_count: plan.ideas.length,
  };

  return {
    historyBlock,
    memorySummary: compiledMemorySummary,
    plannerContext,
  };
}
