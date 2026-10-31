"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, Building2, ClipboardCheck, Download, ExternalLink, FileText, Globe, Landmark, Radar, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CaseResult, Check, Evidence, Section } from "@/lib/types";
import { CompanyAvatar, CrustChip, DECISION_TONE, DecisionPill, PersonAvatar, PulseLine, SourceChip, Stat, StatusBadge, fmtTime } from "./primitives";
import { BarList, PeerBars, RevenueBand, TrendChart } from "./charts";
import { Timeline } from "./timeline";
import { HelpButton } from "./help";

const SECTION: Record<Section, { label: string; Icon: typeof Building2 }> = {
  kyb: { label: "Entity & KYB", Icon: Building2 }, people: { label: "People", Icon: Users }, fraud: { label: "Payment fraud", Icon: AlertTriangle },
  screening: { label: "Screening", Icon: Radar }, investment: { label: "Investment claims", Icon: TrendingUp }, credit: { label: "Credit", Icon: Landmark },
};
const ORDER = { contradicted: 0, review: 1, unverified: 2, verified: 3, not_run: 4, info: 5 } as const;

function download(name: string, text: string, type: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
}
function toMarkdown(c: CaseResult) {
  const L = [`# ${c.profile?.name ?? c.intake.company?.value} — ${c.decisions[0].label}`, "", ...c.decisions.map(d => `- **${d.track}**: ${d.label}`), "", "## Memo", c.memo, "", "## Conditions", ...c.conditions.map(x => `- ${x}`), "", "## Checks", "| Section | Check | Observed | Status | Sources |", "|---|---|---|---|---|", ...c.checks.map(k => `| ${k.section} | ${k.title} | ${k.observed.replace(/\|/g, "/")} | ${k.status} | ${k.evidenceIds.join(", ")} |`), "", "## Sources", ...c.evidence.map(e => `- ${e.id} · ${e.provider ?? e.kind} ${e.endpoint ?? ""} ${e.recordId ?? ""} ${e.url ?? ""} ${e.note ?? ""} · ${e.retrievedAt}`), "", `Actions (simulated, local): ${c.actions.map(a => a.summary).join("; ")}`];
  return L.join("\n");
}

