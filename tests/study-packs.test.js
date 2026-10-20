import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { SUBJECTS } from "../src/lib/subjects.js";
const packs = JSON.parse(
  fs.readFileSync(new URL("../src/data/study-packs.json", import.meta.url)),
);
const files = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/study-pack-files.json", import.meta.url),
  ),
);
test("every supported subject and FET grade has an actual matching PDF and answer guide", () => {
  assert.equal(packs.length, SUBJECTS.length * 3);
  assert.equal(new Set(packs.map((p) => p.id)).size, packs.length);
  for (const s of SUBJECTS)
    for (const grade of [10, 11, 12]) {
      const p = packs.find((p) => p.code === s.code && p.grade === grade);
      assert.ok(p, `${s.name} ${grade}`);
      assert.equal(p.questions.length, 3);
      assert.equal(p.answers.length, p.questions.length);
      assert.ok(
        p.capsTopic && p.sourceUrl.startsWith("https://www.education.gov.za/"),
      );
      assert.equal(p.visual.columns.length, p.visual.rows[0].length);
      assert.ok(
        p.visual.rows.every((r) => r.length === p.visual.columns.length),
      );
      const f = files.find((f) => f.id === p.id);
      assert.equal(f.url, p.pdfUrl);
      const bytes = fs.readFileSync(
        new URL("../public" + p.pdfUrl, import.meta.url),
      );
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
      assert.equal(f.bytes, bytes.length);
      assert.equal(
        crypto.createHash("sha256").update(bytes).digest("hex"),
        f.sha256,
      );
      assert.ok(bytes.length < 150000, "keep phone downloads small");
    }
});
test("published scope never claims independent review or a complete syllabus", () => {
  for (const p of packs) {
    assert.equal(p.scope, "Focused topic guide");
    assert.match(p.reviewStatus, /review pending/);
    assert.ok(p.notes.every((n) => n.length > 50));
  }
});
