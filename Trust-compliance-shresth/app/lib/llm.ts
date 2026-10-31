/**
 * Optional "brain". Chain: primary Gemini model -> fallback Gemini models -> OpenRouter (if key) -> null (caller uses rules).
 * Falls through on 402/429/5xx, timeout, invalid JSON or a failed validator. Every attempt is traced and budgeted.
 * The LLM never decides statuses or outcomes; callers only use it for extraction, planning, judging and prose.
 */
import { config } from "./config";
import type { RunBudget } from "./budget";
import type { Emit } from "./crustdata";

export type LlmJson<T> = { data: T; model: string; tokens: number } | null;

type Attempt = { provider: "gemini" | "openrouter"; model: string };

/** fast=true puts the lighter fallback models first (intake, judging); prose keeps the primary model first. */
function chain(fast = false): Attempt[] {
  const out: Attempt[] = [];
  if (config.llm.provider === "none") return out;
  if (config.llm.geminiKey && config.llm.provider === "gemini") {
    const order = fast ? [...config.llm.fallbackModels, config.llm.model] : [config.llm.model, ...config.llm.fallbackModels];
    for (const m of order) out.push({ provider: "gemini", model: m });
  }
  if (config.llm.openrouterKey) out.push({ provider: "openrouter", model: config.llm.provider === "openrouter" ? config.llm.model : config.llm.openrouterModel });
  return out;
}

export const llmEnabled = () => chain().length > 0;
export const llmLabel = () => (chain()[0] ? chain().map(a => a.model).join(" → ") + " → rules" : "rules only");

async function callGemini(model: string, prompt: string, schema: unknown): Promise<{ text: string; tokens: number }> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": config.llm.geminiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema, maxOutputTokens: 4000 },
    }),
    signal: AbortSignal.timeout(config.llm.timeoutMs),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message ?? `HTTP ${r.status}`), { status: r.status });
  const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  return { text, tokens: j?.usageMetadata?.totalTokenCount ?? 0 };
}

async function callOpenRouter(model: string, prompt: string): Promise<{ text: string; tokens: number }> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${config.llm.openrouterKey}`, "content-type": "application/json", "X-Title": "SignalGate" },
    body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt + "\n\nReturn only JSON." }] }),
    signal: AbortSignal.timeout(config.llm.timeoutMs),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message ?? `HTTP ${r.status}`), { status: r.status });
  return { text: j?.choices?.[0]?.message?.content ?? "", tokens: j?.usage?.total_tokens ?? 0 };
}

/**
 * Ask for JSON matching `schema` (Gemini responseSchema format). `validate` must return true for the result to be used.
 * Returns null when every model in the chain fails or the budget forbids it — the caller then uses its rules path.
 */
export async function llmJson<T>(opts: {
  purpose: string; prompt: string; schema: unknown; validate?: (x: T) => boolean;
  budget: RunBudget; emit: Emit; agent: "intake" | "investigator" | "verifier" | "clerk"; fast?: boolean;
}): Promise<LlmJson<T>> {
  const attempts = chain(opts.fast);
  if (!attempts.length) return null;
  for (const a of attempts) {
    const denied = opts.budget.denyLlm();
    if (denied) { opts.emit({ agent: opts.agent, brain: "rules", step: opts.purpose, detail: `LLM rationed: ${denied}`, status: "fallback" }); return null; }
    const t0 = Date.now();
    try {
      const { text, tokens } = a.provider === "gemini" ? await callGemini(a.model, opts.prompt, opts.schema) : await callOpenRouter(a.model, opts.prompt);
      opts.budget.recordLlm(tokens);
      let data: T;
      try { data = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { throw new Error("invalid JSON from model"); }
      if (opts.validate && !opts.validate(data)) throw new Error("output failed validation (span/schema check)");
      opts.emit({ agent: opts.agent, brain: a.model, step: opts.purpose, detail: `${tokens} tokens`, status: "ok", ms: Date.now() - t0 });
      return { data, model: a.model, tokens };
    } catch (e: any) {
      opts.emit({ agent: opts.agent, brain: a.model, step: opts.purpose, detail: `${a.model} failed: ${String(e?.message ?? e).slice(0, 120)} → next`, status: "fallback", ms: Date.now() - t0 });
    }
  }
  opts.emit({ agent: opts.agent, brain: "rules", step: opts.purpose, detail: "all models failed → rules", status: "fallback" });
  return null;
}
