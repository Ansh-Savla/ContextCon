"""Local-only Heartbeat viewer. Run from anywhere: python Trust-Compliance/heartbeat-viewer/server.py"""
import json
import sqlite3
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
DB = ROOT / 'heartbeat-data' / 'heartbeat.sqlite3'
JOBS = {}
LOCK = threading.Lock()


def cases():
    if not DB.exists():
        return []
    with sqlite3.connect(f'file:{DB.as_posix()}?mode=ro', uri=True) as db:
        rows = db.execute('SELECT id, created_at, request_json, report_json FROM cases ORDER BY created_at DESC').fetchall()
    result = []
    for cid, created, request, report in rows:
        req = json.loads(request or '{}')
        data = json.loads(report) if report else {}
        result.append({'id': cid, 'created_at': created, 'name': req.get('company_name') or req.get('domain') or 'Untitled case', 'synthetic': req.get('synthetic', False), 'complete': bool(report), 'outcome': (data.get('heartbeat') or {}).get('outcome')})
    return result


def run_job(job, request):
    try:
        from heartbeat import investigate, RunConfig
        from heartbeat.pipeline import Investigation
        original = Investigation.stage
        async def observed(self, name, work):
            item = {'name': name, 'status': 'running'}
            job['stages'].append(item)
            try:
                return await original(self, name, work)
            finally:
                row = next((r for r in reversed(self.stage_trace) if r.get('name') == name), {})
                item.update(row)
        Investigation.stage = observed
        try:
            report = investigate(request, config=RunConfig(db_path=str(DB), env_file=str(ROOT.parent / '.env')))
        finally:
            Investigation.stage = original
        job.update(status='complete', case_id=report['case_id'])
    except Exception as exc:
        job.update(status='failed', error=f'{type(exc).__name__}: investigation could not complete; check your local configuration.')
    finally:
        LOCK.release()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def send_data(self, data, status=200, kind='application/json; charset=utf-8'):
        body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/':
            return self.send_data((ROOT / 'heartbeat-viewer' / 'index.html').read_bytes(), kind='text/html; charset=utf-8')
        if path == '/api/cases':
            return self.send_data(cases())
        if path.startswith('/api/cases/'):
            cid = path.rsplit('/', 1)[-1]
            with sqlite3.connect(f'file:{DB.as_posix()}?mode=ro', uri=True) as db:
                row = db.execute('SELECT request_json, report_json FROM cases WHERE id=?', (cid,)).fetchone()
            if not row or not row[1]:
                return self.send_data({'error': 'Report not available'}, 404)
            return self.send_data({'request': json.loads(row[0]), 'report': json.loads(row[1])})
        if path.startswith('/api/jobs/'):
            job = JOBS.get(path.rsplit('/', 1)[-1])
            return self.send_data(job if job else {'error': 'Job not found'}, 200 if job else 404)
        self.send_data({'error': 'Not found'}, 404)

    def do_POST(self):
        if self.path != '/api/run':
            return self.send_data({'error': 'Not found'}, 404)
        # Only this local page can initiate a run, preventing cross-site form submissions.
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json' or self.headers.get('Origin') != f'http://127.0.0.1:{self.server.server_port}':
            return self.send_data({'error': 'Invalid origin'}, 403)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 100000:
                raise ValueError()
            request = json.loads(self.rfile.read(size))
            if not isinstance(request, dict) or not (request.get('company_name') or request.get('domain')):
                raise ValueError()
        except (ValueError, json.JSONDecodeError):
            return self.send_data({'error': 'Provide a company name or domain'}, 400)
        if not LOCK.acquire(blocking=False):
            return self.send_data({'error': 'A run is already in progress'}, 409)
        jid = str(uuid.uuid4())
        job = JOBS[jid] = {'status': 'running', 'stages': []}
        threading.Thread(target=run_job, args=(job, request), daemon=True).start()
        self.send_data({'id': jid}, 202)


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
    print('Heartbeat viewer: http://127.0.0.1:8765', flush=True)
    server.serve_forever()
