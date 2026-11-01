/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { generateDefaultPlan, applySmartReplan } from '../fallback.ts';
import {
  planRequestSchema,
  replanRequestSchema,
} from '../../src/schemas/plan.ts';
import { sanitizeUserText } from '../../src/utils/security.ts';
import {
  getGenAIClient,
  callGeminiAndValidate,
  GEMINI_MODEL,
} from '../gemini.ts';
import { getIntakePrompt, getReplanPrompt } from '../prompts.ts';

export const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'utsav-event-planner',
  });
});

// API endpoint: Generate or intake plan
router.post('/plan', async (req, res) => {
  try {
    const bodyValidation = planRequestSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const { brief } = bodyValidation.data;

    const ai = getGenAIClient();
    if (!ai) {
      const plan = generateDefaultPlan(brief);
      return res.json({ plan, model: 'smart-intake', source: 'fallback-nokey' });
    }

    const sanitizedBrief = sanitizeUserText(brief);
    const prompt = getIntakePrompt(sanitizedBrief);

    const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || '25000', 10);
    const activeModel = process.env.GEMINI_MODEL || GEMINI_MODEL;
    let result = await callGeminiAndValidate(ai, prompt, timeoutMs);

    if (!result.success && result.reason === 'timeout') {
      const plan = generateDefaultPlan(brief);
      return res.json({ plan, model: 'smart-intake-instant', source: 'fallback-timeout' });
    }

    if (!result.success) {
      result = await callGeminiAndValidate(ai, prompt, timeoutMs);
    }

    if (result.success) {
      return res.json({ plan: result.plan, model: activeModel, source: 'gemini' });
    }

    const plan = generateDefaultPlan(brief);
    const source = result.reason === 'timeout' ? 'fallback-timeout' : 'fallback-error';
    return res.json({ plan, model: 'smart-fallback', source });
  } catch (_error) {
    const fallback = generateDefaultPlan(typeof req.body?.brief === 'string' ? req.body.brief : '');
    return res.json({ plan: fallback, model: 'smart-recovery', source: 'fallback-error' });
  }
});

// Re-plan endpoint
router.post('/replan', async (req, res) => {
  try {
    const bodyValidation = replanRequestSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    const currentPlan = (bodyValidation.data.currentPlan || bodyValidation.data.plan)!;
    const changeInstruction = (bodyValidation.data.changeInstruction || bodyValidation.data.instruction)!;

    const ai = getGenAIClient();
    if (!ai) {
      const updatedPlan = applySmartReplan(currentPlan, changeInstruction);
      return res.json({ plan: updatedPlan, model: 'local-replan', source: 'fallback-nokey' });
    }

    const sanitizedInstruction = sanitizeUserText(changeInstruction);
    const prompt = getReplanPrompt(JSON.stringify(currentPlan), sanitizedInstruction);

    const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || '25000', 10);
    const activeModel = process.env.GEMINI_MODEL || GEMINI_MODEL;
    let result = await callGeminiAndValidate(ai, prompt, timeoutMs);

    if (!result.success && result.reason === 'timeout') {
      const updatedPlan = applySmartReplan(currentPlan, changeInstruction);
      return res.json({ plan: updatedPlan, model: 'smart-replan-instant', source: 'fallback-timeout' });
    }

    if (!result.success) {
      result = await callGeminiAndValidate(ai, prompt, timeoutMs);
    }

    if (result.success) {
      return res.json({ plan: result.plan, model: activeModel, source: 'gemini' });
    }

    const fallback = applySmartReplan(currentPlan, changeInstruction);
    const source = result.reason === 'timeout' ? 'fallback-timeout' : 'fallback-error';
    return res.json({ plan: fallback, model: 'smart-fallback', source });
  } catch (_error) {
    const fallbackPlan = (req.body?.currentPlan && typeof req.body.currentPlan === 'object')
      ? req.body.currentPlan
      : generateDefaultPlan('');
    const instruction = typeof req.body?.changeInstruction === 'string'
      ? req.body.changeInstruction
      : '';
    const fallback = applySmartReplan(fallbackPlan, instruction);
    return res.json({ plan: fallback, model: 'smart-recovery', source: 'fallback-error' });
  }
});

export default router;
