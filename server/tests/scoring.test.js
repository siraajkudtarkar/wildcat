const { applyBetMultiplier } = require('../src/services/scoring');

describe('applyBetMultiplier', () => {
  it('returns base points when bet is none or missing', () => {
    expect(applyBetMultiplier(10, 'none')).toBe(10);
    expect(applyBetMultiplier(10, undefined)).toBe(10);
  });

  it('boosts points by 1.5x for "more" bets', () => {
    expect(applyBetMultiplier(20, 'more')).toBeCloseTo(30);
  });

  it('reduces points to 0.75x for "less" bets', () => {
    expect(applyBetMultiplier(40, 'less')).toBeCloseTo(30);
  });

  it('ignores unknown bet values', () => {
    expect(applyBetMultiplier(12, 'over')).toBe(12);
  });

  it('handles zero and negative values safely', () => {
    expect(applyBetMultiplier(0, 'more')).toBe(0);
    expect(applyBetMultiplier(-10, 'less')).toBeCloseTo(-7.5);
  });
});
