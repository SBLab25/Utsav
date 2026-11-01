/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EventPlan, BudgetItem, TimelineTask, VendorRequirement, IdeaItem, RiskItem } from '../src/types/plan.ts';

/**
 * Parses budget amount from brief text looking for currency markers or explicit units (L, lakh, k, cr).
 * "Sister's sangeet, 150 guests, ₹6L" => 600000
 */
export function parseBudgetFromBrief(text: string, defaultBudget: number = 500000): number {
  const textLower = text.toLowerCase();

  // 1. Check for currency marker with number and optional unit
  const currencyMatch = textLower.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i);
  if (currencyMatch) {
    const val = parseFloat(currencyMatch[1].replace(/,/g, ''));
    const unit = (currencyMatch[2] || '').toLowerCase();
    if (!isNaN(val)) {
      if (unit.startsWith('cr')) return Math.round(val * 10000000);
      if (unit.startsWith('l')) return Math.round(val * 100000);
      if (unit === 'k') return Math.round(val * 1000);
      if (val >= 1000) return Math.round(val);
    }
  }

  // 2. Check for number followed by explicit unit (L, lakh, k, cr) anywhere in the text
  const unitMatch = textLower.match(/\b([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)\b/i);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1].replace(/,/g, ''));
    const unit = unitMatch[2].toLowerCase();
    if (!isNaN(val)) {
      if (unit.startsWith('cr')) return Math.round(val * 10000000);
      if (unit.startsWith('l')) return Math.round(val * 100000);
      if (unit === 'k') return Math.round(val * 1000);
    }
  }

  // 3. Check for explicit "budget" or "spend" keyword followed by a number
  const budgetKeywordMatch = textLower.match(/\b(?:budget|cost|spend)\s*(?:of|is|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i);
  if (budgetKeywordMatch) {
    const val = parseFloat(budgetKeywordMatch[1].replace(/,/g, ''));
    const unit = (budgetKeywordMatch[2] || '').toLowerCase();
    if (!isNaN(val)) {
      if (unit.startsWith('cr')) return Math.round(val * 10000000);
      if (unit.startsWith('l')) return Math.round(val * 100000);
      if (unit === 'k') return Math.round(val * 1000);
      if (val >= 1000) return Math.round(val);
    }
  }

  return defaultBudget;
}

/**
 * Parses guest count from brief text.
 * "Sister's sangeet, 150 guests, ₹6L" => 150
 */
export function parseGuestsFromBrief(text: string): number {
  const textLower = text.toLowerCase();
  const guestMatch = textLower.match(/(\d+)\s*(?:guests?|people|residents?|attendees?|pax|students?|members?)/i);
  if (guestMatch) {
    return parseInt(guestMatch[1], 10);
  }
  if (/small|intimate/i.test(textLower)) return 30;
  if (/grand|mega|huge/i.test(textLower)) return 350;
  return 100;
}

/**
 * Never assumes year 2026. Uses current year, and rolls to next year if date has already passed.
 */
export function parseEventDate(text: string, referenceDate: Date = new Date()): string {
  const currentYear = referenceDate.getFullYear();

  // 1. Explicit ISO format YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
  };

  const dayMonthMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i);
  const monthDayMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);

  let targetDay: number | null = null;
  let targetMonth: number | null = null;

  if (dayMonthMatch) {
    targetDay = parseInt(dayMonthMatch[1], 10);
    const mKey = dayMonthMatch[2].toLowerCase().slice(0, 3);
    targetMonth = monthMap[mKey] ?? null;
  } else if (monthDayMatch) {
    const mKey = monthDayMatch[1].toLowerCase().slice(0, 3);
    targetMonth = monthMap[mKey] ?? null;
    targetDay = parseInt(monthDayMatch[2], 10);
  }

  if (targetDay !== null && targetMonth !== null && targetDay >= 1 && targetDay <= 31) {
    const candidate = new Date(currentYear, targetMonth, targetDay, 23, 59, 59);
    const chosenYear = candidate.getTime() < referenceDate.getTime() ? currentYear + 1 : currentYear;
    const mStr = String(targetMonth + 1).padStart(2, '0');
    const dStr = String(targetDay).padStart(2, '0');
    return `${chosenYear}-${mStr}-${dStr}`;
  }

  const fallback = new Date(referenceDate.getTime() + 45 * 24 * 60 * 60 * 1000);
  const fYear = fallback.getFullYear();
  const fMonth = String(fallback.getMonth() + 1).padStart(2, '0');
  const fDay = String(fallback.getDate()).padStart(2, '0');
  return `${fYear}-${fMonth}-${fDay}`;
}

