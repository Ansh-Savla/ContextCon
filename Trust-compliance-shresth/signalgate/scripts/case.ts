/** CLI: npm run case -- <example-id | "free text"> */
import { runDesk } from "../lib/server/desk";
import { EXAMPLES } from "../lib/examples";
const arg = process.argv.slice(2).join(" ").trim();
const text = EXAMPLES.find(e => e.id === arg)?.text ?? arg;
if (!text) { console.error("usage: npm run case -- " + EXAMPLES.map(e => e.id).join(" | ")); process.exit(1); }
runDesk(text, e => console.log(`${(e.t / 1000).toFixed(1).padStart(5)}s [${e.stage}] ${e.agent}${e.brain ? "/" + e.brain : ""} ${e.status} — ${e.step}${e.detail ? ": " + e.detail : ""}`)).then(r => {
  console.log("\n==", r.id, r.profile?.name ?? r.intake.company?.value, "·", r.intake.requester);
  for (const d of r.decisions) console.log(`DECISION ${d.track}: ${d.label}`);
  for (const c of r.checks) console.log(` ${c.status.padEnd(12)} [${c.section}] ${c.title}: ${c.observed}  (${c.rule}${c.material ? ", material" : ""})`);
  if (r.credit) console.log("CREDIT", r.credit.grade, JSON.stringify(r.credit.indicativeExposure), JSON.stringify(r.credit.requested), r.credit.policy.join("; "));
  if (r.investment) console.log("FIT", r.investment.fit.map(f => `${f.criterion}:${f.result}`).join(" "), "| competitors", r.investment.competitors.join(","));
  console.log("PEOPLE", r.people.map(p => `${p.name} (${p.title}${p.current ? "" : ", left " + p.until})${p.priorFounder?.length ? " prior:" + p.priorFounder.length : ""}`).join("; "));
  console.log("CONDITIONS\n - " + r.conditions.join("\n - "));
  console.log("MEMO (" + r.memoBy + "):", r.memo);
  console.log("ACTIONS:", r.actions.map(a => a.summary).join(" | "));
  console.log("SPEND", JSON.stringify(r.spend));
});
