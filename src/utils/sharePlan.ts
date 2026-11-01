/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { eventPlanSchema } from '../schemas/plan.ts';
import type { EventPlan } from '../types/plan.ts';

const PHONE_NUMBER_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;

function stripPrivateText(value: unknown): unknown {
  if (typeof value === 'string') {
    const dates: string[] = [];
    const protectedValue = value.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (date) => {
      dates.push(date);
      return `__UTSAV_DATE_${dates.length - 1}__`;
    });
    const redacted = protectedValue.replace(PHONE_NUMBER_PATTERN, '[redacted]');
    return redacted.replace(/__UTSAV_DATE_(\d+)__/g, (_match, index: string) => dates[Number(index)]);
  }
  if (Array.isArray(value)) return value.map(stripPrivateText);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'guest_list')
        .map(([key, child]) => [key, stripPrivateText(child)])
    );
  }
  return value;
}

export function stripGuestsForSharing(plan: EventPlan): EventPlan {
  const { guest_list: _guestList, ...planWithoutGuests } = plan;
  return stripPrivateText(planWithoutGuests) as EventPlan;
}

export function encodeSharedPlan(plan: EventPlan): string {
  const safePlan = stripGuestsForSharing(plan);
  const validation = eventPlanSchema.safeParse(safePlan);
  if (!validation.success) {
    throw new Error('Cannot share an invalid plan.');
  }
  return compressToEncodedURIComponent(JSON.stringify(validation.data));
}

export function decodeSharedPlan(encoded: string): EventPlan | null {
  try {
    const decompressed = decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed: unknown = JSON.parse(decompressed);
    const validation = eventPlanSchema.safeParse(parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

export function createShareUrl(plan: EventPlan, origin = window.location.origin, pathname = window.location.pathname): string {
  return `${origin}${pathname}#plan=${encodeSharedPlan(plan)}`;
}
