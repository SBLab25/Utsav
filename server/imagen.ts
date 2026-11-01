/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizeUserText } from '../src/utils/security.ts';

export interface GenerateImageOptions {
  prompt: string;
  theme?: string;
  category?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9';
}

export interface GeneratedImageResult {
  imageUrl: string;
  prompt: string;
  theme: string;
  category: string;
  source: 'imagen' | 'curated';
}

/**
 * Creates a high-fidelity SVG decorative concept illustration tailored to cultural event themes
 */
export function generateCuratedThemedSvg(prompt: string, theme: string = 'Celebration', category: string = 'decor', aspectRatio: string = '4:3'): string {
  const width = aspectRatio === '16:9' ? 960 : aspectRatio === '1:1' ? 600 : 800;
  const height = aspectRatio === '16:9' ? 540 : aspectRatio === '1:1' ? 600 : 600;

  const pLower = prompt.toLowerCase();
  const tLower = theme.toLowerCase();

  const isHaldiOrMehendi = pLower.includes('haldi') || pLower.includes('mehendi') || pLower.includes('yellow') || pLower.includes('marigold') || tLower.includes('haldi');
  const isSangeetOrRetro = pLower.includes('sangeet') || pLower.includes('disco') || pLower.includes('retro') || pLower.includes('dance') || pLower.includes('neon') || tLower.includes('sangeet') || tLower.includes('bollywood');
  const isMandapOrWedding = pLower.includes('mandap') || pLower.includes('wedding') || pLower.includes('royal') || pLower.includes('reception') || tLower.includes('wedding');

  let bgGradientStart = '#23152C';
  let bgGradientEnd = '#130A18';
  let accentColor = '#F5A623';
  let secondaryColor = '#E05D5D';
  let titleBadge = 'THEME CONCEPT';

  if (isHaldiOrMehendi) {
    bgGradientStart = '#422006';
    bgGradientEnd = '#1C0E03';
    accentColor = '#FBBF24';
    secondaryColor = '#F59E0B';
    titleBadge = 'HALDI & MEHENDI DECOR';
  } else if (isSangeetOrRetro) {
    bgGradientStart = '#1E1B4B';
    bgGradientEnd = '#0F0E2A';
    accentColor = '#EC4899';
    secondaryColor = '#8B5CF6';
    titleBadge = 'SANGEET & STAGE LIGHTS';
  } else if (isMandapOrWedding) {
    bgGradientStart = '#450A0A';
    bgGradientEnd = '#1A0404';
    accentColor = '#F59E0B';
    secondaryColor = '#DC2626';
    titleBadge = 'ROYAL WEDDING MANDAP';
  }

  const safePrompt = sanitizeUserText(prompt).slice(0, 80);
  const safeTheme = sanitizeUserText(theme).slice(0, 50);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradientStart}"/>
      <stop offset="100%" stop-color="${bgGradientEnd}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${width / 2}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.4}" fill="url(#glow)"/>

  <!-- Ornate Decorative Arch & Backdrop -->
  <g fill="none" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="2">
    <!-- Outer Arch -->
    <path d="M ${width * 0.15} ${height * 0.9} C ${width * 0.15} ${height * 0.25}, ${width * 0.85} ${height * 0.25}, ${width * 0.85} ${height * 0.9}" />
    <!-- Inner Arch -->
    <path d="M ${width * 0.22} ${height * 0.9} C ${width * 0.22} ${height * 0.32}, ${width * 0.78} ${height * 0.32}, ${width * 0.78} ${height * 0.9}" stroke-dasharray="6 6" />
    <!-- Stage Platform -->
    <path d="M ${width * 0.08} ${height * 0.88} L ${width * 0.92} ${height * 0.88}" stroke-width="4" stroke="${accentColor}" stroke-opacity="0.8"/>
  </g>

  <!-- Hanging Decorative Festoons / Fairy Light Drops -->
  <g stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6">
    <line x1="${width * 0.28}" y1="${height * 0.28}" x2="${width * 0.28}" y2="${height * 0.58}" stroke-dasharray="2 4"/>
    <circle cx="${width * 0.28}" cy="${height * 0.58}" r="5" fill="${accentColor}"/>

    <line x1="${width * 0.38}" y1="${height * 0.24}" x2="${width * 0.38}" y2="${height * 0.5}" stroke-dasharray="2 4"/>
    <circle cx="${width * 0.38}" cy="${height * 0.5}" r="7" fill="${secondaryColor}"/>

    <line x1="${width * 0.5}" y1="${height * 0.22}" x2="${width * 0.5}" y2="${height * 0.46}" stroke-dasharray="2 4"/>
    <circle cx="${width * 0.5}" cy="${height * 0.46}" r="9" fill="${accentColor}"/>

    <line x1="${width * 0.62}" y1="${height * 0.24}" x2="${width * 0.62}" y2="${height * 0.5}" stroke-dasharray="2 4"/>
    <circle cx="${width * 0.62}" cy="${height * 0.5}" r="7" fill="${secondaryColor}"/>

    <line x1="${width * 0.72}" y1="${height * 0.28}" x2="${width * 0.72}" y2="${height * 0.58}" stroke-dasharray="2 4"/>
    <circle cx="${width * 0.72}" cy="${height * 0.58}" r="5" fill="${accentColor}"/>
  </g>

  <!-- Center Decorative Emblem -->
  <circle cx="${width / 2}" cy="${height * 0.46}" r="38" fill="${bgGradientStart}" stroke="${accentColor}" stroke-width="2.5"/>
  <circle cx="${width / 2}" cy="${height * 0.46}" r="30" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="4 3"/>
  <path d="M ${width / 2} ${height * 0.42} L ${width / 2 + 10} ${height * 0.46} L ${width / 2} ${height * 0.5} L ${width / 2 - 10} ${height * 0.46} Z" fill="${accentColor}"/>

  <!-- Bottom Floating Urli / Glow Elements -->
  <g fill="${accentColor}" opacity="0.8">
    <ellipse cx="${width * 0.3}" cy="${height * 0.86}" rx="32" ry="10" fill="${secondaryColor}" opacity="0.6"/>
    <ellipse cx="${width * 0.5}" cy="${height * 0.86}" rx="46" ry="12" fill="${accentColor}" opacity="0.7"/>
    <ellipse cx="${width * 0.7}" cy="${height * 0.86}" rx="32" ry="10" fill="${secondaryColor}" opacity="0.6"/>
  </g>

  <!-- Text Overlay Card -->
  <rect x="${width * 0.12}" y="${height * 0.74}" width="${width * 0.76}" height="${height * 0.2}" rx="16" fill="${bgGradientEnd}" fill-opacity="0.88" stroke="${accentColor}" stroke-width="1.2" stroke-opacity="0.5"/>

  <text x="${width / 2}" y="${height * 0.79}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="${accentColor}" letter-spacing="2">
    ${titleBadge}
  </text>

  <text x="${width / 2}" y="${height * 0.84}" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="#FFF8EE">
    ${safeTheme}
  </text>

  <text x="${width / 2}" y="${height * 0.89}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#D6D3D1" opacity="0.9">
    ${safePrompt}
  </text>
