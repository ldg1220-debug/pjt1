import type { PrismaClient } from '@prisma/client';

/**
 * ISO 9606-1:2012 approval-range rule tables.
 *
 * The calculation engine (Stage 2) will read these payloads from `rule_tables`
 * instead of hard-coding logic. Keys mirror docs/02-approval-range-logic.md.
 *
 * Convention:
 *   • tested_*  → approved_* array (exhaustive, deduped, sorted logically)
 *   • thickness/diameter rules: expression objects interpreted by the engine
 *     (no executable code — only declarative conditions).
 */

export const RULE_SET_CODE = 'ISO-9606-1-2012';

// ---------------------------------------------------------------------------
// Table 2 — Filler group range (FM1..FM7)
// ---------------------------------------------------------------------------
export const fillerGroupRange = {
  description:
    'ISO 9606-1:2012 Table 2 — Range of qualification for filler material groups.',
  ranges: {
    FM1: ['FM1', 'FM2'],
    FM2: ['FM1', 'FM2'],
    FM3: ['FM1', 'FM2', 'FM3'],
    FM4: ['FM4'],
    FM5: ['FM5', 'FM6'],
    FM6: ['FM6'],
    FM7: ['FM7'],
  },
};

// ---------------------------------------------------------------------------
// Table 3 — Material group range (ISO/TR 15608)
// ---------------------------------------------------------------------------
// Engine reads { tested: [approved...] }. Values are CEN ISO/TR 15608 codes.
export const materialGroupRange = {
  description:
    'ISO 9606-1:2012 Table 3 — Range of qualification for parent material groups (CEN ISO/TR 15608).',
  ranges: {
    '1.1': ['1.1', '1.2'],
    '1.2': ['1.1', '1.2'],
    '1.3': ['1.1', '1.2', '1.3'],
    '1.4': ['1.1', '1.2', '1.4'],
    '2.1': ['1.1', '1.2', '2.1'],
    '2.2': ['1.1', '1.2', '1.3', '2.1', '2.2'],
    '3.1': ['1.1', '1.2', '3.1'],
    '3.2': ['1.1', '1.2', '3.1', '3.2'],
    '3.3': ['1.1', '1.2', '3.1', '3.2', '3.3'],
    '4.1': ['1.1', '1.2', '4.1'],
    '4.2': ['1.1', '1.2', '4.1', '4.2'],
    '5.1': ['1.1', '1.2', '5.1'],
    '5.2': ['1.1', '1.2', '5.1', '5.2'],
    '5.3': ['1.1', '1.2', '5.1', '5.2', '5.3'],
    '5.4': ['1.1', '1.2', '5.4'],
    '6.1': ['1.1', '1.2', '6.1'],
    '6.2': ['1.1', '1.2', '6.1', '6.2'],
    '6.3': ['1.1', '1.2', '6.1', '6.2', '6.3'],
    '6.4': ['1.1', '1.2', '6.1', '6.4'],
    '7.1': ['7.1'],
    '7.2': ['7.1', '7.2'],
    '7.3': ['7.1', '7.2', '7.3'],
    '8.1': ['8.1', '8.2'],
    '8.2': ['8.1', '8.2'],
    '8.3': ['8.3'],
    '9.1': ['9.1'],
    '9.2': ['9.1', '9.2'],
    '9.3': ['9.1', '9.2', '9.3'],
    '10.1': ['8.1', '10.1'],
    '10.2': ['8.1', '10.1', '10.2'],
    '11.1': ['1.1', '1.2', '11.1'],
    '11.2': ['1.1', '1.2', '11.1', '11.2'],
    '21': ['21'],
    '22': ['21', '22'],
    '23': ['21', '23'],
    '24': ['21', '24'],
    '25': ['21', '25'],
    '26': ['21', '26'],
  },
};

