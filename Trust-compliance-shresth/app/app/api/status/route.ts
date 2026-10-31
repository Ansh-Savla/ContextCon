import fs from "node:fs";
import path from "node:path";
import { accountCredits } from "@/lib/crustdata";
import { ledger } from "@/lib/budget";
import { llmLabel } from "@/lib/llm";
import { config } from "@/lib/config";
import { readSystem } from "@/lib/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Free: account balance, app ledger, brain chain, examples, systems of record, saved runs. */
export async function GET() {
  let examples: Array<{ id: string; title: string; text: string }> = [];
  try {
    const md = fs.readFileSync(path.join(process.cwd(), "..", "EXAMPLES.md"), "utf8");
    examples = [...md.matchAll(/## (E\d)[^\S\n]*·?[^\S\n]*([^\n]*)\n[\s\S]*?```text\n([\s\S]*?)```/g)].map(m => ({ id: m[1], title: m[2].replace(/✅|\(id \d+\)/g, "").trim(), text: m[3].trim() }));
  } catch { /* examples optional */ }
  const runsDir = path.join(process.cwd(), "data", "runs");
  let runs: Array<{ id: string; label: string }> = [];
  try {
    runs = fs.readdirSync(runsDir).filter(f => f.endsWith(".json")).sort().reverse().slice(0, 15).map(f => {
      const r = JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf8"));
      return { id: r.id, label: `${r.profile?.name ?? r.intake?.company?.value ?? "?"} — ${r.outcomes?.[0]?.label ?? ""}` };
    });
  } catch { /* none yet */ }
  return Response.json({
    credits: await accountCredits(),
    ledger: ledger(),
    brain: llmLabel(),
    budget: { perRun: config.budget.creditsPerRun, total: config.budget.creditsTotal, llmPerRun: config.budget.llmCallsPerRun },
    examples,
    systems: { inbox: readSystem("inbox.json").slice(-8).reverse(), pipeline: readSystem("pipeline.json").length, ap: readSystem("ap-queue.json").length, vendors: readSystem("vendors.json").length },
    runs,
  });
}
