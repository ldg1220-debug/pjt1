/**
 * ISO 9606-1 §7 Pre-check — overall qualification verdict for a test record.
 *
 * Required NDE / mechanical tests:
 *   - VT (visual)                       — always required.
 *   - BW: RT or UT  AND  bending or fracture.
 *   - FW: macro or fracture.
 *   - Job knowledge (if tested) must be acceptable.
 */

export type PassResult = 'pass' | 'fail' | 'na';
export type JobKnowledge = 'acceptable' | 'not_acceptable' | 'not_tested';

export interface TestResultLike {
  vt?: PassResult;
  rt?: PassResult;
  ut?: PassResult;
  bending?: PassResult;
  fracture?: PassResult;
  macro?: PassResult;
  jobKnowledge?: JobKnowledge;
  weldType: 'BW' | 'FW';
}

export interface QualificationVerdict {
  qualified: boolean;
  reasons: string[];
}

function isPass(r: PassResult | undefined): boolean {
  return r === 'pass';
}

export function evaluateQualification(tr: TestResultLike): QualificationVerdict {
  const reasons: string[] = [];

  // VT — always required
  if (!isPass(tr.vt)) {
    reasons.push('Visual test (VT) is required and must pass');
  }

  if (tr.weldType === 'BW') {
    // RT or UT
    if (!isPass(tr.rt) && !isPass(tr.ut)) {
      reasons.push('BW requires RT or UT to pass');
    }
    // Bending or fracture
    if (!isPass(tr.bending) && !isPass(tr.fracture)) {
      reasons.push('BW requires bending or fracture test to pass');
    }
  } else if (tr.weldType === 'FW') {
    if (!isPass(tr.macro) && !isPass(tr.fracture)) {
      reasons.push('FW requires macro or fracture test to pass');
    }
  }

  // Job knowledge (only if tested)
  if (tr.jobKnowledge && tr.jobKnowledge !== 'not_tested') {
    if (tr.jobKnowledge !== 'acceptable') {
      reasons.push('Job knowledge test was not acceptable');
    }
  }

  return { qualified: reasons.length === 0, reasons };
}
