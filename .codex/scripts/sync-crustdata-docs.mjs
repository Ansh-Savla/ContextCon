import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'crustdata-docs');
const indexUrl = 'https://docs.crustdata.com/llms.txt';
const concurrency = 8;

async function get(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'crustdata-hackathon-doc-archive/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText} for ${url}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * (2 ** attempt)));
  }
  throw lastError;
}

const indexResponse = await get(indexUrl);
const indexText = await indexResponse.text();
const urls = [...new Set([...indexText.matchAll(/\]\(([^)]+)\)/g)]
  .map((match) => new URL(match[1], indexUrl))
  .filter((url) => url.hostname === 'docs.crustdata.com' && /\.(md|ya?ml)$/i.test(url.pathname))
  .map((url) => url.href))];

if (urls.length < 100) {
  throw new Error(`Expected the full docs index (100+ files); found ${urls.length}. Refusing to save an incomplete mirror.`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'llms.txt'), indexText, 'utf8');
const manifest = [];
let next = 0;
const errors = [];

async function worker() {
  while (next < urls.length) {
    const url = urls[next++];
    const parsed = new URL(url);
    const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    const target = path.resolve(outputDir, relative);
    if (!target.startsWith(`${outputDir}${path.sep}`)) {
      errors.push({ url, error: 'Refusing a path outside the docs directory.' });
      continue;
    }
    try {
      const response = await get(url);
      const bytes = Buffer.from(await response.arrayBuffer());
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
      manifest.push({
        url,
        path: path.relative(outputDir, target).replaceAll(path.sep, '/'),
        status: response.status,
        contentType: response.headers.get('content-type'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
      console.log(`Saved ${manifest.length}/${urls.length}: ${relative}`);
    } catch (error) {
      errors.push({ url, error: String(error) });
      console.error(`Failed: ${url}: ${error}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
manifest.sort((a, b) => a.path.localeCompare(b.path));
const fetchedAt = new Date().toISOString();
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({
  source: indexUrl,
  fetchedAt,
  indexedFileCount: urls.length,
  savedFileCount: manifest.length,
  errors,
  files: manifest,
}, null, 2) + '\n');

const readme = `# CrustData documentation archive\n\nThis is a local snapshot of every Markdown and OpenAPI YAML file linked by CrustData's official documentation index.\n\n- Index: ${indexUrl}\n- Retrieved: ${fetchedAt}\n- Files in index: ${urls.length}\n- Files saved: ${manifest.length}\n- Errors: ${errors.length}\n- Integrity: manifest.json records each source URL, content type, byte count, and SHA-256 hash.\n\nThe upstream documentation is authoritative and may change. Refresh with: node .codex/scripts/sync-crustdata-docs.mjs. Keep each page's original URL when quoting or using it.\n`;
await writeFile(path.join(outputDir, 'README.md'), readme, 'utf8');

console.log(`\nDocumentation mirror: ${manifest.length}/${urls.length} files saved; ${errors.length} errors.`);
if (errors.length) process.exitCode = 1;
