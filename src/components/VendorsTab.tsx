/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  HelpCircle,
  MessageSquareText,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  PhoneCall,
  Clock,
  CheckCircle2,
  FileEdit,
  X,
  ExternalLink
} from 'lucide-react';
import { VendorRequirement } from '../types/plan.ts';
import { formatINR } from '../utils/planLogic.ts';

interface VendorsTabProps {
  vendors: VendorRequirement[];
  city: string;
  onUpdateVendors?: (newVendors: VendorRequirement[]) => void;
  language?: 'en' | 'hi' | 'te' | 'bn';
}

type VendorStatus = 'todo' | 'contacted' | 'shortlisted' | 'booked';

const STATUS_CONFIG: Record<VendorStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  todo: {
    label: 'To Do',
    bg: 'bg-stone-100 dark:bg-stone-800',
    text: 'text-stone-700 dark:text-stone-300',
    border: 'border-stone-300 dark:border-stone-700',
    icon: <Clock className="w-3 h-3" />,
  },
  contacted: {
    label: 'Contacted',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <PhoneCall className="w-3 h-3" />,
  },
  shortlisted: {
    label: 'Shortlisted',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <HelpCircle className="w-3 h-3" />,
  },
  booked: {
    label: 'Booked',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export const VendorsTab: React.FC<VendorsTabProps> = ({ vendors, city, onUpdateVendors, language = 'en' }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeNotesIndex, setActiveNotesIndex] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);
  const translate = async (index: number, text: string) => {
    setTranslating(index);
    try {
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }) });
      const data = await response.json();
      if (response.ok && data.translation) setTranslations((prev) => ({ ...prev, [index]: data.translation }));
    } finally { setTranslating(null); }
  };

  // New Vendor Form State
  const [newType, setNewType] = useState('');
  const [newLow, setNewLow] = useState('25000');
  const [newHigh, setNewHigh] = useState('60000');
  const [newQuestions, setNewQuestions] = useState('');
  const [newRedFlags, setNewRedFlags] = useState('');
  const [newOutreach, setNewOutreach] = useState('');

  const handleCopyMessage = (message: string, idx: number) => {
    navigator.clipboard.writeText(message);
    setCopiedIdx(idx);
    setTimeout(() => {
      setCopiedIdx(null);
    }, 2200);
  };

  const handleStatusChange = (index: number, newStatus: VendorStatus) => {
    if (!onUpdateVendors) return;
    const updated = vendors.map((v, i) => (i === index ? { ...v, status: newStatus } : v));
    onUpdateVendors(updated);
  };

  const handleNotesChange = (index: number, notes: string) => {
    if (!onUpdateVendors) return;
    const updated = vendors.map((v, i) => (i === index ? { ...v, notes } : v));
    onUpdateVendors(updated);
  };

  const handleDeleteVendor = (index: number) => {
    if (!onUpdateVendors) return;
    const vendorToDelete = vendors[index];
    if (confirm(`Remove "${vendorToDelete.type}" from vendor directory?`)) {
      const updated = vendors.filter((_, i) => i !== index);
      onUpdateVendors(updated);
    }
  };

  const handleAddCustomVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim() || !onUpdateVendors) return;

    const low = parseInt(newLow) || 15000;
    const high = parseInt(newHigh) || low * 2;

    const questionsList = newQuestions.trim()
      ? newQuestions.split('\n').map((q) => q.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
      : ['What is your availability for our date?', 'What is included in your standard package?'];

    const redFlagsList = newRedFlags.trim()
      ? newRedFlags.split('\n').map((r) => r.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
      : ['Unwilling to provide a written contract', 'Vague regarding overtime charges'];

    const outreach = newOutreach.trim() ||
      `Namaste! We are planning a celebration in ${city || 'our city'} and loved your portfolio. Are you available on our date? Please share your packages and brochure.`;

    const newVendor: VendorRequirement = {
      type: newType.trim(),
      est_low: low,
      est_high: high,
      questions: questionsList,
      red_flags: redFlagsList,
      outreach_message: outreach,
      status: 'todo',
      notes: '',
    };

    onUpdateVendors([...vendors, newVendor]);
    setIsAddModalOpen(false);
    setNewType('');
    setNewLow('25000');
    setNewHigh('60000');
    setNewQuestions('');
    setNewRedFlags('');
    setNewOutreach('');
  };

  // Status counts
  const statusCounts = vendors.reduce(
    (acc, v) => {
      const s = (v.status || 'todo') as VendorStatus;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { todo: 0, contacted: 0, shortlisted: 0, booked: 0 } as Record<VendorStatus, number>
  );

  // Filter & Search
  const filteredVendors = vendors
    .map((v, originalIndex) => ({ ...v, originalIndex }))
    .filter((v) => {
      const currentStatus = v.status || 'todo';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.type.toLowerCase().includes(q) ||
        (v.notes && v.notes.toLowerCase().includes(q)) ||
        v.questions.some((item) => item.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-6">
      {/* Top CRM Status Summary & Controls */}
      <div className="bg-white/80 dark:bg-[#23152C]/90 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Vendor Hiring & CRM Tracker
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Market rates realistic for {city || 'your city'}. Track hiring pipeline from initial outreach to confirmed booking.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#4E2B61] text-white dark:bg-[#F5A623] dark:hover:bg-[#E0961E] dark:text-stone-950 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vendor Category</span>
          </button>
        </div>

        {/* Quick Pipeline Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-stone-100 dark:border-stone-800/80">
          {(['todo', 'contacted', 'shortlisted', 'booked'] as VendorStatus[]).map((statusKey) => {
            const conf = STATUS_CONFIG[statusKey];
            const count = statusCounts[statusKey] || 0;
            const isCurrent = statusFilter === statusKey;

            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(isCurrent ? 'all' : statusKey)}
                className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  isCurrent
                    ? `${conf.bg} ${conf.border} ring-2 ring-[#F5A623]/30`
                    : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${conf.text}`}>
                    {conf.icon}
                    {conf.label}
                  </span>
                  <span className="text-sm font-serif font-bold text-stone-800 dark:text-stone-100">
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor types, questions, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Reset Filter ({statusFilter})
            </button>
          )}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white dark:bg-[#23152C] rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-2">
          <p className="font-serif text-base font-bold text-stone-700 dark:text-stone-300">
            No vendors found matching your filter
          </p>
          <p className="text-xs text-stone-400">
            Try resetting your search query or status filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="mt-2 text-xs font-semibold text-[#F5A623] hover:underline cursor-pointer"
          >
            Show All Vendors
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredVendors.map((vendor) => {
            const idx = vendor.originalIndex;
            const isCopied = copiedIdx === idx;
            const currentStatus = (vendor.status || 'todo') as VendorStatus;
            const statusConfig = STATUS_CONFIG[currentStatus];
            const isEditingNotes = activeNotesIndex === idx;

            return (
              <div
                key={`${vendor.type}-${idx}`}
                className="bg-white dark:bg-[#23152C] rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs transition-shadow hover:shadow-md space-y-4"
              >
                {/* Header: Title, Status CRM Dropdown, Price, and Delete */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800/80 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                        {vendor.type}
                      </h4>

                      {/* Status Selector */}
                      <div className="relative inline-block">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(idx, e.target.value as VendorStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                          aria-label={`Change status for ${vendor.type}`}
                        >
                          <option value="todo">To Do</option>
                          <option value="contacted">Contacted</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="booked">Booked</option>
                        </select>
                      </div>
                    </div>

                    <span className="text-xs text-stone-500 dark:text-stone-400 block">
                      Target City: {city || 'City-wide Benchmarks'}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.type} in ${city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a56db] dark:text-blue-300 hover:underline"
                      aria-label={`Find nearby ${vendor.type} vendors in ${city}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Find nearby
                    </a>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] uppercase tracking-wider font-medium text-stone-400">
                        Est. Market Range
                      </div>
                      <div className="text-base font-serif font-bold text-[#F5A623] tabular-nums">
                        {formatINR(vendor.est_low, true)} – {formatINR(vendor.est_high, true)}
                      </div>
                    </div>

                    {onUpdateVendors && (
                      <button
                        onClick={() => handleDeleteVendor(idx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete vendor"
                        aria-label={`Delete ${vendor.type}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Questions & Red Flags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2-4 Questions to Ask */}
                  <div className="bg-amber-500/[0.04] dark:bg-amber-500/[0.05] p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#D97706] dark:text-[#F5A623]">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Essential Questions to Ask
                    </div>
                    <ul className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                      {vendor.questions.map((q, qIdx) => (
                        <li key={qIdx} className="flex items-start gap-1.5">
                          <span className="text-[#F5A623] font-bold shrink-0">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 2-3 Red Flags */}
                  <div className="bg-red-500/[0.04] dark:bg-red-500/[0.05] p-3.5 rounded-xl border border-red-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Vendor Red Flags to Avoid
                    </div>
                    <ul className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                      {vendor.red_flags.map((rf, rfIdx) => (
                        <li key={rfIdx} className="flex items-start gap-1.5">
                          <span className="text-red-500 font-bold shrink-0">•</span>
                          <span>{rf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ready-to-Send Outreach Message */}
                <div className="bg-stone-50 dark:bg-stone-900/60 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                      <MessageSquareText className="w-3.5 h-3.5 text-[#F5A623]" />
                      Ready-to-Send Outreach Message
                    </span>
                    <button
                      onClick={() => handleCopyMessage(vendor.outreach_message, idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-[#F5A623] text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                      aria-label={`Copy outreach message for ${vendor.type}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-mono whitespace-pre-wrap bg-white dark:bg-stone-950 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800">
                    {translations[idx] || vendor.outreach_message}
                  </p>
                  {language !== 'en' && (
                    <button onClick={() => translate(idx, vendor.outreach_message)} className="text-xs text-[#1a56db] hover:underline" disabled={translating === idx}>
                      {translating === idx ? 'Translating…' : 'Translate this message'}
                    </button>
                  )}
                </div>

                {/* Custom Notes / Shortlisted Vendor Names */}
                <div className="pt-1">
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                        <span>Notes & Contact Info</span>
                        <button
                          onClick={() => setActiveNotesIndex(null)}
                          className="text-[#F5A623] hover:underline font-semibold cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                      <textarea
                        value={vendor.notes || ''}
                        onChange={(e) => handleNotesChange(idx, e.target.value)}
                        placeholder="e.g. Contacted Sharma Caterers: 98480xxxxx, quoted ₹1.8L including welcome drinks..."
                        className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <div className="truncate pr-2">
                        {vendor.notes ? (
                          <span className="font-mono text-stone-700 dark:text-stone-300">
                            📝 {vendor.notes}
                          </span>
                        ) : (
                          <span className="italic text-stone-400">No notes or vendor contacts recorded yet</span>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveNotesIndex(idx)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F5A623] hover:underline cursor-pointer shrink-0"
                      >
                        <FileEdit className="w-3 h-3" />
                        <span>{vendor.notes ? 'Edit Notes' : '+ Add Note'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#23152C] rounded-3xl p-6 max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                Add Vendor Category
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomVendor} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Vendor Type / Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Videographer, Mehndi Artist, Priest / Pundit"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Est. Low (₹)
                  </label>
                  <input
                    type="number"
                    value={newLow}
                    onChange={(e) => setNewLow(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Est. High (₹)
                  </label>
                  <input
                    type="number"
                    value={newHigh}
                    onChange={(e) => setNewHigh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Questions to Ask (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Do you have backup equipment?&#10;What are the overtime fees per hour?"
                  value={newQuestions}
                  onChange={(e) => setNewQuestions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Red Flags to Avoid (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Refuses written receipt or agreement&#10;Demands 100% upfront cash payment"
                  value={newRedFlags}
                  onChange={(e) => setNewRedFlags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Outreach Message Template (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Leave empty for auto-generated template"
                  value={newOutreach}
                  onChange={(e) => setNewOutreach(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
