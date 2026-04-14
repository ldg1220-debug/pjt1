import {
  DEFAULT_REFERENCE_TEMPLATE,
  renderDesignation,
  renderReferenceNo,
} from '../designation';
import type { CalculationInput } from '../calculate-approval-range';

describe('renderDesignation', () => {
  it('matches the sample certificate string', () => {
    const s = renderDesignation({
      process: '135',
      productType: 'P',
      weldType: 'BW',
      fillerGroup: 'FM1',
      fillerDesignation: 'S',
      thicknessMm: 2.3,
      positionCode: 'PC',
      weldDetail: 'ss nb',
    });
    expect(s).toBe('EN ISO 9606-1 135 P BW FM1 S t2.3 PC ss nb');
  });

  it('formats integer thickness without decimal', () => {
    const s = renderDesignation({
      process: '111',
      productType: 'T',
      weldType: 'FW',
      fillerGroup: 'FM2',
      fillerDesignation: 'S',
      thicknessMm: 10,
      positionCode: 'PA',
      weldDetail: 'bs',
    });
    expect(s).toBe('EN ISO 9606-1 111 T FW FM2 S t10 PA bs');
  });
});

describe('renderReferenceNo', () => {
  const sampleInput: CalculationInput = {
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

  it('substitutes ORG and WELDER when provided', () => {
    expect(
      renderReferenceNo(sampleInput, {
        organizationCode: 'RM-140',
        welderSuffix: 'KIM',
      }),
    ).toBe('EN 9606-1-RM-140-KIM-135-t2.3-BW-PC');
  });

  it('keeps placeholders intact when not provided', () => {
    expect(renderReferenceNo(sampleInput)).toBe(
      'EN 9606-1-{ORG}-{WELDER}-135-t2.3-BW-PC',
    );
  });

  it('honours custom template', () => {
    expect(
      renderReferenceNo(sampleInput, {
        refTemplate: '{PROCESS}/{POSITION}/{WELDTYPE}',
      }),
    ).toBe('135/PC/BW');
  });

  it('exports default template constant', () => {
    expect(DEFAULT_REFERENCE_TEMPLATE).toContain('{ORG}');
    expect(DEFAULT_REFERENCE_TEMPLATE).toContain('{PROCESS}');
  });
});
