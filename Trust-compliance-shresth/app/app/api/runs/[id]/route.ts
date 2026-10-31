import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A saved case (replay without spending credits). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^SG-[\w-]+$/.test(id)) return new Response("bad id", { status: 400 });
  try {
    return new Response(fs.readFileSync(path.join(process.cwd(), "data", "runs", `${id}.json`), "utf8"), { headers: { "content-type": "application/json" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
