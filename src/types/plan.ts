/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  BudgetItem,
  TimelineTask,
  VendorRequirement,
  IdeaItem,
  RiskItem,
  EventPlan,
  PlanPatch,
} from '../schemas/plan.ts';

export interface PlanDiff {
  type: 'budget' | 'date' | 'guests' | 'city' | 'theme' | 'timeline' | 'vendor' | 'idea' | 'risk';
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
