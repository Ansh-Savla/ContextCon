import { runResearch } from "@/lib/server/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST {name, category?, domain?} → Tavily company research (on demand, cached). */
export async function POST(req: Request) {
  const { name, category, domain } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") return Response.json({ ok: false, message: "name required" }, { status: 400 });
  try { return Response.json(await runResearch(name.slice(0, 120), String(category ?? "").slice(0, 80), String(domain ?? "").slice(0, 120))); }
  catch (e) { return Response.json({ ok: false, sections: [], figures: [], message: (e as Error).message }); }
}
