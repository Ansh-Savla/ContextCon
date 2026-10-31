"use client";

/* Trend charts from CrustData /company/enrich time series. Single series per chart (one accent hue, no legend —
   the title names it), recessive axes, hover tooltip, labelled reference lines for dated events. */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PeerCompany, SeriesPoint, TimelineEvent } from "@/lib/types";
import { CrustChip } from "./primitives";

const ACCENT = "var(--primary)";
const MUTED = "var(--muted-foreground)";
const GRID = "var(--border)";
const fmtN = (n: number) => (Math.abs(n) >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(Math.round(n)));
const fmtD = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

function Tip({ active, payload, label, unit, band }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as SeriesPoint;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground">{new Date(label).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
      <div className="font-medium tabular-nums">{band && p.v2 !== undefined ? `$${fmtN(p.v)} – $${fmtN(p.v2)}` : `${p.v.toLocaleString("en-US")}${unit ? " " + unit : ""}`}</div>
    </div>
  );
}

function ChartFrame({ title, sub, children, empty, summary }: { title: string; sub?: string; children: React.ReactNode; empty?: boolean; summary?: string }) {
  return (
    <figure className="rounded-xl border bg-card p-4 shadow-xs" aria-label={summary ?? title}>
      <figcaption className="mb-2 flex items-start justify-between gap-2">
        <div><div className="text-sm font-medium">{title}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</div>
        <CrustChip />
      </figcaption>
      {empty ? <div className="grid h-40 place-items-center text-sm text-muted-foreground">No series on record for this company</div> : <div className="h-44">{children}</div>}
      {summary && <p className="sr-only">{summary}</p>}
    </figure>
  );
}

function summarize(s: SeriesPoint[], unit: string) {
  if (s.length < 2) return "";
  const a = s[0], b = s[s.length - 1];
  const ch = a.v ? Math.round(((b.v - a.v) / a.v) * 100) : 0;
  return `${fmtD(a.date)} ${a.v.toLocaleString("en-US")} → ${fmtD(b.date)} ${b.v.toLocaleString("en-US")} ${unit} (${ch >= 0 ? "+" : ""}${ch}%)`;
}

export function TrendChart({ title, data, unit, events = [], kind = "line", note }: { title: string; data: SeriesPoint[]; unit: string; events?: TimelineEvent[]; kind?: "line" | "area"; note?: string }) {
  const s = summarize(data, unit);
  const first = data[0]?.date, last = data[data.length - 1]?.date;
  const marks = events.filter(e => first && last && e.date >= first && e.date <= last && ["funding", "acquired", "left"].includes(e.kind)).slice(0, 4);
  const common = (
    <>
      <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
      <XAxis dataKey="date" tickFormatter={fmtD} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} minTickGap={28} />
      <YAxis tickFormatter={fmtN} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
      <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: MUTED, strokeDasharray: "3 3" }} />
      {marks.map(m => <ReferenceLine key={m.date + m.title} x={data.reduce((best, p) => (Math.abs(+new Date(p.date) - +new Date(m.date)) < Math.abs(+new Date(best) - +new Date(m.date)) ? p.date : best), data[0].date)} stroke={m.kind === "acquired" || m.kind === "left" ? "var(--bad)" : MUTED} strokeDasharray="4 3" label={{ value: m.kind === "funding" ? "Round" : m.kind === "acquired" ? "Acquired" : "Exit", position: "insideTopRight", fontSize: 10, fill: MUTED }} />)}
    </>
  );
  return (
    <ChartFrame title={title} sub={note ?? s} empty={data.length < 2} summary={`${title}: ${s}`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs><linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} /></linearGradient></defs>
            {common}
            <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2} fill={`url(#g-${title})`} activeDot={{ r: 4 }} />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {common}
            <Line type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueBand({ data }: { data: SeriesPoint[] }) {
  const d = data.filter(p => p.v2 !== undefined).map(p => ({ date: p.date, v: p.v, v2: p.v2, band: [p.v, p.v2] as [number, number] }));
  const last = d[d.length - 1];
  return (
    <ChartFrame title="Revenue estimate (range)" sub={last ? `Provider model estimate · latest $${fmtN(last.v)}–$${fmtN(last.v2!)} · not audited` : undefined} empty={d.length < 2} summary={last ? `Estimated revenue range latest ${fmtN(last.v)} to ${fmtN(last.v2!)} USD` : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={d} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtD} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={v => `$${fmtN(v)}`} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<Tip band />} cursor={{ stroke: MUTED, strokeDasharray: "3 3" }} />
          <Area type="stepAfter" dataKey="band" stroke={ACCENT} strokeWidth={1.5} fill={ACCENT} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BarList({ title, data, unit }: { title: string; data: Array<{ label: string; v: number }>; unit: string }) {
  const max = Math.max(1, ...data.map(d => d.v));
  return (
    <figure className="rounded-xl border bg-card p-4 shadow-xs">
      <figcaption className="mb-3 flex items-start justify-between gap-2"><div className="text-sm font-medium">{title}</div><CrustChip /></figcaption>
      {data.length ? (
        <ul className="space-y-2">
          {data.map(d => (
            <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="truncate" title={d.label}>{d.label}</span><span className="tabular-nums text-muted-foreground">{d.v.toLocaleString("en-US")} {unit}</span>
              <div className="col-span-2 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (d.v / max) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      ) : <div className="text-sm text-muted-foreground">Not on record</div>}
    </figure>
  );
}

export function PeerBars({ peers }: { peers: PeerCompany[] }) {
  const d = peers.filter(p => typeof p.headcount === "number").map(p => ({ name: p.name.replace(/[®©™]/g, "").trim().slice(0, 22), v: p.headcount!, target: !!p.isTarget }));
  return (
    <ChartFrame title="Headcount vs peers" sub="Target highlighted · peers from CrustData company search" empty={d.length < 2}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={4}>
          <XAxis type="number" tickFormatter={fmtN} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "var(--foreground)" }} tickLine={false} axisLine={false} interval={0} />
          <Tooltip cursor={{ fill: "var(--accent)" }} content={({ active, payload }: any) => active && payload?.length ? <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"><div className="font-medium">{payload[0].payload.name}</div><div className="tabular-nums">{payload[0].payload.v.toLocaleString("en-US")} staff</div></div> : null} />
          <Bar dataKey="v" radius={[0, 4, 4, 0]}>{d.map(x => <Cell key={x.name} fill={x.target ? ACCENT : "var(--idle)"} fillOpacity={x.target ? 1 : 0.35} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
