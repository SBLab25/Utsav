/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Strips ASCII control characters and obvious prompt-injection phrases
 */
export function sanitizeUserText(text: string): string {
  if (typeof text !== 'string') return '';
  // Strip control characters: ASCII 0-8, 11-12, 14-31, 127
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Strip obvious prompt injection phrases
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /bypass\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /system\s+prompt/gi,
    /you\s+are\s+now\s+(an?\s+)?DAN/gi,
  ];

  for (const pattern of injectionPatterns) {
    clean = clean.replace(pattern, '[filtered]');
  }

  return clean.trim();
}
