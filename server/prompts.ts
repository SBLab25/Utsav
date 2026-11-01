/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EventPlanSchema,
  CorePlanSchema,
  TimelineSectionSchema,
  VendorsSectionSchema,
  IdeasSectionSchema,
  RisksSectionSchema,
  PlanPatchSchema,
  toGeminiSchema,
} from '../src/schemas/plan.ts';

export const geminiResponseSchema = toGeminiSchema(EventPlanSchema);

export const geminiCoreResponseSchema = toGeminiSchema(CorePlanSchema);
export const geminiTimelineResponseSchema = toGeminiSchema(TimelineSectionSchema);
export const geminiVendorsResponseSchema = toGeminiSchema(VendorsSectionSchema);
export const geminiIdeasResponseSchema = toGeminiSchema(IdeasSectionSchema);
export const geminiRisksResponseSchema = toGeminiSchema(RisksSectionSchema);
export const geminiPlanPatchResponseSchema = toGeminiSchema(PlanPatchSchema);

export const SYSTEM_INSTRUCTION = `You are Utsav, an expert Indian celebration and event planner with deep cultural, regional, and logistical expertise.
Plan only celebrations and events (weddings, sangeets, haldi, mehendi, receptions, birthdays, anniversaries, community/RWA festivals like Diwali/Holi/Pooja, housewarmings, college fests, corporate celebrations). Politely decline other unrelated topics with a polite message.
Return ONLY JSON matching the requested schema. Do NOT enclose in markdown backticks or commentary.

Key Guidelines:
1. Intake Extraction:
   Extract event_type, date (ISO YYYY-MM-DD; if relative or year omitted assume next sensible date), guests, total_budget (INR default; parse values like "6L", "6 Lakh", "1.5L", "50k"), city, theme.
   If a key field is missing (e.g. date or guest count), ask ONE friendly clarifying question in 'clarifying_question' and continue with sensible defaults for that event type.
2. Culture-aware planning:
   - For weddings & sangeets: reflect traditional multi-day events (haldi, mehendi, sangeet, wedding ceremony, reception), regional rituals, vibrant food items (chaat counters, regional delicacies), DJ & choreography setups.
   - For community / RWA events: focus on police/sound permissions, volunteer rosters, resident contributions, crowd management, eco-friendly diyas/decor, prasad or potluck counters.
   - For birthdays/anniversaries: focus on personalized decor, cake design, interactive games, photo booths, curated playlists.
3. Realistic Vendor Pricing:
   Vendor price ranges must be realistic for the stated city (Tier 1 like Mumbai/Delhi vs Tier 2 like Vizag/Pune/Indore) and overall budget.
4. When re-planning:
   Return ONLY the precise diffs in PlanPatch. Keep everything the user did NOT ask to change untouched.
5. Ideas:
   Must provide creative inspirations across 'theme', 'menu', 'decor', 'entertainment', 'invitation' (formal invitation copy), and 'rsvp' (casual WhatsApp RSVP message).`;

export type ContentLanguage = 'en' | 'hi' | 'te' | 'bn';
export const LANGUAGE_NAMES: Record<ContentLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  bn: 'Bengali',
};

export function getSystemInstruction(language: ContentLanguage = 'en'): string {
  return `${SYSTEM_INSTRUCTION}

Write user-facing text in ${LANGUAGE_NAMES[language]}; for Hindi, Telugu and Bengali use native script and a natural, warm tone for family events. Keep JSON keys, category identifiers, enum values, dates, currency values, counts and other numbers in English/Arabic notation.`;
}

export function getIntakePrompt(sanitizedBrief: string, language: ContentLanguage = 'en'): string {
  return `Please create a comprehensive celebration event plan based on this user brief:
<<<USER_EVENT_BRIEF>>>
Language preference: ${LANGUAGE_NAMES[language]}
${sanitizedBrief}
<<<END_USER_EVENT_BRIEF>>>`;
}

