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
  ExternalLink,
  Clock,
  Sparkles,
  MapPin,
  Tag,
  Edit3,
  X,
  ListOrdered,
} from 'lucide-react';
import type { TimelineTask, EventPlan, EventDay, RunSheetItem } from '../types/plan.ts';
import {
  getTaskTargetDate,
  getTaskDateOnly,
  generateGoogleCalendarUrl,
  generateICS,
  filterTasksByDay,
  sortRunSheet,
  generateDefaultRunSheet,
} from '../utils/planLogic.ts';

export interface TimelineTabProps {
  timeline: TimelineTask[];
  eventDate: string;
  plan: EventPlan;
  onUpdateTimeline: (newTimeline: TimelineTask[]) => void;
  runSheet?: RunSheetItem[];
  onUpdateRunSheet?: (newRunSheet: RunSheetItem[]) => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  timeline,
  eventDate,
  plan,
  onUpdateTimeline,
  runSheet,
  onUpdateRunSheet,
}) => {
  const [activeTimelineView, setActiveTimelineView] = useState<'milestones' | 'runsheet'>('milestones');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [dayFilter, setDayFilter] = useState<'all' | 'pre' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTMinus, setNewTMinus] = useState<number>(30);
  const [newOwner, setNewOwner] = useState('');
  const [newDayNumber, setNewDayNumber] = useState<number | undefined>(undefined);
  const [newTimeSlot, setNewTimeSlot] = useState<string>('');

  // Run Sheet Modal state
  const [showRunSheetModal, setShowRunSheetModal] = useState(false);
  const [editingRunSheetIndex, setEditingRunSheetIndex] = useState<number | null>(null);
  const [runSheetTime, setRunSheetTime] = useState('09:00');
  const [runSheetTitle, setRunSheetTitle] = useState('');
  const [runSheetOwner, setRunSheetOwner] = useState('');
  const [runSheetError, setRunSheetError] = useState<string | null>(null);

  // Derive effective runSheet with fallback to plan.runSheet or template fallback
  const effectiveRunSheet = sortRunSheet(
    runSheet && runSheet.length > 0
      ? runSheet
      : plan.runSheet && plan.runSheet.length > 0
      ? plan.runSheet
      : generateDefaultRunSheet(plan.event_type)
  );

  const handleOpenAddRunSheet = () => {
    setEditingRunSheetIndex(null);
    setRunSheetTime('09:00');
    setRunSheetTitle('');
    setRunSheetOwner('');
    setRunSheetError(null);
    setShowRunSheetModal(true);
  };

  const handleOpenEditRunSheet = (index: number) => {
    const item = effectiveRunSheet[index];
    if (!item) return;
    setEditingRunSheetIndex(index);
    setRunSheetTime(item.time || '09:00');
    setRunSheetTitle(item.title);
    setRunSheetOwner(item.owner);
    setRunSheetError(null);
    setShowRunSheetModal(true);
  };

  const handleDeleteRunSheetItem = (index: number) => {
    if (!onUpdateRunSheet) return;
    const updated = effectiveRunSheet.filter((_, idx) => idx !== index);
    onUpdateRunSheet(updated);
  };

  const handleSaveRunSheetItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runSheetTitle.trim()) {
      setRunSheetError('Title is required.');
      return;
    }
    if (!runSheetTime.trim()) {
      setRunSheetError('Start time is required (e.g. 09:00).');
      return;
    }
    if (!onUpdateRunSheet) return;

    let updated: RunSheetItem[];
    if (editingRunSheetIndex !== null) {
      updated = effectiveRunSheet.map((item, idx) =>
        idx === editingRunSheetIndex
          ? {
              ...item,
              time: runSheetTime.trim(),
              title: runSheetTitle.trim(),
              owner: runSheetOwner.trim() || 'Lead Organizer',
            }
          : item
      );
    } else {
      const newItem: RunSheetItem = {
        id: `rs-${Date.now()}`,
        time: runSheetTime.trim(),
        title: runSheetTitle.trim(),
        owner: runSheetOwner.trim() || 'Lead Organizer',
      };
      updated = [...effectiveRunSheet, newItem];
    }

    const sorted = sortRunSheet(updated);
    onUpdateRunSheet(sorted);
    setShowRunSheetModal(false);
  };

  const eventDays = plan.event_days || [];

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

  // Reassign task day
  const handleAssignTaskDay = (index: number, dayNumber?: number) => {
    const updated = [...timeline];
    updated[index] = {
      ...updated[index],
      day_number: dayNumber,
    };
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
      day_number: newDayNumber,
      time_slot: newTimeSlot.trim() || undefined,
    };

    // Sort descending by t_minus_days
    const updated = [...timeline, newTask].sort((a, b) => b.t_minus_days - a.t_minus_days);
    onUpdateTimeline(updated);
    setNewTitle('');
    setNewOwner('');
    setNewDayNumber(undefined);
    setNewTimeSlot('');
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

  // Filter tasks with originalIndex preserved
  const filteredTasksWithIndex = timeline
    .map((task, originalIndex) => ({ task, originalIndex }))
    .filter(({ task }) => {
      // Status filter
      if (filter === 'pending' && task.done) return false;
      if (filter === 'completed' && !task.done) return false;

      // Day filter
      if (dayFilter === 'pre') {
        if (task.day_number !== undefined || task.t_minus_days === 0) return false;
      } else if (typeof dayFilter === 'number') {
        if (task.day_number !== dayFilter && !(task.t_minus_days === 0 && !task.day_number && dayFilter === 1)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.owner.toLowerCase().includes(q) ||
          (task.time_slot && task.time_slot.toLowerCase().includes(q))
        );
      }

      return true;
    });

  const completedCount = timeline.filter((t) => t.done).length;

  return (
    <div className="space-y-6">
      {/* Multi-Day Celebration Itinerary Banner (if configured) */}
      {eventDays.length > 0 && (
        <div className="bg-white/90 dark:bg-[#23152C]/90 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#F5A623]/20 text-[#B45309] dark:text-[#F5A623]">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                  Multi-Day Celebration Schedule ({eventDays.length} Days)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Each sub-event has its own distinct venue, dress code, and milestone sequence.
                </p>
              </div>
            </div>
          </div>

          {/* Cards for each Day */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {eventDays.map((day) => (
              <div
                key={day.id}
                onClick={() => setDayFilter(dayFilter === day.day_number ? 'all' : day.day_number)}
                className={`p-3.5 rounded-xl border text-xs space-y-2 cursor-pointer transition-all ${
                  dayFilter === day.day_number
                    ? 'border-[#B45309] dark:border-[#F5A623] bg-amber-500/10 shadow-xs ring-1 ring-[#F5A623]/50'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950">
                    Day {day.day_number}
                  </span>
                  {day.date && (
                    <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                      {day.date}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                  {day.title}
                </h4>

                {day.time_slot && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#F5A623]" />
                    {day.time_slot}
                  </p>
                )}

                {day.venue && (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    {day.venue}
                  </p>
                )}

                {day.dress_code && (
                  <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-1 rounded truncate">
                    👗 {day.dress_code}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline View Mode Switcher: Countdown Checklist vs Day-of Run Sheet */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-[#23152C]/90 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTimelineView('milestones')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTimelineView === 'milestones'
                ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Countdown Milestones ({timeline.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTimelineView('runsheet')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTimelineView === 'runsheet'
                ? 'bg-white dark:bg-[#3B1F4A] text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />
            <span>Day-of Run Sheet ({effectiveRunSheet.length})</span>
          </button>
        </div>

        {activeTimelineView === 'runsheet' ? (
          <button
            type="button"
            onClick={handleOpenAddRunSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#4E2B61] text-white dark:bg-[#F5A623] dark:hover:bg-[#E0961E] dark:text-stone-950 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Run Sheet Item</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
            <button
              onClick={handleDownloadICS}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#2D1639] text-[#FFF8EE] dark:bg-[#F5A623] dark:hover:bg-[#E59815] dark:text-stone-950 transition-colors shadow-xs cursor-pointer"
              title="Download iCalendar .ics file to sync with Apple Calendar, Google Calendar, or Outlook"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .ics</span>
            </button>
          </div>
        )}
      </div>

      {activeTimelineView === 'runsheet' ? (
        /* Day-of Run Sheet View */
        <div className="space-y-4">
          <div className="bg-white/90 dark:bg-[#23152C]/90 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F5A623]" />
                Day-of Run Sheet (Minute-by-Minute Itinerary)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Time-ordered operational sequence for celebration day ({plan.event_date}). Auto-sorted by start time.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddRunSheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {effectiveRunSheet.length === 0 ? (
              <div className="bg-white dark:bg-[#23152C] rounded-2xl p-8 text-center border border-stone-200 dark:border-stone-800">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No run sheet items yet. Click "+ Add Run Sheet Item" to schedule event-day milestones.
                </p>
              </div>
            ) : (
              effectiveRunSheet.map((item, idx) => (
                <div
                  key={item.id || `${item.time}-${idx}`}
                  className="bg-white dark:bg-[#23152C] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-4 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 shrink-0">
                      {item.time}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Owner: <span className="font-medium text-stone-700 dark:text-stone-300">{item.owner}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRunSheet(idx)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title="Edit run sheet item"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRunSheetItem(idx)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete run sheet item"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Countdown Milestones View */
        <>
          {/* Top action strip & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/80 dark:bg-[#23152C]/90 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl" role="group" aria-label="Filter tasks">
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

          {/* Day-specific Filter Pills (if multi-day plan) */}
          {eventDays.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
              <button
                type="button"
                onClick={() => setDayFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  dayFilter === 'all'
                    ? 'bg-white dark:bg-stone-800 font-bold shadow-xs text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                All Days
              </button>
              <button
                type="button"
                onClick={() => setDayFilter('pre')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                  dayFilter === 'pre'
                    ? 'bg-white dark:bg-stone-800 font-bold shadow-xs text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Pre-Event
              </button>
              {eventDays.map((d) => (
                <button
                  key={d.day_number}
                  type="button"
                  onClick={() => setDayFilter(d.day_number)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                    dayFilter === d.day_number
                      ? 'bg-[#3B1F4A] dark:bg-[#F5A623] text-white dark:text-stone-950 font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Day {d.day_number}
                </button>
              ))}
            </div>
          )}

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
            const assignedDay = eventDays.find((d) => d.day_number === task.day_number);

            return (
              <div
                key={`${task.title}-${task.t_minus_days}-${originalIndex}`}
                className={`relative group bg-white dark:bg-[#23152C] p-4 rounded-2xl border transition-colors shadow-xs ${
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

                    <div className="min-w-0 space-y-1">
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

                        {/* Multi-Day Tag */}
                        {task.day_number !== undefined && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-[#B45309] dark:text-[#F5A623] font-mono">
                            Day {task.day_number}{assignedDay ? `: ${assignedDay.title.split(':')[1] || assignedDay.title}` : ''}
                          </span>
                        )}

                        {/* Time slot if specified */}
                        {task.time_slot && (
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[#F5A623]" />
                            {task.time_slot}
                          </span>
                        )}

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
                        className={`text-sm sm:text-base font-medium transition-colors ${
                          task.done
                            ? 'line-through text-stone-400 dark:text-stone-500'
                            : 'text-[#3B1F4A] dark:text-[#FFF8EE]'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  {/* Owner & Calendar Link & Day Switcher */}
                  <div className="shrink-0 flex items-center gap-3">
                    {/* Day assignment dropdown if event has multiple days */}
                    {eventDays.length > 0 && (
                      <select
                        value={task.day_number || ''}
                        onChange={(e) => handleAssignTaskDay(originalIndex, e.target.value ? Number(e.target.value) : undefined)}
                        className="text-[11px] px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-medium"
                        aria-label={`Assign day for task ${task.title}`}
                      >
                        <option value="">Pre-Event</option>
                        {eventDays.map((d) => (
                          <option key={d.day_number} value={d.day_number}>
                            Day {d.day_number}
                          </option>
                        ))}
                      </select>
                    )}

                    <a
                      href={generateGoogleCalendarUrl(
                        `[T-${task.t_minus_days}] ${task.title}`,
                        getTaskDateOnly(eventDate, task.t_minus_days),
                        `Milestone for ${plan.title}. Owner: ${task.owner || 'Lead'}.`,
                        plan.city
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] hover:underline dark:text-[#F5A623]"
                      aria-label={`Add timeline task ${task.title} to Google Calendar`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Calendar</span>
                    </a>

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
    </>
  )}

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
                  Task Title *
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

              {/* Multi-Day and Time Slot Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Assign to Day (Optional)
                  </label>
                  <select
                    value={newDayNumber || ''}
                    onChange={(e) => setNewDayNumber(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                  >
                    <option value="">General Pre-Event</option>
                    {eventDays.map((d) => (
                      <option key={d.day_number} value={d.day_number}>
                        Day {d.day_number}: {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Time Slot (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM, Evening"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
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

      {/* Add / Edit Run Sheet Modal */}
      {showRunSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#23152C] rounded-2xl max-w-md w-full p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                {editingRunSheetIndex !== null ? 'Edit Run Sheet Item' : 'Add Day-of Run Sheet Item'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRunSheetModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {runSheetError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                {runSheetError}
              </div>
            )}

            <form onSubmit={handleSaveRunSheetItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Start Time (HH:MM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14:30 or 09:00"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  value={runSheetTime}
                  onChange={(e) => setRunSheetTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
                <span className="text-[11px] text-stone-400">24-hour time format (HH:MM), items will be auto-sorted by start time</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Item Title / Milestone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red carpet grand entry & flash mob"
                  value={runSheetTitle}
                  onChange={(e) => setRunSheetTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Responsible Owner *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Choreographer, Bride's Brother, DJ Rohit"
                  value={runSheetOwner}
                  onChange={(e) => setRunSheetOwner(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRunSheetModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#F5A623] hover:bg-[#E59815] text-stone-950 transition-colors cursor-pointer"
                >
                  {editingRunSheetIndex !== null ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