// ---------------------------------------------------------------------------
// Table 5 — Thickness range (Butt Weld)
// ---------------------------------------------------------------------------
// Engine interprets `conditions[i]` sequentially — first matching `when` wins.
// `when` predicate uses variable `t` (test thickness in mm).
// `output.min`/`output.max`: either a literal number, null (= unlimited),
//   or an expression referencing {t}: "t", "2t", etc.
export const thicknessRangeBw = {
  description:
    'ISO 9606-1:2012 Table 5 — Thickness range of qualification for butt welds.',
  variables: ['t'],
  conditions: [
    { when: 't < 3',          output: { min: 't',  max: '2t'  } },
    { when: '3 <= t && t <= 12', output: { min: 3,  max: '2t'  } },
    { when: 't > 12',         output: { min: 5,    max: null } },
  ],
  examples: [
    { input: { t: 2.3 }, output: { min: 2.3, max: 4.6 } },
    { input: { t: 10  }, output: { min: 3,   max: 20  } },
    { input: { t: 20  }, output: { min: 5,   max: null } },
  ],
};

// ---------------------------------------------------------------------------
// Table 6 — Thickness range (Fillet Weld)
// ---------------------------------------------------------------------------
export const thicknessRangeFw = {
  description:
    'ISO 9606-1:2012 Table 6 — Throat thickness / material thickness range for fillet welds.',
  variables: ['t'],
  conditions: [
    { when: 't < 3',  output: { min: 't', max: '2t' } },
    { when: 't >= 3', output: { min: 3,   max: null } },
  ],
};

// ---------------------------------------------------------------------------
// Position range — 4 sub-tables (BW/FW × plate/pipe)
// ---------------------------------------------------------------------------
// BW / PLATE
export const positionRangeBwPlate = {
  description:
    'ISO 9606-1:2012 — Qualified positions for butt welds on plate.',
  ranges: {
    PA:        ['PA'],
    PC:        ['PA', 'PC'],
    PE:        ['PA', 'PB', 'PC', 'PE'],
    PF:        ['PA', 'PC', 'PF'],
    PG:        ['PG'],
    'H-L045':  ['PA', 'PB', 'PC', 'PE', 'PF'],
    'J-L045':  ['PA', 'PB', 'PC', 'PE', 'PG'],
  },
};

// BW / PIPE
export const positionRangeBwPipe = {
  description:
    'ISO 9606-1:2012 — Qualified positions for butt welds on pipe.',
  ranges: {
    PA:        ['PA'],
    PC:        ['PA', 'PC'],
    PE:        ['PA', 'PB', 'PC', 'PE'],
    PF:        ['PA', 'PC', 'PF'],
    PG:        ['PA', 'PG'],
    'H-L045':  ['PA', 'PB', 'PC', 'PE', 'PF', 'H-L045'],
    'J-L045':  ['PA', 'PB', 'PC', 'PE', 'PG', 'J-L045'],
  },
};

// FW / PLATE (Fillet on plate — tends to cover PB & related)
export const positionRangeFwPlate = {
  description:
    'ISO 9606-1:2012 — Qualified positions for fillet welds on plate.',
  ranges: {
    PA:       ['PA'],
    PB:       ['PA', 'PB'],
    PD:       ['PA', 'PB', 'PD'],
    PF:       ['PA', 'PB', 'PF'],
    PG:       ['PB', 'PG'],
    PE:       ['PA', 'PB', 'PD', 'PE'],
    'H-L045': ['PA', 'PB', 'PD', 'PE', 'PF'],
    'J-L045': ['PA', 'PB', 'PD', 'PE', 'PG'],
  },
};

// FW / PIPE
export const positionRangeFwPipe = {
  description:
    'ISO 9606-1:2012 — Qualified positions for fillet welds on pipe.',
  ranges: {
    PA:       ['PA'],
    PB:       ['PA', 'PB'],
    PD:       ['PA', 'PB', 'PD'],
    PF:       ['PA', 'PB', 'PF'],
    PG:       ['PA', 'PB', 'PG'],
    'H-L045': ['PA', 'PB', 'PD', 'PE', 'PF', 'H-L045'],
    'J-L045': ['PA', 'PB', 'PD', 'PE', 'PG', 'J-L045'],
  },
};

// ---------------------------------------------------------------------------
// Table 7 — Weld detail range
// ---------------------------------------------------------------------------
export const weldDetailRange = {
  description:
    'ISO 9606-1:2012 Table 7 — Weld detail (ss nb / ss mb / bs) range of qualification.',
  ranges: {
    'ss nb': ['ss nb', 'ss mb', 'bs'],
    'ss mb': ['ss mb', 'bs'],
    bs:      ['bs'],
  },
};

