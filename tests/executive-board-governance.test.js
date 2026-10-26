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
