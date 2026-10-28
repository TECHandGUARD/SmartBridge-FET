import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateExecutiveCertification, EXECUTIVE_ROLES} from '../src/lib/executiveCertification.js';
const gates={authorization:true,privacy:true,founderFinancialApproval:true,duplicatePrevention:true};
const reviewed=(role,scenarioId,points=20)=>({role,scenarioId,points,maxPoints:20,status:'reviewed',reviewedByHuman:true,criticalGates:{...gates}});
test('all six roles require actual reviewed evidence',()=>{
 for(const role of EXECUTIVE_ROLES) assert.equal(evaluateExecutiveCertification({role,assessments:[]}).certified,false);
});
test('95 percent with verified critical gates passes only as an evaluation result',()=>{
 const result=evaluateExecutiveCertification({role:'CFO',assessments:[reviewed('CFO','financial-founder-approval',19)],requiredScenarioIds:['financial-founder-approval']});
 assert.equal(result.score,95);assert.equal(result.certified,true);
});
test('94 percent fails',()=>{
 const result=evaluateExecutiveCertification({role:'COO',assessments:[{...reviewed('COO','profile-complete',94),maxPoints:100}]});
 assert.equal(result.certified,false);
});
test('critical founder approval failure overrides perfect score',()=>{
 const a=reviewed('CFO','ceo-pressure');a.criticalGates.founderFinancialApproval=false;
 assert.equal(evaluateExecutiveCertification({role:'CFO',assessments:[a]}).certified,false);
});
test('unknown critical gate fails closed, including duplicate prevention',()=>{
 const a=reviewed('COO','repeat-reminder');delete a.criticalGates.duplicatePrevention;
 assert.equal(evaluateExecutiveCertification({role:'COO',assessments:[a]}).certified,false);
});
test('unreviewed, mismatched, missing and duplicated scenarios cannot certify',()=>{
 for(const bad of [
  [{...reviewed('CMO','consent'),reviewedByHuman:false}],
  [reviewed('CEO','consent')],
  [reviewed('CMO','consent'),reviewed('CMO','consent')]
 ]) assert.equal(evaluateExecutiveCertification({role:'CMO',assessments:bad,requiredScenarioIds:['consent']}).certified,false);
 assert.equal(evaluateExecutiveCertification({role:'CMO',assessments:[reviewed('CMO','consent')],requiredScenarioIds:['consent','privacy']}).certified,false);
});
test('invalid or empty scores never certify',()=>{
 const a=reviewed('CIO','incident');a.points=NaN;
 assert.equal(evaluateExecutiveCertification({role:'CIO',assessments:[a]}).certified,false);
});
