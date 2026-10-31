/**
 * CLI: run one case end to end (demo fallback).
 *   npm run case -- E5            (an example from ../EXAMPLES.md)
 *   npm run case -- "free text"   (any request)
 */
import fs from "node:fs";
import { runCase } from "./lib/engine";
import { ledger } from "./lib/budget";

const arg = process.argv.slice(2).join(" ").trim();
let text = arg;
if (/^E\d$/i.test(arg)) {
  const md = fs.readFileSync("../EXAMPLES.md", "utf8");
  const m = md.match(new RegExp(`## ${arg.toUpperCase()}\\b[\\s\\S]*?\`\`\`text\\n([\\s\\S]*?)\`\`\``));
  if (!m) throw new Error(`example ${arg} not found`);
  text = m[1];
}
if (!text) { console.error('usage: npm run case -- E5 | "request text"'); process.exit(1); }

const icon: Record<string, string> = { ok: "✓", skipped: "⤼", failed: "✗", fallback: "↓", info: "·" };
(async () => {
  const r = await runCase(text, e => console.log(`${String((e.t / 1000).toFixed(1)).padStart(5)}s ${icon[e.status]} [${e.agent}${e.brain ? "/" + e.brain : ""}] ${e.step}${e.detail ? " — " + e.detail : ""}`));
  console.log("\n================ CASE", r.id, "================");
  console.log("OUTCOME:", r.outcomes.map(o => `${o.lens.toUpperCase()}: ${o.label}`).join("  |  "));
  console.log("IDENTITY:", r.identity.status, r.identity.company ? `${r.identity.company.name} (${r.identity.company.id})` : "", r.identity.note ?? "");
  if (r.identity.status === "ambiguous") for (const c of r.identity.candidates) console.log(`   candidate ${c.id} ${c.name} ${c.domain ?? ""} ${c.size ?? ""} score ${c.score}`);
  console.log("\nFINDINGS:");
  for (const f of r.findings) console.log(` ${f.status.toUpperCase().padEnd(15)} ${f.check.padEnd(22)} ${f.observed ?? ""}\n${" ".repeat(17)}↳ ${f.rule}: ${f.reason} [${f.evidenceIds.join(",")}]`);
  if (r.heartbeat) {
    console.log(`\nHEARTBEAT: ${r.heartbeat.score ?? "—"} ${r.heartbeat.band} · coverage ${r.heartbeat.coverage} · as of ${r.heartbeat.asOf ?? "?"}`);
    for (const c of r.heartbeat.components) console.log(`   ${c.name.padEnd(22)} w${String(c.weight).padEnd(4)} ${c.score ?? "—"}  ${c.value ?? c.missingReason ?? ""} ${c.note ?? ""}`);
  }
  if (r.fit) { console.log("\nTHESIS FIT:"); for (const f of r.fit) console.log(`   ${f.result.toUpperCase().padEnd(8)} ${f.criterion}: expected ${f.expected}, observed ${f.observed}`); }
  console.log(`\nMEMO (${r.narrativeBy}):\n${r.narrative}`);
  if (r.questions.length) console.log("\nQUESTIONS:\n - " + r.questions.join("\n - "));
  console.log("\nACTIONS:\n - " + r.actions.map(a => `${a.system}: ${a.summary} (${a.file})`).join("\n - "));
  console.log(`\nSPEND: ${r.spend.crustdataCredits} cr / ${r.spend.budgetPerRun} run budget · ${r.spend.crustdataCalls} calls · ${r.spend.cacheHits} cache hits · LLM ${r.spend.llmCalls} calls ${r.spend.llmTokens} tokens`);
  console.log("LEDGER:", JSON.stringify(ledger()));
})();
