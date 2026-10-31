/**
 * Heartbeat: composite liveliness score (0-100) from CrustData signals already fetched (no extra credits).
 *   Heartbeat = round( Σ w_i·s_i / Σ w_i ) over components with real data; Coverage = Σ w_i(available) / 100.
 * Missing data is excluded, never scored 0. Activity only — never a legitimacy or fraud signal.
 */
import type { Heartbeat, HeartbeatComponent } from "../types";

export const HEARTBEAT_WEIGHTS = { team: 25, hiring: 20, demand: 20, audience: 10, news: 15, capital: 10 };

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
const daysSince = (d: string, now: Date) => (now.getTime() - Date.parse(d)) / 86_400_000;

export type HeartbeatInput = {
  company: any;
  evidence: { enrich: string; jobs?: string; news?: string };
  jobs90: number | null;
  relevantNewsDates: string[];
  /** Domains whose traffic belongs to someone else (e.g. an acquirer redirect). */
  excludeTraffic?: string;
  now?: Date;
};

export function computeHeartbeat(inp: HeartbeatInput): Heartbeat {
  const c = inp.company ?? {};
  const now = inp.now ?? new Date();
  const comps: HeartbeatComponent[] = [];
  const W = HEARTBEAT_WEIGHTS;

  // Team momentum
  const g = c.headcount?.growth_percent ?? {};
  const growth = g.six_months ?? g.yoy ?? null;
  if (typeof growth === "number") comps.push({ name: "Team momentum", weight: W.team, value: `${growth}% (${g.six_months !== undefined && g.six_months !== null ? "6m" : "12m"})`, score: clamp(50 + (50 * growth) / 30), evidenceIds: [inp.evidence.enrich] });
  else comps.push({ name: "Team momentum", weight: W.team, evidenceIds: [], missingReason: "headcount growth not reported" });

  // Hiring
  if (inp.jobs90 !== null) comps.push({ name: "Hiring (roles, 90d)", weight: W.hiring, value: `${inp.jobs90} roles`, score: clamp(25 * Math.log2(1 + inp.jobs90)), evidenceIds: inp.evidence.jobs ? [inp.evidence.jobs] : [] });
  else comps.push({ name: "Hiring (roles, 90d)", weight: W.hiring, evidenceIds: [], missingReason: "job search not run" });

  // Digital demand
  const traffic = c.web_traffic?.domain_traffic ?? {};
  const primary = c.basic_info?.primary_domain;
  const t = primary ? traffic[primary] : Object.values(traffic)[0];
  if (inp.excludeTraffic) comps.push({ name: "Digital demand", weight: W.demand, evidenceIds: [inp.evidence.enrich], missingReason: `excluded: ${inp.excludeTraffic}` });
  else if (t && (typeof t.qoq_pct === "number" || typeof t.mom_pct === "number")) {
    const gr = typeof t.qoq_pct === "number" ? t.qoq_pct : t.mom_pct;
    const series: number[] = (t.monthly_visitors_timeseries ?? []).slice(-4).map((x: any) => x.monthly_visitors).filter((x: any) => typeof x === "number" && x > 0);
    const volatile = series.length >= 2 && Math.max(...series) / Math.min(...series) > 3;
    comps.push({ name: "Digital demand", weight: volatile ? W.demand / 2 : W.demand, value: `${t.monthly_visitors?.toLocaleString?.("en-US") ?? "?"} visits/mo, ${Math.round(gr)}% ${typeof t.qoq_pct === "number" ? "QoQ" : "MoM"}`, score: clamp(50 + (50 * Math.max(-100, Math.min(100, gr))) / 25), evidenceIds: [inp.evidence.enrich], note: volatile ? "volatile traffic (>3× swing in 3 months): weight halved (R-VOLATILE)" : undefined });
  } else comps.push({ name: "Digital demand", weight: W.demand, evidenceIds: [], missingReason: "web traffic not reported" });

  // Audience
  const f = c.followers ?? {};
  const fg = f.qoq_percent ?? f.mom_percent ?? null;
  if (typeof fg === "number") comps.push({ name: "Audience momentum", weight: W.audience, value: `${f.count ?? "?"} followers, ${fg.toFixed(1)}% ${f.qoq_percent !== null && f.qoq_percent !== undefined ? "QoQ" : "MoM"}`, score: clamp(50 + (50 * fg) / 15), evidenceIds: [inp.evidence.enrich] });
  else comps.push({ name: "Audience momentum", weight: W.audience, evidenceIds: [], missingReason: "follower growth not reported" });

  // News recency
  const newest = inp.relevantNewsDates.filter(Boolean).sort().slice(-1)[0];
  if (newest) {
    const d = daysSince(newest, now);
    const s = d <= 30 ? 100 : d <= 90 ? 75 : d <= 180 ? 50 : d <= 365 ? 25 : 0;
    comps.push({ name: "News recency", weight: W.news, value: `latest relevant ${newest.slice(0, 10)} (${Math.round(d)}d)`, score: s, evidenceIds: inp.evidence.news ? [inp.evidence.news] : [inp.evidence.enrich] });
  } else comps.push({ name: "News recency", weight: W.news, evidenceIds: [], missingReason: "no relevant dated news" });

  // Capital recency
  const lf = c.funding?.last_fundraise_date ?? c.funding?.milestones?.map((m: any) => m.funding_date ?? m.date).filter(Boolean).sort().slice(-1)[0];
  if (lf) {
    const m = daysSince(lf, now) / 30.4;
    comps.push({ name: "Capital recency", weight: W.capital, value: `last round ${String(lf).slice(0, 10)}`, score: m <= 12 ? 100 : m <= 24 ? 60 : m <= 36 ? 30 : 10, evidenceIds: [inp.evidence.enrich] });
  } else comps.push({ name: "Capital recency", weight: W.capital, evidenceIds: [], missingReason: "no dated funding round" });

  const avail = comps.filter(x => typeof x.score === "number");
  const wsum = avail.reduce((a, x) => a + x.weight, 0);
  const score = wsum ? Math.round(avail.reduce((a, x) => a + x.weight * (x.score as number), 0) / wsum) : null;
  const coverage = Math.round((wsum / 100) * 100) / 100;
  const band = score === null || coverage < 0.5 ? "Low signal" : score >= 70 ? "Strong pulse" : score >= 40 ? "Steady" : score >= 20 ? "Faint" : "Flatline signals";

  const ts: any[] = c.headcount?.timeseries ?? [];
  const pulse = ts.slice(-24).map(x => Number(x.employee_count) || 0);
  const asOf = [ts.slice(-1)[0]?.date, t?.monthly_visitors_timeseries?.slice(-1)[0]?.date].filter(Boolean).sort().slice(-1)[0]?.slice(0, 10);
  return { score, band, coverage, asOf, components: comps, pulse };
}
