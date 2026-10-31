"use client";

/* SignalGate workbench. Visual + interaction contract: ../../UI-DESIGN.md */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseResult, Evidence, Finding, TraceEvent } from "@/lib/types";

type Status = {
  credits: number | null; brain: string;
  ledger: { crustdataCredits: number; crustdataCalls: number; llmCalls: number; llmTokens: number; runs: number };
  budget: { perRun: number; total: number; llmPerRun: number };
  examples: Array<{ id: string; title: string; text: string }>;
  systems: { inbox: Array<Record<string, any>>; pipeline: number; ap: number; vendors: number };
  runs: Array<{ id: string; label: string }>;
};

const STATE: Record<string, { word: string; cls: string }> = {
  hold: { word: "HOLD", cls: "" }, advance: { word: "ADVANCE", cls: "ok" }, satisfied: { word: "CHECKS SATISFIED", cls: "ok" },
  pass: { word: "PASS", cls: "pass" }, insufficient: { word: "INSUFFICIENT", cls: "ins" },
};
const LABEL: Record<string, string> = { supported: "Supported", conflicting: "Conflicting", potential_issue: "Review", insufficient: "Insufficient", not_checked: "Not checked", info: "Info" };
const ICON: Record<string, string> = { supported: "✓", conflicting: "✕", potential_issue: "!", insufficient: "?", not_checked: "–", info: "i" };
const ORDER: Record<string, number> = { conflicting: 0, potential_issue: 1, insufficient: 2, supported: 3, not_checked: 4, info: 5 };
const TRACE_ICON: Record<string, string> = { ok: "✓", skipped: "⤼", failed: "✕", fallback: "↓", info: "·" };
const AGENT: Record<string, string> = { intake: "Intake", investigator: "Investigator", verifier: "Verifier", clerk: "Case clerk", system: "Run" };

function highlight(raw: string, spans: string[]) {
  const uniq = [...new Set(spans.filter(s => s && s.length >= 3 && raw.toLowerCase().includes(s.toLowerCase())))].sort((a, b) => b.length - a.length);
  if (!uniq.length) return [raw];
  const re = new RegExp("(" + uniq.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  return raw.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>));
}

function ecgPoints(score: number | null) {
  const W = 300, base = 38;
  if (score === null) return `0,${base} ${W},${base}`;
  const beats = Math.max(1, Math.round(1 + score / 20));
  const amp = 8 + (score / 100) * 24;
  const seg = W / beats;
  const pts: string[] = [];
  for (let b = 0; b < beats; b++) {
    const x0 = b * seg;
    pts.push(`${x0},${base}`, `${x0 + seg * 0.45},${base}`, `${x0 + seg * 0.52},${base - amp * 0.35}`, `${x0 + seg * 0.58},${base + amp * 0.5}`, `${x0 + seg * 0.64},${base - amp}`, `${x0 + seg * 0.7},${base + amp * 0.3}`, `${x0 + seg * 0.76},${base}`);
  }
  pts.push(`${W},${base}`);
  return pts.join(" ");
}

