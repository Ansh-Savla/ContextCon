from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import ipaddress
import math
import os
import re

WEIGHTS = {"identity": .35, "consistency": .25, "operations": .30, "disclosures": .10}

def now():
    return datetime.now(timezone.utc).isoformat()

def domain_of(value):
    if not isinstance(value, str) or not value.strip():
        return ""
    parsed = urlparse(value if "://" in value else "https://" + value)
    host = (parsed.hostname or "").lower().removeprefix("www.").rstrip(".")
    try:
        ipaddress.ip_address(host)
        raise ValueError("IP addresses are not company domains")
    except ValueError as exc:
        if str(exc) == "IP addresses are not company domains":
            raise
    if parsed.username or parsed.password or parsed.port not in (None, 80, 443):
        raise ValueError("Domain must not contain credentials or custom ports")
    if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", host):
        raise ValueError("Invalid company domain")
    if host.endswith((".invalid", ".localhost", ".local", ".internal", ".test")):
        raise ValueError("A public company domain is required")
    return host

def public_url(value):
    try:
        p = urlparse(value)
        domain_of(value)
        return p.scheme in ("https", "http") and not p.username and not p.password
    except (ValueError, TypeError):
        return False

def normalize(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())

def load_env(path=None):
    """Explicit local dotenv loading; never logs values or overrides the process."""
    p = Path(path or ".env")
    if not p.is_file() and not p.is_absolute():
        # Keys live in the repository-root .env; commands run from Trust-Compliance/.
        p = next((d / p for d in Path.cwd().parents if (d / p).is_file()), p)
    if p.is_file():
        for line in p.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.removeprefix("export ").split("=", 1)
            if re.fullmatch(r"[A-Z][A-Z0-9_]*", key.strip()):
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))

@dataclass
class InvestigationRequest:
    company_name: str = ""
    domain: str = ""
    jurisdiction: str = ""
    description: str = ""
    people: list[dict] = field(default_factory=list)
    claims: list[dict] = field(default_factory=list)
    context: dict = field(default_factory=dict)
    internal_roster: list[dict] = field(default_factory=list)
    disclosures: list[dict] = field(default_factory=list)
    lei: str = ""
    synthetic: bool = False

    def __post_init__(self):
        for key in ("company_name", "domain", "jurisdiction", "description", "lei"):
            if not isinstance(getattr(self, key), str):
                raise ValueError(f"{key} must be a string")
        self.company_name = self.company_name.strip()
        self.domain = domain_of(self.domain) if self.domain else ""
        if not self.company_name and not self.domain:
            raise ValueError("Supply company_name or domain")
        if len(self.company_name) > 200 or len(self.description) > 20000:
            raise ValueError("Input text is too long")
        for key in ("people", "claims", "internal_roster", "disclosures"):
            value = getattr(self, key)
            if not isinstance(value, list) or not all(isinstance(x, dict) for x in value) or len(value) > 50:
                raise ValueError(f"{key} must be a list of at most 50 objects")
        if not isinstance(self.context, dict):
            raise ValueError("context must be an object")
        # Structured upstream values are hints/assertions, never independent evidence.
        upstream = self.context.get("company", {})
        if isinstance(upstream, dict):
            basic = upstream.get("basic_info", upstream)
            if isinstance(basic, dict):
                hint = basic.get("primary_domain") or basic.get("domain")
                if not self.domain and isinstance(hint, str) and hint:
                    self.domain = domain_of(hint)
                if not self.description and isinstance(basic.get("description"), str):
                    self.description = basic["description"][:20000]
                year = basic.get("year_founded")
                if isinstance(year, int) and not isinstance(year, bool) and not any(c.get("field") == "basic_info.year_founded" for c in self.claims):
                    self.claims = [*self.claims, {"field": "basic_info.year_founded", "expected": year, "text": f"Investment-team context reports founded in {year}"}]
        if self.lei and not re.fullmatch(r"[A-Z0-9]{20}", self.lei):
            raise ValueError("LEI must have 20 uppercase alphanumeric characters")
        if not isinstance(self.synthetic, bool):
            raise ValueError("synthetic must be a boolean")

    @classmethod
    def from_dict(cls, value):
        if not isinstance(value, dict):
            raise ValueError("Request must be a JSON object")
        unknown = set(value) - set(cls.__dataclass_fields__)
        if unknown:
            raise ValueError("Unknown request fields: " + ", ".join(sorted(unknown)))
        return cls(**value)

    def to_dict(self):
        return asdict(self)

@dataclass
class RunConfig:
    max_seconds: float = 90
    max_credits: float = 50
    target_credits: float = 15
    max_people: int = 3
    model: str = "gemini"
    model_timeout: float = 27
    use_model: bool = True
    cache_hours: float = 24
    db_path: str = "heartbeat-data/heartbeat.sqlite3"
    env_file: str | None = ".env"
    weights: dict = field(default_factory=lambda: dict(WEIGHTS))
    coverage_threshold: float = 60

    def __post_init__(self):
        for key in ("max_seconds", "max_credits", "target_credits", "model_timeout", "cache_hours", "coverage_threshold"):
            v = getattr(self, key)
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0:
                raise ValueError(f"{key} must be finite and nonnegative")
        if not 1 <= self.max_seconds <= 120 or not 0 <= self.max_credits <= 50:
            raise ValueError("Run limits: 1–120 seconds and 0–50 credits")
        if not isinstance(self.max_people, int) or not 0 <= self.max_people <= 5:
            raise ValueError("max_people must be 0–5")
        if self.model not in ("gemini", "featherless"):
            raise ValueError("model must be gemini or featherless")
        if set(self.weights) != set(WEIGHTS) or any(not isinstance(v, (float, int)) or not math.isfinite(v) or v <= 0 for v in self.weights.values()) or abs(sum(self.weights.values()) - 1) > 1e-8:
            raise ValueError("Weights must contain four positive components summing to one")
        if self.coverage_threshold > 100:
            raise ValueError("coverage_threshold must be at most 100")
