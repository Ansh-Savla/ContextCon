export type Lens = "investment" | "trust";

export type Span = { value: string; span?: string };

export type Claim = {
  id: string;
  kind: "founded" | "headcount" | "revenue" | "funding" | "shark_deal" | "person_role" | "bank_change" | "amount" | "location" | "growth" | "other";
  text: string;
  value?: string | number;
  span?: string;
  person?: string;
};

export type Intake = {
  raw: string;
  lenses: Lens[];
  synthetic: boolean;
  company?: Span;
  domain?: Span;
  senderEmail?: Span;
  senderDomain?: Span;
  people: Array<{ name: string; role?: string; span?: string }>;
  claims: Claim[];
  thesis?: { text: string; sectors: string[]; geos: string[]; stages: string[]; maxStaff?: number; foundedBefore?: number; minHeartbeat: number };
  roster?: Array<{ name: string; past_employers: string[] }>;
  asks: string[];
  parsedBy: "rules" | "llm+rules";
  disagreements: string[];
};

export type Evidence = {
  id: string;
  kind: "crustdata" | "web" | "derived" | "input";
  endpoint?: string;
  recordId?: string | number;
  url?: string;
  fieldPath?: string;
  value?: unknown;
  note?: string;
  sourceDate?: string;
  retrievedAt: string;
  cached?: boolean;
};

export type Status = "supported" | "conflicting" | "potential_issue" | "insufficient" | "not_checked" | "info";

export type Finding = {
  id: string;
  check: string;
  claim: string;
  submitted?: string;
  observed?: string;
  status: Status;
  evidenceIds: string[];
  rule: string;
  reason: string;
  material?: boolean;
};

export type Outcome =
  | { lens: "investment"; label: "Advance to human diligence" | "Hold for specific verification" | "Pass: not an independent company" | "Insufficient evidence"; code: "advance" | "hold" | "pass" | "insufficient" }
  | { lens: "trust"; label: "Checks satisfied" | "Hold: contradiction found" | "Insufficient evidence"; code: "satisfied" | "hold" | "insufficient" };

export type HeartbeatComponent = { name: string; weight: number; value?: string; score?: number; evidenceIds: string[]; missingReason?: string; note?: string };
export type Heartbeat = { score: number | null; band: string; coverage: number; asOf?: string; components: HeartbeatComponent[]; pulse: number[] };

export type TraceEvent = {
  t: number;
  agent: "intake" | "investigator" | "verifier" | "clerk" | "system";
  brain?: string;
  step: string;
  detail?: string;
  status: "ok" | "skipped" | "failed" | "fallback" | "info";
  credits?: number;
  cached?: boolean;
  ms?: number;
};

export type CompanyCandidate = { id: number; name?: string; domain?: string; score: number; size?: string; industry?: string; description?: string };

export type LocalAction = { system: string; file: string; record: Record<string, unknown>; summary: string };

export type CaseResult = {
  id: string;
  createdAt: string;
  intake: Intake;
  identity: { status: "resolved" | "ambiguous" | "unresolved"; company?: CompanyCandidate; candidates: CompanyCandidate[]; method?: string; note?: string };
  findings: Finding[];
  heartbeat?: Heartbeat;
  fit?: Array<{ criterion: string; expected: string; observed: string; result: "pass" | "fail" | "unknown"; evidenceIds: string[] }>;
  outcomes: Outcome[];
  actions: LocalAction[];
  narrative: string;
  narrativeBy: string;
  questions: string[];
  evidence: Evidence[];
  trace: TraceEvent[];
  spend: { crustdataCredits: number; crustdataCalls: number; cacheHits: number; llmCalls: number; llmTokens: number; budgetPerRun: number };
  profile?: { name?: string; domain?: string; founded?: number; hq?: string; headcount?: number; range?: string; description?: string; linkedin?: string; logo?: string };
};
