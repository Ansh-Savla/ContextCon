"use client";

import { useMemo, useState } from "react";
import { BookOpen, HelpCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DECISIONS, GLOSSARY, GUIDE, HEARTBEAT, SOURCES, STATUSES } from "@/lib/help-content";
import { StatusBadge } from "./primitives";
import type { CheckStatus } from "@/lib/types";

const DefList = ({ items }: { items: Array<{ term: string; def: string }> }) => (
  <dl className="divide-y rounded-lg border">{items.map(i => <div key={i.term} className="grid gap-1 p-3"><dt className="text-sm font-medium">{i.term}</dt><dd className="text-sm text-muted-foreground">{i.def}</dd></div>)}</dl>
);

export function HelpButton({ variant = "ghost", label = true }: { variant?: "ghost" | "outline"; label?: boolean }) {
  const [q, setQ] = useState("");
  const terms = useMemo(() => GLOSSARY.filter(g => (g.term + " " + g.def + " " + g.tag).toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5" aria-label="Open help and glossary"><HelpCircle className="size-4" />{label && "Help"}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" />SignalGate help</SheetTitle>
          <SheetDescription>How the desk works, what every label means, where the data comes from, and a glossary.</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="guide" className="p-4">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="guide">Guide</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="sources">Data sources</TabsTrigger>
            <TabsTrigger value="heartbeat">Activity score</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-4 space-y-4">
            {GUIDE.map(g => <section key={g.h}><h3 className="text-sm font-semibold">{g.h}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{g.p}</p></section>)}
          </TabsContent>

          <TabsContent value="decisions" className="mt-4 space-y-4">
            <h3 className="text-sm font-semibold">Decisions</h3>
            <DefList items={DECISIONS} />
            <h3 className="text-sm font-semibold">Check statuses</h3>
            <dl className="divide-y rounded-lg border">{STATUSES.map(s => <div key={s.term} className="flex items-start gap-3 p-3"><StatusBadge status={s.term.toLowerCase().replace(" ", "_") as CheckStatus} /><dd className="text-sm text-muted-foreground">{s.def}</dd></div>)}</dl>
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Everything about identity, ownership, size, people, funding and activity is sourced from <b className="text-foreground">CrustData</b>. Web search adds press and adverse-media context; rules compute decisions.</p>
            <DefList items={SOURCES} />
          </TabsContent>

          <TabsContent value="heartbeat" className="mt-4 space-y-3">
            <p className="text-sm">{HEARTBEAT.intro}</p>
            <p className="rounded-md bg-muted p-3 font-mono text-xs">{HEARTBEAT.formula}</p>
            <dl className="divide-y rounded-lg border">{HEARTBEAT.parts.map(([t, d]) => <div key={t} className="grid gap-1 p-3"><dt className="text-sm font-medium">{t}</dt><dd className="text-sm text-muted-foreground">{d}</dd></div>)}</dl>
            <p className="text-sm text-muted-foreground">{HEARTBEAT.bands}</p>
          </TabsContent>

          <TabsContent value="glossary" className="mt-4 space-y-3">
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search terms (e.g. SAFE, KYB, crore)" className="w-full bg-transparent text-sm outline-none" aria-label="Search glossary" />
            </label>
            <dl className="divide-y rounded-lg border">
              {terms.map(g => <div key={g.term} className="grid gap-1 p-3"><dt className="flex items-center gap-2 text-sm font-medium">{g.term}<Badge variant="secondary" className="text-[10px]">{g.tag}</Badge></dt><dd className="text-sm text-muted-foreground">{g.def}</dd></div>)}
              {!terms.length && <div className="p-3 text-sm text-muted-foreground">No matching term.</div>}
            </dl>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
