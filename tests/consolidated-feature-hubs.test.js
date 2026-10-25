import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('consolidated hubs are additive and preserve legacy routes',()=>{
 const app=read('src/App.jsx');
 for(const path of ['/learning-hub','/practice-hub','/communication','/career-hub','/learn','/videos','/resources-library','/search','/quiz','/assessments','/meetings','/forum','/bursaries','/opportunities','/bookings','/presentations']){
  assert.ok(app.includes('path="'+path+'"'),'missing route '+path);
 }
});
test('hub links lead to existing feature routes',()=>{
 const hub=read('src/pages/FeatureHub.jsx');
 for(const path of ['/subjects','/learn','/search','/resources-library','/videos','/quiz','/assessments','/meetings','/bursaries','/opportunities'])assert.ok(hub.includes("'"+path+"'"));
});
test('navigation points to unified hubs',()=>{
 const nav=read('src/lib/navigation.js');
 for(const path of ['/learning-hub','/practice-hub','/communication','/career-hub'])assert.ok(nav.includes("'"+path+"'"));
});
test('data and server behavior remain untouched',()=>{
 const hub=read('src/pages/FeatureHub.jsx');
 assert.ok(!/\.from\(|\.rpc\(|delete\(|update\(/.test(hub));
});
