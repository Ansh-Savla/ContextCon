/**
 * Company research (secondary, labelled TAVILY): overview, news, funding, market, competitors — plus press-reported
 * financial figures quoted sentence by sentence. Ported from the team's Sightline research/financials modules.
 * On demand (not part of the decision), cached on disk so each company is researched once.
 */
import { config } from "./config";
import { cacheGet, cachePut } from "./budget";

export type ResearchItem = { title: string; url: string; snippet: string; date?: string; host: string };
export type ReportedFigure = { metric: string; quote: string; url: string; host: string };
export type Research = { sections: Array<{ key: string; label: string; items: ResearchItem[]; note?: string }>; figures: ReportedFigure[]; ok: boolean; message?: string };

const LABELS: Record<string, string> = { overview: "Overview", news: "News", funding: "Funding & revenue", market: "Market", competitors: "Competitors" };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "web"; } };
const norm = (s = "") => s.toLowerCase().replace(/[®©™]/g, "").replace(/\b(pvt|private|ltd|limited|inc|llc)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function search(query: string, opts: Record<string, unknown>) {
  const body = { query, max_results: 8, include_answer: false, exclude_domains: ["facebook.com", "instagram.com", "tiktok.com", "pinterest.com"], ...opts };
  const hit = cacheGet<any>("tavily:/search", body);
  if (hit) return hit.data;
  const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { authorization: `Bearer ${config.tavilyApiKey}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Tavily HTTP ${r.status}`);
  cachePut("tavily:/search", body, j);
  return j;
}

export async function runResearch(name: string, category = "", domain = ""): Promise<Research> {
  if (!config.tavilyApiKey) return { sections: [], figures: [], ok: false, message: "Add TAVILY_API_KEY to .env.local to enable company research." };
  const clean = name.replace(/[®©™]/g, "").replace(/\b(pvt|private|ltd|limited|inc|llc)\b\.?/gi, "").replace(/\s+/g, " ").trim();
  const q = `"${clean}"`;
  const plan: Record<string, [string, Record<string, unknown>]> = {
    overview: [`${q} ${category} company`, { search_depth: "advanced" }],
    news: [`${q} company news`, { topic: "news", days: 365 }],
    funding: [`${q} funding revenue valuation loss profit FY`, { search_depth: "advanced" }],
    market: [`${category || clean} market size trends industry`, { search_depth: "advanced" }],
    competitors: [`${q} competitors alternatives`, {}],
  };
  const core = norm(clean).split(" ").filter(w => w.length >= 3);
  const stem = domain.split(".")[0]?.toLowerCase();
  const mentions = (t: string) => { const x = norm(t); return core.every(w => x.includes(w)) || (!!stem && x.includes(stem)); };
  const results = await Promise.allSettled(Object.entries(plan).map(async ([k, [query, o]]) => [k, await search(query, o)] as const));
  const sections: Research["sections"] = [];
  const figures: ReportedFigure[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const [key, data] = r.value;
    let items: ResearchItem[] = (data?.results ?? []).map((x: any) => ({ title: x.title ?? "", url: x.url ?? "", snippet: String(x.content ?? "").slice(0, 320), date: x.published_date, host: host(x.url ?? "") }));
    let note: string | undefined;
    if (key !== "market") {
      const before = items.length;
      items = items.filter(i => mentions(i.title + " " + i.snippet + " " + i.url));
      if (before > items.length) note = `${before - items.length} source(s) dropped — they don't mention ${clean}`;
    }
    sections.push({ key, label: LABELS[key], items: items.slice(0, 6), note });
    if (key === "funding" || key === "news" || key === "overview") {
      for (const it of items) {
        for (const s of it.snippet.split(/(?<=[.!?])\s+/)) {
          if (!/(revenue|turnover|sales|loss|profit|ebitda|valuation|raised|arr)/i.test(s)) continue;
          if (!/(₹|rs\.?\s?\d|inr|\$\s?\d|crore|lakh|million|billion|\bcr\b)/i.test(s)) continue;
          const metric = /valuation/i.test(s) ? "Valuation" : /raised|funding|round/i.test(s) ? "Funding" : /loss/i.test(s) ? "Loss" : /profit|ebitda/i.test(s) ? "Profit / EBITDA" : "Revenue";
          if (!figures.some(f => f.quote === s.trim())) figures.push({ metric, quote: s.trim().slice(0, 260), url: it.url, host: it.host });
        }
      }
    }
  }
  sections.sort((a, b) => Object.keys(LABELS).indexOf(a.key) - Object.keys(LABELS).indexOf(b.key));
  return { sections, figures: figures.slice(0, 8), ok: sections.length > 0, message: sections.length ? undefined : "Research unavailable right now." };
}
