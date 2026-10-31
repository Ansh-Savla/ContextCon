"use strict";
/* Sightline — single-company investor profile on the Crustdata identity graph */

// ---------- utils ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const isNum = (v) => typeof v === "number" && isFinite(v);
const money = (v) => !isNum(v) ? "—" : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`;
const compact = (v) => !isNum(v) ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}K` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`;
const num = (v) => !isNum(v) ? "—" : Math.round(v).toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d, withDay = false) {
  if (!d) return "";
  const s = String(d);
  if (s === "now") return "now";
  const m = s.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return s;
  if (!m[2]) return m[1];
  return `${withDay && m[3] ? +m[3] + " " : ""}${MONTHS[+m[2] - 1]} ${m[1]}`;
}
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
const fact = (m, k) => { const f = m?.facts?.[k]; return f && typeof f === "object" && "value" in f ? f.value : f; };
const factEv = (m, k) => m?.facts?.[k]?.ev;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
function delta(v, suffix = "") {
  if (!isNum(v)) return "";
  const cls = v > 0.5 ? "up" : v < -0.5 ? "down" : "flat";
  const arrow = v > 0.5 ? "▲" : v < -0.5 ? "▼" : "■";
  return `<span class="delta ${cls}"><span aria-hidden="true">${arrow}</span> ${v > 0 ? "+" : ""}${v.toFixed(0)}%${suffix}</span>`;
}
const ICON = {
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  ind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V10l5 3V9l5 3V5h4v16"/></svg>',
  ppl: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/></svg>',
  li: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.2v.1M12 17v-3.8c0-1.6 1-2.7 2.4-2.7s2.1 1 2.1 2.7V17M12 10.5V17"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 2.8 19.5h18.4L12 3.5z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>',
};

// ---------- state ----------
const state = { status: null, memo: null, entry: null, context: "", charts: [], research: null, researchTab: "overview", lastFocus: null, runId: 0 };

// ---------- evidence chips ----------
function evChip(id) {
  if (!id || !state.memo) return "";
  const ev = (state.memo.evidence || []).find((e) => e.id === id);
  const web = ev && ev.kind === "WEB";
  const title = ev ? `${ev.label || ""}${ev.recorded_at ? ` · recorded ${ev.recorded_at}` : ""}` : id;
  return `<button type="button" class="evchip${web ? " web" : ""}" data-ev="${esc(id)}" title="${esc(title)}" aria-label="Evidence ${esc(id)}: ${esc(title)}">${esc(id)}</button>`;
}
const evChips = (ids) => (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(evChip).join("");

// ---------- images (hide on failure / never loads offline) ----------
function imgTag(src, alt = "") {
  const u = safeUrl(src);
  return u ? `<img src="${esc(u)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" data-fallback>` : "";
}
function wireImages(root) {
  $$("img[data-fallback]", root).forEach((img) => {
    const kill = () => img.remove();
    img.addEventListener("error", kill, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.src) kill();
    setTimeout(() => { if (img.isConnected && !img.naturalWidth) kill(); }, 6000);
  });
}

// ---------- sparkline (inline SVG, no axes) ----------
function spark(series, label) {
  const pts = (series || []).filter((p) => isNum(p?.value));
  if (pts.length < 3) return "";
  const w = 76, h = 28, vals = pts.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * (w - 4) + 2, h - 3 - ((p.value - min) / span) * (h - 6)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><path d="${d} L${lx},${h} L2,${h}Z" fill="currentColor" opacity=".08"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="2.4" fill="currentColor"/></svg>`;
}

// ---------- status & examples ----------
async function loadStatus() {
  const pill = $("#mode-pill");
  try {
    const s = await (await fetch("/api/status")).json();
    state.status = s;
    pill.className = `source-badge ${s.mode === "live" ? "live" : "replay"}`;
    $(".txt", pill).textContent = s.mode === "live" ? "Live Crustdata API" : "Recorded Crustdata data";
    pill.title = s.mode === "live"
      ? "Responses are fetched live from the Crustdata API (spends credits) and cached."
      : `Replay mode: answers come from ${s.fixtures ?? "?"} recorded real Crustdata responses. Inputs outside the recording show as not in cache.`;
  } catch {
    $(".txt", pill).textContent = "Server unreachable";
  }
}

function splitLine(line) {
  let t = String(line || "").trim().replace(/^\|+|\|+$/g, "").trim();
  let name = t, ctx = "";
  const m = t.match(/^(.*?)\s+(?:—|–|\||-{1,2})\s+(.*)$/);
  if (m) { name = m[1].trim(); ctx = m[2].replace(/\|/g, " ").replace(/\bsharktankseason\b/gi, "").replace(/\s+/g, " ").trim(); }
  return { name, ctx };
}

async function loadExamples() {
  const box = $("#examples");
  try {
    const list = await (await fetch("/api/examples")).json();
    const picks = [];
    for (const x of list || []) {
      const lines = String(x.text || "").split(/\n/).map((l) => l.trim()).filter((l) => l && !/^\|?\s*[-:|\s]+\|?$/.test(l));
      if (lines.length <= 1) {
        const { name, ctx } = splitLine(lines[0] || x.title);
        picks.push({ name, ctx, raw: lines[0] || "", title: x.title || name, about: x.about || ctx });
      } else {
        for (const l of lines) { const { name, ctx } = splitLine(l); if (name && !/^company$/i.test(name)) picks.push({ name, ctx, raw: l, title: name, about: ctx }); }
      }
    }
    box.innerHTML = picks.slice(0, 14).map((p, i) =>
      `<button type="button" class="ex" role="listitem" data-i="${i}" title="${esc(p.about || "")}">${esc(p.title)}${p.about && p.about !== p.title ? `<small>${esc(p.about)}</small>` : ""}</button>`).join("");
    $$(".ex", box).forEach((b) => b.addEventListener("click", () => {
      const p = picks[+b.dataset.i];
      $("#q").value = p.raw || (p.ctx ? `${p.name} — ${p.ctx}` : p.name);
      run();
    }));
  } catch {
    box.innerHTML = `<span class="examples-label">Samples unavailable</span>`;
  }
}

// ---------- progress ----------
const STAGE_STEP = { intake: 0, resolve: 1, research: 2, reconcile: 3, score: 3 };
function setStep(i, err = false) {
  $$("#steps li").forEach((li) => {
    const n = +li.dataset.step;
    li.classList.toggle("done", n < i || (i === 4 && n === 4));
    li.classList.toggle("active", n === i && i < 4 && !err);
    li.classList.toggle("err", err && n === i);
  });
}
function logLine(stage, label, msg) {
  const li = document.createElement("li");
  if (stage === "error") li.className = "err";
  li.innerHTML = `<span class="stg">${esc(stage)}</span>${label ? `<b>${esc(label)}</b> — ` : ""}${esc(msg)}`;
  const t = $("#ticker"); t.appendChild(li); t.scrollTop = t.scrollHeight;
}

// ---------- run ----------
async function run() {
  const text = $("#q").value.trim();
  if (!text) { $("#q").focus(); return; }
  const { name, ctx } = splitLine(text);
  const runId = ++state.runId;
  state.memo = null; state.entry = { name }; state.context = ctx; state.research = null; state.fin = null; state.strict = false; state.researchTab = "overview";
  document.body.classList.add("has-run");
  $("#progress").hidden = false; $("#ticker").innerHTML = ""; $("#run-stats").textContent = "";
  setStep(0); $("#step-msg").textContent = `Reading “${text}”`;
  disposeCharts();
  $("#profile").innerHTML = skeletonProfile(name);
  const btn = $("#run"); btn.disabled = true; $("span", btn).textContent = "Analyzing…";
  try {
    const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || res.statusText);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (line && runId === state.runId) { try { handle(JSON.parse(line)); } catch (e) { console.warn("bad event", e); } }
      }
    }
    if (buf.trim() && runId === state.runId) handle(JSON.parse(buf));
    if (runId === state.runId && !state.memo) throw new Error("The analysis finished without a profile.");
  } catch (e) {
    if (runId !== state.runId) return;
    setStep(+($("#steps li.active")?.dataset.step ?? 1), true);
    $("#step-msg").textContent = `Analysis failed: ${e.message}`;
    $("#profile").innerHTML = `<div class="card error-banner reveal"><h3>Couldn’t build this profile</h3><p class="muted">${esc(e.message)}. Check the server log and try again.</p></div>`;
  } finally {
    if (runId === state.runId) { btn.disabled = false; $("span", btn).textContent = "Analyze"; }
  }
}

function handle(ev) {
  if (ev.type === "start") {
    if (ev.entries?.[0]) state.entry = ev.entries[0];
    logLine("start", "", `${ev.count ?? 1} company parsed · ${ev.mode || ""} mode`);
  } else if (ev.type === "stage") {
    const step = STAGE_STEP[ev.stage];
    if (step != null) setStep(step);
    if (ev.stage !== "error") $("#step-msg").textContent = ev.msg || "";
    logLine(ev.stage || "stage", ev.label, ev.msg);
  } else if (ev.type === "result") {
    state.memo = ev.memo || {};
    setStep(4);
    $("#step-msg").textContent = "Profile ready. Web research loading in the background.";
    renderProfile();
    loadResearch();
    loadFinancials();
  } else if (ev.type === "done") {
    const credits = ev.mode === "live" ? `${ev.credits_live ?? 0} credits spent` : `${ev.credits_replayed ?? 0} credits replayed · 0 spent`;
    $("#run-stats").textContent = `${ev.calls ?? 0} Crustdata calls · ${credits}`;
    logLine("done", "", `${ev.calls} calls; ${credits}${ev.cache_misses ? `; ${ev.cache_misses} requests not in the replay cache` : ""}`);
  }
}

