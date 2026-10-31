"use client";

import { Building2, ExternalLink, Flag, Landmark, LogIn, LogOut, Newspaper, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";
import { SourceChip } from "./primitives";

const KIND: Record<TimelineEvent["kind"], { Icon: typeof Flag; cls: string; label: string }> = {
  founded: { Icon: Flag, cls: "bg-primary text-primary-foreground", label: "Founded" },
  funding: { Icon: Landmark, cls: "bg-ok text-white", label: "Funding" },
  joined: { Icon: LogIn, cls: "bg-secondary text-foreground", label: "Joined" },
  left: { Icon: LogOut, cls: "bg-bad text-white", label: "Departure" },
  acquired: { Icon: Building2, cls: "bg-bad text-white", label: "Acquired" },
  news: { Icon: Newspaper, cls: "bg-info-bg text-info", label: "News" },
  press: { Icon: Tv, cls: "bg-info-bg text-info", label: "Press" },
};

/** Chronological story of the company: every dated fact we hold, each with its source. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No dated events on record.</p>;
  return (
    <ol className="relative ml-3 border-l pl-6">
      {events.map((e, i) => {
        const k = KIND[e.kind];
        return (
          <li key={i} className="relative pb-5 last:pb-0">
            <span className={cn("absolute -left-[37px] grid size-6 place-items-center rounded-full ring-4 ring-card", k.cls)}><k.Icon className="size-3.5" aria-hidden /></span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <time className="font-mono tabular-nums">{e.date.slice(0, 7)}</time><span>·</span><span>{k.label}</span><SourceChip provider={e.source} />
            </div>
            <div className="mt-0.5 text-sm font-medium">
              {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">{e.title}<ExternalLink className="ml-1 inline size-3 text-muted-foreground" /></a> : e.title}
            </div>
            {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
          </li>
        );
      })}
    </ol>
  );
}
