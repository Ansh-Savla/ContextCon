/**
 * Shape probe: runs the exact calls the engine makes for the demo companies and prints the response shapes.
 * Responses land in the cache, so the engine re-uses them at 0 credits.
 * Usage: npx tsx --env-file=.env.local scripts/probe.ts
 */
import { Crustdata } from "../lib/crustdata";
import { RunBudget, ledger } from "../lib/budget";

const shape = (v: any, depth = 0): any => {
  if (depth > 3) return typeof v;
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1), `…${v.length}`] : [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).slice(0, 40).map(([k, x]) => [k, shape(x, depth + 1)]));
  return v === null ? null : typeof v === "string" ? v.slice(0, 50) : v;
};

(async () => {
  const b = new RunBudget(20);
  const cd = new Crustdata(b, e => console.log(`  [${e.status}] ${e.step} ${e.detail ?? ""}`));
  const which = process.argv[2] ?? "all";
  if (which === "all" || which === "identify") {
    const a = await cd.identifyByDomain("bluepinefoods.com");
    console.log("IDENTIFY domain:", JSON.stringify(a.ok ? shape(a.data) : a, null, 1).slice(0, 1500));
    const n = await cd.identifyByDomain("bluepinefoods-payments.in");
    console.log("IDENTIFY lookalike:", JSON.stringify(n.ok ? n.data : n).slice(0, 300));
  }
  if (which === "all" || which === "enrich") {
    const e = await cd.enrich(12347153);
    if (e.ok) {
      const c = e.data?.[0]?.matches?.[0]?.company_data ?? e.data?.[0];
      console.log("ENRICH top keys:", Object.keys(e.data?.[0] ?? {}), "company keys:", Object.keys(c ?? {}));
      for (const k of ["headcount", "funding", "people", "web_traffic", "followers", "news", "hiring", "revenue", "locations", "basic_info"]) console.log(k, JSON.stringify(shape(c?.[k])).slice(0, 900));
    } else console.log(e);
  }
  if (which === "all" || which === "people") {
    const p = await cd.peopleEverAtCompany(12347153, "Naveen", 3);
    console.log("PERSON SEARCH:", JSON.stringify(p.ok ? shape(p.data) : p).slice(0, 2500));
  }
  if (which === "all" || which === "jobs") {
    const j = await cd.jobCount(12347153, "2026-08-01");
    console.log("JOBS:", JSON.stringify(j.ok ? j.data : j).slice(0, 400));
  }
  if (which === "web") {
    const w = await cd.webSearch("BluePine Foods Shark Tank India", ["news"]);
    console.log("WEB:", JSON.stringify(w.ok ? shape(w.data) : w).slice(0, 1500));
  }
  console.log("run spent:", b.credits, "calls", b.calls, "cache", b.cacheHits, "| ledger", ledger());
})();
