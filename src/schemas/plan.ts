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
  clarifying_question: z.string().max(1000).nullable().optional(),
  timestamp: z.number().optional(),
});

export const planRequestSchema = z.object({
  brief: z.string().trim().min(1).max(500),
});

export const replanRequestSchema = z
  .object({
    currentPlan: eventPlanSchema.optional(),
    plan: eventPlanSchema.optional(),
    changeInstruction: z.string().trim().min(1).max(1000).optional(),
    instruction: z.string().trim().min(1).max(1000).optional(),
  })
  .refine(
    (data) => (Boolean(data.currentPlan || data.plan)) && (Boolean(data.changeInstruction || data.instruction)),
    {
      message: 'Must provide plan and instruction',
    }
  );

export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type TimelineTask = z.infer<typeof timelineTaskSchema>;
export type VendorRequirement = z.infer<typeof vendorRequirementSchema>;
export type IdeaItem = z.infer<typeof ideaItemSchema>;
export type EventPlan = z.infer<typeof eventPlanSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type ReplanRequest = z.infer<typeof replanRequestSchema>;
