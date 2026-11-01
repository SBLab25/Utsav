/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white/80 dark:bg-[#23152C]/90 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="h-6 w-3/5 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-md" />
          <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded-md" />
          <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-md" />
        </div>
      </div>

      {/* Grid of chart & items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-[#23152C] rounded-2xl p-8 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center">
          <div className="w-48 h-48 rounded-full border-8 border-stone-200 dark:border-stone-800 animate-pulse" />
          <div className="h-4 w-32 bg-stone-200 dark:bg-stone-800 rounded mt-4" />
        </div>

        <div className="lg:col-span-7 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#23152C] rounded-xl p-4 border border-stone-200 dark:border-stone-800 space-y-2"
            >
              <div className="flex justify-between">
                <div className="h-4 w-1/3 bg-stone-200 dark:bg-stone-800 rounded" />
                <div className="h-4 w-16 bg-stone-200 dark:bg-stone-800 rounded" />
              </div>
              <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
