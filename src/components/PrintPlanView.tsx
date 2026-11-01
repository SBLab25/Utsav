/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { EventPlan, EventDay } from '../types/plan.ts';
import {
  formatINR,
  getTaskTargetDate,
  deriveBudgetItemSpent,
  sortRunSheet,
  generateDefaultRunSheet,
} from '../utils/planLogic.ts';

interface PrintPlanViewProps {
  plan: EventPlan;
}

export const PrintPlanView: React.FC<PrintPlanViewProps> = ({ plan }) => (
  <section className="print-plan mt-8 text-stone-900" aria-label="Printable celebration plan">
    {/* Branded Header */}
    <header className="border-b-2 border-stone-800 pb-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-stone-500">
            UTSAV CELEBRATION BLUEPRINT · CONFIDENTIAL
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-950 mt-1">
            {plan.title}
          </h1>
          {plan.host_names && (
            <p className="text-sm font-serif italic text-stone-700 mt-0.5">
              Organized with love by: {plan.host_names}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-stone-100 border border-stone-300 rounded">
            {plan.city || 'India'}
          </span>
          <p className="text-xs font-mono mt-1 text-stone-600">
            Date: {plan.event_date}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-200 grid grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-stone-500 block">Event Type</span>
          <span className="font-semibold capitalize">{plan.event_type}</span>
        </div>
        <div>
          <span className="text-stone-500 block">Guest Count</span>
          <span className="font-semibold">{plan.guests} guests</span>
        </div>
        <div>
          <span className="text-stone-500 block">Total Budget</span>
          <span className="font-semibold font-mono">{formatINR(plan.total_budget)}</span>
        </div>
        <div>
          <span className="text-stone-500 block">Theme & Aesthetic</span>
          <span className="font-semibold">{plan.theme}</span>
        </div>
      </div>
    </header>

    {/* Multi-Day Celebration Schedule (if configured) */}
    {plan.event_days && plan.event_days.length > 0 && (
      <div className="mb-6">
        <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
          Celebration Itinerary ({plan.event_days.length} Days)
        </h2>
        <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
          <thead className="bg-stone-100">
            <tr>
              <th className="border border-stone-300 p-2">Day</th>
              <th className="border border-stone-300 p-2">Event Title</th>
              <th className="border border-stone-300 p-2">Time Slot</th>
              <th className="border border-stone-300 p-2">Venue</th>
              <th className="border border-stone-300 p-2">Dress Code</th>
              <th className="border border-stone-300 p-2 text-right">Allocated</th>
            </tr>
          </thead>
          <tbody>
            {plan.event_days.map((day: EventDay) => (
              <tr key={day.id}>
                <td className="border border-stone-300 p-2 font-bold font-mono">Day {day.day_number}</td>
                <td className="border border-stone-300 p-2 font-semibold">{day.title}</td>
                <td className="border border-stone-300 p-2 font-mono">{day.time_slot || '—'}</td>
                <td className="border border-stone-300 p-2">{day.venue || '—'}</td>
                <td className="border border-stone-300 p-2 italic">{day.dress_code || '—'}</td>
                <td className="border border-stone-300 p-2 font-mono text-right">
                  {day.budget_allocated ? formatINR(day.budget_allocated) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* Budget Table with Planned, Spent, Remaining */}
    {(() => {
      const effectiveBudget = deriveBudgetItemSpent(plan.budget, plan.payments || []);
      const totalPlanned = effectiveBudget.reduce(
        (sum, b) => sum + (b.amount || Math.round((b.pct / 100) * plan.total_budget)),
        0
      );
      const totalSpent = effectiveBudget.reduce((sum, b) => sum + (b.spent || 0), 0);
      const totalRemaining = totalPlanned - totalSpent;
      const isOverrun = totalSpent > totalPlanned;

      return (
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-2 border-b border-stone-300 pb-1">
            <h2 className="text-base font-serif font-bold text-stone-900">
              Budget Allocation & Spend Tracker
            </h2>
            <span className="text-xs font-mono font-bold">
              Status: {isOverrun ? 'OVER BUDGET' : 'ON TRACK'}
            </span>
          </div>
          <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
            <thead className="bg-stone-100">
              <tr>
                <th className="border border-stone-300 p-2">Category</th>
                <th className="border border-stone-300 p-2">Sub-Event</th>
                <th className="border border-stone-300 p-2 text-right">Planned</th>
                <th className="border border-stone-300 p-2 text-right">Spent</th>
                <th className="border border-stone-300 p-2 text-right">Remaining</th>
                <th className="border border-stone-300 p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {effectiveBudget.map((item) => {
                const planned = item.amount || Math.round((item.pct / 100) * plan.total_budget);
                const spent = item.spent || 0;
                const rem = planned - spent;
                return (
                  <tr key={item.category}>
                    <td className="border border-stone-300 p-2 font-medium">{item.category}</td>
                    <td className="border border-stone-300 p-2 font-mono">
                      {item.day_number ? `Day ${item.day_number}` : 'Overall / Shared'}
                    </td>
                    <td className="border border-stone-300 p-2 text-right font-mono font-semibold">
                      {formatINR(planned)}
                    </td>
                    <td className="border border-stone-300 p-2 text-right font-mono">
                      {formatINR(spent)}
                    </td>
                    <td className={`border border-stone-300 p-2 text-right font-mono font-semibold ${rem < 0 ? 'text-red-700' : ''}`}>
                      {rem < 0 ? `-₹${Math.abs(rem).toLocaleString('en-IN')}` : formatINR(rem)}
                    </td>
                    <td className="border border-stone-300 p-2 text-center text-[10px]">
                      {rem < 0 ? '⚠️ Over budget' : item.locked ? '🔒 Locked' : 'On Track'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-100 font-bold font-mono">
              <tr>
                <td className="border border-stone-300 p-2" colSpan={2}>Total ({isOverrun ? 'Over Budget' : 'On Track'})</td>
                <td className="border border-stone-300 p-2 text-right">{formatINR(totalPlanned)}</td>
                <td className="border border-stone-300 p-2 text-right">{formatINR(totalSpent)}</td>
                <td className={`border border-stone-300 p-2 text-right ${totalRemaining < 0 ? 'text-red-700' : ''}`}>
                  {totalRemaining < 0 ? `-₹${Math.abs(totalRemaining).toLocaleString('en-IN')}` : formatINR(totalRemaining)}
                </td>
                <td className="border border-stone-300 p-2 text-center text-xs">
                  {isOverrun ? 'OVER BUDGET' : 'ON TRACK'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    })()}

    {/* Reverse Timeline */}
    <div className="mb-6">
      <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
        Reverse Milestone Timeline
      </h2>
      <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
        <thead className="bg-stone-100">
          <tr>
            <th className="border border-stone-300 p-2">Timeline Marker</th>
            <th className="border border-stone-300 p-2">Target Date</th>
            <th className="border border-stone-300 p-2">Action Milestone</th>
            <th className="border border-stone-300 p-2">Owner</th>
            <th className="border border-stone-300 p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {plan.timeline.map((task, index) => {
            const { dateStr } = getTaskTargetDate(plan.event_date, task.t_minus_days);
            return (
              <tr key={`${task.title}-${index}`}>
                <td className="border border-stone-300 p-2 font-mono font-bold">
                  {task.t_minus_days === 0
                    ? `Day-of (${task.day_number ? `Day ${task.day_number}` : 'Event'})`
                    : `T-${task.t_minus_days} days`}
                </td>
                <td className="border border-stone-300 p-2 font-mono">{dateStr}</td>
                <td className="border border-stone-300 p-2 font-medium">
                  {task.title} {task.time_slot ? `[${task.time_slot}]` : ''}
                </td>
                <td className="border border-stone-300 p-2">{task.owner}</td>
                <td className="border border-stone-300 p-2 text-center font-mono font-semibold">
                  {task.done ? '✓ DONE' : 'PENDING'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Day-of Run Sheet */}
    {(() => {
      const runSheetItems = sortRunSheet(
        plan.runSheet && plan.runSheet.length > 0
          ? plan.runSheet
          : generateDefaultRunSheet(plan.event_type)
      );
      return (
        <div className="mb-6">
          <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
            Day-of Run Sheet (Minute-by-Minute Itinerary)
          </h2>
          <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
            <thead className="bg-stone-100">
              <tr>
                <th className="border border-stone-300 p-2 w-24">Start Time</th>
                <th className="border border-stone-300 p-2">Milestone / Activity</th>
                <th className="border border-stone-300 p-2 w-44">Responsible Owner</th>
              </tr>
            </thead>
            <tbody>
              {runSheetItems.map((item, idx) => (
                <tr key={item.id || `${item.time}-${idx}`}>
                  <td className="border border-stone-300 p-2 font-mono font-bold">{item.time}</td>
                  <td className="border border-stone-300 p-2 font-medium">{item.title}</td>
                  <td className="border border-stone-300 p-2">{item.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    })()}

    {/* Vendors & Quotes Summary */}
    <div className="mb-6">
      <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
        Vendor Directory & Quote Comparison
      </h2>
      <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
        <thead className="bg-stone-100">
          <tr>
            <th className="border border-stone-300 p-2">Category</th>
            <th className="border border-stone-300 p-2">Market Estimate</th>
            <th className="border border-stone-300 p-2">Quotes Logged</th>
            <th className="border border-stone-300 p-2">Booking Status</th>
            <th className="border border-stone-300 p-2 text-right">Committed Quote</th>
          </tr>
        </thead>
        <tbody>
          {plan.vendors.map((vendor) => {
            const selectedQuote = (vendor.quotes || []).find((q) => q.status === 'selected');
            return (
              <tr key={vendor.type}>
                <td className="border border-stone-300 p-2 font-medium">{vendor.type}</td>
                <td className="border border-stone-300 p-2 font-mono">
                  {formatINR(vendor.est_low)} – {formatINR(vendor.est_high)}
                </td>
                <td className="border border-stone-300 p-2 font-mono">
                  {vendor.quotes?.length ? `${vendor.quotes.length} bids` : 'None logged'}
                </td>
                <td className="border border-stone-300 p-2 capitalize font-semibold">
                  {vendor.status || 'todo'}
                  {selectedQuote ? ` (${selectedQuote.vendor_name})` : ''}
                </td>
                <td className="border border-stone-300 p-2 text-right font-mono font-bold">
                  {vendor.quote ? formatINR(vendor.quote) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Ideas & Curated Inspirations */}
    <div className="mb-6">
      <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
        Curated Inspirations & Menus
      </h2>
      <ul className="text-xs space-y-2">
        {plan.ideas.map((idea, index) => (
          <li key={`${idea.title}-${index}`} className="border-b border-stone-100 pb-1.5">
            <strong className="text-stone-900 font-semibold">{idea.title}</strong>{' '}
            <span className="text-stone-500 uppercase text-[10px]">({idea.category})</span>: {idea.description}
          </li>
        ))}
      </ul>
    </div>

    {/* Risks & Contingency Radar */}
    <div className="mb-6">
      <h2 className="text-base font-serif font-bold text-stone-900 mb-2 border-b border-stone-300 pb-1">
        Risk Radar & Mitigations
      </h2>
      <table className="w-full text-xs text-left border-collapse border border-stone-300 mb-4">
        <thead className="bg-stone-100">
          <tr>
            <th className="border border-stone-300 p-2">Identified Risk</th>
            <th className="border border-stone-300 p-2">Likelihood / Impact</th>
            <th className="border border-stone-300 p-2">Mitigation Action</th>
            <th className="border border-stone-300 p-2">Contingency Backup</th>
          </tr>
        </thead>
        <tbody>
          {(plan.risks || []).map((risk, index) => (
            <tr key={`${risk.title}-${index}`}>
              <td className="border border-stone-300 p-2 font-medium">{risk.title}</td>
              <td className="border border-stone-300 p-2 capitalize">
                {risk.likelihood} / {risk.impact}
              </td>
              <td className="border border-stone-300 p-2">{risk.mitigation}</td>
              <td className="border border-stone-300 p-2 italic">{risk.backup_plan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Footer Seal */}
    <footer className="mt-8 pt-4 border-t border-stone-300 flex justify-between items-center text-[11px] text-stone-500">
      <span>Utsav — Culture-Aware GenAI Celebration Planner</span>
      <span>Confidential Blueprint · Printed on {new Date().toLocaleDateString('en-IN')}</span>
    </footer>
  </section>
);
