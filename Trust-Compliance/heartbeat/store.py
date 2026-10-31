"""Local case ledger and timestamped response cache. No credentials are persisted."""
import hashlib
import json
import os
import re
from pathlib import Path
import sqlite3
from .models import now

def redact(value):
    if isinstance(value, dict):
        return {k: "[REDACTED]" if re.search(r"(?:api.?key|password|authorization|secret|access.?token)", str(k), re.I) else redact(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [redact(x) for x in value]
    if isinstance(value, str):
        for name in ("CRUSTDATA_API_KEY", "GEMINI_API_KEY", "FEATHERLESS_API_KEY"):
            secret = os.getenv(name, "")
            if len(secret) >= 8:
                value = value.replace(secret, "[REDACTED]")
    return value

def dumps(value):
    return json.dumps(redact(value), ensure_ascii=False, allow_nan=False, default=str)

class Store:
    def __init__(self, path):
        self.path = Path(path).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.raw_dir = self.path.parent / "raw"
        self.raw_dir.mkdir(exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, created_at TEXT, request_json TEXT, report_json TEXT);
        CREATE TABLE IF NOT EXISTS records(case_id TEXT REFERENCES cases(id), kind TEXT, id TEXT, payload_json TEXT, PRIMARY KEY(case_id,kind,id));
        CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY, retrieved_at TEXT, payload_json TEXT, raw_path TEXT);
        """)

    def begin(self, case_id, request):
        self.db.execute("INSERT INTO cases VALUES(?,?,?,NULL)", (case_id, now(), dumps(request)))
        self.db.commit()

    def raw(self, case_id, call_id, record):
        folder = self.raw_dir / case_id
        folder.mkdir(exist_ok=True)
        path = folder / (call_id + ".json")
        path.write_text(dumps(record), encoding="utf-8")
        return str(path)

    def finish(self, report):
        cid = report["case_id"]
        with self.db:
            self.db.execute("UPDATE cases SET report_json=? WHERE id=?", (dumps(report), cid))
            for kind in ("entities", "claims", "evidence", "findings", "activity", "calls"):
                for row in report.get(kind, []):
                    self.db.execute("INSERT OR REPLACE INTO records VALUES(?,?,?,?)", (cid, kind, row["id"], dumps(row)))

    def get(self, case_id):
        row = self.db.execute("SELECT report_json FROM cases WHERE id=?", (case_id,)).fetchone()
        return json.loads(row[0]) if row and row[0] else None

    def list_cases(self):
        return [{"case_id": r[0], "created_at": r[1], "complete": r[2] is not None} for r in self.db.execute("SELECT id,created_at,report_json FROM cases ORDER BY created_at DESC")]

    @staticmethod
    def cache_key(endpoint, body, account_scope=""):
        return hashlib.sha256(dumps([endpoint, body, account_scope]).encode()).hexdigest()

    def cached(self, key, hours):
        from datetime import datetime, timezone
        row = self.db.execute("SELECT retrieved_at,payload_json,raw_path FROM cache WHERE key=?", (key,)).fetchone()
        if row and hours > 0 and (datetime.now(timezone.utc) - datetime.fromisoformat(row[0])).total_seconds() <= hours * 3600:
            return {"retrieved_at": row[0], "data": json.loads(row[1]), "raw_path": row[2]}

    def put_cache(self, key, data, retrieved_at, raw_path):
        self.db.execute("INSERT OR REPLACE INTO cache VALUES(?,?,?,?)", (key, retrieved_at, dumps(data), raw_path))
        self.db.commit()

    def close(self):
        self.db.close()
