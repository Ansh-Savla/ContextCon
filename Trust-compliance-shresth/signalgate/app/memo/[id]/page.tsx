"use client";

/* Printable investment-committee / credit-committee memo (A4). Open from a case, then Print → Save as PDF. */
import { use, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import type { CaseResult } from "@/lib/types";

const usd = (n?: number | null) => (n === undefined || n === null ? "—" : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
const STATUS: Record<string, string> = { verified: "✓ Verified", contradicted: "✕ Contradicted", review: "! Review", unverified: "? Unverified", not_run: "– Not run", info: "i Info" };

export default function MemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<CaseResult | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fetch(`/api/runs/${id}`).then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(setC).catch(e => setErr(String(e))); }, [id]);
  if (err) return <p className="p-10 text-sm">Case not found ({err}).</p>;
  if (!c) return <p className="p-10 text-sm text-muted-foreground">Loading memo…</p>;
  const investor = c.intake.requester === "investor";
  const name = c.profile?.name?.replace(/[®©™]/g, "").trim() ?? c.intake.company?.value ?? "Company";
  const key = c.checks.filter(k => k.status !== "info").sort((a, b) => ["contradicted", "review", "unverified", "verified", "not_run"].indexOf(a.status) - ["contradicted", "review", "unverified", "verified", "not_run"].indexOf(b.status)).slice(0, 12);
  const crust = c.evidence.filter(e => e.provider === "CrustData");

  return (
    <div className="min-h-dvh bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between px-2">
        <span className="text-sm text-muted-foreground">Print preview · A4</span>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Printer className="size-4" />Print / Save as PDF</button>
      </div>
      <article className="print-page mx-auto max-w-[820px] rounded-lg border bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm">
        <header className="flex items-start gap-4 border-b border-neutral-200 pb-5">
          {c.profile?.logo && /^https:/.test(c.profile.logo) && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={c.profile.logo} alt="" className="size-14 rounded-md border object-contain p-1" />)}
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{investor ? "Investment committee memo" : "Credit committee memo"} · SignalGate · {c.id}</div>
            <h1 className="mt-1 text-2xl font-semibold">{name}</h1>
            <div className="text-neutral-600">{[c.profile?.domain, c.profile?.hq, c.profile?.founded ? `founded ${c.profile.founded}` : "", c.identity.company ? `CrustData #${c.identity.company.id}` : ""].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="text-right text-[11px] text-neutral-500">{new Date(c.createdAt).toLocaleString("en-GB")}</div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          {c.decisions.map(d => (
            <div key={d.track} className="rounded-md border border-neutral-200 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{d.track === "compliance" ? "Compliance clearance" : investor ? "Investment decision" : "Credit decision"}</div>
              <div className="mt-1 text-base font-semibold">{d.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold">Summary</h2>
          <p>{c.memo}</p>
        </section>

        {c.conditions.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-1 text-sm font-semibold">Conditions precedent</h2>
            <ol className="list-decimal pl-5">{c.conditions.map(x => <li key={x}>{x}</li>)}</ol>
          </section>
        )}

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold">Key checks</h2>
          <table className="w-full border-collapse text-[12px]">
            <thead><tr className="border-b border-neutral-300 text-left text-neutral-500"><th className="py-1 pr-2">Check</th><th className="py-1 pr-2">Observed</th><th className="py-1 pr-2">Status</th><th className="py-1">Sources</th></tr></thead>
            <tbody>{key.map(k => <tr key={k.id} className="border-b border-neutral-100 align-top"><td className="py-1.5 pr-2 font-medium">{k.title}</td><td className="py-1.5 pr-2">{k.observed}</td><td className="whitespace-nowrap py-1.5 pr-2">{STATUS[k.status]}</td><td className="py-1.5 font-mono text-[11px]">{k.evidenceIds.join(" ")}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-[11px] text-neutral-500">Measured headcount</div><div className="text-lg font-semibold">{c.profile?.headcount ?? "—"}</div></div>
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-[11px] text-neutral-500">Company activity</div><div className="text-lg font-semibold">{c.heartbeat?.score ?? "—"} <span className="text-xs font-normal text-neutral-500">{c.heartbeat?.band}</span></div></div>
          <div className="rounded-md border border-neutral-200 p-3"><div className="text-[11px] text-neutral-500">{investor ? "Thesis fit" : "Credit grade · indicative cap"}</div><div className="text-lg font-semibold">{investor ? (c.investment?.fit.length ? `${c.investment.fit.filter(f => f.result === "pass").length}/${c.investment.fit.length}` : "—") : `${c.credit?.grade ?? "—"} · ${usd(c.credit?.indicativeExposure?.amount)}`}</div></div>
        </section>

        {c.events.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-1 text-sm font-semibold">Timeline</h2>
            <ul className="grid grid-cols-2 gap-x-6 text-[12px]">{c.events.slice(0, 12).map((e, i) => <li key={i}><span className="font-mono text-neutral-500">{e.date.slice(0, 7)}</span> {e.title}</li>)}</ul>
          </section>
        )}

        <section className="mt-5 border-t border-neutral-200 pt-3 text-[11px] text-neutral-500">
          <div className="font-semibold text-neutral-700">Sources</div>
          <p>{crust.length} CrustData records ({[...new Set(crust.map(e => e.endpoint))].join(", ")}) · {c.evidence.filter(e => e.kind === "web").length} web sources · decisions by deterministic rules; memo prose {c.memoBy === "rules template" ? "from templates" : `drafted by ${c.memoBy} from cited checks`}.</p>
          <ul className="mt-1 columns-2">{c.evidence.filter(e => e.kind !== "input").slice(0, 16).map(e => <li key={e.id}><span className="font-mono">{e.id}</span> {e.provider} {e.endpoint ?? ""} {e.recordId ? `#${e.recordId}` : ""} {e.url ? e.url.replace(/^https?:\/\//, "").slice(0, 50) : ""}</li>)}</ul>
          <p className="mt-2">Prepared by SignalGate (simulated, local). Not investment, credit or legal advice. Sanctions/PEP screening not performed.</p>
        </section>
      </article>
    </div>
  );
}
