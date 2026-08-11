import { log, withRetry } from "@/lib/observability/logger";
import type OpenAI from "openai";

/** Strip chars that can break strict JSON request parsers (nulls, lone surrogates). */
export function sanitizeLlmText(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0) continue;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[i]! + text[i + 1]!;
        i++;
      } else {
        out += "\uFFFD";
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      out += "\uFFFD";
      continue;
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += text[i]!;
  }
  return out;
}

export function isNonRetryableOpenAiRequestError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("invalid body") ||
    lower.includes("invalid_json") ||
    lower.includes("failed to parse json value") ||
    lower.includes("could not parse the json body") ||
    lower.includes("invalid_request_error") ||
    /\b400\b/.test(msg)
  );
}

function extractResponsesText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          return part.text;
        }
      }
    }
  }
  throw new Error("OpenAI Responses API returned empty output");
}

/**
 * Structured JSON call: try Responses API, fall back to chat.completions
 * when OpenAI rejects the request body (Invalid body / invalid_json).
 */
export async function createStructuredJsonText(opts: {
  client: OpenAI;
  model: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  signal?: AbortSignal;
  label: string;
  attempts?: number;
}): Promise<string> {
  const model = opts.model.trim();
  const instructions = sanitizeLlmText(opts.instructions);
  const input = sanitizeLlmText(opts.input);
  const schema = JSON.parse(JSON.stringify(opts.schema)) as Record<
    string,
    unknown
  >;
  const timeoutMs = opts.timeoutMs;
  const attempts = opts.attempts ?? 2;

  const viaResponses = async () => {
    const response = await opts.client.responses.create(
      {
        model,
        instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: opts.schemaName,
            strict: true,
            schema,
          },
        },
      },
      {
        timeout: timeoutMs,
        signal: opts.signal ?? AbortSignal.timeout(timeoutMs),
      },
    );
    return extractResponsesText(response);
  };

  const viaChat = async () => {
    const completion = await opts.client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: opts.schemaName,
            strict: true,
            schema,
          },
        },
      },
      {
        timeout: timeoutMs,
        signal: opts.signal ?? AbortSignal.timeout(timeoutMs),
      },
    );
    const text = completion.choices[0]?.message?.content;
    if (!text?.trim()) {
      throw new Error("OpenAI chat.completions returned empty content");
    }
    return text;
  };

  try {
    return await withRetry(viaResponses, {
      attempts,
      label: `${opts.label}_responses`,
      shouldRetry: (err) => {
        if (err instanceof Error && err.name === "AbortError") return false;
        if (/deadline exceeded/i.test(String(err))) return false;
        return !isNonRetryableOpenAiRequestError(err);
      },
    });
  } catch (err) {
    if (!isNonRetryableOpenAiRequestError(err)) throw err;
    log("warn", "llm_responses_fallback_chat", {
      label: opts.label,
      model,
      error: err instanceof Error ? err.message : String(err),
    });
    return await withRetry(viaChat, {
      attempts,
      label: `${opts.label}_chat`,
      shouldRetry: (err2) => {
        if (err2 instanceof Error && err2.name === "AbortError") return false;
        if (/deadline exceeded/i.test(String(err2))) return false;
        return !isNonRetryableOpenAiRequestError(err2);
      },
    });
  }
}
