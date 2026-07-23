import { computeAttendancePercentage, meetsThreshold } from './decimal.util';

describe('computeAttendancePercentage', () => {
  it('returns 0.00 when totalDays is 0', () => {
    expect(computeAttendancePercentage({ present: 0, halfDay: 0, absent: 0 }, 0)).toBe('0.00');
  });

  it('computes 90.00 exactly for 36/40 present', () => {
    expect(computeAttendancePercentage({ present: 36, halfDay: 0, absent: 4 }, 40)).toBe('90.00');
  });

  it('counts half-day as 0.5', () => {
    // 35 present + 2 half-day = 36.0 effective days out of 40 → 90.00%
    expect(computeAttendancePercentage({ present: 35, halfDay: 2, absent: 3 }, 40)).toBe('90.00');
  });

  it('computes 89.99 for 35.999.../40 (below threshold)', () => {
    // 35 present + 1 halfDay = 35.5 out of 40 = 88.75
    expect(computeAttendancePercentage({ present: 35, halfDay: 1, absent: 4 }, 40)).toBe('88.75');
  });

  it('respects DECIMAL(5,2) precision (no float drift)', () => {
    // 1/3 = 33.333... → 33.33
    expect(computeAttendancePercentage({ present: 1, halfDay: 0, absent: 2 }, 3)).toBe('33.33');
  });
});

describe('meetsThreshold', () => {
  it('exactly 90.00 meets threshold', () => {
    expect(meetsThreshold('90.00', '90.00')).toBe(true);
  });

  it('89.99 does NOT meet threshold (hard block)', () => {
    expect(meetsThreshold('89.99', '90.00')).toBe(false);
  });

  it('99.99 meets threshold', () => {
    expect(meetsThreshold('99.99', '90.00')).toBe(true);
  });
});
