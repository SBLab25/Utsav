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
  ExternalLink,
  Layers,
  FileSpreadsheet,
  Download,
  Star,
  CheckSquare,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import type { VendorRequirement, VendorQuote, PaymentRecord } from '../types/plan.ts';
import { formatINR, calculateQuoteStats } from '../utils/planLogic.ts';

interface VendorsTabProps {
  vendors: VendorRequirement[];
  city: string;
  onUpdateVendors?: (newVendors: VendorRequirement[]) => void;
  language?: 'en' | 'hi' | 'te' | 'bn';
  onLogPayment?: (payment: Omit<PaymentRecord, 'id'>) => void;
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

export const VendorsTab: React.FC<VendorsTabProps> = ({ vendors, city, onUpdateVendors, language = 'en', onLogPayment }) => {
  const [activeSubView, setActiveSubView] = useState<'guides' | 'quotes'>('guides');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeNotesIndex, setActiveNotesIndex] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);

  // Booked status payment prompt state
  const [bookedPaymentOffer, setBookedPaymentOffer] = useState<{
    vendorIndex: number;
    vendorType: string;
    quote: number;
  } | null>(null);

  // Quote Add Modal State
  const [quoteModalVendorIdx, setQuoteModalVendorIdx] = useState<number | null>(null);
  const [quoteVendorName, setQuoteVendorName] = useState('');
  const [quoteContactPerson, setQuoteContactPerson] = useState('');
  const [quotePhoneOrEmail, setQuotePhoneOrEmail] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteInclusions, setQuoteInclusions] = useState('');
  const [quoteRating, setQuoteRating] = useState(5);
  const [quoteNotes, setQuoteNotes] = useState('');

  // Selected Category Filter for Quote Comparison Sheet
  const [comparisonCategoryFilter, setComparisonCategoryFilter] = useState<string>('all');

  const translate = async (index: number, text: string) => {
    setTranslating(index);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      const data = await response.json();
      if (response.ok && data.translation) {
        setTranslations((prev) => ({ ...prev, [index]: data.translation }));
      }
    } finally {
      setTranslating(null);
    }
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

    if (newStatus === 'booked') {
      const v = vendors[index];
      const quoteAmount = v.quote || (v.quotes && v.quotes.find((q) => q.status === 'selected')?.quote_amount) || v.est_low;
      if (quoteAmount && quoteAmount > 0) {
        setBookedPaymentOffer({ vendorIndex: index, vendorType: v.type, quote: quoteAmount });
      }
    }
  };

  const handleQuoteChange = (index: number, newQuote?: number) => {
    if (!onUpdateVendors) return;
    const updated = vendors.map((v, i) => (i === index ? { ...v, quote: newQuote } : v));
    onUpdateVendors(updated);
    if (vendors[index].status === 'booked' && newQuote && newQuote > 0) {
      setBookedPaymentOffer({ vendorIndex: index, vendorType: vendors[index].type, quote: newQuote });
    }
  };

  const handleRadioKeyDown = (
    e: React.KeyboardEvent,
    vendorIndex: number,
    currentStatus: VendorStatus
  ) => {
    const statusKeys: VendorStatus[] = ['todo', 'contacted', 'shortlisted', 'booked'];
    const currentIndex = statusKeys.indexOf(currentStatus);
    let nextIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % statusKeys.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + statusKeys.length) % statusKeys.length;
    }

    if (nextIndex >= 0) {
      const nextStatus = statusKeys[nextIndex];
      handleStatusChange(vendorIndex, nextStatus);
      const targetRadio = document.getElementById(`radio-vendor-${vendorIndex}-${nextStatus}`);
      targetRadio?.focus();
    }
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
      quotes: [],
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

  // Add Quote to Vendor
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteModalVendorIdx === null || !quoteVendorName.trim() || !onUpdateVendors) return;

    const parsedAmount = parseInt(quoteAmount) || 0;
    const inclusionsList = quoteInclusions.trim()
      ? quoteInclusions.split('\n').map((inc) => inc.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
      : [];

    const newQuote: VendorQuote = {
      id: `quote-${Date.now()}`,
      vendor_name: quoteVendorName.trim(),
      contact_person: quoteContactPerson.trim() || undefined,
      phone_or_email: quotePhoneOrEmail.trim() || undefined,
      quote_amount: parsedAmount,
      inclusions: inclusionsList,
      status: 'received',
      rating: quoteRating,
      notes: quoteNotes.trim() || undefined,
    };

    const updated = vendors.map((v, i) => {
      if (i === quoteModalVendorIdx) {
        return {
          ...v,
          quotes: [...(v.quotes || []), newQuote],
        };
      }
      return v;
    });

    onUpdateVendors(updated);
    setQuoteModalVendorIdx(null);
    setQuoteVendorName('');
    setQuoteContactPerson('');
    setQuotePhoneOrEmail('');
    setQuoteAmount('');
    setQuoteInclusions('');
    setQuoteNotes('');
    setQuoteRating(5);
  };

  // Select a quote as the booked vendor
  const handleSelectQuote = (vendorIdx: number, quoteId: string) => {
    if (!onUpdateVendors) return;
    const targetVendor = vendors[vendorIdx];
    const quotes = targetVendor.quotes || [];
    const chosenQuote = quotes.find((q) => q.id === quoteId);
    if (!chosenQuote) return;

    const updatedQuotes = quotes.map((q) => ({
      ...q,
      status: q.id === quoteId ? ('selected' as const) : q.status === 'selected' ? ('shortlisted' as const) : q.status,
    }));

    const updated = vendors.map((v, i) => {
      if (i === vendorIdx) {
        return {
          ...v,
          status: 'booked' as const,
          quote: chosenQuote.quote_amount,
          quotes: updatedQuotes,
        };
      }
      return v;
    });

    onUpdateVendors(updated);
  };

  // Update status of individual quote
  const handleQuoteStatusChange = (vendorIdx: number, quoteId: string, newStatus: VendorQuote['status']) => {
    if (!onUpdateVendors) return;
    const targetVendor = vendors[vendorIdx];
    const quotes = targetVendor.quotes || [];

    const updatedQuotes = quotes.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q));
    const isSelected = newStatus === 'selected';
    const chosenQuote = quotes.find((q) => q.id === quoteId);

    const updated = vendors.map((v, i) => {
      if (i === vendorIdx) {
        return {
          ...v,
          ...(isSelected ? { status: 'booked' as const, quote: chosenQuote?.quote_amount } : {}),
          quotes: updatedQuotes,
        };
      }
      return v;
    });

    onUpdateVendors(updated);
  };

  // Delete quote
  const handleDeleteQuote = (vendorIdx: number, quoteId: string) => {
    if (!onUpdateVendors) return;
    const targetVendor = vendors[vendorIdx];
    const quotes = targetVendor.quotes || [];
    const updatedQuotes = quotes.filter((q) => q.id !== quoteId);

    const updated = vendors.map((v, i) => (i === vendorIdx ? { ...v, quotes: updatedQuotes } : v));
    onUpdateVendors(updated);
  };

  // Export Quotes as CSV
  const handleExportQuotesCSV = () => {
    const rows = [
      ['Vendor Category', 'Vendor Name', 'Contact Person', 'Phone / Email', 'Quoted Amount (INR)', 'Status', 'Rating', 'Inclusions', 'Notes'],
    ];

    vendors.forEach((v) => {
      (v.quotes || []).forEach((q) => {
        rows.push([
          `"${v.type.replace(/"/g, '""')}"`,
          `"${q.vendor_name.replace(/"/g, '""')}"`,
          `"${(q.contact_person || '').replace(/"/g, '""')}"`,
          `"${(q.phone_or_email || '').replace(/"/g, '""')}"`,
          String(q.quote_amount),
          q.status,
          String(q.rating || ''),
          `"${(q.inclusions || []).join('; ').replace(/"/g, '""')}"`,
          `"${(q.notes || '').replace(/"/g, '""')}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendor-quotes-comparison-${city.toLowerCase().replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Total Quotes statistics
  const allQuotes = vendors.flatMap((v) => (v.quotes || []).map((q) => ({ ...q, category: v.type })));
  const totalQuotesCount = allQuotes.length;
  const shortlistedQuotesCount = allQuotes.filter((q) => q.status === 'shortlisted').length;
  const selectedQuotesCount = allQuotes.filter((q) => q.status === 'selected').length;
  const totalCommittedSpend = vendors
    .filter((v) => v.status === 'booked' && v.quote)
    .reduce((acc, curr) => acc + (curr.quote || 0), 0);

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
        v.questions.some((item) => item.toLowerCase().includes(q)) ||
        (v.quotes || []).some((item) => item.vendor_name.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-6">
      {/* Top Navigation & Sub-views */}
      <div className="bg-white/80 dark:bg-[#23152C]/90 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Vendor Hiring & Quote Comparison
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Market rates realistic for {city || 'your city'}. Compare multi-vendor bids side-by-side and manage bookings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubView('guides')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubView === 'guides'
                    ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Directory & Vetting</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView('quotes')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubView === 'quotes'
                    ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span>Quote Comparison ({totalQuotesCount})</span>
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#4E2B61] text-white dark:bg-[#F5A623] dark:hover:bg-[#E0961E] dark:text-stone-950 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Quote Comparison Metrics Ribbon */}
        {activeSubView === 'quotes' ? (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800">
                <span className="text-[10px] font-semibold text-stone-500 uppercase">Quotes Logged</span>
                <p className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">{totalQuotesCount} quotes</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">Shortlisted Bids</span>
                <p className="text-base font-bold text-amber-800 dark:text-amber-200 mt-0.5">{shortlistedQuotesCount} active</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Booked Vendors</span>
                <p className="text-base font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">{selectedQuotesCount} selected</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase">Committed Spend</span>
                <p className="text-base font-bold text-purple-800 dark:text-purple-200 mt-0.5">{formatINR(totalCommittedSpend)}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="category-quote-filter" className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  Filter by Category:
                </label>
                <select
                  id="category-quote-filter"
                  value={comparisonCategoryFilter}
                  onChange={(e) => setComparisonCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200"
                >
                  <option value="all">All Vendor Categories ({vendors.length})</option>
                  {vendors.map((v, i) => (
                    <option key={i} value={v.type}>
                      {v.type} ({v.quotes?.length || 0} quotes)
                    </option>
                  ))}
                </select>
              </div>

              {totalQuotesCount > 0 && (
                <button
                  type="button"
                  onClick={handleExportQuotesCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:border-[#B45309] text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sheet (CSV)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Quick Pipeline Status Counters for Directory View */
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'border-[#B45309] dark:border-[#F5A623] bg-amber-500/10 text-[#B45309] dark:text-[#F5A623] font-bold'
                  : 'border-stone-200/70 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
              }`}
            >
              All ({vendors.length})
            </button>
            {(['todo', 'contacted', 'shortlisted', 'booked'] as VendorStatus[]).map((statusKey) => {
              const conf = STATUS_CONFIG[statusKey];
              const count = statusCounts[statusKey] || 0;
              const isCurrent = statusFilter === statusKey;

              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setStatusFilter(isCurrent ? 'all' : statusKey)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'border-[#B45309] dark:border-[#F5A623] bg-amber-500/10 text-[#B45309] dark:text-[#F5A623] font-bold'
                      : 'border-stone-200/70 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                  }`}
                >
                  {conf.icon}
                  <span>
                    {conf.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW 1: QUOTE COMPARISON SHEET */}
      {activeSubView === 'quotes' ? (
        <div className="space-y-6">
          {vendors
            .filter((v) => comparisonCategoryFilter === 'all' || v.type === comparisonCategoryFilter)
            .map((vendor, vendorOriginalIdx) => {
              const quotes = vendor.quotes || [];
              const stats = calculateQuoteStats(vendor);

              return (
                <div
                  key={vendor.type}
                  className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs space-y-4"
                >
                  {/* Category Header & Target Bracket */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                          {vendor.type}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          Target: {formatINR(vendor.est_low)} – {formatINR(vendor.est_high)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} received ·{' '}
                        {stats.selectedQuote ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Booked with {stats.selectedQuote.vendor_name} ({formatINR(stats.selectedQuote.quote_amount)})
                          </span>
                        ) : (
                          <span>Shortlist and select the best value bid</span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuoteModalVendorIdx(vendorOriginalIdx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#B45309] dark:text-[#F5A623] font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Quote for {vendor.type}</span>
                    </button>
                  </div>

                  {/* Quotes Cards Grid */}
                  {quotes.length === 0 ? (
                    <div className="py-6 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        No quotes logged for {vendor.type} yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setQuoteModalVendorIdx(vendorOriginalIdx)}
                        className="mt-2 text-xs font-semibold text-[#B45309] dark:text-[#F5A623] hover:underline"
                      >
                        + Add the first vendor quote
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {quotes.map((quote) => {
                        const isSelected = quote.status === 'selected';
                        const variance = quote.quote_amount - vendor.est_high;
                        const isUnderBudget = quote.quote_amount <= vendor.est_high;

                        return (
                          <div
                            key={quote.id}
                            className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/[0.06] shadow-sm'
                                : quote.status === 'rejected'
                                ? 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 opacity-70'
                                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60'
                            }`}
                          >
                            {/* Vendor Title & Rating */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                  {quote.vendor_name}
                                </h5>
                                {(quote.contact_person || quote.phone_or_email) && (
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                    {quote.contact_person} {quote.phone_or_email ? `· ${quote.phone_or_email}` : ''}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {quote.rating && (
                                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    {quote.rating.toFixed(1)}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuote(vendorOriginalIdx, quote.id)}
                                  className="text-stone-400 hover:text-red-500 p-1"
                                  aria-label="Delete quote"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Quoted Price & Budget Variance */}
                            <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Quote Amount</span>
                                <span className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                                  {formatINR(quote.quote_amount)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                                    isUnderBudget
                                      ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {isUnderBudget
                                    ? `Within Budget`
                                    : `+${formatINR(variance, true)} over target`}
                                </span>
                              </div>
                            </div>

                            {/* Inclusions Chips */}
                            {quote.inclusions && quote.inclusions.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-stone-500 uppercase block">Inclusions</span>
                                <div className="flex flex-wrap gap-1">
                                  {quote.inclusions.map((inc, iIdx) => (
                                    <span
                                      key={iIdx}
                                      className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-700 dark:text-stone-300"
                                    >
                                      ✓ {inc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {quote.notes && (
                              <p className="text-[11px] text-stone-500 italic bg-stone-50 dark:bg-stone-900/60 p-2 rounded-md">
                                📝 {quote.notes}
                              </p>
                            )}

                            {/* Status and Action Buttons */}
                            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                              <select
                                value={quote.status}
                                onChange={(e) =>
                                  handleQuoteStatusChange(vendorOriginalIdx, quote.id, e.target.value as VendorQuote['status'])
                                }
                                className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-[11px] font-semibold"
                              >
                                <option value="received">Received</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="selected">Selected / Booked</option>
                                <option value="rejected">Rejected</option>
                              </select>

                              {!isSelected && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectQuote(vendorOriginalIdx, quote.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Select & Book</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* VIEW 2: DIRECTORY & VETTING GUIDES (Standard View) */
        <div className="space-y-4">
          {filteredVendors.map((vendor) => {
            const idx = vendor.originalIndex;
            const currentStatus = (vendor.status || 'todo') as VendorStatus;
            const statusConf = STATUS_CONFIG[currentStatus];
            const isCopied = copiedIdx === idx;
            const isEditingNotes = activeNotesIndex === idx;
            const quotesCount = vendor.quotes?.length || 0;

            return (
              <div
                key={vendor.type}
                className="bg-white/90 dark:bg-[#23152C]/90 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs space-y-4"
              >
                {/* Header: Title, Price Bracket, Status Selector */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                        {vendor.type}
                      </h4>
                      {quotesCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setComparisonCategoryFilter(vendor.type);
                            setActiveSubView('quotes');
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5A623]/20 text-[#B45309] dark:text-[#F5A623] hover:underline cursor-pointer"
                        >
                          {quotesCount} {quotesCount === 1 ? 'Quote' : 'Quotes'} Logged
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                        {formatINR(vendor.est_low)} – {formatINR(vendor.est_high)}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="text-stone-500 dark:text-stone-400">Est. Market Range in {city}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Stepper Radiogroup */}
                    <div
                      role="radiogroup"
                      aria-label={`Status for ${vendor.type}`}
                      className="inline-flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs"
                    >
                      {(['todo', 'contacted', 'shortlisted', 'booked'] as VendorStatus[]).map((s) => {
                        const isChecked = currentStatus === s;
                        const conf = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            id={`radio-vendor-${idx}-${s}`}
                            aria-checked={isChecked}
                            tabIndex={isChecked ? 0 : -1}
                            onClick={() => handleStatusChange(idx, s)}
                            onKeyDown={(e) => handleRadioKeyDown(e, idx, currentStatus)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5A623] ${
                              isChecked
                                ? s === 'booked'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                            }`}
                          >
                            {conf.icon}
                            <span>{conf.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quote Field in INR */}
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`vendor-quote-${idx}`} className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                        Quote:
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400">₹</span>
                        <input
                          id={`vendor-quote-${idx}`}
                          type="number"
                          min="0"
                          step="500"
                          placeholder="Amount"
                          value={vendor.quote ?? ''}
                          onChange={(e) =>
                            handleQuoteChange(idx, e.target.value ? parseInt(e.target.value, 10) : undefined)
                          }
                          className="pl-6 pr-2 py-1 text-xs font-mono font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 w-28 focus:outline-none focus:ring-1 focus:ring-[#F5A623]"
                          aria-label={`Quote amount in INR for ${vendor.type}`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuoteModalVendorIdx(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-[#B45309] text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#B45309] dark:text-[#F5A623]" />
                      <span>+ Bid</span>
                    </button>

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
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(translations[idx] || vendor.outreach_message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                        aria-label={`Open WhatsApp with outreach message for ${vendor.type}`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Open WhatsApp</span>
                      </a>
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
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-mono whitespace-pre-wrap bg-white dark:bg-stone-950 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800">
                    {translations[idx] || vendor.outreach_message}
                  </p>
                  {language !== 'en' && (
                    <button
                      onClick={() => translate(idx, vendor.outreach_message)}
                      className="text-xs text-[#1a56db] hover:underline"
                      disabled={translating === idx}
                    >
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

      {/* Add Custom Vendor Category Modal */}
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
                  placeholder="No written agreement&#10;Demands 100% advance"
                  value={newRedFlags}
                  onChange={(e) => setNewRedFlags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3B1F4A] dark:bg-[#F5A623] hover:opacity-90 text-white dark:text-stone-950 font-bold transition-opacity"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {quoteModalVendorIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#23152C] rounded-3xl p-6 max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                  Add Vendor Quote
                </h3>
                <p className="text-xs text-stone-500">
                  Category: <span className="font-semibold text-stone-800 dark:text-stone-200">{vendors[quoteModalVendorIdx]?.type}</span>
                </p>
              </div>
              <button
                onClick={() => setQuoteModalVendorIdx(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DJ Rohit Beats, Royal Heritage Caterers"
                  value={quoteVendorName}
                  onChange={(e) => setQuoteVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={quoteContactPerson}
                    onChange={(e) => setQuoteContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Phone / Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98480 12345"
                    value={quotePhoneOrEmail}
                    onChange={(e) => setQuotePhoneOrEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Quote Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Rating (1 to 5 Stars)
                  </label>
                  <select
                    value={quoteRating}
                    onChange={(e) => setQuoteRating(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5.0 - Exceptional)</option>
                    <option value={4}>⭐⭐⭐⭐ (4.0 - Very Good)</option>
                    <option value={3}>⭐⭐⭐ (3.0 - Standard)</option>
                    <option value={2}>⭐⭐ (2.0 - Fair)</option>
                    <option value={1}>⭐ (1.0 - Poor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Package Inclusions (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="4 Wireless Mics&#10;Line array sound setup&#10;Moving beam lights"
                  value={quoteInclusions}
                  onChange={(e) => setQuoteInclusions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Notes / Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="Requires 20% advance; 4 hours setup window needed..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalVendorIdx(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3B1F4A] dark:bg-[#F5A623] hover:opacity-90 text-white dark:text-stone-950 font-bold transition-opacity"
                >
                  Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booked Status Log Payment Confirmation Modal */}
      {bookedPaymentOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#23152C] rounded-2xl max-w-sm w-full p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                Log Booked Quote as Payment?
              </h3>
              <button
                type="button"
                onClick={() => setBookedPaymentOffer(null)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              <strong className="text-stone-900 dark:text-stone-100">{bookedPaymentOffer.vendorType}</strong> is booked at{' '}
              <strong className="text-[#3B1F4A] dark:text-[#FFF8EE] font-mono">{formatINR(bookedPaymentOffer.quote)}</strong>.
              Would you like to log this quote as a payment in your celebration budget?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookedPaymentOffer(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Skip / Later
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onLogPayment) {
                    onLogPayment({
                      category: bookedPaymentOffer.vendorType,
                      amount: bookedPaymentOffer.quote,
                      note: `Booked ${bookedPaymentOffer.vendorType}`,
                      date: new Date().toISOString().slice(0, 10),
                    });
                  }
                  setBookedPaymentOffer(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                Log Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
