import "server-only";

export type JsonSchemaFormat = { name: string; strict: boolean; schema: Record<string, unknown> };

export type LlmUsage = { inputTokens: number; cachedTokens: number; outputTokens: number };

export type LlmResult<T> = { data: T; usage: LlmUsage; model: string; latencyMs: number };

export class LlmError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 75_000;

export function blogModel(): string {
  return process.env.OPENAI_BLOG_MODEL?.trim() || "gpt-4.1-mini";
}

/** reasoning 계열은 temperature 를 받지 않는다 */
function supportsTemperature(model: string): boolean {
  return !/^(o\d|gpt-5)/.test(model);
}

export async function callStructured<T>(args: {
  system: string;
  user: string;
  format: JsonSchemaFormat;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<LlmResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new LlmError("openai_not_configured", "OPENAI_API_KEY is missing");

  const model = blogModel();
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: { type: "json_schema", json_schema: args.format },
    max_completion_tokens: args.maxOutputTokens ?? 4000,
  };
  if (supportsTemperature(model) && args.temperature !== undefined) body.temperature = args.temperature;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw new LlmError(controller.signal.aborted ? "openai_timeout" : "openai_network", String(e));
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const code = res.status === 429 ? "openai_rate_limited" : `openai_http_${res.status}`;
    throw new LlmError(code, text.slice(0, 500));
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    model?: string;
  };
  const choice = json.choices?.[0];
  if (choice?.message?.refusal) throw new LlmError("openai_refused", choice.message.refusal);
  if (choice?.finish_reason === "length") throw new LlmError("openai_truncated", "output truncated");
  const content = choice?.message?.content;
  if (!content) throw new LlmError("openai_empty", "empty response");

  let data: T;
  try {
    data = JSON.parse(content) as T;
  } catch {
    throw new LlmError("openai_bad_json", content.slice(0, 200));
  }

  return {
    data,
    model: json.model ?? model,
    latencyMs: Date.now() - started,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      cachedTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    },
  };
}
