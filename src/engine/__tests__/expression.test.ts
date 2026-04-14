import {
  ExpressionError,
  evaluateExpression,
  evaluatePredicate,
} from '../expression';

describe('evaluatePredicate', () => {
  it('handles "t < 3"', () => {
    expect(evaluatePredicate('t < 3', { t: 2.3 })).toBe(true);
    expect(evaluatePredicate('t < 3', { t: 3 })).toBe(false);
    expect(evaluatePredicate('t < 3', { t: 5 })).toBe(false);
  });

  it('handles "3 <= t && t <= 12"', () => {
    expect(evaluatePredicate('3 <= t && t <= 12', { t: 5 })).toBe(true);
    expect(evaluatePredicate('3 <= t && t <= 12', { t: 3 })).toBe(true);
    expect(evaluatePredicate('3 <= t && t <= 12', { t: 12 })).toBe(true);
    expect(evaluatePredicate('3 <= t && t <= 12', { t: 2 })).toBe(false);
    expect(evaluatePredicate('3 <= t && t <= 12', { t: 13 })).toBe(false);
  });

  it('handles "t > 12"', () => {
    expect(evaluatePredicate('t > 12', { t: 15 })).toBe(true);
    expect(evaluatePredicate('t > 12', { t: 12 })).toBe(false);
  });

  it('handles "t >= 3"', () => {
    expect(evaluatePredicate('t >= 3', { t: 3 })).toBe(true);
    expect(evaluatePredicate('t >= 3', { t: 2.99 })).toBe(false);
  });

  it('handles product/diameter compound predicate with string', () => {
    expect(
      evaluatePredicate("productType == 'T' && D <= 25", {
        productType: 'T',
        D: 20,
      }),
    ).toBe(true);
    expect(
      evaluatePredicate("productType == 'T' && D <= 25", {
        productType: 'T',
        D: 26,
      }),
    ).toBe(false);
    expect(
      evaluatePredicate("productType == 'T' && D <= 25", {
        productType: 'P',
        D: 10,
      }),
    ).toBe(false);
  });

  it('handles "productType == \'P\'"', () => {
    expect(evaluatePredicate("productType == 'P'", { productType: 'P', D: 0 })).toBe(true);
    expect(evaluatePredicate("productType == 'P'", { productType: 'T', D: 0 })).toBe(false);
  });

  it('handles "productType != \'T\'"', () => {
    expect(evaluatePredicate("productType != 'T'", { productType: 'P', D: 0 })).toBe(true);
  });
});

describe('evaluateExpression', () => {
  it('returns null for null literal input', () => {
    expect(evaluateExpression(null, {})).toBeNull();
  });

  it('returns numeric literal as-is', () => {
    expect(evaluateExpression(3, {})).toBe(3);
  });

  it('evaluates "t"', () => {
    expect(evaluateExpression('t', { t: 2.3 })).toBe(2.3);
  });

  it('evaluates implicit-multiply "2t"', () => {
    expect(evaluateExpression('2t', { t: 2.3 })).toBeCloseTo(4.6, 10);
  });

  it('evaluates implicit-multiply "2D"', () => {
    expect(evaluateExpression('2D', { D: 20 })).toBe(40);
  });

  it('evaluates "max(25, 0.5*D)"', () => {
    expect(evaluateExpression('max(25, 0.5*D)', { D: 100 })).toBe(50);
    expect(evaluateExpression('max(25, 0.5*D)', { D: 30 })).toBe(25);
  });

  it('evaluates "min(10, t)"', () => {
    expect(evaluateExpression('min(10, t)', { t: 7 })).toBe(7);
    expect(evaluateExpression('min(10, t)', { t: 12 })).toBe(10);
  });

  it('evaluates literal expression result of null keyword', () => {
    expect(evaluateExpression('null', {})).toBeNull();
  });

  it('handles parenthesised arithmetic', () => {
    expect(evaluateExpression('(t + 1) * 2', { t: 4 })).toBe(10);
  });
});

describe('Security — disallowed tokens', () => {
  it('rejects access to globals like process.exit', () => {
    expect(() => evaluatePredicate('process.exit(1)', {})).toThrow(ExpressionError);
  });

  it('rejects unknown identifiers', () => {
    expect(() => evaluatePredicate('foo == 1', {})).toThrow(ExpressionError);
  });

  it('rejects unknown function calls', () => {
    expect(() => evaluateExpression('require("fs")', {})).toThrow(ExpressionError);
  });

  it('rejects unbalanced parentheses', () => {
    expect(() => evaluateExpression('(t + 1', { t: 1 })).toThrow(ExpressionError);
  });

  it('rejects illegal characters', () => {
    expect(() => evaluatePredicate('t @ 1', { t: 1 })).toThrow(ExpressionError);
  });

  it('rejects empty expression', () => {
    expect(() => evaluatePredicate('', {})).toThrow(ExpressionError);
  });

  it('throws when expression returns non-number where number expected', () => {
    expect(() => evaluateExpression("'hello'", {})).toThrow(ExpressionError);
  });

  it('throws when variable is missing', () => {
    expect(() => evaluatePredicate('t < 3', {})).toThrow(ExpressionError);
  });
});