/**
 * Parses explicit monetary amount with units (L, lakh, k, cr).
 */
export function parseExplicitAmount(numStr: string, unitStr?: string): number {
  const val = parseFloat(numStr.replace(/,/g, ''));
  const unit = (unitStr || '').toLowerCase();
  if (unit.startsWith('cr')) return Math.round(val * 10000000);
  if (unit.startsWith('l')) return Math.round(val * 100000);
  if (unit === 'k') return Math.round(val * 1000);
  return Math.round(val);
}

/**
 * Generic budget category breakdown per event type.
 */
export function getGenericBudgetCategories(eventType: string): BudgetItem[] {
  switch (eventType) {
    case 'sangeet':
      return [
        { category: 'Venue & Stage Decor', pct: 35, locked: false },
        { category: 'Catering & Hospitality', pct: 30, locked: false },
        { category: 'DJ & Music Entertainment', pct: 15, locked: false },
        { category: 'Photography & Videography', pct: 12, locked: false },
        { category: 'Attire, Styling & Favors', pct: 8, locked: false },
      ];
    case 'wedding':
      return [
        { category: 'Lawn / Hall Venue & Decor', pct: 35, locked: false },
        { category: 'Multi-Cuisine Catering', pct: 30, locked: false },
        { category: 'Photography & Candid Film', pct: 15, locked: false },
        { category: 'Bridal & Groom Wardrobe', pct: 12, locked: false },
        { category: 'Invitations & Guest Hospitality', pct: 8, locked: false },
      ];
    case 'birthday':
      return [
        { category: 'Party Venue & Balloon Decor', pct: 30, locked: false },
        { category: 'Buffet & Custom Cake', pct: 35, locked: false },
        { category: 'Host, Magic & Entertainment', pct: 15, locked: false },
        { category: 'Return Gifts & Photo Props', pct: 10, locked: false },
        { category: 'Photography', pct: 10, locked: false },
      ];
    case 'community':
      return [
        { category: 'Sound, Stage & Lighting Setup', pct: 30, locked: false },
        { category: 'Prasad & Community Feast', pct: 30, locked: false },
        { category: 'Eco Decor & Flowers', pct: 20, locked: false },
        { category: 'Permits, Security & Logistics', pct: 10, locked: false },
        { category: 'Cultural Performers & Sound System', pct: 10, locked: false },
      ];
    case 'anniversary':
      return [
        { category: 'Banquet & Romantic Decor', pct: 35, locked: false },
        { category: 'Gourmet Dinner & Drinks', pct: 35, locked: false },
        { category: 'Acoustic Band / Live Melodies', pct: 15, locked: false },
        { category: 'Keepsake Gifts & Invites', pct: 8, locked: false },
        { category: 'Cinematography', pct: 7, locked: false },
      ];
    default:
      return [
        { category: 'Venue & Production Setup', pct: 35, locked: false },
        { category: 'Catering & Refreshments', pct: 30, locked: false },
        { category: 'Audio-Visual & Entertainment', pct: 15, locked: false },
        { category: 'Branding & Collateral', pct: 10, locked: false },
        { category: 'Logistics & Security', pct: 10, locked: false },
      ];
  }
}

/**
 * Builds fallback plan strictly from what the brief actually says.
 * Removes hardcoded "Sister's Retro Bollywood Sangeet" title, theme and content.
 */
