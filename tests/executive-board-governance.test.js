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
 const migration=readFileSync(new URL('../supabase/migrations/20261026134125_ai_executive_reviews_and_proposals.sql',import.meta.url),'utf8');
 assert.match(lab,/ai_executive_reviews/);
 assert.match(board,/ai_executive_proposals/);
 assert.match(board,/pending_founder_review/);
 assert.match(migration,/generated always as/);
 assert.match(migration,/smartbridge_private.is_admin/);
 assert.match(migration,/status='pending_founder_review'/);
 assert.doesNotMatch(board,/functions\.invoke\('(?:create-checkout|payment-gateways|yoco-webhook)'/);
});

test('Read-only snapshot is administrator-scoped and excludes personal details and financial amounts',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261026134129_ai_board_operating_snapshot.sql',import.meta.url),'utf8');
 const board=readFileSync(new URL('../src/components/admin/ExecutivePerformanceBoard.jsx',import.meta.url),'utf8');
 assert.match(sql,/smartbridge_private.is_admin\(auth.uid\(\)\)/);
 assert.match(sql,/revoke all on function public.ai_board_operating_snapshot/);
 assert.match(board,/ai_board_operating_snapshot/);
 assert.doesNotMatch(sql,/recipient_email|email_address|full_name|amount_cents/);
});
test('Executive curriculum includes founder-only CFO protection and all six portfolios',()=>{
 const guidance=readFileSync(new URL('../src/lib/executiveRoleGuidance.js',import.meta.url),'utf8');
 for(const role of ['CEO','COO','CFO','CMO','CIO','General Manager'])assert.ok(guidance.includes(role));
 assert.match(guidance,/CEO approval is NEVER a substitute/);
});

test('Every executive has competency scenarios, missing-guidance preparation, and founder-only CFO protections',()=>{
 const lab=readFileSync(new URL('../src/components/admin/ExecutiveTrainingLab.jsx',import.meta.url),'utf8');
 const records=readFileSync(new URL('../src/components/admin/ExecutiveTrainingRecords.jsx',import.meta.url),'utf8');
 for(const role of ['CEO','COO','CFO','CMO','CIO','General Manager'])assert.ok(lab.includes(role));
 assert.match(lab,/scenarioBank\[chosen\]/);
 assert.match(lab,/founder will approve later/);
 assert.match(records,/prepareMissing/);
 assert.match(records,/status:'draft'/);
 assert.match(records,/None were automatically approved/);
});
