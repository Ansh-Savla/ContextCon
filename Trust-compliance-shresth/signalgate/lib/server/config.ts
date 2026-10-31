/**
 * Runtime configuration. Every key stays server-side; nothing here is ever sent to the browser.
 * Budgets are deliberately small: this app shares one CrustData balance with the rest of the team.
 */

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  crustdataApiKey: process.env.CRUSTDATA_API_KEY ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  tavilyPerRun: num(process.env.TAVILY_MAX_CALLS_PER_RUN, 3),

  llm: {
    provider: (process.env.LLM_PROVIDER ?? "none") as "none" | "gemini" | "openrouter",
    model: process.env.LLM_MODEL ?? "gemini-3.8-flash",
    fallbackModels: (process.env.LLM_FALLBACK_MODELS ?? "gemini-flash-lite-latest").split(",").map(s => s.trim()).filter(Boolean),
    geminiKey: process.env.GEMINI_API_KEY ?? "",
    openrouterKey: process.env.OPENROUTER_API_KEY ?? "",
    openrouterModel: process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-5.5",
    timeoutMs: num(process.env.LLM_TIMEOUT_MS, 20_000),
  },

  budget: {
    /** Hard cap on CrustData credits this app may spend in total (ledger persists across runs). */
    creditsTotal: num(process.env.CREDIT_BUDGET_TOTAL, 1500),
    /** Hard cap per case run. A typical run needs 3-12. */
    creditsPerRun: num(process.env.CREDIT_BUDGET_PER_RUN, 25),
    /** Never let the account balance drop below this (checked at preflight). */
    accountFloor: num(process.env.CREDIT_ACCOUNT_FLOOR, 500),
    /** Per-run call caps by endpoint (paid ones only). */
    callsPerRun: {
      "/company/enrich": 2,
      "/person/search": 3,
      "/person/enrich": 2,
      "/job/search": 2,
      "/web/search/live": 3,
      "/web/enrich/live": 2,
    } as Record<string, number>,
    llmCallsPerRun: num(process.env.LLM_MAX_CALLS_PER_RUN, 6),
    llmTokensPerRun: num(process.env.LLM_MAX_TOKENS_PER_RUN, 30_000),
    llmCallsTotal: num(process.env.LLM_MAX_CALLS_TOTAL, 400),
  },

  /** use: serve identical requests from disk (0 credits); refresh: always call; off: never write. */
  cacheMode: (process.env.CACHE_MODE ?? "use") as "use" | "refresh" | "off",
  cacheTtlHours: num(process.env.CACHE_TTL_HOURS, 24),
};

/** Estimated list price per call, used to ration before spending. Actual charge comes from x-credits-used. */
export function estimateCredits(path: string, body: any): number {
  switch (path) {
    case "/company/identify": return 0;
    case "/company/enrich": return 2 * (body?.crustdata_company_ids?.length ?? body?.domains?.length ?? 1);
    case "/person/search": return (body?.limit ?? 0) * 0.25;
    case "/person/enrich": return 1 * (body?.professional_network_profile_urls?.length ?? 1);
    case "/job/search": return (body?.limit ?? 0) * 0.03;
    case "/web/search/live": return 1;
    case "/web/enrich/live": return 1 * (body?.urls?.length ?? 1);
    default: return 0;
  }
}
