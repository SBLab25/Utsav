/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { EventPlanSchema, toGeminiSchema } from './plan.ts';

const money = z.number().int().min(1).max(100000000);
const category = z.string().trim().min(1).max(120);
const taskTitle = z.string().trim().min(1).max(120);

export const MoveBudgetSchema = z.object({
  op: z.literal('moveBudget'),
  from: category,
  to: category,
  amount: money,
});

export const LogSpendSchema = z.object({
  op: z.literal('logSpend'),
  category,
  amount: money,
});

export const AddTaskSchema = z.object({
  op: z.literal('addTask'),
  title: taskTitle,
  owner: z.string().trim().min(1).max(120),
  t_minus_days: z.number().int().min(0).max(3650),
});

export const ToggleTaskSchema = z.object({
  op: z.literal('toggleTask'),
  title: taskTitle,
});

export const AddVendorSchema = z.object({
  op: z.literal('addVendor'),
  type: category,
  est_low: z.number().int().nonnegative().max(100000000),
  est_high: z.number().int().nonnegative().max(100000000),
  questions: z.array(z.string().trim().min(1).max(500)).max(10),
});

export const SetVendorStatusSchema = z.object({
  op: z.literal('setVendorStatus'),
  type: category,
  status: z.enum(['todo', 'contacted', 'shortlisted', 'booked']),
  quote: z.number().int().nonnegative().max(100000000).optional(),
});

export const AddIdeaSchema = z.object({
  op: z.literal('addIdea'),
  category: category,
  title: taskTitle,
  description: z.string().trim().min(1).max(1000),
});

export const SetGuestsSchema = z.object({
  op: z.literal('setGuests'),
  guests: z.number().int().min(1).max(5000),
});

export const SetBudgetSchema = z.object({
  op: z.literal('setBudget'),
  total_budget: z.number().int().min(10000).max(100000000),
});

export const PlanChangeSchema = z.discriminatedUnion('op', [
  MoveBudgetSchema,
  LogSpendSchema,
  AddTaskSchema,
  ToggleTaskSchema,
  AddVendorSchema,
  SetVendorStatusSchema,
  AddIdeaSchema,
  SetGuestsSchema,
  SetBudgetSchema,
]);

export const ChatTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().max(1000),
});

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(300),
  plan: EventPlanSchema,
  history: z.array(ChatTurnSchema).max(6).default([]),
});

export const planChangeSchema = PlanChangeSchema;
export const chatRequestSchema = ChatRequestSchema;

export type PlanChange = z.infer<typeof PlanChangeSchema>;
export type ChatTurn = z.infer<typeof ChatTurnSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const geminiPlanChangeSchemas = {
  moveBudget: toGeminiSchema(MoveBudgetSchema),
  logSpend: toGeminiSchema(LogSpendSchema),
  addTask: toGeminiSchema(AddTaskSchema),
  toggleTask: toGeminiSchema(ToggleTaskSchema),
  addVendor: toGeminiSchema(AddVendorSchema),
  setVendorStatus: toGeminiSchema(SetVendorStatusSchema),
  addIdea: toGeminiSchema(AddIdeaSchema),
  setGuests: toGeminiSchema(SetGuestsSchema),
  setBudget: toGeminiSchema(SetBudgetSchema),
} as const;
