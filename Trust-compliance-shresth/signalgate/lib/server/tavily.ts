/**
 * Tavily web research (secondary source, labelled). Used for adverse-media screening and claim corroboration.
 * Rationed per run, cached on disk; when no key is set the caller falls back to CrustData web search.
 */
import { config } from "./config";
import { RunBudget, cacheGet, cachePut } from "./budget";
import type { Emit } from "./crustdata";

export type WebHit = { title: string; url: string; snippet: string; date?: string; score?: number; provider: "Tavily" | "CrustData web" };

export const tavilyEnabled = () => !!config.tavilyApiKey;

export async function tavilySearch(query: string, budget: RunBudget, emit: Emit, topic: "news" | "general" = "general"): Promise<{ ok: boolean; hits: WebHit[]; cached?: boolean; message?: string }> {
  const body = { query, topic, search_depth: "basic", max_results: 6, include_answer: false };
  const hit = cacheGet<any>("tavily:/search", body);
  if (hit) {
    budget.cacheHits += 1;
    emit({ agent: "screening", step: `tavily_search("${query.slice(0, 60)}")`, detail: "cache hit", status: "ok", cached: true });
    return { ok: true, hits: map(hit.data), cached: true };
  }
  if (!config.tavilyApiKey) return { ok: false, hits: [], message: "no TAVILY_API_KEY" };
  if (budget.tavilyCalls >= config.tavilyPerRun) {
    emit({ agent: "screening", step: `tavily_search("${query.slice(0, 60)}")`, detail: `rationed: ${config.tavilyPerRun} Tavily calls per run`, status: "skipped" });
    return { ok: false, hits: [], message: "rationed" };
  }
  const t0 = Date.now();
  try {
    budget.tavilyCalls += 1;
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { authorization: `Bearer ${config.tavilyApiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      emit({ agent: "screening", step: `tavily_search("${query.slice(0, 60)}")`, detail: `HTTP ${r.status}: ${String(j?.detail?.error ?? j?.error ?? "").slice(0, 100)}`, status: "failed", ms: Date.now() - t0 });
      return { ok: false, hits: [], message: `HTTP ${r.status}` };
    }
    cachePut("tavily:/search", body, j);
    emit({ agent: "screening", step: `tavily_search("${query.slice(0, 60)}")`, detail: `${(j.results ?? []).length} results`, status: "ok", ms: Date.now() - t0 });
    return { ok: true, hits: map(j) };
  } catch (e) {
    emit({ agent: "screening", step: `tavily_search("${query.slice(0, 60)}")`, detail: (e as Error).message, status: "failed", ms: Date.now() - t0 });
    return { ok: false, hits: [], message: (e as Error).message };
  }
}

function map(j: any): WebHit[] {
  return (j?.results ?? []).map((r: any) => ({ title: r.title ?? "", url: r.url ?? "", snippet: String(r.content ?? "").slice(0, 400), date: r.published_date, score: r.score, provider: "Tavily" as const }));
}
