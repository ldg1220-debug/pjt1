/**
 * Approval Range calculation engine — ISO 9606-1:2012.
 *
 * Pure function: given a (validated) test record + a RuleSetRuntime,
 * derive the qualified approval ranges and an audit log of each step.
 *
 * Reference: docs/02-approval-range-logic.md §7 (pseudocode).
 */

import { evaluateExpression, evaluatePredicate } from './expression';
import { renderDesignation, renderReferenceNo } from './designation';
import type { RuleSetRuntime } from './rule-loader';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CalculationInput {
  process: string;
  productType: 'P' | 'T';
  outsideDiameterMm?: number | null;
  weldType: 'BW' | 'FW';
  thicknessMm: number;
  positionCode: string;
  fillerGroup: string;
  fillerDesignation: string;
  shieldingGas: string;
  materialGroup: string;
  weldDetail: string;
}

export interface CalcStep {
  variable: string;
  ruleTableKey?: string;
  input: unknown;
  matchedCondition?: string;
  output: unknown;
}

export interface CalculationResult {
  processes: string[];
  productTypes: Array<'P' | 'T'>;
  diameterMinMm: number | null;
  diameterMaxMm: number | null;
  weldTypes: Array<'BW' | 'FW'>;
  materialGroups: string[];
  fillerGroups: string[];
  fillerDesignations: string[];
  shieldingGases: string[];
  thicknessMinMm: number;
  thicknessMaxMm: number | null;
  positions: string[];
  weldDetails: string[];
  designationString: string;
  referenceNo: string;
  calcLog: CalcStep[];
}

export interface CalculationOptions {
  organizationCode?: string;
  welderSuffix?: string;
  refTemplate?: string;
}

// ---------------------------------------------------------------------------
// Rule-table payload shapes (what the engine expects to read)
// ---------------------------------------------------------------------------

interface RangeMap {
  ranges: Record<string, string[]>;
}

interface ThicknessRulePayload {
  variables?: string[];
  conditions: Array<{
    when: string;
    output: { min: number | string; max: number | string | null };
  }>;
}

