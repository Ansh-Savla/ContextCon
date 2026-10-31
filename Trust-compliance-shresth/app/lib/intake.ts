/**
 * Intake agent. The rules parser always runs; the LLM (if enabled) adds fields it can quote from the text.
 * An LLM field whose span is not found verbatim in the request is dropped. Disagreements are recorded, not hidden.
 */
import type { Claim, Intake, Lens } from "./types";
import { extractDomains, normalizeDomain, FREE_MAIL } from "./domain";
import { llmJson } from "./llm";
import type { RunBudget } from "./budget";
import type { Emit } from "./crustdata";

const INR = (n: number, unit: string) => (/cr/i.test(unit) ? n * 1e7 : /l/i.test(unit) ? n * 1e5 : n);

export function parseRules(raw: string): Intake {
  const text = raw.replace(/\r/g, "");
  const claims: Claim[] = [];
  const people: Intake["people"] = [];
  let cid = 0;
  const add = (c: Omit<Claim, "id">) => claims.push({ id: `C${++cid}`, ...c });

  // Sender
  let senderEmail: Intake["senderEmail"], senderDomain: Intake["senderDomain"];
  const from = text.match(/^From:\s*(.*?)\s*<([^>\s]+@[^>\s]+)>/im) ?? text.match(/^From:\s*()([\w.+-]+@[\w.-]+\.[a-z]{2,})/im);
  if (from) {
    senderEmail = { value: from[2].toLowerCase(), span: from[0] };
    senderDomain = { value: normalizeDomain(from[2].split("@")[1]), span: from[2] };
    if (from[1] && !/partner/i.test(from[1])) people.push({ name: from[1].replace(/["']/g, "").trim(), span: from[1] });
  } else {
    const em = text.match(/[\w.+-]+@([\w-]+\.)+[a-z]{2,}/i);
    if (em) { senderEmail = { value: em[0].toLowerCase(), span: em[0] }; senderDomain = { value: normalizeDomain(em[0].split("@")[1]), span: em[0] }; }
  }

  // Company domain: explicit domains in the body that are not the sender's and not free mail
  const domains = extractDomains(text).filter(d => d !== senderDomain?.value && !FREE_MAIL.has(d));
  const domain = domains[0] ? { value: domains[0], span: domains[0] } : undefined;

  // Company name
  let company: Intake["company"];
  const namePatterns: RegExp[] = [
    /^Company:\s*(.+)$/im,
    /(?:new|the)\s+[\w ]{2,30}?\s+at\s+([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /(?:screen|look at|pls look at|check|screening)\s+(?:for me\s+)?([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /Founder of\s+([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /(?:term sheet to|send a term sheet to|supplier|vendor)\s+"?([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})"?/,
    /"([A-Z][\w&+' .-]{1,40})"/,
    /^([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})\s*\(/m,
  ];
  for (const re of namePatterns) {
    const m = text.match(re);
    if (m && m[1] && !/^(Hi|Hey|From|Subject|Sent|Before|New|Our|We|Re|Fwd)\b/.test(m[1])) {
      company = { value: m[1].split(/\.\s|\.$/)[0].replace(/[.,;:]+$/, "").replace(/\s+(Shark|S\d|Season)\b.*$/i, "").trim(), span: m[0] };
      break;
    }
  }
  if (!company && domain) company = { value: domain.value.split(".")[0], span: domain.span };

  // Claims
  const founded = text.match(/(?:founded|est\.?|established|co-?founded it|since)\s*(?:in\s*|:\s*)?((?:19|20)\d{2})/i);
  if (founded) add({ kind: "founded", text: `Founded ${founded[1]}`, value: Number(founded[1]), span: founded[0] });

  const hc = text.match(/(?:team of|employees:|staff:)\s*~?\s*(\d[\d,]*)/i) ?? text.match(/~?\s*(\d[\d,]*)\s*\+?\s*(?:people|staff|employees)\b/i);
  if (hc) { const n = Number(hc[1].replace(/,/g, "")); add({ kind: "headcount", text: `Headcount ≈ ${n.toLocaleString("en-US")}`, value: n, span: hc[0] }); }

  const rev = text.match(/\$\s?(\d+(?:\.\d+)?)\s*([MBK])\+?\s*(?:\+\s*)?(?:in\s+)?revenue/i);
  if (rev) add({ kind: "revenue", text: `Revenue ≥ $${rev[1]}${rev[2].toUpperCase()}`, value: Number(rev[1]) * ({ K: 1e3, M: 1e6, B: 1e9 } as any)[rev[2].toUpperCase()], span: rev[0] });

  const deal = text.match(/(?:Rs\.?|₹|INR)\s?([\d.]+)\s*(lakh|lac|L|crore|cr)\b[^.\n]*?for\s*(\d+)\s*%/i);
  if (deal) add({ kind: "shark_deal", text: `Deal ₹${deal[1]} ${deal[2]} for ${deal[3]}% (INR ${INR(Number(deal[1]), deal[2]).toLocaleString("en-IN")})`, value: INR(Number(deal[1]), deal[2]), span: deal[0] });
  else if (/shark (?:deal|tank)/i.test(text) && /(got|backed|deal|secured|accepted)/i.test(text)) {
    const m = text.match(/[^.\n]*shark[^.\n]*/i)!;
    add({ kind: "shark_deal", text: "Received a Shark Tank deal", span: m[0].trim() });
  }

  const amt = text.match(/(?:Rs\.?|₹|INR)\s?([\d.]+)\s*(lakh|lac|L|crore|cr)\s+invoice/i);
  if (amt) add({ kind: "amount", text: `Invoice ₹${amt[1]} ${amt[2]} = INR ${INR(Number(amt[1]), amt[2]).toLocaleString("en-IN")}`, value: INR(Number(amt[1]), amt[2]), span: amt[0] });

  const bank = text.match(/[^.\n]*(bank (?:account|details)|remittance)[^.\n]*(?:chang|updat|revis)[^.\n]*|[^.\n]*(?:chang|updat|revis)[^.\n]*(bank (?:account|details)|remittance)[^.\n]*/i);
  if (bank) add({ kind: "bank_change", text: "Request to change bank / remittance details", span: bank[0].trim() });

  const loc = text.match(/^HQ:\s*(.+)$/im) ?? text.match(/based in\s+([A-Z][\w ,]+)/);
  if (loc) add({ kind: "location", text: `HQ ${loc[1].trim()}`, value: loc[1].trim(), span: loc[0] });

  const ads = text.match(/~?\$\s?([\d.]+)\s*K\s*\/?\s*(?:a\s*)?month\s+on\s+Google Ads/i);
  if (ads) add({ kind: "other", text: `Spends ~$${ads[1]}K/month on Google Ads`, value: Number(ads[1]) * 1000, span: ads[0] });

  if (/(raising|raise)\s+(a\s+)?(bridge|series|seed|round)/i.test(text)) add({ kind: "funding", text: "Currently raising", span: text.match(/[^.\n]*rais(?:ing|e)[^.\n]*/i)![0].trim() });

  // People and roles
  const role = text.match(/I(?:'m| am) the new\s+([\w ]{3,30}?)\s+at\s+/i);
  if (role && people[0]) { people[0].role = role[1].trim(); add({ kind: "person_role", text: `${people[0].name} is ${role[1].trim()}`, person: people[0].name, span: role[0] }); }
  const founders = text.match(/(?:founders?|founded by)\s+([A-Z][\w.]+(?:\s+[A-Z][\w.]+){0,3})\s+and\s+([A-Z][\w.]+(?:\s+[A-Z][\w.]+){0,3})/);
  if (founders) for (const n of [founders[1], founders[2]]) {
    people.push({ name: n.trim(), role: "founder", span: founders[0] });
    add({ kind: "person_role", text: `${n.trim()} is a current founder`, person: n.trim(), span: founders[0] });
  }
  const growth = text.match(/[^.\n]*(rapidly growing|fast[- ]growing|hypergrowth|growing fast)[^.\n]*/i);
  if (growth) add({ kind: "growth", text: "Claims rapid growth", span: growth[0].trim() });

  // Thesis
  let thesis: Intake["thesis"];
  const th = text.match(/thesis[^:\n]*[:=]?\s*([^\n]+)/i);
  if (th) {
    const t = th[1];
    const lc = t.toLowerCase();
    thesis = {
      text: t.trim(),
      sectors: ["subscription", "consumer", "food", "fintech", "saas", "ai", "health", "d2c"].filter(s => lc.includes(s)),
      geos: [/\bus\b|united states/i.test(t) ? "US" : "", /india/i.test(t) ? "India" : ""].filter(Boolean),
      stages: ["pre-seed", "seed", "series a", "series b"].filter(s => lc.includes(s)),
      maxStaff: Number(lc.match(/under\s*(\d+)\s*(?:staff|people|employees)/)?.[1]) || undefined,
      foundedBefore: Number(lc.match(/founded before\s*(\d{4})/)?.[1]) || undefined,
      minHeartbeat: Number(text.match(/(?:min(?:imum)? heartbeat|heartbeat of at least)\s*(\d+)/i)?.[1]) || 40,
    };
  }

  let roster: Intake["roster"];
  const rj = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (rj) { try { roster = JSON.parse(rj[0]); } catch { /* not a roster */ } }

  // Lens
  const inv = (text.match(/\b(screen|thesis|pitch|pitched|raise|raising|term sheet|syndicate|invest|follow-on|IC|deal flow|founders?)\b/gi) ?? []).length;
  const tru = (text.match(/\b(supplier|vendor|onboard|invoice|bank|remittance|payment|net-\d+|terms|regulatory|legal|fraud)\b/gi) ?? []).length;
  const lenses: Lens[] = inv && tru ? (inv >= tru ? ["investment", "trust"] : ["trust", "investment"]) : tru ? ["trust"] : ["investment"];

  const asks: string[] = [];
  if (/regulatory|legal|fraud|adverse|lawsuit/i.test(text)) asks.push("adverse");
  if (/follow-on|bridge|zombie|still alive/i.test(text)) asks.push("follow_on");
  if (/net-\d+|credit|terms/i.test(text)) asks.push("credit_terms");

  return {
    raw, lenses, synthetic: /SYNTHETIC/i.test(text), company, domain, senderEmail, senderDomain, people, claims, thesis, roster, asks,
    parsedBy: "rules", disagreements: [],
  };
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    lens: { type: "STRING", enum: ["investment", "trust", "both"] },
    company: { type: "OBJECT", properties: { value: { type: "STRING" }, span: { type: "STRING" } } },
    company_domain: { type: "OBJECT", properties: { value: { type: "STRING" }, span: { type: "STRING" } } },
    people: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, role: { type: "STRING" }, span: { type: "STRING" } } } },
    claims: { type: "ARRAY", items: { type: "OBJECT", properties: {
      kind: { type: "STRING", enum: ["founded", "headcount", "revenue", "funding", "shark_deal", "person_role", "bank_change", "amount", "location", "growth", "other"] },
      text: { type: "STRING" }, value: { type: "STRING" }, person: { type: "STRING" }, span: { type: "STRING" } } } },
  },
  required: ["lens", "claims"],
};

/** Rules first, then let the LLM fill gaps. Every LLM field must quote a span that exists in the text. */
export async function runIntake(raw: string, budget: RunBudget, emit: Emit): Promise<Intake> {
  const rules = parseRules(raw);
  emit({ agent: "intake", brain: "rules", step: "rules parser", detail: `company=${rules.company?.value ?? "—"} domain=${rules.domain?.value ?? "—"} sender=${rules.senderDomain?.value ?? "—"} claims=${rules.claims.length}`, status: "ok" });

  const lc = raw.toLowerCase();
  const inText = (s?: string) => !!s && lc.includes(s.toLowerCase().slice(0, 80));
  const res = await llmJson<any>({
    purpose: "extract entities + claims (with source spans)",
    agent: "intake", budget, emit, schema: SCHEMA,
    prompt: `You are the intake clerk of a diligence desk (investment screening and vendor/payment trust checks, India and US).
Extract from the request below: lens, the company being asked about (not the sender's mail provider), the company's website domain if written in the body (NOT an email sender domain), people with their claimed roles, and every checkable claim.
For EVERY field, "span" must be copied verbatim from the request. Do not invent anything.

REQUEST:
${raw}`,
    validate: (x: any) => Array.isArray(x?.claims) && x.claims.every((c: any) => !c.span || inText(c.span)),
  });
  if (!res) return rules;

  const out: Intake = { ...rules, parsedBy: "llm+rules", disagreements: [] };
  const d = res.data;
  if (d.company?.value && inText(d.company.span)) {
    if (!out.company) out.company = d.company;
    else if (d.company.value.toLowerCase() !== out.company.value.toLowerCase()) {
      out.disagreements.push(`company: rules "${out.company.value}" vs LLM "${d.company.value}" (LLM used)`);
      out.company = d.company;
    }
  }
  if (d.company_domain?.value && inText(d.company_domain.span)) {
    const v = normalizeDomain(d.company_domain.value);
    if (v !== out.senderDomain?.value) {
      if (!out.domain) out.domain = { value: v, span: d.company_domain.span };
      else if (v !== out.domain.value) out.disagreements.push(`domain: rules "${out.domain.value}" vs LLM "${v}" (rules kept)`);
    }
  }
  for (const p of d.people ?? []) {
    if (!p?.name || !inText(p.span ?? p.name)) continue;
    const ex = out.people.find(q => q.name.toLowerCase() === p.name.toLowerCase());
    if (ex) { if (!ex.role && p.role) ex.role = p.role; }
    else out.people.push({ name: p.name, role: p.role, span: p.span });
  }
  for (const c of d.claims ?? []) {
    if (!c?.kind || !inText(c.span)) continue;
    if (out.claims.some(x => x.kind === c.kind && (x.kind !== "person_role" || x.person === c.person))) continue;
    const num = Number(String(c.value ?? "").replace(/[^\d.]/g, ""));
    out.claims.push({ id: `C${out.claims.length + 1}`, kind: c.kind, text: c.text, value: Number.isFinite(num) && num ? num : c.value, span: c.span, person: c.person });
  }
  if (d.lens === "both" && out.lenses.length === 1) out.lenses.push(out.lenses[0] === "trust" ? "investment" : "trust");
  if (out.disagreements.length) emit({ agent: "intake", brain: res.model, step: "parser disagreement", detail: out.disagreements.join("; "), status: "info" });
  return out;
}
