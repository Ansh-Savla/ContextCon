import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/server/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^SG-\d+$/.test(id)) return new Response("bad id", { status: 400 });
  try { return new Response(fs.readFileSync(path.join(DATA_DIR, "runs", `${id}.json`), "utf8"), { headers: { "content-type": "application/json" } }); }
  catch { return new Response("not found", { status: 404 }); }
}