</svg>`;
}

/**
 * Generates an event decor concept visual using Gemini Imagen 3 or curated themed fallback
 */
export async function generateDecorImage(
  aiClient: any,
  options: GenerateImageOptions
): Promise<GeneratedImageResult> {
  const { prompt, theme = 'Celebration', category = 'decor', aspectRatio = '4:3' } = options;

  // Attempt live Imagen generation if GoogleGenAI client is available with generateImages
  if (
    aiClient &&
    typeof aiClient.models?.generateImages === 'function' &&
    !process.env.UTSAV_AI_OFFLINE
  ) {
    try {
      const enrichedPrompt = `Stunning Indian event celebration concept art for ${theme}. Category: ${category}. Detail: ${sanitizeUserText(prompt)}. Warm ambient fairy lights, cultural elegance, architectural floral decor, 8k resolution, photorealistic.`;
      const result = await aiClient.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: enrichedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as any,
        },
      });

      const imageBytes = result?.generatedImages?.[0]?.image?.imageBytes;
      if (imageBytes && typeof imageBytes === 'string') {
        return {
          imageUrl: `data:image/jpeg;base64,${imageBytes}`,
          prompt,
          theme,
          category,
          source: 'imagen',
        };
      }
    } catch (error) {
      console.warn('Imagen generation error, switching to curated themed SVG fallback:', error);
    }
  }

  // Graceful curated fallback
  const svg = generateCuratedThemedSvg(prompt, theme, category, aspectRatio);
  const base64Svg = Buffer.from(svg).toString('base64');
  return {
    imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
    prompt,
    theme,
    category,
    source: 'curated',
  };
}
