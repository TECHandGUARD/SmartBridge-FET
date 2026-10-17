import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeDirectMessages} from '../src/lib/direct-messages.js';
test('polling preserves older history and a send acknowledged after the poll began',()=>{
 const old={id:'a',created_at:'2026-10-17T10:00:00Z'},latest={id:'b',created_at:'2026-10-17T10:01:00Z'},sent={id:'c',created_at:'2026-10-17T10:02:00Z'};
 assert.deepEqual(mergeDirectMessages([old,latest,sent],[latest]).map(row=>row.id),['a','b','c']);
});
test('read receipt refresh replaces the same message rather than duplicating it',()=>{
 const original={id:'a',created_at:'2026-10-17T10:00:00Z',read_at:null};
 const updated={...original,read_at:'2026-10-17T10:01:00Z'};
 assert.deepEqual(mergeDirectMessages([original],[updated]),[updated]);
});
