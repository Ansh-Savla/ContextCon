"use client";

/* Ported from the team's Sightline app into SignalGate's design system:
   Experimental score · Founders & leadership (+ founder profile drawer) · Company finance & stats · Company research. */
import { useState } from "react";
import { Briefcase, ExternalLink, FlaskConical, GraduationCap, Loader2, Newspaper, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CaseResult, Person } from "@/lib/types";
import { CrustChip, PersonAvatar, SourceChip, Stat, StatusBadge } from "./primitives";

const fmtUsd = (n?: number | null) => (n === undefined || n === null ? "—" : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
const FLAG: Record<string, string> = { high: "border-bad/25 bg-bad-bg text-bad", med: "border-warn/30 bg-warn-bg text-warn", low: "border-idle/25 bg-idle-bg text-idle" };

export function ScoreCard({ c }: { c: CaseResult }) {
  const s = c.score;
  if (!s) return null;
  const tone = s.overall === null ? "text-idle" : s.overall >= 70 ? "text-ok" : s.overall >= 55 ? "text-primary" : s.overall >= 40 ? "text-warn" : "text-bad";
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2"><FlaskConical className="size-4 text-primary" />Experimental score</CardTitle><CardDescription>Rule-based heuristic for ranking — not investment advice; never used in the decision</CardDescription></div>
        <Badge variant="outline" className="shrink-0">beta</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2"><span className={cn("text-4xl font-semibold tabular-nums", tone)}>{s.overall ?? "—"}</span>{s.overall !== null && <span className="text-sm text-muted-foreground">/100</span>}<span className={cn("text-sm font-medium", tone)}>{s.label}</span></div>
        {s.dims.map(d => (
          <div key={d.key}>
            <div className="flex justify-between text-sm"><span>{d.label}</span><span className="tabular-nums text-muted-foreground">{d.v}/5</span></div>
            <Progress value={d.v * 20} className="mt-1 h-1.5" />
            <div className="mt-0.5 text-xs text-muted-foreground">{d.why}</div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2 text-xs"><span>Data confidence (separate)</span><span className="font-medium tabular-nums">{s.confidence.v}/5 · {s.confidence.why}</span></div>
        <p className="text-xs text-muted-foreground">{s.reason}</p>
      </CardContent>
    </Card>
  );
}

export function FoundersLeadership({ c }: { c: CaseResult }) {
  const [sel, setSel] = useState<Person | null>(null);
  const people = [...c.people].sort((a, b) => Number(!!b.isFounder) - Number(!!a.isFounder));
  if (!people.length) return <p className="text-sm text-muted-foreground">No founders or leadership on record — the company was not resolved, or CrustData lists no people.</p>;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {people.map(p => (
          <button key={(p.id ?? 0) + p.name} onClick={() => setSel(p)} className="glass lift rounded-xl p-4 text-left focus-visible:outline-2 focus-visible:outline-ring">
            <div className="flex items-start gap-3">
              <PersonAvatar name={p.name} photo={p.photo} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{p.name.replace(/^MasterChef\s+/, "")}</span>{p.isFounder && <Badge variant="secondary" className="text-[10px]">Founder</Badge>}</div>
                <div className="truncate text-sm text-muted-foreground">{p.title ?? "Role not on record"}</div>
                <div className="text-xs text-muted-foreground">{p.since ? `since ${p.since}` : ""}{!p.current && p.until ? ` · left ${p.until}` : ""}</div>
              </div>
              {p.current ? <StatusBadge status="verified" /> : <span className="rounded-md border border-bad/20 bg-bad-bg px-1.5 py-0.5 text-xs font-medium text-bad">Left</span>}
            </div>
            {!!p.flags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{p.flags.map(f => <span key={f.text} className={cn("rounded-md border px-1.5 py-0.5 text-[11px]", FLAG[f.sev])}>{f.text}</span>)}</div>}
            {(p.education?.length || p.pastRoles?.length) ? <div className="mt-2 truncate text-xs text-muted-foreground">{p.education?.[0] ?? p.pastRoles?.[0]}</div> : null}
          </button>
        ))}
      </div>
      <Sheet open={!!sel} onOpenChange={o => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {sel && (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-3"><PersonAvatar name={sel.name} photo={sel.photo} size={64} /><div><SheetTitle>{sel.name.replace(/^MasterChef\s+/, "")}</SheetTitle><SheetDescription>{sel.title ?? "Role not on record"}{sel.since ? ` · since ${sel.since}` : ""}{!sel.current && sel.until ? ` · left ${sel.until}` : ""}</SheetDescription></div></div>
              </SheetHeader>
              <div className="space-y-5 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2"><CrustChip />{sel.id && <span className="font-mono text-xs text-muted-foreground">person #{sel.id}</span>}{sel.profileUrl && <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={sel.profileUrl} target="_blank" rel="noreferrer">Professional profile<ExternalLink className="size-3" /></a>}</div>
                {sel.headline && <p className="text-muted-foreground">{sel.headline}</p>}
                {!!sel.flags?.length && <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</h3><div className="flex flex-wrap gap-1.5">{sel.flags.map(f => <span key={f.text} className={cn("rounded-md border px-1.5 py-0.5 text-xs", FLAG[f.sev])}>{f.text}</span>)}</div></section>}
                <section><h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Briefcase className="size-3" />Career</h3>
                  {sel.pastRoles?.length ? <ol className="relative space-y-2 border-l pl-4">{sel.pastRoles.map(r => <li key={r}><span className="absolute -left-1 mt-1.5 size-2 rounded-full bg-primary" />{r}</li>)}</ol> : sel.priorFounder?.length ? <ul className="space-y-1">{sel.priorFounder.map(r => <li key={r}>{r}</li>)}</ul> : <p className="text-muted-foreground">Not fetched — the planner skipped the founder deep-dive for this case.</p>}
                </section>
                <section><h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><GraduationCap className="size-3" />Education</h3>{sel.education?.length ? <ul className="space-y-1">{sel.education.map(e => <li key={e}>{e}</li>)}</ul> : <p className="text-muted-foreground">Not on record.</p>}</section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function FinancePanel({ c }: { c: CaseResult }) {
  const f = c.finance;
  if (!f) return <p className="text-sm text-muted-foreground">Financial context needs a resolved company.</p>;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{f.stats.map(s => <Stat key={s.label} label={s.label} value={s.value} hint={s.hint} />)}</div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Recorded funding rounds</CardTitle><CardDescription>From the CrustData funding record — a missing round is not proof none happened</CardDescription></div><CrustChip /></CardHeader>
        <CardContent>
          {f.rounds.length ? (
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Round</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Investors</TableHead></TableRow></TableHeader>
              <TableBody>{f.rounds.map((r, i) => <TableRow key={i}><TableCell className="font-mono text-xs">{String(r.date ?? "").slice(0, 10) || "—"}</TableCell><TableCell className="capitalize">{String(r.round ?? "—").replace(/_/g, " ")}</TableCell><TableCell className="text-right tabular-nums">{fmtUsd(r.amountUsd)}</TableCell><TableCell className="whitespace-normal text-muted-foreground">{r.investors ?? "—"}</TableCell></TableRow>)}</TableBody></Table>
          ) : <p className="text-sm text-muted-foreground">No rounds on record.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

type Research = { ok: boolean; message?: string; sections: Array<{ key: string; label: string; items: Array<{ title: string; url: string; snippet: string; date?: string; host: string }>; note?: string }>; figures: Array<{ metric: string; quote: string; url: string; host: string }> };

export function ResearchPanel({ c }: { c: CaseResult }) {
  const [r, setR] = useState<Research | null>(null);
  const [busy, setBusy] = useState(false);
  const name = c.profile?.name ?? c.intake.company?.value;
  async function go() {
    if (!name) return;
    setBusy(true);
    try { const res = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, category: c.profile?.industry ?? "", domain: c.profile?.domain ?? "" }) }); setR(await res.json()); }
    catch (e) { setR({ ok: false, message: (e as Error).message, sections: [], figures: [] }); }
    finally { setBusy(false); }
  }
  if (!r) return (
    <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
      <Search className="size-6 text-primary" />
      <div><div className="font-medium">Company research</div><p className="max-w-md text-sm text-muted-foreground">Overview, news, funding & revenue, market and competitors from the web (Tavily), plus figures quoted from press coverage of filings. Sources that don&apos;t mention the company are dropped. Context only — it never changes the decision.</p></div>
      <Button onClick={go} disabled={busy || !name} className="gap-2">{busy ? <><Loader2 className="size-4 animate-spin" />Researching…</> : <>Run company research</>}</Button>
    </CardContent></Card>
  );
  if (!r.ok) return <Card><CardContent className="py-6 text-sm text-muted-foreground">{r.message ?? "Research unavailable."}</CardContent></Card>;
  return (
    <div className="grid gap-4">
      {r.figures.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Reported figures (press)</CardTitle><CardDescription>Quoted sentence by sentence from articles naming the company — verify against filings</CardDescription></div><SourceChip provider="Tavily" /></CardHeader>
          <CardContent className="grid gap-2">{r.figures.map(f => <div key={f.quote} className="rounded-lg border p-3 text-sm"><Badge variant="secondary" className="mb-1">{f.metric}</Badge><p>“{f.quote}”</p><a href={f.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">{f.host}<ExternalLink className="size-3" /></a></div>)}</CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {r.sections.map(s => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Newspaper className="size-4 text-primary" />{s.label}</CardTitle>{s.note && <CardDescription>{s.note}</CardDescription>}</div><SourceChip provider="Tavily" /></CardHeader>
            <CardContent className="grid gap-2.5">
              {s.items.length ? s.items.map(i => (
                <a key={i.url} href={i.url} target="_blank" rel="noreferrer" className="block rounded-lg border p-3 transition hover:bg-accent/50">
                  <div className="text-sm font-medium leading-snug">{i.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{i.snippet}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{i.host}{i.date ? ` · ${String(i.date).slice(0, 16)}` : ""}</div>
                </a>
              )) : <p className="text-sm text-muted-foreground">No sources about this company in this section.</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
