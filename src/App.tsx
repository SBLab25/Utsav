/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  PieChart,
  Clock,
  Briefcase,
  Lightbulb,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Users,
} from 'lucide-react';
import type {
  EventPlan,
  BudgetItem,
  TimelineTask,
  PlanDiff,
  PlanHistoryItem,
  VendorRequirement,
  IdeaItem,
  RiskItem,
  Guest,
  PaymentRecord,
  RunSheetItem,
} from './types/plan.ts';
import { eventPlanSchema } from './schemas/plan.ts';
import {
  formatINR,
  normalizeBudgetPercentages,
  computePlanDiff,
  computeDiffsFromPatch,
  applyChange,
  deriveBudgetItemSpent,
} from './utils/planLogic.ts';
import { Header } from './components/Header.tsx';
import { BriefInput } from './components/BriefInput.tsx';
import { ReplanBox } from './components/ReplanBox.tsx';
import { DiffViewer } from './components/DiffViewer.tsx';
import { BudgetTab } from './components/BudgetTab.tsx';
import { TimelineTab } from './components/TimelineTab.tsx';
import { VendorsTab } from './components/VendorsTab.tsx';
import { IdeasTab } from './components/IdeasTab.tsx';
import { RisksTab } from './components/RisksTab.tsx';
import { GuestsTab } from './components/GuestsTab.tsx';
import { HistoryDrawer } from './components/HistoryDrawer.tsx';
import { SkeletonLoader } from './components/SkeletonLoader.tsx';
import { PrintPlanView } from './components/PrintPlanView.tsx';
import { SharedPlanView } from './components/SharedPlanView.tsx';
import { decodeSharedPlan } from './utils/sharePlan.ts';
import type { PlanChange } from './schemas/changes.ts';
import { CoPlannerPanel } from './components/CoPlannerPanel.tsx';
import { StarterNotice } from './components/StarterNotice.tsx';
import { InvitationCardModal } from './components/InvitationCardModal.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CloudPlansModal } from './components/CloudPlansModal.tsx';
import { CollaboratorsModal } from './components/CollaboratorsModal.tsx';
import {
  savePlanToCloud,
  getCloudPlan,
  subscribeToCloudPlan,
} from './services/cloudPlans.ts';
import type { CloudPlanDoc, CloudSyncStatus } from './types/auth.ts';

const DEFAULT_BRIEF = "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag, retro Bollywood";

