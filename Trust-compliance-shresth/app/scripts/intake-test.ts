import fs from "node:fs";
import { parseRules } from "../lib/intake";
const md = fs.readFileSync("../EXAMPLES.md", "utf8");
const blocks = [...md.matchAll(/## (E\d)[^\n]*\n[\s\S]*?```text\n([\s\S]*?)```/g)];
for (const [, id, text] of blocks) {
  const r = parseRules(text);
  console.log(`${id} lens=${r.lenses} co=${r.company?.value} dom=${r.domain?.value} sender=${r.senderDomain?.value} people=${r.people.map(p => p.name + (p.role ? "(" + p.role + ")" : "")).join("|")} asks=${r.asks}`);
  console.log("   claims:", r.claims.map(c => c.kind + ":" + c.text).join(" ; "), r.thesis ? " thesis=" + JSON.stringify({ s: r.thesis.sectors, g: r.thesis.geos, max: r.thesis.maxStaff, fb: r.thesis.foundedBefore, hb: r.thesis.minHeartbeat }) : "");
}
