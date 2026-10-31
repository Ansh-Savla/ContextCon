"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseResult, Finding, TraceEvent } from "@/lib/types";

type Status = {
  credits: number | null; brain: string;
  ledger: { crustdataCredits: number; crustdataCalls: number; llmCalls: number; llmTokens: number; runs: number };
  budget: { perRun: number; total: number; llmPerRun: number };
  examples: Array<{ id: string; title: string; text: string }>;
  systems: { inbox: Array<Record<string, any>>; pipeline: number; ap: number; vendors: number };
  runs: Array<{ id: string; label: string }>;
};

const STAMP: Record<string, { word: string; cls: string }> = {
  hold: { word: "HOLD", cls: "" }, advance: { word: "ADVANCE", cls: "ok" }, satisfied: { word: "CLEARED", cls: "ok" },
  pass: { word: "PASS", cls: "pass" }, insufficient: { word: "INSUFFICIENT", cls: "ins" },
};
const STATUS_LABEL: Record<string, string> = { supported: "SUPPORTED", conflicting: "CONFLICTING", potential_issue: "REVIEW", insufficient: "INSUFFICIENT", not_checked: "NOT CHECKED", info: "INFO" };
const ORDER: Record<string, number> = { conflicting: 0, potential_issue: 1, insufficient: 2, supported: 3, not_checked: 4, info: 5 };

function highlight(raw: string, spans: string[]) {
  const uniq = [...new Set(spans.filter(s => s && s.length >= 3 && raw.toLowerCase().includes(s.toLowerCase())))].sort((a, b) => b.length - a.length);
  if (!uniq.length) return [raw];
  const re = new RegExp("(" + uniq.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return raw.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>));
}

function ecgPoints(score: number | null, pulse: number[]) {
  const W = 300, base = 42;
  if (score === null) return `0,${base} ${W},${base}`;
  const beats = Math.max(1, Math.round(1 + score / 20));
  const amp = 8 + (score / 100) * 26;
  const pts: string[] = [];
  const seg = W / beats;
  const trend = pulse.length > 1 ? (pulse[pulse.length - 1] - pulse[0]) / Math.max(1, Math.max(...pulse)) : 0;
  for (let b = 0; b < beats; b++) {
    const x0 = b * seg, y = base - trend * 6 * (b / beats);
    pts.push(`${x0},${y}`, `${x0 + seg * 0.45},${y}`, `${x0 + seg * 0.52},${y - amp * 0.35}`, `${x0 + seg * 0.58},${y + amp * 0.5}`, `${x0 + seg * 0.64},${y - amp}`, `${x0 + seg * 0.7},${y + amp * 0.3}`, `${x0 + seg * 0.76},${y}`);
  }
  pts.push(`${W},${base - trend * 6}`);
  return pts.join(" ");
}

function toMarkdown(c: CaseResult) {
  const L = [`# ${c.id} · ${c.profile?.name ?? c.intake.company?.value ?? "Case"}`, "", `**Outcome:** ${c.outcomes.map(o => `${o.lens}: ${o.label}`).join(" · ")}`, "", `## Memo (${c.narrativeBy})`, c.narrative, "", "## Findings", "| Check | Submitted | Observed | Status | Rule | Evidence |", "|---|---|---|---|---|---|"];
  for (const f of c.findings) L.push(`| ${f.check} | ${f.submitted ?? ""} | ${(f.observed ?? "").replace(/\|/g, "/")} | ${f.status} | ${f.rule} | ${f.evidenceIds.join(", ")} |`);
  if (c.heartbeat) L.push("", `## Heartbeat ${c.heartbeat.score ?? "—"} (${c.heartbeat.band}, coverage ${c.heartbeat.coverage})`, ...c.heartbeat.components.map(x => `- ${x.name} (w${x.weight}): ${x.score ?? "—"} ${x.value ?? x.missingReason ?? ""}`));
  if (c.questions.length) L.push("", "## Questions for the human", ...c.questions.map(q => `- ${q}`));
  L.push("", "## Actions taken (simulated, local)", ...c.actions.map(a => `- ${a.system}: ${a.summary} (${a.file})`));
  L.push("", "## Evidence", ...c.evidence.map(e => `- ${e.id} · ${e.kind} ${e.endpoint ?? ""} ${e.recordId ?? ""} ${e.fieldPath ?? ""} ${e.url ?? ""} ${e.note ?? ""} · ${e.retrievedAt}`));
  L.push("", `Spend: ${c.spend.crustdataCredits} CrustData credits, ${c.spend.cacheHits} cache hits, ${c.spend.llmCalls} LLM calls.`);
  return L.join("\n");
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}

