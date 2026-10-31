/**
 * CrustData API client: the only file that talks to CrustData.
 * Request/retry/pacing pattern adapted from crustdata/tools deal-sourcing-agent (MIT).
 *
 *   POST /company/identify     resolve name/domain/id -> ranked candidates       free
 *   POST /company/enrich       full profile by id, selected field groups         2 / company
 *   POST /person/search        people currently at a company id, by name         ~0.03-0.25 / result
 *   POST /person/enrich        work history from a profile URL                   1 / profile
 *   POST /job/search           roles posted since a date (limit 0 + group_by)    free
 *   POST /web/search/live      targeted news/web query                           1 / query
 *   POST /web/enrich/live      fetch one page                                    1 / page
 *
 * Every call: rationed by RunBudget, served from cache when identical, charge taken from x-credits-used.
 */
import { config, estimateCredits } from "./config";
import { RunBudget, cacheGet, cachePut, round } from "./budget";
import type { TraceEvent } from "../types";

const BASE_URL = "https://api.crustdata.com";
const API_VERSION = "2025-11-01";

export type CallResult<T> =
  | { ok: true; data: T; credits: number; cached: boolean; at: string }
  | { ok: false; skipped?: boolean; status: number; message: string };

export type Emit = (e: Omit<TraceEvent, "t">) => void;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Space calls per endpoint under its rate limit (identify/search 30/min, enrich 15/min, web 10/min). */
const GAP_MS: Record<string, number> = { "/company/enrich": 4100, "/person/enrich": 4100, "/web/search/live": 6100, "/web/enrich/live": 6100 };
const lastCall = new Map<string, number>();
async function pace(p: string) {
  const gap = GAP_MS[p] ?? 2100;
  const wait = (lastCall.get(p) ?? 0) + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall.set(p, Date.now());
}

export class Crustdata {
  constructor(private budget: RunBudget, private emit: Emit) {}

