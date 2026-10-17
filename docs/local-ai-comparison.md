# Local AI comparison prototype

This isolated tool compares a locally hosted model with the configured OpenAI model on synthetic South African Grades 10–12 learning questions. It does not replace or alter `supabase/shared/ai.ts`, `openaiSettings`, production routes, keys, prompts, Yoco, or database records. OpenAI remains available for later integration/activation with a valid API key.

## Current scope

- Dependency-free Node.js 22+ runner and offline HTML results reader.
- Local-only Ollama adapter; remote origins, redirects and obvious cloud model tags are rejected.
- Separate opt-in OpenAI Responses adapter using server/process environment variables. No browser API key, automatic fallback or surprise paid call.
- Twelve questions: mathematics, physical sciences, life sciences, geography, Afrikaans, isiXhosa, missing information, fabricated sources and unsafe experiment instructions.
- Same system instructions, prompts and 768-token output budget; local thinking is disabled for the initial Qwen3 baseline. Providers' tokenizers/reasoning can differ. This is a practical comparison, not a controlled scientific benchmark.
- Recorded answers, model identifiers, elapsed time, token usage and truncation/status. Reviewer criteria and reference answers are never sent to a model.
- Human scores remain blank. No fabricated accuracy, savings or winner.

## Lowest-cost first run

1. Use an existing computer first; do not rent a GPU or subscribe to a cloud plan for this experiment.
2. Install Ollama from its official distribution: https://ollama.com/download. Install Node.js 22+ if absent.
3. Disable Ollama cloud features before testing: set `OLLAMA_NO_CLOUD=1` in the Ollama service environment and restart it. Keep the service bound to `127.0.0.1`; do not expose port 11434 to the internet. This setting belongs to the Ollama process, not just the benchmark shell.
4. Download a small local test model while connected. Initial candidate: `qwen3:0.6b`, whose published Ollama license is Apache 2.0. It is a small baseline, not a recommended production tutor or a claim to match OpenAI. Review the exact model's license and record the pulled digest; changing model tags can change weights. Its documented quantised download is roughly 523 MB; runtime memory needs are larger.

```bash
ollama pull qwen3:0.6b
ollama show qwen3:0.6b --modelfile
```

After the download, local inference can work without internet. Prove that separately by disconnecting external networking and running the local suite again; do not claim offline operation solely from a successful HTTP call to localhost. Keep the loopback interface enabled.

From the repository root, on bash/macOS/Linux:

```bash
export OLLAMA_MODEL=qwen3:0.6b
node scripts/compare-ai.mjs --provider ollama
```

On PowerShell:

```powershell
$env:OLLAMA_MODEL = 'qwen3:0.6b'
node scripts/compare-ai.mjs --provider ollama
```

Open the generated `report.html` locally. It contains no external assets, scripts, API keys or requests. The output may contain unsafe or false model text: it is for adult reviewers, not learners. No real learner accounts or personal information are needed.

## Add OpenAI later without removing local AI

Select an OpenAI model available in your API project. Configure `OPENAI_MODEL` and `OPENAI_API_KEY` securely in the local process environment; never put a key into source, Vite variables, chat messages or a committed file. Then explicitly run:

```bash
node scripts/compare-ai.mjs --provider both
```

This mode makes billable OpenAI calls when configured. Missing configuration is recorded as **skipped**, not a zero-quality answer. Both providers remain separate choices; the script never switches automatically to a paid provider after a local failure. Keep local-only use with `--provider ollama` even if an OpenAI key exists in the environment.

To inspect the report format with no inference calls:

```bash
node scripts/compare-ai.mjs --provider both --dry-run
```

Outputs are under `artifacts/ai-comparison/<timestamp>/`, unless `--out` supplies another directory. Results are local and must not be committed automatically; they are not automatically saved to a remote account. No dependency installation is needed to run the tool.

## Review and decision

Use an educator to score factual/mathematical accuracy, explanation and suitability (0–5); use proficient language reviewers for Afrikaans and isiXhosa. Review refusals and uncertainty separately. Any harmful actionable output, fabricated source or serious misconception needs investigation; one good answer is not clearance for minors. Preserve version, settings, hardware and model digest with each run. Repeat cold and warmed runs rather than comparing a cold local model to a warmed cloud request. This first suite tests single-turn answers, not a multi-turn tutor conversation, retrieval, structured lesson plans or load/concurrency.

Cost comparison must include server/computer depreciation or rental, electricity, networking, support and simultaneous users. Use actual API input/cached/output usage and the exact model's current prices for the API side; no fixed per-chat cost or automatic zero local cost is assumed. Token budgets are not monetary spending caps. A 0.6B baseline and a large OpenAI model are different capacity classes; compare deployment value, not just a brand name.

## Path into SmartBridge FET after evidence

For your cost-saving objective, run the model on a controlled server and let Android/iOS users access it through the existing web app. Learners would still need data. This prototype runs on a developer computer, not a learner's phone and not the live app. AWS Amplify's static frontend and existing Supabase Edge Functions do not automatically provide a long-running local model server. Production integration needs a separately operated model service behind authenticated application routes, rate limits, bounded prompts, timeouts, moderation/safeguarding evaluation and a privacy/vendor review. Avoid a public unauthenticated Ollama endpoint or browser-to-localhost design for learners. Native/offline phone support would be a separate prototype.

Retain the existing OpenAI provider during any later integration, using an explicit server-owned provider setting. Leave it selected/unavailable as presently configured until activation is deliberate. Never use silent paid fallback. No production provider selection, hosting purchase or payment change is included here.

## Verification

```bash
node --test tests/ai-comparison.test.js
```

Tests exercise a real loopback HTTP exchange with a stub server plus mocked OpenAI responses, missing keys, incomplete replies, escaped model text and provider-boundary controls. They do **not** measure a real model's quality. A dry run similarly provides no model evidence. Do not label either as an actual local-vs-OpenAI benchmark.

## Official sources checked 17 October 2026

- Ollama generation API: https://docs.ollama.com/api/generate
- Local-only cloud setting and server binding: https://docs.ollama.com/faq
- Candidate tag and license: https://ollama.com/library/qwen3:0.6b
- Official OpenAI text generation/Responses guidance: https://developers.openai.com/api/docs/guides/text

## Actual initial run

The runtime and model were downloaded successfully during this work. See `docs/local-ai-initial-findings.md`, `evals/local-smoke-run/results.json`, and the generated HTML report for the sanitized actual local results. All 12 requests completed, but quality/safety failures prevent learner release. OpenAI remains not run pending the owner's key and model selection. A disconnected-network run and learner-device/load testing remain unverified.
