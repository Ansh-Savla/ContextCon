/**
 * Credit rationing. Three layers, all enforced before a paid call goes out:
 *   1. session ledger (data/ledger.json): total CrustData credits and LLM calls this app has ever spent;
 *   2. per-run budget: credits and LLM calls/tokens for one case;
 *   3. per-run, per-endpoint call caps (config.budget.callsPerRun).
 * Identical requests are served from the on-disk cache at 0 credits, so re-running a demo case is free.
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths";
import crypto from "node:crypto";
import { config } from "./config";


const LEDGER = path.join(DATA_DIR, "ledger.json");
const CACHE_DIR = path.join(DATA_DIR, "cache");

type Ledger = { crustdataCredits: number; crustdataCalls: number; llmCalls: number; llmTokens: number; runs: number; updatedAt: string };

function readLedger(): Ledger {
  try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); }
  catch { return { crustdataCredits: 0, crustdataCalls: 0, llmCalls: 0, llmTokens: 0, runs: 0, updatedAt: new Date().toISOString() }; }
}
function writeLedger(l: Ledger) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  l.updatedAt = new Date().toISOString();
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2));
}
export const ledger = () => readLedger();

export class RunBudget {
  credits = 0;
  calls = 0;
  cacheHits = 0;
  tavilyCalls = 0;
  llmCalls = 0;
  llmTokens = 0;
  private perEndpoint = new Map<string, number>();

  constructor(public creditsCap = config.budget.creditsPerRun) {
    const l = readLedger();
    l.runs += 1;
    writeLedger(l);
  }

  /** Returns null when allowed, or the reason the call is rationed away. */
  denyCrustdata(endpoint: string, estimate: number): string | null {
    const cap = config.budget.callsPerRun[endpoint];
    const used = this.perEndpoint.get(endpoint) ?? 0;
    if (cap !== undefined && used >= cap) return `per-run cap for ${endpoint} reached (${cap} calls)`;
    if (this.credits + estimate > this.creditsCap) return `run budget ${this.creditsCap} cr would be exceeded (spent ${round(this.credits)}, next ≈${round(estimate)})`;
    const l = readLedger();
    if (l.crustdataCredits + estimate > config.budget.creditsTotal) return `app budget ${config.budget.creditsTotal} cr exhausted (spent ${round(l.crustdataCredits)})`;
    return null;
  }

  recordCrustdata(endpoint: string, credits: number) {
    this.perEndpoint.set(endpoint, (this.perEndpoint.get(endpoint) ?? 0) + 1);
    this.credits += credits;
    this.calls += 1;
    const l = readLedger();
    l.crustdataCredits += credits;
    l.crustdataCalls += 1;
    writeLedger(l);
  }

  denyLlm(): string | null {
    if (this.llmCalls >= config.budget.llmCallsPerRun) return `LLM call cap per run reached (${config.budget.llmCallsPerRun})`;
    if (this.llmTokens >= config.budget.llmTokensPerRun) return `LLM token cap per run reached (${config.budget.llmTokensPerRun})`;
    if (readLedger().llmCalls >= config.budget.llmCallsTotal) return `LLM app cap reached (${config.budget.llmCallsTotal} calls)`;
    return null;
  }

  recordLlm(tokens: number) {
    this.llmCalls += 1;
    this.llmTokens += tokens;
    const l = readLedger();
    l.llmCalls += 1;
    l.llmTokens += tokens;
    writeLedger(l);
  }
}

export const round = (n: number) => Math.round(n * 100) / 100;

// ---------------- cache ----------------

const keyOf = (p: string, body: unknown) => crypto.createHash("sha256").update(p + "\n" + JSON.stringify(body ?? null)).digest("hex").slice(0, 32);

export function cacheGet<T>(p: string, body: unknown): { data: T; at: string } | null {
  if (config.cacheMode !== "use") return null;
  try {
    const f = path.join(CACHE_DIR, keyOf(p, body) + ".json");
    const hit = JSON.parse(fs.readFileSync(f, "utf8"));
    if (Date.now() - Date.parse(hit.at) > config.cacheTtlHours * 3600_000) return null;
    return hit;
  } catch { return null; }
}

export function cachePut(p: string, body: unknown, data: unknown) {
  if (config.cacheMode === "off") return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, keyOf(p, body) + ".json"), JSON.stringify({ at: new Date().toISOString(), path: p, body, data }));
}
