"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";
import { THEME_KEY as KEY } from "@/lib/theme";

export function applyTheme(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    let m: Mode = "system";
    try { m = (localStorage.getItem(KEY) as Mode) || "system"; } catch { /* storage blocked */ }
    setMode(m);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => { let cur: Mode = "system"; try { cur = (localStorage.getItem(KEY) as Mode) || "system"; } catch { /* */ } if (cur === "system") applyTheme("system"); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const set = (m: Mode) => { setMode(m); try { localStorage.setItem(KEY, m); } catch { /* */ } applyTheme(m); };
  const opts: Array<{ m: Mode; Icon: typeof Sun; label: string }> = [{ m: "light", Icon: Sun, label: "Light" }, { m: "dark", Icon: Moon, label: "Dark" }, { m: "system", Icon: Monitor, label: "System" }];
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex items-center gap-0.5 rounded-lg border bg-background/60 p-0.5", className)}>
      {opts.map(o => (
        <button key={o.m} role="radio" aria-checked={mode === o.m} aria-label={`${o.label} theme`} title={`${o.label} theme`} onClick={() => set(o.m)}
          className={cn("grid size-7 place-items-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", mode === o.m && "bg-card text-foreground shadow-xs")}>
          <o.Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
