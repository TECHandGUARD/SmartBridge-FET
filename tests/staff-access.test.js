import test from 'node:test';
import assert from 'node:assert/strict';
import {staffPermissions} from '../src/lib/staff-access.js';
import {getAccountDestination} from '../src/lib/navigation.js';
test('staff routing keeps full admins on admin and routes enabled registered staff to their workspace',()=>{
 assert.equal(getAccountDestination({role:'admin',onboarding_complete:true,staff_access:{enabled:true}}),'/admin');
 assert.equal(getAccountDestination({role:'user',staff_access:{enabled:true,permissions:['resources']}}),'/staff');
 assert.equal(getAccountDestination({role:'student',onboarding_complete:true,staff_access:{enabled:false,permissions:['resources']}}),'/student-dashboard');
});
test('only enabled catalogue duties become staff workspace modules',()=>{
 for(const value of [null,{},[],{enabled:false,permissions:['resources']},{enabled:true,permissions:'resources'}])assert.deepEqual(staffPermissions(value),[]);
 assert.deepEqual(staffPermissions({enabled:true,permissions:['payments','resources','resources','announcements','admin']}),['resources','announcements']);
});
