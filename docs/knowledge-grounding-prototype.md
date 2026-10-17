# Knowledge-base grounding prototype

## What is connected

The comparison branch now has a read-only catalog/file connector for the three learning libraries already used by SmartBridge FET:

| App feature | Existing table | Eligibility |
| --- | --- | --- |
| Admin Knowledge Base Manager | educational_resources | active and permitted by existing RLS; premium entitlement checked |
| Tutor resources | resources | approved, not rejected/archived; premium entitlement checked |
| Official CAPS library | caps_documents | active and permitted by existing RLS |

It queries these tables under a publishable key and, if supplied, a verified user's JWT. It does not use service-role credentials or query legal documents, identities, banking data, private messages or application documents. User-supplied flags cannot grant premium access. A user JWT is validated by Auth, an active profile is required, and premium status is checked against that account's currently active subscription. Table and Storage RLS still apply. No shared cross-user text/vector index is created; each run reads fresh rows/files. Revocations/deletions therefore apply on the next run, not retroactively to already-downloaded local reports. Keep reports private and delete them when no longer needed.

The prototype does **not** modify live AI routing, OpenAI, paid-provider configuration, Yoco, database policies or uploads. It is an experimental CLI connected to the app's resource stores, not an already-deployed learner chat feature. A protected long-running model service is still required for production web use.

## Available ingestion and boundaries

Supabase `storage://` references in resources, educational_resources, tutor-resources and caps_documents can be downloaded with the same caller's access. Legacy same-project public Storage URLs are converted to the authenticated read endpoint. Private legal/identity buckets and arbitrary external URLs are excluded. It never forwards a user token to a different origin or follows redirects.

TXT/Markdown, text-based PDF (requires local Poppler `pdftotext`) and DOCX text can be extracted by the local Python 3 helper. Old DOC, images/scans requiring OCR, audio/video/transcripts and external links need separate reviewed ingestion. A video URL is not automatically a transcript. The prototype reports skipped/failed documents; a description or title is not treated as the document's full contents. At most 50 files are extracted per prototype run; the report lists remaining files as skipped. Size/page/text/pagination limits are explicit; it does not claim to have read an entire large library or every page. PDF extraction is limited to 30 pages; callers must review coverage. External sources are not fetched automatically because their destinations, permissions and content need review. Do not label them indexed when skipped.

## Source-first answering

1. Load currently eligible records and accessible file text, or clearly labelled sample notes.
2. Filter subject/grade; split text into short passages.
3. Retrieve lexical matches locally, without paid embeddings. This is a small baseline, not semantic or multilingual search: paraphrases/translation can fail retrieval.
4. With no matching passage, return an explicit lack-of-evidence message without calling any model or paid API.
5. Otherwise send only the question and selected passages to the explicitly selected provider. Uploaded text is untrusted data, not instructions. Do not send real learner personal information.
6. Require structured answers, exact source quotes and recognised citation labels. Reject unknown sources, invented quotes, malformed output and truncation.
7. A mechanically valid quote still does not prove that the answer follows from it. Accepted outputs are labelled **needs-human-review**; they are not certified accurate. Rejected model answers are replaced with a notice and a separate source-excerpts fallback, never presented as a verified AI answer.

Retrieval does not retrain the model or fix all safety/language issues. Source documents can contain errors or prompt injection. The prompt and mechanical citation tests are not a complete injection defence or safeguarding system. Do not expose this small-model prototype to learners.

## Try sample material

Four original, synthetic notes cover water-equation balancing, linear equations, photosynthesis, and evaporation/condensation. They are marked SAMPLE and were not uploaded to the live library. Seven cases include supported questions, absent bursary information, a grade mismatch and a request for unsupported learner marks.

With the local Ollama service running in cloud-disabled mode and the model already downloaded:

```bash
export OLLAMA_MODEL=qwen3:0.6b
node scripts/compare-grounded-ai.mjs --source sample --provider ollama
```

Use the setup instructions in `docs/local-ai-comparison.md` for Windows and the Ollama process. OpenAI remains opt-in via `--provider openai` after its model/key are configured securely; no fallback invokes it automatically. Both providers receive the same source-selection rules. This initial local run is not an OpenAI comparison.

## Try the live learning catalog

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` securely in the process environment. Optionally set `SUPABASE_USER_ACCESS_TOKEN` for the account being tested; do not paste tokens into chat or commit them. Service-role/secret keys are rejected. Never share a real signed-in account's report with another user.

```bash
node scripts/compare-grounded-ai.mjs --source live --catalog-only
node scripts/compare-grounded-ai.mjs --source live --provider ollama
```

The first command performs no inference or downloads. The second reads supported authorised files and runs the test questions. Private extracts/results are written only under ignored `artifacts/rag-comparison/` unless you explicitly choose another local directory; no automatic remote upload occurs. Reuse the same questions for comparison, or edit the synthetic case file to match an uploaded subject. Review the run's ingestion and coverage records before interpreting an abstention.

## Live state inspected 17 October 2026

The connected SmartBridge FET project `bbhrnidzjeccggununzq` had 0 tutor resources, 0 active knowledge-base resources, 0 CAPS documents and 0 objects in the three tutor/knowledge resource buckets at inspection. This was checked against the database; the CLI's separate read-only catalog check is recorded under `evals/live-catalog-check/results.json`. No real learner/tutor resource content was available to test. This does not establish that an unrelated project or account has no files.

## Verification

```bash
node --test tests/ai-comparison.test.js tests/resource-grounding.test.js
```

Tests cover grade/subject filtering, no-evidence/no-inference, citation/quote checks, prompt-injection rejection of invented sources, premium/inactive/unapproved filters, prohibited buckets/keys and authenticated file-request construction. Mock access tests supplement but do not replace production role and uploaded-file testing. Local user-JWT/premium paths still need verification with authorised real test accounts and files. No RLS policy was weakened to make the prototype work.

## Actual sample run

See `docs/grounded-sample-findings.md` and `evals/grounded-sample-run/results.json`. Results distinguish retrieval, model behaviour and validation. They must not be described as proof that the model is safe, multilingual, or ready for production.

## Owner-authorised merge/deployment scope

The owner requested merging PR #12 and deploying the English-only notice. Local-model generation now adds a server-owned English-only instruction, rejects declared non-English response languages and the explicit unsupported language names in the current tests, and explains that isiXhosa is unsupported. This is not a comprehensive language detector and does not cure the model's other failures. The OpenAI provider retains its independent language behaviour. Historical isiXhosa/Afrikaans test outputs above predate this gate and are not demonstrations of supported languages.

The study-assistant page displays the local experiment's language limitation and states that the local model is not connected to live chat. Merging the repository deploys the website code/notice, **not** a permanent local inference server. No hosted model machine is provisioned or paid fallback enabled. The existing online-provider release gate remains in place. A real hosted model service and reliability verification remain necessary before learners can use local-model chat.
