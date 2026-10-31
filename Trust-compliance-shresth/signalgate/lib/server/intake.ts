/**
 * Intake agent: understands an unformatted request from an investor or a lender.
 * The rules parser always runs; Gemini (if enabled) adds fields it can quote verbatim from the request.
 */
import type { Claim, Intake, Requester } from "../types";
import { extractDomains, normalizeDomain, FREE_MAIL } from "./domain";
import { llmJson } from "./llm";
import type { RunBudget } from "./budget";
import type { Emit } from "./crustdata";

const INR = (n: number, unit: string) => (/cr/i.test(unit) ? n * 1e7 : /l/i.test(unit) ? n * 1e5 : n);
const USD = (n: number, unit = "") => n * ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[unit.toLowerCase()] || n;

export function parseRules(raw: string): Intake {
  const text = raw.replace(/\r/g, "");
  const claims: Claim[] = [];
  const people: Intake["people"] = [];
  let n = 0;
  const add = (c: Omit<Claim, "id">) => claims.push({ id: `C${++n}`, ...c });

  // Sender (emails / forwarded mails)
  let senderEmail: Intake["senderEmail"], senderDomain: Intake["senderDomain"];
  const from = text.match(/^From:\s*(.*?)\s*<([^>\s]+@[^>\s]+)>/im) ?? text.match(/^From:\s*()([\w.+-]+@[\w.-]+\.[a-z]{2,})/im);
  if (from) {
    senderEmail = { value: from[2].toLowerCase(), span: from[2] };
    senderDomain = { value: normalizeDomain(from[2].split("@")[1]), span: from[2] };
    if (from[1] && !/partner|team|desk/i.test(from[1])) people.push({ name: from[1].replace(/["']/g, "").trim(), span: from[1] });
  }

  const domains = extractDomains(text).filter(d => d !== senderDomain?.value && !FREE_MAIL.has(d));
  const domain = domains[0] ? { value: domains[0], span: domains[0] } : undefined;

  // Company
  let company: Intake["company"];
  const pats: RegExp[] = [
    /^(?:Company|Applicant|Borrower|Business)\s*(?:name)?:\s*(.+)$/im,
    /(?:new|the)\s+[\w ]{2,30}?\s+at\s+([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /(?:screen|look at|pls look at|check|screening|diligence on|investing in|invest in|cheque (?:to|into)|loan (?:to|for)|line (?:to|for)|term sheet to)\s+(?:for me\s+)?([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /Founder of\s+([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})/,
    /"([A-Z][\w&+' .-]{1,40})"/,
    /^([A-Z][\w&+'.-]*(?:\s+[A-Z+&][\w&+'.-]*){0,3})\s*\(/m,
  ];
  for (const re of pats) {
    const m = text.match(re);
    if (m?.[1] && !/^(Hi|Hey|From|Subject|Sent|Before|New|Our|We|Re|Fwd|Dear|Please)\b/.test(m[1])) {
      company = { value: m[1].split(/\.\s|\.$/)[0].replace(/[.,;:]+$/, "").replace(/\s+(Shark|S\d|Season|has|is|wants|asks)\b.*$/i, "").trim(), span: m[1] };
      break;
    }
  }
  if (!company && domain) company = { value: domain.value.split(".")[0], span: domain.span };

  // Claims
  const founded = text.match(/(?:founded|est\.?|established|incorporated|co-?founded it|since|in business since)\s*(?:in\s*|:\s*)?((?:19|20)\d{2})/i);
  if (founded) add({ kind: "founded", text: `Founded ${founded[1]}`, value: Number(founded[1]), span: founded[0] });
  const hc = text.match(/(?:team of|employees:|staff:|headcount:?)\s*~?\s*(\d[\d,]*)/i) ?? text.match(/~?\s*(\d[\d,]*)\s*\+?\s*(?:people|staff|employees|full-time)\b/i);
  if (hc) { const v = Number(hc[1].replace(/,/g, "")); add({ kind: "headcount", text: `Team of about ${v.toLocaleString("en-US")}`, value: v, span: hc[0] }); }
  const rev = text.match(/\$\s?(\d+(?:\.\d+)?)\s*([MBK])\+?\s*(?:in\s+)?(?:annual\s+)?(?:revenue|sales|ARR)/i) ?? text.match(/(?:revenue|sales|ARR)\s*(?:of|:)?\s*\$\s?(\d+(?:\.\d+)?)\s*([MBK])/i);
  if (rev) add({ kind: "revenue", text: `Revenue ≥ $${rev[1]}${rev[2].toUpperCase()}`, value: USD(Number(rev[1]), rev[2]), span: rev[0] });
  const revInr = text.match(/(?:revenue|sales|turnover)[^.\n]{0,20}?(?:Rs\.?|₹|INR)\s?([\d.]+)\s*(crore|cr|lakh|L)\b/i);
  if (revInr) add({ kind: "revenue", text: `Revenue ₹${revInr[1]} ${revInr[2]}`, value: INR(Number(revInr[1]), revInr[2]), span: revInr[0] });
  const deal = text.match(/(?:Rs\.?|₹|INR)\s?([\d.]+)\s*(lakh|lac|L|crore|cr)\b[^.\n]*?for\s*(\d+)\s*%/i);
  if (deal) add({ kind: "shark_deal", text: `Shark Tank deal ₹${deal[1]} ${deal[2]} for ${deal[3]}%`, value: INR(Number(deal[1]), deal[2]), span: deal[0] });
  else if (/shark/i.test(text) && /(got|backed|deal|secured|accepted)/i.test(text)) add({ kind: "shark_deal", text: "Received a Shark Tank deal", span: text.match(/[^.\n]*shark[^.\n]*/i)![0].trim() });
  const bank = text.match(/[^.\n]*(?:bank (?:account|details)|remittance|wire (?:instructions|details)|account details)[^.\n]*(?:chang|updat|revis|new)[^.\n]*|[^.\n]*(?:chang|updat|revis|new)[^.\n]*(?:bank (?:account|details)|remittance|wire (?:instructions|details))[^.\n]*/i);
  if (bank) add({ kind: "bank_change", text: "Asks to send money to new bank / wire details", span: bank[0].trim() });
  const loc = text.match(/^(?:HQ|Location|Address|Based in):?\s*(.+)$/im) ?? text.match(/based in\s+([A-Z][\w ,]+?)(?:[.,\n]|$)/) ?? text.match(/\(([A-Z][\w ]+(?: NCR)?)\)/);
  if (loc && !/^\d/.test(loc[1])) add({ kind: "location", text: `Located in ${loc[1].trim()}`, value: loc[1].trim(), span: loc[0] });
  if (/\b(independent|family[- ]owned|owner[- ]operated|not owned by)\b/i.test(text)) add({ kind: "independent", text: "Says it is independently owned", span: text.match(/[^.\n]*\b(independent|family[- ]owned|owner[- ]operated|not owned by)\b[^.\n]*/i)![0].trim() });
  const ads = text.match(/~?\$\s?([\d.]+)\s*K\s*\/?\s*(?:a\s*)?month\s+on\s+(?:Google )?Ads/i);
  if (ads) add({ kind: "other", text: `Spends ~$${ads[1]}K/month on ads`, value: Number(ads[1]) * 1000, span: ads[0] });
  const growth = text.match(/[^.\n]*(rapidly growing|fast[- ]growing|hypergrowth|growing fast|doubled|tripled)[^.\n]*/i);
  if (growth) add({ kind: "growth", text: "Claims rapid growth", span: growth[0].trim() });

  // People
  const role = text.match(/I(?:'m| am) the (?:new\s+)?([\w ]{3,30}?)\s+(?:at|of)\s+/i);
  if (role && people[0]) { people[0].role = role[1].trim(); add({ kind: "person_role", text: `${people[0].name} is ${role[1].trim()}`, person: people[0].name, span: role[0] }); }
  const fnd = text.match(/(?:founders?|founded by|promoters?)\s+([A-Z][\w.]+(?:\s+[A-Z][\w.]+){0,3})\s+and\s+([A-Z][\w.]+(?:\s+[A-Z][\w.]+){0,3})/);
  if (fnd) for (const p of [fnd[1], fnd[2]]) { people.push({ name: p.trim(), role: "founder", span: fnd[0] }); add({ kind: "person_role", text: `${p.trim()} is a current founder`, person: p.trim(), span: fnd[0] }); }

  // Ask (amount + instrument) and requester
  let ask: Intake["ask"];
  const askInr = text.match(/(?:Rs\.?|₹|INR)\s?([\d.]+)\s*(lakh|lac|L|crore|cr)\b\s*(cheque|check|investment|loan|credit line|working[- ]capital|term loan|facility|SAFE|round|invoice)?/i);
  const askUsd = text.match(/\$\s?([\d.]+)\s*([KMB])?\s*(cheque|check|investment|loan|credit line|line of credit|working[- ]capital|term loan|facility|SAFE|round|bridge)/i) ?? text.match(/(loan|credit line|line of credit|facility|cheque|SAFE)\s+of\s+\$\s?([\d.]+)\s*([KMB])?/i);
  if (askUsd) {
    const [amt, unit, inst] = askUsd[1] && /^\d/.test(askUsd[1]) ? [askUsd[1], askUsd[2], askUsd[3]] : [askUsd[2], askUsd[3], askUsd[1]];
    ask = { amount: USD(Number(amt), unit ?? ""), currency: "USD", text: askUsd[0], instrument: inst?.toLowerCase() };
  } else if (askInr && !deal) ask = { amount: INR(Number(askInr[1]), askInr[2]), currency: "INR", text: askInr[0], instrument: askInr[3]?.toLowerCase() };

  const lend = (text.match(/\b(loan|lend|lending|borrow|credit line|line of credit|working[- ]capital|term loan|facility|net-\d+|credit terms|underwrit\w*|NBFC|repay\w*|collateral|EMI|KYB)\b/gi) ?? []).length;
  const inv = (text.match(/\b(invest\w*|cheque|term sheet|SAFE|round|valuation|thesis|syndicate|screen\w*|pitch\w*|follow-on|cap table|equity|VC|angel)\b/gi) ?? []).length;
  const requester: Requester = lend > inv ? "lender" : "investor";
  const requesterWhy = `${lend} lending term(s) vs ${inv} investing term(s)`;

  // Thesis (investor)
  let thesis: Intake["thesis"];
  const th = text.match(/thesis[^:\n]*[:=]?\s*([^\n]+)/i);
  if (th) {
    const t = th[1], lc = t.toLowerCase();
    thesis = {
      text: t.trim(),
      sectors: ["subscription", "consumer", "food", "fintech", "saas", "ai", "health", "d2c", "translation", "b2b"].filter(s => lc.includes(s)),
      geos: [/\bus\b|united states/i.test(t) ? "US" : "", /india/i.test(t) ? "India" : ""].filter(Boolean),
      stages: ["pre-seed", "seed", "series a", "series b"].filter(s => lc.includes(s)),
      maxStaff: Number(lc.match(/under\s*(\d+)\s*(?:staff|people|employees)/)?.[1]) || undefined,
      foundedBefore: Number(lc.match(/founded before\s*(\d{4})/)?.[1]) || undefined,
      minHeartbeat: Number(text.match(/(?:min(?:imum)? heartbeat|heartbeat of at least)\s*(\d+)/i)?.[1]) || 40,
    };
  }

  return {
    raw, requester, requesterWhy, synthetic: /SYNTHETIC/i.test(text), company, domain, senderEmail, senderDomain, people, claims, ask, thesis,
    wantsAdverse: true, parsedBy: "rules", disagreements: [],
  };
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    requester: { type: "STRING", enum: ["investor", "lender"] },
    company: { type: "OBJECT", properties: { value: { type: "STRING" }, span: { type: "STRING" } } },
    company_domain: { type: "OBJECT", properties: { value: { type: "STRING" }, span: { type: "STRING" } } },
    people: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, role: { type: "STRING" }, span: { type: "STRING" } } } },
    claims: { type: "ARRAY", items: { type: "OBJECT", properties: {
      kind: { type: "STRING", enum: ["founded", "headcount", "revenue", "funding", "shark_deal", "person_role", "bank_change", "location", "growth", "independent", "other"] },
      text: { type: "STRING" }, value: { type: "STRING" }, person: { type: "STRING" }, span: { type: "STRING" } } } },
  },
  required: ["requester", "claims"],
};

export async function runIntake(raw: string, budget: RunBudget, emit: Emit): Promise<Intake> {
  const rules = parseRules(raw);
  emit({ stage: "intake", agent: "intake", brain: "rules", step: "Read the request", detail: `${rules.requester} request · company ${rules.company?.value ?? "—"} · ${rules.claims.length} claims`, status: "ok" });
  const lc = raw.toLowerCase();
  const inText = (s?: string) => !!s && lc.includes(s.toLowerCase().slice(0, 80));
  const res = await llmJson<any>({
    purpose: "Extract entities and claims with source quotes", agent: "intake", budget, emit, schema: SCHEMA, fast: true,
    prompt: `You are the intake analyst of a diligence desk that serves investors (equity diligence) and lenders (credit / KYB).
From the request below extract: who is asking (investor or lender), the company being assessed (not an email provider), the company's website domain if written in the body (NOT a sender email domain), people with claimed roles, and every checkable claim.
For EVERY field, "span" must be copied verbatim from the request. Never invent.

REQUEST:
${raw}`,
    validate: (x: any) => Array.isArray(x?.claims) && x.claims.every((c: any) => !c.span || inText(c.span)),
  });
  if (!res) return rules;
  const out: Intake = { ...rules, parsedBy: "llm+rules", disagreements: [] };
  const d = res.data;
  if (d.company?.value && inText(d.company.span)) {
    if (!out.company) out.company = d.company;
    else if (d.company.value.toLowerCase() !== out.company.value.toLowerCase()) { out.disagreements.push(`Company: rules read “${out.company.value}”, model read “${d.company.value}” (model used)`); out.company = d.company; }
  }
  if (d.company_domain?.value && inText(d.company_domain.span)) {
    const v = normalizeDomain(d.company_domain.value);
    if (v !== out.senderDomain?.value && !out.domain) out.domain = { value: v, span: d.company_domain.span };
  }
  if (d.requester && d.requester !== out.requester && Math.abs(Number(out.requesterWhy.match(/^(\d+)/)?.[1] ?? 0) - Number(out.requesterWhy.match(/vs (\d+)/)?.[1] ?? 0)) <= 1) {
    out.disagreements.push(`Requester: rules read ${out.requester}, model read ${d.requester} (model used — rules were close)`);
    out.requester = d.requester;
  }
  for (const p of d.people ?? []) {
    if (!p?.name || !inText(p.span ?? p.name)) continue;
    const ex = out.people.find(q => q.name.toLowerCase() === p.name.toLowerCase());
    if (ex) { if (!ex.role && p.role) ex.role = p.role; } else out.people.push({ name: p.name, role: p.role, span: p.span });
  }
  for (const c of d.claims ?? []) {
    if (!c?.kind || !inText(c.span)) continue;
    if (out.claims.some(x => x.kind === c.kind && (x.kind !== "person_role" || x.person === c.person))) continue;
    const num = Number(String(c.value ?? "").replace(/[^\d.]/g, ""));
    out.claims.push({ id: `C${out.claims.length + 1}`, kind: c.kind, text: c.text, value: Number.isFinite(num) && num ? num : c.value, span: c.span, person: c.person });
  }
  if (out.disagreements.length) emit({ stage: "intake", agent: "intake", brain: res.model, step: "Parsers disagreed", detail: out.disagreements.join("; "), status: "info" });
  return out;
}
