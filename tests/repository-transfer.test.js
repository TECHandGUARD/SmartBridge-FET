import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueryCache} from '../src/lib/query-cache.js';

test('query cache deduplicates in-flight reads and expires results',async()=>{
  let time=0,calls=0;const cache=createQueryCache({now:()=>time});
  const query=async()=>++calls;
  const first=cache.execute('row',query,100);
  assert.equal(first,cache.execute('row',query,100));
  assert.equal(await first,1);time=101;
  assert.equal(await cache.execute('row',query,100),2);
});
test('authentication invalidation prevents old requests from serving a new session',async()=>{
  const cache=createQueryCache();let rejectOld;
  const old=cache.execute('row',()=>new Promise((_,reject)=>{rejectOld=reject;}));
  await Promise.resolve();cache.clear();
  const current=cache.execute('row',async()=>'new-session');
  rejectOld(new Error('old-session'));await assert.rejects(old);
  assert.equal(await current,'new-session');assert.equal(cache.size,1);
  assert.equal(cache.execute('row',async()=>'wrong'),current);
});
test('query cache bounds stored results',async()=>{
  const cache=createQueryCache({maxEntries:2});
  for(const key of ['a','b','c'])await cache.execute(key,async()=>key);
  assert.equal(cache.size,2);
});
