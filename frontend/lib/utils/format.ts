/**
 * Safe formatting helpers for the admin dashboard.
 * These exist so no component ever renders `undefined`, `null`, or `NaN`
 * directly — every value is funneled through one of these first.
 */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function fmtNumber(value: unknown): string {
  return isFiniteNumber(value) ? value.toLocaleString() : 'N/A';
}

export function fmtPercent(value: unknown): string {
  return isFiniteNumber(value) ? `${value}%` : 'N/A';
}

export function fmtText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}