function skeletonProfile(name) {
  const bars = (n) => Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${90 - i * 14}%"></div>`).join("");
  return `<div class="co-head solo"><div class="card co-main"><div class="co-logo">${esc(initials(name))}</div><div style="flex:1"><h1 class="sr">${esc(name)}</h1><div class="skel" style="height:24px;width:40%"></div>${bars(3)}</div></div></div>
  <div class="kpis">${Array.from({ length: 6 }, () => `<div class="card kpi">${bars(3)}</div>`).join("")}</div>`;
}

// ---------- activity ----------
function activityOf(m) {
  if (m.activity?.state) return m.activity;
  const v = (m.status?.verdict || "").toUpperCase();
  if (v.startsWith("OPERATING")) return { state: "active", label: "Active" };
  if (v.startsWith("ACQUIRED")) return { state: "acquired", label: m.exit?.acquirer ? `Acquired by ${m.exit.acquirer}` : "Acquired" };
  if (v.startsWith("DEFUNCT")) return { state: "closed", label: "Closed" };
  if (v.startsWith("DORMANT")) return { state: "dormant", label: "Low activity" };
  return { state: "unknown", label: "Not verified" };
}

// ---------- render: profile ----------
function renderProfile() {
  const m = state.memo;
  disposeCharts();
  const resolved = isResolved(m);
  state.strict = !resolved;
  const parts = [renderHeader(m, resolved)];
  if (resolved) {
    parts.push(renderKpis(m));
    parts.push(`<section class="section" aria-labelledby="h-analysis"><div class="section-head"><h2 id="h-analysis">Analysis</h2><span class="note">Crustdata time series · hover for values</span></div><div class="charts" id="charts"></div></section>`);
    parts.push(renderFounders(m));
    parts.push(renderFinancials(m));
  } else {
    parts.push(renderUnresolved(m));
    parts.push(`<section class="section" aria-labelledby="h-web" id="webpanel"><div class="section-head"><h2 id="h-web">From the web <span class="unv">unverified</span></h2><span class="note">Web research via Tavily, limited to sources that name this company</span></div><div id="web-body"></div></section>`);
  }
  if (resolved) parts.push(`<section class="section" aria-labelledby="h-research" id="research-sec"><div class="section-head"><h2 id="h-research">Company research</h2><span class="note">Web research via Tavily · AI summaries are labelled and cited</span></div><div class="card" id="research"></div></section>`);
  if (resolved) parts.push(renderRisks(m, resolved));
  const root = $("#profile");
  root.innerHTML = parts.join("");
  root.classList.remove("reveal"); void root.offsetWidth; root.classList.add("reveal");
  wireImages(root);
  if (resolved) { renderCharts(m); renderResearch(); renderPnl(); } else renderWebPanel();
  const desc = $(".co-desc", root);
  if (desc) {
    const t = $(".txt", desc), b = $(".link-btn", desc);
    requestAnimationFrame(() => { if (t.scrollHeight <= t.clientHeight + 2) b.hidden = true; });
    b.addEventListener("click", () => { const o = desc.classList.toggle("open"); b.textContent = o ? "Show less" : "Read more"; b.setAttribute("aria-expanded", o); });
  }
}

