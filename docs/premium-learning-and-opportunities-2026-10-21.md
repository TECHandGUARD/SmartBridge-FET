# Premium visual learning, term practice and verified opportunities

Learners can select a subject, grade and Term 2, 3 or 4 in Practice Quiz. The
published bank contains 270 five-question sets: 15 subjects × three grades ×
three term selections × two sets. Set A samples the selected term. Set B draws
mixed revision from the other two terms, explicitly including later-term topics.
The two sets in a selection have no questions in common. Revision deliberately
reuses items across selections: there are 675 distinct questions and 1,350 quiz
question placements, not 1,350 unique questions. Each has an answer explanation.

The new 135 challenge questions add error analysis, evidence evaluation and
contextual reasoning. `cognition.py` classifies each item using the relevant
subject framework. Each set spans at least two cognitive categories; it is not a
full examination or a reproduction of formal mark-weight percentages. Labels
are draft author judgements pending independent moderation. Learners select a
set explicitly and receive results broken down by cognitive category. Language
quizzes include original passages in English, Afrikaans, isiXhosa or isiZulu.
Results retain grade, subject, term, set and content version. Failed result saves remain
retryable; they do not report a successful save.

These are short formative samples mapped to selected CAPS/ATP topics, not a full
syllabus, prescribed-literature assessment or complete examination paper.
Independent teacher and language moderation remains pending and is disclosed.
`scripts/content/practice/atp-sources.json` records the official grade-level ATP
links. DBE Circular S19 of 2025 retains the relevant 2023/24 FET plans for 2026.
Physical Sciences uses the updated 2024 plans. Term 4 includes revision where the
subject plan specifies it; some Grade 10/11 subjects still introduce content.

All 45 explanatory SVGs now share an editorial illustration system: warm paper,
forest green, muted brass accents, consistent type, graph grids and refined
scientific drawings. Topic-specific visuals include plant-cell anatomy,
photosynthesis, a SWOT matrix, a spending multiplier and a travel budget.
Illustrations remain vectors. The reader has an accessible modal with 100–250%
zoom, scroll, reset and native Escape handling. Resource discovery, previews and
reader cards share the same visual language. The downloadable PDFs remain the
previous files; the new artwork is web-only.

The bursary finder reads published database records directly instead of calling
the absent matching function. It has searchable fields, exact deadlines, official
notice links, verification dates and open/closed filters. As of 21 October 2026,
the eight published schemes comprise four open and four closed rounds. Unknown
opening dates display “Not published”. Closed listings remain visible for
planning. Applications are completed with providers; no eligibility promise is
made. The original provider notices, including provider flyers hosted by
Stellenbosch University, are linked in each record. No estimates have been
substituted for next-cycle dates.

The NBT schedule contains all 23 sittings from the official 2027-intake calendar:
22 in 2026 and 9 January 2027. Three are online sessions. Registration, payment,
institution-result and writer-result dates are separate. The January sitting has
registration closing 6 December 2026, payment due 14 December, institution results
on 1 February 2027 and writer results on 8 February 2027. National sittings are
not presented as confirmed local seats. AQL includes AL and QL; QL is not listed
as a separate test booking. “Save to my planner” explicitly states that booking
and payment must happen on the official NBT portal. Existing registration-table
status vocabulary is retained for compatibility, with `metadata.tracking_only`
and `official_booking_confirmed: false`; no saved plan is labelled a confirmed
registration in the learner UI.

## Reproduction and verification

From the repository root:

```sh
python scripts/content/practice/build_catalogue.py
python scripts/content/practice/build_opportunities.py
python scripts/content/build_visuals.py
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e:opportunities
npm run test:e2e:content
```

The build needs the documented public Supabase environment variables. SQL seeds
under `db/seeds/practice-20261021` use deterministic UUIDs and upsert only their
own records. They do not clear tables, replace tutor-created quizzes or change
RLS. Re-running a seed does not duplicate its catalogue.

Live database verification confirmed 135 published quizzes, 540 questions, 15
subjects, eight bursaries and 23 NBT dates. A read under an authenticated account's
RLS context confirmed the same catalogue counts and precise Tourism/isiZulu term
queries. Browser checks use isolated learner fixtures with the actual catalogue
records; they do not use or fabricate a real learner's credentials, quiz results
or NBT bookings.
