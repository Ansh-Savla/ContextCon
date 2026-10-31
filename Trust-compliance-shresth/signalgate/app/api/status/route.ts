import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/server/paths";
import { accountCredits } from "@/lib/server/crustdata";
import { ledger } from "@/lib/server/budget";
import { llmLabel } from "@/lib/server/llm";
import { config } from "@/lib/server/config";
import { tavilyEnabled } from "@/lib/server/tavily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dir = path.join(DATA_DIR, "runs");
  let runs: Array<{ id: string; name: string; requester: string; decision: string; code: string; at: string }> = [];
  try {
    runs = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort().reverse().slice(0, 12).map(f => {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { id: r.id, name: r.profile?.name ?? r.intake?.company?.value ?? "Unresolved", requester: r.intake?.requester, decision: r.decisions?.[0]?.label ?? "", code: r.decisions?.[0]?.code ?? "", at: r.createdAt };
    });
  } catch { /* none yet */ }
  let inbox = 0;
  try { inbox = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "systems", "inbox.json"), "utf8")).length; } catch { /* empty */ }
  return Response.json({ credits: await accountCredits(), ledger: ledger(), brain: llmLabel(), tavily: tavilyEnabled(), budget: { perRun: config.budget.creditsPerRun, total: config.budget.creditsTotal }, runs, inbox });
}
