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
        <h1 className="text-4xl font-semibold tracking-tight">What should we <span className="bg-gradient-to-r from-primary via-sky-500 to-teal-500 bg-clip-text text-transparent">diligence</span>?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Paste the request as you received it — a forwarded pitch, a loan application, an email asking you to wire money. Agents verify the company and its people in CrustData&apos;s identity graph, screen for fraud and adverse news, then finish the work: a decision, an IC or credit memo, and the files updated.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        {[["Built on the CrustData identity graph", "bg-primary"], ["Every claim cited to a source", "bg-teal-500"], ["Decisions by rules, never by the LLM", "bg-amber-500"], ["Finishes the work: memo, files, holds", "bg-violet-500"]].map(([t, c]) => <span key={t} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-muted-foreground"><span className={`size-1.5 rounded-full ${c}`} />{t}</span>)}
      </div>

      <div className="glass-strong glass rounded-xl focus-within:ring-2 focus-within:ring-ring/40">
        <label htmlFor="req" className="sr-only">Request</label>
        <Textarea suppressHydrationWarning id="req" value={text} onChange={e => { setText(e.target.value); setPicked(null); }} placeholder="e.g. “Please run diligence on acme.in before our ₹50 lakh cheque. Founders say…”" className="min-h-44 resize-y border-0 bg-transparent p-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0" />
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
              className={cn("group glass lift rounded-xl p-4 text-left hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60", picked === e.id && "border-primary ring-2 ring-primary/15")}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("grid size-6 place-items-center rounded-md", e.requester === "investor" ? "bg-primary/12 text-primary" : "bg-teal-500/12 text-teal-600 dark:text-teal-400")}>{e.requester === "investor" ? <TrendingUp className="size-3.5" /> : <Landmark className="size-3.5" />}</span>
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