export function generateDefaultPlan(brief: string, referenceDate: Date = new Date()): EventPlan {
  const text = brief.trim();
  const textLower = text.toLowerCase();

  // 1. Extract Event Type
  let eventType = 'celebration';
  if (/sangeet/i.test(textLower)) eventType = 'sangeet';
  else if (/wedding|shaadi|marriage|vivaah/i.test(textLower)) eventType = 'wedding';
  else if (/birthday|bday|turning/i.test(textLower)) eventType = 'birthday';
  else if (/anniversary|jubilee/i.test(textLower)) eventType = 'anniversary';
  else if (/community|rwa|diwali|mela|society|colony/i.test(textLower)) eventType = 'community';
  else if (/corporate|annual|cocktail|office/i.test(textLower)) eventType = 'corporate';
  else if (/farewell|college|fest/i.test(textLower)) eventType = 'college fest';

  // 2. Extract Guest Count (clamped to 1-5000)
  const guests = Math.min(5000, Math.max(1, parseGuestsFromBrief(text)));

  // 3. Extract Budget (clamped to 10k-100M)
  const total_budget = Math.min(100000000, Math.max(10000, parseBudgetFromBrief(text, 500000)));

  // 4. Extract City
  const knownCities = [
    'Vizag', 'Goa', 'Delhi', 'Jaipur', 'Bengaluru', 'Mumbai', 'Pune', 'Hyderabad',
    'Chennai', 'Kolkata', 'Udaipur', 'Ahmedabad', 'Chandigarh', 'Indore', 'Lucknow'
  ];
  let city = 'Delhi NCR';
  for (const c of knownCities) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
      city = c;
      break;
    }
  }

  // 5. Extract Date (never assumes 2026, rolls forward if passed)
  const event_date = parseEventDate(text, referenceDate);

  // 6. Extract Theme strictly from brief keywords, or use generic celebration theme
  let theme = 'Celebration & Festivities';
  if (/retro\s*bollywood/i.test(textLower)) theme = 'Retro Bollywood';
  else if (/bollywood/i.test(textLower)) theme = 'Bollywood Glamour';
  else if (/eco-friendly|sustainable|green/i.test(textLower)) theme = 'Eco-Friendly & Sustainable';
  else if (/royal|heritage|palace/i.test(textLower)) theme = 'Royal Heritage & Elegance';
  else if (/neon|sunset|rooftop/i.test(textLower)) theme = 'Sunset Neon & Rooftop Glow';
  else if (/traditional|cultural|folk/i.test(textLower)) theme = 'Traditional Cultural Festivities';
  else if (/minimalist|modern/i.test(textLower)) theme = 'Modern Minimalist';

  // 7. Title strictly built from what brief says
  const firstPart = text.split(/[,;\n]/)[0].trim();
  let title = `${city} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Plan`;
  if (firstPart.length >= 3 && firstPart.length <= 45 && !/^\d+/.test(firstPart)) {
    const formattedSubject = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    title = formattedSubject.toLowerCase().includes(eventType)
      ? `${formattedSubject} Plan`
      : `${formattedSubject} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Plan`;
  }

  // 8. Generic Categories per Event Type
  const budget = getGenericBudgetCategories(eventType);

  // 9. Generic Milestone Timeline
  const timeline: TimelineTask[] = [
    { t_minus_days: 90, title: `Confirm Venue & Dates in ${city}`, owner: 'Lead Organizer', done: false },
    { t_minus_days: 60, title: `Finalize Catering Menu & Tastings (${guests} guests)`, owner: 'Food Committee', done: false },
    { t_minus_days: 30, title: `Book Audio-Visual & Entertainment Setup`, owner: 'Entertainment Lead', done: false },
    { t_minus_days: 15, title: `Review ${theme} Theme Decor & Lighting Layout`, owner: 'Decor Team', done: false },
    { t_minus_days: 7, title: `Conduct Final Vendor Walkthrough & Rehearsals`, owner: 'Core Team', done: false },
    { t_minus_days: 0, title: `Event Day Coordination & Hospitality Welcome`, owner: 'Event Leads', done: false },
  ];

  // 10. Generic Vendors
  const vendors: VendorRequirement[] = [
    {
      type: 'Venue & Decor Setup',
      est_low: Math.round(total_budget * 0.3),
      est_high: Math.round(total_budget * 0.4),
      questions: [
        'Does the package include basic lighting, carpeting, and power backup?',
        'What are the setup access hours and teardown curfew timings?',
      ],
      red_flags: [
        'Hidden electricity / generator diesel surcharges',
        'No dedicated venue coordinator on-site during the event',
      ],
      outreach_message: `Hello! We are organizing a ${guests}-guest ${eventType} in ${city} on ${event_date} with a ${theme} theme. Please share your availability and decor packages.`,
    },
    {
      type: 'Catering & Beverages',
      est_low: Math.round(total_budget * 0.25),
      est_high: Math.round(total_budget * 0.35),
      questions: [
        'What live counters and dessert stations are included in the per-plate price?',
        'What is your buffer policy for unexpected extra guests?',
      ],
      red_flags: [
        'No tasting session prior to contract signing',
        'Unclear staff-to-guest serving ratio',
      ],
      outreach_message: `Hi! We require catering services for ${guests} guests on ${event_date} in ${city}. Please share your sample menus and per-plate pricing options.`,
    },
    {
      type: 'Sound, DJ & AV Production',
      est_low: Math.round(total_budget * 0.1),
      est_high: Math.round(total_budget * 0.18),
      questions: [
        'Do you provide wireless microphones, console mixers, and stage monitors?',
        'Can you accommodate custom playlists and live announcements?',
      ],
      red_flags: [
        'No backup audio mixer or spare cables',
        'Inadequate speaker wattage for the venue scale',
      ],
      outreach_message: `Greetings! We are seeking an experienced audio-visual and sound partner for our celebration on ${event_date} in ${city} (${guests} attendees). Kindly provide equipment details and quotes.`,
    },
  ];

  // 11. Generic Ideas
  const ideas: IdeaItem[] = [
    {
      category: 'theme',
      title: `${theme} Concept`,
      description: `Cohesive aesthetic featuring warm color palettes, personalized accents, and curated mood lighting suited for ${city}.`,
    },
    {
      category: 'menu',
      title: 'Curated Feast & Live Stations',
      description: `Balance of regional delicacies, fresh interactive street-food counters, and signature desserts tailored for ${guests} guests.`,
    },
    {
      category: 'decor',
      title: 'Photo-Op Welcome Arch',
      description: `A branded floral or illuminated backdrop at the reception entryway for keepsake guest photography.`,
    },
    {
      category: 'invitation',
      title: 'Digital Invitation Copy',
      description: `Warm Greetings,\nPlease join us to celebrate ${title} on ${event_date} in ${city}.\nYour presence and blessings will make our celebration complete!`,
    },
    {
      category: 'rsvp',
      title: 'WhatsApp RSVP Template',
      description: `✨ *Invitation to ${title}*\nDate: ${event_date} | Location: ${city}\nPlease let us know if you and your family will be joining us. We look forward to celebrating together!`,
    },
  ];

  // 12. Generic Risks & Mitigations
  const risks = generateDefaultRisks(eventType, city, total_budget, guests);

  return {
    title,
    event_type: eventType,
    event_date,
    guests,
    total_budget,
    city,
    theme,
    budget,
    timeline,
    vendors,
    ideas,
    risks,
    clarifying_question: null,
  };
}

