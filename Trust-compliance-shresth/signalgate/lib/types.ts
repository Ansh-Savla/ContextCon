/** SignalGate case model: one counterparty diligence desk for investors (equity) and lenders (credit/KYB). */

export type Requester = "investor" | "lender";
export type Section = "kyb" | "people" | "screening" | "fraud" | "investment" | "credit";
export type CheckStatus = "verified" | "contradicted" | "review" | "unverified" | "not_run" | "info";
export type Stage = "intake" | "resolve" | "profile" | "people" | "screening" | "analysis" | "decision" | "actions";

export type Span = { value: string; span?: string };

export type Claim = {
  id: string;
  kind: "founded" | "headcount" | "revenue" | "funding" | "shark_deal" | "person_role" | "bank_change" | "amount" | "location" | "growth" | "independent" | "other";
  text: string;
  value?: string | number;
  span?: string;
  person?: string;
};

export type Intake = {
  raw: string;
  requester: Requester;
  requesterWhy: string;
  synthetic: boolean;
  company?: Span;
  domain?: Span;
  senderEmail?: Span;
  senderDomain?: Span;
  people: Array<{ name: string; role?: string; span?: string }>;
  claims: Claim[];
  ask?: { amount: number; currency: "INR" | "USD"; text: string; instrument?: string };
  thesis?: { text: string; sectors: string[]; geos: string[]; stages: string[]; maxStaff?: number; foundedBefore?: number; minHeartbeat: number };
  wantsAdverse: boolean;
  parsedBy: "rules" | "llm+rules";
  disagreements: string[];
};

export type Evidence = {
  id: string;
  kind: "crustdata" | "web" | "derived" | "input";
  provider?: "CrustData" | "Tavily" | "CrustData web" | "Rule" | "Request";
  endpoint?: string;
  recordId?: string | number;
  url?: string;
  title?: string;
  fieldPath?: string;
  value?: unknown;
  note?: string;
  sourceDate?: string;
  retrievedAt: string;
  cached?: boolean;
};

export type Check = {
  id: string;
  section: Section;
  title: string;
  claim?: string;
  submitted?: string;
  observed: string;
  status: CheckStatus;
  rule: string;
  reason: string;
  evidenceIds: string[];
  material?: boolean;
};

export type Decision = {
  track: "compliance" | "investment" | "credit";
  code: "proceed" | "conditions" | "decline" | "insufficient" | "cleared" | "not_cleared" | "ready" | "refer";
  label: string;
  reasons: string[];
};

export type HeartbeatComponent = { name: string; weight: number; value?: string; score?: number; evidenceIds: string[]; missingReason?: string; note?: string };
export type Heartbeat = { score: number | null; band: string; coverage: number; asOf?: string; components: HeartbeatComponent[]; pulse: number[] };

export type TraceEvent = {
  t: number;
  stage?: Stage;
  agent: "intake" | "investigator" | "screening" | "analyst" | "verifier" | "clerk" | "system";
  brain?: string;
  step: string;
  detail?: string;
  status: "ok" | "skipped" | "failed" | "fallback" | "info";
  credits?: number;
  cached?: boolean;
  ms?: number;
};

export type CompanyCandidate = { id: number; name?: string; domain?: string; score: number; size?: string; industry?: string; description?: string };

export type Person = { id?: number; photo?: string; education?: string[]; pastRoles?: string[]; flags?: Array<{ sev: "high" | "med" | "low"; text: string }>; isFounder?: boolean; name: string; title?: string; since?: string; until?: string; current: boolean; profileUrl?: string; priorFounder?: string[]; headline?: string; evidenceId?: string };

export type SeriesPoint = { date: string; v: number; v2?: number };
export type Series = { headcount: SeriesPoint[]; traffic: SeriesPoint[]; followers: SeriesPoint[]; revenue: SeriesPoint[]; openJobs: SeriesPoint[]; roles: Array<{ label: string; v: number }>; regions: Array<{ label: string; v: number }>; trafficDomain?: string; trafficExcluded?: string };
export type TimelineEvent = { date: string; kind: "founded" | "funding" | "joined" | "left" | "acquired" | "news" | "press"; title: string; detail?: string; source: "CrustData" | "Tavily" | "CrustData web"; evidenceId?: string; url?: string };
export type PeerCompany = { id: number; name: string; domain?: string; logo?: string; headcount?: number; growth6m?: number | null; funding?: number | null; country?: string; isTarget?: boolean };
export type Monitoring = { status: "validated" | "spec_only" | "not_applicable"; track: string[]; note: string; evidenceId?: string };
export type PressImage = { url: string; source: string; caption?: string };

export type LocalAction = { system: string; file: string; summary: string; detail?: string };

export type Metric = { label: string; value: string; hint?: string; evidenceIds?: string[] };

export type CaseResult = {
  id: string;
  createdAt: string;
  intake: Intake;
  identity: { status: "resolved" | "ambiguous" | "unresolved"; company?: CompanyCandidate; candidates: CompanyCandidate[]; method?: string; note?: string };
  profile?: { name?: string; domain?: string; founded?: number; hq?: string; country?: string; headcount?: number; range?: string; description?: string; linkedin?: string; logo?: string; industry?: string; status?: string; acquiredBy?: string };
  people: Person[];
  checks: Check[];
  decisions: Decision[];
  conditions: string[];
  heartbeat?: Heartbeat;
  investment?: { fit: Array<{ criterion: string; expected: string; observed: string; result: "pass" | "fail" | "unknown" }>; metrics: Metric[]; funding: Array<{ date?: string; round?: string; amountUsd?: number | null; investors?: string }>; competitors: string[] };
  credit?: { grade: "A" | "B" | "C" | "D" | "—"; metrics: Metric[]; indicativeExposure?: { amount: number; currency: "USD" | "INR"; basis: string }; requested?: { amount: number; currency: "USD" | "INR" }; policy: string[] };
  series?: Series;
  events: TimelineEvent[];
  parent?: { id: number; name: string; domain?: string; logo?: string; headcount?: number; hq?: string; fundingUsd?: number | null; evidenceId?: string };
  peers?: { basis: string; companies: PeerCompany[]; evidenceId?: string };
  monitoring?: Monitoring;
  pressImages: PressImage[];
  score?: { overall: number | null; label: string; reason: string; dims: Array<{ key: string; label: string; v: number; why: string }>; confidence: { v: number; why: string } };
  finance?: { stats: Array<{ label: string; value: string; hint?: string }>; rounds: Array<{ date?: string; round?: string; amountUsd?: number | null; investors?: string }> };
  plan?: { by: string; actions: Array<{ name: string; why: string; ran: boolean }> };
  memo: string;
  memoBy: string;
  actions: LocalAction[];
  evidence: Evidence[];
  trace: TraceEvent[];
  spend: { crustdataCredits: number; crustdataCalls: number; cacheHits: number; tavilyCalls: number; llmCalls: number; llmTokens: number; budgetPerRun: number; seconds: number };
};
