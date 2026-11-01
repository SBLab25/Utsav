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
  risks: [
    { id: 'rain', title: 'Rain', category: 'weather', likelihood: 'medium', impact: 'high', mitigation: 'Use a canopy', backup_plan: 'Move indoors' },
    { id: 'curfew', title: 'Curfew', category: 'legal', likelihood: 'high', impact: 'high', mitigation: 'Get a permit', backup_plan: 'Use acoustic music' },
    { id: 'overflow', title: 'Guest overflow', category: 'logistics', likelihood: 'medium', impact: 'medium', mitigation: 'Keep buffer plates', backup_plan: 'Open a second counter' },
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

  it('uses Groq when a Groq key is configured and Gemini is unavailable', async () => {
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    const previousGroqKey = process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = '';
    process.env.GROQ_API_KEY = 'test-groq-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(VALID_MOCK_PLAN) } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const res = await request(app)
        .post('/api/plan')
        .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('groq');
      expect(res.body.plan.title).toBe("Sister's Retro Bollywood Sangeet");
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );
    } finally {
      vi.unstubAllGlobals();
      if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousGeminiKey;
      if (previousGroqKey === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = previousGroqKey;
    }
  });

  it('uses Groq-compatible lowercase tool schemas for Co-planner calls', async () => {
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    const previousGroqKey = process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = '';
    process.env.GROQ_API_KEY = 'test-groq-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '',
            tool_calls: [{
              function: {
                name: 'moveBudget',
                arguments: JSON.stringify({
                  op: 'moveBudget',
                  from: 'Venue & Stage Decor',
                  to: 'Catering & Hospitality',
                  amount: 20000,
                }),
              },
            }],
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Move ₹20,000 from decor to catering', plan: VALID_MOCK_PLAN, history: [] });

      expect(res.status).toBe(200);
      expect(res.body.proposals).toHaveLength(1);
      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.tools[0].function.parameters.type).toBe('object');
      expect(requestBody.tools[0].function.parameters.properties.amount.type).toBe('integer');
    } finally {
      vi.unstubAllGlobals();
      if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousGeminiKey;
      if (previousGroqKey === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = previousGroqKey;
    }
  });

  it('empty brief returns 400', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ brief: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request payload');
  });

  it('translation validates input and passes through English safely', async () => {
    const invalid = await request(app)
      .post('/api/translate')
      .send({ text: 'Hello', language: 'fr' });
    expect(invalid.status).toBe(400);

    const english = await request(app)
      .post('/api/translate')
      .send({ text: 'Hello guests', language: 'en' });
    expect(english.status).toBe(200);
    expect(english.body.translation).toBe('Hello guests');
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

  it('POST /api/chat returns only safe, plan-valid tool proposals', async () => {
    setCustomGenAIClient({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'I found one safe change.',
          functionCalls: [
            { name: 'moveBudget', args: { from: 'Venue & Stage Decor', to: 'Catering & Hospitality', amount: 10000 } },
            { name: 'unknownOperation', args: {} },
            { name: 'moveBudget', args: { from: 'Missing', to: 'Catering & Hospitality', amount: 10000 } },
            { name: 'moveBudget', args: { from: 'Venue & Stage Decor', to: 'Catering & Hospitality', amount: 999999999 } },
          ],
        }),
      },
    });

    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'Please adjust the budget',
        plan: VALID_MOCK_PLAN,
        history: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('one safe');
    expect(res.body.proposals).toEqual([
      { op: 'moveBudget', from: 'Venue & Stage Decor', to: 'Catering & Hospitality', amount: 10000 },
    ]);
  });

  it('POST /api/chat rejects oversized messages and never saves a plan', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'x'.repeat(301), plan: VALID_MOCK_PLAN, history: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid chat request');
  });

  it('POST /api/replan returns 200 with source "gemini" and patch for valid PlanPatch', async () => {
    const mockPatch = {
      reason: 'Added 50 guests and scaled budget by ₹1L',
      changes: {
        guests: 200,
        total_budget: 700000,
      },
      budget_changes: [],
      tasks_added: [],
      tasks_removed: [],
      tasks_modified: [],
      vendors_added: [],
      vendors_removed: [],
      ideas_added: [],
    };

    setCustomGenAIClient({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(mockPatch),
        }),
      },
    });

    const res = await request(app)
      .post('/api/replan')
      .send({
        currentPlan: VALID_MOCK_PLAN,
        changeInstruction: 'add 50 guests and increase budget to 7L',
      });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('gemini');
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.guests).toBe(200);
    expect(res.body.plan.total_budget).toBe(700000);
    expect(res.body.patch).toBeDefined();
    expect(res.body.patch.reason).toBe('Added 50 guests and scaled budget by ₹1L');
  });

  it('POST /api/replan falls back to full plan if patch is invalid', async () => {
    // First call for patch returns invalid JSON, second call for full plan returns valid plan
    const updatedPlan = {
      ...VALID_MOCK_PLAN,
      guests: 220,
    };

    const mockGenerateContent = vi
      .fn()
      .mockResolvedValueOnce({
        text: '{"reason": 123, invalid-patch', // invalid patch
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(updatedPlan), // valid full plan fallback
      });

    setCustomGenAIClient({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await request(app)
      .post('/api/replan')
      .send({
        currentPlan: VALID_MOCK_PLAN,
        changeInstruction: 'add 70 guests',
      });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('gemini');
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.guests).toBe(220);
  });

  it('POST /api/plan/stream streams all sections and completes with done', async () => {
    // When no client is set, fallback streams core, timeline, vendors, ideas, risks, done
    const res = await request(app)
      .post('/api/plan/stream')
      .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const raw = res.text;
    expect(raw).toContain('"section":"core"');
    expect(raw).toContain('"section":"timeline"');
    expect(raw).toContain('"section":"vendors"');
    expect(raw).toContain('"section":"ideas"');
    expect(raw).toContain('"section":"risks"');
    expect(raw).toContain('"section":"done"');
    expect(raw).toContain('"source":"fallback-nokey"');
  });

  it('POST /api/plan/stream returns 400 for empty brief', async () => {
    const res = await request(app)
      .post('/api/plan/stream')
      .send({ brief: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request payload');
  });

  it('POST /api/plan/stream with Gemini generates and streams section payloads', async () => {
    const mockCore = {
      title: 'Sister Sangeet Streamed',
      event_type: 'sangeet',
      event_date: '2026-12-14',
      guests: 150,
      total_budget: 600000,
      city: 'Vizag',
      theme: 'Retro Glam',
      budget: [
        { category: 'Venue', pct: 60, locked: false },
        { category: 'Catering', pct: 40, locked: false },
      ],
      clarifying_question: null,
    };
    const mockTimeline = {
      timeline: [{ t_minus_days: 60, title: 'Book Venue', owner: 'Family', done: false }],
    };
    const mockVendors = {
      vendors: [
        {
          type: 'DJ',
          est_low: 30000,
          est_high: 50000,
          questions: ['Has backup?'],
          red_flags: ['No mixer'],
          outreach_message: 'Hi DJ',
        },
      ],
    };
    const mockIdeas = {
      ideas: [{ category: 'theme', title: 'Retro', description: 'Music vibe' }],
    };
    const mockRisks = {
      risks: [
        { id: 'rain', title: 'Rain', category: 'weather', likelihood: 'medium', impact: 'high', mitigation: 'Waterproof tent', backup_plan: 'Move indoors' },
        { id: 'curfew', title: 'Curfew', category: 'legal', likelihood: 'high', impact: 'high', mitigation: 'Get a permit', backup_plan: 'Use acoustic music' },
        { id: 'overflow', title: 'Overflow', category: 'logistics', likelihood: 'medium', impact: 'medium', mitigation: 'Keep buffer plates', backup_plan: 'Open a second counter' },
      ],
    };

    setCustomGenAIClient({
      models: {
        generateContent: vi
          .fn()
          .mockResolvedValueOnce({ text: JSON.stringify(mockCore) })
          .mockResolvedValueOnce({ text: JSON.stringify(mockTimeline) })
          .mockResolvedValueOnce({ text: JSON.stringify(mockVendors) })
          .mockResolvedValueOnce({ text: JSON.stringify(mockIdeas) })
          .mockResolvedValueOnce({ text: JSON.stringify(mockRisks) }),
      },
    });

    const res = await request(app)
      .post('/api/plan/stream')
      .send({ brief: "Sister's sangeet, 150 guests, ₹6L, 14 Dec, Vizag" });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('Sister Sangeet Streamed');
    expect(res.text).toContain('Book Venue');
    expect(res.text).toContain('"source":"gemini"');
    expect(res.text).toContain('"section":"done"');
  });
});
