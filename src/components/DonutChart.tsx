/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatINR } from '../utils/planLogic.ts';

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
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

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
    <div className="flex flex-col items-center justify-center p-4">
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
                role="button"
                tabIndex={0}
                aria-label={`${slice.label}: ${slice.pct}% (${formatINR(slice.amount)})`}
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
              <span className="text-xs font-semibold text-[#F5A623] tabular-nums">
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
    </div>
  );
};
