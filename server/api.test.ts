/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app, setCustomGenAIClient, resetCustomGenAIClient } from './app.ts';

const VALID_MOCK_PLAN = {
  title: "Sister's Retro Bollywood Sangeet",
  event_type: "sangeet",
  event_date: "2026-12-14",
  guests: 150,
  total_budget: 600000,
  city: "Vizag",
  theme: "Retro Bollywood 70s-90s Glamour",
  budget: [
    { category: "Venue & Stage Decor", pct: 50, locked: false },
    { category: "Catering & Hospitality", pct: 50, locked: false },
  ],
  timeline: [
    { t_minus_days: 60, title: "Lock Coastal Lawn", owner: "Family Head", done: false },
  ],
  vendors: [
    {
      type: "DJ & Sound Setup",
      est_low: 35000,
      est_high: 60000,
      questions: ["Wireless mics available?"],
      red_flags: ["No power backup"],
      outreach_message: "Hi DJ, checking availability for Sangeet.",
    },
  ],
  ideas: [
    {
      category: "theme",
      title: "Disco Deewane",
      description: "Bell-bottoms, glitter saris, retro movie posters.",
    },
  ],
  clarifying_question: null,
};

describe('server/api.test.ts', () => {
  beforeEach(() => {
    resetCustomGenAIClient();
  });

  afterEach(() => {
    resetCustomGenAIClient();
    vi.restoreAllMocks();
  });

  it('valid brief returns 200 with source "gemini"', async () => {
    setCustomGenAIClient({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(VALID_MOCK_PLAN),
        }),
      },
    });

    const res = await request(app)
      .post('/api/plan')
      .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('gemini');
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.title).toBe("Sister's Retro Bollywood Sangeet");
    expect(res.body.plan.guests).toBe(150);
  });

  it('empty brief returns 400', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ brief: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request payload');
  });

  it('600-character brief returns 400', async () => {
    const longBrief = 'A'.repeat(600);
    const res = await request(app)
      .post('/api/plan')
      .send({ brief: longBrief });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request payload');
  });

  it('Gemini timeout returns source "fallback-timeout"', async () => {
    const prevTimeout = process.env.GEMINI_TIMEOUT_MS;
    process.env.GEMINI_TIMEOUT_MS = '25'; // Fast 25ms timeout for testing

    setCustomGenAIClient({
      models: {
        generateContent: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => setTimeout(resolve, 200));
        }),
      },
    });

    try {
      const res = await request(app)
        .post('/api/plan')
        .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('fallback-timeout');
      expect(res.body.plan).toBeDefined();
      expect(res.body.plan.guests).toBe(150);
    } finally {
      if (prevTimeout !== undefined) {
        process.env.GEMINI_TIMEOUT_MS = prevTimeout;
      } else {
        delete process.env.GEMINI_TIMEOUT_MS;
      }
    }
  });

  it('invalid Gemini JSON returns fallback', async () => {
    setCustomGenAIClient({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: '{"malformed": true, invalid-json',
        }),
      },
    });

    const res = await request(app)
      .post('/api/plan')
      .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback-error');
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.guests).toBe(150);
    expect(res.body.plan.city).toBe('Vizag');
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('utsav-event-planner');
    expect(res.body.timestamp).toBeDefined();
  });
});
