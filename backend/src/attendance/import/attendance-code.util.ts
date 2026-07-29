import { AttendanceStatus } from '../../database/entities/enums';
import { bestMatch } from '../../common/utils/levenshtein.util';

/**
 * The `attendances.status` column is a fixed MySQL enum
 * (PRESENT / ABSENT / HALF_DAY) — changing it is a breaking schema
 * change, which is explicitly out of scope for this refactor. Real
 * attendance sheets use a much richer vocabulary (P, A, L, OD, ML,
 * Holiday, ...), so this module maps every recognized real-world code
 * onto one of the three DB values, while preserving the original code
 * in the record's `notes` field so nothing is silently lost.
 *
 * This mapping is a policy decision, not a technical one — different
 * colleges may want "Late" or "On Duty" treated differently. It's
 * intentionally centralized in one small table so it's easy to find
 * and adjust, and every mapped code is echoed back to the client in
 * the preview response's `codeLegend` so admins can see exactly how
 * their sheet was interpreted before committing.
 */
export const enum SpecialCode {
  HOLIDAY = 'HOLIDAY',
}

export interface CodeMapping {
  /** DB status to store, or the special HOLIDAY marker meaning "skip this cell". */
  result: AttendanceStatus | SpecialCode;
  /** Human-readable note appended to the record explaining the original code. */
  note: string | null;
}

// Left-hand keys are normalized (lowercased, punctuation/whitespace stripped)
// before lookup — see normalizeCode().
const CODE_TABLE: Record<string, CodeMapping> = {
  p: { result: AttendanceStatus.PRESENT, note: null },
  present: { result: AttendanceStatus.PRESENT, note: null },
  pr: { result: AttendanceStatus.PRESENT, note: null },

  a: { result: AttendanceStatus.ABSENT, note: null },
  absent: { result: AttendanceStatus.ABSENT, note: null },
  abs: { result: AttendanceStatus.ABSENT, note: null },

  h: { result: AttendanceStatus.HALF_DAY, note: null },
  hd: { result: AttendanceStatus.HALF_DAY, note: null },
  half: { result: AttendanceStatus.HALF_DAY, note: null },
  halfday: { result: AttendanceStatus.HALF_DAY, note: null },

  // Late arrival: attended, so counted PRESENT, with the original code preserved.
  l: { result: AttendanceStatus.PRESENT, note: 'Late arrival (L)' },
  late: { result: AttendanceStatus.PRESENT, note: 'Late arrival' },

  // On Duty: college-approved absence (sports/events) — counted PRESENT by
  // convention since it's institutionally excused, not an unexplained absence.
  od: { result: AttendanceStatus.PRESENT, note: 'On duty (OD)' },
  onduty: { result: AttendanceStatus.PRESENT, note: 'On duty' },

  // Medical Leave: given partial (half-day) credit by default — adjust here
  // if your institution's policy differs.
  ml: { result: AttendanceStatus.HALF_DAY, note: 'Medical leave (ML)' },
  medicalleave: { result: AttendanceStatus.HALF_DAY, note: 'Medical leave' },

  // Holiday markers mean "no attendance was taken this day" — the cell is
  // skipped entirely, not recorded as any status.
  holiday: { result: SpecialCode.HOLIDAY, note: null },
  hol: { result: SpecialCode.HOLIDAY, note: null },
  off: { result: SpecialCode.HOLIDAY, note: null },
};

function normalizeCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
}

export interface CodeLookupResult {
  mapping: CodeMapping | null;
  /** Populated only when no exact match was found, for "did you mean X?" UI. */
  suggestion: string | null;
}

export function lookupAttendanceCode(raw: string): CodeLookupResult {
  const key = normalizeCode(raw);
  if (!key) return { mapping: null, suggestion: null };

  const exact = CODE_TABLE[key];
  if (exact) return { mapping: exact, suggestion: null };

  const suggestion = bestMatch(key, Object.keys(CODE_TABLE), 2);
  return { mapping: null, suggestion };
}

/** Every recognized code, grouped by DB status, for the preview response's legend. */
export function buildCodeLegend(): Array<{ code: string; mapsTo: string; note: string | null }> {
  const seen = new Set<string>();
  const legend: Array<{ code: string; mapsTo: string; note: string | null }> = [];
  for (const [code, mapping] of Object.entries(CODE_TABLE)) {
    const label = mapping.result === SpecialCode.HOLIDAY ? 'Skipped (holiday)' : mapping.result;
    const dedupeKey = `${code}:${label}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    legend.push({ code, mapsTo: label, note: mapping.note });
  }
  return legend;
}
