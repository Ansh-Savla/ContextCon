/**
 * Case Clerk's systems of record. LOCAL and SIMULATED: JSON files under data/systems/. Nothing is ever sent outside.
 */
import fs from "node:fs";
import path from "node:path";
import type { LocalAction } from "./types";

const DIR = path.join(process.cwd(), "data", "systems");

function append(file: string, record: Record<string, unknown>) {
  fs.mkdirSync(DIR, { recursive: true });
  const f = path.join(DIR, file);
  let rows: unknown[] = [];
  try { rows = JSON.parse(fs.readFileSync(f, "utf8")); } catch { /* new file */ }
  rows.push(record);
  fs.writeFileSync(f, JSON.stringify(rows, null, 2));
  return rows.length;
}

export function writeAction(system: string, file: string, record: Record<string, unknown>, summary: string): LocalAction {
  const n = append(file, { ...record, simulated: true, at: new Date().toISOString() });
  return { system, file: `data/systems/${file}`, record: { ...record, row: n }, summary };
}

export function readSystem(file: string): unknown[] {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")); } catch { return []; }
}
