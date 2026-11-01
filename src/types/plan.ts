/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  EventDay,
  VendorQuote,
  BudgetItem,
  TimelineTask,
  VendorRequirement,
  IdeaItem,
  RiskItem,
  Guest,
  PaymentRecord,
  RunSheetItem,
  EventPlan,
  PlanPatch,
} from '../schemas/plan.ts';

export type { PlanChange } from '../schemas/changes.ts';

export interface PlanDiff {
  type: 'budget' | 'date' | 'guests' | 'city' | 'theme' | 'timeline' | 'vendor' | 'idea' | 'risk' | 'day' | 'quote';
  summary: string;
  badge?: string;
  changeType: 'added' | 'removed' | 'modified';
}

export interface PlanHistoryItem {
  id: string;
  plan: import('../schemas/plan.ts').EventPlan;
  timestamp: number;
  label: string;
  diffsFromPrevious?: PlanDiff[];
}