// ---------------------------------------------------------------------------
// Product type / diameter rule
// ---------------------------------------------------------------------------
// `cases[i]` evaluated in order; first matching `when` wins.
// `when` uses variables `productType` ("P"|"T") and `D` (outside diameter mm).
export const productDiameterRule = {
  description:
    'ISO 9606-1:2012 — Product type & pipe diameter range of qualification.',
  variables: ['productType', 'D'],
  cases: [
    {
      label: 'Pipe small-bore (D ≤ 25 mm, fixed)',
      when: "productType == 'T' && D <= 25",
      output: {
        product_types: ['T'],
        D_min: 'D',
        D_max: '2D',
        positions_note: '',
      },
    },
    {
      label: 'Pipe large-bore (D > 25 mm)',
      when: "productType == 'T' && D > 25",
      output: {
        product_types: ['P', 'T'],
        D_min: 'max(25, 0.5*D)',
        D_max: null,
        positions_note: '',
      },
    },
    {
      label: 'Plate',
      when: "productType == 'P'",
      output: {
        product_types: ['P', 'T'],
        D_min: 500,
        D_max: null,
        positions_note: 'Pipe D ≥ 150 mm qualified for PA and PC only',
        conditional: {
          when_positions: ['PA', 'PC'],
          D_min: 150,
        },
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
export interface RuleTableSeed {
  tableKey: string;
  payload: unknown;
  notes?: string;
}

export const ruleTables: RuleTableSeed[] = [
  { tableKey: 'filler_group_range',         payload: fillerGroupRange,      notes: 'ISO 9606-1:2012 Table 2' },
  { tableKey: 'material_group_range',       payload: materialGroupRange,    notes: 'ISO 9606-1:2012 Table 3 + ISO/TR 15608 grouping' },
  { tableKey: 'thickness_range_bw',         payload: thicknessRangeBw,      notes: 'ISO 9606-1:2012 Table 5 (BW)' },
  { tableKey: 'thickness_range_fw',         payload: thicknessRangeFw,      notes: 'ISO 9606-1:2012 Table 6 (FW)' },
  { tableKey: 'position_range_bw_plate',    payload: positionRangeBwPlate,  notes: 'BW × plate' },
  { tableKey: 'position_range_bw_pipe',     payload: positionRangeBwPipe,   notes: 'BW × pipe' },
  { tableKey: 'position_range_fw_plate',    payload: positionRangeFwPlate,  notes: 'FW × plate' },
  { tableKey: 'position_range_fw_pipe',     payload: positionRangeFwPipe,   notes: 'FW × pipe' },
  { tableKey: 'weld_detail_range',          payload: weldDetailRange,       notes: 'ISO 9606-1:2012 Table 7' },
  { tableKey: 'product_diameter_rule',      payload: productDiameterRule,   notes: 'Product type & pipe diameter' },
];

export async function seedRuleTables(prisma: PrismaClient): Promise<{
  ruleSetId: number;
  tablesInserted: number;
}> {
  const ruleSet = await prisma.ruleSet.upsert({
    where: { code: RULE_SET_CODE },
    update: {
      standard: 'ISO 9606-1',
      year: 2012,
      isActive: true,
      description: 'ISO 9606-1:2012 / KS B ISO 9606-1:2012 — Qualification testing of welders (fusion welding, steels).',
    },
    create: {
      code: RULE_SET_CODE,
      standard: 'ISO 9606-1',
      year: 2012,
      isActive: true,
      description: 'ISO 9606-1:2012 / KS B ISO 9606-1:2012 — Qualification testing of welders (fusion welding, steels).',
    },
  });

  for (const rt of ruleTables) {
    await prisma.ruleTable.upsert({
      where: {
        ruleSetId_tableKey: { ruleSetId: ruleSet.id, tableKey: rt.tableKey },
      },
      update: {
        payload: rt.payload as never,
        notes: rt.notes ?? null,
      },
      create: {
        ruleSetId: ruleSet.id,
        tableKey: rt.tableKey,
        payload: rt.payload as never,
        notes: rt.notes ?? null,
      },
    });
  }

  return { ruleSetId: ruleSet.id, tablesInserted: ruleTables.length };
}
