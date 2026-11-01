/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { formatINR } from '../utils/planLogic.ts';
import { Table, PieChart } from 'lucide-react';

interface DonutSlice {
  label: string;
  pct: number;
  amount: number;
  color: string;
  locked?: boolean;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalBudget: number;
  guests: number;
  onSliceClick?: (sliceLabel: string) => void;
}

const PALETTE = [
  '#F5A623', // Marigold
  '#E05D5D', // Coral Rose
  '#7B3F9A', // Royal Plum
  '#2E7D32', // Emerald Forest
  '#1565C0', // Cobalt Sapphire
  '#D97706', // Amber Gold
  '#00897B', // Persian Teal
  '#C2185B', // Rani Pink
];

export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  totalBudget,
  guests,
  onSliceClick,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);

  // SVG parameters
  const size = 260;
  const strokeWidth = 36;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // Build arc offsets
  let accumulatedPct = 0;
  const renderedSlices = slices.map((slice, idx) => {
    const strokeDasharray = `${(slice.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += slice.pct;
    const color = slice.color || PALETTE[idx % PALETTE.length];
    return {
      ...slice,
      color,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;
  const perGuest = guests > 0 ? Math.round(totalBudget / guests) : 0;

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      {!showTable ? (
        <div className="relative w-[260px] h-[260px]">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rotate-[-90deg] transition-transform duration-300"
            role="img"
            aria-label={`Donut chart showing budget allocation across ${slices.length} categories`}
          >
            {/* Background circle track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-stone-200/50 dark:text-stone-800/60"
            />

            {renderedSlices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <circle
                  key={slice.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  className="cursor-pointer transition-all duration-200 hover:opacity-95"
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSliceClick?.(slice.label)}
                />
              );
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeSlice ? (
              <>
                <span className="text-xs uppercase tracking-wider font-medium text-stone-500 dark:text-stone-400 truncate max-w-[170px]">
                  {activeSlice.label}
                </span>
                <span className="text-2xl font-bold font-serif text-[#3B1F4A] dark:text-[#FFF8EE] tabular-nums">
                  {activeSlice.pct}%
                </span>
                <span className="text-xs font-semibold text-[#B45309] dark:text-[#F5A623] tabular-nums">
                  {formatINR(activeSlice.amount)}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs uppercase tracking-wider font-medium text-stone-500 dark:text-stone-400">
                  Total Budget
                </span>
                <span className="text-xl sm:text-2xl font-bold font-serif text-[#3B1F4A] dark:text-[#FFF8EE] tabular-nums">
                  {formatINR(totalBudget)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  ~{formatINR(perGuest, true)} / guest
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Real HTML table alternative */
        <div className="w-full max-w-md overflow-x-auto">
          <table className="w-full text-left text-xs border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-900 shadow-xs">
            <caption className="sr-only">Budget allocation breakdown by category, percent and rupee amount</caption>
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <tr>
                <th scope="col" className="p-2.5 font-semibold">Category</th>
                <th scope="col" className="p-2.5 font-semibold text-right">Percent</th>
                <th scope="col" className="p-2.5 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {slices.map((slice) => (
                <tr key={slice.label} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="p-2.5 font-medium text-stone-900 dark:text-stone-100">{slice.label}</td>
                  <td className="p-2.5 text-right font-mono text-stone-600 dark:text-stone-400">{slice.pct}%</td>
                  <td className="p-2.5 text-right font-mono font-semibold text-[#3B1F4A] dark:text-[#FFF8EE]">{formatINR(slice.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View as Table Toggle Button */}
      <button
        type="button"
        onClick={() => setShowTable(!showTable)}
        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        aria-expanded={showTable}
      >
        {showTable ? <PieChart className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" /> : <Table className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F5A623]" />}
        <span>{showTable ? 'View as chart' : 'View as table'}</span>
      </button>
    </div>
  );
};