function isResolved(m) {
  const st = String(m.resolution?.status || "").toUpperCase();
  return st ? st === "RESOLVED" : Object.keys(m.facts || {}).length > 0;
}
function typedName(m) {
  return state.entry?.name || splitLine(state.entry?.raw || $("#q").value).name || m.name || "this company";
}
function renderHeader(m, resolved) {
  const name = resolved ? (m.name || state.entry?.name || "Unknown company") : typedName(m);
  const act = activityOf(m);
  const domain = fact(m, "domain"), li = safeUrl(fact(m, "linkedin")), hq = fact(m, "hq"), founded = fact(m, "founded"), industry = fact(m, "industry"), size = fact(m, "size_bucket"), desc = fact(m, "description");
  const domUrl = domain ? safeUrl(/^https?:/.test(domain) ? domain : `https://${domain}`) : null;
  const meta = [
    domUrl ? `<a href="${esc(domUrl)}" target="_blank" rel="noopener noreferrer">${ICON.globe}${esc(domain)}</a>` : "",
    hq ? `<span>${ICON.pin}${esc(hq)}</span>` : "",
    founded ? `<span>${ICON.cal}Founded ${esc(founded)}</span>` : "",
    industry ? `<span>${ICON.ind}${esc(industry)}</span>` : "",
    size ? `<span>${ICON.ppl}${esc(size)} employees</span>` : "",
    li ? `<a href="${esc(li)}" target="_blank" rel="noopener noreferrer">${ICON.li}LinkedIn</a>` : "",
  ].filter(Boolean).join("");
  const specs = (fact(m, "specialities") || []).slice(0, 8);
  const ev = evChips([factEv(m, "domain")]);
  return `<div class="co-head solo">
    <section class="card co-main" aria-labelledby="co-name">
      <div class="co-logo" aria-hidden="true">${esc(initials(name))}${imgTag(fact(m, "logo"))}</div>
      <div style="min-width:0;flex:1">
        <div class="co-title"><h1 id="co-name">${esc(name)}</h1><span class="pill ${esc(act.state)}"><span class="dot" aria-hidden="true"></span>${esc(act.label)}</span>${ev}</div>
        ${meta ? `<div class="co-meta">${meta}</div>` : ""}
        ${act.detail ? `<p class="activity-detail">${esc(act.detail)}</p>` : ""}
        ${desc ? `<div class="co-desc"><p class="txt">${esc(desc)}</p><button type="button" class="link-btn" aria-expanded="false">Read more</button></div>` : ""}
        ${specs.length ? `<div class="tags">${specs.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>` : ""}
      </div>
    </section>
  </div>`;
}

function renderSignal(m) {
  const s = m.score || {};
  const dims = s.dims || {};
  const names = { team: "Team", traction: "Traction", funding: "Funding", risk: "Risk", data_confidence: "Data confidence" };
  const rows = Object.keys(names).filter((k) => isNum(dims[k])).map((k) =>
    `<div class="dim"><span>${names[k]}</span><span class="bar" role="img" aria-label="${names[k]} ${dims[k]} of 5"><i style="width:${(dims[k] / 5) * 100}%"></i></span><b>${dims[k]}</b></div>`).join("");
  return `<details class="card score-card">
    <summary><span class="sc-title"><b>Experimental score</b><span class="sc-cav">Rule-based heuristic for ranking; not investment advice.</span></span>
      <span class="sc-val num">${isNum(s.overall) ? `${s.overall}<small> / 100</small>` : "Not scored"}${s.label ? ` <span class="signal-label">· ${esc(s.label)}</span>` : ""}</span></summary>
    <div class="sc-body">${rows ? `<div class="dims">${rows}</div>` : ""}${s.reason ? `<p class="fine">${esc(s.reason)}</p>` : ""}</div>
  </details>`;
}

function renderResolutionCard(m) {
  const r = m.resolution || {};
  return `<aside class="card signal" aria-label="Identity resolution">
    <div class="signal-top"><h3>Identity</h3></div>
    <div class="signal-score" style="font-size:20px">${esc(titleCase(String(r.status || "Unresolved").toLowerCase()))}</div>
    <p class="fine">${esc(r.method || "")}${r.notes ? ` · ${esc(Array.isArray(r.notes) ? r.notes.join("; ") : r.notes)}` : ""}</p>
  </aside>`;
}

function renderUnresolved(m) {
  const r = m.resolution || {};
  const st = String(r.status || "UNRESOLVED").toUpperCase();
  const name = typedName(m);
  const cands = (r.candidates || []).filter((c) => c && c.name);
  const notes = Array.isArray(r.notes) ? r.notes.join("; ") : r.notes || "";
  let title, body, extra = "", tone = "warn";
  if (st === "OFFLINE") {
    tone = "info";
    title = `Crustdata data unavailable for “${esc(name)}”`;
    body = `Live Crustdata lookups aren’t configured on this server and ${esc(name)} isn’t in the recorded sample set. This doesn’t mean the company doesn’t exist.`;
  } else if (st === "NEEDS_REVIEW" || st === "NEEDS REVIEW") {
    title = `Several companies match “${esc(name)}”`;
    body = "Crustdata found more than one plausible company with this name. Pick one to run its profile.";
    extra = cands.length ? `<ul class="cands pick">${cands.slice(0, 6).map((c) => `<li><div><b>${esc(c.name)}</b>${c.industries?.length ? ` <span class="muted">· ${esc([].concat(c.industries)[0])}</span>` : ""}${c.description ? `<div class="c-desc">${esc(String(c.description).slice(0, 140))}${String(c.description).length > 140 ? "…" : ""}</div>` : ""}</div>${c.domain ? `<button type="button" class="btn-ghost sm" data-rerun="${esc(c.domain)}" aria-label="Analyze ${esc(c.name)} (${esc(c.domain)})">${esc(c.domain)} <span aria-hidden="true">→</span></button>` : `<span class="muted" style="font-size:12.5px">no domain</span>`}</li>`).join("")}</ul>` : "";
  } else {
    title = `Crustdata has no record of “${esc(name)}”`;
    body = "The Crustdata identity graph was searched and no company matched with enough confidence, so there are no verified facts, founders or metrics.";
    const top = cands.slice(0, 3);
    extra = `${notes ? `<p class="fine-note">${esc(notes)}</p>` : ""}${top.length ? `<p class="fine-note">Considered and rejected: ${top.map((c) => `${esc(c.name)}${c.domain ? ` (${esc(c.domain)})` : ""}`).join(", ")}</p>` : ""}`;
  }
  return `<section class="section" style="margin-top:16px"><div class="card empty-state banner-${tone}">
    <div class="empty-ico">${ICON.warn}</div>
    <div><h2>${title}</h2><p>${body}</p>${extra}</div>
  </div></section>`;
}

function renderWebPanel() {
  const box = $("#web-body");
  if (!box) return;
  const r = state.research || { loading: true };
  const name = esc(typedName(state.memo || {}));
  if (r.loading) {
    box.innerHTML = `<div class="card card-pad web-skel" aria-busy="true"><p class="muted" style="font-size:13px;margin-bottom:12px">Searching the web for sources that name ${name}…</p>${[92, 84, 88, 60].map((w) => `<div class="skel" style="width:${w}%"></div>`).join("")}</div>`;
    return;
  }
  if (r.error) {
    box.innerHTML = `<div class="card pnl-empty"><div class="empty-ico">${ICON.globe.replace("<svg", '<svg fill="none" stroke="currentColor" stroke-width="1.8"')}</div><div><h3>Web research unavailable</h3><p>${esc(r.error)}</p></div></div>`;
    return;
  }
  const secs = r.sections || {};
  const anySrc = Object.values(secs).some((x) => (x?.sources || []).length || x?.answer);
  const found = r.found_on_web !== false && anySrc;
  if (!found) {
    box.innerHTML = `<div class="card pnl-empty"><div class="empty-ico">${ICON.globe.replace("<svg", '<svg fill="none" stroke="currentColor" stroke-width="1.8"')}</div><div><h3>No reliable web information about ${name} either.</h3><p>${esc(r.note || "No web sources that clearly refer to this company were found.")}</p></div></div>`;
    return;
  }
  box.innerHTML = `${r.note ? `<p class="web-note">${esc(r.note)}</p>` : ""}<div class="card" id="research"></div><div id="pnl" style="margin-top:16px"></div>`;
  renderResearch();
  renderPnl();
}

// ---------- KPIs ----------
function renderKpis(m) {
  const mt = m.metrics || {};
  const hc = mt.headcount || {}, web = mt.web || {}, fol = mt.followers || {}, rev = mt.revenue || {}, jobs = mt.jobs || {}, fun = m.funding || {};
  const tile = (label, value, foot, ev, small = false) => {
    const empty = value == null || value === "—";
    return `<div class="card kpi${empty ? " empty" : ""}"><div class="k-label"><span>${label}</span>${evChips(ev)}</div><div class="k-value num${small ? " sm" : ""}">${empty ? "—" : value}</div><div class="k-foot">${foot || ""}</div></div>`;
  };
  const hcFoot = `${isNum(hc.two_years) ? `${delta(hc.two_years)}<span>2y</span>` : isNum(hc.yoy) ? `${delta(hc.yoy)}<span>YoY</span>` : "<span>no history</span>"}${spark(hc.series, "Headcount trend")}`;
  const raisedFoot = isNum(fun.rounds) && fun.rounds ? `<span>${fun.rounds} round${fun.rounds > 1 ? "s" : ""}${fun.last_type ? ` · last ${esc(titleCase(fun.last_type))}` : ""}${fun.last_date ? `, ${esc(fmtDate(fun.last_date))}` : ""}</span>` : "<span>no recorded rounds</span>";
  const revVal = isNum(rev.lower) && isNum(rev.upper) ? `${money(rev.lower)}–${money(rev.upper)}` : isNum(rev.lower) ? `${money(rev.lower)}+` : null;
  const revFoot = rev.verdict ? `<span class="verdict-tag ${esc(rev.verdict)}" title="${esc(rev.reason || "")}">${esc(rev.verdict)}</span><span>Crustdata model</span>` : "<span>Crustdata model</span>";
  const webFoot = `${isNum(web.mom) ? `${delta(web.mom)}<span>MoM</span>` : "<span></span>"}${spark(web.series, "Web traffic trend")}`;
  const folFoot = isNum(fol.yoy) ? `${delta(fol.yoy)}<span>YoY</span>` : "";
  const titles = (jobs.titles || []).slice(0, 2).map((t) => esc(typeof t === "string" ? t : t?.title)).join(", ");
  return `<div class="kpis" role="list" aria-label="Key metrics">
    ${tile("Headcount", isNum(hc.now) ? num(hc.now) : null, hcFoot, hc.ev)}
    ${tile("Total raised", isNum(fun.total) && fun.total > 0 ? money(fun.total) : null, raisedFoot, fun.ev)}
    ${tile("Revenue estimate", revVal, revFoot, rev.ev, true)}
    ${tile("Web visits / month", isNum(web.last) ? compact(web.last) : null, webFoot, web.ev)}
    ${tile("LinkedIn followers", isNum(fol.count) ? compact(fol.count) : null, folFoot, fol.ev)}
    ${tile("Open jobs", isNum(jobs.total) ? num(jobs.total) : null, titles ? `<span title="${titles}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${titles}</span>` : "<span>none listed</span>", jobs.ev)}
  </div>`;
}

// ---------- charts ----------
const C = { ink: "#0b1324", ink2: "#334155", muted: "#5b6678", line: "#e3e7ee", grid: "#eef1f5", navy: "#1d3a66", s: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"] };
const FONT = getComputedStyle(document.documentElement).getPropertyValue("--font").trim() || "system-ui, sans-serif";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function baseOpt() {
  return {
    animation: !reduceMotion, animationDuration: 600,
    textStyle: { fontFamily: FONT, color: C.ink2 },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: { backgroundColor: "#0b1b33", borderWidth: 0, padding: [8, 12], textStyle: { color: "#fff", fontSize: 12.5, fontFamily: FONT }, extraCssText: "border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);" },
  };
}
const timeAxis = () => ({ type: "time", axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted, fontSize: 11.5, hideOverlap: true }, splitLine: { show: false } });
const valAxis = (fmt) => ({ type: "value", axisLabel: { color: C.muted, fontSize: 11.5, formatter: fmt }, splitLine: { lineStyle: { color: C.grid } }, axisLine: { show: false }, axisTick: { show: false } });

function disposeCharts() { state.charts.forEach((c) => { try { c.dispose(); } catch {} }); state.charts = []; }
function mountChart(el, opt) {
  if (!window.echarts) { el.innerHTML = `<p class="muted" style="padding:20px">Chart library failed to load.</p>`; return; }
  const c = echarts.init(el, null, { renderer: "canvas" });
  c.setOption(opt);
  state.charts.push(c);
}
let resizeT;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => state.charts.forEach((c) => c.resize()), 120); });

function chartCard(id, title, sub, opts = {}) {
  return `<div class="card chart-card ${opts.w || ""}"><div class="chart-head"><div><h3>${esc(title)}</h3>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${opts.big ? `<div class="big num">${opts.big}</div>` : ""}</div>
    <div class="chart${opts.tall ? " tall" : ""}" id="${id}" role="img" aria-label="${esc(opts.aria || title)}"></div>${opts.caption ? `<div class="chart-caption">${opts.caption}</div>` : ""}</div>`;
}

function renderCharts(m) {
  const mt = m.metrics || {};
  const box = $("#charts");
  const plan = [];
  const ser = (s) => (s || []).filter((p) => p && p.date && isNum(p.value)).map((p) => [p.date, p.value]);

  const hc = ser(mt.headcount?.series);
  const rounds = (m.deals?.recorded || []).filter((r) => r.date).sort((a, b) => String(a.date).localeCompare(b.date));
  const rev = (mt.revenue?.series || []).filter((p) => p && p.date && (isNum(p.lower) || isNum(p.upper)));
  const web = ser(mt.web?.series);
  const src = mt.web?.sources || {};
  const roles = Object.entries(mt.headcount?.by_role || {}).filter(([, v]) => isNum(v) && v > 0).sort((a, b) => b[1] - a[1]);
  const regions = Object.entries(mt.headcount?.by_region || {}).filter(([, v]) => isNum(v) && v > 0).sort((a, b) => b[1] - a[1]);
  const sub = mt.reviews?.sub || {};
  const subKeys = [["work_life_balance", "Work-life"], ["culture_and_values", "Culture"], ["senior_management", "Leadership"], ["compensation_and_benefits", "Pay"], ["career_opportunities", "Career"], ["diversity_and_inclusion", "Diversity"]].filter(([k]) => isNum(sub[k]));
  const reviews = mt.reviews || {};
  const seo = mt.seo || {};

  if (hc.length >= 2) {
    const first = hc[0][1], last = hc[hc.length - 1][1];
    plan.push({ id: "c-hc", w: rounds.length ? "w8" : "w12", title: "Headcount over time", sub: `${fmtDate(hc[0][0])} – ${fmtDate(hc[hc.length - 1][0])} · ${num(first)} → ${num(last)} employees`, big: num(last), caption: `Source: Crustdata headcount history ${evChips(mt.headcount?.ev)}`,
      opt: { ...baseOpt(), xAxis: timeAxis(), yAxis: valAxis((v) => compact(v)),
        tooltip: { ...baseOpt().tooltip, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "#9fb0c8" } }, valueFormatter: (v) => `${num(v)} employees` },
        series: [{ type: "line", data: hc, smooth: 0.25, symbol: "circle", symbolSize: 6, showSymbol: false, lineStyle: { width: 2, color: C.s[0] }, itemStyle: { color: C.s[0], borderColor: "#fff", borderWidth: 2 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(42,120,214,.22)" }, { offset: 1, color: "rgba(42,120,214,0)" }]) } }] } });
  }
  if (rounds.length) {
    let cum = 0;
    const many = rounds.length > 4;
    const shortType = (t) => titleCase(String(t || "round").replace(/^series_/i, "").replace(/_?unknown$/i, "") || "Round");
    const cats = rounds.map((r) => many ? `${shortType(r.type)}\n${String(r.date).slice(0, 4)}` : `${titleCase(r.type || "round")}\n${fmtDate(r.date)}`);
    const amts = rounds.map((r) => (isNum(r.amount) ? r.amount : null));
    const cums = rounds.map((r) => (cum += isNum(r.amount) ? r.amount : 0));
    if (many && plan[0]?.id === "c-hc") plan[0].w = "w6";
    plan.push({ id: "c-fund", w: hc.length >= 2 ? (many ? "w6" : "w4") : "w12", title: "Funding rounds", sub: `${rounds.length} round${rounds.length > 1 ? "s" : ""} · cumulative line`, big: money(m.funding?.total || cum), caption: `Bars: round size · line: total raised to date ${evChips(m.funding?.ev)}`,
      opt: { ...baseOpt(), grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
        xAxis: { type: "category", data: cats, axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted, fontSize: 11, interval: rounds.length > 8 ? "auto" : 0, lineHeight: 15, hideOverlap: true } },
        yAxis: valAxis((v) => money(v)),
        tooltip: { ...baseOpt().tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(29,58,102,.06)" } },
          formatter: (ps) => { const i = ps[0].dataIndex, r = rounds[i]; return `<b>${esc(titleCase(r.type))}</b> · ${esc(fmtDate(r.date, true))}<br>Round: ${money(r.amount)}<br>Raised to date: ${money(cums[i])}${r.lead ? `<br>Lead: ${esc(r.lead)}` : ""}`; } },
        series: [
          { name: "Round", type: "bar", data: amts, barMaxWidth: 34, itemStyle: { color: C.navy, borderRadius: [4, 4, 0, 0] } },
          { name: "Raised to date", type: "line", data: cums, symbol: "circle", symbolSize: 8, lineStyle: { width: 2, color: "#c9a14a" }, itemStyle: { color: "#c9a14a", borderColor: "#fff", borderWidth: 2 } },
        ] } });
  }
  if (rev.length >= 2) {
    const r = mt.revenue || {};
    plan.push({ id: "c-rev", w: "w6", title: "Estimated revenue (Crustdata model)", sub: "Shaded band: lower to upper estimate, USD", big: isNum(r.lower) ? `${money(r.lower)}–${money(r.upper)}` : "",
      caption: `${r.verdict ? `<span class="verdict-tag ${esc(r.verdict)}">${esc(r.verdict)}</span>` : ""}${esc(r.reason || "Model estimate, not reported revenue")} ${evChips(r.ev)}`,
      opt: { ...baseOpt(), xAxis: timeAxis(), yAxis: valAxis((v) => money(v)),
        tooltip: { ...baseOpt().tooltip, trigger: "axis", formatter: (ps) => { const p = rev[ps[0].dataIndex]; return `${esc(fmtDate(p.date))}<br>${money(p.lower)} – ${money(p.upper)}`; } },
        series: [
          { type: "line", data: rev.map((p) => [p.date, p.lower ?? 0]), stack: "band", symbol: "none", lineStyle: { width: 1.5, color: C.s[2] }, areaStyle: { opacity: 0 } },
          { type: "line", data: rev.map((p) => [p.date, Math.max(0, (p.upper ?? p.lower) - (p.lower ?? 0))]), stack: "band", symbol: "none", lineStyle: { width: 0 }, areaStyle: { color: "rgba(27,175,122,.2)" } },
          { type: "line", data: rev.map((p) => [p.date, p.upper ?? p.lower]), symbol: "none", lineStyle: { width: 1.5, color: C.s[2], type: "dashed" }, tooltip: { show: false } },
        ] } });
  }
  if (web.length >= 2) {
    const w = mt.web || {};
    plan.push({ id: "c-web", w: "w6", title: "Web traffic", sub: `Monthly visits · peak ${compact(w.peak)}`, big: compact(w.last), caption: `Source: Crustdata web traffic ${evChips(w.ev)}`,
      opt: { ...baseOpt(), xAxis: timeAxis(), yAxis: valAxis((v) => compact(v)),
        tooltip: { ...baseOpt().tooltip, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "#9fb0c8" } }, valueFormatter: (v) => `${num(v)} visits` },
        series: [{ type: "line", data: web, smooth: 0.2, showSymbol: false, symbolSize: 6, lineStyle: { width: 2, color: C.s[6] }, itemStyle: { color: C.s[6] },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(98,80,214,.18)" }, { offset: 1, color: "rgba(98,80,214,0)" }]) } }] } });
  }
  if (roles.length >= 2) {
    const top = roles.slice(0, 7);
    const rest = roles.slice(7).reduce((a, [, v]) => a + v, 0);
    if (rest) top.push(["Other", rest]);
    const total = roles.reduce((a, [, v]) => a + v, 0);
    plan.push({ id: "c-roles", w: "w6", title: "Team by function", sub: `${num(total)} profiles classified · top ${Math.min(7, roles.length)} functions`, tall: true, caption: `Source: Crustdata headcount by function ${evChips(mt.headcount?.ev)}`,
      opt: { ...baseOpt(), grid: { left: 8, right: 40, top: 6, bottom: 4, containLabel: true },
        xAxis: { type: "value", show: false }, yAxis: { type: "category", inverse: true, data: top.map((r) => r[0]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.ink2, fontSize: 12 } },
        tooltip: { ...baseOpt().tooltip, trigger: "item", formatter: (p) => `${esc(p.name)}: <b>${p.value}</b> (${Math.round((p.value / total) * 100)}%)` },
        series: [{ type: "bar", data: top.map((r) => r[1]), barWidth: 14, itemStyle: { color: C.navy, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: C.muted, fontSize: 11.5, formatter: (p) => `${Math.round((p.value / total) * 100)}%` },
          showBackground: true, backgroundStyle: { color: C.grid, borderRadius: [0, 4, 4, 0] } }] } });
  }
  const srcEntries = [["Search", src.search], ["Direct", src.direct], ["Social", src.social], ["Referral", src.referral], ["Paid", src.paid]].filter(([, v]) => isNum(v) && v > 0);
  if (srcEntries.length >= 2) {
    const sum = srcEntries.reduce((a, [, v]) => a + v, 0);
    if (sum < 99) srcEntries.push(["Other", 100 - sum]);
    plan.push({ id: "c-src", w: "w6", title: "Traffic sources", sub: "Share of web visits by channel", tall: true, caption: `Source: Crustdata web traffic ${evChips(mt.web?.ev)}`,
      opt: { ...baseOpt(), color: [C.s[0], C.s[1], C.s[2], C.s[3], C.s[6], "#b7c1cf"],
        tooltip: { ...baseOpt().tooltip, trigger: "item", formatter: (p) => `${esc(p.name)}: <b>${p.value.toFixed(1)}%</b>` },
        legend: { orient: "vertical", right: 8, top: "middle", icon: "circle", itemWidth: 9, itemGap: 12, textStyle: { color: C.ink2, fontSize: 12.5 }, formatter: (n) => { const e = srcEntries.find((x) => x[0] === n); return `${n}  ${e ? e[1].toFixed(0) : ""}%`; } },
        series: [{ type: "pie", radius: ["52%", "74%"], center: ["36%", "50%"], padAngle: 1.5, itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 }, label: { show: false }, data: srcEntries.map(([n, v]) => ({ name: n, value: v })) }] } });
  }
  if (subKeys.length >= 3) {
    plan.push({ id: "c-rev2", w: "w6", title: "Employee reviews", sub: `${isNum(reviews.rating) ? `${reviews.rating.toFixed(1)} / 5 overall` : ""}${isNum(reviews.count) ? ` · ${num(reviews.count)} reviews` : ""}`, tall: true, caption: `Source: Crustdata employee reviews ${evChips(reviews.ev)}${isNum(reviews.count) && reviews.count < 10 ? " · small sample, read with care" : ""}`,
      opt: { ...baseOpt(), tooltip: { ...baseOpt().tooltip, trigger: "item" },
        radar: { indicator: subKeys.map(([, n]) => ({ name: n, max: 5 })), radius: "66%", splitNumber: 5, axisName: { color: C.ink2, fontSize: 12 }, splitLine: { lineStyle: { color: C.line } }, splitArea: { areaStyle: { color: ["#fff", "#f8f9fb"] } }, axisLine: { lineStyle: { color: C.line } } },
        series: [{ type: "radar", data: [{ value: subKeys.map(([k]) => +sub[k].toFixed(2)), name: "Rating (0–5)" }], symbolSize: 6, lineStyle: { width: 2, color: C.s[0] }, itemStyle: { color: C.s[0] }, areaStyle: { color: "rgba(42,120,214,.15)" } }] } });
  }
  if (regions.length >= 2) {
    const top = regions.slice(0, 8);
    plan.push({ id: "c-reg", w: "w6", title: "Team by location", sub: `Top ${top.length} locations`, tall: true, caption: `Source: Crustdata headcount by region ${evChips(mt.headcount?.ev)}`,
      opt: { ...baseOpt(), grid: { left: 8, right: 36, top: 6, bottom: 4, containLabel: true },
        xAxis: { type: "value", show: false }, yAxis: { type: "category", inverse: true, data: top.map((r) => r[0]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.ink2, fontSize: 12, width: 150, overflow: "truncate" } },
        tooltip: { ...baseOpt().tooltip, trigger: "item", formatter: (p) => `${esc(p.name)}: <b>${p.value}</b>` },
        series: [{ type: "bar", data: top.map((r) => r[1]), barWidth: 14, itemStyle: { color: C.s[2], borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: C.muted, fontSize: 11.5 }, showBackground: true, backgroundStyle: { color: C.grid, borderRadius: [0, 4, 4, 0] } }] } });
  }

  // small stat cards (no chart)
  const statCards = [];
  if (subKeys.length < 3 && (isNum(reviews.rating) || isNum(reviews.count))) {
    statCards.push(`<div class="card chart-card w6 half-md"><h3>Employee reviews</h3><p class="sub">Crustdata employee review summary ${evChips(reviews.ev)}</p><div class="stat-list">
      ${isNum(reviews.rating) ? `<div class="stat-row"><span>Overall rating</span><b class="num">${reviews.rating.toFixed(1)} / 5</b></div>` : ""}
      ${isNum(reviews.count) ? `<div class="stat-row"><span>Reviews</span><b class="num">${num(reviews.count)}${reviews.count < 10 ? " <span class='muted' style='font-weight:400'>(small sample)</span>" : ""}</b></div>` : ""}
      ${isNum(reviews.recommend) ? `<div class="stat-row"><span>Would recommend to a friend</span><b class="num">${Math.round(reviews.recommend * (reviews.recommend <= 1 ? 100 : 1))}%</b></div>` : ""}
      ${isNum(reviews.outlook) ? `<div class="stat-row"><span>Positive business outlook</span><b class="num">${Math.round(reviews.outlook * (reviews.outlook <= 1 ? 100 : 1))}%</b></div>` : ""}
    </div></div>`);
  }
  if (seo.organic_clicks > 0 || seo.ads_budget > 0 || seo.organic_value > 0) {
    statCards.push(`<div class="card chart-card w6 half-md"><h3>Search presence</h3><p class="sub">Crustdata SEO estimates, monthly ${evChips(seo.ev)}</p><div class="stat-list">
      ${seo.organic_clicks > 0 ? `<div class="stat-row"><span>Organic clicks</span><b class="num">${compact(seo.organic_clicks)}</b></div>` : ""}
      ${seo.organic_value > 0 ? `<div class="stat-row"><span>Organic traffic value</span><b class="num">${money(seo.organic_value)}</b></div>` : ""}
      ${seo.ads_budget > 0 ? `<div class="stat-row"><span>Estimated ads budget</span><b class="num">${money(seo.ads_budget)}</b></div>` : ""}
    </div></div>`);
  }

  // balance the 6-col cards so rows fill: order w6 items in pairs
  const halves = plan.filter((p) => p.w === "w6");
  if ((halves.length + statCards.length) % 2 === 1) {
    const lone = halves[halves.length - 1];
    if (lone && !statCards.length) lone.w = "w12";
  }
  if (!plan.length && !statCards.length) {
    box.innerHTML = `<div class="card card-pad chart-card w12"><p class="muted">Crustdata holds no time-series data (headcount, traffic, funding) for this company.</p></div>`;
    return;
  }
  box.innerHTML = plan.map((p) => chartCard(p.id, p.title, p.sub, { w: p.w, big: p.big, caption: p.caption, tall: p.tall })).join("") + statCards.join("");
  plan.forEach((p) => mountChart($(`#${p.id}`), p.opt));
}

// ---------- founders ----------
const TOP_SCHOOL = /\b(IIT|IIM|BITS|ISB|NIT|Indian Institute of (Technology|Management)|Stanford|Harvard|MIT|Massachusetts Institute|Wharton|INSEAD|Oxford|Cambridge|Berkeley|Columbia|Yale|Princeton|Kellogg|Booth|London Business School|Carnegie Mellon)\b/i;
function founderChips(f) {
  const out = [];
  const here = (f.roles_here || [])[0];
  if (f.is_founder) out.push(["gold", "Founder"]);
  if (f.current === false) {
    const end = (f.roles_here || []).map((r) => r.end).filter((e) => e && e !== "now").sort().pop();
    out.push(["neg", end ? `Left ${fmtDate(end)}` : "No longer here"]);
  } else if (here?.current || f.current) out.push(["pos", "Current"]);
  if ((f.other_roles || []).some((r) => /founder/i.test(r.title || ""))) out.push(["blue", "Prior founder"]);
  if ((f.education || []).some((e) => TOP_SCHOOL.test(typeof e === "string" ? e : JSON.stringify(e)))) out.push(["", "Top-tier school"]);
  const acq = state.memo?.exit?.acquirer;
  if (acq && (f.other_roles || []).some((r) => r.current && r.company && r.company.toLowerCase().includes(acq.toLowerCase().split(" ")[0]))) out.push(["warn", "Now at acquirer"]);
  const fl = (f.flags || []).map(flagText);
  if (fl.some((x) => /top.tier/i.test(x)) && !out.some((o) => o[1] === "Top-tier school")) out.push(["", "Top-tier school"]);
  if (fl.some((x) => /prior|serial|previous(ly)? founded/i.test(x)) && !out.some((o) => o[1] === "Prior founder")) out.push(["blue", "Prior founder"]);
  const risks = fl.filter((x) => !POS_FLAG.test(x));
  if (risks.length) out.push(["warn", `${risks.length} flag${risks.length > 1 ? "s" : ""}`]);
  return out;
}
const POS_FLAG = /top.tier|prior founder|serial|previous(ly)? founded|exit/i;
const flagText = (x) => (typeof x === "string" ? x : x?.text || "");
function tenure(f) {
  const rs = f.roles_here || [];
  if (!rs.length) return "";
  const start = rs.map((r) => r.start).filter(Boolean).sort()[0];
  const end = rs.some((r) => r.current) ? "now" : rs.map((r) => r.end).filter(Boolean).sort().pop();
  return start ? `${fmtDate(start)} – ${end === "now" ? "present" : fmtDate(end) || "?"}` : "";
}
function renderFounders(m) {
  const fs = m.founders || [];
  const body = fs.length
    ? `<div class="founders">${fs.map((f, i) => {
      const title = f.roles_here?.[0]?.title || f.headline || "";
      return `<button type="button" class="f-card" data-f="${i}" aria-haspopup="dialog" aria-label="Open profile of ${esc(f.name)}">
        <div class="f-top"><div class="avatar" aria-hidden="true">${esc(initials(f.name))}${imgTag(f.photo)}</div>
          <div style="min-width:0"><div class="f-name">${esc(f.name)}</div><div class="f-title">${esc(title)}</div>${tenure(f) ? `<div class="f-tenure">${esc(tenure(f))}</div>` : ""}</div></div>
        <div class="f-chips">${founderChips(f).map(([c, t]) => `<span class="chipx ${c}">${esc(t)}</span>`).join("")}</div>
        <span class="f-more">View career &amp; evidence <span aria-hidden="true">→</span></span>
      </button>`;
    }).join("")}</div>`
    : `<div class="card card-pad"><p class="muted">No founders or leaders were found on the Crustdata people graph for this company.</p></div>`;
  return `<section class="section" aria-labelledby="h-founders"><div class="section-head"><h2 id="h-founders">Founders &amp; leadership</h2><span class="note">${fs.length} on record · from Crustdata people search</span></div>${body}</section>`;
}

function openFounder(i) {
  const f = state.memo?.founders?.[i];
  if (!f) return;
  const li = safeUrl(f.url);
  const here = (f.roles_here || []).map((r) => ({ ...r, company: state.memo.name, here: true }));
  const roles = [...here, ...(f.other_roles || [])].sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0) || String(b.start || "").localeCompare(String(a.start || "")));
  const edu = (f.education || []).map((e) => (typeof e === "string" ? e : [e.school || e.institute_name, e.degree || e.degree_name, e.field_of_study].filter(Boolean).join(" · ")));
  const d = $("#drawer");
  d.innerHTML = `<div class="d-head">
      <div class="avatar lg" aria-hidden="true">${esc(initials(f.name))}${imgTag(f.photo)}</div>
      <div style="min-width:0"><h2 id="drawer-title">${esc(f.name)}</h2><p>${esc(f.headline || f.roles_here?.[0]?.title || "")}</p>${f.location ? `<p>${esc(f.location)}</p>` : ""}</div>
      <button type="button" class="d-close" data-close aria-label="Close profile">${ICON.close}</button>
    </div>
    <div class="d-body">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        ${li ? `<a class="btn-ghost" href="${esc(li)}" target="_blank" rel="noopener noreferrer">${ICON.ext} LinkedIn profile</a>` : ""}
        <div class="f-chips">${founderChips(f).map(([c, t]) => `<span class="chipx ${c}">${esc(t)}</span>`).join("")}</div>
      </div>
      ${(f.flags || []).length ? `<div><h3>Signals &amp; flags</h3>${f.flags.map(flagText).map((x) => `<div class="flag-mini${POS_FLAG.test(x) ? " pos" : ""}">${esc(x)}</div>`).join("")}</div>` : ""}
      <div><h3>Career</h3>${roles.length ? `<ol class="timeline">${roles.map((r) => `<li class="${r.here ? "here" : ""}${r.current ? " cur" : ""}">
          <div class="tl-title">${esc(r.title || "Role")}</div><div class="tl-co">${esc(r.company || "")}${r.here ? ' <span class="chipx gold" style="margin-left:4px">This company</span>' : ""}</div>
          <div class="tl-when">${esc(fmtDate(r.start) || "?")} – ${r.current || r.end === "now" ? "present" : esc(fmtDate(r.end) || "?")}</div></li>`).join("")}</ol>` : `<p class="muted">No employment history on record.</p>`}</div>
      <div><h3>Education</h3>${edu.length ? `<ul class="edu">${edu.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : `<p class="muted">No education on record.</p>`}</div>
      <div><h3>Provenance</h3><p style="font-size:13.5px">${esc(f.source || "Crustdata people graph")} ${evChips(f.ev)}${f.pid ? ` <span class="muted">· person id ${esc(f.pid)}</span>` : ""}</p></div>
    </div>`;
  wireImages(d);
  state.lastFocus = document.activeElement;
  $("#drawer-root").hidden = false;
  document.body.style.overflow = "hidden";
  $(".d-close", d).focus();
}
function closeDrawer() {
  if ($("#drawer-root").hidden) return;
  $("#drawer-root").hidden = true;
  document.body.style.overflow = "";
  state.lastFocus?.focus?.();
}

// ---------- financials ----------
function renderFinancials(m) {
  const fun = m.funding || {}, deals = m.deals || {}, ex = m.exit;
  const rounds = (deals.recorded || []).slice().sort((a, b) => String(b.date).localeCompare(a.date));
  const ann = deals.announced || [];
  const investors = fun.investors || [];
  if (!rounds.length && !ann.length && !ex && !investors.length && !(fun.acquired_by || []).length && !(deals.failed_signals || []).length) {
    return `<section class="section" aria-labelledby="h-fin"><div class="section-head"><h2 id="h-fin">Financials</h2></div><div id="pnl"></div><div class="card card-pad" style="margin-top:16px"><p class="muted">Crustdata has no funding rounds, announced deals or exits recorded for this company.</p></div></section>`;
  }
  const table = rounds.length ? `<div class="card"><div class="card-pad" style="padding-bottom:10px"><h3>Funding rounds</h3><p class="sub">${money(fun.total)} raised across ${fun.rounds ?? rounds.length} round${(fun.rounds ?? rounds.length) === 1 ? "" : "s"} ${evChips(fun.ev)}</p></div>
    <div class="table-wrap"><table class="data"><thead><tr><th scope="col">Date</th><th scope="col">Round</th><th scope="col" class="r">Amount</th><th scope="col">Lead</th><th scope="col">Investors</th></tr></thead><tbody>
    ${rounds.map((r) => `<tr><td class="num" style="white-space:nowrap">${esc(fmtDate(r.date, true))}</td><td class="round-type">${esc(titleCase(r.type || ""))}</td><td class="r num"><b>${money(r.amount)}</b></td><td>${esc(r.lead || "—")}</td><td style="color:var(--ink-2)">${esc(Array.isArray(r.investors) ? r.investors.join(", ") : r.investors || "")} ${evChips(r.ev)}</td></tr>`).join("")}
    </tbody></table></div></div>` : "";
  const side = [];
  if (ex) side.push(`<div class="card exit-card"><h3>Exit</h3><div class="acq">Acquired by ${esc(ex.acquirer || "undisclosed")}</div>
    ${ex.date ? `<div class="row"><span>Date</span><b>${esc(fmtDate(ex.date, true))}</b></div>` : ""}
    ${isNum(ex.amount) ? `<div class="row"><span>Deal value</span><b class="num">${money(ex.amount)}</b></div>` : ""}
    ${isNum(ex.raised) ? `<div class="row"><span>Capital raised before exit</span><b class="num">${money(ex.raised)}</b></div>` : ""}
    ${isNum(ex.multiple) ? `<div class="row"><span>Exit / raised multiple</span><b class="num">${ex.multiple.toFixed(2)}×</b></div>` : ""}</div>`);
  if (ann.length) side.push(`<div class="card card-pad"><h3>Announced deals</h3><p class="sub">Press or TV deals, not confirmed as closed rounds</p>
    ${ann.map((a) => `<div class="deal"><div class="amt num">${esc(a.amount || "—")}${a.equity ? ` <span class="muted" style="font-size:13px;font-weight:400">for ${esc(a.equity)}</span>` : ""}</div>
      ${a.implied_valuation ? `<div class="muted">Implied valuation ${esc(a.implied_valuation)}</div>` : ""}
      ${(a.investors || []).length ? `<div>${esc([].concat(a.investors).join(", "))}${a.tv ? ' <span class="chipx warn">TV deal</span>' : ""}</div>` : ""}
      ${a.source ? `<div class="muted" style="font-size:12.5px;margin-top:4px">${esc(a.source)} ${evChips(a.ev)}</div>` : evChips(a.ev)}</div>`).join("")}</div>`);
  if (investors.length) side.push(`<div class="card card-pad"><h3>Investors</h3><p class="sub">${investors.length} on record</p><div class="investors" style="margin-top:12px">${investors.map((x) => `<span class="inv">${esc(x)}</span>`).join("")}</div></div>`);
  if ((deals.failed_signals || []).length) side.push(`<div class="card card-pad"><h3>Deals that may not have closed</h3>${deals.failed_signals.map((s) => `<p style="font-size:13.5px;margin-top:8px">${esc(typeof s === "string" ? s : s.text)} ${evChips(s?.ev)}</p>`).join("")}</div>`);
  const sideHtml = `<div style="display:grid;gap:16px">${side.join("")}</div>`;
  return `<section class="section" aria-labelledby="h-fin"><div class="section-head"><h2 id="h-fin">Financials</h2><span class="note">Reported P&amp;L from press coverage of filings · funding from Crustdata${ann.length ? " + press" : ""}</span></div>
    <div id="pnl"></div>
    <h3 class="subhead">Funding &amp; deals <span class="muted">· Crustdata records</span></h3>
    ${table ? `<div class="fin-grid">${table}${sideHtml}</div>` : sideHtml}</section>`;
}

// ---------- reported financials (P&L) ----------
function researchHint(m) {
  const h = { ...(m.research_hint || { name: m.name || state.entry?.name, category: fact(m, "industry") || "", context: state.context || fact(m, "description")?.slice(0, 200) || "" }) };
  if (!h.name) h.name = state.entry?.name || splitLine($("#q").value).name;
  return { name: h.name, category: h.category || "", context: h.context || "" };
}
async function loadFinancials(attempt = 0) {
  const runId = state.runId;
  state.fin = { loading: true }; renderPnl();
  let out;
  try {
    const res = await fetch("/api/financials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(researchHint(state.memo)) });
    const body = await res.json().catch(() => ({}));
    out = res.ok ? body : { error: res.status === 404 ? "Reported financials are not available on this server yet." : (body.error || body.detail || `Lookup failed (${res.status}).`) };
  } catch (e) { out = { error: `Reported financials unavailable: ${e.message}` }; }
  if (runId !== state.runId) return;
  state.fin = out; renderPnl();
}
const DERIVED_KEYS = /^(gross_margin|gross_margin_pct|ebitda|ebitda_pct)$/;
function finAxis(v, cur) {
  if (!isNum(v)) return "";
  if (cur === "INR") { const a = Math.abs(v); return a >= 1e7 ? `₹${+(v / 1e7).toFixed(a >= 1e9 ? 0 : 1)} Cr` : a >= 1e5 ? `₹${+(v / 1e5).toFixed(1)} L` : `₹${Math.round(v)}`; }
  return v < 0 ? `-${money(-v)}` : money(v);
}
function renderPnl() {
  const box = $("#pnl");
  if (!box) return;
  const f = state.fin || { loading: true };
  if (state.strict && !(f.periods || []).length) { box.innerHTML = ""; return; }
  const head = `<div class="card-pad pnl-head"><div><h3>Financials (reported)</h3><p class="sub">${esc(f.unit_note || "Figures from press coverage of company filings")}${f.currency ? ` · ${esc(f.currency)}` : ""}${f.cached ? " · cached" : ""}</p></div>
    <div class="pnl-legend"><span><i class="lg rep"></i>Reported</span><span><i class="lg der"></i>Computed</span><span><i class="lg src"></i>Click for source quote</span></div></div>`;
  if (f.loading) { box.innerHTML = `<div class="card pnl">${head}<div class="card-pad" style="padding-top:0">${[95, 80, 88, 70, 84].map((w) => `<div class="skel" style="width:${w}%"></div>`).join("")}</div></div>`; return; }
  if (f.error) { box.innerHTML = `<div class="card pnl"><div class="card-pad"><h3>Financials (reported)</h3><p class="muted" style="margin-top:6px;font-size:13.5px">${esc(f.error)}</p></div></div>`; return; }
  const periods = (f.periods || []).filter(Boolean);
  const lines = (f.lines || []).filter((l) => l && (l.kind === "header" || periods.some((p) => l.values?.[p])));
  if (!periods.length || !lines.length) {
    box.innerHTML = `<div class="card pnl"><div class="pnl-empty"><div class="empty-ico">${ICON.warn}</div><div><h3>No reported P&amp;L figures found</h3>
      <p>${esc(f.missing_note || "No reported P&L figures found in public filings coverage.")}</p>
      ${(f.sources || []).length ? `<p class="muted" style="font-size:12.5px;margin-top:6px">Searched: ${(f.sources || []).slice(0, 4).map(srcLink).join(" · ")}</p>` : ""}</div></div></div>`;
    return;
  }
  const extraIdx = lines.findIndex((l) => /^(total_expenses|net_profit)$/.test(l.key));
  const rows = lines.map((l, li) => {
    const lvl = l.level === 1 ? 1 : 0;
    const der = l.kind === "derived" || DERIVED_KEYS.test(l.key || "");
    const sep = li === extraIdx ? `<tr class="pnl-sep"><th scope="rowgroup" colspan="${periods.length + 1}">Other reported figures</th></tr>` : "";
    if (l.kind === "header") return `${sep}<tr class="pnl-hdr"><th scope="row" colspan="${periods.length + 1}">${esc(l.label)}</th></tr>`;
    const cells = periods.map((p, pi) => {
      const v = l.values?.[p];
      if (!v || (v.display == null && !isNum(v.amount))) return `<td class="r nd" title="Not disclosed">—</td>`;
      const disp = esc(v.display ?? finAxis(v.amount, f.currency));
      const pct = v.pct && !/_pct$/.test(l.key || "") ? `<span class="pct">${esc(v.pct)}</span>` : "";
      const hasSrc = v.quote || safeUrl(v.source?.url);
      return `<td class="r">${hasSrc ? `<button type="button" class="pnl-cell${der ? " der" : ""}" data-pl="${lines.indexOf(l)}" data-pp="${pi}" aria-haspopup="dialog" aria-label="${esc(l.label)}, ${esc(p)}: ${disp}. Show source">${disp}</button>` : `<span class="pnl-val${der ? " der" : ""}">${disp}</span>`}${pct}</td>`;
    }).join("");
    return `${sep}<tr class="lv${lvl}${der ? " derived" : ""}${/_pct$/.test(l.key || "") ? " pctrow" : ""}"><th scope="row">${esc(l.label)}</th>${cells}</tr>`;
  }).join("");
  state.finLines = lines; state.finPeriods = periods;
  const rev = lines.find((l) => l.key === "revenue");
  const profit = lines.find((l) => l.key === "ebitda" && periods.some((p) => isNum(l.values?.[p]?.amount))) || lines.find((l) => l.key === "net_profit");
  const chartable = rev && periods.some((p) => isNum(rev.values?.[p]?.amount));
  box.innerHTML = `<div class="card pnl">${head}
    <div class="pnl-body${chartable ? "" : " solo"}">
      <div class="table-wrap"><table class="data pnl-table"><thead><tr><th scope="col">${esc(f.currency ? `${f.currency}` : "Line item")}</th>${periods.map((p) => `<th scope="col" class="r">${esc(p)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
      ${chartable ? `<div class="pnl-chart"><div class="chart" id="c-pnl" role="img" aria-label="Revenue${profit ? ` and ${esc(profit.label)}` : ""} by period"></div></div>` : ""}
    </div>
    <div class="chart-caption" style="margin:0 20px 12px">Figures as reported by press coverage of company filings; verify against the source.${(f.sources || []).length ? ` Sources: ${(f.sources || []).slice(0, 5).map(srcLink).join(" · ")}` : ""}</div>
  </div>`;
  if (chartable) {
    const ps = periods.slice().reverse();
    const ser = [{ name: rev.label || "Revenue", type: "bar", barMaxWidth: 26, data: ps.map((p) => rev.values?.[p]?.amount ?? null), itemStyle: { color: C.navy, borderRadius: [4, 4, 0, 0] } }];
    if (profit) ser.push({ name: String(profit.label || "EBITDA").replace(/^Less:\s*/i, "").replace(/\s*\(other reported figures\)/i, ""), type: "bar", barMaxWidth: 26, data: ps.map((p) => profit.values?.[p]?.amount ?? null), itemStyle: { color: C.s[2], borderRadius: [4, 4, 0, 0] } });
    mountChart($("#c-pnl"), { ...baseOpt(), grid: { left: 8, right: 8, top: 34, bottom: 4, containLabel: true },
      legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10, textStyle: { color: C.ink2, fontSize: 12 } },
      xAxis: { type: "category", data: ps, axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted } },
      yAxis: valAxis((v) => finAxis(v, f.currency)),
      tooltip: { ...baseOpt().tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(29,58,102,.06)" } }, valueFormatter: (v) => (isNum(v) ? finAxis(v, f.currency) : "not disclosed") },
      series: ser });
  }
}
function srcLink(s) {
  const u = safeUrl(s?.url);
  const t = s?.title || (u ? hostOf(u) : "source");
  return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t.length > 60 ? t.slice(0, 58) + "…" : t)}</a>` : esc(t);
}
function openPop(btn) {
  const l = state.finLines?.[+btn.dataset.pl], p = state.finPeriods?.[+btn.dataset.pp];
  const v = l?.values?.[p];
  if (!v) return;
  const pop = $("#pop");
  const u = safeUrl(v.source?.url);
  pop.innerHTML = `<div class="pop-head"><b>${esc(l.label)} · ${esc(p)}</b><button type="button" class="pop-x" data-popclose aria-label="Close">${ICON.close}</button></div>
    <div class="pop-val num">${esc(v.display ?? "")}${v.pct ? ` <span class="muted">(${esc(v.pct)})</span>` : ""}</div>
    ${v.quote ? `<blockquote>“${esc(v.quote)}”</blockquote>` : (l.kind === "derived" ? `<p class="muted">Computed from reported lines.</p>` : "")}
    ${u ? `<a class="pop-src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${ICON.ext}<span>${esc(v.source.title || hostOf(u))}</span></a>` : ""}`;
  pop.hidden = false;
  const r = btn.getBoundingClientRect(), pw = Math.min(360, window.innerWidth - 24);
  pop.style.width = `${pw}px`;
  let left = r.right - pw; left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
  let top = r.bottom + 8;
  const ph = pop.offsetHeight;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  state.popBtn = btn;
  $(".pop-x", pop).focus();
}
function closePop(refocus = true) {
  const pop = $("#pop");
  if (pop.hidden) return;
  pop.hidden = true;
  if (refocus) state.popBtn?.focus?.();
}
window.addEventListener("scroll", () => closePop(false), { passive: true });

// ---------- research ----------
const TABS = [["overview", "Overview"], ["news", "News"], ["funding", "Funding"], ["market", "Market"], ["competitors", "Competitors"]];
async function loadResearch() {
  const m = state.memo, runId = state.runId;
  const hint = researchHint(m);
  const draw = () => (state.strict ? renderWebPanel() : renderResearch());
  if (state.status && state.status.tavily === false) { state.research = { error: "Web research is not configured on this server (no Tavily key)." }; draw(); return; }
  state.research = { loading: true }; draw();
  let out;
  try {
    const res = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: hint.name, category: hint.category || "", context: hint.context || "", refresh: false, strict: !!state.strict }) });
    const body = await res.json().catch(() => ({}));
    out = res.ok ? body : { error: body.error || body.detail || (res.status === 404 ? "Web research endpoint is not available yet." : `Research failed (${res.status}).`) };
  } catch (e) { out = { error: `Web research unavailable: ${e.message}` }; }
  if (runId !== state.runId) return;
  state.research = out; draw();
  $("#step-msg").textContent = out.error ? "Done. Web research unavailable." : state.strict ? (out.found_on_web === false ? "Done. Nothing reliable found on the web." : "Done. Showing unverified web findings.") : "Profile ready, with web research.";
}

function srcItem(s) {
  const u = safeUrl(s.url);
  const host = u ? hostOf(u) : "";
  return `<li class="src">${u ? `<a class="t" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.title || host)}</a>` : `<span class="t">${esc(s.title || "Source")}</span>`}
    <div class="meta">${host ? `<span>${esc(host)}</span>` : ""}${s.published_date ? `<span>· ${esc(fmtDate(String(s.published_date).slice(0, 10), true))}</span>` : ""}</div>
    ${s.snippet ? `<p class="snip">${esc(s.snippet)}</p>` : ""}</li>`;
}
function newsItem(n) {
  const u = safeUrl(n.url);
  const host = u ? hostOf(u) : "";
  return `<li class="src">${u ? `<a class="t" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n.title || host)}</a>` : `<span class="t">${esc(n.title)}</span>`}
    <div class="meta">${n.kind ? `<span class="kind ${esc(n.kind)}">${esc(n.kind)}</span>` : ""}${host && !/google\./.test(host) ? `<span>${esc(host)}</span>` : ""}${n.date ? `<span>· ${esc(fmtDate(n.date, true))}</span>` : ""}${n.origin ? `<span>· ${esc(n.origin)}</span>` : ""}${evChips(n.ev)}</div>
    ${n.snippet ? `<p class="snip">${esc(n.snippet)}</p>` : ""}</li>`;
}
function answerHtml(a) {
  return String(a || "").split(/\n{1,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p.replace(/^[-*•]\s*/, ""))}</p>`).join("");
}
function renderResearch() {
  const box = $("#research");
  if (!box) return;
  const r = state.research || { loading: true };
  const memoNews = (state.memo?.news || []).filter((n) => n.title && (!state.strict || safeUrl(n.url)));
  const secs = r.sections || {};
  const tabs = state.strict ? TABS.filter(([k]) => (secs[k]?.sources || []).length || secs[k]?.answer || (k === "news" && memoNews.length)) : TABS;
  state.visibleTabs = tabs;
  if (!tabs.some(([k]) => k === state.researchTab) && tabs.length) state.researchTab = tabs[0][0];
  const tab = state.researchTab;
  const tabsHtml = `<div class="tabs" role="tablist" aria-label="Research topics">${tabs.map(([k, n]) => {
    const cnt = (secs[k]?.sources || []).length + (k === "news" ? memoNews.length : 0);
    return `<button type="button" role="tab" class="tab" id="tab-${k}" aria-controls="tabpanel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}" data-tab="${k}">${n}${cnt ? `<span class="cnt">${cnt}</span>` : ""}</button>`;
  }).join("")}</div>`;
  let panel;
  const crustNews = tab === "news" && memoNews.length ? `<div class="sources" style="${r.loading || r.error ? "" : "grid-column:1/-1;margin-top:4px"}"><h4>${state.strict ? "Found by the agent’s web search" : "From Crustdata &amp; agent web search"}</h4><ul class="src-list">${memoNews.map(newsItem).join("")}</ul></div>` : "";
  if (r.loading) {
    panel = `<div class="answer"><span class="ai-label">AI summary</span><div class="skel" style="width:95%"></div><div class="skel" style="width:88%"></div><div class="skel" style="width:92%"></div><div class="skel" style="width:60%"></div></div>
      <div class="sources"><h4>Sources</h4>${[1, 2, 3].map(() => `<div class="src" style="margin-bottom:10px"><div class="skel" style="width:80%"></div><div class="skel" style="width:40%;margin:0"></div></div>`).join("")}</div>${crustNews}`;
  } else if (r.error) {
    panel = `<div class="answer"><p class="muted">${esc(r.error)}</p>${tab === "news" || state.strict ? "" : '<p class="muted">Crustdata-backed sections above are unaffected.</p>'}</div>${crustNews || "<div></div>"}`;
  } else {
    const s = secs[tab];
    const errs = r.errors?.[tab];
    if (!s || (!s.answer && !(s.sources || []).length)) {
      panel = `<div class="answer"><p class="muted">${esc(errs || "No web results for this topic.")}</p></div>${crustNews || "<div></div>"}`;
    } else {
      panel = `<div class="answer"><span class="ai-label">AI summary</span>${answerHtml(s.answer) || '<p class="muted">No summary returned.</p>'}
          <p class="muted" style="font-size:12px">Generated from the sources listed${r.generated_at ? ` · ${esc(fmtDate(String(r.generated_at).slice(0, 10), true))}` : ""}${r.cached ? " · cached" : ""}. Verify before relying on it.</p></div>
        <div class="sources"><h4>Sources (${(s.sources || []).length})</h4><ul class="src-list">${(s.sources || []).map(srcItem).join("")}</ul></div>${crustNews}`;
    }
  }
  box.innerHTML = tabsHtml + `<div class="tabpanel" role="tabpanel" id="tabpanel" aria-labelledby="tab-${tab}">${panel}</div>`;
}

