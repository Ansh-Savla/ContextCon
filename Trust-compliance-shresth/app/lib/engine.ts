/**
 * SignalGate engine: Intake -> Investigator (CrustData) -> Verifier (rules + Heartbeat) -> Case Clerk (deliverable + local action).
 * Statuses and outcomes are decided only here, by rules. The LLM (optional) extracts, judges relevance and writes prose.
 */
import fs from "node:fs";
import path from "node:path";
import { Crustdata, accountCredits, type Emit } from "./crustdata";
import { RunBudget, round } from "./budget";
import { config } from "./config";
import { runIntake } from "./intake";
import { compareDomain, normalizeDomain } from "./domain";
import { computeHeartbeat } from "./heartbeat";
import { llmJson, llmLabel } from "./llm";
import { writeAction } from "./actions";
import type { CaseResult, CompanyCandidate, Evidence, Finding, Intake, Outcome, Status, TraceEvent } from "./types";

type Ctx = {
  budget: RunBudget; cd: Crustdata; emit: Emit; evidence: Evidence[]; findings: Finding[]; questions: string[];
  ev: (e: Omit<Evidence, "id" | "retrievedAt"> & { retrievedAt?: string }) => string;
  find: (f: Omit<Finding, "id">) => void;
};

const norm = (s = "") => s.toLowerCase().replace(/[®©™]/g, "").replace(/\b(pvt|private|ltd|limited|inc|llc|corp|co|the|industries|technologies|tech)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const nameMatch = (a = "", b = "") => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const yearOf = (d?: string | null) => (d ? Number(String(d).slice(0, 4)) : undefined);
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

type Role = { companyId?: number; company?: string; title?: string; start?: string | null; end?: string | null; current: boolean };
function rolesOf(p: any): Role[] {
  const e = p?.experience?.employment_details ?? {};
  const map = (x: any, current: boolean): Role => ({
    companyId: Number(x.crustdata_company_id ?? x.company_id ?? (Array.isArray(x.employer_company_id) ? x.employer_company_id[0] : x.employer_company_id)) || undefined,
    company: x.name ?? x.employer_name, title: x.title ?? x.employee_title,
    start: x.start_date ?? x.employee_start_date, end: x.end_date ?? x.employee_end_date, current,
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

// ------------------------------------------------------------------ identity
async function resolve(ctx: Ctx, intake: Intake) {
  const { cd } = ctx;
  let candidates: CompanyCandidate[] = [];
  let note: string | undefined;

  if (intake.senderDomain && !intake.domain) {
    const s = await cd.identifyByDomain(intake.senderDomain.value);
    if (s.ok) {
      const c = candidatesOf(s.data);
      ctx.ev({ kind: "crustdata", endpoint: "/company/identify", value: { domains: [intake.senderDomain.value], matches: c.length }, note: c.length ? `sender domain resolves to ${c[0].name} (${c[0].id})` : "sender domain matches no company in the graph", cached: s.cached });
    }
  }
  if (intake.domain) {
    const r = await cd.identifyByDomain(intake.domain.value);
    if (r.ok) {
      candidates = candidatesOf(r.data);
      const e = ctx.ev({ kind: "crustdata", endpoint: "/company/identify", recordId: candidates[0]?.id, value: { domains: [intake.domain.value], top: candidates[0] }, cached: r.cached });
      if (candidates.length) {
        const top = candidates[0];
        if (intake.company && !nameMatch(intake.company.value, top.name)) note = `Input name "${intake.company.value}" differs from canonical "${top.name}" — resolved by domain (R-NAME-RECOVERY, R-DOMAIN-FIRST)`;
        return { status: "resolved" as const, company: top, candidates, method: `domain ${intake.domain.value} (conf ${top.score})`, note, evidenceId: e };
      }
    }
  }
  if (intake.company) {
    const variants = [intake.company.value, intake.company.value.replace(/\b(industries|pvt\.?|private|ltd\.?|limited|inc\.?|llc|technologies)\b/gi, "").replace(/\s+/g, " ").trim()].filter((v, i, a) => v && a.indexOf(v) === i);
    for (const v of variants) {
      const r = await cd.identifyByName(v);
      if (!r.ok) continue;
      candidates = candidatesOf(r.data);
      const e = ctx.ev({ kind: "crustdata", endpoint: "/company/identify", value: { names: [v], candidates: candidates.slice(0, 5) }, cached: r.cached });
      if (!candidates.length) continue;
      const exact = candidates.filter(c => nameMatch(v, c.name));
      const top = (exact[0] ?? candidates[0]);
      const rivals = candidates.filter(c => c.id !== top.id && c.score >= top.score - 0.15 && nameMatch(v, c.name));
      if (v !== intake.company.value) note = `Input name "${intake.company.value}" had no usable match; resolved via "${v}" (R-NAME-RECOVERY)`;
      if (top.score >= 0.75 && nameMatch(v, top.name) && rivals.length === 0) {
        return { status: "resolved" as const, company: top, candidates, method: `name "${v}" (conf ${top.score})`, note, evidenceId: e };
      }
      return { status: "ambiguous" as const, candidates: candidates.slice(0, 6), method: `name "${v}"`, note: `${candidates.length} candidates; top ${top.name} (${top.score})${rivals.length ? ` with ${rivals.length} close rival(s)` : ""} — not enough to pick one`, evidenceId: e };
    }
  }
  return { status: "unresolved" as const, candidates, note: intake.company || intake.domain ? "no CrustData match for the submitted name/domain" : "request names no company or domain", evidenceId: undefined };
}

// ------------------------------------------------------------------ main
export async function runCase(raw: string, onEvent: (e: TraceEvent) => void = () => {}): Promise<CaseResult> {
  const t0 = Date.now();
  const trace: TraceEvent[] = [];
  const emit: Emit = e => { const ev = { ...e, t: Date.now() - t0 }; trace.push(ev); onEvent(ev); };
  const budget = new RunBudget();
  const cd = new Crustdata(budget, emit);
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];
  const questions: string[] = [];
  const ctx: Ctx = {
    budget, cd, emit, evidence, findings, questions,
    ev: e => { const id = `E${evidence.length + 1}`; evidence.push({ id, retrievedAt: new Date().toISOString(), ...e }); return id; },
    find: f => { findings.push({ id: `F${findings.length + 1}`, ...f }); },
  };
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  emit({ agent: "system", step: "run started", detail: `brain: ${llmLabel()} · run budget ${config.budget.creditsPerRun} cr · cache ${config.cacheMode}`, status: "info" });

  // 1. Intake
  const intake = await runIntake(raw, budget, emit);
  const inputEv = ctx.ev({ kind: "input", note: "submitted request", value: raw.slice(0, 2000) });

  // 2. Resolve
  const idr = await resolve(ctx, intake);
  emit({ agent: "investigator", step: "identity", detail: `${idr.status}${idr.company ? `: ${idr.company.name} (${idr.company.id})` : ""} · ${idr.method ?? ""}`, status: idr.status === "resolved" ? "ok" : "info" });

  let company: any = null;
  let enrichEv = "";
  const identityEvs = idr.evidenceId ? [idr.evidenceId] : [];
  if (idr.status === "resolved" && idr.company) {
    const r = await cd.enrich(idr.company.id);
    if (r.ok) {
      company = r.data?.[0]?.matches?.[0]?.company_data ?? null;
      enrichEv = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: idr.company.id, fieldPath: "basic_info, headcount, funding, people, locations, news, web_traffic, followers, revenue, seo", note: company?.basic_info?.name, cached: r.cached });
    }
    ctx.find({ check: "Company identity", claim: intake.company?.value ?? intake.domain?.value ?? "(company)", submitted: [intake.company?.value, intake.domain?.value].filter(Boolean).join(" · "), observed: `${idr.company.name} · id ${idr.company.id} · ${idr.method}${company?.basic_info?.primary_domain ? " · " + company.basic_info.primary_domain : ""}`, status: "supported", evidenceIds: [...identityEvs, enrichEv].filter(Boolean), rule: "R-DOMAIN-FIRST", reason: idr.note ?? "resolved to one canonical company", material: true });
  } else {
    ctx.find({ check: "Company identity", claim: intake.company?.value ?? "(none)", submitted: intake.company?.value, observed: idr.note ?? idr.status, status: "insufficient", evidenceIds: identityEvs, rule: "R-AMBIGUOUS", reason: idr.status === "ambiguous" ? "several plausible companies; no company-specific conclusions are drawn" : "company could not be resolved", material: true });
    questions.push(idr.status === "ambiguous" ? `Which company exactly? Ask for the website domain or registration number of "${intake.company?.value}".` : "Ask for the company's website domain.");
  }

  let heartbeat: CaseResult["heartbeat"];
  let fit: CaseResult["fit"];
  let acquired = false;

  if (company) {
    const b = company.basic_info ?? {};
    const canon: string[] = [b.primary_domain, ...(b.all_domains ?? [])].filter(Boolean).map(normalizeDomain);

    // ---- acquired / status (R-ACQUIRED, R-STATUS-CONFLICT)
    const acq = (company.funding?.acquired_by ?? []).filter(Boolean);
    acquired = acq.length > 0 || /acquired/i.test(company.revenue?.acquisition_status ?? "");
    let acquirerNote: string | undefined;
    if (acquired) {
      const a0 = acq[0] ?? {};
      const who = a0.name ?? a0.acquirer_name ?? a0.acquiring_company_name ?? (typeof a0 === "string" ? a0 : "an acquirer");
      const when = a0.announced_date ?? a0.acquired_on ?? a0.date ?? "";
      const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "funding.acquired_by / revenue.acquisition_status", value: { acquired_by: acq.slice(0, 2), acquisition_status: company.revenue?.acquisition_status } });
      const foreign = canon.filter(d => !d.startsWith(norm(b.name).split(" ")[0]));
      acquirerNote = `acquired by ${who}${foreign.length ? `; domains also include ${foreign.join(", ")}` : ""}`;
      ctx.find({ check: "Independent company", claim: "Operating as an independent company (implied by request)", observed: `Acquired by ${who}${when ? " on " + String(when).slice(0, 10) : ""}`, status: "conflicting", evidenceIds: [e], rule: "R-ACQUIRED", reason: "an acquired company is not an independent investment target; its signals may belong to the acquirer", material: true });
      if (/active/i.test(b.status ?? "")) ctx.find({ check: "Provider status", claim: "—", observed: `status "${b.status}" alongside acquisition`, status: "potential_issue", evidenceIds: [e], rule: "R-STATUS-CONFLICT", reason: "the provider's own fields disagree; treat 'active' with caution" });
    }

    // ---- claims
    for (const c of intake.claims) {
      if (c.kind === "founded") {
        const y = b.year_founded;
        const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "basic_info.year_founded", value: y });
        const st: Status = !y ? "insufficient" : y === c.value ? "supported" : Math.abs(y - Number(c.value)) <= 1 ? "potential_issue" : "conflicting";
        ctx.find({ check: "Founded year", claim: c.text, submitted: String(c.value), observed: y ? String(y) : "not reported", status: st, evidenceIds: [e], rule: "R-FOUNDED", reason: st === "supported" ? "matches the record" : st === "insufficient" ? "no founded year on record" : `record says ${y}`, material: st === "conflicting" });
      }
      if (c.kind === "headcount") {
        const total = company.headcount?.total;
        const range = b.employee_count_range;
        const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "headcount.total · basic_info.employee_count_range", value: { total, range } });
        const n = Number(c.value);
        let st: Status = "insufficient", reason = "no measured headcount";
        if (typeof total === "number") {
          const close = Math.abs(n - total) <= Math.max(3, total * 0.3);
          const [lo, hi] = String(range ?? "").split("-").map(x => Number(x.replace(/\D/g, "")));
          const inRange = lo && hi ? n >= lo && n <= hi : false;
          if (close) { st = "supported"; reason = "matches measured headcount"; }
          else { st = "conflicting"; reason = `measured ${total} people${inRange ? `; the profile range ${range} fits the claim, but ranges are self-reported bands while ${total} is the measured count` : ""}`; }
          if (acquired) reason += " · company is acquired: remaining profiles may be stale";
        }
        ctx.find({ check: "Headcount", claim: c.text, submitted: n.toLocaleString("en-US"), observed: `${total ?? "?"} measured · range ${range ?? "?"}`, status: st, evidenceIds: [e], rule: "R-HEADCOUNT", reason, material: st === "conflicting" });
        if (st === "conflicting") questions.push(`Provide payroll or an org chart to support a team of ~${n.toLocaleString("en-US")} (CrustData measures ${total}).`);
      }
      if (c.kind === "revenue") {
        const est = company.revenue?.estimated ?? {};
        const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "revenue.estimated", value: { lower: est.lower_bound_usd, upper: est.upper_bound_usd } });
        const n = Number(c.value);
        const st: Status = !est.upper_bound_usd ? "insufficient" : n > est.upper_bound_usd * 2 ? "conflicting" : "insufficient";
        ctx.find({ check: "Revenue", claim: c.text, submitted: `$${(n / 1e6).toLocaleString()}M`, observed: est.upper_bound_usd ? `model estimate $${(est.lower_bound_usd / 1e6).toLocaleString()}M–$${(est.upper_bound_usd / 1e6).toLocaleString()}M` : "no estimate", status: st, evidenceIds: [e], rule: "R-REVENUE-ESTIMATE", reason: st === "conflicting" ? "claim is far above the provider's estimate" : "only a provider model estimate is available — it cannot verify revenue", material: st === "conflicting" });
        questions.push("Share audited financials or GST/tax filings to verify revenue.");
      }
      if (c.kind === "location") {
        const L = company.locations ?? {};
        const obs = [L.city, L.state, L.country].filter(Boolean).join(", ");
        const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "locations", value: obs });
        const toks = norm(String(c.value)).split(" ").filter(t => t.length > 1);
        const ab: Record<string, string> = { massachusetts: "ma", usa: "usa", india: "ind" };
        const hit = toks.some(t => norm(obs).split(" ").includes(t) || norm(obs).split(" ").includes(ab[t] ?? "~"));
        ctx.find({ check: "Location", claim: c.text, submitted: String(c.value), observed: obs || "not reported", status: !obs ? "insufficient" : hit ? "supported" : "conflicting", evidenceIds: [e], rule: "R-LOCATION", reason: hit ? "location tokens match" : obs ? "location differs" : "no location on record", material: !hit && !!obs });
      }
      if (c.kind === "other" && /google ads/i.test(c.text)) {
        const ads = company.seo?.monthly_google_ads_budget;
        const e = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "seo.monthly_google_ads_budget", value: ads });
        ctx.find({ check: "Ad spend", claim: c.text, submitted: `$${Number(c.value).toLocaleString()}/mo`, observed: ads ? `$${Math.round(ads).toLocaleString()}/mo (provider estimate)` : "not reported", status: acquired ? "potential_issue" : ads ? "supported" : "insufficient", evidenceIds: [e], rule: acquired ? "R-ACQUIRED" : "R-SEO", reason: acquired ? `the company is acquired (${acquirerNote}); this spend likely belongs to the acquirer's domain` : "provider SEO estimate" });
      }
    }

    // ---- people (R-DEPARTED, R-REP-NOT-FOUND)
    const listed: any[] = [...(company.people?.founders ?? []), ...(company.people?.cxos ?? []), ...(company.people?.decision_makers ?? [])];
    const roleClaims = intake.claims.filter(c => c.kind === "person_role" && c.person);
    for (const c of roleClaims) {
      const who = c.person!;
      const inList = listed.find(p => nameMatch(personName(p), who));
      const atCo = (p: any) => rolesOf(p).filter(r => r.companyId === b.crustdata_company_id);
      let person = inList, src = "enrich people";
      if (!person || !atCo(person).length) {
        const s = await cd.peopleEverAtCompany(b.crustdata_company_id, who, 3);
        if (s.ok) { person = (s.data?.profiles ?? []).find((p: any) => nameMatch(personName(p), who)) ?? (s.data?.profiles ?? [])[0]; src = "person search"; }
        else if (s.skipped) { ctx.find({ check: "Person role", claim: c.text, status: "not_checked", evidenceIds: [], rule: "BUDGET", reason: s.message }); continue; }
      }
      const e = ctx.ev({ kind: "crustdata", endpoint: src === "person search" ? "/person/search" : "/company/enrich", recordId: person?.crustdata_person_id, url: profileUrl(person), fieldPath: "experience.employment_details", value: person ? atCo(person).map(r => ({ title: r.title, start: r.start, end: r.end, current: r.current })) : "no match", note: person ? personName(person) : `no person named "${who}" ever at company ${b.crustdata_company_id}` });
      if (!person || !atCo(person).length) {
        const trustSender = intake.people[0]?.name === who && !!intake.senderDomain;
        ctx.find({ check: trustSender ? "Representative" : "Person role", claim: c.text, submitted: who, observed: `no current or past employee by that name at ${b.name} (${b.crustdata_company_id})`, status: trustSender ? "conflicting" : "insufficient", evidenceIds: [e], rule: "R-REP-NOT-FOUND", reason: trustSender ? "the person asking for a payment change is not found at the company" : "person not found in the company's people data", material: trustSender });
        continue;
      }
      const r = atCo(person);
      const cur = r.find(x => x.current && !x.end);
      if (cur) ctx.find({ check: "Person role", claim: c.text, submitted: who, observed: `${personName(person)} · ${cur.title} since ${String(cur.start ?? "").slice(0, 7)}`, status: "supported", evidenceIds: [e], rule: "R-ROLE", reason: "currently at the company" });
      else {
        const last = r.sort((x, y) => String(y.end ?? "").localeCompare(String(x.end ?? "")))[0];
        ctx.find({ check: "Person role", claim: c.text, submitted: who, observed: `${personName(person)} · ${last.title} ${String(last.start ?? "").slice(0, 7)} → ${String(last.end ?? "").slice(0, 7)} (left)`, status: "conflicting", evidenceIds: [e], rule: "R-DEPARTED", reason: `claimed as current, but the role ended ${String(last.end ?? "").slice(0, 7)}`, material: true });
        questions.push(`Confirm ${personName(person)}'s current involvement and equity after leaving in ${String(last.end ?? "").slice(0, 7)}.`);
      }
    }

    // ---- sender / submitted domain (R-LOOKALIKE)
    if (intake.senderDomain) {
      const v = compareDomain(intake.senderDomain.value, canon);
      const e = ctx.ev({ kind: "derived", fieldPath: "domain comparison", value: v, note: `${intake.senderDomain.value} vs ${canon.join(", ")}` });
      const st: Status = v.kind === "same" || v.kind === "subdomain" ? "supported" : v.kind === "free_mail" ? "potential_issue" : "conflicting";
      ctx.find({ check: "Sender domain", claim: `Email sent from ${intake.senderDomain.value}`, submitted: intake.senderDomain.value, observed: v.kind === "lookalike" ? `${v.reason}: ${v.signals.join("; ")}` : v.reason, status: st, evidenceIds: [e, enrichEv].filter(Boolean), rule: v.kind === "lookalike" ? "R-LOOKALIKE" : "R-DOMAIN", reason: v.kind === "lookalike" ? "lookalike of the canonical domain — classic payment-redirection pattern" : v.reason, material: st === "conflicting" });
    }
    if (intake.domain && canon.length && !canon.includes(intake.domain.value)) {
      const v = compareDomain(intake.domain.value, canon);
      const e = ctx.ev({ kind: "derived", fieldPath: "domain comparison", value: v });
      ctx.find({ check: "Submitted domain", claim: intake.domain.value, observed: v.reason, status: v.kind === "subdomain" ? "supported" : "conflicting", evidenceIds: [e], rule: "R-DOMAIN", reason: v.reason, material: v.kind === "lookalike" });
    }

    // ---- bank change: authority can never be verified from public data
    if (intake.claims.some(c => c.kind === "bank_change")) {
      ctx.find({ check: "Payment authority", claim: "Change remittance / bank details", submitted: "new bank account", observed: "cannot be established from public data", status: "not_checked", evidenceIds: [], rule: "POLICY-BANK-CHANGE", reason: "bank changes always require an out-of-band callback on the number already in the vendor master" });
    }

    // ---- news relevance (+ LLM judge), shark deal (R-FUNDING-GAP), adverse
    const core = norm(b.name).split(" ").filter(w => w.length >= 4)[0] ?? norm(b.name);
    const stem = (b.primary_domain ?? "").split(".")[0];
    const isRel = (t: string, u = "") => { const x = norm(t + " " + u); return (core && x.includes(core)) || (stem && x.includes(stem)); };
    let webNews: Array<{ title: string; url: string; date?: string; snippet?: string; source: string }> = (company.news ?? []).map((n: any) => ({ title: n.article_title, url: n.article_url, date: n.article_publish_date, source: "crustdata news" }));

    const wantShark = intake.claims.some(c => c.kind === "shark_deal");
    const wantAdverse = intake.asks.includes("adverse");
    const queries: string[] = [];
    if (wantShark) queries.push(`${b.name.replace(/[®©™]/g, "").trim()} Shark Tank deal`);
    if (wantAdverse) queries.push(`${b.name.replace(/[®©™]/g, "").trim()} fraud OR lawsuit OR regulator OR complaint`);
    let webEv = "";
    for (const q of queries) {
      const w = await cd.webSearch(q, ["news", "web"].slice(0, 1));
      if (!w.ok) continue;
      const items = (w.data?.results ?? w.data?.news ?? []).slice(0, 8).map((r: any) => ({ title: r.title ?? "", url: r.url ?? r.link ?? "", date: r.date ?? r.published_date ?? (r.timestamp ? new Date(Number(r.timestamp)).toISOString() : undefined), snippet: r.snippet ?? r.description ?? "", source: `web search: ${q}` }));
      webEv = ctx.ev({ kind: "web", endpoint: "/web/search/live", value: { query: q, results: items.length }, note: items.slice(0, 3).map((i: any) => i.title).join(" | "), cached: w.cached });
      webNews.push(...items);
    }

    // relevance: rules first, LLM judge when available
    let judged = webNews.map(n => ({ ...n, label: isRel(n.title, n.url) ? "relevant" : "likely namesake", why: "name/domain match rule", kind: "" as string }));
    if (judged.length) {
      const j = await llmJson<{ items: Array<{ i: number; label: string; kind: string; quote: string }> }>({
        purpose: "judge news relevance (namesake / other event)", agent: "verifier", budget, emit,
        schema: { type: "OBJECT", properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { i: { type: "INTEGER" }, label: { type: "STRING", enum: ["relevant", "likely namesake", "different event"] }, kind: { type: "STRING", enum: ["deal report", "allegation", "regulator action", "court finding", "business news", "other"] }, quote: { type: "STRING" } } } } } },
        prompt: `Company: ${b.name} (domain ${b.primary_domain}, ${b.description ?? ""}). Facts on record: founded ${b.year_founded}, HQ ${company.locations?.city ?? ""}.\nFor each item decide if it is about THIS company ("relevant"), a different organisation with a similar name ("likely namesake"), or this company but a different event/pitch than claimed ("different event"). Claimed deal: ${intake.claims.find(c => c.kind === "shark_deal")?.text ?? "none"}. Quote the words that justify the label.\n` + judged.map((n, i) => `${i}. ${n.title} — ${n.url} — ${n.snippet ?? ""}`).join("\n"),
        validate: x => Array.isArray(x?.items),
      });
      if (j) for (const it of j.data.items) if (judged[it.i]) { judged[it.i].label = it.label; judged[it.i].kind = it.kind; judged[it.i].why = `LLM: "${(it.quote ?? "").slice(0, 80)}"`; }
    }
    const relevant = judged.filter(n => n.label === "relevant");
    if (judged.length) ctx.find({ check: "News relevance", claim: "Coverage refers to this company", observed: `${relevant.length} relevant · ${judged.filter(n => n.label === "likely namesake").length} namesake · ${judged.filter(n => n.label === "different event").length} different event`, status: "info", evidenceIds: [enrichEv, webEv].filter(Boolean), rule: "R-OTHER-EVENT", reason: judged.slice(0, 6).map(n => `[${n.label}] ${n.title.slice(0, 70)}`).join(" · ") });

    if (wantShark) {
      const c = intake.claims.find(x => x.kind === "shark_deal")!;
      const fund = company.funding ?? {};
      const rounds = (fund.milestones ?? []).map((m: any) => `${m.round_type ?? "?"} ${String(m.funding_date ?? m.date ?? "").slice(0, 7)}${m.investors ? " (" + m.investors + ")" : ""}`);
      const fe = ctx.ev({ kind: "crustdata", endpoint: "/company/enrich", recordId: b.crustdata_company_id, fieldPath: "funding.total_investment_usd · funding.milestones", value: { total: fund.total_investment_usd, rounds } });
      const sharkInCD = (fund.investors ?? []).some((i: any) => /shark|aman|ashneer|vineeta|namita|anupam|peyush|cuban|o'?leary|corcoran|greiner|herjavec|john/i.test(String(i)));
      const webSays = relevant.filter(n => /shark/i.test(n.title + " " + (n.snippet ?? "")));
      const selfDesc = /shark ?tank/i.test(b.description ?? "");
      if (selfDesc) ctx.find({ check: "Shark Tank appearance", claim: "Appeared on Shark Tank", observed: `company self-description: "${(b.description ?? "").slice(0, 90)}"`, status: "supported", evidenceIds: [enrichEv], rule: "R-SELF-DESC", reason: "self-reported by the company — supports the appearance, not the deal terms" });
      const st: Status = sharkInCD ? "supported" : webSays.length ? "conflicting" : "insufficient";
      ctx.find({ check: "Shark deal / funding", claim: c.text, submitted: c.span, observed: `CrustData funding: total $${fund.total_investment_usd ?? "?"}; rounds: ${rounds.join("; ") || "none"}${webSays.length ? ` · web: "${webSays[0].title.slice(0, 80)}"` : ""}`, status: st, evidenceIds: [fe, webEv].filter(Boolean), rule: "R-FUNDING-GAP", reason: st === "supported" ? "a Shark investor appears in the funding record" : st === "conflicting" ? "web coverage reports the deal but the funding record does not show it — the deal may not have closed as aired" : "no source confirms the deal; a funding total of 0 is not proof either way", material: st === "conflicting" });
      if (st !== "supported") questions.push("Share the cap table and the signed Shark Tank term sheet / closing documents.");
    }

    if (wantAdverse) {
      const adverse = relevant.filter(n => /fraud|lawsuit|sued|court|regulator|sebi|rbi|ftc|sec |penalt|complaint|scam|arrest|probe/i.test(n.title + " " + (n.snippet ?? "")));
      ctx.find({ check: "Adverse information", claim: "Regulatory / legal / fraud coverage", observed: adverse.length ? adverse.map(a => `[${a.kind || "unclassified"}] ${a.title.slice(0, 80)}`).join(" · ") : `no relevant adverse items in ${judged.length} checked sources (${judged.filter(n => n.label !== "relevant").length} namesake/other-event items rejected)`, status: adverse.length ? "potential_issue" : "info", evidenceIds: [webEv, enrichEv].filter(Boolean), rule: "R-ADVERSE", reason: adverse.length ? "allegations are not findings — review the originals" : "absence of results is not a clean record; coverage is limited to the sources searched" });
    }

    // ---- hiring (free) + heartbeat
    const j = await cd.jobCount(b.crustdata_company_id, isoDaysAgo(90));
    let jobs90: number | null = null, jobsEv = "";
    if (j.ok) { jobs90 = (j.data?.aggregations?.[0]?.buckets ?? []).length; jobsEv = ctx.ev({ kind: "crustdata", endpoint: "/job/search", recordId: b.crustdata_company_id, fieldPath: "distinct titles posted, last 90 days", value: jobs90, cached: j.cached }); }
    heartbeat = computeHeartbeat({
      company, jobs90, relevantNewsDates: relevant.map(n => n.date ?? "").filter(Boolean),
      evidence: { enrich: enrichEv, jobs: jobsEv, news: webEv || enrichEv },
      excludeTraffic: acquired ? `company acquired — traffic/SEO likely belong to the acquirer (${acquirerNote})` : undefined,
    });
    emit({ agent: "verifier", brain: "rules", step: "heartbeat", detail: `${heartbeat.score ?? "—"} · ${heartbeat.band} · coverage ${heartbeat.coverage}`, status: "ok" });
    if (intake.claims.some(c => c.kind === "growth" || (c.kind === "headcount" && Number(c.value) >= 200)) && heartbeat.score !== null && heartbeat.score < 30 && heartbeat.coverage >= 0.5) {
      ctx.find({ check: "Activity vs claim", claim: "Scale / growth claim", observed: `Heartbeat ${heartbeat.score} (${heartbeat.band})`, status: "potential_issue", evidenceIds: [enrichEv, jobsEv].filter(Boolean), rule: "T-HB", reason: "observed operating activity is low for the claimed scale or growth" });
    }

    // ---- thesis fit (investment)
    if (intake.thesis) {
      const T = intake.thesis;
      const tx = norm([b.description, ...(company.taxonomy?.categories ?? []), ...(company.taxonomy?.professional_network_industries ?? []), b.industries].flat().filter(Boolean).join(" "));
      const country = String(company.locations?.country ?? "");
      fit = [];
      if (T.sectors.length) fit.push({ criterion: "Sector", expected: T.sectors.join(" / "), observed: (company.taxonomy?.professional_network_industries ?? company.taxonomy?.categories ?? []).slice(0, 2).join(", ") || (b.description ?? "").slice(0, 60), result: T.sectors.some(s => tx.includes(s) || (s === "food" && /food|momo|snack|cuisine|restaurant/.test(tx)) || (s === "subscription" && /subscription/.test(tx))) ? "pass" : tx ? "fail" : "unknown", evidenceIds: [enrichEv] });
      if (T.geos.length) fit.push({ criterion: "Geography", expected: T.geos.join(" / "), observed: country || "?", result: !country ? "unknown" : T.geos.some(g => (g === "US" && /USA|US|United States/i.test(country)) || (g === "India" && /IND|India/i.test(country))) ? "pass" : "fail", evidenceIds: [enrichEv] });
      if (T.maxStaff) fit.push({ criterion: "Team size", expected: `< ${T.maxStaff}`, observed: String(company.headcount?.total ?? "?"), result: typeof company.headcount?.total !== "number" ? "unknown" : company.headcount.total < T.maxStaff ? "pass" : "fail", evidenceIds: [enrichEv] });
      if (T.foundedBefore) fit.push({ criterion: "Founded", expected: `before ${T.foundedBefore}`, observed: String(b.year_founded ?? "?"), result: !b.year_founded ? "unknown" : b.year_founded < T.foundedBefore ? "pass" : "fail", evidenceIds: [enrichEv] });
      fit.push({ criterion: "Heartbeat", expected: `≥ ${T.minHeartbeat}`, observed: heartbeat.score === null ? "low signal" : `${heartbeat.score} (${heartbeat.band}, coverage ${heartbeat.coverage})`, result: heartbeat.score === null || heartbeat.coverage < 0.5 ? "unknown" : heartbeat.score >= T.minHeartbeat ? "pass" : "fail", evidenceIds: [enrichEv, jobsEv].filter(Boolean) });
    }
  }

  // 4. Verifier: outcomes (rules only)
  const material = findings.filter(f => f.status === "conflicting" && f.material);
  const outcomes: Outcome[] = intake.lenses.map(lens => {
    if (lens === "investment") {
      if (idr.status !== "resolved") return { lens, label: "Insufficient evidence", code: "insufficient" };
      if (acquired) return { lens, label: "Pass: not an independent company", code: "pass" };
      if (material.length) return { lens, label: "Hold for specific verification", code: "hold" };
      return { lens, label: "Advance to human diligence", code: "advance" };
    }
    if (idr.status !== "resolved") return { lens, label: "Insufficient evidence", code: "insufficient" };
    if (material.length) return { lens, label: "Hold: contradiction found", code: "hold" };
    return { lens, label: "Checks satisfied", code: "satisfied" };
  });
  emit({ agent: "verifier", brain: "rules", step: "outcome", detail: outcomes.map(o => `${o.lens}: ${o.label}`).join(" · ") + ` · rules: ${[...new Set(material.map(m => m.rule))].join(", ") || "none failed"}`, status: "ok" });

  // 5. Narrative (LLM optional, template fallback)
  const primary = outcomes[0];
  const coName = company?.basic_info?.name ?? intake.company?.value ?? "the company";
  const templ = [
    `${primary.label} — ${coName}.`,
    ...findings.filter(f => f.status === "conflicting").map(f => `${f.check}: ${f.reason} [${f.evidenceIds.join(", ")}].`),
    ...findings.filter(f => f.status === "supported" && f.check !== "Company identity").slice(0, 3).map(f => `${f.check} supported: ${f.observed} [${f.evidenceIds.join(", ")}].`),
    heartbeat ? `Heartbeat ${heartbeat.score ?? "—"} (${heartbeat.band}, coverage ${heartbeat.coverage}) — activity only, not a fraud signal.` : "",
  ].filter(Boolean).join(" ");
  let narrative = templ, narrativeBy = "template";
  const nj = await llmJson<{ memo: string }>({
    purpose: "write case memo from findings", agent: "clerk", budget, emit,
    schema: { type: "OBJECT", properties: { memo: { type: "STRING" } }, required: ["memo"] },
    prompt: `Write a crisp 4-6 sentence ${primary.lens === "investment" ? "investment committee" : "compliance case"} memo. Use ONLY these findings; cite evidence IDs in square brackets exactly as given; state the outcome "${primary.label}" verbatim first; do not add facts; say what a human must verify next.\nFINDINGS:\n${JSON.stringify(findings.map(f => ({ check: f.check, status: f.status, observed: f.observed, reason: f.reason, ev: f.evidenceIds })))}\nHEARTBEAT: ${heartbeat ? `${heartbeat.score} ${heartbeat.band}` : "n/a"}`,
    validate: x => typeof x?.memo === "string" && x.memo.includes(primary.label.split(":")[0]) && /\[E\d+/.test(x.memo),
  });
  if (nj) { narrative = nj.data.memo; narrativeBy = nj.model; }

  // 6. Case Clerk: local actions (simulated systems of record)
  const actions: CaseResult["actions"] = [];
  const caseRef = `SG-${id.slice(5, 19)}`;
  const reasons = material.map(m => `${m.check}: ${m.reason}`);
  for (const o of outcomes) {
    if (o.lens === "investment") {
      actions.push(writeAction("Deal pipeline", "pipeline.json", { case: caseRef, company: coName, crustdata_company_id: company?.basic_info?.crustdata_company_id, stage: o.code === "advance" ? "Advance" : o.code === "pass" ? "Pass" : o.code === "hold" ? "Hold" : "Needs info", reasons, heartbeat: heartbeat?.score ?? null }, `Deal ${coName} → ${o.label} in pipeline`));
    } else if (intake.claims.some(c => c.kind === "bank_change" || c.kind === "amount")) {
      const amount = intake.claims.find(c => c.kind === "amount")?.value;
      actions.push(writeAction("AP payment queue", "ap-queue.json", { case: caseRef, vendor: coName, request: "bank-detail change", amount_inr: amount ?? null, action: o.code === "hold" ? "PAYMENT HOLD" : "HOLD PENDING CALLBACK (policy)", reasons }, o.code === "hold" ? `Payment hold placed (${amount ? "INR " + Number(amount).toLocaleString("en-IN") : "pending invoices"})` : "Change parked pending callback (policy)"));
      actions.push(writeAction("Prepared tasks (not sent)", "tasks.json", { case: caseRef, task: `Call ${coName} on the number already in the vendor master (not the one in the email) to verify the request`, sent: false }, "Verification callback prepared — not sent"));
    } else {
      actions.push(writeAction("Vendor master", "vendors.json", { case: caseRef, vendor: coName, crustdata_company_id: company?.basic_info?.crustdata_company_id, status: o.code === "satisfied" ? "Approved" : "Exception", reasons }, `Vendor ${coName} → ${o.code === "satisfied" ? "Approved" : "Exception"}`));
    }
  }
  const exception = outcomes.some(o => o.code !== "advance" && o.code !== "satisfied") || intake.claims.some(c => c.kind === "bank_change");
  if (exception) actions.push(writeAction("Exceptions inbox", "inbox.json", { case: caseRef, company: coName, outcome: outcomes.map(o => o.label).join(" / "), top_reason: reasons[0] ?? findings.find(f => f.status !== "supported")?.reason }, "Routed to the human exceptions inbox"));
  emit({ agent: "clerk", step: "local actions", detail: actions.map(a => a.summary).join(" · "), status: "ok" });

  const result: CaseResult = {
    id: caseRef, createdAt: new Date().toISOString(), intake,
    identity: { status: idr.status, company: idr.company, candidates: idr.candidates.slice(0, 6), method: idr.method, note: idr.note },
    findings, heartbeat, fit, outcomes, actions, narrative, narrativeBy, questions: [...new Set(questions)], evidence, trace,
    spend: { crustdataCredits: round(budget.credits), crustdataCalls: budget.calls, cacheHits: budget.cacheHits, llmCalls: budget.llmCalls, llmTokens: budget.llmTokens, budgetPerRun: budget.creditsCap },
    profile: company ? { name: company.basic_info?.name, domain: company.basic_info?.primary_domain, founded: company.basic_info?.year_founded, hq: [company.locations?.city, company.locations?.state, company.locations?.country].filter(Boolean).join(", "), headcount: company.headcount?.total, range: company.basic_info?.employee_count_range, description: company.basic_info?.description, linkedin: company.basic_info?.professional_network_url, logo: company.basic_info?.logo_permalink } : undefined,
  };
  emit({ agent: "system", step: "done", detail: `${round(budget.credits)} cr spent (${budget.calls} calls, ${budget.cacheHits} cache hits) · ${budget.llmCalls} LLM calls / ${budget.llmTokens} tokens · ${((Date.now() - t0) / 1000).toFixed(1)}s`, status: "ok" });
  result.trace = trace;

  const runs = path.join(process.cwd(), "data", "runs");
  fs.mkdirSync(runs, { recursive: true });
  fs.writeFileSync(path.join(runs, `${caseRef}.json`), JSON.stringify(result, null, 2));
  return result;
}

export { accountCredits };
