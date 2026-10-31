"""Deterministic labels and arithmetic. Models cannot set scored statuses."""
from .models import normalize

CHECKS = [
    ("identity.resolution", "identity", "Company identity resolves without material ambiguity"),
    ("identity.presence", "identity", "Canonical company has an accessible matching primary website"),
    ("identity.registration", "identity", "Legal entity agrees with a matched authoritative registration record"),
    ("consistency.affiliation", "consistency", "Researched or submitted representatives have relevant sourced affiliations"),
    ("consistency.authority", "consistency", "Representative authority is established by suitable evidence"),
    ("operations.claims", "operations", "Operating claims have independent corroboration"),
    ("operations.recent", "operations", "Dated public operating observations exist in the last 90 days"),
    ("operations.period", "operations", "Operating observations span the available assessment period"),
    ("operations.diversity", "operations", "More than one kind of operating activity is observed"),
    ("disclosures.comparison", "disclosures", "Disclosures agree with checked affiliations and an authorized internal roster"),
]

def initial_findings(request, ledger):
    rows = [{"id": k, "component": c, "claim": text, "result": "insufficient evidence", "evidence_ids": [],
             "confidence_reason": "Not established", "missing_evidence": [text], "material": False,
             "rule": k} for k, c, text in CHECKS]
    for claim in request.claims:
        row = ledger.claim(claim.get("text", claim.get("field", "Submitted claim")), "submission", field=claim.get("field"), expected=claim.get("expected"))
        component = "identity" if str(claim.get("field", "")).startswith(("basic_info.", "locations.")) else "operations"
        rows.append({"id": row["id"] + ".assessment", "component": component, "claim_id": row["id"],
                     "claim": row["text"], "result": "insufficient evidence", "evidence_ids": [],
                     "confidence_reason": "Submitted assertion is not proof", "missing_evidence": ["Independent claim-specific evidence"],
                     "material": False, "rule": "structured_comparison"})
    return rows

def set_finding(rows, key, result, evidence_ids, reason, *, missing=None, material=False):
    row = next(r for r in rows if r["id"] == key)
    if result not in ("insufficient evidence", "not applicable") and not evidence_ids:
        raise ValueError("A scored finding requires evidence")
    row.update(result=result, evidence_ids=list(dict.fromkeys(evidence_ids)), confidence_reason=reason,
               missing_evidence=missing or [], material=material)

def score(rows, identity_status, config):
    values = {"supported": 100, "conflicting evidence": 0, "insufficient evidence": 0, "potential issue to review": 0}
    # Checks that cannot apply to this request (no representative, no roster) are
    # excluded; applicable components share the weight in their fixed proportions.
    applicable = {k: [r for r in rows if r["component"] == k and r["result"] != "not applicable"] for k in config.weights}
    total_weight = sum(w for k, w in config.weights.items() if applicable[k]) or 1
    components = {}
    for component, weight in config.weights.items():
        checks = applicable[component]
        effective = weight / total_weight if checks else 0
        value = sum(values[r["result"]] for r in checks) / len(checks) if checks else None
        coverage = sum(r["result"] in ("supported", "conflicting evidence") and bool(r["evidence_ids"]) for r in checks) / len(checks) if checks else None
        components[component] = {"weight": weight, "effective_weight": round(effective, 4), "score": None if value is None else round(value, 2),
                                 "coverage_percent": None if coverage is None else round(coverage * 100, 2),
                                 "weighted_contribution": round(effective * (value or 0), 2), "check_ids": [r["id"] for r in checks],
                                 "not_applicable_ids": [r["id"] for r in rows if r["component"] == component and r["result"] == "not applicable"]}
    heartbeat = sum(c["effective_weight"] * (c["score"] or 0) for c in components.values())
    coverage = sum(c["effective_weight"] * (c["coverage_percent"] or 0) for c in components.values())
    material = [r for r in rows if r["material"] and r["result"] in ("conflicting evidence", "potential issue to review")]
    if material:
        outcome, reason = "hold for a specific verification", material[0]["confidence_reason"]
    elif identity_status != "resolved" or coverage < config.coverage_threshold:
        outcome, reason = "insufficient evidence", "Company identity unresolved" if identity_status != "resolved" else "Evidence coverage below configured threshold"
    else:
        outcome, reason = "continue with diligence", "Identity resolved and evidence threshold met; review remaining gaps"
    return {"value": round(heartbeat, 2), "coverage_percent": round(coverage, 2),
            "provisional": identity_status != "resolved" or coverage < config.coverage_threshold,
            "components": components, "outcome": outcome, "reason": reason,
            "interpretation": "Explainable checklist index, not a calibrated probability or investment/compliance clearance",
            "unresolved_points": 0, "not_applicable_excluded": True, "coverage_threshold": config.coverage_threshold}

def compare_claims(request, company, ledger, rows, field_evidence):
    allowed = {"basic_info.year_founded", "basic_info.name", "basic_info.primary_domain", "locations.country"}
    for claim, finding in zip([c for c in ledger.claims if c["origin"] == "submission"], [r for r in rows if r.get("claim_id")]):
        field = claim["field"]
        if field not in allowed or claim["expected"] is None or not field_evidence.get(field):
            continue
        value = company
        for part in field.split("."):
            value = value.get(part) if isinstance(value, dict) else None
        from .research import canonical
        observed, expected = canonical(value, field), canonical(claim["expected"], field)
        # Formats that cannot be compared (e.g. an unknown country code) are not contradictions.
        if observed is None or expected is None:
            continue
        same = observed == expected
        # This is consistency with a provider field, not a legal or financial verdict.
        set_finding(rows, finding["id"], "supported" if same else "conflicting evidence", [field_evidence[field]],
                    f"Submitted {field} {'agrees with' if same else 'differs from'} the CrustData field ({value}); provider data may be outdated",
                    missing=["Independent primary corroboration"], material=not same)
        finding["observed"] = value

def domains_of(match):
    basic = (match.get("company_data") or {}).get("basic_info") or {}
    return {str(d).lower().removeprefix("www.") for d in [basic.get("primary_domain"), *(basic.get("all_domains") or [])] if d}

def resolve_candidates(matches, *, domain="", name=""):
    # Among equal scores, prefer the record owning the supplied domain, then the exact supplied name.
    ranked = sorted(matches, key=lambda m: (m.get("confidence_score", 0), bool(domain) and domain in domains_of(m),
                    bool(name) and normalize(((m.get("company_data") or {}).get("basic_info") or {}).get("name", "")) == normalize(name)), reverse=True)
    if not ranked:
        return "unmatched", None
    best = ranked[0]
    data = best.get("company_data", {})
    basic = data.get("basic_info", {}) or {}
    score_value = best.get("confidence_score", 0)
    domain_ok = not domain or domain in domains_of(best)
    # Candidates sharing a domain are records of one organization, not rival identities.
    rivals = [m for m in ranked[1:] if not domains_of(m) & domains_of(best)]
    second = rivals[0].get("confidence_score", 0) if rivals else 0
    cid = data.get("crustdata_company_id") or basic.get("crustdata_company_id")
    if cid and score_value >= .95 and score_value - second >= .15 and domain_ok:
        return "resolved", best
    return "ambiguous", None