const INITIAL_SANGEET_PLAN: EventPlan = {
  title: "Sister's Retro Bollywood Sangeet",
  event_type: "sangeet",
  event_date: "2026-12-14",
  guests: 150,
  total_budget: 600000,
  city: "Vizag",
  theme: "Retro Bollywood 70s-90s Glamour",
  host_names: "The Sharma & Kapur Families",
  event_days: [
    {
      id: "day-1",
      day_number: 1,
      title: "Day 1: Haldi & Mehendi Soirée",
      date: "2026-12-13",
      time_slot: "Morning 10:30 AM – 2:30 PM",
      venue: "Palm Beach Resort Courtyard, Vizag",
      budget_allocated: 150000,
      dress_code: "Vibrant Yellows, Marigold Orange & Floral Saris",
      notes: "Intimate family dholki, floral jewelry stall, and live bangles counter.",
    },
    {
      id: "day-2",
      day_number: 2,
      title: "Day 2: Retro Bollywood Sangeet Night",
      date: "2026-12-14",
      time_slot: "Evening 6:30 PM – 11:30 PM",
      venue: "Sea Pearl Ballroom & Lawn, Vizag",
      budget_allocated: 250000,
      dress_code: "70s-90s Bollywood Glamour, Glitter Saris & Velvet Blazers",
      notes: "Choreographed cousin dance-offs, retro marquee lights, and DJ night.",
    },
    {
      id: "day-3",
      day_number: 3,
      title: "Day 3: Wedding Ceremony & Grand Feast",
      date: "2026-12-15",
      time_slot: "Morning 9:00 AM (Muhurtham) & 7:00 PM (Reception)",
      venue: "Grand Heritage Beachfront Lawn, Vizag",
      budget_allocated: 200000,
      dress_code: "Traditional South & North Indian Royal Attire",
      notes: "Beachside mandap pheras, classical shehnai, and 5-course coastal feast.",
    },
  ],
  budget: [
    { category: "Venue & Retro Stage Decor", pct: 35, locked: false, amount: 210000, day_number: 2 },
    { category: "Coastal & North Indian Catering", pct: 30, locked: false, amount: 180000, day_number: 2 },
    { category: "DJ, Sound Rig & Choreography", pct: 15, locked: false, amount: 90000, day_number: 2 },
    { category: "Photography & Cinematic Video", pct: 12, locked: false, amount: 72000, day_number: 3 },
    { category: "Bridal Attire, Styling & Favors", pct: 8, locked: false, amount: 48000, day_number: 1 },
  ],
  timeline: [
    { t_minus_days: 90, title: "Lock Coastal Lawn / Banquet Hall in Vizag", owner: "Family Head", done: false },
    { t_minus_days: 60, title: "Book Bollywood DJ, Sound Tech & Choreographer", owner: "Brother & Bride", done: false },
    { t_minus_days: 45, title: "Finalize Food Menu Tasting (Seafood & Chaat)", owner: "Food Committee", done: false },
    { t_minus_days: 30, title: "Start Dance Rehearsals for Cousins & Parents", owner: "Choreographer", done: false },
    { t_minus_days: 15, title: "Design Retro Photo-Op Booth & Vinyl Record Props", owner: "Decor Team", done: false },
    { t_minus_days: 7, title: "Final Sound Check & Playlist Sequencing", owner: "DJ Lead", done: false },
    { t_minus_days: 0, title: "Day 1: Haldi Rituals & Dholki Welcome", owner: "Bride's Squad", done: false, day_number: 1, time_slot: "10:30 AM" },
    { t_minus_days: 0, title: "Day 2: Red Carpet Grand Entrance & Flash Mob", owner: "Choreographer", done: false, day_number: 2, time_slot: "7:00 PM" },
    { t_minus_days: 0, title: "Day 3: Beachside Mandap Pheras & Royal Banquet", owner: "Family Elders", done: false, day_number: 3, time_slot: "9:00 AM" },
  ],
  vendors: [
    {
      type: "DJ & Professional Sound Setup",
      est_low: 35000,
      est_high: 60000,
      questions: ["Do you provide wireless lapel and handheld mics for MCs?", "Can you play continuous 80s/90s Bollywood remixes mixed live?"],
      red_flags: ["Plays standard YouTube playlist without transition mixing", "No backup power inverter / stabilizer for amplifiers"],
      outreach_message: "Hi! We are planning a 150-guest Retro Bollywood Sangeet in Vizag on 14 Dec. We need an energetic DJ with full sound, moving lights, and fog machine. Please share your availability and pricing.",
      status: "booked",
      quote: 45000,
      quotes: [
        {
          id: "q-dj-1",
          vendor_name: "DJ Rohit & Retro Beats",
          contact_person: "Rohit Verma",
          phone_or_email: "+91 98480 99887",
          quote_amount: 45000,
          inclusions: ["Line Array Sound Rig", "Moving Beam Lights", "4 Wireless Mics", "Custom 90s Medley Mix"],
          status: "selected",
          rating: 4.9,
          notes: "Confirmed availability for 14th Dec evening; contract signed with 20% advance.",
        },
        {
          id: "q-dj-2",
          vendor_name: "Sonic Wave AV Solutions",
          contact_person: "Karan Johar",
          phone_or_email: "+91 98111 22334",
          quote_amount: 55000,
          inclusions: ["JBL Sound System", "LED Dance Floor", "Haze Generator"],
          status: "received",
          rating: 4.6,
          notes: "Higher quote; requires extra transport fee from Hyderabad.",
        },
      ],
    },
    {
      type: "Vintage Decor & Neon Stage",
      est_low: 150000,
      est_high: 220000,
      questions: ["Can you construct a vintage cassette / vinyl record photo wall?", "Does the package include stage carpeting and dance floor lighting?"],
      red_flags: ["Faded artificial flower carpets", "Hidden charges for generator diesel or extra lighting trusses"],
      outreach_message: "Hello! We are looking for an event decorator for a Retro Bollywood Sangeet on 14 Dec in Vizag (150 guests). Key highlights: vintage record backdrop, marquee bulb letters, dance floor. Please share sample setups.",
      status: "shortlisted",
      quote: 175000,
      quotes: [
        {
          id: "q-dec-1",
          vendor_name: "Filmi Chakkar Sets & Props",
          contact_person: "Ananya Roy",
          phone_or_email: "+91 98220 11223",
          quote_amount: 175000,
          inclusions: ["Vinyl Record Wall", "Neon 'Disco Deewane' Sign", "Stage Carpet", "Ambient Fairy Canopy"],
          status: "shortlisted",
          rating: 4.8,
          notes: "Portfolio matched retro Bollywood moodboard closely; negotiation in progress.",
        },
        {
          id: "q-dec-2",
          vendor_name: "Vizag Floral & Grand Decor",
          contact_person: "Suresh Naidu",
          phone_or_email: "+91 98440 55667",
          quote_amount: 195000,
          inclusions: ["Fiber Mandap", "Imported Flower Strings", "Entrance Marquee"],
          status: "received",
          rating: 4.4,
          notes: "Good quality but slightly more traditional than retro glam theme.",
        },
      ],
    },
    {
      type: "Catering & Live Counters",
      est_low: 140000,
      est_high: 200000,
      questions: ["Do you include live chaat counter and dessert stations?", "Can you accommodate both Andhra coastal specialties and North Indian staples?"],
      red_flags: ["No live supervisor on event floor", "Vague headcount policy for unexpected plus-ones"],
      outreach_message: "Namaste! We require catering for 150 guests on 14 Dec in Vizag. Mix of live street chaat, biryani, and dessert counter. Please provide per-plate quotes.",
      status: "booked",
      quote: 165000,
      quotes: [
        {
          id: "q-cat-1",
          vendor_name: "Annapurna Coastal & Royal Kitchens",
          contact_person: "Chef Srinivas",
          phone_or_email: "+91 98485 33445",
          quote_amount: 165000,
          inclusions: ["Live Bambaiya Chaat", "Andhra Mutton & Veg Pulao", "Kulfi Counter", "Welcome Thandai"],
          status: "selected",
          rating: 5.0,
          notes: "Food tasting was exceptional; includes 10% plate buffer at no extra cost.",
        },
      ],
    },
  ],
  ideas: [
    { category: "theme", title: "Disco Deewane 70s-90s", description: "Bell-bottoms, glitter saris, retro movie posters, and neon cassette installations." },
    { category: "menu", title: "Coastal Fusion & Bollywood Bites", description: "Bambaiya Sev Puri live counter, Chettinad skewers, Andhra royal pulao, and sizzling brownie with rabri." },
    { category: "decor", title: "Filmi Marquee Entrance", description: "Custom entrance styled like a vintage cinema hall with tickets as place cards." },
    { category: "entertainment", title: "Family Face-Off Dance Battle", description: "Ladkewale vs Ladkiwale 90s medley face-off scored with retro cinema clapboards." },
    { category: "invitation", title: "Filmi Premiere Card", description: "🎬 BLOCKBUSTER SANGEET PREMIERE\nStarring: The Bride & Her Squad!\nJoin us on 14th Dec 2026, 7:00 PM onwards at Sea Breeze Lawns, Vizag.\nDress Code: Retro Bollywood Glamour.\nPrepare your dancing shoes!" },
    { category: "rsvp", title: "WhatsApp RSVP Template", description: "💃 *Sangeet Alert!* Can't wait to dance with you at Sister's Retro Sangeet on 14 Dec in Vizag. Please RSVP by Dec 1 with your favorite dance track for the DJ! 🎵" },
  ],
  risks: [
    {
      id: 'weather',
      title: "Sudden coastal rain or humidity affects the outdoor lawn",
      category: 'weather',
      likelihood: 'medium',
      impact: 'high',
      mitigation: "Pre-book waterproof transparent canopy covering the dance floor and ensure indoor banquet backup with hotel.",
      backup_plan: "Move the dance floor and sound rig into the indoor banquet space using the pre-approved layout.",
      related_task_t_minus_days: 7,
    },
    {
      id: 'curfew',
      title: "City police enforce the 10 PM sound curfew",
      category: 'legal',
      likelihood: 'high',
      impact: 'high',
      mitigation: "Plan high-energy choreography face-offs between 7:30-10:00 PM, then shift to indoor acoustic after-party.",
      backup_plan: "Switch to an acoustic playlist and close amplified sound before the permitted cutoff.",
      related_task_t_minus_days: 30,
    },
    {
      id: 'power',
      title: "Production power load trips during the show",
      category: 'vendor',
      likelihood: 'medium',
      impact: 'high',
      mitigation: "Contract a dedicated 62.5 kVA silent diesel generator with automatic changeover switch exclusively for the AV rig.",
      backup_plan: "Run the essential audio and safety lighting circuit while the production team isolates the failed load.",
      related_task_t_minus_days: 7,
    },
    {
      id: 'guest-overflow',
      title: "Unexpected guests create catering bottlenecks",
      category: 'logistics',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: "Hold a 10% buffer of plates and keep two quick-serve counters open during arrival.",
      backup_plan: "Release reserved buffer tables and prioritize the fastest service stations for the first 30 minutes.",
      related_task_t_minus_days: 15,
    },
    {
      id: 'vendor-shortage',
      title: "Peak wedding-season vendor shortage",
      category: 'vendor',
      likelihood: 'medium',
      impact: 'high',
      mitigation: "Confirm the DJ, decorator and caterer early, with one vetted backup vendor per category.",
      backup_plan: "Activate the backup vendor roster at pre-agreed rates if a primary vendor cancels.",
      related_task_t_minus_days: 45,
    },
  ],
  payments: [
    { id: 'pay-1', category: 'DJ, Sound Rig & Choreography', amount: 15000, note: 'DJ Booking Token Advance', date: '2026-11-01' },
    { id: 'pay-2', category: 'Coastal & North Indian Catering', amount: 30000, note: 'Tasting & Menu Reservation', date: '2026-11-02' },
  ],
  runSheet: [
    { id: 'rs-1', time: '09:00', title: 'Vendor load-in & stage setup inspection', owner: 'Decor Lead' },
    { id: 'rs-2', time: '11:30', title: 'AV & sound check with DJ Rohit', owner: 'DJ Lead' },
    { id: 'rs-3', time: '14:00', title: 'Catering live kitchen prep & tasting signoff', owner: 'Food Committee' },
    { id: 'rs-4', time: '16:00', title: 'Green room styling & bride/groom dress trial', owner: 'Styling Lead' },
    { id: 'rs-5', time: '18:00', title: 'Guest welcome desk & welcome drinks counter opens', owner: 'Hospitality Lead' },
    { id: 'rs-6', time: '19:00', title: 'Red carpet grand entry & vintage photo-op', owner: 'Host Family' },
    { id: 'rs-7', time: '19:45', title: 'Retro Bollywood family dance performances', owner: 'Choreographer' },
    { id: 'rs-8', time: '21:00', title: 'Dinner buffet & live counters open', owner: 'Catering Lead' },
    { id: 'rs-9', time: '22:00', title: 'Open dance floor & DJ retro party', owner: 'DJ Rohit' },
    { id: 'rs-10', time: '23:30', title: 'Event wrap-up & vendor settlement check', owner: 'Lead Planner' },
  ],
  guest_list: [],
  clarifying_question: null,
};

