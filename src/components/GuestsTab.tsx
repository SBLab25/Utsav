/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  FileUp,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { Guest, IdeaItem } from '../types/plan.ts';

type GuestGroup = Guest['group'];
type GuestStatus = Guest['status'];
type GuestDiet = Guest['diet'];

interface GuestsTabProps {
  guests: Guest[];
  planGuests: number;
  eventTitle: string;
  ideas: IdeaItem[];
  onUpdateGuests: (guests: Guest[]) => void;
  onRequestReplan: (instruction: string) => void;
}

const GROUPS: GuestGroup[] = ['family', 'friends', 'colleagues', 'other'];
const STATUSES: GuestStatus[] = ['invited', 'confirmed', 'declined'];
const DIETS: GuestDiet[] = ['veg', 'non-veg', 'jain', 'vegan'];

const labelize = (value: string) => value.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const makeGuest = (name: string): Guest => ({
  id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: name.trim(),
  group: 'other',
  status: 'invited',
  diet: 'veg',
  plus_ones: 0,
});

const parseCsvLine = (line: string) =>
  line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

export const getConfirmedHeadcount = (guests: Guest[]) =>
  guests
    .filter((guest) => guest.status === 'confirmed')
    .reduce((total, guest) => total + 1 + guest.plus_ones, 0);

