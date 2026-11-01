/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Send,
  Sparkles,
  UserRound,
  X,
  Volume2,
  VolumeX,
  Trash2,
  Brain,
} from 'lucide-react';
import type { EventPlan } from '../types/plan.ts';
import type { PlanChange } from '../schemas/changes.ts';
import { applyChange, formatINR } from '../utils/planLogic.ts';
import {
  speakText,
  stopSpeech,
  isSpeechSynthesisSupported,
} from '../utils/speechSynthesis.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposals?: Proposal[];
}

interface Proposal {
  change: PlanChange;
  status?: 'applied' | 'discarded';
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
    case 'logPayment': return `Log payment of ${formatINR(change.amount)} for ${change.category}${change.note ? ` (${change.note})` : ''}`;
    case 'addTask': return `Add "${change.title}" at T-${change.t_minus_days} days`;
    case 'toggleTask': return `Toggle "${change.title}"`;
    case 'addVendor': return `Add ${change.type} vendor (${formatINR(change.est_low)}–${formatINR(change.est_high)})`;
    case 'setVendorStatus': return `Mark ${change.type} as ${change.status}${change.quote ? ` at ${formatINR(change.quote)}` : ''}`;
    case 'addIdea': return `Add ${change.category} idea: ${change.title}`;
    case 'setGuests': return `Set the plan to ${change.guests} guests`;
    case 'setBudget': return `Set the total budget to ${formatINR(change.total_budget)}`;
  }
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={`${token}-${index}`}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={`${token}-${index}`}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={`${token}-${index}`} className="rounded bg-stone-200/80 px-1 py-0.5 text-[0.85em] dark:bg-stone-800">{token.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`${token}-${index}`}>{token}</React.Fragment>;
  });
}

