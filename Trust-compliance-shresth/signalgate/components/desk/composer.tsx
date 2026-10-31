"use client";

import { ArrowRight, Landmark, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EXAMPLES } from "@/lib/examples";

export function Composer({ text, setText, onRun, running, picked, setPicked }: { text: string; setText: (s: string) => void; onRun: () => void; running: boolean; picked: string | null; setPicked: (s: string | null) => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" />Investor diligence · Lender KYB & credit · India + US</div>
        <h1 className="text-3xl font-semibold tracking-tight">What should we diligence?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Paste the request as you received it — a forwarded pitch, a loan application, an email asking you to wire money. Agents verify the company and its people in CrustData&apos;s identity graph, screen for fraud and adverse news, then finish the work: a decision, an IC or credit memo, and the files updated.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
        <label htmlFor="req" className="sr-only">Request</label>
        <Textarea id="req" value={text} onChange={e => { setText(e.target.value); setPicked(null); }} placeholder="e.g. “Please run diligence on acme.in before our ₹50 lakh cheque. Founders say…”" className="min-h-44 resize-y border-0 bg-transparent p-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0" />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">Read-only research · actions are simulated locally · no one is contacted</span>
          <Button onClick={onRun} disabled={running || text.trim().length < 8} size="lg" className="gap-2">
            {running ? <><Loader2 className="size-4 animate-spin" />Investigating</> : <>Run diligence<ArrowRight className="size-4" /></>}
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Try a real case</h2>
          <span className="text-xs text-muted-foreground">Live CrustData lookups · synthetic inputs are labelled</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map(e => (
            <button key={e.id} onClick={() => { setText(e.text); setPicked(e.id); }} disabled={running}
              className={cn("group rounded-xl border bg-card p-4 text-left shadow-xs transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60", picked === e.id && "border-primary ring-2 ring-primary/15")}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {e.requester === "investor" ? <TrendingUp className="size-3.5 text-primary" /> : <Landmark className="size-3.5 text-primary" />}
                <span className="font-medium text-foreground/80">{e.requester === "investor" ? "Investor" : "Lender"}</span>
                <span>·</span><span>{e.market}</span>
                {/SYNTHETIC/.test(e.text) && <span className="ml-auto rounded bg-foreground px-1.5 py-px text-[10px] font-medium text-background">SYNTHETIC</span>}
              </div>
              <div className="mt-2 font-medium">{e.title}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{e.persona}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