export const getDietSummary = (guests: Guest[]) => {
  const summary: Record<GuestDiet, number> = { veg: 0, 'non-veg': 0, jain: 0, vegan: 0 };
  guests
    .filter((guest) => guest.status === 'confirmed')
    .forEach((guest) => {
      summary[guest.diet] += 1 + guest.plus_ones;
    });
  return summary;
};

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const GuestsTab: React.FC<GuestsTabProps> = ({
  guests,
  planGuests,
  eventTitle,
  ideas,
  onUpdateGuests,
  onRequestReplan,
}) => {
  const [groupFilter, setGroupFilter] = useState<GuestGroup | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<GuestStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Guest>(makeGuest(''));
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counters = useMemo(
    () => ({
      invited: guests.filter((guest) => guest.status === 'invited').length,
      confirmed: guests.filter((guest) => guest.status === 'confirmed').length,
      declined: guests.filter((guest) => guest.status === 'declined').length,
    }),
    [guests]
  );
  const confirmedHeadcount = getConfirmedHeadcount(guests);
  const exceedsPlan = confirmedHeadcount > planGuests * 1.05;
  const filteredGuests = guests.filter(
    (guest) =>
      (groupFilter === 'all' || guest.group === groupFilter) &&
      (statusFilter === 'all' || guest.status === statusFilter)
  );
  const dietSummary = getDietSummary(guests);
  const invitationIdea = ideas.find((idea) => idea.category === 'invitation')?.description || '';
  const rsvpIdea = ideas.find((idea) => idea.category === 'rsvp')?.description || '';

  const announceCounterChange = (nextGuests: Guest[]) => {
    const nextConfirmed = nextGuests.filter((guest) => guest.status === 'confirmed').length;
    const nextInvited = nextGuests.filter((guest) => guest.status === 'invited').length;
    const nextDeclined = nextGuests.filter((guest) => guest.status === 'declined').length;
    const live = document.getElementById('guest-counter-announcement');
    if (live) {
      live.textContent = `${nextInvited} invited, ${nextConfirmed} confirmed, ${nextDeclined} declined.`;
    }
  };

  const updateGuests = (nextGuests: Guest[]) => {
    onUpdateGuests(nextGuests);
    announceCounterChange(nextGuests);
  };

  const saveDraft = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const next = editingId
      ? guests.map((guest) => (guest.id === editingId ? { ...draft, name: draft.name.trim() } : guest))
      : [...guests, { ...draft, name: draft.name.trim() }];
    updateGuests(next);
    setEditingId(null);
    setDraft(makeGuest(''));
  };

  const startEdit = (guest: Guest) => {
    setEditingId(guest.id);
    setDraft({ ...guest });
  };

  const importNames = () => {
    const names = bulkText.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    if (names.length === 0) return;
    updateGuests([...guests, ...names.map(makeGuest)]);
    setBulkText('');
    setShowBulk(false);
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(lines[0]?.toLowerCase().includes('name') ? 1 : 0);
      const imported = rows.map((line) => {
        const [name, group, status, diet, allergy_note, plus_ones] = parseCsvLine(line);
        const guest = makeGuest(name || 'Unnamed guest');
        return {
          ...guest,
          group: GROUPS.includes(group as GuestGroup) ? group as GuestGroup : guest.group,
          status: STATUSES.includes(status as GuestStatus) ? status as GuestStatus : guest.status,
          diet: DIETS.includes(diet as GuestDiet) ? diet as GuestDiet : guest.diet,
          allergy_note: allergy_note || undefined,
          plus_ones: Math.max(0, Number.parseInt(plus_ones || '0', 10) || 0),
        };
      });
      if (imported.length > 0) updateGuests([...guests, ...imported]);
    };
    reader.readAsText(file);
  };

  const exportCsv = () => {
    const header = 'name,group,status,diet,allergy_note,plus_ones';
    const rows = guests.map((guest) =>
      [guest.name, guest.group, guest.status, guest.diet, guest.allergy_note || '', guest.plus_ones].map(csvEscape).join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-guests.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard?.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const cateringText = `Catering headcount for ${eventTitle}\nConfirmed guests: ${confirmedHeadcount}\nVeg: ${dietSummary.veg}\nNon-veg: ${dietSummary['non-veg']}\nJain: ${dietSummary.jain}\nVegan: ${dietSummary.vegan}`;

  const personalizedRsvp = (guest: Guest) => {
    const greeting = guest.name.split(/\s+/)[0];
    const base = [invitationIdea, rsvpIdea].filter(Boolean).join('\n\n') || `You are invited to ${eventTitle}.`;
    return `Hi ${greeting}! ${base}\n\nPlease confirm your attendance for ${eventTitle}.`;
  };

  return (
    <div className="space-y-6">
      <div id="guest-counter-announcement" role="status" aria-live="polite" className="sr-only" />
      <section className="bg-white/90 dark:bg-[#23152C]/90 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-[#B45309]" /> Guests</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Track invitations, attendance, dietary needs and plus-ones.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {STATUSES.map((status) => <span key={status} className="rounded-full bg-stone-100 dark:bg-stone-900 px-3 py-1.5">{labelize(status)}: {counters[status]}</span>)}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Confirmed headcount</p>
            <p className="text-2xl font-bold tabular-nums">{confirmedHeadcount} <span className="text-sm font-normal text-stone-500">of {planGuests} planned</span></p>
          </div>
          {exceedsPlan && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
              <span>Confirmed headcount is more than 5% above the plan.</span>
              <button onClick={() => onRequestReplan(`Update the event guest count to ${confirmedHeadcount} based on confirmed guests and plus-ones.`)} className="rounded-lg bg-[#B45309] px-3 py-2 font-bold text-white cursor-pointer whitespace-nowrap">Update plan to {confirmedHeadcount} guests</button>
            </div>
          )}
        </div>

        <form onSubmit={saveDraft} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" aria-label={editingId ? 'Edit guest' : 'Add guest'}>
          <label className="text-xs font-semibold">Name<input aria-label="Guest name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm" required /></label>
          <label className="text-xs font-semibold">Group<select aria-label="Guest group" value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value as GuestGroup })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm">{GROUPS.map((group) => <option key={group} value={group}>{labelize(group)}</option>)}</select></label>
          <label className="text-xs font-semibold">Status<select aria-label="Guest status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as GuestStatus })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm">{STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></label>
          <label className="text-xs font-semibold">Diet<select aria-label="Guest diet" value={draft.diet} onChange={(e) => setDraft({ ...draft, diet: e.target.value as GuestDiet })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm">{DIETS.map((diet) => <option key={diet} value={diet}>{labelize(diet)}</option>)}</select></label>
          <label className="text-xs font-semibold">Allergy note<input aria-label="Allergy note" value={draft.allergy_note || ''} onChange={(e) => setDraft({ ...draft, allergy_note: e.target.value || undefined })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold">Plus-ones<input aria-label="Plus ones" type="number" min="0" max="10" value={draft.plus_ones} onChange={(e) => setDraft({ ...draft, plus_ones: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm" /></label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B1F4A] dark:bg-[#F5A623] dark:text-stone-950 text-white px-4 py-2 text-sm font-bold cursor-pointer"><Plus className="w-4 h-4" />{editingId ? 'Save guest' : 'Add guest'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(makeGuest('')); }} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 px-4 py-2 text-sm font-bold cursor-pointer"><X className="w-4 h-4" />Cancel</button>}
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowBulk(!showBulk)} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold cursor-pointer"><Clipboard className="w-4 h-4" />Bulk paste names</button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold cursor-pointer"><FileUp className="w-4 h-4" />Import CSV</button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) importCsv(file); e.currentTarget.value = ''; }} />
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-bold cursor-pointer"><Download className="w-4 h-4" />Export CSV</button>
        </div>
        {showBulk && <div className="flex gap-2"><textarea aria-label="Bulk guest names" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="One name per line" className="min-h-24 flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm" /><button onClick={importNames} className="self-end rounded-xl bg-[#B45309] text-white px-3 py-2 text-xs font-bold cursor-pointer">Add names</button></div>}
      </section>

      <section className="bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <select aria-label="Filter guests by group" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as GuestGroup | 'all')} className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs"><option value="all">All groups</option>{GROUPS.map((group) => <option key={group} value={group}>{labelize(group)}</option>)}</select>
          <select aria-label="Filter guests by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as GuestStatus | 'all')} className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs"><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Guest list">
            <thead><tr className="border-b border-stone-200 dark:border-stone-700 text-xs text-stone-500"><th scope="col" className="p-2">Name</th><th scope="col" className="p-2">Group</th><th scope="col" className="p-2">Status</th><th scope="col" className="p-2">Diet</th><th scope="col" className="p-2">Plus-ones</th><th scope="col" className="p-2">Actions</th></tr></thead>
            <tbody>{filteredGuests.map((guest) => <tr key={guest.id} className="border-b border-stone-100 dark:border-stone-800"><th scope="row" className="p-2 font-semibold">{guest.name}{guest.allergy_note && <span className="block text-[11px] text-amber-700">{guest.allergy_note}</span>}</th><td className="p-2">{labelize(guest.group)}</td><td className="p-2">{labelize(guest.status)}</td><td className="p-2">{labelize(guest.diet)}</td><td className="p-2 tabular-nums">{guest.plus_ones}</td><td className="p-2"><div className="flex gap-1"><button aria-label={`Edit ${guest.name}`} onClick={() => startEdit(guest)} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 cursor-pointer"><Pencil className="w-4 h-4" /></button><button aria-label={`Delete ${guest.name}`} onClick={() => updateGuests(guests.filter((item) => item.id !== guest.id))} className="p-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody>
          </table>
          {filteredGuests.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No guests match these filters.</p>}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800 p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4" />Catering summary</h3><button onClick={() => copyText(cateringText, 'catering')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer">{copied === 'catering' ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}Copy</button></div>
          <p className="text-xs text-stone-500 mt-1">Confirmed guests and plus-ones by diet.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">{DIETS.map((diet) => <div key={diet} className="rounded-xl bg-stone-50 dark:bg-stone-900 p-3"><span className="text-xs text-stone-500">{labelize(diet)}</span><strong className="block text-xl">{dietSummary[diet]}</strong></div>)}</div>
        </div>
        <div className="bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800 p-5">
          <h3 className="font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-600" />Personalised RSVP messages</h3>
          <p className="text-xs text-stone-500 mt-1">Copy a guest-specific WhatsApp message or open it in WhatsApp.</p>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">{guests.map((guest) => { const message = personalizedRsvp(guest); return <div key={guest.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 dark:bg-stone-900 p-3"><span className="text-xs font-semibold truncate">{guest.name}</span><div className="flex gap-1 shrink-0"><button aria-label={`Copy RSVP for ${guest.name}`} onClick={() => copyText(message, guest.id)} className="rounded-lg px-2 py-1 text-xs font-bold cursor-pointer">{copied === guest.id ? 'Copied' : 'Copy'}</button><a aria-label={`Open WhatsApp RSVP for ${guest.name}`} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 text-white px-2 py-1 text-xs font-bold">wa.me</a></div></div>; })}</div>
        </div>
      </section>
    </div>
  );
};
