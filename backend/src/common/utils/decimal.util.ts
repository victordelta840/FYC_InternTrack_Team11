import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Precision-safe attendance percentage.
 * PRESENT counts 1.0 day, HALF_DAY counts 0.5 day, ABSENT counts 0.
 * Total = internship.totalDays. Result rounded to 2 decimals half-up.
 */
export interface DayCounters {
  present: number;
  halfDay: number;
  absent: number;
}

export function computeAttendancePercentage(counters: DayCounters, totalDays: number): string {
  if (totalDays <= 0) return '0.00';
  const present = new Decimal(counters.present);
  const half = new Decimal(counters.halfDay).mul('0.5');
  const effective = present.plus(half);
  const percentage = effective.div(totalDays).mul(100);
  return percentage.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/** Strict comparison: currentPct (string like "89.99") >= threshold ("90.00"). */
export function meetsThreshold(currentPct: string, threshold: string): boolean {
  return new Decimal(currentPct).gte(new Decimal(threshold));
}

export { Decimal };