export function createConcisePlanForReplan(plan: any): object {
  return {
    title: plan.title,
    event_type: plan.event_type,
    event_date: plan.event_date,
    guests: plan.guests,
    total_budget: plan.total_budget,
    city: plan.city,
    theme: plan.theme,
    budget: Array.isArray(plan.budget)
      ? plan.budget.map((b: any) => ({ category: b.category, pct: b.pct, locked: Boolean(b.locked) }))
      : [],
    timeline: Array.isArray(plan.timeline)
      ? plan.timeline.map((t: any) => ({ t_minus_days: t.t_minus_days, title: t.title, owner: t.owner }))
      : [],
    vendors: Array.isArray(plan.vendors)
      ? plan.vendors.map((v: any) => ({ type: v.type, est_low: v.est_low, est_high: v.est_high }))
      : [],
    ideas: Array.isArray(plan.ideas)
      ? plan.ideas.map((i: any) => ({ category: i.category, title: i.title }))
      : [],
    risks: Array.isArray(plan.risks)
      ? plan.risks.map((r: any) => ({
          title: r.title,
          category: r.category,
          likelihood: r.likelihood,
          impact: r.impact,
          related_task_t_minus_days: r.related_task_t_minus_days,
        }))
      : [],
  };
}

export function getPlanPatchPrompt(concisePlanJson: string, sanitizedInstruction: string): string {
  return `Current celebration plan summary:
<<<CURRENT_PLAN_SUMMARY>>>
${concisePlanJson}
<<<END_CURRENT_PLAN_SUMMARY>>>

User change request:
<<<USER_CHANGE_REQUEST>>>
${sanitizedInstruction}
<<<END_USER_CHANGE_REQUEST>>>

Analyze the user's change request and output ONLY a PlanPatch describing the precise deltas needed to fulfill the request.
Do NOT regenerate untouched elements. Omit unchanged fields in 'changes'.
Explain the changes in 'reason'.`;
}

export function getReplanPrompt(currentPlanJson: string, sanitizedInstruction: string): string {
  return `Existing celebration plan JSON:
<<<EXISTING_PLAN_JSON>>>
${currentPlanJson}
<<<END_EXISTING_PLAN_JSON>>>

User requested change:
<<<USER_CHANGE_INSTRUCTION>>>
${sanitizedInstruction}
<<<END_USER_CHANGE_INSTRUCTION>>>

Return the COMPLETE updated EventPlan in valid JSON. Keep everything the user did NOT request to change identical.`;
}

export function getCorePrompt(sanitizedBrief: string): string {
  return `Please create the core celebration details and budget allocation based on this user brief:
<<<USER_EVENT_BRIEF>>>
${sanitizedBrief}
<<<END_USER_EVENT_BRIEF>>>

Extract title, event_type, event_date, guests, total_budget, city, theme, and 4-7 budget categories summing to 100%.`;
}

export function getTimelinePrompt(core: any): string {
  return `Celebration context:
Event: "${core.title}" (${core.event_type}) on ${core.event_date} in ${core.city} with ${core.guests} guests, budget ${core.total_budget} INR, theme "${core.theme}".

Generate 5-8 chronological milestone tasks counted backward from the event date (e.g. T-90, T-60, T-30, T-15, T-7, T-1, Day 0).
Assign clear owners (e.g. Lead Planner, Family Lead, Decor Committee, DJ Lead).`;
}

export function getVendorsPrompt(core: any): string {
  return `Celebration context:
Event: "${core.title}" (${core.event_type}) in ${core.city} with ${core.guests} guests, total budget ${core.total_budget} INR, theme "${core.theme}".

Generate 3-5 vendor hiring guides tailored to this event and city. Include realistic INR price ranges, crucial vetting questions, red flags, and ready-to-send outreach messages.`;
}

export function getIdeasPrompt(core: any): string {
  return `Celebration context:
Event: "${core.title}" (${core.event_type}) in ${core.city} with ${core.guests} guests, theme "${core.theme}".

Generate 5-6 curated ideas across categories: 'theme', 'menu', 'decor', 'entertainment', 'invitation' (formal invite text), and 'rsvp' (WhatsApp RSVP text).`;
}

export function getRisksPrompt(core: any): string {
  return `Celebration context:
Event: "${core.title}" (${core.event_type}) on ${core.event_date} in ${core.city} with ${core.guests} guests, budget ${core.total_budget} INR, theme "${core.theme}".

Identify 3-6 risks for this event. Consider the city, season and date (monsoon, heat, festival clashes, peak wedding-season vendor shortages, noise and permission limits for community events), guest count, and how much budget buffer remains after the allocation.
Use only these categories: weather, vendor, health, legal, logistics, budget, cultural.
For every risk return a concise title, likelihood, impact, a concrete mitigation, a practical backup plan, and related_task_t_minus_days when a preparatory milestone would help.`;
}
