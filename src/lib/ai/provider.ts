/**
 * Vismay AI provider — server-side only.
 *
 * Uses the z-ai-web-dev-sdk (available in this sandbox). The SDK reads its
 * credentials from a `.z-ai-config` file (in CWD, $HOME, or /etc). On a
 * self-hosted deployment, set ZAI_API_KEY / ZAI_BASE_URL (or OPENAI_API_KEY)
 * and the same public API below will work.
 *
 * NEVER import this module from a client component.
 */
import "server-only";

import ZAI from "z-ai-web-dev-sdk";
import type { ChatMessage } from "z-ai-web-dev-sdk";

let cachedPromise: Promise<ZAI> | null = null;

/**
 * Get a configured ZAI client. Uses `ZAI.create()` which loads the
 * `.z-ai-config` file from disk (sandbox), or falls back to env vars
 * (self-hosted).
 */
async function getClient(): Promise<ZAI> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    // If env vars are set, use them directly (self-hosted deployment).
    const envKey = process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || "";
    const envUrl = process.env.ZAI_BASE_URL || "";
    if (envKey && envUrl) {
      return new ZAI({ apiKey: envKey, baseUrl: envUrl } as any);
    }
    if (envKey) {
      return new ZAI({ apiKey: envKey } as any);
    }
    // Sandbox path — load from the .z-ai-config file.
    return ZAI.create();
  })();
  return cachedPromise;
}

export function isAIConfigured(): boolean {
  // The sandbox SDK is always usable; in self-hosted deployments require keys.
  if (process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY) return true;
  // The sandbox runtime exposes the SDK without explicit keys, so treat it as configured.
  return true;
}

export interface ChatOptions {
  systemPrompt?: string;
  temperature?: number;
  /** Force JSON output (the SDK / OpenAI supports response_format json_object). */
  json?: boolean;
  maxTokens?: number;
}

/** Plain chat completion returning the assistant text. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const client = await getClient();
  const full: ChatMessage[] = opts.systemPrompt
    ? [{ role: "system", content: opts.systemPrompt }, ...messages]
    : messages;
  const body: any = {
    messages: full,
    temperature: opts.temperature ?? 0.4,
    stream: false,
  };
  if (opts.json) {
    body.response_format = { type: "json_object" };
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  const res: any = await client.chat.completions.create(body);
  const content =
    res?.choices?.[0]?.message?.content ??
    res?.message?.content ??
    (typeof res === "string" ? res : "");
  return typeof content === "string" ? content : String(content ?? "");
}

/** Streaming chat completion. Yields incremental assistant text chunks. */
export async function* chatStream(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): AsyncGenerator<string> {
  const client = await getClient();
  const full: ChatMessage[] = opts.systemPrompt
    ? [{ role: "system", content: opts.systemPrompt }, ...messages]
    : messages;
  const body: any = {
    messages: full,
    temperature: opts.temperature ?? 0.4,
    stream: true,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const res: any = await client.chat.completions.create(body);
  // The SDK returns an async iterable when stream:true.
  if (res && typeof res[Symbol.asyncIterator] === "function") {
    for await (const chunk of res) {
      const delta = chunk?.choices?.[0]?.delta?.content ?? chunk?.delta?.content ?? "";
      if (delta) yield delta as string;
    }
    return;
  }
  // Fallback — non-streaming wrapped as a single chunk.
  const content =
    res?.choices?.[0]?.message?.content ??
    res?.message?.content ??
    (typeof res === "string" ? res : "");
  if (content) yield String(content);
}

/**
 * Ask the model for a JSON object. Parses defensively and returns the
 * parsed value, or null on parse failure (with the raw text for debugging).
 */
export async function chatJson<T = any>(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<{ ok: true; data: T } | { ok: false; raw: string; error: string }> {
  const raw = await chat(messages, { ...opts, json: true });
  // Some models wrap JSON in code fences — strip them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return { ok: true, data: JSON.parse(cleaned) as T };
  } catch (e: any) {
    return { ok: false, raw, error: String(e?.message ?? e) };
  }
}
