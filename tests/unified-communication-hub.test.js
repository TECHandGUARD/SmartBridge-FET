import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hub=readFileSync(new URL('../src/pages/FeatureHub.jsx',import.meta.url),'utf8');
const navigation=readFileSync(new URL('../src/lib/navigation.js',import.meta.url),'utf8');
test('communication has four role-aware sections',()=>{
 for(const name of ['Messages','Calls','Meetings','Study Rooms']) assert.ok(hub.includes(`['${name}'`),`${name} is available`);
 assert.match(hub,/path!=='\/meetings'/);
 assert.match(hub,/path!=='\/study-rooms'/);
 assert.match(hub,/useSearchParams/);
});
test('legacy study room and meeting destinations are preserved',()=>{
 assert.match(hub,/\['Study Rooms','\/study-rooms'/);
 assert.match(hub,/\['Meetings','\/meetings'/);
 assert.doesNotMatch(navigation,/item\('Study rooms', '\/study-rooms'/);
 assert.match(navigation,/item\('Communication', '\/communication'/);
});
