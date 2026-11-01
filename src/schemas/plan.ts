/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const EventDaySchema = z.object({
  id: z.string().min(1).max(120),
  day_number: z.number().int().min(1).max(10),
  title: z.string().min(1).max(120),
  date: z.string().max(120).optional(),
  time_slot: z.string().max(120).optional(),
  venue: z.string().max(120).optional(),
  budget_allocated: z.number().int().nonnegative().optional(),
  dress_code: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const VendorQuoteSchema = z.object({
  id: z.string().min(1).max(120),
  vendor_name: z.string().min(1).max(120),
  contact_person: z.string().max(120).optional(),
  phone_or_email: z.string().max(120).optional(),
  quote_amount: z.number().int().nonnegative(),
  inclusions: z.array(z.string().max(250)).max(10).default([]),
  status: z.enum(['received', 'shortlisted', 'selected', 'rejected']).default('received'),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export const BudgetItemSchema = z.object({
  category: z.string().min(1).max(120),
  pct: z.number().min(0).max(100),
  locked: z.boolean().default(false),
  amount: z.number().int().nonnegative().optional(),
  spent: z.number().int().nonnegative().default(0).optional(),
  day_number: z.number().int().min(1).max(10).optional(),
});

export const TimelineTaskSchema = z.object({
  t_minus_days: z.number().int(),
  title: z.string().min(1).max(120),
  owner: z.string().max(120),
  done: z.boolean().default(false),
  id: z.string().max(120).optional(),
  target_date: z.string().max(120).optional(),
  is_overdue: z.boolean().optional(),
  day_number: z.number().int().min(1).max(10).optional(),
  time_slot: z.string().max(120).optional(),
});

export const VendorRequirementSchema = z.object({
  type: z.string().min(1).max(120),
  est_low: z.number().nonnegative(),
  est_high: z.number().nonnegative(),
  questions: z.array(z.string().max(1000)).max(20),
  red_flags: z.array(z.string().max(1000)).max(20),
  outreach_message: z.string().max(1000),
  status: z.enum(['todo', 'contacted', 'shortlisted', 'booked']).default('todo').optional(),
  quote: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  quotes: z.array(VendorQuoteSchema).default([]).optional(),
});

export const IdeaItemSchema = z.object({
  id: z.string().max(120).optional(),
  category: z.string().max(120),
  title: z.string().min(1).max(120),
  description: z.string().max(1000),
  favorited: z.boolean().optional(),
  image_url: z.string().max(250000).optional(),
  image_prompt: z.string().max(1000).optional(),
  image_source: z.enum(['imagen', 'curated', 'custom']).optional(),
});

export const RiskItemSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().min(1).max(180),
  category: z.enum(['weather', 'vendor', 'health', 'legal', 'logistics', 'budget', 'cultural']),
  likelihood: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1).max(500),
  backup_plan: z.string().min(1).max(500),
  related_task_t_minus_days: z.number().int().min(0).optional(),
});

export const GuestSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  group: z.enum(['family', 'friends', 'colleagues', 'other']),
  status: z.enum(['invited', 'confirmed', 'declined']),
  diet: z.enum(['veg', 'non-veg', 'jain', 'vegan']),
  allergy_note: z.string().max(240).optional(),
  plus_ones: z.number().int().min(0).max(10).default(0),
});

export const PaymentRecordSchema = z.object({
  id: z.string().min(1).max(120),
  category: z.string().min(1).max(120),
  amount: z.number().int().positive().max(100000000),
  note: z.string().max(500).default(''),
  date: z.string().max(120),
});

export const RunSheetItemSchema = z.object({
  id: z.string().max(120).optional(),
  time: z.string().min(1).max(20),
  title: z.string().min(1).max(180),
  owner: z.string().min(1).max(120),
});

export const EventPlanSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().min(1).max(120),
  event_type: z.string().min(1).max(120),
  event_date: z.string().max(120),
  guests: z.number().int().min(1).max(5000),
  total_budget: z.number().min(10000).max(100000000),
  city: z.string().max(120),
  theme: z.string().max(120),
  host_names: z.string().max(200).optional(),
  event_days: z.array(EventDaySchema).max(10).optional(),
  budget: z.array(BudgetItemSchema).min(2).max(12),
  timeline: z.array(TimelineTaskSchema).max(30),
  vendors: z.array(VendorRequirementSchema).max(12),
  ideas: z.array(IdeaItemSchema).max(20),
  risks: z.array(RiskItemSchema).min(3).max(6),
  guest_list: z.array(GuestSchema).max(5000).optional(),
  payments: z.array(PaymentRecordSchema).default([]).optional(),
  runSheet: z.array(RunSheetItemSchema).max(30).default([]).optional(),
  clarifying_question: z.string().max(1000).nullable().optional(),
  timestamp: z.number().optional(),
});

