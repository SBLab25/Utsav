/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { generateCuratedThemedSvg, generateDecorImage } from './imagen.ts';

describe('server/imagen.ts', () => {
  it('generateCuratedThemedSvg creates valid SVG with theme and prompt text', () => {
    const svg = generateCuratedThemedSvg('Marigold entrance arch', 'Sister Sangeet', 'decor', '4:3');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain('Sister Sangeet');
    expect(svg).toContain('Marigold entrance arch');
  });

  it('generateDecorImage falls back gracefully to curated SVG when no aiClient provided', async () => {
    const result = await generateDecorImage(null, {
      prompt: 'Neon retro bollywood vinyl wall',
      theme: 'Retro Sangeet',
      category: 'theme',
      aspectRatio: '16:9',
    });

    expect(result.source).toBe('curated');
    expect(result.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.prompt).toBe('Neon retro bollywood vinyl wall');
  });

  it('generateDecorImage uses live Imagen when aiClient succeeds', async () => {
    const mockImageBytes = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockClient = {
      models: {
        generateImages: vi.fn().mockResolvedValue({
          generatedImages: [{ image: { imageBytes: mockImageBytes } }],
        }),
      },
    };

    const result = await generateDecorImage(mockClient, {
      prompt: 'Mandap with royal pillars',
      theme: 'Grand Wedding',
      category: 'decor',
    });

    expect(result.source).toBe('imagen');
    expect(result.imageUrl).toBe(`data:image/jpeg;base64,${mockImageBytes}`);
    expect(mockClient.models.generateImages).toHaveBeenCalled();
  });

  it('generateDecorImage falls back to curated SVG if Imagen call throws', async () => {
    const mockClient = {
      models: {
        generateImages: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
      },
    };

    const result = await generateDecorImage(mockClient, {
      prompt: 'Mandap with royal pillars',
      theme: 'Grand Wedding',
    });

    expect(result.source).toBe('curated');
    expect(result.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
