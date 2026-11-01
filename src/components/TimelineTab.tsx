/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  AlertCircle,
  Download,
  Plus,
  Trash2,
  Search,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { TimelineTask, EventPlan } from '../types/plan.ts';
import { getTaskTargetDate, generateICS } from '../utils/planLogic.ts';

interface TimelineTabProps {
  timeline: TimelineTask[];
  eventDate: string;
  plan: EventPlan;
  onUpdateTimeline: (newTimeline: TimelineTask[]) => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  timeline,
  eventDate,
  plan,
  onUpdateTimeline,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTMinus, setNewTMinus] = useState<number>(30);
  const [newOwner, setNewOwner] = useState('');

  // Toggle task done
  const handleToggleTask = (index: number) => {
    const updated = [...timeline];
    updated[index] = {
      ...updated[index],
      done: !updated[index].done,
    };
    onUpdateTimeline(updated);
  };

  // Delete task
  const handleDeleteTask = (index: number) => {
    const updated = timeline.filter((_, idx) => idx !== index);
    onUpdateTimeline(updated);
  };

  // Mark all completed
  const handleMarkAllComplete = () => {
    const updated = timeline.map((t) => ({ ...t, done: true }));
    onUpdateTimeline(updated);
  };

  // Reset all
  const handleResetAll = () => {
    const updated = timeline.map((t) => ({ ...t, done: false }));
    onUpdateTimeline(updated);
  };

  // Add milestone
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TimelineTask = {
      title: newTitle.trim(),
      t_minus_days: Number(newTMinus) || 0,
      owner: newOwner.trim() || 'Lead Organizer',
      done: false,
    };

    // Sort descending by t_minus_days
    const updated = [...timeline, newTask].sort((a, b) => b.t_minus_days - a.t_minus_days);
    onUpdateTimeline(updated);
    setNewTitle('');
    setNewOwner('');
    setShowAddModal(false);
  };

  // Download .ics
  const handleDownloadICS = () => {
    const icsContent = generateICS(plan);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(plan.title || 'celebration-plan').toLowerCase().replace(/\s+/g, '-')}-timeline.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter tasks
  const filteredTasksWithIndex = timeline
    .map((task, originalIndex) => ({ task, originalIndex }))
    .filter(({ task }) => {
      if (filter === 'pending') return !task.done;
      if (filter === 'completed') return task.done;
      return true;
    })
    .filter(({ task }) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        (task.owner && task.owner.toLowerCase().includes(q))
      );
    });

  const completedCount = timeline.filter((t) => t.done).length;

  return (
    <div className="space-y-6">
      {/* Top action strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/80 dark:bg-[#23152C]/90 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl" role="tablist" aria-label="Filter tasks">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              All ({timeline.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'pending'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Pending ({timeline.length - completedCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'completed'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Quick Mark actions */}
          <div className="flex items-center gap-1">
            {completedCount < timeline.length ? (
              <button
                onClick={handleMarkAllComplete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 transition-colors"
                title="Mark all tasks as completed"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark All</span>
              </button>
            ) : (
              <button
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
                title="Reset all tasks to pending"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side search & buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milestones..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#F5A623] w-36 sm:w-44"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Milestone
          </button>

          <button
            onClick={handleDownloadICS}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#2D1639] text-[#FFF8EE] dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 transition-colors shadow-xs cursor-pointer"
            title="Download iCalendar .ics file to sync with Apple Calendar, Google Calendar, or Outlook"
          >
            <Download className="w-3.5 h-3.5" />
            Export .ics
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800 space-y-4">
        {filteredTasksWithIndex.length === 0 ? (
          <div className="bg-white dark:bg-[#23152C] rounded-2xl p-8 text-center border border-stone-200 dark:border-stone-800">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No milestones found matching your search or filter.
            </p>
          </div>
        ) : (
          filteredTasksWithIndex.map(({ task, originalIndex }) => {
            const { dateStr, isOverdue } = getTaskTargetDate(eventDate, task.t_minus_days);
            const showOverdueAlert = isOverdue && !task.done;

            return (
              <div
                key={`${task.title}-${task.t_minus_days}-${originalIndex}`}
                className={`relative group bg-white dark:bg-[#23152C] p-4 rounded-2xl border transition-all shadow-xs ${
                  showOverdueAlert
                    ? 'border-red-300 dark:border-red-900/60 bg-red-500/[0.03]'
                    : task.done
                    ? 'border-stone-200/60 dark:border-stone-800/60 opacity-75'
                    : 'border-stone-200/90 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                {/* Node on the timeline track */}
                <div
                  className={`absolute -left-[30px] sm:-left-[38px] top-5 w-4 h-4 rounded-full border-2 transition-colors ${
                    task.done
                      ? 'bg-emerald-500 border-white dark:border-stone-900'
                      : showOverdueAlert
                      ? 'bg-red-500 border-white dark:border-stone-900 animate-pulse'
                      : 'bg-[#F5A623] border-white dark:border-stone-900'
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(originalIndex)}
                      className="mt-0.5 text-stone-400 hover:text-[#3B1F4A] dark:hover:text-[#F5A623] transition-colors cursor-pointer shrink-0"
                      aria-label={task.done ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as completed`}
                    >
                      {task.done ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Milestone label */}
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                            task.t_minus_days === 0
                              ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-bold'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {task.t_minus_days === 0 ? 'Day-of Event' : `T-${task.t_minus_days} days`}
                        </span>

                        {dateStr && (
                          <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </span>
                        )}

                        {showOverdueAlert && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Overdue
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm sm:text-base font-medium mt-1 transition-colors ${
                          task.done
                            ? 'line-through text-stone-400 dark:text-stone-500'
                            : 'text-[#3B1F4A] dark:text-[#FFF8EE]'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  {/* Owner & Delete */}
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] font-medium text-stone-400 block">
                        Assigned
                      </span>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        {task.owner || 'Lead'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(originalIndex)}
                      className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Remove milestone"
                      aria-label={`Remove milestone "${task.title}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#23152C] rounded-2xl max-w-md w-full p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Add Celebration Milestone
            </h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Finalize dessert station tasting"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Timeline (T-minus days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={newTMinus}
                    onChange={(e) => setNewTMinus(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brother, Food Lead"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