function AssistantText({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { marker: string; text: string }[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="leading-6">
        {renderInlineMarkdown(paragraph.join(' '))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="space-y-1.5 pl-5 text-sm" role="list">
        {list.map((item, index) => (
          <li key={`${item.text}-${index}`} className="list-disc leading-5">
            {renderInlineMarkdown(item.text)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`heading-${blocks.length}`} className="font-semibold text-stone-900 dark:text-stone-100">
          {renderInlineMarkdown(heading[1])}
        </h3>,
      );
      return;
    }
    const bullet = trimmed.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push({ marker: trimmed.slice(0, trimmed.indexOf(' ')), text: bullet[1] });
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });
  flushParagraph();
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

function preview(plan: EventPlan, change: PlanChange): { before: string; after: string } {
  const after = applyChange(plan, change);
  const before = change.op === 'moveBudget'
    ? `${change.from}: ${formatINR(plan.budget.find((item) => item.category.toLowerCase() === change.from.toLowerCase())?.amount || 0)} · ${change.to}: ${formatINR(plan.budget.find((item) => item.category.toLowerCase() === change.to.toLowerCase())?.amount || 0)}`
    : `${plan.guests} guests · ${formatINR(plan.total_budget)} budget`;
  const afterText = change.op === 'moveBudget'
    ? `${change.from}: ${formatINR(after.budget.find((item) => item.category.toLowerCase() === change.from.toLowerCase())?.amount || 0)} · ${change.to}: ${formatINR(after.budget.find((item) => item.category.toLowerCase() === change.to.toLowerCase())?.amount || 0)}`
    : `${after.guests} guests · ${formatINR(after.total_budget)} budget`;
  return { before, after: afterText };
}

export const CoPlannerPanel: React.FC<CoPlannerPanelProps> = ({ plan, onApply }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('utsav_coplanner_messages');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_e) {}
    }
    return [];
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('utsav_coplanner_autospeak') === 'true';
    }
    return false;
  });
  const [memorySummary, setMemorySummary] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('utsav_coplanner_messages', JSON.stringify(messages));
      } catch (_e) {}
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleToggleSpeak = (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
      stopSpeech();
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(messageId);
      speakText(text, {
        onStart: () => setPlayingMessageId(messageId),
        onEnd: () => setPlayingMessageId(null),
        onError: () => setPlayingMessageId(null),
      });
    }
  };

  const handleToggleAutoSpeak = () => {
    const nextVal = !autoSpeak;
    setAutoSpeak(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('utsav_coplanner_autospeak', String(nextVal));
    }
    if (!nextVal) {
      stopSpeech();
      setPlayingMessageId(null);
    }
  };

  const handleClearChat = () => {
    stopSpeech();
    setPlayingMessageId(null);
    setMessages([]);
    setMemorySummary('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('utsav_coplanner_messages');
    }
  };

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || pending) return;
    setInput('');
    setError(null);
    setPending(true);
    stopSpeech();
    setPlayingMessageId(null);

    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: 'user', content: message };
    setMessages((current) => [...current, userMessage]);
    try {
      // Multi-turn context memory optimization: take up to 20 turns + memory summary
      const history = [...messages, userMessage].slice(-20).map((item) => ({
        role: item.role === 'assistant' ? 'model' as const : 'user' as const,
        content: item.content,
        proposals: item.proposals?.map((p) => p.change),
      }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, plan, history, context_summary: memorySummary }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Co-planner unavailable');
      if (data.memorySummary) {
        setMemorySummary(data.memorySummary);
      }
      const assistantId = `${Date.now()}-assistant`;
      const replyContent = data.reply || 'Here are some suggestions for your review.';
      setMessages((current) => [...current, {
        id: assistantId,
        role: 'assistant',
        content: replyContent,
        proposals: Array.isArray(data.proposals)
          ? data.proposals.map((change: PlanChange) => ({ change }))
          : [],
      }]);

      if (autoSpeak) {
        setPlayingMessageId(assistantId);
        speakText(replyContent, {
          onStart: () => setPlayingMessageId(assistantId),
          onEnd: () => setPlayingMessageId(null),
          onError: () => setPlayingMessageId(null),
        });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Co-planner unavailable');
    } finally {
      setPending(false);
    }
  };

  const updateProposal = (messageId: string, proposalIndex: number, apply: boolean) => {
    const message = messages.find((item) => item.id === messageId);
    const proposal = message?.proposals?.[proposalIndex];
    if (!proposal || proposal.status) return;
    if (apply) onApply(proposal.change);
    setMessages((current) => current.map((item) => item.id !== messageId ? item : {
      ...item,
      proposals: item.proposals?.map((itemProposal, index) => index === proposalIndex
        ? { ...itemProposal, status: apply ? 'applied' : 'discarded' }
        : itemProposal),
    }));
  };

  return (
    <section className="flex min-h-[36rem] flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 shadow-xs dark:border-stone-800 dark:bg-[#23152C]/95" aria-label="Co-planner chat">
      <header className="border-b border-stone-200/80 px-5 py-4 dark:border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative rounded-2xl bg-[#3B1F4A] p-2.5 text-white dark:bg-[#F5A623] dark:text-stone-950">
              <Bot className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#23152C]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-bold">Co-planner</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Your event planning assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <span
                  className="hidden sm:inline-flex items-center gap-1 rounded-full border border-stone-200/90 bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  title="Multi-turn context memory active"
                >
                  <Brain className="h-3 w-3 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  <span>{messages.length} turns</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
                  title="Clear conversation history"
                  aria-label="Clear conversation history"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleToggleAutoSpeak}
              className={`rounded-xl p-1.5 transition-colors cursor-pointer ${
                autoSpeak
                  ? 'bg-amber-500/20 text-[#B45309] dark:text-[#F5A623]'
                  : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200'
              }`}
              title={autoSpeak ? 'Voice readout is ON (Click to mute)' : 'Voice readout is OFF (Click to enable auto-speak)'}
              aria-label={autoSpeak ? 'Disable voice readout' : 'Enable voice readout'}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          <span>Suggestions are never applied until you approve them.</span>
        </div>
      </header>

      <div className="border-b border-stone-200/70 px-5 py-3 dark:border-stone-800">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Try asking</p>
        <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => send(example)} disabled={pending} className="rounded-full border border-stone-200 px-3 py-1.5 text-left text-xs transition-colors hover:border-[#B45309] disabled:opacity-50 dark:border-stone-700 dark:hover:border-[#F5A623]">
            {example}
          </button>
        ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Co-planner conversation">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
            <div className="mb-2 flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-100">
              <Sparkles className="h-4 w-4 text-[#B45309] dark:text-[#F5A623]" aria-hidden="true" />
              Let’s make the plan better
            </div>
            <p>Ask me to rebalance the budget, book a vendor, add a task, or update the guest count.</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
            <div className={`max-w-[92%] rounded-2xl px-3.5 py-3 ${message.role === 'user' ? 'rounded-br-md bg-[#3B1F4A] text-white dark:bg-[#5B2D70]' : 'rounded-bl-md bg-stone-100 text-stone-700 dark:bg-stone-900/70 dark:text-stone-200'}`}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                  {message.role === 'user' ? <><UserRound className="h-3 w-3" aria-hidden="true" /> You</> : <><Bot className="h-3 w-3" aria-hidden="true" /> Co-planner</>}
                </div>
                {message.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => handleToggleSpeak(message.id, message.content)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                      playingMessageId === message.id
                        ? 'bg-amber-500/25 text-[#B45309] dark:text-[#F5A623] font-bold'
                        : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800'
                    }`}
                    title={playingMessageId === message.id ? 'Stop audio' : 'Listen to response'}
                    aria-label={playingMessageId === message.id ? 'Stop audio readout' : 'Listen to response'}
                  >
                    {playingMessageId === message.id ? (
                      <>
                        <VolumeX className="h-3 w-3" aria-hidden="true" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3" aria-hidden="true" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {message.role === 'assistant' ? <AssistantText content={message.content} /> : <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
              {message.proposals && message.proposals.length > 0 && (
                <div className="mt-3 space-y-3">
                  {message.proposals.map((proposal, index) => {
                  const comparison = preview(plan, proposal.change);
                  const resolved = proposal.status;
                  return (
                    <div key={`${message.id}-${index}`} className={`rounded-2xl border p-3 text-stone-800 dark:text-stone-100 ${resolved === 'applied' ? 'border-emerald-500/40 bg-emerald-500/10' : resolved === 'discarded' ? 'border-stone-300 bg-stone-100/70 opacity-70 dark:border-stone-700 dark:bg-stone-900/50' : 'border-amber-500/30 bg-white dark:bg-[#23152C]'}`}>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 rounded-lg bg-amber-500/15 p-1.5 text-amber-700 dark:text-amber-300"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Suggested change</p>
                          <p className="mt-0.5 text-sm font-semibold">{summary(proposal.change)}</p>
                        </div>
                        {resolved && <span className="text-[10px] font-bold uppercase tracking-wide">{resolved}</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-xl bg-stone-100 p-2.5 dark:bg-stone-900"><span className="mb-1 block font-semibold text-stone-500">Before</span>{comparison.before}</div>
                        <div className="rounded-xl bg-emerald-500/10 p-2.5"><span className="mb-1 block font-semibold text-emerald-700 dark:text-emerald-300">After approval</span>{comparison.after}</div>
                      </div>
                      {!resolved && <div className="mt-3 flex gap-2">
                        <button type="button" aria-label="Apply" onClick={() => updateProposal(message.id, index, true)} className="inline-flex items-center gap-1 rounded-xl bg-[#3B1F4A] px-3 py-2 text-xs font-bold text-white hover:opacity-90 dark:bg-[#F5A623] dark:text-stone-950">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Apply change
                        </button>
                        <button type="button" onClick={() => updateProposal(message.id, index, false)} className="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold dark:border-stone-700">
                          <X className="h-3.5 w-3.5" aria-hidden="true" /> Discard
                        </button>
                      </div>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" /></span>
            Co-planner is thinking
          </div>
        )}
      </div>

      <footer className="border-t border-stone-200/80 p-4 dark:border-stone-800">
        {error && <p role="alert" className="mb-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <label htmlFor="co-planner-message" className="sr-only">Ask the co-planner</label>
          <textarea id="co-planner-message" value={input} maxLength={300} rows={1} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Message your co-planner…" className="max-h-24 min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-stone-400" disabled={pending} />
          <button type="submit" disabled={!input.trim() || pending} aria-label="Send message" className="rounded-xl bg-[#B45309] p-2.5 text-white hover:bg-[#92400E] disabled:opacity-40 dark:bg-[#F5A623] dark:text-stone-950"><Send className="h-4 w-4" aria-hidden="true" /></button>
        </form>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-stone-400">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>{input.length}/300</span>
        </div>
      </footer>
    </section>
  );
};
