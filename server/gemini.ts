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
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PROVIDER_TIMEOUT_MS = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '8000', 10);
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

let mockGenAIClient: any = undefined;

export function setCustomGenAIClient(client: any) {
  mockGenAIClient = client;
}

export function resetCustomGenAIClient() {
  mockGenAIClient = undefined;
}

type GenerateContentOptions = {
  model?: string;
  contents: unknown;
  config?: Record<string, unknown>;
};

type ProviderResponse = {
  text: string;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
};

function toOpenAIMessage(content: unknown): Array<{ role: string; content: string }> {
  if (typeof content === 'string') return [{ role: 'user', content }];
  if (!Array.isArray(content)) return [{ role: 'user', content: JSON.stringify(content) }];
  return content.map((item) => {
    const source = item as { role?: string; parts?: Array<{ text?: string }> };
    return {
      role: source.role === 'model' ? 'assistant' : source.role || 'user',
      content: Array.isArray(source.parts)
        ? source.parts.map((part) => part.text || '').join('\n')
        : '',
    };
  });
}

function toOpenAITools(tools: unknown): unknown[] | undefined {
  if (!Array.isArray(tools)) return undefined;
  const declarations = tools.flatMap((tool) => {
    const source = tool as { functionDeclarations?: Array<Record<string, unknown>> };
    return source.functionDeclarations || [];
  });
  return declarations.map((declaration) => ({
    type: 'function',
    function: {
      name: declaration.name,
      description: declaration.description,
      parameters: declaration.parameters,
    },
  }));
}

async function callGroq(options: GenerateContentOptions, apiKey: string): Promise<ProviderResponse> {
  const config = options.config || {};
  const systemInstruction = typeof config.systemInstruction === 'string'
    ? config.systemInstruction
    : '';
  const schema = config.responseSchema;
  const schemaInstruction = schema
    ? `\nReturn only JSON matching this schema:\n${JSON.stringify(schema)}`
    : '';
  const messages = [
    ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
    ...toOpenAIMessage(options.contents),
  ];
  const tools = toOpenAITools(config.tools);
  const responseFormat = config.responseMimeType === 'application/json'
    ? { type: 'json_object' }
    : undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || GROQ_MODEL,
        messages: schemaInstruction
          ? [...messages.slice(0, -1), { ...messages[messages.length - 1], content: `${messages[messages.length - 1].content}${schemaInstruction}` }]
          : messages,
        temperature: 0.2,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}`);
    }
    const payload = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
        };
      }>;
    };
    const message = payload.choices?.[0]?.message;
    const functionCalls = message?.tool_calls?.flatMap((call) => {
      const name = call.function?.name;
      if (!name) return [];
      try {
        return [{ name, args: JSON.parse(call.function?.arguments || '{}') as Record<string, unknown> }];
      } catch {
        return [];
      }
    });
    return { text: message?.content || '', functionCalls };
  } finally {
    clearTimeout(timer);
  }
}

function createGroqClient(apiKey: string) {
  return {
    provider: 'groq',
    models: {
      generateContent: (options: GenerateContentOptions) => callGroq(options, apiKey),
    },
  };
}

function createProviderClient(geminiKey: string | undefined, groqKey: string | undefined) {
  const gemini = geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'
    ? new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      })
    : null;
  const groq = groqKey && groqKey !== 'MY_GROQ_API_KEY' ? createGroqClient(groqKey) : null;
  const providers = [
    ...(gemini ? [{ name: 'gemini', client: gemini }] : []),
    ...(groq ? [{ name: 'groq', client: groq }] : []),
  ];
  if (providers.length === 0) return null;
  return {
    provider: providers[0].name,
    models: {
      generateContent: async (options: GenerateContentOptions) => {
        let lastError: unknown;
        for (const provider of providers) {
          try {
            const providerCall = (provider.client as any).models.generateContent({
              ...options,
              model: provider.name === 'groq' ? GROQ_MODEL : options.model || GEMINI_MODEL,
            });
            let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
            const timeout = new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => reject(new Error(`${provider.name} provider timed out`)), PROVIDER_TIMEOUT_MS);
            });
            const result = await Promise.race([providerCall, timeout]).finally(() => {
              if (timeoutHandle) clearTimeout(timeoutHandle);
            });
            return result;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError instanceof Error ? lastError : new Error('No AI provider available');
      },
    },
  };
}

export function getGenAIClient(): any {
  if (mockGenAIClient !== undefined) {
    return mockGenAIClient;
  }
  return createProviderClient(process.env.GEMINI_API_KEY, process.env.GROQ_API_KEY);
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
