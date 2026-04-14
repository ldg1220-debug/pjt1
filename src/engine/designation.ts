/**
 * Designation & Reference No renderers.
 *
 * Designation format (ISO 9606-1):
 *   "EN ISO 9606-1 <process> <P|T> <BW|FW> FM<n> <S|M|B...> t<thk> <position> <detail>"
 *
 * Reference No template (default):
 *   "EN 9606-1-{ORG}-{WELDER}-{PROCESS}-t{THK}-{WELDTYPE}-{POSITION}"
 *
 * Unknown placeholders are left intact so callers can post-fill (e.g. UI form).
 */

import type { CalculationInput } from './calculate-approval-range';

export interface DesignationParts {
  process: string;
  productType: 'P' | 'T';
  weldType: 'BW' | 'FW';
  fillerGroup: string;
  fillerDesignation: string;
  thicknessMm: number;
  positionCode: string;
  weldDetail: string;
}

export function renderDesignation(parts: DesignationParts): string {
  return [
    'EN ISO 9606-1',
    parts.process,
    parts.productType,
    parts.weldType,
    parts.fillerGroup,
    parts.fillerDesignation,
    `t${formatThickness(parts.thicknessMm)}`,
    parts.positionCode,
    parts.weldDetail,
  ].join(' ');
}

function formatThickness(t: number): string {
  // 2.3 → "2.3", 10 → "10" (no trailing zeros).
  if (Number.isInteger(t)) return String(t);
  return String(parseFloat(t.toFixed(3)));
}

export interface ReferenceTemplateOptions {
  organizationCode?: string;
  welderSuffix?: string;
  refTemplate?: string;
}

export const DEFAULT_REFERENCE_TEMPLATE =
  'EN 9606-1-{ORG}-{WELDER}-{PROCESS}-t{THK}-{WELDTYPE}-{POSITION}';

export function renderReferenceNo(
  input: CalculationInput,
  opts: ReferenceTemplateOptions = {},
): string {
  const tpl = opts.refTemplate ?? DEFAULT_REFERENCE_TEMPLATE;

  const replacements: Record<string, string> = {
    PROCESS: input.process,
    THK: formatThickness(input.thicknessMm),
    WELDTYPE: input.weldType,
    POSITION: input.positionCode,
    PRODUCT: input.productType,
    FILLER_GROUP: input.fillerGroup,
    FILLER_DESIGNATION: input.fillerDesignation,
    MATERIAL_GROUP: input.materialGroup,
    WELD_DETAIL: input.weldDetail,
    SHIELDING_GAS: input.shieldingGas,
  };

  if (opts.organizationCode !== undefined) replacements.ORG = opts.organizationCode;
  if (opts.welderSuffix !== undefined) replacements.WELDER = opts.welderSuffix;

  return tpl.replace(/\{([A-Z_]+)\}/g, (match, key) => {
    return key in replacements ? replacements[key] : match;
  });
}
