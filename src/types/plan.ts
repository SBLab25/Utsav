/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BudgetItem {
  category: string;
  pct: number; // percentage (0 to 100)
  locked: boolean;
  amount?: number; // calculated in INR
}

export interface TimelineTask {
  t_minus_days: number;
  title: string;
  owner: string;
  done: boolean;
  id?: string;
  target_date?: string;
  is_overdue?: boolean;
}

export interface VendorRequirement {
  type: string;
  est_low: number; // INR
  est_high: number; // INR
  questions: string[];
  red_flags: string[];
  outreach_message: string;
  status?: 'researching' | 'contacted' | 'shortlisted' | 'booked';
  notes?: string;
}

export interface IdeaItem {
  id?: string;
  category: 'theme' | 'menu' | 'decor' | 'entertainment' | 'invitation' | 'rsvp' | string;
  title: string;
  description: string;
  favorited?: boolean;
}

export interface EventPlan {
  id?: string;
  title: string;
  event_type: string;
  event_date: string; // ISO YYYY-MM-DD
  guests: number;
  total_budget: number; // INR
  city: string;
  theme: string;
  budget: BudgetItem[];
  timeline: TimelineTask[];
  vendors: VendorRequirement[];
  ideas: IdeaItem[];
  clarifying_question: string | null;
  timestamp?: number;
}

export interface PlanDiff {
  type: 'budget' | 'date' | 'guests' | 'city' | 'theme' | 'timeline' | 'vendor' | 'idea';
  summary: string;
  badge?: string;
  changeType: 'added' | 'removed' | 'modified';
}

export interface PlanHistoryItem {
  id: string;
  plan: EventPlan;
  timestamp: number;
  label: string;
  diffsFromPrevious?: PlanDiff[];
}
