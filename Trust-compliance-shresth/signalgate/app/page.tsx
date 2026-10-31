"use client";

import { useEffect, useState } from "react";
import { Coins, Cpu, History, Inbox, Landmark, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CaseResult, TraceEvent } from "@/lib/types";
import { Composer } from "@/components/desk/composer";
import { CaseView } from "@/components/desk/case-view";
import { LiveFeed, StageRail } from "@/components/desk/run-progress";
import { DECISION_TONE } from "@/components/desk/primitives";
import { HelpButton } from "@/components/desk/help";
import { ThemeToggle } from "@/components/desk/theme-toggle";

type Status = {
  credits: number | null; brain: string; tavily: boolean;
  ledger: { crustdataCredits: number; llmCalls: number };
  budget: { perRun: number; total: number };
  runs: Array<{ id: string; name: string; requester: string; decision: string; code: string; at: string }>;
  inbox: number;
};

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [replay, setReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
  useEffect(() => { load(); }, []);

  async function run() {
    setRunning(true); setEvents([]); setResult(null); setError(null); setReplay(false);
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok || !res.body) { setError((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) { if (!l.trim()) continue; const m = JSON.parse(l); if (m.type === "event") setEvents(e => [...e, m.event]); if (m.type === "case") setResult(m.case); if (m.type === "error") setError(m.message); }
      }
    } catch (e) { setError((e as Error).message); } finally { setRunning(false); load(); }
  }

  async function openRun(id: string) {
    const r = await fetch(`/api/runs/${id}`); if (!r.ok) return;
    const raw = await r.json(); const c: CaseResult = { ...raw, events: raw.events ?? [], pressImages: raw.pressImages ?? [], people: raw.people ?? [] }; setResult(c); setEvents(c.trace); setText(c.intake.raw); setReplay(true); setError(null);
  }
  const reset = () => { setResult(null); setEvents([]); setError(null); setReplay(false); };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-sidebar/70 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="size-4.5" /></div>
          <div><div className="font-semibold tracking-tight">SignalGate</div><div className="text-xs text-muted-foreground">Diligence desk · on CrustData</div></div>
        </div>
        <div className="px-3"><Button className="w-full justify-start gap-2" variant={result || running ? "outline" : "default"} onClick={reset} disabled={running}><Plus className="size-4" />New case</Button></div>
        <nav className="mt-5 flex-1 overflow-y-auto px-3">
          <div className="mb-1.5 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground"><History className="size-3.5" />Recent cases</div>
          <ul className="space-y-0.5">
            {status?.runs.length ? status.runs.map(r => {
              const t = DECISION_TONE[r.code as keyof typeof DECISION_TONE] ?? DECISION_TONE.insufficient;
              return (
                <li key={r.id}>
                  <button onClick={() => openRun(r.id)} disabled={running} className={cn("w-full rounded-lg px-2 py-2 text-left transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", result?.id === r.id && "bg-accent")}>
                    <div className="flex items-center gap-2 text-sm font-medium">{r.requester === "lender" ? <Landmark className="size-3.5 shrink-0 text-muted-foreground" /> : <TrendingUp className="size-3.5 shrink-0 text-muted-foreground" />}<span className="truncate">{r.name.replace(/[®©™]/g, "").trim()}</span></div>
                    <div className={cn("mt-0.5 flex items-center gap-1 truncate pl-5.5 text-xs", t.cls)}><t.Icon className="size-3 shrink-0" />{r.decision}</div>
                  </button>
                </li>
              );
            }) : <li className="px-2 text-xs text-muted-foreground">No cases yet.</li>}
          </ul>
        </nav>
        <div className="flex items-center justify-between gap-2 px-3 pb-2"><HelpButton variant="outline" /><ThemeToggle /></div>
        <div className="space-y-2 border-t p-4 text-xs">
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><Inbox className="size-3.5" />Exceptions inbox</span><span className="font-medium tabular-nums">{status?.inbox ?? 0}</span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><Coins className="size-3.5" />Credits used / cap</span><span className="font-medium tabular-nums">{status ? Math.round(status.ledger.crustdataCredits) : "—"} / {status?.budget.total ?? "—"}</span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted-foreground"><Coins className="size-3.5" />Account balance</span><span className="font-medium tabular-nums">{status?.credits?.toLocaleString() ?? "—"}</span></div>
          <div className="flex items-start justify-between gap-2"><span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="size-3.5" />Brain</span><span className="text-right font-mono text-[11px] leading-tight text-muted-foreground">{status?.brain.replace(/ → /g, " › ")}{status?.tavily ? " · Tavily" : ""}</span></div>
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 overflow-y-auto">
        {error && <div className="mx-auto mt-6 max-w-4xl rounded-lg border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad" role="alert">The run stopped: {error}</div>}
        {!result && !running && <Composer text={text} setText={setText} onRun={run} running={running} picked={picked} setPicked={setPicked} />}
        {running && !result && (
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[320px_1fr]">
            <Card><CardHeader><CardTitle>Working the case</CardTitle><CardDescription>Eight steps from request to finished work</CardDescription></CardHeader><CardContent className="px-3"><StageRail events={events} running /></CardContent></Card>
            <Card><CardHeader><CardTitle>Live activity</CardTitle><CardDescription>What each agent is doing right now</CardDescription></CardHeader><CardContent><LiveFeed events={events} /></CardContent></Card>
          </div>
        )}
        {result && <CaseView c={result} replay={replay} />}
      </main>
    </div>
  );
}
