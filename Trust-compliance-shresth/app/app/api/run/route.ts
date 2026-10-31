import { runCase } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST {text} -> NDJSON stream: {type:"event"} per trace step, then {type:"case"} or {type:"error"}. */
export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  if (!text || typeof text !== "string" || text.trim().length < 8) {
    return new Response(JSON.stringify({ error: "Paste a request (at least a company name or domain)." }), { status: 400 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const result = await runCase(text.slice(0, 8000), e => send({ type: "event", event: e }));
        send({ type: "case", case: result });
      } catch (err) {
        send({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
