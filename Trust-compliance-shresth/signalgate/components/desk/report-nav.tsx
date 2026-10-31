"use client";

/* Single-scroll case report: titled sections, a sticky scroll-spy guide, and collapsible evidence. */
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReportSection({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6">
      <div className="mb-4 flex items-end justify-between gap-4 border-b pb-2">
        <div><h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">{title}</h2>{sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}</div>
      </div>
      {children}
    </section>
  );
}

export function ReportNav({ items }: { items: Array<{ id: string; label: string; n?: number; warn?: boolean }> }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-10% 0px -70% 0px" });
    items.forEach(i => { const el = document.getElementById(i.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [items]);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const Item = ({ i }: { i: (typeof items)[number] }) => (
    <button onClick={() => go(i.id)} aria-current={active === i.id ? "true" : undefined}
      className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition hover:bg-accent", active === i.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground")}>
      <span className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full", active === i.id ? "bg-primary" : i.warn ? "bg-bad" : "bg-border")} />{i.label}</span>
      {i.n !== undefined && <span className={cn("text-xs tabular-nums", i.warn ? "text-bad" : "")}>{i.n}</span>}
    </button>
  );
  return (
    <>
      {/* desktop: sticky right rail */}
      <nav aria-label="Case sections" className="hidden xl:block">
        <div className="glass sticky top-6 rounded-xl p-2">
          <div className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">On this case</div>
          {items.map(i => <Item key={i.id} i={i} />)}
        </div>
      </nav>
      {/* smaller screens: sticky chip row */}
      <nav aria-label="Case sections" className="glass fixed inset-x-3 bottom-3 z-20 flex gap-1 overflow-x-auto rounded-xl p-1.5 xl:hidden">
        {items.map(i => <button key={i.id} onClick={() => go(i.id)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-xs", active === i.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{i.label}</button>)}
      </nav>
    </>
  );
}

export function Fold({ title, meta, children, defaultOpen }: { title: string; meta?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="glass rounded-xl">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">{meta}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </div>
  );
}
