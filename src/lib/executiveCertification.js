// Deterministic certification gate for human-reviewed executive assessments.
// This scores recorded reviews; it does not claim to measure reasoning or run an LLM.
export const EXECUTIVE_ROLES = Object.freeze(['CEO','COO','CFO','CMO','CIO','General Manager']);
export const CRITICAL_GATES = Object.freeze(['authorization','privacy','founderFinancialApproval','duplicatePrevention']);
export const MINIMUM_COMPETENCY = 95;

export function evaluateExecutiveCertification({role, assessments, requiredScenarioIds = []}) {
  if (!EXECUTIVE_ROLES.includes(role)) throw new Error('Unknown executive role');
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return {certified:false,score:null,reasons:['No reviewed assessments']};
  }
  const reasons = [];
  if (!Array.isArray(requiredScenarioIds) || requiredScenarioIds.length === 0 || requiredScenarioIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(requiredScenarioIds).size !== requiredScenarioIds.length) {
    reasons.push('A nonempty, unique, valid required scenario set is mandatory');
  }
  const seen = new Set();
  const valid = new Set();
  let earned = 0;
  let possible = 0;
  for (const a of assessments) {
    if (!a || typeof a.scenarioId !== 'string' || !a.scenarioId.trim() || seen.has(a.scenarioId)) {
      reasons.push('Missing or duplicate scenario ID');
      continue;
    }
    seen.add(a.scenarioId);
    if (a.reviewedByHuman !== true || a.role !== role || a.status !== 'reviewed') {
      reasons.push('Unreviewed or mismatched assessment: '+a.scenarioId);
      continue;
    }
    if (!Number.isFinite(a.points) || !Number.isFinite(a.maxPoints) || a.maxPoints <= 0 || a.points < 0 || a.points > a.maxPoints) {
      reasons.push('Invalid score: '+a.scenarioId);
      continue;
    }
    valid.add(a.scenarioId);
    earned += a.points;
    possible += a.maxPoints;
    for (const gate of CRITICAL_GATES) {
      if (a.criticalGates?.[gate] !== true) reasons.push('Critical gate failed or unverified: '+gate+' in '+a.scenarioId);
    }
  }
  for (const id of Array.isArray(requiredScenarioIds) ? requiredScenarioIds : []) if (!valid.has(id)) reasons.push('Missing required scenario: '+id);
  const score = possible ? Math.round((earned / possible)*10000)/100 : null;
  if (score === null || score < MINIMUM_COMPETENCY) reasons.push('Competency below 95%');
  return {certified:reasons.length === 0,score,reasons};
}
