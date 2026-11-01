/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Sun,
  Moon,
  History,
  Printer,
  Share2,
  Calendar,
  Users,
  MapPin,
  Download,
  Upload,
  Sparkles,
  Cloud,
  CloudUpload,
  Check,
  LogIn,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { EventPlan } from '../types/plan.ts';
import type { UserProfile, CloudPlanDoc, CloudSyncStatus } from '../types/auth.ts';
import { generateGoogleCalendarUrl, generateWhatsAppSummary } from '../utils/planLogic.ts';
import { createShareUrl } from '../utils/sharePlan.ts';

interface HeaderProps {
  plan: EventPlan | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  onImportPlan?: (importedPlan: EventPlan) => void;
  readOnly?: boolean;
  language?: 'en' | 'hi' | 'te' | 'bn';
  onLanguageChange?: (language: 'en' | 'hi' | 'te' | 'bn') => void;
  onOpenInvitationDesigner?: () => void;
  user?: UserProfile | null;
  cloudSyncStatus?: CloudSyncStatus;
  activeCloudPlan?: CloudPlanDoc | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenCloudPlans?: () => void;
  onOpenCollaborators?: () => void;
  onSaveToCloud?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  darkMode,
  onToggleDarkMode,
  onOpenHistory,
  historyCount,
  onImportPlan,
  readOnly = false,
  language = 'en',
  onLanguageChange = () => {},
  onOpenInvitationDesigner,
  user = null,
  cloudSyncStatus = 'idle',
  activeCloudPlan = null,
  onOpenAuth = () => {},
  onSignOut = () => {},
  onOpenCloudPlans = () => {},
  onOpenCollaborators = () => {},
  onSaveToCloud = () => {},
}) => {
  const [copiedShare, setCopiedShare] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShareWhatsApp = () => {
    if (!plan) return;
    const summary = generateWhatsAppSummary(plan);
    navigator.clipboard.writeText(summary);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyShareLink = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(createShareUrl(plan));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!plan || !navigator.share) return;
    await navigator.share({
      title: plan.title,
      text: `View the shared Utsav plan for ${plan.title}`,
      url: createShareUrl(plan),
    });
  };

  const handleExportJSON = () => {
    if (!plan) return;
    const jsonString = JSON.stringify(plan, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (plan.title || 'event_plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    link.href = url;
    link.download = `utsav_${safeTitle}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportPlan) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.title && parsed.budget && parsed.timeline) {
          onImportPlan(parsed);
        } else {
          alert('Invalid plan file format. Please upload a valid Utsav plan JSON.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8EE]/90 dark:bg-[#180D1F]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors no-print">
      <div className="max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Utsav AI Celebration Planner Home"
          >
            <span className="w-8 h-8 rounded-xl bg-[#3B1F4A] dark:bg-[#F5A623] text-[#F5A623] dark:text-stone-950 flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              U
            </span>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#3B1F4A] dark:text-[#FFF8EE]">
              Utsav
            </span>
          </a>
        </div>

        {/* Zone 2: Event Context Chips (Center) */}
        {plan && (
          <div className="hidden lg:flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300 font-medium truncate">
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span className="font-mono">{plan.event_date}</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span className="font-mono">{plan.guests} guests</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
              <span>{plan.city}</span>
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${plan.city} venue area`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a56db] dark:text-blue-300 hover:underline"
              aria-label={`View venue area on Google Maps for ${plan.city}`}
            >
              View venue area on Google Maps
            </a>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="truncate max-w-[200px] text-stone-500 dark:text-stone-400 italic">
              "{plan.theme}"
            </span>
          </div>
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="header-language" className="sr-only">Generated content language</label>
          <select id="header-language" value={language} onChange={(e) => onLanguageChange(e.target.value as 'en' | 'hi' | 'te' | 'bn')} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
          </select>
          {plan && (
            <>
              {/* WhatsApp Share */}
              <button
                onClick={handleShareWhatsApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                title="Copy ready-to-share WhatsApp event summary"
                aria-label="Copy WhatsApp event summary"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedShare ? 'Copied WhatsApp!' : 'Copy WhatsApp summary'}</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#3B1F4A]/10 hover:bg-[#3B1F4A]/20 text-[#3B1F4A] dark:text-[#F5A623] border border-[#3B1F4A]/20 dark:border-[#F5A623]/30 transition-colors cursor-pointer"
                aria-label="Copy share link for this plan"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied link!' : 'Share link'}</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={handleNativeShare}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  aria-label="Share plan using device share sheet"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              )}

              <a
                href={generateGoogleCalendarUrl(
                  plan.title || 'Utsav celebration',
                  plan.event_date,
                  `Utsav celebration for ${plan.guests} guests. Theme: ${plan.theme}.`,
                  plan.city
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1a56db] dark:text-blue-300 border border-[#4285F4]/30 transition-colors"
                aria-label={`Add ${plan.title} to Google Calendar`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </a>

              {/* Export JSON */}
              {!readOnly && (
              <>
              <button
                onClick={handleExportJSON}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Export entire plan as JSON file"
                aria-label="Export plan as JSON file"
              >
                <Download className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span>JSON</span>
              </button>

              {/* Print View */}
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Print celebration plan view or save as PDF"
                aria-label="Print celebration plan view or save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              {/* Invitation Card */}
              {onOpenInvitationDesigner && (
                <button
                  onClick={onOpenInvitationDesigner}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-[#B45309] dark:text-[#F5A623] border border-amber-500/30 transition-colors cursor-pointer"
                  title="Design cultural invitation card & download printable cards"
                  aria-label="Design cultural invitation card"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Invite Card</span>
                </button>
              )}

              {/* History Drawer Toggle */}
              <button
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="View undo and version history"
                aria-label={`Version history, ${historyCount} versions available`}
              >
                <History className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span className="hidden md:inline">History</span>
                {historyCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 text-[10px] flex items-center justify-center font-bold">
                    {historyCount}
                  </span>
                )}
              </button>

              {/* Hidden file input for Import */}
              {onImportPlan && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                    aria-label="Upload JSON plan file"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden lg:inline-flex items-center gap-1 p-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Import previously saved JSON plan"
                    aria-label="Import JSON plan file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              </>
              )}
            </>
          )}

          {/* Cloud Sync / Save Action */}
          {plan && !readOnly && (
            <button
              onClick={user ? onSaveToCloud : onOpenAuth}
              disabled={cloudSyncStatus === 'syncing'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                activeCloudPlan
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white border-transparent shadow-xs'
              }`}
              title={activeCloudPlan ? 'Sync latest changes to Cloud' : 'Save this plan to Utsav Cloud'}
              aria-label={activeCloudPlan ? 'Sync plan to Cloud' : 'Save plan to Cloud'}
            >
              {cloudSyncStatus === 'syncing' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 animate-bounce" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : activeCloudPlan ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Cloud Synced</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save to Cloud</span>
                </>
              )}
            </button>
          )}

          {/* Active Collaborators Pill */}
          {activeCloudPlan && (
            <button
              onClick={onOpenCollaborators}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
              title="Manage live plan collaborators"
              aria-label={`Manage collaborators, ${activeCloudPlan.collaborators.length} active`}
            >
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden md:inline">{activeCloudPlan.collaborators.length}</span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 p-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={`User menu for ${user.displayName || user.email}`}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[90px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-fade-in"
                  role="menu"
                >
                  <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {user.displayName || 'Celebration Host'}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenCloudPlans();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                    role="menuitem"
                  >
                    <Cloud className="w-3.5 h-3.5 text-rose-600" />
                    My Cloud Celebrations
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800"
                    role="menuitem"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors shadow-xs cursor-pointer"
              aria-label="Sign in to your Utsav account"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-[#F5A623]" />
            ) : (
              <Moon className="w-4 h-4 text-[#3B1F4A]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
