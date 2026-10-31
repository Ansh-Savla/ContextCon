"use client";

import { useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, CircleHelp, Info, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckStatus, Decision } from "@/lib/types";

export const STATUS: Record<CheckStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: "Verified", cls: "text-ok bg-ok-bg border-ok/20", Icon: CheckCircle2 },
  contradicted: { label: "Contradicted", cls: "text-bad bg-bad-bg border-bad/20", Icon: XCircle },
  review: { label: "Review", cls: "text-warn bg-warn-bg border-warn/25", Icon: AlertTriangle },
  unverified: { label: "Unverified", cls: "text-idle bg-idle-bg border-idle/20", Icon: CircleHelp },
  not_run: { label: "Not run", cls: "text-idle bg-idle-bg border-idle/20", Icon: MinusCircle },
  info: { label: "Info", cls: "text-info bg-info-bg border-info/20", Icon: Info },
};

export function StatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", s.cls, className)}>
      <s.Icon className="size-3.5" aria-hidden />{s.label}
    </span>
  );
}

export const DECISION_TONE: Record<Decision["code"], { cls: string; ring: string; Icon: typeof CheckCircle2 }> = {
  proceed: { cls: "text-ok", ring: "border-ok/30 bg-ok-bg/60", Icon: CheckCircle2 },
  ready: { cls: "text-ok", ring: "border-ok/30 bg-ok-bg/60", Icon: CheckCircle2 },
  cleared: { cls: "text-ok", ring: "border-ok/30 bg-ok-bg/60", Icon: CheckCircle2 },
  conditions: { cls: "text-warn", ring: "border-warn/30 bg-warn-bg/60", Icon: AlertTriangle },
  refer: { cls: "text-warn", ring: "border-warn/30 bg-warn-bg/60", Icon: AlertTriangle },
  decline: { cls: "text-bad", ring: "border-bad/30 bg-bad-bg/60", Icon: Ban },
  not_cleared: { cls: "text-bad", ring: "border-bad/30 bg-bad-bg/60", Icon: XCircle },
  insufficient: { cls: "text-idle", ring: "border-idle/25 bg-idle-bg", Icon: CircleHelp },
};

export function DecisionPill({ d, className }: { d: Decision; className?: string }) {
  const t = DECISION_TONE[d.code];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", t.ring, t.cls, className)}>
      <t.Icon className="size-3.5" aria-hidden />{d.label}
    </span>
  );
}

export function CompanyAvatar({ name, logo, size = 40 }: { name?: string; logo?: string; size?: number }) {
  const [loaded, setLoaded] = useState(false);
  const initials = (name ?? "?").replace(/[®©™]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg border bg-gradient-to-br from-secondary to-accent text-accent-foreground grid place-items-center font-semibold" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials}
      {logo && /^https:\/\//.test(logo) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className={cn("absolute inset-0 size-full bg-white object-contain p-1 transition-opacity", loaded ? "opacity-100" : "opacity-0")} onLoad={e => { const i = e.target as HTMLImageElement; if (i.naturalWidth > 8) setLoaded(true); }} onError={() => setLoaded(false)} />
      )}
    </div>
  );
}

export function Stat({ label, value, hint, tone, children }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "ok" | "bad" | "warn" | "idle"; children?: React.ReactNode }) {
  const toneCls = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "idle" ? "text-idle" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      {children}
    </div>
  );
}

export function PulseLine({ score, className }: { score: number | null; className?: string }) {
  const W = 260, base = 30;
  let pts = `0,${base} ${W},${base}`;
  if (score !== null) {
    const beats = Math.max(1, Math.round(1 + score / 20)), amp = 6 + (score / 100) * 22, seg = W / beats, p: string[] = [];
    for (let i = 0; i < beats; i++) { const x = i * seg; p.push(`${x},${base}`, `${x + seg * .45},${base}`, `${x + seg * .52},${base - amp * .35}`, `${x + seg * .58},${base + amp * .5}`, `${x + seg * .64},${base - amp}`, `${x + seg * .7},${base + amp * .3}`, `${x + seg * .76},${base}`); }
    p.push(`${W},${base}`); pts = p.join(" ");
  }
  return (
    <svg viewBox={`0 0 ${W} 60`} className={cn("h-12 w-full", className)} role="img" aria-label={`Activity pulse ${score ?? "low signal"}`}>
      <polyline className="pulse-line" fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");

/** Provenance chip. CrustData gets the accent treatment so judges can see what came from the identity graph. */
export function SourceChip({ provider, className }: { provider?: string; className?: string }) {
  const p = provider ?? "Rule";
  const crust = p === "CrustData";
  const cls = crust ? "border-primary/25 bg-primary/8 text-primary" : p === "Tavily" || p === "CrustData web" ? "border-info/25 bg-info-bg text-info" : "border-border bg-muted text-muted-foreground";
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-wide whitespace-nowrap", cls, className)}>{crust && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}{p === "Rule" ? "RULE" : p === "Request" ? "REQUEST" : p.toUpperCase()}</span>;
}
export const CrustChip = ({ className }: { className?: string }) => <SourceChip provider="CrustData" className={className} />;

export function PersonAvatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const [ok, setOk] = useState(false);
  const initials = name.replace(/^MasterChef\s+/, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full border bg-secondary text-secondary-foreground grid place-items-center font-semibold" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials}
      {photo && photo.startsWith("https://") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" referrerPolicy="no-referrer" className={cn("absolute inset-0 size-full object-cover transition-opacity", ok ? "opacity-100" : "opacity-0")} onLoad={e => { if ((e.target as HTMLImageElement).naturalWidth > 8) setOk(true); }} onError={() => setOk(false)} />
      )}
    </div>
  );
}
