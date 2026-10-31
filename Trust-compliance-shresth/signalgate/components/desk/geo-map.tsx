"use client";

/* "Where the team is": country bubbles sized by CrustData headcount.by_region_absolute, HQ country outlined.
   Bundled world-atlas shapes + d3-geo — no tile server, no runtime geocoding. Accessible table below the map. */
import { useMemo } from "react";
import { geoNaturalEarth1, geoPath, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { CrustChip } from "./primitives";

type Feat = { type: "Feature"; id: string; properties: { name: string }; geometry: any };
const FEATURES: Feat[] = (feature(world as any, (world as any).objects.countries) as any).features;

const ALIAS: Record<string, string> = {
  "united states": "United States of America", usa: "United States of America", us: "United States of America", ind: "India", uk: "United Kingdom",
  "czechia": "Czechia", "uae": "United Arab Emirates", "korea": "South Korea",
};
// City / metro labels that appear without a country in CrustData region keys (demo coverage; extend as needed).
const CITY: Record<string, string> = {
  "new delhi": "India", "greater delhi area": "India", delhi: "India", faridabad: "India", gurgaon: "India", gurugram: "India", noida: "India", mumbai: "India", bengaluru: "India", bangalore: "India", "tamil nadu": "India", villupuram: "India",
  ulaanbaatar: "Mongolia", "greater boston": "United States of America", "san diego metropolitan area": "United States of America", "san francisco bay area": "United States of America", "greater chicago area": "United States of America", "charleston, sc": "United States of America", "new york city metropolitan area": "United States of America",
};
const NAMES = new Map(FEATURES.map(f => [f.properties.name.toLowerCase(), f.properties.name]));

function countryOf(label: string): string | undefined {
  const l = label.toLowerCase().trim();
  if (CITY[l]) return CITY[l];
  const last = l.split(",").map(s => s.trim()).filter(Boolean).pop() ?? l;
  if (ALIAS[last]) return ALIAS[last];
  if (NAMES.has(last)) return NAMES.get(last);
  for (const [k, v] of Object.entries(CITY)) if (l.startsWith(k)) return v;
  return undefined;
}

export function GeoMap({ regions, hqCountry }: { regions: Array<{ label: string; v: number }>; hqCountry?: string }) {
  const data = useMemo(() => {
    // Region keys overlap (city, state, country); take the max per country instead of summing.
    const by = new Map<string, number>();
    for (const r of regions) { const c = countryOf(r.label); if (c) by.set(c, Math.max(by.get(c) ?? 0, r.v)); }
    return [...by.entries()].map(([country, v]) => ({ country, v })).sort((a, b) => b.v - a.v);
  }, [regions]);
  const hq = hqCountry ? countryOf(hqCountry) : undefined;
  const W = 640, H = 330;
  const proj = geoNaturalEarth1().fitSize([W, H], { type: "FeatureCollection", features: FEATURES } as any);
  const path = geoPath(proj);
  const max = Math.max(1, ...data.map(d => d.v));
  const spots = data.map(d => { const f = FEATURES.find(x => x.properties.name === d.country); const c = f ? proj(geoCentroid(f as any)) : null; return c ? { ...d, x: c[0], y: c[1] } : null; }).filter(Boolean) as Array<{ country: string; v: number; x: number; y: number }>;

  return (
    <figure className="rounded-xl border bg-card p-4 shadow-xs">
      <figcaption className="mb-2 flex items-start justify-between gap-2">
        <div><div className="text-sm font-medium">Where the team is</div><div className="text-xs text-muted-foreground">Bubble = measured headcount by country{hq ? ` · HQ outlined: ${hq}` : ""}</div></div>
        <CrustChip />
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-h-80 w-full max-w-3xl" role="img" aria-label={`Team locations: ${data.map(d => `${d.country} ${d.v}`).join(", ") || "none on record"}`}>
        {FEATURES.map(f => (
          <path key={f.id ?? f.properties.name} d={path(f as any) ?? ""} fill={f.properties.name === hq ? "var(--accent)" : "var(--muted)"} stroke={f.properties.name === hq ? "var(--primary)" : "var(--background)"} strokeWidth={f.properties.name === hq ? 1.2 : 0.5} />
        ))}
        {spots.map(s => (
          <g key={s.country}>
            <circle cx={s.x} cy={s.y} r={5 + 18 * Math.sqrt(s.v / max)} fill="var(--primary)" fillOpacity={0.25} stroke="var(--primary)" strokeWidth={1.5}><title>{`${s.country}: ${s.v} people`}</title></circle>
            <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">{s.v}</text>
          </g>
        ))}
      </svg>
      {data.length ? (
        <table className="mt-2 w-full text-sm"><tbody>{data.slice(0, 5).map(d => <tr key={d.country} className="border-t"><td className="py-1">{d.country}</td><td className="py-1 text-right tabular-nums text-muted-foreground">{d.v} people</td></tr>)}</tbody></table>
      ) : <p className="mt-2 text-sm text-muted-foreground">No regional headcount on record.</p>}
    </figure>
  );
}
