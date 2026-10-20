# SmartBridge FET study collection — first edition

## Published scope

45 original, focused topic guides: one guide for each of the 15 supported subjects in each of Grades 10, 11 and 12. This is a starter collection of selected topics, not 45 complete textbooks or complete syllabus coverage. Each two-page PDF contains goals, original explanations, a visual table, a worked example, three practice questions, an answer guide and a curriculum reference. Language guides use original short texts rather than claiming to reproduce prescribed literature.

Signed-out visits to the app root open the public catalogue; signed-in users retain their home page. The public `/learn` page and `/study-packs/:packId` readers use the same JSON source as the PDFs. The catalogue derives counts from the actual content. `study-pack-files.json` records bytes and SHA-256 hashes; unit tests verify every file. All 45 PDFs together are approximately 3.1 MB, about 67 KB per guide. Learners can download files for offline reading; the app itself still needs connectivity.

## Authorship and sources

Original SmartBridge FET text and visual tables, with AI-assisted authoring. Subject-teacher and language-specialist review is pending and is disclosed in both the reader and PDFs. No DBE endorsement or independent quality accreditation is claimed. `scripts/content/caps-sources.json` contains the official DBE subject references used for topic mapping. History uses the existing published CAPS topics; the 2026 draft curriculum consultation is not treated as an implemented replacement. Check subsequent adopted amendments during editorial review.

The eight existing educational books retain Siyavula attribution. The pre-existing 1,234 indexed passages currently cover only the Grade 10 Life Sciences and Physical Sciences books (543 and 691 passages respectively), rather than all eight books. Relevant cell-structure and motion passages informed supplementary reading references in the two matching guides; no publisher book is rebranded as a SmartBridge original. The new guides contribute 135 original indexed passages across all supported subjects, preserving the existing index.

The guides remain free. Public marketing links open real readers and PDFs without sign-in. Signed-in resource search and subject pages link to the same collection. Resource metadata identifies the exact topic and pending editorial review; publication approval is not represented as teacher review.

## Reliability changes

- Learner assessment answers save to the server, resume after refresh and show save/retry status. Concurrent tabs use revision checks; another learner cannot read/write the draft. Server deadlines remain authoritative. Attachments must be reselected after reopening; pending network changes require keeping the page open until Saved.
- New booking commission benefits depend on a dated, active tutor-Pro receipt. A stale `users.is_premium` flag no longer waives commission. Existing booking price snapshots remain intact.
- Premium UI checks dated subscriptions rather than the legacy flag and uses Johannesburg dates.
- A native ten-minute database expiry job runs without relying on external worker credentials. It sends no email and preserves the other job settings and meeting reminder worker.
- Knowledge invalidation now works with both `resource_url` and `file_url` table shapes, and removes stale original-guide passages when publication status, file, curriculum scope or file hash changes.
- The malformed markdown-wrapped Grade 11 Siyavula book URL is repaired.
- Unsupported homepage claims about tutor/resource counts and compliance badges are replaced by actual collection figures.

## Verification

123 unit tests; 23 SQL workflow/security fixtures including draft ownership, resume data, deadline calculation, stale writes, submission locking, expired/current Pro commission and schema-safe index invalidation. Public browser tests cover actual PDF downloading, filters, answer reveals, isiXhosa reader language and 360/390/768/1440 layouts. A separate phone-width browser test covers refresh/resume and failed-save recovery. All 90 PDF pages were rendered for visual inspection; page counts, text bounds, branding and answer-guide presence are checked.

Physical mobile-carrier/device certification and independent curriculum/language review remain outstanding. This release does not claim completion of every wider operational, safeguarding, analytics or growth recommendation in the executive review.

## Rebuild and publication

Run `python scripts/content/author_packs.py`, then `python scripts/content/build_pdfs.py` (ReportLab, DejaVu fonts), then `python scripts/content/publish_catalogue.py`. Commit the source, PDFs, manifest and generated `db/publish-study-catalogue.sql` together. Publish the latter only after the corresponding assets are deployed. The SQL is idempotent for guide IDs and index passage keys. It does not overwrite unrelated resources or original publisher passages.

For updates, regenerate the assets and use an explicitly reviewed metadata update for the affected resource IDs; the initial publication insert intentionally does not replace administrator edits. Rebuild index passages only after the changed PDF and metadata agree. Never label a guide teacher-reviewed without a recorded reviewer and date.