// ---------- risks ----------
function renderRisks(m, resolved) {
  const sevRank = { high: 0, med: 1, low: 2 };
  const flags = (m.flags || []).slice().sort((a, b) => (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3));
  const claims = m.input_claims || [];
  const ev = m.evidence || [];
  const sevLabel = { high: "High", med: "Medium", low: "Low" };
  return `<section class="section" aria-labelledby="h-risk"><div class="section-head"><h2 id="h-risk">Risks &amp; checks</h2><span class="note">${flags.length} flag${flags.length === 1 ? "" : "s"} · ${ev.length} evidence records</span></div>
    <div class="risk-grid">
      <div class="card">${flags.length ? `<ul class="flags">${flags.map((f) => `<li class="flag"><span class="sev ${esc(f.severity)}">${esc(sevLabel[f.severity] || f.severity || "Note")}</span><div><div class="flag-text">${esc(f.text)} ${evChips(f.evidence)}</div>${f.code ? `<div class="flag-code">${esc(f.code)}</div>` : ""}</div></li>`).join("")}</ul>` : `<div class="card-pad"><p class="muted">No flags raised.</p></div>`}</div>
      <div style="display:grid;gap:16px">
        ${claims.length ? `<div class="card"><div class="card-pad" style="padding-bottom:8px"><h3>Claims in the request</h3><p class="sub">Checked against Crustdata</p></div><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Claim</th><th scope="col">Result</th></tr></thead><tbody>
          ${claims.map((c) => `<tr><td>${esc(c.claim)}${c.detail ? `<div class="muted" style="font-size:12.5px">${esc(c.detail)}</div>` : ""}</td><td><span class="claim-v ${esc(c.verdict)}">${esc(c.verdict)}</span> ${evChips(c.ev)}</td></tr>`).join("")}
        </tbody></table></div></div>` : ""}
      </div>
    </div>
    ${resolved ? renderSignal(m) : ""}
    ${ev.length ? `<details class="card ledger" id="ledger"><summary>Evidence ledger · ${ev.length} records</summary><div class="table-wrap"><table class="data"><thead><tr><th scope="col">ID</th><th scope="col">Source</th><th scope="col">What it supports</th><th scope="col">Recorded</th></tr></thead><tbody>
      ${ev.map((e) => { const u = safeUrl(e.url); return `<tr class="ev-row" id="ev-${esc(e.id)}"><td class="ev-id">${esc(e.id)}</td><td style="white-space:nowrap">${e.kind === "WEB" ? "Web" : "Crustdata"}${e.tool ? `<div class="muted" style="font-size:12px">${esc(e.tool)}</div>` : ""}</td><td>${esc(e.label)}${u ? ` <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(u) || "link")}</a>` : ""}</td><td class="muted" style="white-space:nowrap;font-size:12.5px">${esc(e.recorded_at ? fmtDate(String(e.recorded_at).slice(0, 10), true) : e.date || "")}${e.source === "fixture" ? "<br>replayed" : ""}</td></tr>`; }).join("")}
    </tbody></table></div></details>` : ""}
  </section>`;
}