export function CaseView({ c, replay }: { c: CaseResult; replay: boolean }) {
  const [sheet, setSheet] = useState<{ check?: Check; evId?: string } | null>(null);
  const evById = useMemo(() => new Map(c.evidence.map(e => [e.id, e] as const)), [c]);
  const investor = c.intake.requester === "investor";
  const primary = c.decisions[0];
  const compliance = c.decisions.find(d => d.track === "compliance");
  const counts = c.checks.reduce((a, k) => { a[k.status] = (a[k.status] ?? 0) + 1; return a; }, {} as Record<string, number>);
  const sorted = [...c.checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const top = sorted.filter(k => k.status === "contradicted" || k.status === "review").slice(0, 5);
  const bySection = (secs: Section[]) => sorted.filter(k => secs.includes(k.section));
  const open = (check?: Check, evId?: string) => setSheet({ check, evId });
  const tone = DECISION_TONE[primary.code];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      {/* header */}
      <div className="flex flex-wrap items-start gap-4">
        <CompanyAvatar name={c.profile?.name ?? c.intake.company?.value} logo={c.profile?.logo} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.profile?.name?.replace(/[®©™]/g, "").trim() ?? c.intake.company?.value ?? "Unresolved company"}</h1>
            <Badge variant="outline" className="gap-1">{investor ? <TrendingUp className="size-3" /> : <Landmark className="size-3" />}{investor ? "Investor diligence" : "Lender KYB & credit"}</Badge>
            {c.intake.synthetic && <Badge className="bg-foreground text-background">Synthetic input</Badge>}
            {replay ? <Badge variant="secondary">Replay · 0 credits</Badge> : <Badge variant="secondary" className="text-ok">Live run</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {c.profile?.domain && <a className="inline-flex items-center gap-1 hover:text-foreground" href={`https://${c.profile.domain}`} target="_blank" rel="noreferrer"><Globe className="size-3.5" />{c.profile.domain}</a>}
            {c.profile?.hq && <span>{c.profile.hq}</span>}
            {c.profile?.founded && <span>Founded {c.profile.founded}</span>}
            {c.identity.company && <span className="font-mono text-xs">CrustData #{c.identity.company.id}</span>}
            <span className="font-mono text-xs">{c.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <HelpButton variant="outline" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => download(`${c.id}-memo.md`, toMarkdown(c), "text/markdown")}><FileText className="size-4" />Memo</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => download(`${c.id}.json`, JSON.stringify(c, null, 2), "application/json")}><Download className="size-4" />JSON</Button>
        </div>
      </div>

      <Provenance c={c} />

      {/* decisions */}
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className={cn("rounded-xl border p-5", tone.ring)}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{investor ? "Investment decision" : "Credit decision"}</div>
          <div className={cn("mt-1.5 flex items-center gap-2 text-2xl font-semibold tracking-tight", tone.cls)}><tone.Icon className="size-6" />{primary.label}</div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {primary.reasons.slice(0, 4).map(r => <li key={r} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />{r}</li>)}
          </ul>
          {sorted.some(k => k.status === "verified") && (
            <div className="mt-4 border-t border-foreground/10 pt-3">
              <div className="text-xs font-medium text-muted-foreground">Verified against CrustData</div>
              <div className="mt-2 flex flex-wrap gap-1.5">{sorted.filter(k => k.status === "verified").slice(0, 6).map(k => <button key={k.id} onClick={() => open(k)} className="inline-flex items-center gap-1 rounded-md border border-ok/20 bg-card/70 px-2 py-1 text-xs hover:border-ok/50"><span className="text-ok">✓</span>{k.title}</button>)}</div>
            </div>
          )}
        </div>
        <div className="grid gap-4">
          {compliance && (
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Compliance clearance</div>
              <div className="mt-2"><DecisionPill d={compliance} /></div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{compliance.reasons[0]}</p>
            </div>
          )}
          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed by the case clerk</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {c.actions.map(a => <li key={a.summary} className="flex items-start gap-2"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>{a.summary} <span className="whitespace-nowrap text-xs text-muted-foreground">· simulated, local</span></span></li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Identity" value={c.identity.status === "resolved" ? "Resolved" : c.identity.status === "ambiguous" ? "Ambiguous" : "Not found"} tone={c.identity.status === "resolved" ? "ok" : "warn"} hint={c.identity.method ? `via ${c.identity.method}` : `${c.identity.candidates.length} candidates`} />
        <Stat label="Checks" value={<span>{counts.verified ?? 0}<span className="text-base text-muted-foreground"> verified</span></span>} hint={<span><span className="text-bad">{counts.contradicted ?? 0} contradicted</span> · <span className="text-warn">{counts.review ?? 0} review</span> · {(counts.unverified ?? 0) + (counts.not_run ?? 0)} open</span>} />
        <Stat label="Company activity" value={c.heartbeat ? (c.heartbeat.score ?? "—") : "—"} hint={c.heartbeat ? `${c.heartbeat.band} · ${Math.round(c.heartbeat.coverage * 100)}% coverage` : "not computed"}>{c.heartbeat && <PulseLine score={c.heartbeat.score} className="mt-1 h-8" />}</Stat>
        {investor
          ? <Stat label="Thesis fit" value={c.investment?.fit.length ? `${c.investment.fit.filter(f => f.result === "pass").length}/${c.investment.fit.length}` : "—"} hint={c.investment?.fit.length ? "criteria met" : "no thesis given"} tone={c.investment?.fit.some(f => f.result === "fail") ? "warn" : "ok"} />
          : <Stat label="Credit readiness" value={c.credit?.grade ?? "—"} tone={c.credit?.grade === "A" || c.credit?.grade === "B" ? "ok" : c.credit?.grade === "C" ? "warn" : "bad"} hint={c.credit?.indicativeExposure ? `indicative cap ${fmtUsd(c.credit.indicativeExposure.amount)}` : "no exposure basis"} />}
      </div>

      {/* tabs */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & KYB <span className="ml-1 text-xs text-muted-foreground">{bySection(["kyb", "people", "fraud", "screening"]).length}</span></TabsTrigger>
          <TabsTrigger value="case">{investor ? "Investment case" : "Credit case"}</TabsTrigger>
          <TabsTrigger value="story">Story <span className="ml-1 text-xs text-muted-foreground">{c.events.length}</span></TabsTrigger>
          <TabsTrigger value="people">People <span className="ml-1 text-xs text-muted-foreground">{c.people.length}</span></TabsTrigger>
          <TabsTrigger value="sources">Sources <span className="ml-1 text-xs text-muted-foreground">{c.evidence.length}</span></TabsTrigger>
          <TabsTrigger value="trace">Agent trace</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="grid gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4 text-primary" />{investor ? "Investment committee memo" : "Credit committee memo"}</CardTitle><CardDescription>{c.memoBy === "rules template" ? "Written from rule templates" : `Drafted by ${c.memoBy} from cited checks only`} · sources in brackets</CardDescription></CardHeader>
              <CardContent><p className="text-[15px] leading-7">{linkify(c.memo, id => open(undefined, id))}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>What needs attention</CardTitle><CardDescription>Contradicted and review items — select one for its sources</CardDescription></CardHeader>
              <CardContent className="grid gap-2">
                {top.length ? top.map(k => (
                  <button key={k.id} onClick={() => open(k)} className="flex items-start gap-3 rounded-lg border p-3 text-left transition hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring">
                    <StatusBadge status={k.status} className="mt-0.5" />
                    <div className="min-w-0"><div className="text-sm font-medium">{k.title}</div><div className="text-sm text-muted-foreground">{k.reason}</div></div>
                    <ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                  </button>
                )) : <p className="text-sm text-muted-foreground">Nothing contradicted or flagged for review in the evidence checked.</p>}
              </CardContent>
            </Card>
          </div>
          <div className="grid content-start gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Conditions before money moves</CardTitle></CardHeader>
              <CardContent>{c.conditions.length ? <ol className="list-decimal space-y-2 pl-5 text-sm">{c.conditions.map(x => <li key={x}>{x}</li>)}</ol> : <p className="text-sm text-muted-foreground">None beyond standard documentation.</p>}</CardContent>
            </Card>
            {c.heartbeat && <HeartbeatCard c={c} open={id => open(undefined, id)} />}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4 grid gap-4">
          {(["kyb", "people", "fraud", "screening"] as Section[]).map(s => bySection([s]).length ? <ChecksCard key={s} title={SECTION[s].label} Icon={SECTION[s].Icon} checks={bySection([s])} open={open} evidence={c.evidence} /> : null)}
        </TabsContent>

        <TabsContent value="case" className="mt-4 grid gap-4">
          {investor ? <InvestmentPanel c={c} open={open} /> : <CreditPanel c={c} open={open} />}
        </TabsContent>

        <TabsContent value="story" className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Company timeline</CardTitle><CardDescription>Every dated fact we hold — founding, rounds, people joining and leaving, acquisition, coverage</CardDescription></CardHeader>
            <CardContent><Timeline events={c.events} /></CardContent>
          </Card>
          <div className="grid content-start gap-4">
            {c.pressImages.length > 0 && (
              <Card>
                <CardHeader><CardTitle>In the press</CardTitle><CardDescription>Images found by web search (Tavily) for this company&apos;s coverage — for context only, linked to source</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {c.pressImages.slice(0, 4).map(im => (
                    <a key={im.url} href={im.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt={im.caption ?? "Press image"} referrerPolicy="no-referrer" className="aspect-video w-full object-cover transition group-hover:scale-[1.02]" onError={e => { (e.target as HTMLImageElement).closest("a")!.style.display = "none"; }} />
                      <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1.5 py-px text-[10px] text-muted-foreground">{im.source}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
            {c.parent && <ParentCard c={c} />}
            {c.monitoring && c.monitoring.status !== "not_applicable" && <MonitoringCard c={c} />}
          </div>
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          {c.people.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {c.people.map(p => (
                <Card key={(p.id ?? p.name) + p.name} className="gap-3">
                  <CardHeader className="flex-row items-start gap-3">
                    <PersonAvatar name={p.name} photo={p.photo} size={44} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{p.name.replace(/^MasterChef\s+/, "")}</CardTitle>
                      <CardDescription>{p.title ?? "Role not on record"}{p.since ? ` · since ${p.since}` : ""}</CardDescription>
                    </div>
                    {p.current ? <StatusBadge status="verified" /> : <span className="rounded-md border border-bad/20 bg-bad-bg px-1.5 py-0.5 text-xs font-medium text-bad">Left {p.until}</span>}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {p.headline && <p className="text-muted-foreground line-clamp-2">{p.headline}</p>}
                    {p.priorFounder?.length ? <div><span className="text-xs font-medium text-muted-foreground">Prior founder / CEO roles</span><ul className="mt-1 space-y-0.5">{p.priorFounder.map(x => <li key={x}>{x}</li>)}</ul></div> : null}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">{p.id && <span className="font-mono">person #{p.id}</span>}{p.profileUrl && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={p.profileUrl} target="_blank" rel="noreferrer">Profile<ExternalLink className="size-3" /></a>}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No people on record — the company was not resolved.</p>}
        </TabsContent>

        <TabsContent value="sources" className="mt-4 grid gap-4">
          <CrustDataUsed c={c} />
          <Card className="py-2">
            <Table>
              <TableHeader><TableRow><TableHead className="w-16">ID</TableHead><TableHead>Source</TableHead><TableHead>Record / query</TableHead><TableHead className="w-28 text-right">Retrieved</TableHead></TableRow></TableHeader>
              <TableBody>
                {c.evidence.map(e => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => open(undefined, e.id)}>
                    <TableCell className="font-mono text-xs">{e.id}</TableCell>
                    <TableCell><SourceChip provider={e.provider} /><div className="mt-1 font-mono text-xs text-muted-foreground">{e.endpoint}</div></TableCell>
                    <TableCell className="max-w-[520px] whitespace-normal text-sm">{e.note ?? e.fieldPath}{e.recordId ? <span className="ml-1 font-mono text-xs text-muted-foreground">#{String(e.recordId)}</span> : null}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmtTime(e.retrievedAt)}{e.cached ? " · cache" : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="trace" className="mt-4">
          <TraceCard c={c} />
        </TabsContent>
      </Tabs>

      <Sheet open={!!sheet} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {sheet && <SourceDetail check={sheet.check} evId={sheet.evId} evById={evById} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const fmtUsd = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);

function linkify(text: string, onSrc: (id: string) => void) {
  return text.split(/(\[S\d+(?:,\s*S\d+)*\])/g).map((part, i) => {
    const m = part.match(/^\[(S\d+(?:,\s*S\d+)*)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    return <span key={i} className="whitespace-nowrap">{m[1].split(/,\s*/).map(id => <button key={id} onClick={() => onSrc(id)} className="mx-0.5 rounded bg-accent px-1 font-mono text-[11px] text-accent-foreground hover:bg-primary hover:text-primary-foreground">{id}</button>)}</span>;
  });
}

function ChecksCard({ title, Icon, checks, open, evidence }: { title: string; Icon: typeof Building2; checks: Check[]; open: (c: Check) => void; evidence?: Evidence[] }) {
  const prov = (k: Check) => [...new Set(k.evidenceIds.map(id => evidence?.find(e => e.id === id)?.provider).filter(Boolean))] as string[];
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="pb-1"><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-primary" />{title}</CardTitle></CardHeader>
      <Table>
        <TableHeader><TableRow><TableHead className="w-[22%] pl-6">Check</TableHead><TableHead className="w-[18%]">Submitted</TableHead><TableHead>Observed</TableHead><TableHead className="w-32">Status</TableHead><TableHead className="w-24 pr-6">Sources</TableHead></TableRow></TableHeader>
        <TableBody>
          {checks.map(k => (
            <TableRow key={k.id} className={cn("cursor-pointer align-top", k.status === "contradicted" && "bg-bad-bg/40")} onClick={() => open(k)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter") open(k); }}>
              <TableCell className="whitespace-normal pl-6 font-medium">{k.title}<div className="font-mono text-[11px] font-normal text-muted-foreground">{k.rule}</div></TableCell>
              <TableCell className="whitespace-normal text-sm">{k.submitted ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="whitespace-normal text-sm">{k.observed}<div className="mt-0.5 text-xs text-muted-foreground">{k.reason}</div></TableCell>
              <TableCell><StatusBadge status={k.status} /></TableCell>
              <TableCell className="pr-6"><div className="flex flex-wrap gap-1">{prov(k).map(p => <SourceChip key={p} provider={p} />)}</div><div className="mt-1 font-mono text-[11px] text-primary">{k.evidenceIds.join(" ") || <span className="text-muted-foreground">—</span>}</div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function HeartbeatCard({ c, open }: { c: CaseResult; open: (id: string) => void }) {
  const h = c.heartbeat!;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4 text-primary" />Company activity</CardTitle><CardDescription>Heartbeat · observed activity, not a fraud or legitimacy signal</CardDescription></CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2"><span className="text-4xl font-semibold tabular-nums">{h.score ?? "—"}</span><span className="text-sm text-muted-foreground">{h.band} · {Math.round(h.coverage * 100)}% coverage{h.asOf ? ` · to ${h.asOf}` : ""}</span></div>
        <PulseLine score={h.score} className="my-2" />
        <div className="space-y-2.5">
          {h.components.map(x => (
            <div key={x.name} className={cn(x.score === undefined && "opacity-60")}>
              <div className="flex items-center justify-between text-sm"><span>{x.name} <span className="text-xs text-muted-foreground">w{x.weight}</span></span><span className="tabular-nums">{x.score ?? "n/a"}</span></div>
              <Progress value={x.score ?? 0} className="mt-1 h-1.5" />
              <div className="mt-0.5 text-xs text-muted-foreground">{x.value ?? `Not counted — ${x.missingReason}`}{x.note ? ` · ${x.note}` : ""}{x.evidenceIds[0] && <button onClick={() => open(x.evidenceIds[0])} className="ml-1 font-mono text-primary hover:underline">{x.evidenceIds[0]}</button>}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">Weighted mean over components with data. Missing data is left out, never scored as zero.</p>
      </CardContent>
    </Card>
  );
}

function MetricsGrid({ metrics }: { metrics: Array<{ label: string; value: string; hint?: string }> }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{metrics.map(m => <Stat key={m.label} label={m.label} value={m.value} hint={m.hint} />)}</div>;
}

function InvestmentPanel({ c, open }: { c: CaseResult; open: (k?: Check, id?: string) => void }) {
  const inv = c.investment;
  return (
    <>
      {inv && <MetricsGrid metrics={inv.metrics} />}
      <TrendsGrid c={c} credit={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Thesis fit</CardTitle><CardDescription>Kept separate from trust and compliance evidence</CardDescription></CardHeader>
          <CardContent>{inv?.fit.length ? <Table><TableBody>{inv.fit.map(f => <TableRow key={f.criterion}><TableCell className="font-medium">{f.criterion}</TableCell><TableCell className="text-muted-foreground">{f.expected}</TableCell><TableCell className="whitespace-normal">{f.observed}</TableCell><TableCell className="text-right"><StatusBadge status={f.result === "pass" ? "verified" : f.result === "fail" ? "contradicted" : "unverified"} /></TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No thesis in the request.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Funding history</CardTitle><CardDescription>From the CrustData funding record</CardDescription></CardHeader>
          <CardContent>{inv?.funding.length ? <ol className="relative space-y-3 border-l pl-4">{inv.funding.map((f, i) => <li key={i}><span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" /><div className="text-sm font-medium capitalize">{(f.round ?? "round").replace(/_/g, " ")} {f.amountUsd ? `· ${fmtUsd(f.amountUsd)}` : ""}</div><div className="text-xs text-muted-foreground">{String(f.date ?? "").slice(0, 10)}{f.investors ? ` · ${f.investors}` : ""}</div></li>)}</ol> : <p className="text-sm text-muted-foreground">No funding rounds on record (not proof that none happened).</p>}
            {inv?.competitors.length ? <div className="mt-4"><div className="text-xs font-medium text-muted-foreground">Competitors (provider)</div><div className="mt-1.5 flex flex-wrap gap-1.5">{inv.competitors.map(x => <Badge key={x} variant="secondary">{x}</Badge>)}</div></div> : null}
          </CardContent>
        </Card>
      </div>
      {c.checks.some(k => k.section === "investment") && <ChecksCard title="Investment claims" Icon={Sparkles} checks={c.checks.filter(k => k.section === "investment")} open={k => open(k)} evidence={c.evidence} />}
      {c.heartbeat && <HeartbeatCard c={c} open={id => open(undefined, id)} />}
    </>
  );
}

function CreditPanel({ c, open }: { c: CaseResult; open: (k?: Check, id?: string) => void }) {
  const cr = c.credit;
  if (!cr) return <p className="text-sm text-muted-foreground">Credit readiness needs a resolved company.</p>;
  const reqUsd = cr.requested ? (cr.requested.currency === "INR" ? cr.requested.amount / 84 : cr.requested.amount) : undefined;
  const cap = cr.indicativeExposure?.amount;
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Credit readiness</CardTitle><CardDescription>Rule-based grade from public operating signals</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4"><div className={cn("grid size-16 place-items-center rounded-xl border text-3xl font-semibold", cr.grade === "A" || cr.grade === "B" ? "border-ok/30 bg-ok-bg text-ok" : cr.grade === "C" ? "border-warn/30 bg-warn-bg text-warn" : "border-bad/30 bg-bad-bg text-bad")}>{cr.grade}</div>
              <ul className="space-y-1 text-sm">{cr.policy.map(p => <li key={p} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />{p}</li>)}</ul></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requested vs indicative exposure</CardTitle><CardDescription>{cr.indicativeExposure?.basis ?? "No revenue basis to size exposure"}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[{ l: "Requested", v: reqUsd, s: cr.requested ? (cr.requested.currency === "INR" ? `₹${(cr.requested.amount / 1e7).toFixed(2)} Cr ≈ ${fmtUsd(reqUsd!)}` : fmtUsd(cr.requested.amount)) : "not stated" }, { l: "Indicative policy cap", v: cap, s: cap ? fmtUsd(cap) : "—" }].map(row => {
              const max = Math.max(reqUsd ?? 0, cap ?? 0, 1);
              return <div key={row.l}><div className="flex justify-between text-sm"><span>{row.l}</span><span className="font-medium tabular-nums">{row.s}</span></div><div className="mt-1 h-2.5 rounded-full bg-muted"><div className={cn("h-2.5 rounded-full", row.l === "Requested" && cap && (reqUsd ?? 0) > cap ? "bg-bad" : "bg-primary")} style={{ width: `${row.v ? Math.max(3, (row.v / max) * 100) : 0}%` }} /></div></div>;
            })}
            <p className="text-xs text-muted-foreground">Illustrative policy for triage only — not an approved limit. Final sizing needs financial statements.</p>
          </CardContent>
        </Card>
      </div>
      <MetricsGrid metrics={cr.metrics} />
      <TrendsGrid c={c} credit />
      {c.checks.some(k => k.section === "credit") && <ChecksCard title="Credit checks" Icon={Landmark} checks={c.checks.filter(k => k.section === "credit")} open={k => open(k)} evidence={c.evidence} />}
      {c.heartbeat && <HeartbeatCard c={c} open={id => open(undefined, id)} />}
    </>
  );
}

function TraceCard({ c }: { c: CaseResult }) {
  const [details, setDetails] = useState(false);
  const s = c.spend;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Agent trace</CardTitle><CardDescription>{c.trace.length} steps · {s.seconds}s</CardDescription></div><Button variant="ghost" size="sm" onClick={() => setDetails(d => !d)}>{details ? "Hide" : "Show"} API detail</Button></CardHeader>
        <CardContent>
          <ol className="space-y-1.5">
            {c.trace.filter(e => details || e.agent !== "investigator" || e.status !== "ok" || !/^(company_|person_|job_|web_)/.test(e.step)).map((e, i) => (
              <li key={i} className="grid grid-cols-[56px_1fr] gap-3 text-sm">
                <span className="text-right font-mono text-xs text-muted-foreground tabular-nums pt-0.5">{(e.t / 1000).toFixed(1)}s</span>
                <div className={cn("border-l-2 pl-3", e.status === "fallback" ? "border-warn" : e.status === "failed" ? "border-bad" : e.status === "skipped" ? "border-idle" : e.agent === "system" ? "border-primary" : "border-border")}>
                  <span className={cn("font-medium", e.agent === "system" && "text-primary")}>{e.step}</span>{e.brain && e.brain !== "rules" && <span className="ml-1.5 rounded bg-secondary px-1.5 font-mono text-[11px] text-muted-foreground">{e.brain}</span>}
                  {e.detail && (details || e.status !== "ok" || e.agent !== "investigator") && <div className="text-xs text-muted-foreground break-words">{e.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader><CardTitle>Spend & rationing</CardTitle><CardDescription>Caps enforced before every paid call</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><div className="flex justify-between"><span>CrustData credits</span><span className="font-medium tabular-nums">{s.crustdataCredits} / {s.budgetPerRun}</span></div><Progress value={(s.crustdataCredits / s.budgetPerRun) * 100} className="mt-1 h-1.5" /></div>
          {[["CrustData calls", s.crustdataCalls], ["Served from cache (0 cr)", s.cacheHits], ["Tavily searches", s.tavilyCalls], ["LLM calls", `${s.llmCalls} · ${s.llmTokens.toLocaleString()} tok`]].map(([k, v]) => <div key={String(k)} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>)}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceDetail({ check, evId, evById }: { check?: Check; evId?: string; evById: Map<string, Evidence> }) {
  const items = check ? (check.evidenceIds.map(id => evById.get(id)).filter(Boolean) as Evidence[]) : ([evById.get(evId ?? "")].filter(Boolean) as Evidence[]);
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{check ? check.title : `Source ${evId}`}</SheetTitle>
        <SheetDescription>{check ? `${check.rule} · ${check.section}` : "Evidence record"}</SheetDescription>
        {check && <div className="pt-1"><StatusBadge status={check.status} /></div>}
      </SheetHeader>
      <div className="space-y-4 p-4">
        {check && (
          <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
            {check.claim && <><dt className="text-muted-foreground">Claim</dt><dd>{check.claim}</dd></>}
            {check.submitted && <><dt className="text-muted-foreground">Submitted</dt><dd>{check.submitted}</dd></>}
            <dt className="text-muted-foreground">Observed</dt><dd>{check.observed}</dd>
            <dt className="text-muted-foreground">Why</dt><dd>{check.reason}</dd>
          </dl>
        )}
        {!items.length && <p className="text-sm text-muted-foreground">No source record — this check was not run or applies by policy.</p>}
        {items.map(e => (
          <div key={e.id} className={cn("rounded-lg border p-3", evId === e.id && "border-primary ring-2 ring-primary/15")}>
            <div className="flex items-center gap-2 text-sm"><span className="font-mono text-xs">{e.id}</span><Badge variant="secondary">{e.provider ?? e.kind}</Badge>{e.endpoint && <span className="font-mono text-xs text-muted-foreground">{e.endpoint}</span>}</div>
            <dl className="mt-2 grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 text-sm">
              {e.recordId !== undefined && <><dt className="text-muted-foreground">Record</dt><dd className="font-mono text-xs">{String(e.recordId)}</dd></>}
              {e.fieldPath && <><dt className="text-muted-foreground">Fields</dt><dd className="font-mono text-xs break-all">{e.fieldPath}</dd></>}
              {e.note && <><dt className="text-muted-foreground">Note</dt><dd>{e.note}</dd></>}
              {e.url && <><dt className="text-muted-foreground">URL</dt><dd><a className="break-all text-primary hover:underline" href={e.url} target="_blank" rel="noreferrer">{e.url}</a></dd></>}
              <dt className="text-muted-foreground">Retrieved</dt><dd>{new Date(e.retrievedAt).toLocaleString("en-GB")}{e.cached ? " · cache" : ""}</dd>
            </dl>
            {e.value !== undefined && <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed">{typeof e.value === "string" ? e.value : JSON.stringify(e.value, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </>
  );
}


function Provenance({ c }: { c: CaseResult }) {
  const crust = c.evidence.filter(e => e.provider === "CrustData");
  const endpoints = [...new Set(crust.map(e => e.endpoint).filter(Boolean))];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-2.5 text-sm">
      <CrustChip />
      {c.identity.status === "resolved" ? <span>Verified against the <b>CrustData identity graph</b> · company <span className="font-mono">#{c.identity.company!.id}</span> · match confidence {c.identity.company!.score}</span> : <span>CrustData identity graph: <b>{c.identity.status}</b></span>}
      <span className="text-muted-foreground">{crust.length} CrustData records · {endpoints.length} endpoints · {c.spend.crustdataCredits} credits ({c.spend.cacheHits} cached)</span>
    </div>
  );
}

function CrustDataUsed({ c }: { c: CaseResult }) {
  const crust = c.evidence.filter(e => e.provider === "CrustData");
  const groups = new Map<string, Evidence[]>();
  for (const e of crust) { const k = e.endpoint ?? "?"; groups.set(k, [...(groups.get(k) ?? []), e]); }
  const usedIn = (id: string) => c.checks.filter(k => k.evidenceIds.includes(id)).length;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CrustChip />CrustData data used in this case</CardTitle><CardDescription>{crust.length} records from {groups.size} endpoints · {c.spend.crustdataCredits} credits this run · everything about identity, ownership, size, people, funding and activity comes from here</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {[...groups.entries()].map(([ep, list]) => (
          <div key={ep} className="rounded-lg border p-3">
            <div className="font-mono text-xs font-semibold">POST {ep}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {list.slice(0, 6).map(e => <li key={e.id} className="flex gap-2"><span className="font-mono text-xs text-primary">{e.id}</span><span className="min-w-0 flex-1"><span className="break-words">{e.note ?? e.fieldPath}</span>{e.fieldPath && e.note && <span className="block font-mono text-[11px] text-muted-foreground break-all">{e.fieldPath}</span>}</span><span className="shrink-0 text-xs text-muted-foreground">{usedIn(e.id)} checks{e.cached ? " · cache" : ""}</span></li>)}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ParentCard({ c }: { c: CaseResult }) {
  const p = c.parent!;
  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <CompanyAvatar name={p.name} logo={p.logo} size={40} />
        <div className="min-w-0 flex-1"><CardTitle className="text-base">Parent company · {p.name}</CardTitle><CardDescription>{[p.domain, p.hq].filter(Boolean).join(" · ")}</CardDescription></div>
        <CrustChip />
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">CrustData ID</div><div className="font-mono">#{p.id}</div></div>
        <div><div className="text-xs text-muted-foreground">Headcount</div><div className="tabular-nums">{p.headcount?.toLocaleString("en-US") ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Funding</div><div className="tabular-nums">{p.fundingUsd ? fmtUsd(p.fundingUsd) : "—"}</div></div>
      </CardContent>
    </Card>
  );
}

function MonitoringCard({ c }: { c: CaseResult }) {
  const m = c.monitoring!;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Post-closing monitoring</CardTitle><CardDescription>{m.note}</CardDescription></div><CrustChip /></CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">{m.track.map(x => <li key={x} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />Alert on: {x}</li>)}</ul>
        <p className="mt-3 text-xs text-muted-foreground">{m.status === "validated" ? "CrustData Watcher preview built a sample notification for this rule (deliver=false: no watch created, nothing sent, no credits)." : "Spec stored locally."}</p>
      </CardContent>
    </Card>
  );
}

function TrendsGrid({ c, credit }: { c: CaseResult; credit: boolean }) {
  const s = c.series;
  if (!s) return null;
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart title="Measured headcount" data={s.headcount} unit="people" events={c.events} />
        <TrendChart title={`Web visits / month${s.trafficDomain ? " · " + s.trafficDomain : ""}`} data={s.traffic} unit="visits" kind="area" note={s.trafficExcluded ? `Not counted in activity — ${s.trafficExcluded}` : undefined} />
        {credit ? <RevenueBand data={s.revenue} /> : <TrendChart title="Followers" data={s.followers} unit="followers" />}
        {credit ? <TrendChart title="Followers" data={s.followers} unit="followers" /> : (s.openJobs.length > 1 ? <TrendChart title="Open jobs" data={s.openJobs} unit="openings" /> : <RevenueBand data={s.revenue} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {c.peers?.companies.length ? (
          <div className="grid gap-2">
            <PeerBars peers={c.peers.companies} />
            <p className="px-1 text-xs text-muted-foreground">Peer set: {c.peers.basis} (CrustData company search)</p>
          </div>
        ) : <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No peer set — industry or country not on record.</div>}
        <div className="grid content-start gap-4">
          <BarList title="Team mix (by role)" data={s.roles} unit="people" />
          <BarList title="Where the team is (by region)" data={s.regions.slice(0, 6)} unit="people" />
        </div>
      </div>
      {c.parent && <ParentCard c={c} />}
    </>
  );
}
