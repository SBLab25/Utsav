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

export const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '40000', 10);
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

let mockGenAIClient: any = undefined;
type CacheEntry = { expiresAt: number; value: unknown };
const responseCache = new Map<string, CacheEntry>();

export function setCustomGenAIClient(client: any) {
  mockGenAIClient = client;
  clearGeminiCache();
}

export function resetCustomGenAIClient() {
  mockGenAIClient = undefined;
  clearGeminiCache();
}

export function clearGeminiCache() {
  responseCache.clear();
}

function cacheKey(endpoint: string, prompt: string): string {
  let hash = 2166136261;
  const input = `${endpoint}:${prompt.trim().replace(/\s+/g, ' ')}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${endpoint}:${(hash >>> 0).toString(16)}`;
}

function getCached<T>(key: string): T | undefined {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value as T;
}

function setCached(key: string, value: unknown): void {
  responseCache.delete(key);
  responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  while (responseCache.size > CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
    else break;
  }
}

function configuredGeminiModels(): string[] {
  const configured = (process.env.GEMINI_MODEL || '').split(',').map((model) => model.trim()).filter(Boolean);
  return configured.length > 0 ? configured : [GEMINI_MODEL, 'gemini-2.0-flash-lite'];
}

function isRetryableError(error: unknown): boolean {
  const source = error as { status?: number; statusCode?: number; message?: string };
  const status = source?.status || source?.statusCode;
  return status === 429 || (typeof status === 'number' && status >= 500) ||
    /(?:status|HTTP)\s*(?:code\s*)?(?:429|5\d\d)\b/i.test(source?.message || '');
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted', 'AbortError'));
    }, { once: true });
  });
}

async function callWithAbort<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function generateReliable(
  ai: any,
  options: GenerateContentOptions,
  timeoutMs: number,
): Promise<any> {
  if (ai.lastCall !== undefined) {
    return callWithAbort<any>(
      (signal) => ai.models.generateContent({ ...options, signal }),
      timeoutMs,
    );
  }

  const models = options.model ? [options.model] : configuredGeminiModels();
  const startedAt = Date.now();
  let lastError: unknown;
  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const remaining = timeoutMs - (Date.now() - startedAt);
    if (remaining <= 0) break;
    const budget = Math.max(1, Math.floor(remaining / (models.length - modelIndex)));
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await callWithAbort<any>(
          (signal) => ai.models.generateContent({ ...options, model: models[modelIndex], signal }),
          budget,
        );
        return Object.assign(result, {
          __meta: { model: models[modelIndex], attempts: attempt },
        });
      } catch (error) {
        lastError = error;
        if (attempt === 1 && isRetryableError(error)) {
          await delay(150);
          continue;
        }
        break;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No AI model succeeded');
}

type GenerateContentOptions = {
  model?: string;
  contents: unknown;
  config?: Record<string, unknown>;
  signal?: AbortSignal;
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
  const normalizeSchema = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalizeSchema);
    if (!value || typeof value !== 'object') return value;
    const source = value as Record<string, unknown>;
    const normalized = Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => !['$schema', '$ref', 'definitions', 'minLength', 'maxLength', 'minimum', 'maximum', 'additionalProperties'].includes(key))
        .map(([key, item]) => [key, normalizeSchema(item)])
    ) as Record<string, unknown>;
    if (typeof normalized.const === 'string') {
      normalized.enum = [normalized.const];
      delete normalized.const;
    }
    if (typeof normalized.type === 'string') {
      normalized.type = normalized.type.toLowerCase();
    }
    return normalized;
  };
  return declarations.map((declaration) => ({
    type: 'function',
    function: {
      name: declaration.name,
      description: declaration.description,
      parameters: normalizeSchema(declaration.parameters),
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
        max_completion_tokens: tools ? 1200 : 3000,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: options.signal,
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq request failed with status ${response.status}: ${errorBody.slice(0, 500)}`);
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
  let activeProvider = providers[0].name;
  let lastCall = { model: '', attempts: 0 };
  const generateContent = async (options: GenerateContentOptions) => {
    const startedAt = Date.now();
    const overallTimeout = Math.max(1, parseInt(process.env.GEMINI_TIMEOUT_MS || String(GEMINI_TIMEOUT_MS), 10));
    let lastError: unknown;
    for (let index = 0; index < providers.length; index += 1) {
      const provider = providers[index];
      try {
        const models = provider.name === 'gemini'
          ? (options.model ? [options.model] : configuredGeminiModels())
          : [GROQ_MODEL];
        for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
          const remaining = overallTimeout - (Date.now() - startedAt);
          if (remaining <= 0) throw new Error(`${provider.name} provider timed out`);
          const modelsLeft = models.length - modelIndex;
          const modelBudget = Math.max(1, Math.floor(remaining / modelsLeft));
          const attemptsForModel = 2;
          for (let attempt = 1; attempt <= attemptsForModel; attempt += 1) {
            try {
              const result = await callWithAbort<any>(
                (signal) => (provider.client as any).models.generateContent({
                  ...options,
                  model: models[modelIndex],
                  signal,
                }),
                modelBudget,
              );
              activeProvider = provider.name;
              lastCall = { model: models[modelIndex], attempts: attempt };
              return result;
            } catch (error) {
              lastError = error;
              const canRetry = attempt === 1 && isRetryableError(error);
              if (!canRetry) break;
              await delay(150, undefined);
            }
          }
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No AI provider available');
  };
  return {
    get provider() {
      return activeProvider;
    },
    get lastCall() {
      return lastCall;
    },
    preferFallback() {
      // Kept for route compatibility. Provider ordering is always deterministic.
    },
    models: {
      generateContent: (options: GenerateContentOptions) => generateContent(options),
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
  | { success: true; plan: EventPlan; data: EventPlan; model?: string; attempts?: number }
  | { success: false; reason: 'timeout' | 'validation-failed' | 'error' };

export async function callGeminiAndValidate(
  ai: any,
  prompt: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
  systemInstruction: string = SYSTEM_INSTRUCTION
): Promise<GeminiCallResult> {
  const key = cacheKey('plan', prompt);
  const cached = getCached<GeminiCallResult>(key);
  if (cached?.success) return cached;
  const startedAt = Date.now();
  try {
    const result = await generateReliable(ai, {
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
        },
      }, timeoutMs);
    const text = result.text;
    if (!text) {
      return { success: false, reason: 'error' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_parseErr) {
      return { success: false, reason: 'validation-failed' };
    }

    const plan = sanitizeDraft(parsed);
    const success = {
      success: true as const,
      plan,
      data: plan,
      ...(result.__meta || ai.lastCall || {}),
    };
    setCached(key, success);
    return success;
  } catch (error) {
    const source = error as { name?: string; message?: string };
    return {
      success: false,
      reason: source.name === 'AbortError' || Date.now() - startedAt >= timeoutMs || /timed out|aborted/i.test(source.message || '') ? 'timeout' : 'error',
    };
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
    const result = await generateReliable(ai, {
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiPlanPatchResponseSchema,
        },
      }, timeoutMs);
    const text = result.text;
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
  } catch (error) {
    return { success: false, reason: error instanceof Error && /timed out|aborted/i.test(error.message) ? 'timeout' : 'error' };
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
    const result = await generateReliable(ai, {
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema,
        },
      }, timeoutMs);
    const text = result.text;
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
  } catch (error) {
    return { success: false, reason: error instanceof Error && /timed out|aborted/i.test(error.message) ? 'timeout' : 'error' };
  }
}
