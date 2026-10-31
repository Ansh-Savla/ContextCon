/** Domain normalisation and lookalike detection (rule R-LOOKALIKE). */

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0].replace(/\.$/, "");
}

const MULTI_TLDS = ["co.in", "co.uk", "com.au", "org.in", "net.in", "co.jp"];
export function splitDomain(d: string): { label: string; tld: string } {
  const n = normalizeDomain(d);
  const multi = MULTI_TLDS.find(t => n.endsWith("." + t));
  const tld = multi ?? n.split(".").slice(-1)[0];
  const rest = n.slice(0, n.length - tld.length - 1);
  return { label: rest.split(".").slice(-1)[0] ?? rest, tld };
}

export const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "protonmail.com", "rediffmail.com", "yahoo.co.in", "live.com"]);

function lev(a: string, b: string): number {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

const HOMOGLYPHS: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s", rn: "m", vv: "w" };
const deglyph = (s: string) => Object.entries(HOMOGLYPHS).reduce((x, [k, v]) => x.split(k).join(v), s);

export type DomainVerdict =
  | { kind: "same"; reason: string }
  | { kind: "subdomain"; reason: string }
  | { kind: "lookalike"; reason: string; signals: string[] }
  | { kind: "free_mail"; reason: string }
  | { kind: "unrelated"; reason: string };

/** Compare a submitted/sender domain against the company's canonical domains. */
export function compareDomain(submitted: string, canonical: string[]): DomainVerdict {
  const s = normalizeDomain(submitted);
  const canon = canonical.map(normalizeDomain).filter(Boolean);
  if (FREE_MAIL.has(s)) return { kind: "free_mail", reason: `${s} is a free webmail domain, not a company domain` };
  if (canon.includes(s)) return { kind: "same", reason: `${s} is one of the company's domains` };
  const sub = canon.find(c => s.endsWith("." + c));
  if (sub) return { kind: "subdomain", reason: `${s} is a subdomain of ${sub}` };
  const S = splitDomain(s);
  for (const c of canon) {
    const C = splitDomain(c);
    const signals: string[] = [];
    const sl = S.label.replace(/-/g, ""), cl = C.label.replace(/-/g, "");
    if (S.tld !== C.tld) signals.push(`TLD .${S.tld} vs .${C.tld}`);
    if (sl !== cl && (sl.includes(cl) || cl.includes(sl))) signals.push(`brand "${C.label}" + extra token ("${S.label}")`);
    if (S.label !== C.label && sl === cl) signals.push(`hyphenation "${S.label}" vs "${C.label}"`);
    const d = lev(deglyph(sl), deglyph(cl));
    if (sl !== cl && d > 0 && d <= 2 && cl.length >= 5) signals.push(`edit distance ${d} from "${C.label}"`);
    if (deglyph(sl) === deglyph(cl) && sl !== cl) signals.push("homoglyph substitution");
    const brandish = signals.some(x => !x.startsWith("TLD"));
    if (brandish || (S.label === C.label && S.tld !== C.tld)) return { kind: "lookalike", reason: `${s} imitates ${c}`, signals };
  }
  return { kind: "unrelated", reason: `${s} is not one of the company's domains (${canon.join(", ") || "none on record"})` };
}

export function extractDomains(text: string): string[] {
  const out = new Set<string>();
  const re = /\b(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|in|co|io|ai|org|net|app|xyz|biz|co\.in|co\.uk|tech|store|shop|us))\b/gi;
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 1), m.index ?? 0);
    if (before === "@") continue; // email domains handled separately
    out.add(normalizeDomain(m[1]));
  }
  return [...out];
}