interface ProductDiameterPayload {
  variables?: string[];
  cases: Array<{
    label?: string;
    when: string;
    output: {
      product_types: Array<'P' | 'T'>;
      D_min: number | string | null;
      D_max: number | string | null;
      positions_note?: string;
      conditional?: {
        when_positions: string[];
        D_min: number | string | null;
      };
    };
  }>;
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export function calculateApprovalRange(
  input: CalculationInput,
  rules: RuleSetRuntime,
  options: CalculationOptions = {},
): CalculationResult {
  const calcLog: CalcStep[] = [];

  // 1. Process
  const processes = [input.process];
  calcLog.push({
    variable: 'process',
    input: input.process,
    output: processes,
  });

  // 2. Product type & diameter
  const productResult = calculateProductRange(input, rules, calcLog);

  // 3. Weld type
  const weldTypes: Array<'BW' | 'FW'> = input.weldType === 'BW' ? ['BW', 'FW'] : ['FW'];
  calcLog.push({
    variable: 'weld_type',
    input: input.weldType,
    output: weldTypes,
  });

  // 4. Material group
  const materialGroups = lookupRangeMap(
    rules,
    'material_group_range',
    input.materialGroup,
    'material_group',
    calcLog,
    /* fallback */ [input.materialGroup],
  );

  // 5. Filler group
  const fillerGroups = lookupRangeMap(
    rules,
    'filler_group_range',
    input.fillerGroup,
    'filler_group',
    calcLog,
    [input.fillerGroup],
  );

  // 6. Filler designation
  const fillerDesignations = computeFillerDesignations(input.fillerDesignation, calcLog);

  // 7. Shielding gas (similar passthrough)
  const shieldingGases = [`${input.shieldingGas} (similar)`];
  calcLog.push({
    variable: 'shielding_gas',
    input: input.shieldingGas,
    output: shieldingGases,
  });

  // 8. Thickness
  const { min: thicknessMinMm, max: thicknessMaxMm } = computeThicknessRange(
    input,
    rules,
    calcLog,
  );

  // 9. Position
  const positions = computePositions(input, rules, calcLog);

  // 10. Weld detail
  const weldDetails = lookupRangeMap(
    rules,
    'weld_detail_range',
    input.weldDetail,
    'weld_detail',
    calcLog,
    [input.weldDetail],
  );

  // 11. Designation
  const designationString = renderDesignation({
    process: input.process,
    productType: input.productType,
    weldType: input.weldType,
    fillerGroup: input.fillerGroup,
    fillerDesignation: input.fillerDesignation,
    thicknessMm: input.thicknessMm,
    positionCode: input.positionCode,
    weldDetail: input.weldDetail,
  });
  calcLog.push({
    variable: 'designation',
    input,
    output: designationString,
  });

  // 12. Reference No
  const referenceNo = renderReferenceNo(input, options);
  calcLog.push({
    variable: 'reference',
    input: { template: options.refTemplate, organizationCode: options.organizationCode, welderSuffix: options.welderSuffix },
    output: referenceNo,
  });

  return {
    processes,
    productTypes: productResult.productTypes,
    diameterMinMm: productResult.D_min,
    diameterMaxMm: productResult.D_max,
    weldTypes,
    materialGroups,
    fillerGroups,
    fillerDesignations,
    shieldingGases,
    thicknessMinMm,
    thicknessMaxMm,
    positions,
    weldDetails,
    designationString,
    referenceNo,
    calcLog,
  };
}

// ---------------------------------------------------------------------------
// Helpers — each returns the computed value AND mutates `calcLog`.
// ---------------------------------------------------------------------------

function lookupRangeMap(
  rules: RuleSetRuntime,
  tableKey: string,
  testedKey: string,
  variable: string,
  calcLog: CalcStep[],
  fallback: string[],
): string[] {
  let result = fallback;
  let matched: string | undefined;
  try {
    const table = rules.getTable<RangeMap>(tableKey);
    if (table?.ranges && testedKey in table.ranges) {
      result = table.ranges[testedKey];
      matched = `${tableKey}[${testedKey}]`;
    } else {
      matched = `no entry for '${testedKey}' — passthrough`;
    }
  } catch {
    matched = `${tableKey} unavailable — passthrough`;
  }
  calcLog.push({
    variable,
    ruleTableKey: tableKey,
    input: testedKey,
    matchedCondition: matched,
    output: result,
  });
  return result;
}

function computeFillerDesignations(tested: string, calcLog: CalcStep[]): string[] {
  // ISO 9606-1: tested designation is the only qualified one, except `B`
  // qualifies B and S (per docs/02-approval-range-logic.md §2.6).
  let output: string[];
  let rule: string;
  if (tested === 'B') {
    output = ['B', 'S'];
    rule = 'Footnote: B qualifies B and S';
  } else {
    output = [tested];
    rule = 'Tested designation only';
  }
  calcLog.push({
    variable: 'filler_designation',
    input: tested,
    matchedCondition: rule,
    output,
  });
  return output;
}

function computeThicknessRange(
  input: CalculationInput,
  rules: RuleSetRuntime,
  calcLog: CalcStep[],
): { min: number; max: number | null } {
  const tableKey = input.weldType === 'BW' ? 'thickness_range_bw' : 'thickness_range_fw';
  const payload = rules.getTable<ThicknessRulePayload>(tableKey);
  const t = input.thicknessMm;
  const vars = { t };

  for (const cond of payload.conditions) {
    if (evaluatePredicate(cond.when, vars)) {
      const min = evaluateExpression(cond.output.min, vars);
      const max = evaluateExpression(cond.output.max, vars);
      if (min === null) {
        throw new Error(`Thickness min cannot be null (table ${tableKey})`);
      }
      calcLog.push({
        variable: 'thickness',
        ruleTableKey: tableKey,
        input: t,
        matchedCondition: cond.when,
        output: [min, max],
      });
      return { min, max };
    }
  }

  throw new Error(
    `No matching thickness rule for t=${t} in '${tableKey}' (rule_set ${rules.code})`,
  );
}

function computePositions(
  input: CalculationInput,
  rules: RuleSetRuntime,
  calcLog: CalcStep[],
): string[] {
  // Position table key: position_range_<weldtype>_<product>
  const wt = input.weldType.toLowerCase();
  const pt = input.productType === 'P' ? 'plate' : 'pipe';
  const tableKey = `position_range_${wt}_${pt}`;
  const payload = rules.getTable<RangeMap>(tableKey);

  let output: string[];
  let matched: string;
  if (payload.ranges && input.positionCode in payload.ranges) {
    output = payload.ranges[input.positionCode];
    matched = `${tableKey}[${input.positionCode}]`;
  } else {
    output = [input.positionCode];
    matched = `no entry for '${input.positionCode}' — passthrough`;
  }
  calcLog.push({
    variable: 'position',
    ruleTableKey: tableKey,
    input: input.positionCode,
    matchedCondition: matched,
    output,
  });
  return output;
}

function calculateProductRange(
  input: CalculationInput,
  rules: RuleSetRuntime,
  calcLog: CalcStep[],
): {
  productTypes: Array<'P' | 'T'>;
  D_min: number | null;
  D_max: number | null;
} {
  const payload = rules.getTable<ProductDiameterPayload>('product_diameter_rule');
  const D = input.outsideDiameterMm ?? 0;
  const vars: Record<string, number | string> = {
    productType: input.productType,
    D,
  };

  for (const c of payload.cases) {
    if (evaluatePredicate(c.when, vars)) {
      const dMin = evaluateExpression(c.output.D_min, vars);
      const dMax = evaluateExpression(c.output.D_max, vars);

      calcLog.push({
        variable: 'product',
        ruleTableKey: 'product_diameter_rule',
        input: { productType: input.productType, D },
        matchedCondition: c.label ?? c.when,
        output: { product_types: c.output.product_types, D_min: dMin, D_max: dMax },
      });

      // Conditional note — e.g. "plate also qualifies pipes ≥150 mm at PA/PC".
      // Recorded in calc_log only; headline diameter stays the conservative
      // base value (Stage 3 may surface this via a secondary range).
      if (
        c.output.conditional &&
        c.output.conditional.when_positions.includes(input.positionCode)
      ) {
        const altMin = evaluateExpression(c.output.conditional.D_min, vars);
        calcLog.push({
          variable: 'product_conditional',
          ruleTableKey: 'product_diameter_rule',
          input: { positionCode: input.positionCode },
          matchedCondition: `position ${input.positionCode} in [${c.output.conditional.when_positions.join(', ')}]`,
          output: { D_min: altMin },
        });
      }

      return {
        productTypes: c.output.product_types,
        D_min: dMin,
        D_max: dMax,
      };
    }
  }

  throw new Error(
    `No matching product/diameter rule for productType=${input.productType} D=${D}`,
  );
}
