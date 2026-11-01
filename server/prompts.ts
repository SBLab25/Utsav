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
    risks: {
      type: Type.ARRAY,
      description: "Logistical, weather, vendor, and guest management risks with practical mitigation strategies",
      items: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING, description: "Description of the potential risk or bottleneck" },
          mitigation: { type: Type.STRING, description: "Actionable contingency plan or preventive measure" },
          severity: { type: Type.STRING, description: "One of: low, medium, high" },
        },
        required: ["risk", "mitigation", "severity"],
      },
    },
    clarifying_question: {
      type: Type.STRING,
      description: "If a crucial key field was missing or ambiguous from the brief, ask ONE clarifying question here, otherwise null",
    },
  },
  required: ["title", "event_type", "event_date", "guests", "total_budget", "city", "theme", "budget", "timeline", "vendors", "ideas"],
};

export const geminiCoreResponseSchema = {
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
      description: "Breakdown of 4-7 major expenditure categories summing to 100%",
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
    clarifying_question: {
      type: Type.STRING,
      description: "If a crucial key field was missing or ambiguous from the brief, ask ONE clarifying question here, otherwise null",
    },
  },
  required: ["title", "event_type", "event_date", "guests", "total_budget", "city", "theme", "budget"],
};

export const geminiTimelineResponseSchema = {
  type: Type.OBJECT,
  properties: {
    timeline: {
      type: Type.ARRAY,
      description: "5-8 milestone tasks counted backward from event date (e.g. T-90, T-60, T-30, T-15, T-7, T-1, Day 0)",
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
  },
  required: ["timeline"],
};

export const geminiVendorsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    vendors: {
      type: Type.ARRAY,
      description: "3-5 essential vendor categories tailored to the event",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Vendor category name" },
          est_low: { type: Type.INTEGER, description: "Estimated low price in INR" },
          est_high: { type: Type.INTEGER, description: "Estimated high price in INR" },
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 to 3 vetting questions",
          },
          red_flags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 warning signs",
          },
          outreach_message: {
            type: Type.STRING,
            description: "Ready-to-send inquiry message",
          },
        },
        required: ["type", "est_low", "est_high", "questions", "red_flags", "outreach_message"],
      },
    },
  },
  required: ["vendors"],
};

export const geminiIdeasResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description: "5-6 curated ideas across theme, menu, decor, entertainment, invitation, rsvp",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "theme, menu, decor, entertainment, invitation, or rsvp" },
          title: { type: Type.STRING, description: "Headline of the idea" },
          description: { type: Type.STRING, description: "Creative details, menu items, or template copy" },
        },
        required: ["category", "title", "description"],
      },
    },
  },
  required: ["ideas"],
};

export const geminiRisksResponseSchema = {
  type: Type.OBJECT,
  properties: {
    risks: {
      type: Type.ARRAY,
      description: "3-5 event management risks with concrete mitigation strategies",
      items: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING, description: "Description of the risk (e.g. weather, vendor delay, noise curfew, parking, food shortfall)" },
          mitigation: { type: Type.STRING, description: "Practical step to prevent or manage the risk" },
          severity: { type: Type.STRING, description: "low, medium, or high" },
        },
        required: ["risk", "mitigation", "severity"],
      },
    },
  },
  required: ["risks"],
};

export const geminiPlanPatchResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reason: {
      type: Type.STRING,
      description: "A concise one-line explanation of what is changing and why.",
    },
    changes: {
      type: Type.OBJECT,
      description: "Top-level fields that are changing (omit any field that is NOT changing)",
      properties: {
        event_date: { type: Type.STRING, description: "New ISO date format YYYY-MM-DD if date changed" },
        guests: { type: Type.INTEGER, description: "New estimated guest count if changed" },
        total_budget: { type: Type.INTEGER, description: "New total budget in INR if changed" },
        city: { type: Type.STRING, description: "New city if changed" },
        theme: { type: Type.STRING, description: "New theme if changed" },
      },
    },
    budget_changes: {
      type: Type.ARRAY,
      description: "List of budget categories with modified percentage",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category name" },
          new_pct: { type: Type.NUMBER, description: "New percentage allocation" },
        },
        required: ["category", "new_pct"],
      },
    },
    tasks_added: {
      type: Type.ARRAY,
      description: "New milestone tasks to add to timeline",
      items: {
        type: Type.OBJECT,
        properties: {
          t_minus_days: { type: Type.INTEGER, description: "Days before event" },
          title: { type: Type.STRING, description: "Task description" },
          owner: { type: Type.STRING, description: "Task owner or committee" },
          done: { type: Type.BOOLEAN, description: "Default false" },
        },
        required: ["t_minus_days", "title", "owner", "done"],
      },
    },
    tasks_removed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Titles of milestone tasks to remove",
    },
    tasks_modified: {
      type: Type.ARRAY,
      description: "Milestone tasks whose t_minus_days changed",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Existing task title" },
          new_t_minus_days: { type: Type.INTEGER, description: "Updated t_minus_days" },
        },
        required: ["title", "new_t_minus_days"],
      },
    },
    vendors_added: {
      type: Type.ARRAY,
      description: "New vendor categories to add",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          est_low: { type: Type.INTEGER },
          est_high: { type: Type.INTEGER },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
          outreach_message: { type: Type.STRING },
        },
        required: ["type", "est_low", "est_high", "questions", "red_flags", "outreach_message"],
      },
    },
    vendors_removed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Vendor types to remove",
    },
    ideas_added: {
      type: Type.ARRAY,
      description: "New celebration ideas to add",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["category", "title", "description"],
      },
    },
  },
  required: ["reason"],
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
   Return ONLY the precise diffs in PlanPatch. Keep everything the user did NOT ask to change untouched.
5. Ideas:
   Must provide creative inspirations across 'theme', 'menu', 'decor', 'entertainment', 'invitation' (formal invitation copy), and 'rsvp' (casual WhatsApp RSVP message).`;

export function getIntakePrompt(sanitizedBrief: string): string {
  return `Please create a comprehensive celebration event plan based on this user brief:
<<<USER_EVENT_BRIEF>>>
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

Identify 3-5 potential logistical, weather, vendor, crowd or timeline risks for this event, along with actionable, practical mitigation steps and severity ('low', 'medium', 'high').`;
}