/**
 * Generates sensible default risks based on event parameters
 */
export function generateDefaultRisks(
  eventType: string,
  city: string,
  totalBudget: number,
  guests: number
): RiskItem[] {
  const isLarge = guests >= 250;
  const isCommunity = eventType === 'community';
  const isWedding = eventType === 'wedding' || eventType === 'sangeet';
  return [
    {
      id: 'weather',
      title: `Weather disruption in ${city}`,
      category: 'weather',
      likelihood: 'medium',
      impact: 'high',
      mitigation: `Secure venue with integrated indoor hall or pre-book waterproof canopy hangars 48 hours prior.`,
      backup_plan: 'Move the ceremony and sound-sensitive activities indoors using the pre-approved floor plan.',
      related_task_t_minus_days: 7,
    },
    {
      id: 'permissions',
      title: isCommunity ? 'Permission and sound-curfew constraints' : 'Local sound-curfew enforcement',
      category: 'legal',
      likelihood: isCommunity ? 'high' : 'medium',
      impact: 'high',
      mitigation: `Obtain local police and municipal entertainment permissions in advance, and plan after-party playlist indoors.`,
      backup_plan: 'Switch to an acoustic or low-volume program and end amplified sound before the local curfew.',
      related_task_t_minus_days: 30,
    },
    {
      id: 'guest-overflow',
      title: `Guest count exceeds the planned ${guests}`,
      category: 'logistics',
      likelihood: isLarge ? 'high' : 'medium',
      impact: 'medium',
      mitigation: `Contract a 10-15% buffer plate margin with caterer and operate twin live counter stations.`,
      backup_plan: 'Release the reserved buffer tables and prioritize quick-serve counters for the first 30 minutes.',
      related_task_t_minus_days: 15,
    },
    {
      id: 'power',
      title: 'Power or production failure',
      category: 'vendor',
      likelihood: 'medium',
      impact: 'high',
      mitigation: `Require venue or production vendor to provide a dedicated 62.5+ kVA silent generator backup with auto-switchover.`,
      backup_plan: 'Run the event on the essential lighting and audio circuit while the production team isolates the failed load.',
      related_task_t_minus_days: 7,
    },
    {
      id: 'arrival',
      title: `Traffic and parking delays in ${city}`,
      category: 'logistics',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: `Contract dedicated valet staff and share GPS parking instructions directly in the digital invite.`,
      backup_plan: 'Open a secondary arrival point and assign volunteers to direct guests to overflow parking.',
      related_task_t_minus_days: 3,
    },
    ...(isWedding
      ? [{
          id: 'vendor-shortage',
          title: 'Peak-season vendor shortage',
          category: 'vendor' as const,
          likelihood: 'medium' as const,
          impact: 'high' as const,
          mitigation: 'Lock critical vendors early and maintain at least one vetted backup vendor for each essential category.',
          backup_plan: 'Activate the backup vendor roster with the agreed rates and scope if a primary vendor cancels.',
          related_task_t_minus_days: 45,
        }]
      : []),
    ...(totalBudget < 300000
      ? [{
          id: 'budget-buffer',
          title: 'Thin contingency buffer',
          category: 'budget' as const,
          likelihood: 'medium' as const,
          impact: 'medium' as const,
          mitigation: 'Reserve at least 5% of the budget for weather, transport, and last-minute vendor changes.',
          backup_plan: 'De-scope non-essential decor or entertainment before cutting catering, safety, or permissions.',
          related_task_t_minus_days: 30,
        }]
      : []),
  ];
}

