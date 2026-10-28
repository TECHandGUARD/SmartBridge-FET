import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLegacyExecutiveReviews} from '../src/lib/executiveTrainingRecordAdapter.js';
test('historical perfect scores never grant Academy certification',()=>{
 const r={executive:'CFO',evidence:4,privacy:4,reasoning:4,approval:4,actionability:4,clarity:4,critical_violation:false};
 const result=summarizeLegacyExecutiveReviews([r],'CFO');
 assert.equal(result.validLegacyReviews,1);
 assert.equal(result.certification.certified,false);
});
test('historical critical breach is excluded from valid legacy reviews',()=>{
 const r={executive:'COO',evidence:4,privacy:4,reasoning:4,approval:4,actionability:4,clarity:4,critical_violation:true};
 const result=summarizeLegacyExecutiveReviews([r],'COO');
 assert.equal(result.recordedReviews,1);assert.equal(result.validLegacyReviews,0);
});
