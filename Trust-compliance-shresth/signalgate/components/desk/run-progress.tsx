"use client";

import { Building2, CheckCircle2, FileCheck2, Loader2, Radar, Scale, ScanSearch, Search, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stage, TraceEvent } from "@/lib/types";

export const STAGES: Array<{ id: Stage; label: string; desc: string; Icon: typeof Search }> = [
  { id: "intake", label: "Understand request", desc: "Who is asking, about whom, what is claimed", Icon: ScanSearch },
  { id: "resolve", label: "Resolve identity", desc: "CrustData identity graph", Icon: Search },
  { id: "profile", label: "Company profile & KYB", desc: "Ownership, scale, substance", Icon: Building2 },
  { id: "people", label: "People", desc: "Founders, officers, senders", Icon: Users },
  { id: "screening", label: "Screening", desc: "Adverse media, fraud patterns", Icon: Radar },
  { id: "analysis", label: "Investment / credit case", desc: "Activity, fit, readiness", Icon: Workflow },
  { id: "decision", label: "Decision", desc: "Rules, with cited evidence", Icon: Scale },
  { id: "actions", label: "Complete the work", desc: "Memo, files, holds", Icon: FileCheck2 },
];

export function StageRail({ events, running, compact }: { events: TraceEvent[]; running: boolean; compact?: boolean }) {
  const reached = new Set(events.map(e => e.stage).filter(Boolean) as Stage[]);
  const current = [...events].reverse().find(e => e.stage)?.stage;
  return (
    <ol className={cn("grid gap-1", compact ? "grid-cols-8" : "")}>
      {STAGES.map((s, i) => {
        const idx = STAGES.findIndex(x => x.id === current);
        const done = reached.has(s.id) && (!running || i < idx);
        const active = running && s.id === current;
        return compact ? (
          <li key={s.id} className="flex flex-col gap-1" title={s.label}>
            <div className={cn("h-1.5 rounded-full", done ? "bg-primary" : active ? "bg-primary/50 animate-pulse" : "bg-border")} />
            <span className={cn("truncate text-[11px]", done || active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          </li>
        ) : (
          <li key={s.id} className={cn("flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors", active && "bg-accent")}>
            <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border", done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "text-muted-foreground")}>
              {done ? <CheckCircle2 className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : <s.Icon className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <div className={cn("text-sm font-medium", !done && !active && "text-muted-foreground")}>{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const AGENT: Record<string, string> = { intake: "Intake", investigator: "Investigator", screening: "Screening", analyst: "Analyst", verifier: "Decision rules", clerk: "Case clerk", system: "Desk" };

export function LiveFeed({ events }: { events: TraceEvent[] }) {
  const shown = events.filter(e => e.agent !== "system" || e.step !== "Done").slice(-14);
  return (
    <ul className="space-y-2 text-sm" aria-live="polite">
      {shown.map((e, i) => (
        <li key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums pt-0.5">{(e.t / 1000).toFixed(1)}s</span>
          <div className="min-w-0">
            <span className="font-medium">{AGENT[e.agent] ?? e.agent}</span>
            {e.brain && e.brain !== "rules" && <span className="ml-1.5 rounded bg-secondary px-1.5 py-px font-mono text-[11px] text-muted-foreground">{e.brain}</span>}
            <span className="text-muted-foreground"> · {e.step}</span>
            {e.detail && <div className={cn("truncate text-xs", e.status === "fallback" ? "text-warn" : e.status === "failed" ? "text-bad" : e.status === "skipped" ? "text-idle" : "text-muted-foreground")}>{e.detail}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