function toMarkdown(c: CaseResult) {
  const L = [`# ${c.id} · ${c.profile?.name ?? c.intake.company?.value ?? "Case"}`, "", `**Outcome:** ${c.outcomes.map(o => `${o.lens}: ${o.label}`).join(" · ")}`, "", `## Memo (${c.narrativeBy})`, c.narrative, "", "## Findings", "| Check | Submitted | Observed | Status | Rule | Evidence |", "|---|---|---|---|---|---|"];
  for (const f of c.findings) L.push(`| ${f.check} | ${f.submitted ?? ""} | ${(f.observed ?? "").replace(/\|/g, "/")} | ${f.status} | ${f.rule} | ${f.evidenceIds.join(", ")} |`);
  if (c.heartbeat) L.push("", `## Company activity (Heartbeat) ${c.heartbeat.score ?? "—"} (${c.heartbeat.band}, coverage ${c.heartbeat.coverage}) — activity context, not a fraud signal`, ...c.heartbeat.components.map(x => `- ${x.name} (w${x.weight}): ${x.score ?? "—"} ${x.value ?? x.missingReason ?? ""}`));
  if (c.questions.length) L.push("", "## Questions for the human", ...c.questions.map(q => `- ${q}`));
  L.push("", "## Actions taken (simulated · local only)", ...c.actions.map(a => `- ${a.system}: ${a.summary} (${a.file})`));
  L.push("", "## Evidence", ...c.evidence.map(e => `- ${e.id} · ${e.kind} ${e.endpoint ?? ""} ${e.recordId ?? ""} ${e.fieldPath ?? ""} ${e.url ?? ""} ${e.note ?? ""} · retrieved ${e.retrievedAt}`));
  L.push("", `Spend: ${c.spend.crustdataCredits} CrustData credits, ${c.spend.cacheHits} cache hits, ${c.spend.llmCalls} LLM calls.`);
  return L.join("\n");
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const market = (hq?: string) => (!hq ? "" : /\bIND\b|India/i.test(hq) ? "India" : /\bUSA\b|United States/i.test(hq) ? "US" : hq.split(",").slice(-1)[0].trim());

export default function Page() {
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [replay, setReplay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ finding?: Finding; evId?: string } | null>(null);
  const [apiDetail, setApiDetail] = useState(false);
  const traceRef = useRef<HTMLOListElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const loadStatus = () => fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
  useEffect(() => { loadStatus(); }, []);
  useEffect(() => { traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight }); }, [events]);
  useEffect(() => {
    if (!drawer) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  async function run() {
    setRunning(true); setEvents([]); setResult(null); setError(null); setReplay(false); setDrawer(null);
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
    setResult(c); setEvents(c.trace); setText(c.intake.raw); setReplay(true); setError(null); setPicked(null); setDrawer(null);
  }

  const c = result;
  const findings = useMemo(() => (c ? [...c.findings].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : []), [c]);
  const evById = useMemo(() => new Map((c?.evidence ?? []).map(e => [e.id, e] as const)), [c]);
  const spans = useMemo(() => (c ? [c.intake.company?.span, c.intake.domain?.span, c.intake.senderDomain?.value, ...c.intake.people.map(p => p.name), ...c.intake.claims.map(x => x.span)].filter(Boolean) as string[] : []), [c]);
  const primary = c?.outcomes[0];
  const state = primary ? STATE[primary.code] : null;
  const conflicts = findings.filter(f => f.status === "conflicting" && f.material);
  const openItems = findings.filter(f => (f.status === "conflicting" && !f.material) || f.status === "potential_issue");
  const runCredits = c?.spend.crustdataCredits ?? events.reduce((a, e) => a + (e.credits ?? 0), 0);
  const perRun = status?.budget.perRun ?? 25;
  const mkt = market(c?.profile?.hq);
  const openEv = (id: string, finding?: Finding) => setDrawer({ evId: id, finding });

  const drawerEvidence: Evidence[] = drawer ? (drawer.finding ? drawer.finding.evidenceIds.map(id => evById.get(id)).filter(Boolean) as Evidence[] : [evById.get(drawer.evId ?? "")].filter(Boolean) as Evidence[]) : [];

  return (
    <>
      <header className="top">
        <div className="brand">SignalGate</div>
        <div className="caseid" aria-live="polite">
          {c ? <><b>{c.profile?.name ?? c.intake.company?.value ?? "Unresolved company"}</b>{mkt && <span className="muted">{mkt}</span>}<span className="mono muted">{c.id}</span></> : <span className="muted">Shark Tank diligence desk · India + US · on CrustData</span>}
        </div>
        <div className="tags">
          {running && <span className="tag run"><span className="spinner" />Agents working</span>}
          {c && !replay && !running && <span className="tag live">Live run</span>}
          {replay && <span className="tag warn">Replay · saved run · 0 credits</span>}
          {c?.intake.synthetic && <span className="tag dark">Synthetic input</span>}
        </div>
      </header>

      <main className="grid">
        {/* ---------- left: request ---------- */}
        <div>
          <section className="card">
            <h2>Request <span className="sub">paste an email, form or pitch</span></h2>
            <div className="examples" role="group" aria-label="Example requests">
              {status?.examples.map(e => (
                <button key={e.id} className="ex" aria-pressed={picked === e.id} title={e.title} disabled={running} onClick={() => { setText(e.text); setPicked(e.id); }}>{e.id}</button>
              ))}
            </div>
            <label className="sr" htmlFor="req">Request text</label>
            <textarea id="req" className="intake" value={text} onChange={e => { setText(e.target.value); setPicked(null); }} placeholder="Paste a deal or vendor request…" />
            <button className="run" onClick={run} disabled={running || text.trim().length < 8}>{running ? <><span className="spinner" />Investigating…</> : "Investigate and finish the job"}</button>
            <div className="hint">Read-only research. Actions are simulated and local. Budget {perRun} credits per run; repeated calls come from cache at 0 credits.</div>
            {status && status.runs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label className="hint" htmlFor="runs">Replay a saved case (no credits)</label>
                <select id="runs" className="replay" onChange={e => e.target.value && loadRun(e.target.value)} defaultValue="">
                  <option value="">Choose a saved case…</option>
                  {status.runs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            )}
          </section>

          {c && (
            <section className="card">
              <h2>What the intake agent understood <span className="sub">{c.intake.parsedBy === "llm+rules" ? "LLM + rules" : "rules"}{c.intake.disagreements.length ? ` · ${c.intake.disagreements.length} disagreement` : " · parsers agree"}</span></h2>
              <div className="rawtext">{highlight(c.intake.raw, spans)}</div>
              <dl className="kv">
                <dt>Lens</dt><dd>{c.intake.lenses.join(" + ")}</dd>
                <dt>Company</dt><dd>{c.intake.company?.value ?? <i>not provided</i>}</dd>
                <dt>Domain</dt><dd>{c.intake.domain?.value ?? <i>not provided</i>}</dd>
                {c.intake.senderEmail && <><dt>Sender</dt><dd className="mono">{c.intake.senderEmail.value}</dd></>}
                {c.intake.people.length > 0 && <><dt>People</dt><dd>{c.intake.people.map(p => `${p.name}${p.role ? ` (${p.role})` : ""}`).join("; ")}</dd></>}
                <dt>Claims</dt><dd>{c.intake.claims.length ? c.intake.claims.map(x => x.text).join(" · ") : <i>none extracted</i>}</dd>
              </dl>
              {c.intake.disagreements.map(d => <div key={d} className="flag">Parser disagreement: {d}</div>)}
            </section>
          )}

          <section className="card inbox">
            <h2>Exceptions inbox <span className="sub">the only human queue</span></h2>
            {status?.systems.inbox.length ? <ul style={{ paddingLeft: 18, margin: 0 }}>{status.systems.inbox.map((x, i) => <li key={i}><b>{String(x.company)}</b> — {String(x.outcome)}<div className="note" style={{ marginTop: 2 }}>{String(x.top_reason ?? "").slice(0, 120)}</div></li>)}</ul> : <div className="note">No exceptions yet.</div>}
            <div className="note">Local records: pipeline {status?.systems.pipeline ?? 0} · AP queue {status?.systems.ap ?? 0} · vendor master {status?.systems.vendors ?? 0}</div>
          </section>
        </div>

        {/* ---------- center: decision ---------- */}
        <div>
          {error && <section className="card" style={{ borderColor: "var(--hold)" }} role="alert"><b>The run stopped:</b> {error}</section>}
          {!c && !running && !error && <section className="card"><div className="empty">Choose an example (E1–E9) or paste a request, then run it. The agents resolve the company in CrustData&apos;s identity graph, check each claim against cited records, and complete the work: an IC memo, a vendor file or a payment hold.</div></section>}
          {!c && running && <section className="card"><div className="empty"><span className="spinner" />Investigating. Progress appears in the agent trace.</div></section>}

          {c && primary && state && (
            <>
              <div className={`verdict ${state.cls}`} role="status">
                <div className="state">{state.word}</div>
                <div>
                  <h1>{primary.label}</h1>
                  <p>{conflicts.length ? conflicts.slice(0, 3).map(f => `${f.check}: ${f.reason}`).join(" · ") : c.identity.status !== "resolved" ? c.identity.note : `No material contradiction in the evidence that was checked.${openItems.length ? " Open items: " + openItems.slice(0, 2).map(f => f.check).join(", ") + "." : ""}`}</p>
                  {conflicts.length > 0 && <p className="mono muted" style={{ fontSize: 12.5 }}>rules {[...new Set(conflicts.map(f => f.rule))].join(", ")}</p>}
                </div>
              </div>
              {c.outcomes.length > 1 && <div className="lensrow">{c.outcomes.map(o => <span key={o.lens} className="lens">{o.lens}: <b>{o.label}</b></span>)}</div>}

              <div className="action">
                <h2>Completed by the case clerk</h2>
                <ul>{c.actions.map((a, i) => <li key={i}>{String(a.summary)}<span className="badge-sim">simulated · local only</span> <span className="mono muted">{String(a.file)}</span></li>)}</ul>
              </div>

              {c.identity.status !== "resolved" && c.identity.candidates.length > 0 && (
                <section className="card">
                  <h2>Possible companies <span className="sub">ambiguous match — no company-specific conclusions drawn</span></h2>
                  <table><thead><tr><th>CrustData ID</th><th>Name</th><th>Domain</th><th>Size</th><th>Score</th></tr></thead>
                    <tbody>{c.identity.candidates.map(x => <tr key={x.id}><td className="mono">{x.id}</td><td>{x.name}</td><td>{x.domain ?? "—"}</td><td>{x.size ?? "—"}</td><td>{x.score}</td></tr>)}</tbody></table>
                </section>
              )}

              <section className="card">
                <h2>Claim matrix <span className="sub">select a row for its sources</span></h2>
                <table className="claims">
                  <thead><tr><th>Check</th><th>Submitted</th><th>Observed</th><th>Status</th><th>Sources</th></tr></thead>
                  <tbody>
                    {findings.map(f => {
                      const first = evById.get(f.evidenceIds[0] ?? "");
                      return (
                        <tr key={f.id} className={`row ${f.status} ${drawer?.finding?.id === f.id ? "sel" : ""}`} tabIndex={0}
                          onClick={() => setDrawer({ finding: f })} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDrawer({ finding: f }); } }}
                          aria-label={`${f.check}: ${LABEL[f.status]}. Open sources.`}>
                          <td className="check"><b>{f.check}</b><span className="rule">{f.rule}</span></td>
                          <td>{f.submitted ?? <span className="muted">—</span>}</td>
                          <td>{f.observed}<span className="reason">{f.reason}</span></td>
                          <td><span className={`st ${f.status}`}><span aria-hidden>{ICON[f.status]}</span>{LABEL[f.status]}</span></td>
                          <td>{f.evidenceIds.length ? <>{f.evidenceIds.map(id => <button key={id} className="ev" onClick={e => { e.stopPropagation(); openEv(id, f); }} aria-label={`Source ${id}`}>{id}</button>)}<span className="when">{first?.sourceDate ? `dated ${first.sourceDate.slice(0, 10)}` : `retrieved ${first?.retrievedAt ? new Date(first.retrievedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}`}</span></> : <span className="muted">not applicable</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {c.fit && c.fit.length > 0 && (
                <section className="card">
                  <h2>Thesis fit <span className="sub">kept separate from trust evidence</span></h2>
                  <table><thead><tr><th>Criterion</th><th>Expected</th><th>Observed</th><th>Result</th></tr></thead>
                    <tbody>{c.fit.map(f => <tr key={f.criterion}><td><b>{f.criterion}</b></td><td>{f.expected}</td><td>{f.observed}</td><td><span className={`pill ${f.result}`}>{f.result === "pass" ? "✓ Pass" : f.result === "fail" ? "✕ Fail" : "? Unknown"}</span></td></tr>)}</tbody></table>
                </section>
              )}

              <section className="card">
                <h2>Case memo <span className="sub">{c.narrativeBy === "template" ? "written from rule templates" : `drafted by ${c.narrativeBy} from cited findings only`}</span></h2>
                <p className="memo">{c.narrative}</p>
                {c.questions.length > 0 && <><h2 style={{ marginTop: 16, fontSize: 15 }}>Next questions for a human</h2><ul className="qs">{c.questions.map(q => <li key={q}>{q}</li>)}</ul></>}
                <div className="btnrow">
                  <button className="ex" onClick={() => download(`${c.id}.md`, toMarkdown(c), "text/markdown")}>Download case file (.md)</button>
                  <button className="ex" onClick={() => download(`${c.id}.json`, JSON.stringify(c, null, 2), "application/json")}>Download JSON</button>
                </div>
              </section>

              <section className="card ledger">
                <h2>Evidence ledger <span className="sub">{c.evidence.length} sources</span></h2>
                <table><thead><tr><th>ID</th><th>Source</th><th>Retrieved</th></tr></thead><tbody>
                  {c.evidence.map(e => (
                    <tr key={e.id} id={`ev-${e.id}`} className={drawer?.evId === e.id ? "hl" : ""}>
                      <td className="id"><button className="ev" onClick={() => openEv(e.id)}>{e.id}</button></td>
                      <td>{e.kind === "crustdata" ? "CrustData" : e.kind === "web" ? "Web search" : e.kind === "derived" ? "Derived (rule)" : "Submitted request"}{e.endpoint ? <span className="mono muted"> {e.endpoint}</span> : null}{e.recordId ? <span className="mono"> · id {String(e.recordId)}</span> : null}{e.note ? ` · ${String(e.note).slice(0, 120)}` : ""}{e.cached ? <span className="muted"> · from cache</span> : null}</td>
                      <td className="time">{fmtDate(e.retrievedAt)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </section>
            </>
          )}
        </div>

        {/* ---------- right rail: activity, trace, run status ---------- */}
        <div className="rail">
          <div>
            {c?.heartbeat && (
              <section className="card">
                <h2>Company activity <span className="sub">Heartbeat · context, not a verdict</span></h2>
                <div className={`hb-score ${c.heartbeat.coverage < 0.5 ? "low" : ""}`}><b>{c.heartbeat.score ?? "—"}</b><span>{c.heartbeat.band} · coverage {Math.round(c.heartbeat.coverage * 100)}%{c.heartbeat.asOf ? ` · data to ${c.heartbeat.asOf}` : ""}</span></div>
                <svg className="ecg" viewBox="0 0 300 64" role="img" aria-label={`Activity pulse, score ${c.heartbeat.score ?? "low signal"}`}>
                  <polyline key={c.id} fill="none" stroke="#0f4c81" strokeWidth="2" points={ecgPoints(c.heartbeat.score)} />
                </svg>
                {c.heartbeat.components.map(x => (
                  <div key={x.name} className={`comp ${x.score === undefined ? "miss" : ""}`}>
                    <span>{x.name} <span className="muted">· weight {x.weight}</span></span>
                    <div className="bar" aria-hidden><i style={{ width: `${x.score ?? 0}%` }} /></div>
                    <span className="val">{x.score ?? "n/a"}</span>
                    <small>{x.value ?? `not counted — ${x.missingReason}`}{x.note ? ` — ${x.note}` : ""}</small>
                  </div>
                ))}
                <div className="notefraud">Weighted mean of components that have data; missing data is left out, never scored as zero. This describes observed activity only and is <b>not a fraud or legitimacy signal</b>.</div>
              </section>
            )}
          </div>

          <div>
            <section className="card">
              <h2>Agent trace <span className="sub">{running ? "live" : `${events.length} steps`}</span></h2>
              <ol className="trace" ref={traceRef} aria-live="polite" aria-relevant="additions">
                {events.filter(e => apiDetail || e.agent !== "investigator" || !/^company_|^person_|^job_|^web_/.test(e.step) || e.status !== "ok" || e.credits).map((e, i) => (
                  <li key={i} className={e.status}>
                    <span className="ico" aria-hidden>{TRACE_ICON[e.status]}</span>
                    <span className="who">{AGENT[e.agent] ?? e.agent}</span>{e.brain && e.brain !== "rules" ? <span className="muted"> · {e.brain}</span> : null} — {e.step}
                    {e.status === "fallback" || e.status === "skipped" || e.status === "failed" ? <span className="api">{e.detail}</span> : apiDetail && e.detail ? <span className="api"><span className="t">{(e.t / 1000).toFixed(1)}s</span>{e.detail}</span> : null}
                  </li>
                ))}
                {!events.length && <li className="info">Waiting for a request.</li>}
              </ol>
              <button className="toggle" onClick={() => setApiDetail(v => !v)} aria-pressed={apiDetail}>{apiDetail ? "Hide API details" : "Show API details"}</button>
            </section>

            <section className="card">
              <h2>Run status <span className="sub">credits and model</span></h2>
              <div className="kvs"><span>This run</span><b>{Math.round(runCredits * 100) / 100} of {perRun} credits</b></div>
              <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, (runCredits / perRun) * 100)}%` }} /></div>
              <div className="kvs">
                <span>CrustData calls · cache hits</span><b>{c ? `${c.spend.crustdataCalls} · ${c.spend.cacheHits}` : "—"}</b>
                <span>LLM calls</span><b>{c ? `${c.spend.llmCalls} (${c.spend.llmTokens.toLocaleString()} tokens)` : "—"}</b>
                <span>App spend so far</span><b>{status ? Math.round(status.ledger.crustdataCredits * 100) / 100 : "—"} of {status?.budget.total ?? "—"}</b>
              </div>
              <details className="diag">
                <summary>Model chain and account</summary>
                <div className="kvs" style={{ marginTop: 6 }}>
                  <span>Brain</span><b className="mono" style={{ fontWeight: 400 }}>{status?.brain ?? "—"}</b>
                  <span>Account balance</span><b>{status?.credits?.toLocaleString() ?? "—"}</b>
                </div>
                <p className="note">The LLM extracts, judges news relevance and drafts prose. Every status and outcome is decided by rules. Over-cap steps are skipped and listed in the trace.</p>
              </details>
            </section>
          </div>
        </div>
      </main>

      {drawer && (
        <>
          <div className="drawer-back" onClick={() => setDrawer(null)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Source detail">
            <button ref={closeRef} className="close" onClick={() => setDrawer(null)} aria-label="Close source detail">✕</button>
            {drawer.finding ? <>
              <h2>{drawer.finding.check}</h2>
              <p style={{ marginTop: 0 }}><span className={`st ${drawer.finding.status}`}><span aria-hidden>{ICON[drawer.finding.status]}</span>{LABEL[drawer.finding.status]}</span> <span className="mono muted">{drawer.finding.rule}</span></p>
              <dl className="kv">
                <dt>Claim</dt><dd>{drawer.finding.claim}</dd>
                {drawer.finding.submitted && <><dt>Submitted</dt><dd>{drawer.finding.submitted}</dd></>}
                <dt>Observed</dt><dd>{drawer.finding.observed}</dd>
                <dt>Why</dt><dd>{drawer.finding.reason}</dd>
              </dl>
            </> : <h2>Source {drawer.evId}</h2>}
            {drawerEvidence.length === 0 && <p className="note">No source record: this check did not run or applies by policy.</p>}
            {drawerEvidence.map(e => (
              <div key={e.id} className={`srcitem ${drawer.evId === e.id ? "hl" : ""}`}>
                <dl>
                  <dt>Source</dt><dd><b>{e.id}</b> · {e.kind === "crustdata" ? "CrustData" : e.kind === "web" ? "Web search" : e.kind === "derived" ? "Derived by rule" : "Submitted request"}{e.endpoint ? <span className="mono"> {e.endpoint}</span> : null}</dd>
                  {e.recordId !== undefined && <><dt>Record</dt><dd className="mono">{String(e.recordId)}</dd></>}
                  {e.fieldPath && <><dt>Fields</dt><dd className="mono">{e.fieldPath}</dd></>}
                  {e.url && <><dt>URL</dt><dd><a href={e.url} target="_blank" rel="noreferrer">{e.url}</a></dd></>}
                  {e.note && <><dt>Note</dt><dd>{String(e.note)}</dd></>}
                  <dt>Retrieved</dt><dd>{fmtDate(e.retrievedAt)}{e.cached ? " · served from cache" : ""}</dd>
                </dl>
                {e.value !== undefined && <pre>{typeof e.value === "string" ? e.value : JSON.stringify(e.value, null, 2)}</pre>}
              </div>
            ))}
          </aside>
        </>
      )}

      <footer className="foot">SignalGate never contacts people, files reports or moves money; every action is a labelled local simulation. Statuses and outcomes are decided by rules; the LLM only extracts, judges relevance and drafts prose from cited findings.</footer>
    </>
  );
}
