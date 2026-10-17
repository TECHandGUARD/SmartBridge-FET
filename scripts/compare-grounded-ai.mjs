import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { answerFromResources, loadLearningCatalog, readResourceFile } from './lib/resource-grounding.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url))), args = process.argv.slice(2);
function option(flag, fallback) { const i = args.indexOf(flag); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing ${flag}`); return args[i + 1]; }
if (args.includes('--help')) {
  console.log('node scripts/compare-grounded-ai.mjs [--source sample|live] [--provider ollama|openai] [--out DIRECTORY] [--catalog-only]\nDefault: SAMPLE notes and local Ollama. Live reads require project URL and publishable key; optional user JWT keeps existing RLS. Nothing is uploaded or changed.');
  process.exit(0);
}
const source = option('--source', 'sample'), provider = option('--provider', 'ollama');
if (!['sample', 'live'].includes(source) || !['ollama', 'openai'].includes(provider)) throw new Error('Invalid source/provider');
const out = resolve(option('--out', `artifacts/rag-comparison/${new Date().toISOString().replace(/[:.]/g, '-')}`));
let resources, catalog = null; const ingestion = [];
if (source === 'sample') resources = JSON.parse(await readFile(join(root, 'evals/sample-learning-resources.json'), 'utf8'));
else {
  catalog = await loadLearningCatalog({}); resources = [];
  if (!args.includes('--catalog-only')) {
    const temp = await mkdtemp(join(tmpdir(), 'smartbridge-learning-'));
    try {
      for (const resource of catalog.resources.slice(0, 50)) {
        const file = await readResourceFile(resource, {});
        if (file.status !== 'downloaded') { ingestion.push({ id: resource.id, ...file }); continue; }
        if (!['pdf', 'docx', 'txt', 'md'].includes(file.extension)) { ingestion.push({ id: resource.id, status: 'skipped', reason: 'Unsupported extraction format' }); continue; }
        const path = join(temp, `resource.${file.extension}`);
        await writeFile(path, file.bytes, { mode: 0o600 });
        try {
          const { stdout } = await promisify(execFile)('python3', [join(root, 'scripts/extract-learning-text.py'), path], { timeout: 25000, maxBuffer: 2 * 1024 * 1024 });
          const data = JSON.parse(stdout); let pages = 0;
          for (const page of data.pages) if (page.text.trim()) { resources.push({ ...resource, text: page.text, page: page.page }); pages++; }
          ingestion.push({ id: resource.id, status: pages ? 'extracted' : 'skipped', pages, coverage: data.coverage, reason: pages ? undefined : 'No extractable text; may need OCR' });
        } catch { ingestion.push({ id: resource.id, status: 'skipped', reason: 'Extraction failed or exceeded limits' }); }
        await rm(path, { force: true });
      }
      for (const resource of catalog.resources.slice(50)) ingestion.push({ id: resource.id, status: 'skipped', reason: 'Prototype run limited to 50 files; not indexed in this run' });
    } finally { await rm(temp, { recursive: true, force: true }); }
  }
}
const questions = JSON.parse(await readFile(join(root, 'evals/grounded-learning-cases.json'), 'utf8'));
const model = provider === 'ollama' ? process.env.OLLAMA_MODEL : process.env.OPENAI_MODEL;
const report = { createdAt: new Date().toISOString(), mode: source === 'sample' ? 'SAMPLE MATERIAL — NOT LIVE UPLOADS' : 'LIVE READ-ONLY CATALOG',
  provider, model: model || null, catalog: catalog ? { coverage: catalog.coverage, access: catalog.access, eligibleResources: catalog.resources.length } : null,
  ingestion, extractedPages: resources.length, results: [] };
await mkdir(out, { recursive: true, mode: 0o700 });
async function checkpoint() { await writeFile(join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 }); }
await checkpoint();
if (!args.includes('--catalog-only')) for (const item of questions) {
  try {
    const result = await answerFromResources({ question: item.prompt, subject: item.subject, grade: item.grade, resources, provider, model });
    report.results.push({ caseId: item.id, question: item.prompt, expected: item.expected, ...result });
  } catch { report.results.push({ caseId: item.id, status: 'failed', reason: 'Model unavailable or request failed; no paid fallback was attempted' }); }
  await checkpoint();
}
console.log(JSON.stringify({ mode: report.mode, catalog: report.catalog, extractedPages: report.extractedPages, results: report.results.map(r => ({ caseId: r.caseId, status: r.status, modelCalled: r.modelCalled })), output: join(out, 'results.json') }, null, 2));