export default function Page() {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [replay, setReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hl, setHl] = useState<string | null>(null);
  const traceRef = useRef<HTMLOListElement>(null);

  const loadStatus = () => fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
  useEffect(() => { loadStatus(); }, []);
  useEffect(() => { traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight }); }, [events]);

  async function run() {
    setRunning(true); setEvents([]); setResult(null); setError(null); setReplay(false);
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok || !res.body) { setError((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "event") setEvents(ev => [...ev, msg.event]);
          if (msg.type === "case") setResult(msg.case);
          if (msg.type === "error") setError(msg.message);
        }
      }
    } catch (e) { setError((e as Error).message); }
    finally { setRunning(false); loadStatus(); }
  }

  async function loadRun(id: string) {
    const r = await fetch(`/api/runs/${id}`);
    if (!r.ok) return;
    const c: CaseResult = await r.json();
    setResult(c); setEvents(c.trace); setText(c.intake.raw); setReplay(true); setError(null); setPicked(null);
  }

  const c = result;
  const findings = useMemo(() => (c ? [...c.findings].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : []), [c]);
  const spans = useMemo(() => (c ? [c.intake.company?.span, c.intake.domain?.span, c.intake.senderDomain?.value, ...c.intake.people.map(p => p.name), ...c.intake.claims.map(x => x.span)].filter(Boolean) as string[] : []), [c]);
  const primary = c?.outcomes[0];
  const stamp = primary ? STAMP[primary.code] : null;
  const topConflicts = findings.filter(f => f.status === "conflicting");
  const shownTrace = events;
  const runCredits = c?.spend.crustdataCredits ?? shownTrace.reduce((a, e) => a + (e.credits ?? 0), 0);
  const perRun = status?.budget.perRun ?? 25;

  const evButton = (id: string) => (
    <button key={id} className="ev" onClick={() => { setHl(id); document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} aria-label={`Show evidence ${id}`}>{id}</button>
  );

  return (
    <>
      <header className="top">
        <div className="brand">SignalGate<small>Shark Tank Diligence Desk · India + US · powered by CrustData</small></div>
        <div className="chips">
          {c?.intake.synthetic && <span className="chip dark">SYNTHETIC INPUT</span>}
          {replay && <span className="chip warn">REPLAY · saved run · 0 credits</span>}
          <span className="chip brain" title="LLM chain; rules decide every status">brain: {status?.brain ?? "…"}</span>
          <span className="chip" title="CrustData account balance (free check)">balance {status?.credits?.toLocaleString() ?? "…"} cr</span>
          <span className="chip" title="Credits this app has spent vs its cap">app {status ? Math.round(status.ledger.crustdataCredits * 100) / 100 : "…"} / {status?.budget.total ?? "…"} cr</span>
        </div>
      </header>

      <main className="grid">
        {/* ---------------- left: intake ---------------- */}
        <div>
          <section className="card">
            <h2>1 · Request <span className="src">paste anything: email, form, pitch</span></h2>
            <div className="examples" role="group" aria-label="Example requests">
              {status?.examples.map(e => (
                <button key={e.id} className="ex" aria-pressed={picked === e.id} title={e.title} onClick={() => { setText(e.text); setPicked(e.id); }}>{e.id}</button>
              ))}
            </div>
            <textarea className="intake" value={text} onChange={e => { setText(e.target.value); setPicked(null); }} placeholder="Paste a deal or vendor request…" aria-label="Request text" />
            <button className="run" onClick={run} disabled={running || text.trim().length < 8}>{running ? <><span className="spinner" />Agents working…</> : "Investigate & finish the job →"}</button>
            <div className="hint">Run budget {perRun} cr · identical calls served from cache at 0 cr · no outbound actions</div>
            {status && status.runs.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <label className="hint" htmlFor="runs">Replay a saved case (0 credits):</label>
                <select id="runs" style={{ width: "100%", marginTop: 4, font: "12px var(--mono)" }} onChange={e => e.target.value && loadRun(e.target.value)} defaultValue="">
                  <option value="">—</option>
                  {status.runs.map(r => <option key={r.id} value={r.id}>{r.id.slice(3)} · {r.label}</option>)}
                </select>
              </div>
            )}
          </section>

          {c && (
            <section className="card">
              <h2>2 · Parsed intake <span className="src">{c.intake.parsedBy}{c.intake.disagreements.length ? ` · ${c.intake.disagreements.length} disagreement` : " · parsers agree"}</span></h2>
              <pre className="raw">{highlight(c.intake.raw, spans)}</pre>
              <dl className="kv" style={{ marginTop: 10 }}>
                <dt>Lens</dt><dd>{c.intake.lenses.join(" + ")}</dd>
                <dt>Company</dt><dd>{c.intake.company?.value ?? <i>not provided</i>}</dd>
                <dt>Domain</dt><dd>{c.intake.domain?.value ?? <i>not provided</i>}</dd>
                {c.intake.senderDomain && <><dt>Sender</dt><dd>{c.intake.senderEmail?.value}</dd></>}
                {c.intake.people.length > 0 && <><dt>People</dt><dd>{c.intake.people.map(p => `${p.name}${p.role ? ` (${p.role})` : ""}`).join("; ")}</dd></>}
                <dt>Claims</dt><dd>{c.intake.claims.length ? c.intake.claims.map(x => x.text).join(" · ") : <i>none</i>}</dd>
              </dl>
              {c.intake.disagreements.map(d => <div key={d} className="note">⚑ {d}</div>)}
            </section>
          )}

          <section className="card inbox">
            <h2>Exceptions inbox <span className="src">the only human queue</span></h2>
            {status?.systems.inbox.length ? <ul style={{ paddingLeft: 16, margin: 0 }}>{status.systems.inbox.map((x, i) => <li key={i}><b>{String(x.company)}</b> — {String(x.outcome)}<br /><span className="note">{String(x.top_reason ?? "").slice(0, 110)}</span></li>)}</ul> : <div className="note">empty</div>}
            <div className="note">pipeline {status?.systems.pipeline ?? 0} · AP queue {status?.systems.ap ?? 0} · vendor master {status?.systems.vendors ?? 0} (local, simulated)</div>
          </section>
        </div>

        {/* ---------------- center: outcome ---------------- */}
        <div>
          {error && <section className="card" style={{ borderColor: "var(--hold)" }}><b>Run error:</b> {error}</section>}
          {!c && !running && !error && <section className="card"><div className="empty">Pick an example (E1–E9) or paste a request, then run. Agents resolve the company in CrustData&apos;s identity graph, check every claim, and finish the job: memo, vendor file or payment hold.</div></section>}
          {!c && running && <section className="card"><div className="empty"><span className="spinner" />Investigating — follow the agent trace on the right.</div></section>}

          {c && primary && stamp && (
            <>
              <div className={`verdict ${stamp.cls}`} role="status">
                <div className="stamp">{stamp.word}</div>
                <div>
                  <p><b>{primary.label}</b> — {c.profile?.name ?? c.intake.company?.value ?? "company"}{c.profile?.domain ? ` · ${c.profile.domain}` : ""}</p>
                  <p className="why">{topConflicts.length ? topConflicts.slice(0, 3).map(f => `${f.check}: ${f.reason}`).join(" · ") + ` (rules ${[...new Set(topConflicts.map(f => f.rule))].join(", ")})` : c.identity.status !== "resolved" ? c.identity.note : "No material contradiction in the checked evidence."}</p>
                </div>
              </div>
              {c.outcomes.length > 1 && <div className="lensrow">{c.outcomes.map(o => <span key={o.lens} className="lens">{o.lens}: <b>{o.label}</b></span>)}</div>}

              <div className="action">
                <div aria-hidden>⏸</div>
                <div><b>Done by the Case Clerk (simulated, local only):</b>
                  <ul>{c.actions.map((a, i) => <li key={i}>{String(a.summary)} <span className="note">→ {String(a.file)}</span></li>)}</ul>
                </div>
              </div>

              {c.identity.status !== "resolved" && c.identity.candidates.length > 0 && (
                <section className="card cands">
                  <h2>Identity candidates <span className="src">no company-specific conclusions drawn</span></h2>
                  <table><thead><tr><th>ID</th><th>Name</th><th>Domain</th><th>Size</th><th>Score</th></tr></thead>
                    <tbody>{c.identity.candidates.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.name}</td><td>{x.domain ?? "—"}</td><td>{x.size ?? "—"}</td><td>{x.score}</td></tr>)}</tbody></table>
                </section>
              )}

              <section className="card">
                <h2>3 · Claim matrix <span className="src">every row cites evidence</span></h2>
                <table>
                  <thead><tr><th>Check</th><th>Submitted</th><th>Observed (CrustData / web)</th><th>Status</th><th>Evidence</th></tr></thead>
                  <tbody>
                    {findings.map((f: Finding) => (
                      <tr key={f.id}>
                        <td><b>{f.check}</b><span className="rule">{f.rule}</span></td>
                        <td>{f.submitted ?? <span className="note">—</span>}</td>
                        <td>{f.observed}<span className="reason">{f.reason}</span></td>
                        <td><span className={`st ${f.status}`}>{STATUS_LABEL[f.status]}</span></td>
                        <td>{f.evidenceIds.length ? f.evidenceIds.map(evButton) : <span className="note">n/a</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {c.fit && c.fit.length > 0 && (
                <section className="card fit">
                  <h2>Thesis fit <span className="src">separate from trust evidence</span></h2>
                  <table><tbody>{c.fit.map(f => <tr key={f.criterion}><td><b>{f.criterion}</b></td><td>expected {f.expected}</td><td>{f.observed}</td><td><span className={`pill ${f.result}`}>{f.result.toUpperCase()}</span></td></tr>)}</tbody></table>
                </section>
              )}

              <section className="card">
                <h2>4 · Memo <span className="src">{c.narrativeBy === "template" ? "template (rules)" : `written by ${c.narrativeBy} from evidence IDs only`}</span></h2>
                <p className="memo">{c.narrative}</p>
                {c.questions.length > 0 && <><h2 style={{ marginTop: 14 }}>Questions for the human</h2><ul className="qs">{c.questions.map(q => <li key={q}>{q}</li>)}</ul></>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="ex" onClick={() => download(`${c.id}.md`, toMarkdown(c), "text/markdown")}>Export case file (.md)</button>
                  <button className="ex" onClick={() => download(`${c.id}.json`, JSON.stringify(c, null, 2), "application/json")}>Export JSON</button>
                </div>
              </section>

              <section className="card ledger">
                <h2>Evidence ledger <span className="src">{c.evidence.length} items</span></h2>
                <table><tbody>
                  {c.evidence.map(e => (
                    <tr key={e.id} id={`ev-${e.id}`} className={hl === e.id ? "hl" : ""}>
                      <td><b>{e.id}</b></td>
                      <td>{e.kind}{e.endpoint ? ` · POST ${e.endpoint}` : ""}{e.recordId ? ` · id ${e.recordId}` : ""}{e.fieldPath ? ` · ${e.fieldPath}` : ""}{e.note ? ` · ${String(e.note).slice(0, 140)}` : ""}{e.url ? <> · <a href={e.url} target="_blank" rel="noreferrer">{e.url.slice(0, 50)}</a></> : null}{e.cached ? " · cache" : ""}</td>
                      <td>{e.retrievedAt.slice(11, 19)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </section>
            </>
          )}
        </div>

        {/* ---------------- right: heartbeat, trace, spend ---------------- */}
        <div>
          {c?.heartbeat && (
            <section className="card">
              <h2>Heartbeat <span className="src">is the company alive?</span></h2>
              <div className={`hb-score ${c.heartbeat.coverage < 0.5 ? "low" : ""}`}><b>{c.heartbeat.score ?? "—"}</b><span>{c.heartbeat.band} · coverage {c.heartbeat.coverage}{c.heartbeat.asOf ? ` · as of ${c.heartbeat.asOf}` : ""}</span></div>
              <svg className="ecg" viewBox="0 0 300 70" role="img" aria-label={`Heartbeat ${c.heartbeat.score ?? "low signal"}`}>
                <polyline key={c.id} fill="none" stroke={c.heartbeat.score !== null && c.heartbeat.score >= 40 ? "#0f4c81" : "#b3261e"} strokeWidth="2" points={ecgPoints(c.heartbeat.score, c.heartbeat.pulse)} />
              </svg>
              {c.heartbeat.components.map(x => (
                <div key={x.name} className={`comp ${x.score === undefined ? "miss" : ""}`} title={x.value ?? x.missingReason}>
                  <span>{x.name}{x.weight !== undefined ? ` ·${x.weight}` : ""}</span>
                  <div className="bar"><i style={{ width: `${x.score ?? 0}%` }} /></div>
                  <span>{x.score ?? "n/a"}</span>
                  <small>{x.value ?? x.missingReason}{x.note ? ` — ${x.note}` : ""}</small>
                </div>
              ))}
              <p className="note">Weighted mean over components with data; missing data excluded, never 0. Activity only — never a fraud signal.</p>
            </section>
          )}

          <section className="card">
            <h2>Agent trace <span className="src">{running ? <><span className="spinner" />live</> : `${shownTrace.length} steps`}</span></h2>
            <ol className="trace" ref={traceRef} aria-live="polite">
              {shownTrace.map((e, i) => (
                <li key={i} className={e.status}>
                  <span className="t">{(e.t / 1000).toFixed(1)}s</span>
                  <span className="ag">{e.agent}{e.brain ? `·${e.brain}` : ""}</span> {e.step}{e.detail ? ` — ${e.detail}` : ""}
                </li>
              ))}
              {!shownTrace.length && <li className="info">waiting for a request…</li>}
            </ol>
          </section>

          <section className="card">
            <h2>Credits &amp; rationing</h2>
            <div className="spend">
              <span>this run</span><b>{Math.round(runCredits * 100) / 100} / {perRun} cr</b>
            </div>
            <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, (runCredits / perRun) * 100)}%` }} /></div>
            <div className="spend">
              <span>CrustData calls</span><b>{c?.spend.crustdataCalls ?? "—"}</b>
              <span>cache hits (0 cr)</span><b>{c?.spend.cacheHits ?? "—"}</b>
              <span>LLM calls / tokens</span><b>{c ? `${c.spend.llmCalls} / ${c.spend.llmTokens}` : "—"}</b>
              <span>app total</span><b>{status ? Math.round(status.ledger.crustdataCredits * 100) / 100 : "—"} / {status?.budget.total ?? "—"} cr</b>
              <span>account balance</span><b>{status?.credits?.toLocaleString() ?? "—"}</b>
            </div>
            <p className="note">Caps per run: credits, calls per endpoint, LLM calls. Over-cap steps are skipped and shown in the trace.</p>
          </section>
        </div>
      </main>
      <footer className="foot">SignalGate · all actions are simulated and local · never contacts people or moves money · statuses and outcomes are decided by rules; the LLM only extracts, judges relevance and writes prose.</footer>
    </>
  );
}