function showEvidence(id) {
  const led = $("#ledger");
  if (!led) return;
  closeDrawer();
  led.open = true;
  const row = document.getElementById(`ev-${id}`);
  if (!row) return;
  row.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  row.classList.add("hl");
  setTimeout(() => row.classList.remove("hl"), 2200);
}

// ---------- welcome ----------
function renderWelcome() {
  $("#profile").innerHTML = `<div class="welcome">
    <div class="card"><div class="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg></div><h3>Identity first</h3><p>Every profile starts by resolving the company on the Crustdata identity graph. Unmatched names are shown as unresolved, never guessed.</p></div>
    <div class="card"><div class="ico"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg></div><h3>Traction you can chart</h3><p>Headcount, funding rounds, revenue estimates, web traffic and team mix, all from recorded Crustdata data.</p></div>
    <div class="card"><div class="ico"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 11l2 2 4-4"/></svg></div><h3>Founders, verified</h3><p>Founders are traced through full career history and education. Every claim links to an evidence record.</p></div>
  </div>`;
}

// ---------- events ----------
document.addEventListener("click", (e) => {
  const rr = e.target.closest("[data-rerun]");
  if (rr) { $("#q").value = rr.dataset.rerun; window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); run(); return; }
  const pc = e.target.closest(".pnl-cell");
  if (pc) { e.stopPropagation(); openPop(pc); return; }
  if (e.target.closest("[data-popclose]") || !e.target.closest("#pop")) closePop(!!e.target.closest("[data-popclose]"));
  const evb = e.target.closest("[data-ev]");
  if (evb) { e.preventDefault(); e.stopPropagation(); showEvidence(evb.dataset.ev); return; }
  const fc = e.target.closest(".f-card");
  if (fc) { openFounder(+fc.dataset.f); return; }
  if (e.target.closest("[data-close]")) { closeDrawer(); return; }
  const tab = e.target.closest(".tab[data-tab]");
  if (tab) { state.researchTab = tab.dataset.tab; renderResearch(); $(`#tab-${state.researchTab}`)?.focus(); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#pop").hidden) { closePop(); return; }
  const root = $("#drawer-root");
  if (!root.hidden) {
    if (e.key === "Escape") { closeDrawer(); return; }
    if (e.key === "Tab") {
      const f = $$("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])", $("#drawer")).filter((x) => x.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  const t = e.target.closest?.(".tab[data-tab]");
  if (t && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const T = state.visibleTabs || TABS;
    const i = T.findIndex(([k]) => k === t.dataset.tab);
    state.researchTab = T[(i + (e.key === "ArrowRight" ? 1 : T.length - 1)) % T.length][0];
    renderResearch(); $(`#tab-${state.researchTab}`)?.focus();
  }
});
$("#search").addEventListener("submit", (e) => { e.preventDefault(); run(); });

loadStatus();
loadExamples();
renderWelcome();
