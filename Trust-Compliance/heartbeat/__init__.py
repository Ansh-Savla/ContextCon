"""Company-name -> evidence-backed trust triage. No investment decisions."""
from .models import InvestigationRequest, RunConfig

__all__ = ["InvestigationRequest", "RunConfig", "investigate", "investigate_async", "get_report", "list_reports"]

def investigate(request, *, config=None):
    """Blocking entry point; accepts a request dataclass or JSON-compatible dict."""
    import asyncio
    from .pipeline import investigate_async
    return asyncio.run(investigate_async(request, config=config))

async def investigate_async(request, *, config=None):
    from .pipeline import investigate_async as run
    return await run(request, config=config)

def get_report(case_id, *, db_path="heartbeat-data/heartbeat.sqlite3"):
    """Retrieve an existing JSON-compatible report, or None."""
    from .store import Store
    store = Store(db_path)
    try:
        return store.get(case_id)
    finally:
        store.close()

def list_reports(*, db_path="heartbeat-data/heartbeat.sqlite3"):
    """List stored case IDs, creation timestamps and completion states."""
    from .store import Store
    store = Store(db_path)
    try:
        return store.list_cases()
    finally:
        store.close()
