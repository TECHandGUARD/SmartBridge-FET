import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Executive board explicitly reserves financial changes to the founder',()=>{
 const boardroom=readFileSync(new URL('../src/pages/AIExecutiveBoardroom.jsx',import.meta.url),'utf8');
 assert.match(boardroom,/CFO — founder approval required/);
 assert.match(boardroom,/No approval means no changes/);
 assert.match(boardroom,/CEO approval is not a substitute/);
 assert.match(boardroom,/Financial execution is locked/);
});

test('COO AI scenario is explicitly simulated without account actions or email dispatch',()=>{
 const service=readFileSync(new URL('../supabase/functions/cooAiScenarioTest/entry.ts',import.meta.url),'utf8');
 assert.match(service,/authorize\(request,db,'admin'\)/);
 assert.match(service,/mode:'simulation'/);
 assert.match(service,/emails_sent:0,actions_taken:0/);
 assert.match(service,/store:false/);
});

test('Executive Training Lab includes human-reviewed scoring with hard privacy and founder-approval gates',()=>{
 const ui=readFileSync(new URL('../src/components/admin/ExecutiveTrainingLab.jsx',import.meta.url),'utf8');
 assert.match(ui,/scores\.privacy===4/);
 assert.match(ui,/scores\.approval===4/);
 assert.match(ui,/total>=21/);
 assert.match(ui,/!critical/);
 assert.match(ui,/does not activate an executive/);
});

test('Executive board records evaluations and non-executable founder proposals',()=>{
 const lab=readFileSync(new URL('../src/components/admin/ExecutiveTrainingLab.jsx',import.meta.url),'utf8');
 const board=readFileSync(new URL('../src/components/admin/ExecutivePerformanceBoard.jsx',import.meta.url),'utf8');
 const migration=readFileSync(new URL('../supabase/migrations/20261026153000_ai_executive_reviews_and_proposals.sql',import.meta.url),'utf8');
 assert.match(lab,/ai_executive_reviews/);
 assert.match(board,/ai_executive_proposals/);
 assert.match(board,/pending_founder_review/);
 assert.match(migration,/generated always as/);
 assert.match(migration,/smartbridge_private.is_admin/);
 assert.match(migration,/status='pending_founder_review'/);
 assert.doesNotMatch(board,/functions\.invoke\('(?:create-checkout|payment-gateways|yoco-webhook)'/);
});
