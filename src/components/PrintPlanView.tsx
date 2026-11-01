/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { EventPlan } from '../types/plan.ts';
import { formatINR, getTaskTargetDate } from '../utils/planLogic.ts';

interface PrintPlanViewProps {
  plan: EventPlan;
}

export const PrintPlanView: React.FC<PrintPlanViewProps> = ({ plan }) => (
  <section className="print-plan mt-8" aria-label="Printable celebration plan">
    <header>
      <h1>{plan.title}</h1>
      <p>{plan.event_type} · {plan.city} · {plan.event_date} · {plan.guests} guests · {formatINR(plan.total_budget)}</p>
      <p>Theme: {plan.theme}</p>
    </header>

    <h2>Budget</h2>
    <table><thead><tr><th>Category</th><th>Percent</th><th>Amount</th></tr></thead><tbody>
      {plan.budget.map((item) => <tr key={item.category}><td>{item.category}</td><td>{item.pct}%</td><td>{formatINR(item.amount || (item.pct / 100) * plan.total_budget)}</td></tr>)}
    </tbody></table>

    <h2>Timeline</h2>
    <table><thead><tr><th>When</th><th>Task</th><th>Owner</th><th>Status</th></tr></thead><tbody>
      {plan.timeline.map((task, index) => {
        const { dateStr } = getTaskTargetDate(plan.event_date, task.t_minus_days);
        return <tr key={`${task.title}-${index}`}><td>T-{task.t_minus_days} · {dateStr}</td><td>{task.title}</td><td>{task.owner}</td><td>{task.done ? 'Complete' : 'Pending'}</td></tr>;
      })}
    </tbody></table>

    <h2>Vendors</h2>
    <table><thead><tr><th>Type</th><th>Estimated range</th><th>Questions</th></tr></thead><tbody>
      {plan.vendors.map((vendor) => <tr key={vendor.type}><td>{vendor.type}</td><td>{formatINR(vendor.est_low)} – {formatINR(vendor.est_high)}</td><td>{vendor.questions.join('; ')}</td></tr>)}
    </tbody></table>

    <h2>Ideas</h2>
    <ul>{plan.ideas.map((idea, index) => <li key={`${idea.title}-${index}`}><strong>{idea.title}</strong> ({idea.category}): {idea.description}</li>)}</ul>

    <h2>Risks</h2>
    <table><thead><tr><th>Risk</th><th>Likelihood / impact</th><th>Mitigation</th><th>Backup</th></tr></thead><tbody>
      {(plan.risks || []).map((risk, index) => <tr key={`${risk.title}-${index}`}><td>{risk.title}</td><td>{risk.likelihood} / {risk.impact}</td><td>{risk.mitigation}</td><td>{risk.backup_plan}</td></tr>)}
    </tbody></table>
  </section>
);