export const CorePlanSchema = z.object({
  title: z.string().min(1).max(120),
  event_type: z.string().min(1).max(120),
  event_date: z.string().max(120),
  guests: z.number().int().min(1).max(5000),
  total_budget: z.number().min(10000).max(100000000),
  city: z.string().max(120),
  theme: z.string().max(120),
  host_names: z.string().max(200).optional(),
  event_days: z.array(EventDaySchema).max(10).optional(),
  budget: z.array(BudgetItemSchema).min(2).max(12),
  clarifying_question: z.string().max(1000).nullable().optional(),
});

export const TimelineSectionSchema = z.object({
  timeline: z.array(TimelineTaskSchema).max(30),
  runSheet: z.array(RunSheetItemSchema).max(30).optional(),
});

export const VendorsSectionSchema = z.object({
  vendors: z.array(VendorRequirementSchema).max(12),
});

export const IdeasSectionSchema = z.object({
  ideas: z.array(IdeaItemSchema).max(20),
});

export const RisksSectionSchema = z.object({
  risks: z.array(RiskItemSchema).min(3).max(6),
});

export const eventDaySchema = EventDaySchema;
export const vendorQuoteSchema = VendorQuoteSchema;
export const budgetItemSchema = BudgetItemSchema;
export const timelineTaskSchema = TimelineTaskSchema;
export const vendorRequirementSchema = VendorRequirementSchema;
export const ideaItemSchema = IdeaItemSchema;
export const riskItemSchema = RiskItemSchema;
export const guestSchema = GuestSchema;
export const eventPlanSchema = EventPlanSchema;
export const corePlanSchema = CorePlanSchema;
export const timelineSectionSchema = TimelineSectionSchema;
export const vendorsSectionSchema = VendorsSectionSchema;
export const ideasSectionSchema = IdeasSectionSchema;
export const risksSectionSchema = RisksSectionSchema;

const GEMINI_REMOVED_KEYS = new Set([
  '$schema',
  'pattern',
  'minItems',
  'maxItems',
  'additionalProperties',
  '$ref',
  'definitions',
  '$defs',
]);

export function toGeminiSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  const definitions = {
    ...((jsonSchema.definitions as Record<string, unknown> | undefined) || {}),
    ...((jsonSchema.$defs as Record<string, unknown> | undefined) || {}),
  };

  const inline = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(inline);
    if (!value || typeof value !== 'object') return value;
    const source = value as Record<string, unknown>;
    if (typeof source.$ref === 'string') {
      const name = source.$ref.split('/').pop() || '';
      return inline(definitions[name] || {});
    }
    return Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => !GEMINI_REMOVED_KEYS.has(key))
        .map(([key, child]) => [key, inline(child)])
    );
  };

  return inline(jsonSchema) as Record<string, unknown>;
}

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const capText = (value: unknown, max: number, fallback = '') =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const enumValue = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const sanitizeDays = (value: unknown): EventDay[] =>
  (Array.isArray(value) ? value : []).slice(0, 10).map((item) => {
    const s = asObject(item);
    return {
      id: capText(s.id, 120, `day-${clamp(s.day_number, 1, 10, 1)}`),
      day_number: clamp(s.day_number, 1, 10, 1),
      title: capText(s.title, 120),
      date: s.date === undefined ? undefined : capText(s.date, 120),
      time_slot: s.time_slot === undefined ? undefined : capText(s.time_slot, 120),
      venue: s.venue === undefined ? undefined : capText(s.venue, 120),
      budget_allocated: s.budget_allocated === undefined ? undefined : clamp(s.budget_allocated, 0, 100000000, 0),
      dress_code: s.dress_code === undefined ? undefined : capText(s.dress_code, 120),
      notes: s.notes === undefined ? undefined : capText(s.notes, 500),
    };
  }).filter((d) => d.title.length > 0 && EventDaySchema.safeParse(d).success);

