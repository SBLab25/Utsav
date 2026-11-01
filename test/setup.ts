/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom/vitest';
import * as matchers from 'vitest-axe/matchers';
import { expect, vi } from 'vitest';

expect.extend(matchers);

// Mock canvas-confetti in tests
vi.mock('canvas-confetti', () => {
  const fn = vi.fn();
  (fn as any).reset = vi.fn();
  (fn as any).create = vi.fn(() => vi.fn());
  return { default: fn };
});