export function generateDefaultTimeline(core: {
  city?: string;
  guests?: number;
  theme?: string;
}): TimelineTask[] {
  const city = core.city || 'City';
  const guests = core.guests || 100;
  const theme = core.theme || 'Celebration';
  return [
    { t_minus_days: 90, title: `Confirm Venue & Dates in ${city}`, owner: 'Lead Organizer', done: false },
    { t_minus_days: 60, title: `Finalize Catering Menu & Tastings (${guests} guests)`, owner: 'Food Committee', done: false },
    { t_minus_days: 30, title: `Book Audio-Visual & Entertainment Setup`, owner: 'Entertainment Lead', done: false },
    { t_minus_days: 15, title: `Review ${theme} Theme Decor & Lighting Layout`, owner: 'Decor Team', done: false },
    { t_minus_days: 7, title: `Conduct Final Vendor Walkthrough & Rehearsals`, owner: 'Core Team', done: false },
    { t_minus_days: 0, title: `Event Day Coordination & Hospitality Welcome`, owner: 'Event Leads', done: false },
  ];
}

export function generateDefaultVendors(core: {
  eventType?: string;
  city?: string;
  totalBudget?: number;
  guests?: number;
  theme?: string;
  eventDate?: string;
}): VendorRequirement[] {
  const city = core.city || 'City';
  const total_budget = core.totalBudget || 500000;
  const guests = core.guests || 100;
  const eventType = core.eventType || 'celebration';
  const theme = core.theme || 'Celebration';
  const event_date = core.eventDate || 'upcoming date';

  return [
    {
      type: 'Venue & Decor Setup',
      est_low: Math.round(total_budget * 0.3),
      est_high: Math.round(total_budget * 0.4),
      questions: [
        'Does the package include basic lighting, carpeting, and power backup?',
        'What are the setup access hours and teardown curfew timings?',
      ],
      red_flags: [
        'Hidden electricity / generator diesel surcharges',
        'No dedicated venue coordinator on-site during the event',
      ],
      outreach_message: `Hello! We are organizing a ${guests}-guest ${eventType} in ${city} on ${event_date} with a ${theme} theme. Please share your availability and decor packages.`,
    },
    {
      type: 'Catering & Beverages',
      est_low: Math.round(total_budget * 0.25),
      est_high: Math.round(total_budget * 0.35),
      questions: [
        'What live counters and dessert stations are included in the per-plate price?',
        'What is your buffer policy for unexpected extra guests?',
      ],
      red_flags: [
        'No tasting session prior to contract signing',
        'Unclear staff-to-guest serving ratio',
      ],
      outreach_message: `Hi! We require catering services for ${guests} guests on ${event_date} in ${city}. Please share your sample menus and per-plate pricing options.`,
    },
    {
      type: 'Sound, DJ & AV Production',
      est_low: Math.round(total_budget * 0.1),
      est_high: Math.round(total_budget * 0.18),
      questions: [
        'Do you provide wireless microphones, console mixers, and stage monitors?',
        'Can you accommodate custom playlists and live announcements?',
      ],
      red_flags: [
        'No backup audio mixer or spare cables',
        'Inadequate speaker wattage for the venue scale',
      ],
      outreach_message: `Greetings! We are seeking an experienced audio-visual and sound partner for our celebration on ${event_date} in ${city} (${guests} attendees). Kindly provide equipment details and quotes.`,
    },
  ];
}

