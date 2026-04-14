import {
  fillerGroupRange,
  materialGroupRange,
  positionRangeBwPipe,
  positionRangeBwPlate,
  positionRangeFwPipe,
  positionRangeFwPlate,
  productDiameterRule,
  thicknessRangeBw,
  thicknessRangeFw,
  weldDetailRange,
} from '../../../prisma/seeds/rule-tables-iso-9606-1-2012';
import {
  CalculationInput,
  calculateApprovalRange,
} from '../calculate-approval-range';
import { loadRulesFromMemory } from '../rule-loader';

const ruleSeedMap = {
  filler_group_range: fillerGroupRange,
  material_group_range: materialGroupRange,
  thickness_range_bw: thicknessRangeBw,
  thickness_range_fw: thicknessRangeFw,
  position_range_bw_plate: positionRangeBwPlate,
  position_range_bw_pipe: positionRangeBwPipe,
  position_range_fw_plate: positionRangeFwPlate,
  position_range_fw_pipe: positionRangeFwPipe,
  weld_detail_range: weldDetailRange,
  product_diameter_rule: productDiameterRule,
};

function buildRules() {
  return loadRulesFromMemory(ruleSeedMap);
}

describe('calculateApprovalRange — sample certificate (Kim Young-tae)', () => {
  const input: CalculationInput = {
    process: '135',
    productType: 'P',
    weldType: 'BW',
    thicknessMm: 2.3,
    positionCode: 'PC',
    fillerGroup: 'FM1',
    fillerDesignation: 'S',
    shieldingGas: 'EN ISO 14175-M21',
    materialGroup: '1.1',
    weldDetail: 'ss nb',
  };

  const result = calculateApprovalRange(input, buildRules(), {
    organizationCode: 'RM-140',
    welderSuffix: 'KIM',
  });

  it('matches sample-certificate thickness range 2.3 ~ 4.6 mm', () => {
    expect(result.thicknessMinMm).toBeCloseTo(2.3, 10);
    expect(result.thicknessMaxMm).toBeCloseTo(4.6, 10);
  });

  it('expands position PC plate to [PA, PC]', () => {
    expect(result.positions).toEqual(['PA', 'PC']);
  });

  it('expands weld detail ss nb to [ss nb, ss mb, bs]', () => {
    expect(result.weldDetails).toEqual(['ss nb', 'ss mb', 'bs']);
  });

  it('expands product type plate to [P, T] with D_min 500, D_max null', () => {
    expect(result.productTypes).toEqual(['P', 'T']);
    expect(result.diameterMinMm).toBe(500);
    expect(result.diameterMaxMm).toBeNull();
  });

  it('expands BW weld type to [BW, FW]', () => {
    expect(result.weldTypes).toEqual(['BW', 'FW']);
  });

  it('expands filler group FM1 to [FM1, FM2]', () => {
    expect(result.fillerGroups).toEqual(['FM1', 'FM2']);
  });

  it('expands material group 1.1 to [1.1, 1.2]', () => {
    expect(result.materialGroups).toEqual(['1.1', '1.2']);
  });

  it('keeps tested filler designation S only', () => {
    expect(result.fillerDesignations).toEqual(['S']);
  });

  it('renders shielding gas with "(similar)" suffix', () => {
    expect(result.shieldingGases).toEqual(['EN ISO 14175-M21 (similar)']);
  });

  it('renders the certificate designation string', () => {
    expect(result.designationString).toBe(
      'EN ISO 9606-1 135 P BW FM1 S t2.3 PC ss nb',
    );
  });

  it('records calc steps for every variable', () => {
    const vars = result.calcLog.map((s) => s.variable);
    for (const expected of [
      'process',
      'product',
      'weld_type',
      'material_group',
      'filler_group',
      'filler_designation',
      'shielding_gas',
      'thickness',
      'position',
      'weld_detail',
      'designation',
      'reference',
    ]) {
      expect(vars).toContain(expected);
    }
  });

  it('renders the reference number using template substitution', () => {
    expect(result.referenceNo).toBe('EN 9606-1-RM-140-KIM-135-t2.3-BW-PC');
  });
});

describe('calculateApprovalRange — additional cases', () => {
  it('FW t=4 plate PC → thickness [3, null], weldTypes [FW]', () => {
    const input: CalculationInput = {
      process: '111',
      productType: 'P',
      weldType: 'FW',
      thicknessMm: 4,
      positionCode: 'PC',
      fillerGroup: 'FM2',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.2',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.thicknessMinMm).toBe(3);
    expect(r.thicknessMaxMm).toBeNull();
    expect(r.weldTypes).toEqual(['FW']);
  });

  it('BW t=15 plate PE → thickness [5, null], positions include PA/PB/PC/PE', () => {
    const input: CalculationInput = {
      process: '135',
      productType: 'P',
      weldType: 'BW',
      thicknessMm: 15,
      positionCode: 'PE',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.thicknessMinMm).toBe(5);
    expect(r.thicknessMaxMm).toBeNull();
    expect(r.positions).toEqual(expect.arrayContaining(['PA', 'PB', 'PC', 'PE']));
  });

  it('Pipe small-bore D=20 → productTypes [T], D_min 20, D_max 40', () => {
    const input: CalculationInput = {
      process: '141',
      productType: 'T',
      outsideDiameterMm: 20,
      weldType: 'BW',
      thicknessMm: 2.3,
      positionCode: 'PA',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.productTypes).toEqual(['T']);
    expect(r.diameterMinMm).toBe(20);
    expect(r.diameterMaxMm).toBe(40);
  });

  it('Pipe large-bore D=200 → productTypes [P, T], D_min max(25, 100)=100', () => {
    const input: CalculationInput = {
      process: '141',
      productType: 'T',
      outsideDiameterMm: 200,
      weldType: 'BW',
      thicknessMm: 5,
      positionCode: 'PA',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.productTypes).toEqual(['P', 'T']);
    expect(r.diameterMinMm).toBe(100);
    expect(r.diameterMaxMm).toBeNull();
  });

  it('weld detail bs → [bs] only', () => {
    const input: CalculationInput = {
      process: '135',
      productType: 'P',
      weldType: 'BW',
      thicknessMm: 8,
      positionCode: 'PA',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'bs',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.weldDetails).toEqual(['bs']);
  });

  it('filler designation B qualifies B and S', () => {
    const input: CalculationInput = {
      process: '135',
      productType: 'P',
      weldType: 'BW',
      thicknessMm: 8,
      positionCode: 'PA',
      fillerGroup: 'FM1',
      fillerDesignation: 'B',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.fillerDesignations).toEqual(['B', 'S']);
  });

  it('Plate PA records conditional D_min=150 in calc log but keeps base D_min=500', () => {
    const input: CalculationInput = {
      process: '135',
      productType: 'P',
      weldType: 'BW',
      thicknessMm: 8,
      positionCode: 'PA',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      shieldingGas: 'EN ISO 14175-M21',
      materialGroup: '1.1',
      weldDetail: 'ss nb',
    };
    const r = calculateApprovalRange(input, buildRules());
    expect(r.diameterMinMm).toBe(500);
    const cond = r.calcLog.find((s) => s.variable === 'product_conditional');
    expect(cond).toBeDefined();
    expect(cond?.output).toEqual({ D_min: 150 });
  });
});
