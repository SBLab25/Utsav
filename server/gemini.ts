/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  geminiResponseSchema,
  geminiPlanPatchResponseSchema,
  SYSTEM_INSTRUCTION,
} from './prompts.ts';
import {
  sanitizeDraft,
  planPatchSchema,
  type EventPlan,
  type PlanPatch,
} from '../src/schemas/plan.ts';

export const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '25000', 10);
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let mockGenAIClient: any = undefined;

export function setCustomGenAIClient(client: any) {
  mockGenAIClient = client;
}

export function resetCustomGenAIClient() {
  mockGenAIClient = undefined;
}

export function getGenAIClient(): GoogleGenAI | null {
  if (mockGenAIClient !== undefined) {
    return mockGenAIClient;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export type GeminiCallResult =
  | { success: true; plan: EventPlan }
  | { success: false; reason: 'timeout' | 'validation-failed' | 'error' };

export async function callGeminiAndValidate(
  ai: any,
  prompt: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
  systemInstruction: string = SYSTEM_INSTRUCTION
): Promise<GeminiCallResult> {
  try {
    const modelToUse = process.env.GEMINI_MODEL || GEMINI_MODEL;
    const geminiCall = ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema,
      },
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), timeoutMs)
    );

    const raceResult = await Promise.race([geminiCall, timeoutPromise]);
    if (raceResult === 'TIMEOUT') {
      return { success: false, reason: 'timeout' };
    }

    const text = raceResult.text;
    if (!text) {
      return { success: false, reason: 'error' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_parseErr) {
      return { success: false, reason: 'validation-failed' };
    }

    return { success: true, plan: sanitizeDraft(parsed) };
  } catch (_err) {
    return { success: false, reason: 'error' };
  }
}

export type GeminiPatchResult =
  | { success: true; patch: PlanPatch }
  | { success: false; reason: 'timeout' | 'validation-failed' | 'error' };

export async function callGeminiPatchAndValidate(
  ai: any,
  prompt: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
  systemInstruction: string = SYSTEM_INSTRUCTION
): Promise<GeminiPatchResult> {
  try {
    const modelToUse = process.env.GEMINI_MODEL || GEMINI_MODEL;
    const geminiCall = ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: geminiPlanPatchResponseSchema,
      },
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), timeoutMs)
    );

    const raceResult = await Promise.race([geminiCall, timeoutPromise]);
    if (raceResult === 'TIMEOUT') {
      return { success: false, reason: 'timeout' };
    }

    const text = raceResult.text;
    if (!text) {
      return { success: false, reason: 'error' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_parseErr) {
      return { success: false, reason: 'validation-failed' };
    }

    const validation = planPatchSchema.safeParse(parsed);
    if (validation.success) {
      return { success: true, patch: validation.data };
    }

    return { success: false, reason: 'validation-failed' };
  } catch (_err) {
    return { success: false, reason: 'error' };
  }
}

export type GeminiSectionResult<T> =
  | { success: true; data: T }
  | { success: false; reason: 'timeout' | 'validation-failed' | 'error' };

export async function callGeminiSectionAndValidate<T>(
  ai: any,
  prompt: string,
  geminiSchema: any,
  zodSchema: { safeParse: (data: any) => { success: true; data: T } | { success: false } },
  timeoutMs: number = GEMINI_TIMEOUT_MS,
  systemInstruction: string = SYSTEM_INSTRUCTION
): Promise<GeminiSectionResult<T>> {
  try {
    const modelToUse = process.env.GEMINI_MODEL || GEMINI_MODEL;
    const geminiCall = ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: geminiSchema,
      },
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), timeoutMs)
    );

    const raceResult = await Promise.race([geminiCall, timeoutPromise]);
    if (raceResult === 'TIMEOUT') {
      return { success: false, reason: 'timeout' };
    }

    const text = raceResult.text;
    if (!text) {
      return { success: false, reason: 'error' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_parseErr) {
      return { success: false, reason: 'validation-failed' };
    }

    const validation = zodSchema.safeParse(parsed);
    if (validation.success) {
      return { success: true, data: validation.data };
    }

    return { success: false, reason: 'validation-failed' };
  } catch (_err) {
    return { success: false, reason: 'error' };
  }
}