export function generateDefaultIdeas(core: {
  title?: string;
  theme?: string;
  city?: string;
  guests?: number;
  eventDate?: string;
}): IdeaItem[] {
  const title = core.title || 'Celebration Plan';
  const theme = core.theme || 'Celebration';
  const city = core.city || 'City';
  const guests = core.guests || 100;
  const event_date = core.eventDate || 'upcoming date';

  return [
    {
      category: 'theme',
      title: `${theme} Concept`,
      description: `Cohesive aesthetic featuring warm color palettes, personalized accents, and curated mood lighting suited for ${city}.`,
    },
    {
      category: 'menu',
      title: 'Curated Feast & Live Stations',
      description: `Balance of regional delicacies, fresh interactive street-food counters, and signature desserts tailored for ${guests} guests.`,
    },
    {
      category: 'decor',
      title: 'Photo-Op Welcome Arch',
      description: `A branded floral or illuminated backdrop at the reception entryway for keepsake guest photography.`,
    },
    {
      category: 'invitation',
      title: 'Digital Invitation Copy',
      description: `Warm Greetings,\nPlease join us to celebrate ${title} on ${event_date} in ${city}.\nYour presence and blessings will make our celebration complete!`,
    },
    {
      category: 'rsvp',
      title: 'WhatsApp RSVP Template',
      description: `✨ *Invitation to ${title}*\nDate: ${event_date} | Location: ${city}\nPlease let us know if you and your family will be joining us. We look forward to celebrating together!`,
    },
  ];
}