  async call<T>(method: "GET" | "POST", p: string, body: unknown, label: string): Promise<CallResult<T>> {
    const started = Date.now();
    const hit = cacheGet<T>(p, body);
    if (hit) {
      this.budget.cacheHits += 1;
      this.emit({ agent: "investigator", step: label, detail: `${p} · cache hit (0 cr)`, status: "ok", credits: 0, cached: true, ms: 0 });
      return { ok: true, data: hit.data, credits: 0, cached: true, at: hit.at };
    }
    if (!config.crustdataApiKey) {
      this.emit({ agent: "investigator", step: label, detail: `${p} · no CRUSTDATA_API_KEY`, status: "failed" });
      return { ok: false, status: 0, message: "CRUSTDATA_API_KEY missing" };
    }
    const est = estimateCredits(p, body);
    const denied = this.budget.denyCrustdata(p, est);
    if (denied) {
      this.emit({ agent: "investigator", step: label, detail: `rationed: ${denied}`, status: "skipped" });
      return { ok: false, skipped: true, status: 0, message: denied };
    }
    const billedSearch = method === "POST" && /\/search$/.test(p);
    for (let attempt = 0; ; attempt++) {
      await pace(p);
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}${p}`, {
          method,
          headers: { authorization: `Bearer ${config.crustdataApiKey}`, "content-type": "application/json", "x-api-version": API_VERSION },
          body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
          signal: AbortSignal.timeout(60_000),
        });
      } catch (err) {
        const timedOut = (err as Error).name === "TimeoutError";
        if (attempt < 2 && !(billedSearch && timedOut)) { await sleep(2000 * (attempt + 1)); continue; }
        this.emit({ agent: "investigator", step: label, detail: `${p} · network error: ${(err as Error).message}`, status: "failed", ms: Date.now() - started });
        return { ok: false, status: 0, message: (err as Error).message };
      }
      const charged = Number(res.headers.get("x-credits-used") ?? 0);
      if (charged > 0 || res.ok) this.budget.recordCrustdata(p, charged);
      const retryable = res.status === 429 || res.status === 503 || (res.status >= 500 && !billedSearch);
      if (retryable && attempt < 2) {
        const wait = Number(res.headers.get("retry-after")) || Number(res.headers.get("x-ratelimit-reset")) || 2 * (attempt + 1);
        this.emit({ agent: "investigator", step: label, detail: `${p} · ${res.status}, backing off ${Math.min(wait + 1, 61)}s`, status: "info" });
        await sleep(Math.min(wait + 1, 61) * 1000);
        continue;
      }
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = { message: text.slice(0, 300) }; }
      if (!res.ok) {
        // 404 on identify/enrich means "no match" — a normal outcome, not an error.
        if (res.status === 404) {
          this.emit({ agent: "investigator", step: label, detail: `${p} · no match`, status: "ok", credits: charged, ms: Date.now() - started });
          cachePut(p, body, []);
          return { ok: true, data: [] as unknown as T, credits: charged, cached: false, at: new Date().toISOString() };
        }
        const msg = json?.error?.message ?? json?.message ?? res.statusText;
        this.emit({ agent: "investigator", step: label, detail: `${p} · ${res.status}: ${String(msg).slice(0, 160)}`, status: "failed", credits: charged, ms: Date.now() - started });
        return { ok: false, status: res.status, message: String(msg) };
      }
      cachePut(p, body, json);
      this.emit({ agent: "investigator", step: label, detail: `${p} · ${round(charged)} cr`, status: "ok", credits: charged, ms: Date.now() - started });
      return { ok: true, data: json as T, credits: charged, cached: false, at: new Date().toISOString() };
    }
  }

  identifyByDomain(domain: string) {
    return this.call<any[]>("POST", "/company/identify", { domains: [domain] }, `company_identify(domain: ${domain})`);
  }
  identifyByName(name: string) {
    return this.call<any[]>("POST", "/company/identify", { names: [name] }, `company_identify(name: "${name}")`);
  }
  enrich(id: number, fields: string[] = ENRICH_FIELDS) {
    return this.call<any[]>("POST", "/company/enrich", { crustdata_company_ids: [id], fields }, `company_enrich(${id})`);
  }
  /** People currently at a company whose name contains the query. */
  peopleAtCompany(companyId: number, name: string, limit = 5) {
    return this.call<any>("POST", "/person/search", {
      filters: { op: "and", conditions: [
        { field: "experience.employment_details.current.company_id", type: "=", value: companyId },
        { field: "basic_profile.name", type: "(.)", value: name },
      ] },
      fields: ["basic_profile", "experience", "social_handles"],
      limit,
    }, `person_search("${name}" @ ${companyId})`);
  }
  /** People who ever worked at a company (current or past) whose name contains the query. */
  peopleEverAtCompany(companyId: number, name: string, limit = 5) {
    return this.call<any>("POST", "/person/search", {
      filters: { op: "and", conditions: [
        { op: "or", conditions: [
          { field: "experience.employment_details.current.company_id", type: "=", value: companyId },
          { field: "experience.employment_details.past.company_id", type: "=", value: companyId },
        ] },
        { field: "basic_profile.name", type: "(.)", value: name },
      ] },
      fields: ["basic_profile", "experience", "social_handles"],
      limit,
    }, `person_search("${name}" ever @ ${companyId})`);
  }
  /** Free: count of roles posted since a date. */
  jobCount(companyId: number, since: string) {
    return this.call<any>("POST", "/job/search", {
      filters: { op: "and", conditions: [
        { field: "company.basic_info.company_id", type: "=", value: companyId },
        { field: "metadata.date_added", type: "=>", value: since },
      ] },
      limit: 0,
      aggregations: [{ type: "group_by", field: "job_details.title", agg: "count", size: 200 }],
    }, `job_search count since ${since}`);
  }
  /** Career + education for one profile (1 credit). */
  personEnrich(url: string) {
    return this.call<any[]>("POST", "/person/enrich", { professional_network_profile_urls: [url], fields: ["basic_profile", "experience", "education"] }, `person_enrich(${url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)})`);
  }
  /** Peer discovery: companies in the same industry/country/size band (0.03 credits per result). */
  companySearch(filters: unknown, limit = 10) {
    return this.call<any>("POST", "/company/search", { filters, fields: ["crustdata_company_id", "basic_info", "headcount"], limit }, `company_search (${limit} peers)`);
  }
  /** Watcher preview: builds a sample notification for a track spec. deliver:false → no run, no credit, nothing persisted. */
  watchTest(track: unknown, fields: string[]) {
    return this.call<any>("POST", "/watch/company/test", { track, fields, deliver: false }, "watch_company_test (preview, not delivered)");
  }
  webSearch(query: string, sources: string[] = ["news"]) {
    return this.call<any>("POST", "/web/search/live", { query, sources }, `web_search("${query.slice(0, 60)}")`);
  }
  webFetch(url: string) {
    return this.call<any[]>("POST", "/web/enrich/live", { urls: [url] }, `web_fetch(${url.slice(0, 60)})`);
  }
}

export const ENRICH_FIELDS = ["basic_info", "headcount", "funding", "people", "locations", "taxonomy", "news", "web_traffic", "followers", "revenue", "hiring", "seo"];

/** Free account calls, outside any run budget. */
export async function accountCredits(): Promise<number | null> {
  if (!config.crustdataApiKey) return null;
  try {
    const r = await fetch(`${BASE_URL}/account/credits`, { headers: { authorization: `Bearer ${config.crustdataApiKey}`, "x-api-version": API_VERSION } });
    if (!r.ok) return null;
    return (await r.json())?.account?.credits ?? null;
  } catch { return null; }
}