type TabType = 'budget' | 'timeline' | 'vendors' | 'ideas' | 'risks' | 'guests';

function AppContent() {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showCloudPlansModal, setShowCloudPlansModal] = useState<boolean>(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState<boolean>(false);
  const [activeCloudPlan, setActiveCloudPlan] = useState<CloudPlanDoc | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [collabNotification, setCollabNotification] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSharedHash = typeof window !== 'undefined' && window.location.hash.startsWith('#plan=');
  const [sharedPlan] = useState<EventPlan | null>(() => {
    if (!hasSharedHash) return null;
    return decodeSharedPlan(window.location.hash.slice('#plan='.length));
  });
  const [isSharedView, setIsSharedView] = useState<boolean>(() => hasSharedHash && Boolean(decodeSharedPlan(window.location.hash.slice('#plan='.length))));
  const [plan, setPlan] = useState<EventPlan>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('utsav_current_plan') || localStorage.getItem('utsav_saved_plan');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const validation = eventPlanSchema.safeParse(parsed);
          if (validation.success) {
            return validation.data;
          } else {
            localStorage.removeItem('utsav_current_plan');
            localStorage.removeItem('utsav_saved_plan');
          }
        } catch (_e) {
          localStorage.removeItem('utsav_current_plan');
          localStorage.removeItem('utsav_saved_plan');
        }
      }
    }
    return INITIAL_SANGEET_PLAN;
  });
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [loadedSections, setLoadedSections] = useState<{
    core: boolean;
    timeline: boolean;
    vendors: boolean;
    ideas: boolean;
    risks: boolean;
  }>({
    core: true,
    timeline: true,
    vendors: true,
    ideas: true,
    risks: true,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isReplanning, setIsReplanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDiffs, setActiveDiffs] = useState<PlanDiff[]>([]);
  const [activePatchReason, setActivePatchReason] = useState<string | null>(null);
  const [history, setHistory] = useState<PlanHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('utsav_plan_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validHistory: PlanHistoryItem[] = parsed.filter((item): item is PlanHistoryItem => {
              return (
                Boolean(item) &&
                typeof item === 'object' &&
                typeof item.id === 'string' &&
                typeof item.label === 'string' &&
                typeof item.timestamp === 'number' &&
                eventPlanSchema.safeParse(item.plan).success
              );
            });
            if (validHistory.length > 0) {
              return validHistory;
            }
          }
          localStorage.removeItem('utsav_plan_history');
        } catch (_e) {
          localStorage.removeItem('utsav_plan_history');
        }
      }
    }
    return [
      {
        id: 'hist-initial',
        plan: INITIAL_SANGEET_PLAN,
        timestamp: Date.now(),
        label: 'Initial Sister Sangeet Plan',
      },
    ];
  });
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showInvitationModal, setShowInvitationModal] = useState<boolean>(false);
  const [clarifyingAnswer, setClarifyingAnswer] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');
  const [planSource, setPlanSource] = useState<'gemini' | 'groq' | 'starter' | null>(null);
  const tabList: TabType[] = ['budget', 'timeline', 'vendors', 'ideas', 'risks', 'guests'];
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleTabKeyDown = (
    e: React.KeyboardEvent,
    currentTab: TabType
  ) => {
    const currentIndex = tabList.indexOf(currentTab);
    let targetTab: TabType | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetTab = tabList[(currentIndex + 1) % tabList.length];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetTab = tabList[(currentIndex - 1 + tabList.length) % tabList.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetTab = tabList[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      targetTab = tabList[tabList.length - 1];
    }

    if (targetTab) {
      setActiveTab(targetTab);
      tabRefs.current[targetTab]?.focus();
    }
  };
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('utsav_dark_mode') === 'true';
    }
    return false;
  });
  const [language, setLanguage] = useState<'en' | 'hi' | 'te' | 'bn'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('utsav_language') : null;
    return saved === 'hi' || saved === 'te' || saved === 'bn' ? saved : 'en';
  });
  const [lastAction, setLastAction] = useState<
    { type: 'plan'; brief: string } | { type: 'replan'; instruction: string } | null
  >(null);

  // Track initial load
  const hasTriggeredInitialConfetti = useRef<boolean>(false);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('utsav_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('utsav_dark_mode', 'false');
    }
  }, [darkMode]);

  // Load cloud plan from URL query param (?planId=...) on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const planIdParam = urlParams.get('planId');
    if (planIdParam) {
      getCloudPlan(planIdParam)
        .then((cloudDoc) => {
          if (cloudDoc) {
            setPlan(cloudDoc.plan);
            setActiveCloudPlan(cloudDoc);
            setCloudSyncStatus('synced');
          }
        })
        .catch((e) => console.warn('Could not load planId from URL:', e));
    }
  }, []);

  // Subscribe to real-time multi-user changes when an active cloud plan is loaded
  useEffect(() => {
    if (!activeCloudPlan?.id) return;

    const unsubscribe = subscribeToCloudPlan(
      activeCloudPlan.id,
      (updatedDoc) => {
        if (updatedDoc.lastModifiedBy && user && updatedDoc.lastModifiedBy !== user.uid) {
          setPlan(updatedDoc.plan);
          setActiveCloudPlan(updatedDoc);
          setCollabNotification(
            `Live sync: ${updatedDoc.lastModifiedByName || 'Collaborator'} updated this celebration!`
          );
          setTimeout(() => setCollabNotification(null), 3500);
        } else if (updatedDoc.collaborators.length !== activeCloudPlan.collaborators.length) {
          setActiveCloudPlan(updatedDoc);
        }
      },
      (err) => console.warn('Cloud plan subscription warning:', err)
    );

    return () => unsubscribe();
  }, [activeCloudPlan?.id, user?.uid]);

  const handleSaveToCloud = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCloudSyncStatus('syncing');
    try {
      const savedDoc = await savePlanToCloud(plan, user, activeCloudPlan?.id);
      setActiveCloudPlan(savedDoc);
      setCloudSyncStatus('synced');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        const url = new URL(window.location.href);
        url.searchParams.set('planId', savedDoc.id);
        window.history.pushState({}, '', url.toString());
      }
    } catch (err) {
      console.error('Failed to save plan to cloud:', err);
      setCloudSyncStatus('error');
    }
  };

  const handleSelectCloudPlan = (planDoc: CloudPlanDoc) => {
    setPlan(planDoc.plan);
    setActiveCloudPlan(planDoc);
    setCloudSyncStatus('synced');
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('planId', planDoc.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSaveCurrentAsNew = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCloudSyncStatus('syncing');
    try {
      const savedDoc = await savePlanToCloud(plan, user);
      setActiveCloudPlan(savedDoc);
      setCloudSyncStatus('synced');
      if (typeof window !== 'undefined' && window.history?.pushState) {
        const url = new URL(window.location.href);
        url.searchParams.set('planId', savedDoc.id);
        window.history.pushState({}, '', url.toString());
      }
    } catch (err) {
      console.error('Failed to save new cloud plan:', err);
      setCloudSyncStatus('error');
    }
  };

  useEffect(() => {
    localStorage.setItem('utsav_language', language);
    document.documentElement.lang = language;
    const href = language === 'hi'
      ? 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap'
      : language === 'te'
        ? 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap'
        : language === 'bn'
          ? 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap'
          : null;
    const existing = document.getElementById('utsav-language-font');
    if (href) {
      const link = (existing as HTMLLinkElement | null) || document.createElement('link');
      link.id = 'utsav-language-font';
      link.rel = 'stylesheet';
      link.href = href;
      if (!existing) document.head.appendChild(link);
    } else {
      existing?.remove();
    }
  }, [language]);

  // Initial confetti burst on first session
  useEffect(() => {
    if (!hasTriggeredInitialConfetti.current) {
      triggerConfetti();
      hasTriggeredInitialConfetti.current = true;
    }
  }, []);

  // Save to localStorage whenever plan changes
  const savePlanWithHistory = (newPlan: EventPlan, label: string, diffs?: PlanDiff[]) => {
    const validation = eventPlanSchema.safeParse(newPlan);
    if (!validation.success) {
      setErrorMessage('The plan change was rejected because it is invalid.');
      setAnnouncement('Plan change rejected: invalid plan data.');
      return false;
    }
    const normalizedPlan = {
      ...validation.data,
      budget: normalizeBudgetPercentages(validation.data.budget, validation.data.total_budget),
    };

    setPlan(normalizedPlan);
    localStorage.setItem('utsav_current_plan', JSON.stringify(normalizedPlan));

    const newHistoryItem: PlanHistoryItem = {
      id: `hist-${Date.now()}`,
      plan: normalizedPlan,
      timestamp: Date.now(),
      label,
      diffsFromPrevious: diffs,
    };

    const updatedHistory = [newHistoryItem, ...history.slice(0, 19)]; // Keep up to 20 snapshots
    setHistory(updatedHistory);
    setHistoryIndex(0);
    localStorage.setItem('utsav_plan_history', JSON.stringify(updatedHistory));
    return true;
  };

  const handleMakeOwnCopy = () => {
    if (!sharedPlan) return;
    window.history.replaceState(null, '', window.location.pathname);
    setIsSharedView(false);
    setPlan(sharedPlan);
    localStorage.setItem('utsav_current_plan', JSON.stringify(sharedPlan));
    const snapshot: PlanHistoryItem = {
      id: `hist-${Date.now()}`,
      plan: sharedPlan,
      timestamp: Date.now(),
      label: 'Copied Shared Plan',
    };
    setHistory([snapshot]);
    localStorage.setItem('utsav_plan_history', JSON.stringify([snapshot]));
    setAnnouncement('Shared plan copied. You can now edit your own plan.');
  };

  // Trigger celebration confetti
  const triggerConfetti = () => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#F5A623', '#3B1F4A', '#E05D5D', '#FFF8EE', '#2E7D32'],
    });
  };

  // Intake: Progressive plan generation via SSE (/api/plan/stream), fallback to /api/plan
  const handleGeneratePlan = async (brief: string, isInitial: boolean = false) => {
    setIsLoading(true);
    setIsStreaming(true);
    setErrorMessage(null);
    setAnnouncement('Generating your celebration plan...');
    setLastAction({ type: 'plan', brief });
    setPlanSource(null);

    // Abort previous in-flight generation if any
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadedSections({
      core: false,
      timeline: false,
      vendors: false,
      ideas: false,
      risks: false,
    });

    let streamedAnySection = false;
    let accumulatedPlan: Partial<EventPlan> = {};

    try {
      const response = await fetch('/api/plan/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, language }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const message = JSON.parse(jsonStr);
                if (message.section === 'core') {
                  streamedAnySection = true;
                  if (message.source === 'starter' || message.source === 'gemini' || message.source === 'groq') {
                    setPlanSource(message.source);
                  }
                  const coreData = message.data;
                  const normalizedBudget = normalizeBudgetPercentages(
                    coreData.budget || [],
                    coreData.total_budget
                  );

                  accumulatedPlan = {
                    ...accumulatedPlan,
                    title: coreData.title,
                    event_type: coreData.event_type,
                    event_date: coreData.event_date,
                    guests: coreData.guests,
                    total_budget: coreData.total_budget,
                    city: coreData.city,
                    theme: coreData.theme,
                    budget: normalizedBudget,
                    clarifying_question: coreData.clarifying_question || null,
                    timeline: accumulatedPlan.timeline || [],
                    vendors: accumulatedPlan.vendors || [],
                    ideas: accumulatedPlan.ideas || [],
                    risks: accumulatedPlan.risks || [],
                    guest_list: accumulatedPlan.guest_list || [],
                  };

                  setPlan((prev) => {
                    const validation = eventPlanSchema.safeParse({ ...prev, ...accumulatedPlan });
                    return validation.success ? validation.data : prev;
                  });

                  setLoadedSections((prev) => ({ ...prev, core: true }));
                  setIsLoading(false); // Reveal plan header and budget immediately!
                  setAnnouncement(`Core budget details ready: ${coreData.title}`);
                } else if (message.section === 'timeline') {
                  streamedAnySection = true;
                  const rawData = message.data;
                  const timelineData = Array.isArray(rawData) ? rawData : (rawData?.timeline || []);
                  const runSheetData = Array.isArray(rawData?.runSheet) ? rawData.runSheet : undefined;
                  accumulatedPlan.timeline = timelineData;
                  if (runSheetData) accumulatedPlan.runSheet = runSheetData;
                  setPlan((prev) => {
                    const updatePayload: any = { ...prev, timeline: timelineData };
                    if (runSheetData) updatePayload.runSheet = runSheetData;
                    const validation = eventPlanSchema.safeParse(updatePayload);
                    return validation.success ? validation.data : prev;
                  });
                  setLoadedSections((prev) => ({ ...prev, timeline: true }));
                  setAnnouncement(`Timeline milestones ready: ${timelineData.length} tasks scheduled.`);
                } else if (message.section === 'vendors') {
                  streamedAnySection = true;
                  const vendorsData = message.data || [];
                  accumulatedPlan.vendors = vendorsData;
                  setPlan((prev) => {
                    const validation = eventPlanSchema.safeParse({ ...prev, vendors: vendorsData });
                    return validation.success ? validation.data : prev;
                  });
                  setLoadedSections((prev) => ({ ...prev, vendors: true }));
                  setAnnouncement(`Vendor hiring guide ready: ${vendorsData.length} categories.`);
                } else if (message.section === 'ideas') {
                  streamedAnySection = true;
                  const ideasData = message.data || [];
                  accumulatedPlan.ideas = ideasData;
                  setPlan((prev) => {
                    const validation = eventPlanSchema.safeParse({ ...prev, ideas: ideasData });
                    return validation.success ? validation.data : prev;
                  });
                  setLoadedSections((prev) => ({ ...prev, ideas: true }));
                  setAnnouncement(`Celebration inspirations ready: ${ideasData.length} concepts.`);
                } else if (message.section === 'risks') {
                  streamedAnySection = true;
                  const risksData = message.data || [];
                  accumulatedPlan.risks = risksData;
                  setPlan((prev) => {
                    const validation = eventPlanSchema.safeParse({ ...prev, risks: risksData });
                    return validation.success ? validation.data : prev;
                  });
                  setLoadedSections((prev) => ({ ...prev, risks: true }));
                  setAnnouncement(`Risk assessment ready: ${risksData.length} risks analyzed.`);
                } else if (message.section === 'done') {
                  setIsStreaming(false);
                  setIsLoading(false);
                  setActiveDiffs([]);
                  setActivePatchReason(null);
                  if (accumulatedPlan.title) {
                    savePlanWithHistory(
                      accumulatedPlan as EventPlan,
                      isInitial ? 'Initial Plan' : `Brief: ${brief.slice(0, 30)}...`
                    );
                  }
                  setAnnouncement('Living celebration plan generation complete!');
                  if (!hasTriggeredInitialConfetti.current) {
                    triggerConfetti();
                    hasTriggeredInitialConfetti.current = true;
                  }
                } else if (message.section === 'error') {
                  throw new Error(message.error || 'Server error during plan streaming');
                }
              } catch (parseErr) {
                console.warn('Failed to parse SSE line:', jsonStr, parseErr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAnnouncement('Plan generation cancelled.');
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      console.warn('Streaming plan generation failed, attempting non-streaming fallback:', err);

      // If streaming didn't manage to load the core, use non-streaming /api/plan as fallback
      if (!streamedAnySection) {
        try {
          const fallbackResp = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brief, language }),
          });
          if (!fallbackResp.ok) {
            const errData = await fallbackResp.json().catch(() => ({}));
            throw new Error(errData.error || `Server error ${fallbackResp.status}`);
          }
          const data = await fallbackResp.json();
          const validation = eventPlanSchema.safeParse(data.plan);
          if (validation.success) {
            setPlanSource(data.source === 'gemini' || data.source === 'groq' || data.source === 'starter' ? data.source : 'starter');
            const normalized = {
              ...validation.data,
              budget: normalizeBudgetPercentages(validation.data.budget, validation.data.total_budget),
            };
            savePlanWithHistory(normalized, isInitial ? 'Initial Plan' : `Brief: ${brief.slice(0, 30)}...`);
            setActiveDiffs([]);
            setActivePatchReason(null);
            setAnnouncement(`Plan ready: ${normalized.title}`);
            setLoadedSections({
              core: true,
              timeline: true,
              vendors: true,
              ideas: true,
              risks: true,
            });
            if (!hasTriggeredInitialConfetti.current) {
              triggerConfetti();
              hasTriggeredInitialConfetti.current = true;
            }
            return;
          }
        } catch (fallbackErr: any) {
          console.error('Non-streaming fallback failed:', fallbackErr);
        }
      }

      const msg = err.message || 'Unable to generate event plan. Please check your connection or retry.';
      setErrorMessage(msg);
      setAnnouncement(msg);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
    setAnnouncement('Plan generation cancelled.');
  };

  // Re-plan: Send current plan + instructions
  const handleReplan = async (changeInstruction: string) => {
    if (!plan) return;
    setIsReplanning(true);
    setErrorMessage(null);
    setAnnouncement('Generating your plan');
    setLastAction({ type: 'replan', instruction: changeInstruction });

    try {
      const response = await fetch('/api/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: plan,
          changeInstruction,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Re-plan failed with status ${response.status}`);
      }

      const data = await response.json();

      const planValidation = eventPlanSchema.safeParse(data.plan);
      if (!planValidation.success) {
        console.error('Invalid replan schema received:', planValidation.error.issues);
        throw new Error('Received an invalid recalculated plan structure from the server.');
      }

      const updatedRaw = planValidation.data;

      const normalizedUpdated: EventPlan = {
        ...updatedRaw,
        budget: normalizeBudgetPercentages(updatedRaw.budget, updatedRaw.total_budget),
        guest_list: updatedRaw.guest_list ?? plan.guest_list,
      };

      // Compute diffs: build directly from patch for exact chips if available, or fallback to full plan diff
      const patchDiffs = data.patch ? computeDiffsFromPatch(plan, data.patch) : [];
      const diffs = patchDiffs.length > 0 ? patchDiffs : computePlanDiff(plan, normalizedUpdated);
      setActiveDiffs(diffs);
      setActivePatchReason(data.patch?.reason || null);

      savePlanWithHistory(normalizedUpdated, `Re-plan: ${changeInstruction}`, diffs);
      const diffSummaries = diffs.map((d) => d.summary).join(', ');
      setAnnouncement(`Plan updated: ${diffSummaries || normalizedUpdated.title}`);
      triggerConfetti();
    } catch (err: any) {
      console.error('Re-plan error:', err);
      const msg = err.message || 'Could not recalculate plan. Please try again.';
      setErrorMessage(msg);
      setAnnouncement(msg);
    } finally {
      setIsReplanning(false);
    }
  };

  // Answer clarifying question
  const handleAnswerClarifyingQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyingAnswer.trim() || !plan) return;
    const answer = clarifyingAnswer.trim();
    setClarifyingAnswer('');
    handleReplan(`Regarding: "${plan.clarifying_question}", the answer is: ${answer}`);
  };

  // Budget update from BudgetTab
  const handleUpdateBudget = (newBudget: BudgetItem[], newTotal: number) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      total_budget: newTotal,
      budget: newBudget,
    };
    savePlanWithHistory(updatedPlan, `Budget Adjusted: ${formatINR(newTotal, true)}`);
  };

  // Log Payment from BudgetTab or VendorsTab
  const handleLogPayment = (payment: Omit<PaymentRecord, 'id'>) => {
    if (!plan) return;
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...payment,
    };
    const updatedPayments = [...(plan.payments || []), newPayment];
    const updatedBudget = deriveBudgetItemSpent(plan.budget, updatedPayments);
    const updatedPlan: EventPlan = {
      ...plan,
      payments: updatedPayments,
      budget: updatedBudget,
    };
    savePlanWithHistory(updatedPlan, `Payment Logged: ${formatINR(payment.amount)} (${payment.category})`);
  };

  // Delete payment
  const handleDeletePayment = (paymentId: string) => {
    if (!plan) return;
    const updatedPayments = (plan.payments || []).filter((p) => p.id !== paymentId);
    const updatedBudget = deriveBudgetItemSpent(plan.budget, updatedPayments);
    const updatedPlan: EventPlan = {
      ...plan,
      payments: updatedPayments,
      budget: updatedBudget,
    };
    savePlanWithHistory(updatedPlan, 'Payment Record Deleted');
  };

  // Timeline update from TimelineTab
  const handleUpdateTimeline = (newTimeline: TimelineTask[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      timeline: newTimeline,
    };
    savePlanWithHistory(updatedPlan, 'Timeline Tasks Updated');
  };

  // Day-of run sheet update from TimelineTab
  const handleUpdateRunSheet = (newRunSheet: RunSheetItem[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      runSheet: newRunSheet,
    };
    savePlanWithHistory(updatedPlan, 'Day-of Run Sheet Updated');
  };

  // Vendor updates from VendorsTab
  const handleUpdateVendors = (newVendors: VendorRequirement[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      vendors: newVendors,
    };
    savePlanWithHistory(updatedPlan, 'Vendor Directory & Status Updated');
  };

  // Ideas updates from IdeasTab
  const handleUpdateIdeas = (newIdeas: IdeaItem[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      ideas: newIdeas,
    };
    savePlanWithHistory(updatedPlan, 'Celebration Inspirations Updated');
  };

  // Risks update from RisksTab
  const handleUpdateRisks = (newRisks: RiskItem[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      risks: newRisks,
    };
    savePlanWithHistory(updatedPlan, 'Risk & Safeguards Kit Updated');
  };

  const handleUpdateGuests = (newGuests: Guest[]) => {
    if (!plan) return;
    const updatedPlan: EventPlan = {
      ...plan,
      guest_list: newGuests,
    };
    savePlanWithHistory(updatedPlan, 'Guest List Updated');
  };

  const handleApplyCoPlannerChange = (change: PlanChange) => {
    if (!plan) return;
    const updatedPlan = applyChange(plan, change);
    if (JSON.stringify(updatedPlan) === JSON.stringify(plan)) {
      setAnnouncement('That proposal is no longer valid for the current plan.');
      return;
    }
    const diffs = computePlanDiff(plan, updatedPlan);
    const applied = savePlanWithHistory(updatedPlan, `Co-planner: ${change.op}`, diffs);
    if (applied) {
      setActiveDiffs(diffs);
      setActivePatchReason('Applied an approved Co-planner proposal.');
      setAnnouncement(`Applied Co-planner change: ${diffs.map((diff) => diff.summary).join(', ')}`);
    }
  };

  const handleAddRiskMitigationToTimeline = (risk: RiskItem) => {
    if (!plan) return;
    const tMinusDays = risk.related_task_t_minus_days ?? 7;
    const title = `Mitigation: ${risk.title}`;
    if (plan.timeline.some((task) => task.title.toLowerCase() === title.toLowerCase())) {
      setAnnouncement(`Mitigation already scheduled: ${risk.title}`);
      return;
    }
    const updatedPlan: EventPlan = {
      ...plan,
      timeline: [
        ...plan.timeline,
        {
          id: `risk-task-${risk.id || Date.now()}`,
          t_minus_days: tMinusDays,
          title,
          owner: 'Risk Radar',
          done: false,
        },
      ].sort((a, b) => b.t_minus_days - a.t_minus_days),
    };
    savePlanWithHistory(updatedPlan, `Risk Mitigation Added: ${risk.title}`);
    setAnnouncement(`Added ${risk.title} mitigation to the timeline.`);
  };

  // Import plan from JSON file
  const handleImportPlan = (importedPlan: EventPlan) => {
    savePlanWithHistory(importedPlan, `Imported: ${importedPlan.title || 'Saved Plan'}`);
    setActiveDiffs([]);
    setActivePatchReason(null);
    triggerConfetti();
  };

  // Restore history snapshot
  const handleRestoreHistory = (index: number) => {
    const item = history[index];
    if (item) {
      const validation = eventPlanSchema.safeParse(item.plan);
      if (validation.success) {
        setPlan(validation.data);
        setHistoryIndex(index);
        localStorage.setItem('utsav_current_plan', JSON.stringify(validation.data));
        setActiveDiffs(item.diffsFromPrevious || []);
      }
    }
  };

  // Clear history
  const handleClearHistory = () => {
    if (plan) {
      const initialItem: PlanHistoryItem = {
        id: `hist-${Date.now()}`,
        plan,
        timestamp: Date.now(),
        label: 'Current Plan',
      };
      setHistory([initialItem]);
      setHistoryIndex(0);
      localStorage.setItem('utsav_plan_history', JSON.stringify([initialItem]));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EE] text-[#3B1F4A] dark:bg-[#180D1F] dark:text-[#FFF8EE] transition-colors">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#3B1F4A] focus:text-white dark:focus:bg-[#F5A623] dark:focus:text-stone-950 focus:font-bold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B45309]"
      >
        Skip to main content
      </a>

      {/* Visually hidden live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Top Header */}
      <Header
        plan={isSharedView && sharedPlan ? sharedPlan : plan}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        historyCount={history.length}
        onImportPlan={handleImportPlan}
        readOnly={isSharedView}
        language={language}
        onLanguageChange={setLanguage}
        onOpenInvitationDesigner={() => setShowInvitationModal(true)}
        user={user}
        cloudSyncStatus={cloudSyncStatus}
        activeCloudPlan={activeCloudPlan}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={signOut}
        onOpenCloudPlans={() => setShowCloudPlansModal(true)}
        onOpenCollaborators={() => setShowCollaboratorsModal(true)}
        onSaveToCloud={handleSaveToCloud}
      />

      {isSharedView && sharedPlan ? (
        <SharedPlanView plan={sharedPlan} onMakeCopy={handleMakeOwnCopy} />
      ) : (
      <>

      {/* Main Workspace Body */}
      <main id="main" tabIndex={-1} className="flex-1 max-w-[1800px] 2xl:max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 focus:outline-none">
        {hasSharedHash && !sharedPlan && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300" role="alert">
            This shared plan link is invalid or corrupted. You can continue with your local plan.
          </div>
        )}

        {planSource === 'starter' && (
          <StarterNotice
            onRedraft={() => {
              const brief = lastAction?.type === 'plan' ? lastAction.brief : DEFAULT_BRIEF;
              void handleGeneratePlan(brief);
            }}
            isLoading={isLoading || isStreaming}
          />
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="text-sm font-semibold">Action Encountered an Issue</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => handleGeneratePlan(DEFAULT_BRIEF)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shrink-0"
            >
              Retry Default
            </button>
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          {/* Left Column: Intake Brief & Re-plan Console */}
          <div className="lg:col-span-3 min-w-0 space-y-6 no-print">
            <BriefInput
              initialBrief={DEFAULT_BRIEF}
              onGeneratePlan={handleGeneratePlan}
              isLoading={isLoading || isStreaming}
              onCancel={handleCancelGeneration}
              language={language}
              onLanguageChange={setLanguage}
            />

            {plan && (
              <ReplanBox
                onReplan={handleReplan}
                isLoading={isReplanning}
              />
            )}

            {/* Quick cultural note badge */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#23152C]/70 border border-stone-200/70 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                <Sparkles className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
                <span>Culture-Aware Living Engine</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Utsav balances multi-day rituals (Haldi, Mehendi, Sangeet), community RWA permits, volunteer rosters, and regional caterer nuances automatically.
              </p>
            </div>
          </div>

          {/* Right Column: Plan Board */}
          <div className="lg:col-span-6 min-w-0 space-y-6">
            {planSource === 'gemini' && (
              <div role="status" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Planned by Gemini
              </div>
            )}
            {isLoading ? (
              <SkeletonLoader />
            ) : !plan ? (
              <div className="bg-white dark:bg-[#23152C] rounded-3xl p-12 text-center border border-stone-200 dark:border-stone-800 shadow-xs">
                <Sparkles className="w-10 h-10 text-[#B45309] dark:text-[#F5A623] mx-auto mb-3" />
                <h3 className="font-serif text-xl font-bold">Start Your Celebration Plan</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  Type your brief on the left or select an inspiration starter to construct your living plan.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Diff Chips Banner */}
                {activeDiffs.length > 0 && (
                  <DiffViewer
                    diffs={activeDiffs}
                    reason={activePatchReason}
                    onDismiss={() => {
                      setActiveDiffs([]);
                      setActivePatchReason(null);
                    }}
                  />
                )}

                {/* Plan Header Card */}
                <div className="bg-white/95 dark:bg-[#23152C]/95 backdrop-blur-sm rounded-3xl p-6 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-stone-400 dark:text-stone-500">
                        <span>{plan.event_type}</span>
                        <span>·</span>
                        <span>{plan.city}</span>
                      </div>
                      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3B1F4A] dark:text-[#FFF8EE] tracking-tight mt-1">
                        {plan.title}
                      </h1>
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 italic">
                        Theme: "{plan.theme}"
                      </p>
                    </div>

                    {/* High-level metrics */}
                    <div className="flex sm:flex-col items-baseline sm:items-end gap-3 sm:gap-0 bg-stone-50 dark:bg-stone-900/60 p-3 sm:p-2.5 rounded-2xl border border-stone-100 dark:border-stone-800 shrink-0">
                      <span className="text-[11px] uppercase tracking-wider font-medium text-stone-400">
                        Total Budget
                      </span>
                      <span className="text-xl sm:text-2xl font-serif font-bold text-[#B45309] dark:text-[#F5A623] tabular-nums">
                        {formatINR(plan.total_budget)}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {plan.guests} guests
                      </span>
                    </div>
                  </div>

                  {/* Clarifying Question Banner (if any) */}
                  {plan.clarifying_question && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-[#B45309]/30 dark:border-[#F5A623]/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#B45309] dark:text-[#F5A623]">
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>Planner Note: {plan.clarifying_question}</span>
                      </div>
                      <form onSubmit={handleAnswerClarifyingQuestion} className="flex gap-2">
                        <input
                          type="text"
                          value={clarifyingAnswer}
                          onChange={(e) => setClarifyingAnswer(e.target.value)}
                          placeholder="Your answer (e.g. Vegetarian only, or Nov 20th)"
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B45309]"
                        />
                        <button
                          type="submit"
                          disabled={!clarifyingAnswer.trim() || isReplanning}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          Update Plan
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Navigation Tabs with WAI-ARIA pattern */}
                  <div
                    className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-print"
                    role="tablist"
                    aria-label="Event plan sections"
                  >
                    <button
                      id="tab-budget"
                      ref={(el) => { tabRefs.current['budget'] = el; }}
                      onClick={() => setActiveTab('budget')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'budget')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'budget'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-budget"
                      aria-selected={activeTab === 'budget'}
                      tabIndex={activeTab === 'budget' ? 0 : -1}
                    >
                      <PieChart className="w-4 h-4" />
                      <span>Budget Breakdown</span>
                    </button>

                    <button
                      id="tab-timeline"
                      ref={(el) => { tabRefs.current['timeline'] = el; }}
                      onClick={() => setActiveTab('timeline')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'timeline')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'timeline'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-timeline"
                      aria-selected={activeTab === 'timeline'}
                      tabIndex={activeTab === 'timeline' ? 0 : -1}
                    >
                      <Clock className="w-4 h-4" />
                      <span>
                        Timeline Milestones ({plan.timeline ? plan.timeline.length : 0})
                        {isStreaming && !loadedSections.timeline && ' ⏳'}
                      </span>
                    </button>

                    <button
                      id="tab-vendors"
                      ref={(el) => { tabRefs.current['vendors'] = el; }}
                      onClick={() => setActiveTab('vendors')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'vendors')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'vendors'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-vendors"
                      aria-selected={activeTab === 'vendors'}
                      tabIndex={activeTab === 'vendors' ? 0 : -1}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>
                        Vendors Guide ({plan.vendors ? plan.vendors.length : 0})
                        {isStreaming && !loadedSections.vendors && ' ⏳'}
                      </span>
                    </button>

                    <button
                      id="tab-ideas"
                      ref={(el) => { tabRefs.current['ideas'] = el; }}
                      onClick={() => setActiveTab('ideas')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'ideas')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'ideas'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-ideas"
                      aria-selected={activeTab === 'ideas'}
                      tabIndex={activeTab === 'ideas' ? 0 : -1}
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>
                        Ideas & RSVP ({plan.ideas ? plan.ideas.length : 0})
                        {isStreaming && !loadedSections.ideas && ' ⏳'}
                      </span>
                    </button>

                    <button
                      id="tab-risks"
                      ref={(el) => { tabRefs.current['risks'] = el; }}
                      onClick={() => setActiveTab('risks')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'risks')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'risks'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-risks"
                      aria-selected={activeTab === 'risks'}
                      tabIndex={activeTab === 'risks' ? 0 : -1}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>
                        Risk Radar ({plan.risks ? plan.risks.length : 0})
                        {isStreaming && !loadedSections.risks && ' ⏳'}
                      </span>
                    </button>

                    <button
                      id="tab-guests"
                      ref={(el) => { tabRefs.current['guests'] = el; }}
                      onClick={() => setActiveTab('guests')}
                      onKeyDown={(e) => handleTabKeyDown(e, 'guests')}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === 'guests'
                          ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                      role="tab"
                      aria-controls="panel-guests"
                      aria-selected={activeTab === 'guests'}
                      tabIndex={activeTab === 'guests' ? 0 : -1}
                    >
                      <Users className="w-4 h-4" />
                      <span>Guests ({plan.guest_list?.length || 0})</span>
                    </button>

                  </div>
                </div>

                {/* Tab Panels */}
                {activeTab === 'budget' && (
                  <div
                    role="tabpanel"
                    id="panel-budget"
                    aria-labelledby="tab-budget"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    <BudgetTab
                      budget={plan.budget}
                      totalBudget={plan.total_budget}
                      guests={plan.guests}
                      onUpdateBudget={handleUpdateBudget}
                      eventDays={plan.event_days}
                      payments={plan.payments || []}
                      onLogPayment={handleLogPayment}
                      onDeletePayment={handleDeletePayment}
                    />
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div
                    role="tabpanel"
                    id="panel-timeline"
                    aria-labelledby="tab-timeline"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    {isStreaming && !loadedSections.timeline ? (
                      <div className="p-8 text-center bg-white/70 dark:bg-[#23152C]/70 rounded-3xl border border-stone-200 dark:border-stone-800 animate-pulse">
                        <Clock className="w-8 h-8 text-[#B45309] dark:text-[#F5A623] mx-auto mb-2 animate-spin" />
                        <p className="text-sm font-semibold">Sequencing timeline milestones...</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Arranging countdown checklist backward from {plan.event_date}
                        </p>
                      </div>
                    ) : (
                      <TimelineTab
                        timeline={plan.timeline || []}
                        eventDate={plan.event_date}
                        plan={plan}
                        onUpdateTimeline={handleUpdateTimeline}
                        runSheet={plan.runSheet || []}
                        onUpdateRunSheet={handleUpdateRunSheet}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'vendors' && (
                  <div
                    role="tabpanel"
                    id="panel-vendors"
                    aria-labelledby="tab-vendors"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    {isStreaming && !loadedSections.vendors ? (
                      <div className="p-8 text-center bg-white/70 dark:bg-[#23152C]/70 rounded-3xl border border-stone-200 dark:border-stone-800 animate-pulse">
                        <Briefcase className="w-8 h-8 text-[#B45309] dark:text-[#F5A623] mx-auto mb-2 animate-bounce" />
                        <p className="text-sm font-semibold">Compiling vendor vetting guides...</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Tailoring local price benchmarks for {plan.city}
                        </p>
                      </div>
                    ) : (
                      <VendorsTab
                        vendors={plan.vendors || []}
                        city={plan.city}
                        onUpdateVendors={handleUpdateVendors}
                        language={language}
                        onLogPayment={handleLogPayment}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'ideas' && (
                  <div
                    role="tabpanel"
                    id="panel-ideas"
                    aria-labelledby="tab-ideas"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    {isStreaming && !loadedSections.ideas ? (
                      <div className="p-8 text-center bg-white/70 dark:bg-[#23152C]/70 rounded-3xl border border-stone-200 dark:border-stone-800 animate-pulse">
                        <Lightbulb className="w-8 h-8 text-[#B45309] dark:text-[#F5A623] mx-auto mb-2 animate-pulse" />
                        <p className="text-sm font-semibold">Crafting celebration ideas & RSVP templates...</p>
                      </div>
                    ) : (
                      <IdeasTab
                        ideas={plan.ideas || []}
                        eventTitle={plan.title}
                        onUpdateIdeas={handleUpdateIdeas}
                        language={language}
                        onOpenInvitationDesigner={() => setShowInvitationModal(true)}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'risks' && (
                  <div
                    role="tabpanel"
                    id="panel-risks"
                    aria-labelledby="tab-risks"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    <RisksTab
                      risks={plan.risks || []}
                      isLoading={isStreaming && !loadedSections.risks}
                      onUpdateRisks={handleUpdateRisks}
                      onAddMitigationToTimeline={handleAddRiskMitigationToTimeline}
                    />
                  </div>
                )}

                {activeTab === 'guests' && (
                  <div
                    role="tabpanel"
                    id="panel-guests"
                    aria-labelledby="tab-guests"
                    tabIndex={0}
                    className="focus:outline-none"
                  >
                    <GuestsTab
                      guests={plan.guest_list || []}
                      planGuests={plan.guests}
                      eventTitle={plan.title}
                      ideas={plan.ideas || []}
                      onUpdateGuests={handleUpdateGuests}
                      onRequestReplan={handleReplan}
                    />
                  </div>
                )}

                <PrintPlanView plan={plan} />
              </div>
            )}
          </div>

          {plan && (
            <aside className="lg:col-span-3 min-w-0 no-print lg:sticky lg:top-6" aria-label="Co-planner sidebar">
              <CoPlannerPanel plan={plan} onApply={handleApplyCoPlannerChange} />
            </aside>
          )}
        </div>
      </main>

      {/* Version History Drawer */}
      <HistoryDrawer
        isOpen={showHistoryDrawer}
        history={history}
        currentIndex={historyIndex}
        onRestore={handleRestoreHistory}
        onClose={() => setShowHistoryDrawer(false)}
        onClearHistory={handleClearHistory}
      />

      {/* Cultural Invitation Card Modal */}
      {showInvitationModal && plan && (
        <InvitationCardModal
          plan={plan}
          onClose={() => setShowInvitationModal(false)}
        />
      )}

      {/* Auth Modal for Sign In / Sign Up */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Cloud Plans Modal for browsing/loading saved celebrations */}
      <CloudPlansModal
        isOpen={showCloudPlansModal}
        onClose={() => setShowCloudPlansModal(false)}
        onSelectPlan={handleSelectCloudPlan}
        onSaveCurrentAsNew={handleSaveCurrentAsNew}
        currentPlanId={activeCloudPlan?.id}
      />

      {/* Collaborators Modal for real-time team invites */}
      {activeCloudPlan && (
        <CollaboratorsModal
          isOpen={showCollaboratorsModal}
          onClose={() => setShowCollaboratorsModal(false)}
          cloudPlan={activeCloudPlan}
          onPlanUpdated={setActiveCloudPlan}
        />
      )}

      {/* Live Collaboration Sync Notification Toast */}
      {collabNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 dark:border-stone-200 text-xs flex items-center gap-3 animate-fade-in"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{collabNotification}</span>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
