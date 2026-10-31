import path from "node:path";

/**
 * Where SignalGate writes runtime data (API cache, saved runs, simulated systems of record).
 * Override with SIGNALGATE_DATA_DIR. On read-only serverless hosts (Vercel) it falls back to /tmp.
 */
export const DATA_DIR = process.env.SIGNALGATE_DATA_DIR || (process.env.VERCEL ? "/tmp/signalgate-data" : path.join(process.cwd(), "data"));
