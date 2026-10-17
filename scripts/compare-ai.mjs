import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { cpus, totalmem, platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';
import { INSTRUCTIONS, runComparison, renderReport, localOrigin } from './lib/ai-comparison.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/compare-ai.mjs [--provider ollama|openai|both] [--out DIRECTORY] [--dry-run]\nDefault: local Ollama only. Set OLLAMA_MODEL. OpenAI runs only when explicitly selected, with OPENAI_MODEL and OPENAI_API_KEY configured.');
  process.exit(0);
}
function value(flag, fallback) { const i = args.indexOf(flag); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`); return args[i + 1]; }
const selection = value('--provider', 'ollama');
if (!['ollama', 'openai', 'both'].includes(selection)) throw new Error('Invalid --provider');
const providers = selection === 'both' ? ['ollama', 'openai'] : [selection];
if (providers.includes('ollama')) localOrigin(process.env.OLLAMA_BASE_URL);
const directory = resolve(value('--out', `artifacts/ai-comparison/${new Date().toISOString().replace(/[:.]/g, '-')}`));
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cases = JSON.parse(await readFile(join(root, 'evals/learning-cases.json'), 'utf8'));
const dryRun = args.includes('--dry-run');
const results = dryRun ? cases.flatMap(item => providers.map(provider => ({ caseId: item.id, provider, status: 'not-run', reason: 'Dry run: no inference requests sent' })))
  : await runComparison({ cases, providers });
const report = { createdAt: new Date().toISOString(), status: dryRun ? 'DRY RUN — NO MODEL RESULTS' : 'Evaluation run — human review required',
  hardware: `${platform()} ${arch()} · ${cpus().length} logical CPUs · ${Math.round(totalmem() / 1024 ** 3)} GiB RAM`,
  instructions: INSTRUCTIONS, providers, cases, results };
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(join(directory, 'results.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
await writeFile(join(directory, 'report.html'), renderReport(report), { mode: 0o600, flag: 'wx' });
console.log(`Report written: ${join(directory, 'report.html')}`);
console.log(`Completed: ${results.filter(r => r.status === 'completed').length}; failed: ${results.filter(r => r.status === 'failed').length}; skipped/not run: ${results.filter(r => !['completed', 'failed'].includes(r.status)).length}`);
if (!dryRun && !results.some(r => r.status === 'completed')) process.exitCode = 2;
