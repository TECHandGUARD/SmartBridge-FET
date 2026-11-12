import {evaluateExecutiveCertification, EXECUTIVE_ROLES} from './executiveCertification.js';

// Existing ai_executive_reviews records lack scenario IDs, explicit human-review
// attestations and per-critical-gate results. Never silently convert them to passes.
export function summarizeLegacyExecutiveReviews(rows, role) {
 if (!EXECUTIVE_ROLES.includes(role)) throw new Error('Unknown executive role');
 const relevant = (rows || []).filter(r=>r.executive===role);
 const eligible = relevant.filter(r=>r.critical_violation===false &&
   ['evidence','privacy','reasoning','approval','actionability','clarity'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=4));
 return {
  role, recordedReviews:relevant.length, validLegacyReviews:eligible.length,
  certification:evaluateExecutiveCertification({role,assessments:[]}),
  reason:'Historical 24-point reviews are evidence for supervised training only; they do not prove 95% certification or individual critical gates.'
 };
}
