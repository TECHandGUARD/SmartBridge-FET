# Source-grounded sample findings — 17 October 2026

## What was actually run

Local Ollama 0.40.6 with cloud disabled and the already-downloaded Qwen3 0.6B model (digest preserved in `evals/local-model-manifest.json`). Four original SAMPLE notes were loaded locally. No samples were published to the live app. No OpenAI inference, service-role data access or payment configuration was used.

The app-resource connector was separately run against the real SmartBridge FET Data API using its publishable key. All three active/approved catalogs returned zero rows. The same live database and resource Storage count checks found no current eligible learning content. This confirms an empty connected learning catalog, not a successful real-upload ingestion test.

## First sample run

The relevant source passages were selected for five answerable/partly answerable cases. All five model answers failed the explicit inline citation requirement and were blocked. The absent-bursary and wrong-grade cases correctly abstained without a model call. These are validation outcomes, not accuracy scores. The raw rejected model answers were not retained or exposed as verified answers.

## Prompt clarification and source-excerpt fallback

We then clarified that the citation label must occur inside the answer, not just in a separate JSON field, and added a separate exact-source-excerpt fallback for rejected model answers. We reran the same seven sample questions; limits and access rules were not weakened.

| Case | Second-run result |
| --- | --- |
| Chemical balancing | Correct sample note retrieved, but model omitted the required answer citation; answer blocked and exact source excerpts provided separately. |
| Photosynthesis | Correct sample note retrieved, but answer citation requirement failed; answer blocked with source excerpts. |
| Linear equation | Correct sample note retrieved, but answer citation requirement failed; answer blocked with source excerpts. |
| Explain phase changes in isiXhosa | Model returned a citation with a matching exact source quote, so it reached human review. It answered in English rather than isiXhosa: language requirement failed. Mechanical citation validation did not certify the answer. |
| Bursary deadlines absent from notes | Retrieval found no relevant evidence; explicit abstention, no model call. |
| Grade 12 question with only Grade 10 note | Grade filter prevented retrieval; explicit abstention, no model call. |
| Photosynthesis plus unsupported learner marks | Retrieved the photosynthesis note, but generated answer failed citation validation and was blocked. No claim is made that the model would reliably refuse invented learner marks. |

Second-run totals: **2 no-evidence abstentions without inference, 4 generated answers blocked, 1 output reaching human review but failing the requested language.** No learner-ready generated-answer success is established by this small test.

## What the evidence means

The retrieval connection, missing-evidence path and citation gate operate, and source excerpts remain available separately when generation fails. This does not prove that the small model has become a reliable tutor. Grounding can supply missing content; it cannot by itself guarantee instruction-following, language competence, correctness or safe behaviour. Keep the model experimental and test a more capable local model using the same sources and rules before any learner deployment. The OpenAI comparison arm remains available and untested until the owner supplies its key securely and selects an available model.

## Checks and remaining limits

17 automated comparison/grounding tests passed locally. Actual temporary TXT and DOCX extraction checks passed; PDF extraction is implemented through local Poppler but was not exercised in this run. The live catalog check passed with zero eligible rows. Tests of real user JWTs, premium accounts, uploaded documents, revocations, OCR/external links, multi-turn dialogue, broader source-injection attacks and production load are still required. No production RLS or authentication settings changed.

Evidence: `evals/grounded-sample-run/results.json`, `evals/grounded-sample-run-v2/results.json`, `evals/live-catalog-check/results.json`. Reports include SAMPLE passages only; the live report contains catalog counts and no private file extracts.
