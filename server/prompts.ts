/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from '@google/genai';

export const geminiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Celebration title e.g. Sister's Sangeet Plan" },
    event_type: { type: Type.STRING, description: "Category: wedding, sangeet, birthday, community, anniversary, corporate" },
    event_date: { type: Type.STRING, description: "ISO date format YYYY-MM-DD" },
    guests: { type: Type.INTEGER, description: "Estimated guest count" },
    total_budget: { type: Type.INTEGER, description: "Total budget in INR" },
    city: { type: Type.STRING, description: "City or location of event" },
    theme: { type: Type.STRING, description: "Celebration theme or aesthetic" },
    budget: {
      type: Type.ARRAY,
      description: "Breakdown of major expenditure categories",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category name" },
          pct: { type: Type.NUMBER, description: "Percentage of total budget allocated (e.g. 35)" },
          locked: { type: Type.BOOLEAN, description: "Default false" },
        },
        required: ["category", "pct"],
      },
    },
    timeline: {
      type: Type.ARRAY,
      description: "Chronological milestone tasks counted backward from event date (T-90, T-60, T-30, T-15, T-7, T-1, Day-of as 0)",
      items: {
        type: Type.OBJECT,
        properties: {
          t_minus_days: { type: Type.INTEGER, description: "Days before event (e.g. 90, 60, 30, 7, 0)" },
          title: { type: Type.STRING, description: "Task description" },
          owner: { type: Type.STRING, description: "Task owner or committee" },
          done: { type: Type.BOOLEAN, description: "Default false" },
        },
        required: ["t_minus_days", "title", "owner", "done"],
      },
    },
    vendors: {
      type: Type.ARRAY,
      description: "Vendor hiring guides per vendor category",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Vendor category name" },
          est_low: { type: Type.INTEGER, description: "Estimated low price in INR for this city and scale" },
          est_high: { type: Type.INTEGER, description: "Estimated high price in INR for this city and scale" },
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 4 crucial vetting questions to ask this vendor",
          },
          red_flags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 3 warning signs or red flags to watch out for",
          },
          outreach_message: {
            type: Type.STRING,
            description: "Ready-to-send WhatsApp / Email inquiry message",
          },
        },
        required: ["type", "est_low", "est_high", "questions", "red_flags", "outreach_message"],
      },
    },
    ideas: {
      type: Type.ARRAY,
      description: "Curated inspiration items: theme, menu, decor, entertainment, invitation, rsvp",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "One of: theme, menu, decor, entertainment, invitation, rsvp" },
          title: { type: Type.STRING, description: "Headline of the idea" },
          description: { type: Type.STRING, description: "Detailed description, dishes, playlist or copyable invitation / WhatsApp RSVP template" },
        },
        required: ["category", "title", "description"],
      },
    },
    clarifying_question: {
      type: Type.STRING,
      description: "If a crucial key field was missing or ambiguous from the brief, ask ONE clarifying question here, otherwise null",
    },
  },
  required: ["title", "event_type", "event_date", "guests", "total_budget", "city", "theme", "budget", "timeline", "vendors", "ideas"],
};

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
   Keep everything the user did NOT ask to change identical. Only adjust the parameters and downstream impacts requested by the user.
5. Ideas:
   Must provide creative inspirations across 'theme', 'menu', 'decor', 'entertainment', 'invitation' (formal invitation copy), and 'rsvp' (casual WhatsApp RSVP message).`;

export function getIntakePrompt(sanitizedBrief: string): string {
  return `Please create a comprehensive celebration event plan based on this user brief:
<<<USER_EVENT_BRIEF>>>
${sanitizedBrief}
<<<END_USER_EVENT_BRIEF>>>`;
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