const sanitizeQuotes = (value: unknown): VendorQuote[] =>
  (Array.isArray(value) ? value : []).slice(0, 15).map((item, index) => {
    const s = asObject(item);
    return {
      id: capText(s.id, 120, `quote-${Date.now()}-${index}`),
      vendor_name: capText(s.vendor_name, 120),
      contact_person: s.contact_person === undefined ? undefined : capText(s.contact_person, 120),
      phone_or_email: s.phone_or_email === undefined ? undefined : capText(s.phone_or_email, 120),
      quote_amount: clamp(s.quote_amount, 0, 100000000, 0),
      inclusions: (Array.isArray(s.inclusions) ? s.inclusions : []).slice(0, 10).map((inc) => capText(inc, 250)).filter(Boolean),
      status: enumValue(s.status, ['received', 'shortlisted', 'selected', 'rejected'] as const, 'received'),
      rating: s.rating === undefined ? undefined : clamp(s.rating, 1, 5, 5),
      notes: s.notes === undefined ? undefined : capText(s.notes, 500),
    };
  }).filter((q) => q.vendor_name.length > 0 && VendorQuoteSchema.safeParse(q).success);

const sanitizeBudget = (value: unknown): BudgetItem[] => {
  const items = Array.isArray(value) ? value.slice(0, 12).map((item) => {
    const source = asObject(item);
    return {
      category: capText(source.category, 120),
      pct: clamp(source.pct, 0, 100, 0),
      locked: source.locked === true,
      amount: source.amount === undefined ? undefined : clamp(source.amount, 0, 100000000, 0),
      spent: clamp(source.spent, 0, 100000000, 0),
      day_number: source.day_number === undefined ? undefined : clamp(source.day_number, 1, 10, 1),
    };
  }) : [];
  return items.filter((item) => item.category.length > 0).filter((item) => BudgetItemSchema.safeParse(item).success);
};

const sanitizeTimeline = (value: unknown): TimelineTask[] =>
  (Array.isArray(value) ? value : []).slice(0, 30).map((item) => {
    const source = asObject(item);
    return {
      t_minus_days: clamp(source.t_minus_days, 0, 3650, 0),
      title: capText(source.title, 120),
      owner: capText(source.owner, 120),
      done: source.done === true,
      id: source.id === undefined ? undefined : capText(source.id, 120),
      target_date: source.target_date === undefined ? undefined : capText(source.target_date, 120),
      is_overdue: source.is_overdue === true,
      day_number: source.day_number === undefined ? undefined : clamp(source.day_number, 1, 10, 1),
      time_slot: source.time_slot === undefined ? undefined : capText(source.time_slot, 120),
    };
  }).filter((item) => TimelineTaskSchema.safeParse(item).success);

const sanitizeVendors = (value: unknown): VendorRequirement[] =>
  (Array.isArray(value) ? value : []).slice(0, 12).map((item) => {
    const source = asObject(item);
    const list = (candidate: unknown, max: number) =>
      (Array.isArray(candidate) ? candidate : []).slice(0, max).map((entry) => capText(entry, 1000)).filter(Boolean);
    return {
      type: capText(source.type, 120),
      est_low: clamp(source.est_low, 0, 100000000, 0),
      est_high: clamp(source.est_high, 0, 100000000, 0),
      questions: list(source.questions, 20),
      red_flags: list(source.red_flags, 20),
      outreach_message: capText(source.outreach_message, 1000),
      status: enumValue(source.status, ['todo', 'contacted', 'shortlisted', 'booked'] as const, 'todo'),
      quote: source.quote === undefined ? undefined : clamp(source.quote, 0, 100000000, 0),
      notes: source.notes === undefined ? undefined : capText(source.notes, 1000),
      quotes: sanitizeQuotes(source.quotes),
    };
  }).filter((item) => VendorRequirementSchema.safeParse(item).success);

const sanitizeIdeas = (value: unknown): IdeaItem[] =>
  (Array.isArray(value) ? value : []).slice(0, 20).map((item) => {
    const source = asObject(item);
    return {
      id: source.id === undefined ? undefined : capText(source.id, 120),
      category: capText(source.category, 120),
      title: capText(source.title, 120),
      description: capText(source.description, 1000),
      favorited: source.favorited === true,
      image_url: source.image_url === undefined ? undefined : capText(source.image_url, 250000),
      image_prompt: source.image_prompt === undefined ? undefined : capText(source.image_prompt, 1000),
      image_source: source.image_source === undefined ? undefined : enumValue(source.image_source, ['imagen', 'curated', 'custom'] as const, 'curated'),
    };
  }).filter((item) => IdeaItemSchema.safeParse(item).success);

