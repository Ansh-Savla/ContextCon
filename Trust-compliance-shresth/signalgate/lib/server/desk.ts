/**
 * SignalGate diligence desk. One request in, a finished decision package out:
 *   Intake → Resolve (CrustData identity graph) → Company profile → People → Screening (adverse, fraud)
 *   → Analysis (investment case or credit readiness) → Decision (rules only) → Case clerk (local actions).
 * Every status and decision is rule-based and cites evidence. The LLM only reads requests, judges relevance and drafts prose.
 */
import fs from "node:fs";
import path from "node:path";
import { Crustdata, type Emit } from "./crustdata";
import { RunBudget, round } from "./budget";
import { config } from "./config";
import { runIntake } from "./intake";
import { compareDomain, normalizeDomain } from "./domain";
import { computeHeartbeat } from "./heartbeat";
import { llmJson, llmLabel } from "./llm";
import { tavilySearch, tavilyEnabled, type WebHit } from "./tavily";
import type { CaseResult, Check, CheckStatus, CompanyCandidate, Decision, Evidence, Intake, LocalAction, Metric, Person, PressImage, Section, Stage, TimelineEvent, TraceEvent } from "../types";

const norm = (s = "") => s.toLowerCase().replace(/[®©™]/g, "").replace(/\b(pvt|private|ltd|limited|inc|llc|corp|co|the|industries|technologies|tech)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const nameMatch = (a = "", b = "") => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const ym = (d?: string | null) => (d ? String(d).slice(0, 7) : "");
const usd = (n?: number | null) => (n === undefined || n === null ? "—" : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr` : `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L`);
const INR_PER_USD = 84; // labelled assumption, only used to compare INR asks with USD estimates

type Role = { companyId?: number; company?: string; title?: string; start?: string | null; end?: string | null; current: boolean };
function rolesOf(p: any): Role[] {
  const e = p?.experience?.employment_details ?? {};
  const map = (x: any, current: boolean): Role => ({
    companyId: Number(x.crustdata_company_id ?? x.company_id ?? (Array.isArray(x.employer_company_id) ? x.employer_company_id[0] : x.employer_company_id)) || undefined,
    company: x.name ?? x.employer_name, title: x.title ?? x.employee_title, start: x.start_date ?? x.employee_start_date, end: x.end_date ?? x.employee_end_date, current,
  });
  return [...(e.current ?? []).map((x: any) => map(x, true)), ...(e.past ?? []).map((x: any) => map(x, false))];
}
const personName = (p: any) => p?.basic_profile?.name ?? p?.name ?? "";
const profileUrl = (p: any) => p?.social_handles?.professional_network_identifier?.profile_url ?? undefined;

function candidatesOf(data: any): CompanyCandidate[] {
  const m = Array.isArray(data) ? data[0]?.matches ?? [] : [];
  return m.map((x: any) => {
    const b = x.company_data?.basic_info ?? {};
    return { id: Number(x.company_data?.crustdata_company_id ?? b.crustdata_company_id), name: b.name, domain: b.primary_domain, score: Number(x.confidence_score ?? 0), size: b.employee_count_range, industry: (b.industries ?? [])[0], description: (b.description ?? "").slice(0, 140) };
  }).filter((c: CompanyCandidate) => c.id);
}

const ENRICH = ["basic_info", "headcount", "funding", "people", "locations", "taxonomy", "news", "web_traffic", "followers", "revenue", "hiring", "seo", "competitors"];

export async function runDesk(raw: string, onEvent: (e: TraceEvent) => void = () => {}): Promise<CaseResult> {
  const t0 = Date.now();
  const trace: TraceEvent[] = [];
  let stage: Stage = "intake";
  const emit: Emit = e => { const ev = { stage, ...e, t: Date.now() - t0 } as TraceEvent; trace.push(ev); onEvent(ev); };
  const go = (s: Stage, step: string, detail?: string) => { stage = s; emit({ agent: "system", step, detail, status: "info" }); };
  const budget = new RunBudget();
  const cd = new Crustdata(budget, emit);
  const evidence: Evidence[] = [];
  const checks: Check[] = [];
  const conditions: string[] = [];
  const ev = (e: Omit<Evidence, "id" | "retrievedAt">) => { const id = `S${evidence.length + 1}`; evidence.push({ id, retrievedAt: new Date().toISOString(), ...e }); return id; };
  const check = (c: Omit<Check, "id">) => { checks.push({ id: `K${checks.length + 1}`, ...c }); };
  const cond = (s: string) => { if (!conditions.includes(s)) conditions.push(s); };

  go("intake", "Reading the request", `brain ${llmLabel()} · budget ${config.budget.creditsPerRun} credits · web research ${tavilyEnabled() ? "Tavily + CrustData" : "CrustData"}`);
  const intake: Intake = await runIntake(raw, budget, emit);
  ev({ kind: "input", provider: "Request", note: "Request as submitted", value: raw.slice(0, 3000) });
  const investor = intake.requester === "investor";

  // ---------------- resolve ----------------
  go("resolve", "Resolving the company in CrustData's identity graph");
  let candidates: CompanyCandidate[] = [];
  let identity: CaseResult["identity"] = { status: "unresolved", candidates: [] };
  let idEv = "";
  if (intake.senderDomain && !intake.domain) {
    const s = await cd.identifyByDomain(intake.senderDomain.value);
    if (s.ok) { const c = candidatesOf(s.data); ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/identify", value: { domains: [intake.senderDomain.value], matches: c.length }, note: c.length ? `Sender domain belongs to ${c[0].name}` : "Sender domain matches no company in the graph", cached: s.cached }); }
  }
  if (intake.domain) {
    const r = await cd.identifyByDomain(intake.domain.value);
    if (r.ok) {
      candidates = candidatesOf(r.data);
      idEv = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/identify", recordId: candidates[0]?.id, value: { domains: [intake.domain.value], top: candidates[0] }, note: candidates[0] ? `Domain resolves to ${candidates[0].name} (confidence ${candidates[0].score})` : "No match", cached: r.cached });
      if (candidates[0]) identity = { status: "resolved", company: candidates[0], candidates, method: `website ${intake.domain.value}`, note: intake.company && !nameMatch(intake.company.value, candidates[0].name) ? `Request calls it “${intake.company.value}”; the website resolves to “${candidates[0].name}”` : undefined };
    }
  }
  if (identity.status !== "resolved" && intake.company) {
    const variants = [intake.company.value, intake.company.value.replace(/\b(industries|pvt\.?|private|ltd\.?|limited|inc\.?|llc|technologies)\b/gi, "").replace(/\s+/g, " ").trim()].filter((v, i, a) => v && a.indexOf(v) === i);
    for (const v of variants) {
      const r = await cd.identifyByName(v);
      if (!r.ok) continue;
      candidates = candidatesOf(r.data);
      idEv = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/identify", value: { names: [v], candidates: candidates.slice(0, 6) }, note: `${candidates.length} candidate(s) for “${v}”`, cached: r.cached });
      if (!candidates.length) continue;
      const top = candidates.filter(c => nameMatch(v, c.name))[0] ?? candidates[0];
      const rivals = candidates.filter(c => c.id !== top.id && c.score >= top.score - 0.15 && nameMatch(v, c.name));
      identity = top.score >= 0.75 && nameMatch(v, top.name) && !rivals.length
        ? { status: "resolved", company: top, candidates, method: `name “${v}”`, note: v !== intake.company.value ? `Input name “${intake.company.value}” had no match; resolved via “${v}”` : undefined }
        : { status: "ambiguous", candidates: candidates.slice(0, 6), method: `name “${v}”`, note: `${candidates.length} companies match “${v}”${rivals.length ? `, ${rivals.length + 1} of them equally strong` : ""}. A website or registration number is needed.` };
      break;
    }
  }
  emit({ agent: "investigator", step: "Identity", detail: identity.status === "resolved" ? `${identity.company!.name} · CrustData id ${identity.company!.id} · via ${identity.method}` : identity.note ?? identity.status, status: identity.status === "resolved" ? "ok" : "info" });

  // ---------------- profile ----------------
  let co: any = null, coEv = "";
  let heartbeat: CaseResult["heartbeat"];
  let profile: CaseResult["profile"];
  const people: Person[] = [];
  let investment: CaseResult["investment"];
  let credit: CaseResult["credit"];
  let acquiredBy: string | undefined;
  let acquiredOn: string | undefined;
  let series: CaseResult["series"];
  const events: TimelineEvent[] = [];
  let parent: CaseResult["parent"];
  let peers: CaseResult["peers"];
  let monitoring: CaseResult["monitoring"];
  const pressImages: PressImage[] = [];
  let plan: CaseResult["plan"];
  const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "web"; } };

  if (identity.status === "resolved") {
    go("profile", "Building the company profile");
    const r = await cd.enrich(identity.company!.id, ENRICH);
    if (r.ok) { co = r.data?.[0]?.matches?.[0]?.company_data ?? null; coEv = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: identity.company!.id, fieldPath: ENRICH.join(", "), note: co?.basic_info?.name, cached: r.cached }); }
    check({ section: "kyb", title: "Legal entity resolved", claim: intake.company?.value ?? intake.domain?.value, submitted: [intake.company?.value, intake.domain?.value].filter(Boolean).join(" · "), observed: `${identity.company!.name} · id ${identity.company!.id} · ${identity.method}`, status: "verified", rule: "KYB-ID", reason: identity.note ?? "Exactly one company in the identity graph matches", evidenceIds: [idEv, coEv].filter(Boolean), material: true });
  } else {
    check({ section: "kyb", title: "Legal entity resolved", claim: intake.company?.value, submitted: intake.company?.value, observed: identity.note ?? "No match in the identity graph", status: "unverified", rule: "KYB-ID", reason: identity.status === "ambiguous" ? "Several companies match; no company-specific conclusions are drawn" : "The company could not be found", evidenceIds: [idEv].filter(Boolean), material: true });
    cond(identity.status === "ambiguous" ? `Obtain the website domain or registration number for “${intake.company?.value}”` : "Obtain the company's website domain and registration number");
  }

  if (co) {
    const b = co.basic_info ?? {};
    const L = co.locations ?? {};
    const canon: string[] = [b.primary_domain, ...(b.all_domains ?? [])].filter(Boolean).map(normalizeDomain);
    const acq = (co.funding?.acquired_by ?? []).filter(Boolean);
    if (acq.length || /acquired/i.test(co.revenue?.acquisition_status ?? "")) {
      const a0 = acq[0] ?? {};
      acquiredBy = a0.name ?? a0.acquirer_name ?? a0.acquiring_company_name ?? (typeof a0 === "string" ? a0 : "an acquirer");
      const when = a0.announced_date ?? a0.acquired_on ?? a0.date ?? "";
      if (when) { acquiredOn = String(when).slice(0, 10); acquiredBy += ` (${acquiredOn})`; }
    }
    profile = { name: b.name, domain: b.primary_domain, founded: b.year_founded, hq: [L.city, L.state, L.country].filter(Boolean).join(", "), country: L.country, headcount: co.headcount?.total, range: b.employee_count_range, description: b.description, linkedin: b.professional_network_url, logo: b.logo_permalink, industry: (co.taxonomy?.professional_network_industries ?? [])[0], status: b.status, acquiredBy };

    // KYB: ownership / independence
    if (acquiredBy) {
      const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "funding.acquired_by, revenue.acquisition_status", value: { acquired_by: acq.slice(0, 2), acquisition_status: co.revenue?.acquisition_status, status: b.status }, note: `Acquired by ${acquiredBy}` });
      const claimedIndep = intake.claims.some(c => c.kind === "independent");
      check({ section: "kyb", title: "Ownership", claim: claimedIndep ? "Independently owned" : "Independent company (implied)", submitted: claimedIndep ? "independent" : undefined, observed: `Acquired by ${acquiredBy}`, status: "contradicted", rule: "KYB-OWNERSHIP", reason: investor ? "Not an independent company — equity would be in a subsidiary of the acquirer" : claimedIndep ? "The applicant says it is independent, but the record shows a parent company" : "The borrower is a subsidiary; the parent's guarantee and the contracting entity must be confirmed", evidenceIds: [e], material: investor || claimedIndep });
      if (/active/i.test(b.status ?? "")) check({ section: "kyb", title: "Registry status consistency", observed: `Listed “${b.status}” although acquired`, status: "review", rule: "KYB-STATUS", reason: "The provider's own fields disagree; confirm the entity is still trading", evidenceIds: [e] });
      cond(investor ? `Confirm what entity would issue shares (acquired by ${acquiredBy})` : `Confirm the contracting legal entity and obtain a parent guarantee from ${acquiredBy}`);
    } else {
      check({ section: "kyb", title: "Ownership", observed: "No acquirer on record", status: "verified", rule: "KYB-OWNERSHIP", reason: "Independent company per the identity graph", evidenceIds: [coEv] });
    }

    // KYB: claims
    for (const c of intake.claims) {
      if (c.kind === "founded") {
        const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "basic_info.year_founded", value: b.year_founded });
        const st: CheckStatus = !b.year_founded ? "unverified" : b.year_founded === c.value ? "verified" : Math.abs(b.year_founded - Number(c.value)) <= 1 ? "review" : "contradicted";
        check({ section: "kyb", title: "Year founded", claim: c.text, submitted: String(c.value), observed: b.year_founded ? String(b.year_founded) : "not on record", status: st, rule: "KYB-FOUNDED", reason: st === "verified" ? "Matches the record" : st === "unverified" ? "No founding year on record" : `Record says ${b.year_founded}`, evidenceIds: [e], material: st === "contradicted" });
      }
      if (c.kind === "location") {
        const obs = [L.city, L.state, L.country].filter(Boolean).join(", ");
        const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "locations", value: obs });
        const REGION: Record<string, string[]> = { ncr: ["delhi", "new delhi", "faridabad", "gurgaon", "gurugram", "noida", "ghaziabad", "haryana"], delhi: ["delhi", "new delhi", "faridabad", "gurgaon", "gurugram", "noida", "ghaziabad"], massachusetts: ["ma", "massachusetts", "boston"], bangalore: ["bengaluru", "bangalore", "karnataka"], mumbai: ["mumbai", "maharashtra"], ohio: ["oh", "ohio", "cincinnati"] };
        const COUNTRY = new Set(["usa", "us", "india", "ind", "united", "states"]);
        const all = norm(String(c.value)).split(" ").filter(t => t.length > 1);
        const toks = all.some(t => !COUNTRY.has(t)) ? all.filter(t => !COUNTRY.has(t)) : all;
        const o = " " + norm(obs) + " ";
        const hit = toks.some(t => o.includes(" " + t + " ") || (REGION[t] ?? []).some(a => o.includes(" " + a + " ")));
        check({ section: "kyb", title: "Registered location", claim: c.text, submitted: String(c.value), observed: obs || "not on record", status: !obs ? "unverified" : hit ? "verified" : "review", rule: "KYB-LOCATION", reason: hit ? "Location matches (regional aliases applied)" : obs ? "Different city/region on record — could be a move, a branch or an acquirer's HQ" : "No location on record", evidenceIds: [e] });
      }
      if (c.kind === "headcount") {
        const total = co.headcount?.total, rng = b.employee_count_range;
        const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "headcount.total, basic_info.employee_count_range", value: { measured: total, profile_range: rng } });
        const n = Number(c.value);
        const close = typeof total === "number" && Math.abs(n - total) <= Math.max(3, total * 0.3);
        const st: CheckStatus = typeof total !== "number" ? "unverified" : close ? "verified" : "contradicted";
        check({ section: "kyb", title: "Operating scale (headcount)", claim: c.text, submitted: n.toLocaleString("en-US"), observed: `${total ?? "?"} measured · ${rng ?? "?"} self-reported band`, status: st, rule: "KYB-SCALE", reason: st === "verified" ? "Matches the measured headcount" : st === "unverified" ? "No measured headcount" : `Measured ${total} people. Self-reported bands are not measurements.${acquiredBy ? " Some profiles may be stale after the acquisition." : ""}`, evidenceIds: [e], material: st === "contradicted" });
        if (st === "contradicted") cond(`Payroll register or org chart supporting ~${n.toLocaleString("en-US")} staff (CrustData measures ${total})`);
      }
      if (c.kind === "revenue") {
        const est = co.revenue?.estimated ?? {};
        const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "revenue.estimated", value: { lower: est.lower_bound_usd, upper: est.upper_bound_usd } });
        const v = Number(c.value) / (String(c.text).includes("₹") ? INR_PER_USD : 1);
        const st: CheckStatus = !est.upper_bound_usd ? "unverified" : v > est.upper_bound_usd * 2 ? "contradicted" : "review";
        check({ section: investor ? "investment" : "credit", title: "Revenue", claim: c.text, submitted: c.text.replace(/^Revenue\s*/, ""), observed: est.upper_bound_usd ? `${usd(est.lower_bound_usd)}–${usd(est.upper_bound_usd)} model estimate` : "no estimate", status: st, rule: "FIN-REVENUE", reason: st === "contradicted" ? "Far above the provider's estimate" : "Only a model estimate exists — it cannot verify revenue", evidenceIds: [e], material: st === "contradicted" });
        cond(investor ? "Audited financials or management accounts for the last 2 years" : "Last 2 years' financial statements and 12 months of bank statements");
      }
      if (c.kind === "other" && /ads/i.test(c.text)) {
        const ads = co.seo?.monthly_google_ads_budget;
        const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "seo.monthly_google_ads_budget", value: ads });
        check({ section: "investment", title: "Marketing spend", claim: c.text, observed: ads ? `${usd(ads)}/mo estimated` : "not on record", status: acquiredBy ? "review" : ads ? "verified" : "unverified", rule: "FIN-ADS", reason: acquiredBy ? `Likely the acquirer's spend — the website now belongs to ${acquiredBy}` : "Provider SEO estimate", evidenceIds: [e] });
      }
    }

    // Operating substance (shell-company triage)
    const age = b.year_founded ? new Date().getFullYear() - b.year_founded : undefined;
    const visits = Object.values<any>(co.web_traffic?.domain_traffic ?? {})[0]?.monthly_visitors;
    const subst = [typeof co.headcount?.total === "number" ? `${co.headcount.total} staff` : "headcount unknown", visits ? `${Number(visits).toLocaleString("en-US")} visits/mo` : "no web traffic", age !== undefined ? `${age} yrs operating` : "age unknown", (co.followers?.count ? `${co.followers.count.toLocaleString("en-US")} followers` : "")].filter(Boolean).join(" · ");
    const thin = (co.headcount?.total ?? 0) < 2 && !visits;
    const sEv = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "headcount.total, web_traffic, followers, basic_info.year_founded", value: subst });
    check({ section: "kyb", title: "Operating substance", observed: subst, status: thin ? "review" : "verified", rule: "KYB-SUBSTANCE", reason: thin ? "Very thin operating footprint — not proof of a shell, but needs documents" : "Observable staff and customer-facing activity", evidenceIds: [sEv] });

    // ---------------- people ----------------
    go("people", "Verifying founders and representatives");
    const listed: any[] = [...(co.people?.founders ?? []), ...(co.people?.cxos ?? []), ...(co.people?.decision_makers ?? [])];
    const seen = new Set<number>();
    for (const p of listed) {
      if (seen.has(p.crustdata_person_id)) continue; seen.add(p.crustdata_person_id);
      const rr = rolesOf(p);
      const atCo = rr.filter(r => r.companyId === b.crustdata_company_id);
      const cur = atCo.find(r => r.current && !r.end);
      const prior = rr.filter(r => r.companyId !== b.crustdata_company_id && /founder|co-founder|ceo/i.test(r.title ?? "")).map(r => `${r.title} · ${r.company}${r.start ? ` (${ym(r.start)}${r.end ? "–" + ym(r.end) : ""})` : ""}`).slice(0, 3);
      people.push({ id: p.crustdata_person_id, photo: (p.basic_profile?.profile_picture_permalink ?? p.professional_network?.profile_picture_permalink ?? undefined), name: personName(p), title: cur?.title ?? atCo[0]?.title ?? p.basic_profile?.current_title, since: ym(cur?.start ?? atCo[0]?.start), until: cur ? undefined : ym(atCo[0]?.end), current: !!cur || !atCo.length, profileUrl: profileUrl(p), priorFounder: prior, headline: p.basic_profile?.headline, evidenceId: coEv });
      if (people.length >= 5) break;
    }
    for (const c of intake.claims.filter(x => x.kind === "person_role" && x.person)) {
      const who = c.person!;
      let person = listed.find(p => nameMatch(personName(p), who)), src = "/company/enrich";
      const atCo = (p: any) => rolesOf(p).filter(r => r.companyId === b.crustdata_company_id);
      if (!person || !atCo(person).length) {
        const s = await cd.peopleEverAtCompany(b.crustdata_company_id, who, 3);
        if (s.ok) { person = (s.data?.profiles ?? []).find((p: any) => nameMatch(personName(p), who)) ?? (s.data?.profiles ?? [])[0]; src = "/person/search"; }
        else if (s.skipped) { check({ section: "people", title: `${who}`, claim: c.text, observed: "not checked", status: "not_run", rule: "BUDGET", reason: s.message, evidenceIds: [] }); continue; }
      }
      const e = ev({ kind: "crustdata", provider: "CrustData", endpoint: src, recordId: person?.crustdata_person_id, url: profileUrl(person), fieldPath: "experience.employment_details", value: person ? atCo(person).map(r => ({ title: r.title, start: r.start, end: r.end })) : "no match", note: person ? personName(person) : `Nobody named “${who}” has ever worked at ${b.name}` });
      const isSender = intake.people[0]?.name === who && !!intake.senderDomain;
      if (!person || !atCo(person).length) {
        check({ section: isSender ? "fraud" : "people", title: isSender ? "Sender is a real employee" : `${who}`, claim: c.text, submitted: who, observed: `No current or past employee by that name at ${b.name}`, status: isSender ? "contradicted" : "unverified", rule: isSender ? "FRAUD-SENDER" : "PPL-ROLE", reason: isSender ? "The person asking to move money is not found at the company" : "Not found in the company's people data", evidenceIds: [e], material: isSender });
        continue;
      }
      const rr = atCo(person);
      const cur = rr.find(x => x.current && !x.end);
      if (!people.some(p => p.id === person.crustdata_person_id)) people.push({ id: person.crustdata_person_id, photo: person.basic_profile?.profile_picture_permalink ?? undefined, name: personName(person), title: (cur ?? rr[0]).title, since: ym((cur ?? rr[0]).start), until: cur ? undefined : ym(rr[0].end), current: !!cur, profileUrl: profileUrl(person), evidenceId: e });
      if (cur) check({ section: "people", title: personName(person), claim: c.text, submitted: who, observed: `${cur.title} since ${ym(cur.start)}`, status: "verified", rule: "PPL-ROLE", reason: "Currently at the company", evidenceIds: [e] });
      else {
        const last = rr.sort((x, y) => String(y.end ?? "").localeCompare(String(x.end ?? "")))[0];
        check({ section: "people", title: personName(person), claim: c.text, submitted: who, observed: `${last.title} ${ym(last.start)} → ${ym(last.end)} — left`, status: "contradicted", rule: "PPL-DEPARTED", reason: `Presented as current, but the role ended ${ym(last.end)}`, evidenceIds: [e], material: true });
        cond(`Exit documents for ${personName(person)} (left ${ym(last.end)}): share transfer / vesting and current involvement`);
      }
    }
    if (!intake.claims.some(c => c.kind === "person_role") && people.length) check({ section: "people", title: "Leadership on record", observed: people.slice(0, 3).map(p => `${p.name} (${p.title ?? "?"})`).join("; "), status: "info", rule: "PPL-LIST", reason: "Founders and decision makers from the identity graph", evidenceIds: [coEv] });

    // ---------------- screening + fraud ----------------
    go("screening", "Screening for fraud and adverse information");
    if (intake.senderDomain) {
      const v = compareDomain(intake.senderDomain.value, canon);
      const e = ev({ kind: "derived", provider: "Rule", fieldPath: "domain comparison", value: v, note: `${intake.senderDomain.value} vs ${canon.join(", ")}` });
      const st: CheckStatus = v.kind === "same" || v.kind === "subdomain" ? "verified" : v.kind === "free_mail" ? "review" : "contradicted";
      check({ section: "fraud", title: "Sender domain", submitted: intake.senderDomain.value, observed: v.kind === "lookalike" ? `Imitates ${canon[0]}: ${v.signals.join("; ")}` : v.reason, status: st, rule: v.kind === "lookalike" ? "FRAUD-LOOKALIKE" : "FRAUD-DOMAIN", reason: v.kind === "lookalike" ? "Lookalike of the real domain — the classic payment-redirection pattern" : v.reason, evidenceIds: [e, coEv].filter(Boolean), material: st === "contradicted" });
    }
    if (intake.claims.some(c => c.kind === "bank_change")) {
      check({ section: "fraud", title: "Authority to change payment details", submitted: "new bank account", observed: "Cannot be established from public data", status: "not_run", rule: "FRAUD-WIRE-POLICY", reason: "Any change of wire instructions needs a call-back to a number already on file", evidenceIds: [] });
      cond("Call back the company on a number already on file (not the one in the email) before releasing any funds");
    }

    const short = String(b.name).replace(/[®©™]/g, "").replace(/\b(pvt|private|ltd|limited|inc|llc)\b\.?/gi, "").replace(/\s+/g, " ").trim();
    const isRel = (t: string, u = "") => { const x = norm(t + " " + u), core = norm(short).split(" ").filter(w => w.length >= 4)[0] ?? norm(short), stem = (b.primary_domain ?? "").split(".")[0]; return (core && x.includes(core)) || (stem && x.includes(stem)); };
    let hits: Array<WebHit & { label?: string; kind?: string }> = (co.news ?? []).map((n: any) => ({ title: n.article_title, url: n.article_url, snippet: "", date: n.article_publish_date, provider: "CrustData web" as const }));
    const newsEv = co.news?.length ? ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "news", value: (co.news ?? []).slice(0, 5).map((n: any) => ({ date: n.article_publish_date, title: n.article_title })), note: `${co.news.length} news items` }) : "";
    const queries: Array<{ q: string; why: string }> = [{ q: `${short} fraud lawsuit complaint regulator`, why: "adverse media" }];
    if (intake.claims.some(c => c.kind === "shark_deal")) queries.push({ q: `${short} Shark Tank deal`, why: "deal corroboration" });
    const webEvs: string[] = [];
    for (const { q, why } of queries) {
      let got: WebHit[] = [];
      let provider: "Tavily" | "CrustData web" = "Tavily";
      const tv = await tavilySearch(q, budget, emit, why === "adverse media" ? "general" : "news");
      if (tv.ok) { got = tv.hits; if (why === "deal corroboration") for (const im of tv.images.slice(0, 4)) pressImages.push({ url: im.url, source: hostOf(im.url), caption: im.description }); }
      else {
        provider = "CrustData web";
        const w = await cd.webSearch(q.replace(/ regulator$/, ""), ["news"]);
        if (w.ok) got = (w.data?.results ?? []).slice(0, 6).map((r: any) => ({ title: r.title ?? "", url: r.url ?? "", snippet: r.snippet ?? "", date: r.date, provider: "CrustData web" as const }));
      }
      webEvs.push(ev({ kind: "web", provider, endpoint: provider === "Tavily" ? "tavily /search" : "/web/search/live", value: { query: q, results: got.length }, note: `${why}: ${got.slice(0, 2).map(g => g.title).join(" | ")}` }));
      hits.push(...got);
    }
    let judged = hits.map(h => ({ ...h, label: isRel(h.title, h.url) ? "relevant" : "namesake", kind: "" }));
    if (judged.length) {
      const j = await llmJson<{ items: Array<{ i: number; label: string; kind: string }> }>({
        purpose: "Judge whether each article is about this company", agent: "screening", budget, emit, fast: true,
        schema: { type: "OBJECT", properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { i: { type: "INTEGER" }, label: { type: "STRING", enum: ["relevant", "namesake", "different event"] }, kind: { type: "STRING", enum: ["deal report", "allegation", "regulator action", "court finding", "business news", "other"] } } } } } },
        prompt: `Company: ${b.name} (${b.primary_domain}; ${b.description ?? ""}; HQ ${L.city ?? ""}, founded ${b.year_founded}). For each article decide if it is about THIS company ("relevant"), a different organisation with a similar name ("namesake"), or this company but a different event than claimed ("different event"); and classify its kind.\n` + judged.map((h, i) => `${i}. ${h.title} — ${h.url} — ${h.snippet.slice(0, 200)}`).join("\n"),
        validate: x => Array.isArray(x?.items),
      });
      if (j) for (const it of j.data.items) if (judged[it.i]) { judged[it.i].label = it.label; judged[it.i].kind = it.kind; }
    }
    const relevant = judged.filter(h => h.label === "relevant");
    const adverse = relevant.filter(h => h.kind === "allegation" || h.kind === "regulator action" || h.kind === "court finding" || /fraud|lawsuit|sued|court|regulator|sebi|rbi|ftc|penalt|scam|arrest|probe|default/i.test(h.title + " " + h.snippet));
    check({ section: "screening", title: "Adverse media", observed: adverse.length ? adverse.slice(0, 3).map(a => `${a.kind || "item"}: ${a.title.slice(0, 80)}`).join(" · ") : `No relevant adverse items in ${judged.length} articles (${judged.length - relevant.length} about other organisations, discarded)`, status: adverse.length ? "review" : "verified", rule: "SCR-ADVERSE", reason: adverse.length ? "Allegations are not findings — read the originals" : "Absence of results is not a clean record; coverage is limited to sources searched", evidenceIds: [...webEvs, newsEv].filter(Boolean) });
    if (adverse.length) cond("Legal review of the adverse items listed in the screening section");
    check({ section: "screening", title: "Sanctions & PEP lists", observed: "Not screened in this build", status: "not_run", rule: "SCR-SANCTIONS", reason: "Official sanctions lists are outside the data sources connected here — run your usual sanctions screen", evidenceIds: [] });

    if (intake.claims.some(c => c.kind === "shark_deal")) {
      const c = intake.claims.find(x => x.kind === "shark_deal")!;
      const fund = co.funding ?? {};
      const rounds = (fund.milestones ?? []).map((m: any) => `${m.round_type ?? "?"} ${ym(m.funding_date ?? m.date)}${m.investors ? " (" + m.investors + ")" : ""}`);
      const fe = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "funding.total_investment_usd, funding.milestones", value: { total: fund.total_investment_usd, rounds } });
      const inCD = (fund.investors ?? []).some((i: any) => /shark|aman|ashneer|vineeta|namita|anupam|peyush|cuban|o'?leary|corcoran|greiner|herjavec/i.test(String(i)));
      const webSays = relevant.filter(n => { const s = n.title + " " + n.snippet; return /shark/i.test(s) && /(deal|invest|secured|offer|accepted|closed|raised|lakh|crore|\$\s?\d|for \d+\s?%)/i.test(s); });
      const st: CheckStatus = inCD ? "verified" : webSays.length ? "contradicted" : "unverified";
      check({ section: "investment", title: "Shark Tank deal", claim: c.text, submitted: c.text, observed: `Funding record: ${usd(fund.total_investment_usd)} total; ${rounds.join("; ") || "no rounds"}${webSays.length ? ` · Press: “${webSays[0].title.slice(0, 70)}”` : ""}`, status: st, rule: "FIN-DEAL", reason: st === "verified" ? "A Shark investor appears in the funding record" : st === "contradicted" ? "The press reports the deal but the funding record doesn't show it — it may not have closed as aired" : "No source confirms the deal", evidenceIds: [fe, ...webEvs].filter(Boolean) });
      if (st !== "verified") cond("Cap table and signed closing documents for the Shark Tank investment");
    }

    // ---------------- analysis ----------------
    go("analysis", investor ? "Building the investment case" : "Assessing credit readiness");
    const j90 = await cd.jobCount(b.crustdata_company_id, isoDaysAgo(90));
    let jobs90: number | null = null, jobsEv = "";
    if (j90.ok) { jobs90 = (j90.data?.aggregations?.[0]?.buckets ?? []).length; jobsEv = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/job/search", recordId: b.crustdata_company_id, fieldPath: "distinct job titles, last 90 days", value: jobs90, cached: j90.cached }); }
    heartbeat = computeHeartbeat({ company: co, jobs90, relevantNewsDates: relevant.map(n => n.date ?? "").filter(Boolean), evidence: { enrich: coEv, jobs: jobsEv, news: webEvs[0] ?? coEv }, excludeTraffic: acquiredBy ? `website traffic likely belongs to ${acquiredBy}` : undefined });
    emit({ agent: "analyst", step: "Company activity (Heartbeat)", detail: `${heartbeat.score ?? "—"} · ${heartbeat.band} · ${Math.round(heartbeat.coverage * 100)}% coverage`, status: "ok" });

    const hc = co.headcount ?? {};
    // ---- time series for charts (already fetched; 0 credits)
    {
      const dom = Object.keys(co.web_traffic?.domain_traffic ?? {})[0];
      const td = dom ? co.web_traffic.domain_traffic[dom] : undefined;
      const pts = (a: any[] | undefined, key: string, key2?: string) => (a ?? []).filter(x => x?.date && typeof x[key] === "number").map(x => ({ date: String(x.date).slice(0, 10), v: x[key], ...(key2 && typeof x[key2] === "number" ? { v2: x[key2] } : {}) })).slice(-36);
      const top = (o: Record<string, number> | undefined, n = 8) => Object.entries(o ?? {}).filter(([, v]) => typeof v === "number" && v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, v]) => ({ label, v }));
      series = {
        headcount: pts(hc.timeseries, "employee_count"), traffic: pts(td?.monthly_visitors_timeseries, "monthly_visitors"), followers: pts(co.followers?.timeseries, "follower_count"),
        revenue: pts(co.revenue?.estimated?.timeseries, "revenue_lower_bound_usd", "revenue_upper_bound_usd"), openJobs: pts(co.hiring?.open_jobs_timeseries, "open_jobs"),
        roles: top(hc.by_role_absolute), regions: top(hc.by_region_absolute, 30), trafficDomain: dom, trafficExcluded: acquiredBy ? `traffic likely belongs to ${acquiredBy}` : undefined,
      };
    }
    // ---- events timeline (CrustData dates + Tavily press dates)
    if (b.year_founded) events.push({ date: `${b.year_founded}-01-01`, kind: "founded", title: "Founded", source: "CrustData", evidenceId: coEv });
    for (const m of co.funding?.milestones ?? []) { const d = m.funding_date ?? m.date; if (d) events.push({ date: String(d).slice(0, 10), kind: "funding", title: `${String(m.round_type ?? "Funding").replace(/_/g, " ")} round${m.amount_usd ? " · " + usd(m.amount_usd) : ""}`, detail: m.investors ?? undefined, source: "CrustData", evidenceId: coEv }); }
    if (acquiredOn) events.push({ date: acquiredOn, kind: "acquired", title: `Acquired by ${(acquiredBy ?? "").replace(/ \(.*\)$/, "")}`, source: "CrustData", evidenceId: coEv });
    for (const p of people) {
      if (p.since) events.push({ date: p.since + "-01", kind: "joined", title: `${p.name.replace(/^MasterChef\s+/, "")} joined · ${p.title ?? "role"}`, source: "CrustData", evidenceId: p.evidenceId });
      if (!p.current && p.until) events.push({ date: p.until + "-01", kind: "left", title: `${p.name} left · ${p.title ?? "role"}`, source: "CrustData", evidenceId: p.evidenceId });
    }
    for (const n of relevant.filter(x => x.provider === "CrustData web" && x.date).slice(0, 6)) events.push({ date: String(n.date).slice(0, 10), kind: "news", title: n.title, detail: hostOf(n.url), source: "CrustData", url: n.url, evidenceId: newsEv || coEv });
    for (const h of relevant.filter(x => x.provider === "Tavily" && x.date).slice(0, 4)) { const d = new Date(h.date!); if (!isNaN(d.getTime())) events.push({ date: d.toISOString().slice(0, 10), kind: "press", title: h.title, detail: hostOf(h.url), source: "Tavily", url: h.url }); }
    events.sort((x, y) => x.date.localeCompare(y.date));

    // ---- PLANNER: choose follow-up lookups (Gemini proposes from an allow-list; rules validate; playbook fallback)
    const dealCheck = checks.find(k => k.rule === "FIN-DEAL");
    const dealPress = relevant.find(n => /shark|deal|invest|lakh|crore|raised|secured/i.test(n.title) && /^https:\/\//.test(n.url) && !/google\.com\/goto/.test(n.url));
    const founderUrls = people.filter(p => p.profileUrl && /founder|ceo|director|promoter/i.test(p.title ?? "")).slice(0, 2);
    const ALLOWED: Record<string, { ok: boolean; cost: number; desc: string }> = {
      parent_lookup: { ok: !!acquiredBy, cost: 2, desc: "resolve and profile the acquirer (identify + enrich)" },
      founder_deepdive: { ok: founderUrls.length > 0, cost: founderUrls.length, desc: "career history and education of founders (person enrich)" },
      peer_benchmark: { ok: !!((co.taxonomy?.professional_network_industries ?? [])[0] && L.country), cost: 4, desc: "find comparable companies (company search)" },
      fetch_source: { ok: !!dealPress && !!dealCheck && dealCheck.status !== "verified", cost: 1, desc: "open the press article and quote the deal terms (web fetch)" },
      prepare_monitoring: { ok: !checks.some(k => k.section === "fraud" && k.status === "contradicted"), cost: 0, desc: "validate a post-closing watch rule (Watcher preview)" },
    };
    const playbook = Object.entries(ALLOWED).filter(([, v]) => v.ok).map(([name]) => ({ name, why: "rules playbook: preconditions met" }));
    const situation = { requester: intake.requester, acquired: acquiredBy ?? null, founders_with_profiles: founderUrls.length, deal_claim: dealCheck ? dealCheck.status : "none", press_article: dealPress?.title ?? null, industry: (co.taxonomy?.professional_network_industries ?? [])[0] ?? null, credits_left: Math.round((config.budget.creditsPerRun - budget.credits) * 100) / 100, fraud_signals: !ALLOWED.prepare_monitoring.ok };
    const pj = await llmJson<{ actions: Array<{ name: string; why: string }> }>({
      purpose: "Plan follow-up lookups", agent: "analyst", budget, emit, fast: true,
      schema: { type: "OBJECT", properties: { actions: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING", enum: Object.keys(ALLOWED) }, why: { type: "STRING" } }, required: ["name", "why"] } } }, required: ["actions"] },
      prompt: `You are the lead analyst on a ${intake.requester === "investor" ? "pre-investment diligence" : "lender KYB and credit"} case. Choose which follow-up lookups are worth their cost now. Only choose actions whose preconditions are true. Give a one-line reason each (cite the situation).\nACTIONS: ${JSON.stringify(Object.fromEntries(Object.entries(ALLOWED).map(([k, v]) => [k, { available: v.ok, credits: v.cost, does: v.desc }])))}\nSITUATION: ${JSON.stringify(situation)}`,
      validate: x => Array.isArray(x?.actions),
    });
    let chosen = pj ? pj.data.actions.filter(a => ALLOWED[a.name]?.ok) : playbook;
    let spent = 0;
    chosen = chosen.filter(a => { const c = ALLOWED[a.name].cost; if (spent + c > situation.credits_left) return false; spent += c; return true; });
    const want = new Set(chosen.map(a => a.name));
    plan = { by: pj ? pj.model : "rules playbook", actions: Object.keys(ALLOWED).filter(k => ALLOWED[k].ok).map(k => ({ name: k, why: chosen.find(a => a.name === k)?.why ?? "not chosen", ran: want.has(k) })) };
    emit({ agent: "analyst", brain: pj ? pj.model : "rules", step: "Planner chose follow-ups", detail: chosen.length ? chosen.map(a => `${a.name} — ${a.why}`).join(" · ") : "none needed", status: "ok" });

    // ---- founder deep-dive (person enrich, 1 cr each)
    if (want.has("founder_deepdive")) {
      for (const p of founderUrls) {
        const r = await cd.personEnrich(p.profileUrl!);
        const pd = r.ok ? r.data?.[0]?.matches?.[0]?.person_data : undefined;
        if (!pd) continue;
        const pe = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/person/enrich", recordId: p.id, url: p.profileUrl, fieldPath: "experience.employment_details, education.schools", note: `Career and education: ${p.name}`, cached: r.ok ? r.cached : undefined });
        const roles = rolesOf(pd);
        p.pastRoles = roles.filter(x => !x.current || x.end).slice(0, 6).map(x => `${x.title ?? "Role"} · ${x.company ?? "?"}${x.start ? ` (${ym(x.start)}–${x.end ? ym(x.end) : "now"})` : ""}`);
        p.education = ((pd.education?.schools ?? []) as any[]).slice(0, 3).map(s => [s.school, s.degree, s.field_of_study].filter(Boolean).join(" · ")).filter(Boolean);
        if (!p.photo) p.photo = pd.basic_profile?.profile_picture_permalink ?? undefined;
        const founded = roles.filter(x => /founder/i.test(x.title ?? "") && x.companyId !== b.crustdata_company_id);
        const yrs = roles.filter(x => x.start).map(x => ((x.end ? Date.parse(x.end) : Date.now()) - Date.parse(x.start!)) / 3.156e10);
        const avg = yrs.length ? Math.round((yrs.reduce((a, c) => a + c, 0) / yrs.length) * 10) / 10 : undefined;
        check({ section: "investment", title: `Founder track record · ${p.name.replace(/^MasterChef\s+/, "")}`, observed: `${founded.length} other founder role${founded.length === 1 ? "" : "s"}${avg ? ` · average tenure ${avg} yrs` : ""}${p.education?.length ? ` · ${p.education[0]}` : ""}`, status: "info", rule: "INV-FOUNDER", reason: founded.length ? "Repeat founder — prior ventures listed on the People tab" : "First-time founder on record", evidenceIds: [pe] });
      }
    }

    // ---- quote the press article (web fetch, 1 cr)
    if (want.has("fetch_source") && dealPress && dealCheck) {
      const f = await cd.webFetch(dealPress.url);
      const page = f.ok ? (f.data ?? [])[0] : undefined;
      if (page?.success && page.content) {
        const text = String(page.content).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
        const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && s.length < 400);
        const core = norm(short).split(" ")[0];
        const q = sentences.find(s => /(lakh|crore|₹|rs\.?\s?\d|\$\s?\d|\d+\s?%)/i.test(s) && /(shark|deal|invest|offer|equity|stake)/i.test(s) && (!core || norm(s).includes(core) || /momo|founder/i.test(s))) ?? sentences.find(s => /(lakh|crore|\$\s?\d|\d+\s?%)/i.test(s) && /(shark|deal)/i.test(s));
        const fe = ev({ kind: "web", provider: "CrustData web", endpoint: "/web/enrich/live", url: dealPress.url, title: page.title ?? dealPress.title, value: q ?? "(no deal sentence found)", note: q ? `Quote: “${q.slice(0, 220)}”` : "Article fetched; no sentence with deal terms found", sourceDate: page.timestamp ? new Date(page.timestamp * 1000).toISOString().slice(0, 10) : undefined, cached: f.ok ? f.cached : undefined });
        dealCheck.evidenceIds.push(fe);
        if (q) dealCheck.observed += ` · Article says: “${q.slice(0, 200)}${q.length > 200 ? "…" : ""}”`;
      }
    }

    // ---- parent company (if acquired): identify (free) + light enrich (2 cr)
    if (acquiredBy && want.has("parent_lookup")) {
      const pname = acquiredBy.replace(/ \(.*\)$/, "");
      const pr = await cd.identifyByName(pname);
      const pc = pr.ok ? candidatesOf(pr.data).find(x => nameMatch(pname, x.name)) : undefined;
      if (pc) {
        const pe = await cd.enrich(pc.id, ["basic_info", "headcount", "funding", "locations"]);
        const p0 = pe.ok ? pe.data?.[0]?.matches?.[0]?.company_data : undefined;
        const pev = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/enrich", recordId: pc.id, fieldPath: "basic_info, headcount, funding, locations", note: `Parent company: ${pc.name}`, cached: pe.ok ? pe.cached : undefined });
        parent = { id: pc.id, name: pc.name ?? pname, domain: p0?.basic_info?.primary_domain ?? pc.domain, logo: p0?.basic_info?.logo_permalink, headcount: p0?.headcount?.total, hq: [p0?.locations?.city, p0?.locations?.country].filter(Boolean).join(", "), fundingUsd: p0?.funding?.total_investment_usd ?? null, evidenceId: pev };
        check({ section: "kyb", title: "Parent company", observed: `${parent.name} · CrustData #${parent.id}${parent.headcount ? ` · ${parent.headcount.toLocaleString("en-US")} staff` : ""}${parent.hq ? " · " + parent.hq : ""}`, status: "info", rule: "KYB-PARENT", reason: investor ? "Any investment would be into a subsidiary of this group" : "Guarantor candidate: the credit decision depends on the parent", evidenceIds: [pev] });
        if (!investor) cond(`Parent guarantee from ${parent.name} (CrustData #${parent.id}${parent.headcount ? `, ${parent.headcount.toLocaleString("en-US")} staff` : ""})`);
      }
    }

    // ---- peers: same industry + country, similar size (company search, ~0.3 cr)
    {
      const ind = (co.taxonomy?.professional_network_industries ?? [])[0];
      const country = L.country;
      const size = typeof hc.total === "number" ? hc.total : undefined;
      if (ind && country && want.has("peer_benchmark")) {
        const conds: any[] = [{ field: "taxonomy.professional_network_industry", type: "=", value: ind }, { field: "locations.country", type: "=", value: country }];
        if (size !== undefined) { conds.push({ field: "headcount.total", type: "=>", value: Math.max(1, Math.floor(size / 3)) }); conds.push({ field: "headcount.total", type: "=<", value: Math.max(10, size * 3) }); }
        const sr = await cd.companySearch({ op: "and", conditions: conds }, 8);
        if (sr.ok) {
          const list = ((sr.data?.companies ?? []) as any[]).filter(x => x.crustdata_company_id !== b.crustdata_company_id).slice(0, 8).map(x => ({ id: x.crustdata_company_id, name: x.basic_info?.name ?? "?", domain: x.basic_info?.primary_domain, logo: x.basic_info?.logo_permalink, headcount: x.headcount?.total, growth6m: x.headcount?.growth_percent?.six_months ?? null, funding: x.funding?.total_investment_usd ?? null, country: x.locations?.country }));
          const pev = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/company/search", value: { industry: ind, country, results: list.length }, note: `${list.length} peers: ${ind}, ${country}`, cached: sr.cached });
          peers = { basis: `${ind} · ${country}${size ? ` · ${Math.max(1, Math.floor(size / 3))}–${Math.max(10, size * 3)} staff` : ""}`, companies: [{ id: b.crustdata_company_id, name: b.name, domain: b.primary_domain, logo: b.logo_permalink, headcount: hc.total, growth6m: hc.growth_percent?.six_months ?? null, funding: co.funding?.total_investment_usd ?? null, country, isTarget: true }, ...list], evidenceId: pev };
        }
      }
    }
    const tr = Object.values<any>(co.web_traffic?.domain_traffic ?? {})[0];
    const fund = co.funding ?? {};
    const rounds = (fund.milestones ?? []).map((m: any) => ({ date: m.funding_date ?? m.date, round: m.round_type, amountUsd: m.amount_usd, investors: m.investors }));
    const est = co.revenue?.estimated ?? {};
    const baseMetrics: Metric[] = [
      { label: "Headcount", value: `${hc.total ?? "—"}`, hint: hc.growth_percent?.yoy !== undefined && hc.growth_percent?.yoy !== null ? `${hc.growth_percent.yoy > 0 ? "+" : ""}${Math.round(hc.growth_percent.yoy * 10) / 10}% YoY` : b.employee_count_range ? `band ${b.employee_count_range}` : undefined, evidenceIds: [coEv] },
      { label: "Web visits / mo", value: tr?.monthly_visitors ? Number(tr.monthly_visitors).toLocaleString("en-US") : "—", hint: typeof tr?.qoq_pct === "number" ? `${Math.round(tr.qoq_pct)}% QoQ${acquiredBy ? " · acquirer's site" : ""}` : undefined, evidenceIds: [coEv] },
      { label: "Revenue (estimate)", value: est.upper_bound_usd ? `${usd(est.lower_bound_usd)}–${usd(est.upper_bound_usd)}` : "—", hint: "provider model, unaudited", evidenceIds: [coEv] },
      { label: "Roles posted (90d)", value: jobs90 === null ? "—" : String(jobs90), evidenceIds: [jobsEv].filter(Boolean) },
    ];

    if (investor) {
      const T = intake.thesis;
      const tx = norm([b.description, ...(co.taxonomy?.categories ?? []), ...(co.taxonomy?.professional_network_industries ?? [])].filter(Boolean).join(" "));
      const fit: NonNullable<CaseResult["investment"]>["fit"] = [];
      if (T) {
        if (T.sectors.length) fit.push({ criterion: "Sector", expected: T.sectors.join(" / "), observed: (co.taxonomy?.professional_network_industries ?? [])[0] ?? (b.description ?? "").slice(0, 50), result: T.sectors.some(s => tx.includes(s) || (s === "food" && /food|momo|snack|cuisine|beverage/.test(tx)) || (s === "subscription" && /subscription/.test(tx))) ? "pass" : tx ? "fail" : "unknown" });
        if (T.geos.length) fit.push({ criterion: "Geography", expected: T.geos.join(" / "), observed: L.country ?? "?", result: !L.country ? "unknown" : T.geos.some(g => (g === "US" && /USA|US/i.test(L.country)) || (g === "India" && /IND|India/i.test(L.country))) ? "pass" : "fail" });
        if (T.maxStaff) fit.push({ criterion: "Team size", expected: `< ${T.maxStaff}`, observed: String(hc.total ?? "?"), result: typeof hc.total !== "number" ? "unknown" : hc.total < T.maxStaff ? "pass" : "fail" });
        if (T.foundedBefore) fit.push({ criterion: "Founded", expected: `before ${T.foundedBefore}`, observed: String(b.year_founded ?? "?"), result: !b.year_founded ? "unknown" : b.year_founded < T.foundedBefore ? "pass" : "fail" });
        fit.push({ criterion: "Company activity", expected: `Heartbeat ≥ ${T.minHeartbeat}`, observed: heartbeat.score === null ? "low signal" : `${heartbeat.score} (${heartbeat.band})`, result: heartbeat.score === null || heartbeat.coverage < 0.5 ? "unknown" : heartbeat.score >= T.minHeartbeat ? "pass" : "fail" });
      }
      investment = {
        fit,
        metrics: [...baseMetrics, { label: "Capital raised", value: usd(fund.total_investment_usd), hint: fund.last_round_type ? `last: ${fund.last_round_type}${fund.last_fundraise_date ? " · " + ym(fund.last_fundraise_date) : ""}` : undefined, evidenceIds: [coEv] }, { label: "Followers", value: co.followers?.count ? Number(co.followers.count).toLocaleString("en-US") : "—", hint: typeof co.followers?.qoq_percent === "number" ? `${co.followers.qoq_percent.toFixed(1)}% QoQ` : undefined, evidenceIds: [coEv] }],
        funding: rounds,
        competitors: ((co.competitors?.all_domains ?? co.competitors?.organic_seo ?? []) as any[]).map(x => (typeof x === "string" ? x : x?.domain ?? x?.name)).filter(Boolean).slice(0, 6),
      };
      check({ section: "investment", title: "Team", observed: people.length ? people.slice(0, 3).map(p => `${p.name}${p.current ? "" : " (left)"}${p.priorFounder?.length ? " · prior founder" : ""}`).join("; ") : "No leadership on record", status: people.length ? "info" : "unverified", rule: "INV-TEAM", reason: people.some(p => p.priorFounder?.length) ? "Includes repeat founder(s)" : "Leadership from the identity graph", evidenceIds: [coEv] });
    } else {
      // credit readiness (lender)
      const age = b.year_founded ? new Date().getFullYear() - b.year_founded : undefined;
      let score = 4; const why: string[] = [];
      if (age !== undefined && age < 2) { score--; why.push("under 2 years operating"); }
      if (typeof hc.total === "number" && hc.total < 5) { score--; why.push(`only ${hc.total} measured staff`); }
      if (heartbeat.score !== null && heartbeat.coverage >= 0.5 && heartbeat.score < 30) { score--; why.push(`low activity (Heartbeat ${heartbeat.score})`); }
      if (!est.lower_bound_usd) { score--; why.push("no revenue estimate"); }
      if (acquiredBy) { score--; why.push(`subsidiary of ${acquiredBy}`); }
      const grade = (["D", "D", "C", "B", "A"] as const)[Math.max(0, Math.min(4, score))];
      const policyCap = est.lower_bound_usd ? Math.round(est.lower_bound_usd * 0.1) : undefined;
      const req = intake.ask ? { amount: intake.ask.amount, currency: intake.ask.currency } : undefined;
      const reqUsd = req ? (req.currency === "INR" ? req.amount / INR_PER_USD : req.amount) : undefined;
      credit = {
        grade,
        metrics: [...baseMetrics, { label: "Years operating", value: age !== undefined ? String(age) : "—", hint: b.year_founded ? `since ${b.year_founded}` : undefined, evidenceIds: [coEv] }, { label: "Capital raised", value: usd(fund.total_investment_usd), evidenceIds: [coEv] }],
        indicativeExposure: policyCap ? { amount: policyCap, currency: "USD", basis: "Policy: ≤ 10% of the lower bound of the provider's revenue estimate (illustrative policy, not an approved limit)" } : undefined,
        requested: req,
        policy: why.length ? why : ["no policy concerns from public signals"],
      };
      const e = ev({ kind: "derived", provider: "Rule", fieldPath: "credit readiness", value: { grade, reasons: why, indicative_exposure_usd: policyCap, requested: req }, note: "Rule-based credit readiness" });
      check({ section: "credit", title: "Credit readiness grade", observed: `Grade ${grade}${why.length ? " — " + why.join("; ") : ""}`, status: grade === "A" || grade === "B" ? "verified" : grade === "C" ? "review" : "contradicted", rule: "CR-GRADE", reason: "Operating history, scale, activity, revenue signal and ownership", evidenceIds: [e, coEv] });
      if (req && reqUsd !== undefined) {
        const over = policyCap !== undefined && reqUsd > policyCap;
        check({ section: "credit", title: "Requested exposure vs policy", submitted: req.currency === "INR" ? inr(req.amount) : usd(req.amount), observed: policyCap ? `Indicative cap ${usd(policyCap)}${req.currency === "INR" ? ` (₹ converted at ${INR_PER_USD}/USD)` : ""}` : "No revenue basis for a cap", status: policyCap === undefined ? "unverified" : over ? "review" : "verified", rule: "CR-EXPOSURE", reason: policyCap === undefined ? "Exposure cannot be sized from public data" : over ? `Request is ${(reqUsd / policyCap).toFixed(1)}× the indicative policy cap` : "Within the indicative policy cap", evidenceIds: [e] });
        if (over || policyCap === undefined) cond("Financial statements and 12 months of bank statements to size the facility");
      }
    }
  }

  // ---------------- decision ----------------
  go("decision", "Deciding (rules only)");
  const material = checks.filter(c => c.status === "contradicted" && c.material);
  const fraud = checks.some(c => c.section === "fraud" && c.status === "contradicted");
  const reasons = material.map(m => `${m.title}: ${m.reason}`);
  const decisions: Decision[] = [];
  const compliance: Decision = identity.status !== "resolved" ? { track: "compliance", code: "insufficient", label: "Insufficient evidence", reasons: [identity.note ?? "Company not resolved"] }
    : fraud || material.some(m => m.rule === "KYB-OWNERSHIP" && m.status === "contradicted" && intake.claims.some(c => c.kind === "independent")) ? { track: "compliance", code: "not_cleared", label: "Not cleared", reasons: reasons.filter(r => /Sender|domain|Ownership/i.test(r)).concat(reasons.filter(r => !/Sender|domain|Ownership/i.test(r))) }
    : material.length ? { track: "compliance", code: "conditions", label: "Cleared with conditions", reasons }
    : checks.some(c => c.status === "review") ? { track: "compliance", code: "conditions", label: "Cleared with conditions", reasons: checks.filter(c => c.status === "review").map(c => `${c.title}: ${c.reason}`) }
    : { track: "compliance", code: "cleared", label: "Cleared", reasons: ["No material contradiction in the evidence checked"] };
  decisions.push(compliance);
  if (investor) {
    const fitFails = investment?.fit.filter(f => f.result === "fail").length ?? 0;
    decisions.unshift(identity.status !== "resolved" ? { track: "investment", code: "insufficient", label: "Insufficient evidence", reasons: compliance.reasons }
      : fraud ? { track: "investment", code: "decline", label: "Stop the wire — suspected payment fraud", reasons }
      : acquiredBy ? { track: "investment", code: "decline", label: "Decline — not an independent company", reasons: [`Acquired by ${acquiredBy}`, ...reasons.filter(r => !r.startsWith("Ownership"))] }
      : fitFails >= 2 ? { track: "investment", code: "decline", label: "Decline — outside thesis", reasons: investment!.fit.filter(f => f.result === "fail").map(f => `${f.criterion}: ${f.observed}`) }
      : material.length ? { track: "investment", code: "conditions", label: "Proceed only with conditions", reasons }
      : { track: "investment", code: "proceed", label: "Proceed to term sheet", reasons: ["Claims check out against the evidence", ...(conditions.length ? ["Standard confirmations listed as conditions"] : [])] });
  } else {
    const g = credit?.grade;
    decisions.unshift(identity.status !== "resolved" ? { track: "credit", code: "insufficient", label: "Insufficient evidence — KYB incomplete", reasons: compliance.reasons }
      : fraud || g === "D" || material.some(m => m.rule === "KYB-OWNERSHIP") ? { track: "credit", code: "decline", label: "Decline", reasons: [...reasons, ...(credit?.policy ?? [])] }
      : material.length || g === "C" || checks.some(c => c.rule === "CR-EXPOSURE" && c.status !== "verified") ? { track: "credit", code: "refer", label: "Refer to credit officer", reasons: [...reasons, ...(credit?.policy ?? [])] }
      : { track: "credit", code: "ready", label: "Ready for underwriting", reasons: credit?.policy ?? [] });
  }
  emit({ agent: "verifier", brain: "rules", step: "Decision", detail: decisions.map(d => `${d.track}: ${d.label}`).join(" · "), status: "ok" });

  // ---------------- post-decision monitoring (CrustData Watcher preview: deliver=false, no credit, nothing created) ----------------
  if (identity.status === "resolved" && ["proceed", "ready", "conditions", "refer"].includes(decisions[0].code) && !fraud && (!plan || plan.actions.some(a => a.name === "prepare_monitoring" && a.ran))) {
    const track = { op: "or", conditions: [{ field: "headcount.total", type: "changed" }, { field: "funding.last_fundraise_date", type: "changed" }, { field: "basic_info.status", type: "changed" }] };
    const labels = ["Headcount changes", "New funding round", "Company status changes (acquired, closed)"];
    const w = await cd.watchTest(track, ["basic_info", "headcount", "funding"]);
    const wev = ev({ kind: "crustdata", provider: "CrustData", endpoint: "/watch/company/test", recordId: identity.company!.id, value: { track, deliver: false, ok: w.ok, message: w.ok ? "sample built" : (w as any).message }, note: w.ok ? "Watch spec validated by CrustData (preview only: nothing created or delivered)" : "Watch preview unavailable: spec stored locally" });
    monitoring = { status: w.ok ? "validated" : "spec_only", track: labels, note: w.ok ? "Validated with the CrustData Watcher preview, ready to activate after closing" : "Spec stored locally; activate with the Watch API after closing", evidenceId: wev };
  } else monitoring = { status: "not_applicable", track: [], note: "No monitoring: the case did not proceed" };

  // ---------------- memo ----------------
  const name = profile?.name ?? intake.company?.value ?? "the company";
  const primary = decisions[0];
  let memo = [`${primary.label} — ${name}.`, ...material.map(m => `${m.title}: ${m.reason} [${m.evidenceIds.join(", ")}].`), heartbeat ? `Company activity ${heartbeat.score ?? "—"} (${heartbeat.band}).` : "", conditions.length ? `Before proceeding: ${conditions.slice(0, 3).join("; ")}.` : ""].filter(Boolean).join(" ");
  let memoBy = "rules template";
  const m = await llmJson<{ memo: string }>({
    purpose: investor ? "Draft the investment committee memo" : "Draft the credit memo", agent: "clerk", budget, emit,
    schema: { type: "OBJECT", properties: { memo: { type: "STRING" } }, required: ["memo"] },
    prompt: `Write a crisp ${investor ? "investment committee" : "credit committee"} memo of 5-7 sentences for ${name}. Start with the decision "${primary.label}" verbatim. Use ONLY the checks below; cite source IDs in square brackets exactly as given (e.g. [S3]); never add facts; end with what must happen before money moves.\nCHECKS: ${JSON.stringify(checks.filter(c => c.status !== "info").map(c => ({ t: c.title, s: c.status, obs: c.observed, why: c.reason, src: c.evidenceIds })))}\nCONDITIONS: ${JSON.stringify(conditions)}\n${credit ? `CREDIT: grade ${credit.grade}; ${credit.policy.join("; ")}` : ""}${heartbeat ? `\nACTIVITY: ${heartbeat.score} ${heartbeat.band}` : ""}`,
    validate: x => typeof x?.memo === "string" && x.memo.toLowerCase().startsWith(primary.label.toLowerCase().slice(0, 12)) && /\[S\d+/.test(x.memo),
  });
  if (m) { memo = m.data.memo; memoBy = m.model; }

  // ---------------- actions (local, simulated) ----------------
  go("actions", "Completing the work (local systems)");
  const id = `SG-${new Date().toISOString().replace(/\D/g, "").slice(4, 14)}`;
  const actions: LocalAction[] = [];
  const write = (system: string, file: string, rec: Record<string, unknown>, summary: string) => {
    const dir = path.join(process.cwd(), "data", "systems"); fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, file); let rows: unknown[] = []; try { rows = JSON.parse(fs.readFileSync(f, "utf8")); } catch { /* new */ }
    rows.push({ ...rec, case: id, simulated: true, at: new Date().toISOString() }); fs.writeFileSync(f, JSON.stringify(rows, null, 2));
    actions.push({ system, file: `data/systems/${file}`, summary });
  };
  if (investor) {
    write("Deal pipeline", "pipeline.json", { company: name, decision: primary.label, compliance: compliance.label, conditions }, `Deal moved to “${primary.label}” in the pipeline`);
    if (conditions.length) write("Closing checklist", "closing-checklist.json", { company: name, conditions_precedent: conditions }, `${conditions.length} condition${conditions.length === 1 ? "" : "s"} precedent added to the closing checklist`);
    if (fraud) write("Treasury", "wire-holds.json", { company: name, request: intake.senderEmail?.value, action: "HOLD WIRE", amount: intake.ask ?? null }, "Outgoing wire placed on hold; call-back task prepared (not sent)");
  } else {
    write("Credit files", "credit-files.json", { company: name, decision: primary.label, compliance: compliance.label, grade: credit?.grade ?? null, indicative_exposure: credit?.indicativeExposure ?? null, requested: credit?.requested ?? null, conditions }, `Credit file opened — “${primary.label}”${credit ? `, grade ${credit.grade}` : ""}`);
    write("KYB register", "kyb-register.json", { company: name, crustdata_company_id: identity.company?.id ?? null, status: compliance.label }, `KYB record saved as “${compliance.label}”`);
  }
  if (!["proceed", "ready"].includes(primary.code) || fraud) write("Exceptions inbox", "inbox.json", { company: name, decision: primary.label, top_reason: reasons[0] ?? primary.reasons[0] ?? "" }, "Sent to the human exceptions inbox");
  const memoFile = path.join(process.cwd(), "data", "systems", `${id}-memo.md`);
  fs.writeFileSync(memoFile, `# ${name} — ${primary.label}\n\n${memo}\n\n## Conditions\n${conditions.map(c => `- ${c}`).join("\n")}\n`);
  actions.push({ system: investor ? "IC memo" : "Credit memo", file: `data/systems/${id}-memo.md`, summary: `${investor ? "Investment committee" : "Credit committee"} memo filed` });
  emit({ agent: "clerk", step: "Work completed", detail: actions.map(a => a.summary).join(" · "), status: "ok" });

  const result: CaseResult = {
    id, createdAt: new Date().toISOString(), intake, identity, profile, people, checks, series, events, parent, peers, monitoring, pressImages, plan, decisions, conditions, heartbeat, investment, credit, memo, memoBy, actions, evidence, trace,
    spend: { crustdataCredits: round(budget.credits), crustdataCalls: budget.calls, cacheHits: budget.cacheHits, tavilyCalls: budget.tavilyCalls, llmCalls: budget.llmCalls, llmTokens: budget.llmTokens, budgetPerRun: budget.creditsCap, seconds: Math.round((Date.now() - t0) / 100) / 10 },
  };
  emit({ agent: "system", step: "Done", detail: `${round(budget.credits)} CrustData credits · ${budget.cacheHits} cache hits · ${budget.tavilyCalls} Tavily · ${budget.llmCalls} LLM calls · ${result.spend.seconds}s`, status: "ok" });
  result.trace = trace;
  const runs = path.join(process.cwd(), "data", "runs"); fs.mkdirSync(runs, { recursive: true });
  fs.writeFileSync(path.join(runs, `${id}.json`), JSON.stringify(result, null, 2));
  return result;
}
