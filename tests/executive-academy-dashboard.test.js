import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('training dashboard surfaces reviewed legacy evidence but never claims academy certification',()=>{
 const ui=readFileSync(new URL('../src/components/admin/ExecutiveTrainingRecords.jsx',import.meta.url),'utf8');
 assert.match(ui,/summarizeLegacyExecutiveReviews/);
 assert.match(ui,/ai_executive_reviews/);
 assert.match(ui,/Academy certification: Not certified/);
 assert.match(ui,/No executive is activated by this display/);
});