const sanitizeRisks = (value: unknown): RiskItem[] =>
  (Array.isArray(value) ? value : []).slice(0, 6).map((item) => {
    const source = asObject(item);
    return {
      id: source.id === undefined ? undefined : capText(source.id, 120),
      title: capText(source.title, 180),
      category: enumValue(source.category, ['weather', 'vendor', 'health', 'legal', 'logistics', 'budget', 'cultural'] as const, 'logistics'),
      likelihood: enumValue(source.likelihood, ['low', 'medium', 'high'] as const, 'medium'),
      impact: enumValue(source.impact, ['low', 'medium', 'high'] as const, 'medium'),
      mitigation: capText(source.mitigation, 500),
      backup_plan: capText(source.backup_plan, 500),
      related_task_t_minus_days: source.related_task_t_minus_days === undefined
        ? undefined
        : clamp(source.related_task_t_minus_days, 0, 3650, 0),
    };
  }).filter((item) => RiskItemSchema.safeParse(item).success);

const sanitizeGuests = (value: unknown): Guest[] =>
  (Array.isArray(value) ? value : []).slice(0, 5000).map((item) => {
    const source = asObject(item);
    return {
      id: capText(source.id, 120),
      name: capText(source.name, 120),
      group: enumValue(source.group, ['family', 'friends', 'colleagues', 'other'] as const, 'other'),
      status: enumValue(source.status, ['invited', 'confirmed', 'declined'] as const, 'invited'),
      diet: enumValue(source.diet, ['veg', 'non-veg', 'jain', 'vegan'] as const, 'veg'),
      allergy_note: source.allergy_note === undefined ? undefined : capText(source.allergy_note, 240),
      plus_ones: clamp(source.plus_ones, 0, 10, 0),
    };
  }).filter((item) => GuestSchema.safeParse(item).success);

const sanitizePayments = (value: unknown): PaymentRecord[] =>
  (Array.isArray(value) ? value : []).slice(0, 100).map((item, index) => {
    const s = asObject(item);
    return {
      id: capText(s.id, 120, `pay-${Date.now()}-${index}`),
      category: capText(s.category, 120),
      amount: clamp(s.amount, 1, 100000000, 1),
      note: capText(s.note ?? '', 500),
      date: capText(s.date, 120, new Date().toISOString().slice(0, 10)),
    };
  }).filter((p) => p.category.length > 0 && PaymentRecordSchema.safeParse(p).success);

const sanitizeRunSheet = (value: unknown): RunSheetItem[] =>
  (Array.isArray(value) ? value : []).slice(0, 30).map((item) => {
    const s = asObject(item);
    return {
      id: s.id === undefined ? undefined : capText(s.id, 120),
      time: capText(s.time, 20, '12:00'),
      title: capText(s.title, 180),
      owner: capText(s.owner, 120),
    };
  }).filter((r) => r.title.length > 0 && RunSheetItemSchema.safeParse(r).success);

const DEFAULT_RISKS: RiskItem[] = [
  { id: 'weather-buffer', title: 'Weather disruption', category: 'weather', likelihood: 'medium', impact: 'high', mitigation: 'Confirm weather monitoring and shelter 7 days before the event.', backup_plan: 'Move activities indoors or under a covered setup.' },
  { id: 'vendor-delay', title: 'Vendor delay', category: 'vendor', likelihood: 'medium', impact: 'medium', mitigation: 'Confirm arrival windows and contact details 48 hours before setup.', backup_plan: 'Use a pre-approved backup vendor or simplify the setup.' },
  { id: 'budget-buffer', title: 'Budget overrun', category: 'budget', likelihood: 'low', impact: 'high', mitigation: 'Hold back a contingency buffer and approve final quotes in writing.', backup_plan: 'Reduce optional decor or entertainment before core services.' },
];