/**
 * Smart heuristic re-planner:
 * - Parses explicit amounts with regex
 * - Only changes what is explicitly requested
 * - Never assumes year 2026 for date changes
 */
export function applySmartReplan(
  currentPlan: EventPlan,
  instruction: string,
  referenceDate: Date = new Date()
): EventPlan {
  const updated: EventPlan = JSON.parse(JSON.stringify(currentPlan));
  const textLower = instruction.toLowerCase().trim();

  // 1. Guest count modifications - ONLY if guests are explicitly requested
  const guestAddMatch = textLower.match(/(?:add|\+|\bmore\b)\s*(\d+)\s*(?:more\s*)?guests?/i) ||
                        textLower.match(/(\d+)\s*(?:more\s*)?guests?\s*(?:more|\+)?/i);
  const guestReduceMatch = textLower.match(/(?:reduce|less|decrease|\-)\s*(\d+)\s*guests?/i);
  const guestExactMatch = textLower.match(/(?:set|make|to)\s*(\d+)\s*guests?/i);

  if (guestAddMatch) {
    const delta = parseInt(guestAddMatch[1], 10);
    updated.guests = (updated.guests || 100) + delta;
    updated.timeline.unshift({
      t_minus_days: 15,
      title: `Confirm extra table seating & catering covers (+${delta} guests)`,
      owner: 'Catering Committee',
      done: false,
    });
  } else if (guestReduceMatch) {
    const delta = parseInt(guestReduceMatch[1], 10);
    updated.guests = Math.max(10, (updated.guests || 100) - delta);
  } else if (guestExactMatch) {
    updated.guests = parseInt(guestExactMatch[1], 10);
  }

  // 2. Budget modifications - ONLY explicit amounts and requested budget actions
  const pctReduceMatch = textLower.match(/(?:reduce|cut|decrease)\s*(?:the\s*)?(?:budget\s*)?(?:by\s*)?(\d+)%/i) ||
                         textLower.match(/-\s*(\d+)%/i);
  if (pctReduceMatch) {
    const pct = parseInt(pctReduceMatch[1], 10);
    updated.total_budget = Math.max(10000, Math.round(updated.total_budget * (1 - pct / 100)));
  } else {
    // Check for explicit amount reduction: e.g. "reduce budget by 1L", "cut 50k from budget"
    const reduceMatch =
      textLower.match(/(?:reduce|decrease|cut|lower)\s*(?:the\s*)?(?:total\s*)?budget\s*(?:by\s*)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i) ||
      textLower.match(/(?:reduce|decrease|cut|lower)\s*(?:by\s*)?(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\s*(?:from\s*(?:the\s*)?budget)?/i) ||
      textLower.match(/(?:reduce|decrease|cut|lower)\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)\s*(?:from\s*(?:the\s*)?budget)/i);

    // Check for explicit amount increase: e.g. "increase budget by 1L", "add 50k to budget"
    const increaseMatch =
      textLower.match(/(?:increase|raise|add|bump)\s*(?:the\s*)?(?:total\s*)?budget\s*(?:by\s*)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i) ||
      textLower.match(/(?:add|increase|raise|bump)\s*(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\s*(?:to\s*(?:the\s*)?budget)/i) ||
      textLower.match(/(?:add|increase|raise|bump)\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)\s*(?:to\s*(?:the\s*)?budget)/i);

    // Check for explicit set budget: e.g. "set budget to 8L", "change budget to 10L", "budget = 8L"
    const setMatch =
      textLower.match(/(?:set|make|change|update)\s*(?:the\s*)?(?:total\s*)?budget\s*(?:to|=)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i) ||
      textLower.match(/\bbudget\s*(?:to|=|is|:)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|k)?\b/i);

    if (reduceMatch) {
      const delta = parseExplicitAmount(reduceMatch[1], reduceMatch[2]);
      if (delta > 0) {
        updated.total_budget = Math.max(10000, updated.total_budget - delta);
      }
    } else if (increaseMatch) {
      const delta = parseExplicitAmount(increaseMatch[1], increaseMatch[2]);
      if (delta > 0) {
        updated.total_budget = updated.total_budget + delta;
      }
    } else if (setMatch) {
      const newAmount = parseExplicitAmount(setMatch[1], setMatch[2]);
      if (newAmount > 1000) {
        updated.total_budget = newAmount;
      }
    }
  }

  // 3. Date modifications - NEVER assume 2026, use parseEventDate or relative shifts
  if (/move\s*date|shift\s*date|postpone|advance|reschedule|move\s*to/i.test(textLower)) {
    const daysShiftMatch = textLower.match(/(\d+)\s*days?/i);
    const weeksShiftMatch = textLower.match(/(\d+)\s*weeks?/i);

    if (weeksShiftMatch) {
      const weeks = parseInt(weeksShiftMatch[1], 10);
      const curDate = new Date(updated.event_date);
      curDate.setDate(curDate.getDate() + weeks * 7);
      updated.event_date = curDate.toISOString().slice(0, 10);
    } else if (daysShiftMatch) {
      const days = parseInt(daysShiftMatch[1], 10);
      const curDate = new Date(updated.event_date);
      curDate.setDate(curDate.getDate() + days);
      updated.event_date = curDate.toISOString().slice(0, 10);
    } else {
      const parsedNewDate = parseEventDate(textLower, referenceDate);
      if (parsedNewDate) {
        updated.event_date = parsedNewDate;
      }
    }
  }

  // 4. Eco-friendly theme additions
  if (textLower.includes('eco-friendly') || textLower.includes('sustainable') || textLower.includes('green decor')) {
    if (!updated.theme.toLowerCase().includes('eco-friendly')) {
      updated.theme = `${updated.theme} (Eco-Friendly & Sustainable Focus)`;
    }
    updated.ideas.unshift({
      category: 'decor',
      title: 'Biodegradable Seed-Paper & Potted Ferns',
      description: 'Zero single-use plastics, banana leaf dinnerware, and potted marigold centerpieces that guests take home.',
    });
  }

  // 5. Live music / Sufi / Ghazal additions
  if (textLower.includes('sufi') || textLower.includes('ghazal') || textLower.includes('live band')) {
    updated.ideas.unshift({
      category: 'entertainment',
      title: 'Acoustic Sufi & Folk Ensemble',
      description: 'Live ensemble featuring harmonium, tabla, and soulful acoustic melodies for an intimate evening.',
    });
    updated.vendors.push({
      type: 'Live Sufi & Acoustic Band',
      est_low: Math.round(updated.total_budget * 0.08),
      est_high: Math.round(updated.total_budget * 0.15),
      questions: ['What is the instrument setup and vocal lineup?', 'Do you provide your own stage monitors and audio technician?'],
      red_flags: ['Does not do live sound checks prior to guest arrival', 'Overcharges for extra hours'],
      outreach_message: `Hi! We are looking for a soulful live acoustic band for our celebration in ${updated.city}. Please share sample recordings.`,
    });
  }

  // Ensure bounded values compliant with schema
  updated.guests = Math.min(5000, Math.max(1, updated.guests || 100));
  updated.total_budget = Math.min(100000000, Math.max(10000, updated.total_budget || 500000));
  if (updated.vendors.length > 12) updated.vendors = updated.vendors.slice(0, 12);
  if (updated.ideas.length > 20) updated.ideas = updated.ideas.slice(0, 20);
  if (updated.timeline.length > 30) updated.timeline = updated.timeline.slice(0, 30);
  if (updated.budget.length > 12) updated.budget = updated.budget.slice(0, 12);
  if (!updated.risks || !Array.isArray(updated.risks) || updated.risks.length < 3) {
    updated.risks = generateDefaultRisks(updated.event_type, updated.city, updated.total_budget, updated.guests);
  } else if (updated.risks.length > 6) {
    updated.risks = updated.risks.slice(0, 6);
  }

  return updated;
}
