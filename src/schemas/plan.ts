/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const budgetItemSchema = z.object({
  category: z.string().min(1).max(120),
  pct: z.number().min(0).max(100),
  locked: z.boolean().default(false),
  amount: z.number().optional(),
});

export const timelineTaskSchema = z.object({
  t_minus_days: z.number().int(),
  title: z.string().min(1).max(120),
  owner: z.string().max(120),
  done: z.boolean().default(false),
  id: z.string().max(120).optional(),
  target_date: z.string().max(120).optional(),
  is_overdue: z.boolean().optional(),
});

export const vendorRequirementSchema = z.object({
  type: z.string().min(1).max(120),
  est_low: z.number().nonnegative(),
  est_high: z.number().nonnegative(),
  questions: z.array(z.string().max(1000)).max(20),
  red_flags: z.array(z.string().max(1000)).max(20),
  outreach_message: z.string().max(1000),
  status: z.enum(['researching', 'contacted', 'shortlisted', 'booked']).optional(),
  notes: z.string().max(1000).optional(),
});

export const ideaItemSchema = z.object({
  id: z.string().max(120).optional(),
  category: z.string().max(120),
  title: z.string().min(1).max(120),
  description: z.string().max(1000),
  favorited: z.boolean().optional(),
});

export const riskItemSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().min(1).max(180),
  category: z.enum(['weather', 'vendor', 'health', 'legal', 'logistics', 'budget', 'cultural']),
  likelihood: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1).max(500),
  backup_plan: z.string().min(1).max(500),
  related_task_t_minus_days: z.number().int().min(0).optional(),
});

export const guestSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  group: z.enum(['family', 'friends', 'colleagues', 'other']),
  status: z.enum(['invited', 'confirmed', 'declined']),
  diet: z.enum(['veg', 'non-veg', 'jain', 'vegan']),
  allergy_note: z.string().max(240).optional(),
  plus_ones: z.number().int().min(0).max(10).default(0),
});

export const eventPlanSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().min(1).max(120),
  event_type: z.string().min(1).max(120),
  event_date: z.string().max(120),
  guests: z.number().int().min(1).max(5000),
  total_budget: z.number().min(10000).max(100000000),
  city: z.string().max(120),
  theme: z.string().max(120),
  budget: z.array(budgetItemSchema).min(2).max(12),
  timeline: z.array(timelineTaskSchema).max(30),
  vendors: z.array(vendorRequirementSchema).max(12),
  ideas: z.array(ideaItemSchema).max(20),
  risks: z.array(riskItemSchema).min(3).max(6),
  guest_list: z.array(guestSchema).max(5000).optional(),
  clarifying_question: z.string().max(1000).nullable().optional(),
  timestamp: z.number().optional(),
});

export const corePlanSchema = z.object({
  title: z.string().min(1).max(120),
  event_type: z.string().min(1).max(120),
  event_date: z.string().max(120),
  guests: z.number().int().min(1).max(5000),
  total_budget: z.number().min(10000).max(100000000),
  city: z.string().max(120),
  theme: z.string().max(120),
  budget: z.array(budgetItemSchema).min(2).max(12),
  clarifying_question: z.string().max(1000).nullable().optional(),
});

export const timelineSectionSchema = z.object({
  timeline: z.array(timelineTaskSchema).max(30),
});

export const vendorsSectionSchema = z.object({
  vendors: z.array(vendorRequirementSchema).max(12),
});

export const ideasSectionSchema = z.object({
  ideas: z.array(ideaItemSchema).max(20),
});

export const risksSectionSchema = z.object({
  risks: z.array(riskItemSchema).min(3).max(6),
});

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

export const planPatchSchema = z.object({
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

export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type TimelineTask = z.infer<typeof timelineTaskSchema>;
export type VendorRequirement = z.infer<typeof vendorRequirementSchema>;
export type IdeaItem = z.infer<typeof ideaItemSchema>;
export type RiskItem = z.infer<typeof riskItemSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type EventPlan = z.infer<typeof eventPlanSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type ReplanRequest = z.infer<typeof replanRequestSchema>;
export type PlanPatch = z.infer<typeof planPatchSchema>;
