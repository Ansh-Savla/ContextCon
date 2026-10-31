# Heartbeat viewer

A local, independent wrapper around the in-development Heartbeat library. It reads saved cases from `heartbeat-data/heartbeat.sqlite3` and can start a new investigation using the library. The saved database may contain both synthetic and real research; each case is labeled according to its stored `synthetic` flag.

From the repository root, with the Heartbeat dependencies installed:

```powershell
python heartbeat-viewer/server.py
```

Open http://127.0.0.1:8765. Saved cases require no API calls. Submitting a new run uses the existing library, local `.env`, configured provider APIs and the library's default credit limits. The progress adapter observes an internal stage method, so library changes may require updating `server.py`; saved case viewing remains independent of that adapter. Stop the server with Ctrl+C.