export function sanitizeDraft(raw: unknown, fallback?: EventPlan): EventPlan {
  const source = asObject(raw);
  const base = fallback || {
    title: 'Celebration Plan',
    event_type: 'celebration',
    event_date: '2026-01-01',
    guests: 1,
    total_budget: 10000,
    city: 'India',
    theme: 'Warm celebration',
    budget: [
      { category: 'Venue & Decor', pct: 60, locked: false, spent: 0 },
      { category: 'Catering', pct: 40, locked: false, spent: 0 },
    ],
    timeline: [],
    vendors: [],
    ideas: [],
    risks: DEFAULT_RISKS,
  } satisfies EventPlan;
  const budget = sanitizeBudget(source.budget);
  const safeBudget = budget.length >= 2
    ? budget
    : budget.length === 1
      ? [...budget, { category: 'Contingency', pct: 0, locked: false, spent: 0 }]
      : base.budget;
  const risks = sanitizeRisks(source.risks);
  const safeRisks = risks.length >= 3 ? risks : (fallback?.risks || DEFAULT_RISKS);
  const candidate = {
    ...base,
    ...source,
    title: capText(source.title, 120, base.title),
    event_type: capText(source.event_type, 120, base.event_type),
    event_date: capText(source.event_date, 120, base.event_date),
    guests: clamp(source.guests, 1, 5000, base.guests),
    total_budget: clamp(source.total_budget, 10000, 100000000, base.total_budget),
    city: capText(source.city, 120, base.city),
    theme: capText(source.theme, 120, base.theme),
    host_names: source.host_names === undefined ? base.host_names : capText(source.host_names, 200),
    event_days: source.event_days === undefined ? base.event_days : sanitizeDays(source.event_days),
    budget: safeBudget,
    timeline: sanitizeTimeline(source.timeline),
    vendors: sanitizeVendors(source.vendors),
    ideas: sanitizeIdeas(source.ideas),
    risks: safeRisks,
    guest_list: source.guest_list === undefined
      ? base.guest_list
      : sanitizeGuests(source.guest_list),
    payments: sanitizePayments(source.payments),
    runSheet: sanitizeRunSheet(source.runSheet ?? source.run_sheet),
    clarifying_question: source.clarifying_question == null ? null : capText(source.clarifying_question, 1000),
  };
  const result = EventPlanSchema.safeParse(candidate);
  return result.success ? result.data : EventPlanSchema.parse(base);
}

export type CorePlan = z.infer<typeof corePlanSchema>;
export type TimelineSection = z.infer<typeof timelineSectionSchema>;
export type VendorsSection = z.infer<typeof vendorsSectionSchema>;
export type IdeasSection = z.infer<typeof ideasSectionSchema>;
export type RisksSection = z.infer<typeof risksSectionSchema>;

export const planRequestSchema = z.object({
  brief: z.string().trim().min(1).max(500),
  language: z.enum(['en', 'hi', 'te', 'bn']).default('en'),
});

export const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  language: z.enum(['en', 'hi', 'te', 'bn']),
});

export const replanRequestSchema = z
  .object({
    currentPlan: eventPlanSchema.optional(),
    plan: eventPlanSchema.optional(),
    changeInstruction: z.string().trim().min(1).max(1000).optional(),
    instruction: z.string().trim().min(1).max(1000).optional(),
    language: z.enum(['en', 'hi', 'te', 'bn']).default('en'),
  })
  .refine(
    (data) => (Boolean(data.currentPlan || data.plan)) && (Boolean(data.changeInstruction || data.instruction)),
    {
      message: 'Must provide plan and instruction',
    }
  );

export const PlanPatchSchema = z.object({
  reason: z.string().min(1).max(500),
  changes: z
    .object({
      event_date: z.string().max(120).optional(),
      guests: z.number().int().min(1).max(5000).optional(),
      total_budget: z.number().min(10000).max(100000000).optional(),
      city: z.string().max(120).optional(),
      theme: z.string().max(120).optional(),
    })
    .default({}),
  budget_changes: z
    .array(
      z.object({
        category: z.string().min(1).max(120),
        new_pct: z.number().min(0).max(100),
      })
    )
    .default([]),
  tasks_added: z.array(timelineTaskSchema).default([]),
  tasks_removed: z.array(z.string().max(120)).default([]),
  tasks_modified: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        new_t_minus_days: z.number().int(),
      })
    )
    .default([]),
  vendors_added: z.array(vendorRequirementSchema).default([]),
  vendors_removed: z.array(z.string().max(120)).default([]),
  ideas_added: z.array(ideaItemSchema).default([]),
});

export const planPatchSchema = PlanPatchSchema;
export const paymentRecordSchema = PaymentRecordSchema;
export const runSheetItemSchema = RunSheetItemSchema;

export type EventDay = z.infer<typeof eventDaySchema>;
export type VendorQuote = z.infer<typeof vendorQuoteSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type TimelineTask = z.infer<typeof timelineTaskSchema>;
export type VendorRequirement = z.infer<typeof vendorRequirementSchema>;
export type IdeaItem = z.infer<typeof ideaItemSchema>;
export type RiskItem = z.infer<typeof riskItemSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
export type RunSheetItem = z.infer<typeof RunSheetItemSchema>;
export type EventPlan = z.infer<typeof eventPlanSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type ReplanRequest = z.infer<typeof replanRequestSchema>;
export type PlanPatch = z.infer<typeof planPatchSchema>;
