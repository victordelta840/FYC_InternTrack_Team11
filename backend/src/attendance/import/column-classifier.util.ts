import { levenshtein } from '../../common/utils/levenshtein.util';
import { parseHeaderAsDate } from './date-heuristics.util';

export type ColumnRole =
  | 'ROLL_NUMBER'
  | 'ENROLLMENT_NUMBER'
  | 'NAME'
  | 'EMAIL'
  | 'DIVISION'
  | 'DATE'
  | 'STATUS'
  | 'NOTES'
  | 'UNKNOWN';

const ALIASES: Record<Exclude<ColumnRole, 'DATE' | 'UNKNOWN'>, string[]> = {
  ROLL_NUMBER: ['roll no', 'roll number', 'rollno', 'roll_no', 'roll', 'regno', 'reg no', 'register number'],
  ENROLLMENT_NUMBER: [
    'enrollment no', 'enrollment number', 'enroll no', 'enrollmentno', 'university no', 'univ no', 'seat no', 'gr no', 'grno',
  ],
  NAME: ['name', 'student name', 'student', 'full name', 'studentname'],
  EMAIL: ['email', 'email id', 'e-mail', 'mail', 'student email', 'emailid'],
  DIVISION: ['division', 'div', 'section', 'class', 'batch', 'group'],
  STATUS: ['status', 'attendance', 'present', 'mark', 'attendance status'],
  NOTES: ['notes', 'note', 'remarks', 'comment', 'comments'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\s.]/g, '');
}

/** Fuzzy-scores a header against one role's alias list. Lower is better; null = no reasonable match. */
function scoreAgainstRole(header: string, aliases: string[]): number | null {
  const normHeader = normalize(header);
  let best: number | null = null;
  for (const alias of aliases) {
    const normAlias = normalize(alias);
    const d = normHeader === normAlias ? 0 : levenshtein(normHeader, normAlias);
    // Scale the tolerance to the alias length so short aliases (e.g. "div")
    // don't fuzzy-match unrelated short headers.
    const tolerance = Math.max(1, Math.floor(normAlias.length * 0.3));
    if (d <= tolerance && (best === null || d < best)) best = d;
  }
  return best;
}

export interface ClassifiedColumn {
  index: number;
  header: string;
  role: ColumnRole;
  /** Only set when role === 'DATE'. */
  isoDate?: string;
  /** Rough match confidence 0-1, for surfacing low-confidence matches in the UI. */
  confidence: number;
}

/**
 * Classifies every header in a sheet into an identity field, a date
 * column, or unknown — using fuzzy alias matching (no hardcoded exact
 * column names) plus a date-parsing heuristic run against the header
 * text itself. Each role is assigned to at most one column (the
 * best-scoring candidate), except DATE, which can match many columns
 * (one per day) — that's what triggers "wide format" detection.
 */
export function classifyColumns(
  headers: string[],
  internshipStart: Date,
  internshipEnd: Date,
): ClassifiedColumn[] {
  const results: ClassifiedColumn[] = headers.map((header, index) => ({
    index,
    header,
    role: 'UNKNOWN',
    confidence: 0,
  }));

  // Pass 1: date columns (headers that parse as dates). These don't
  // compete with the other roles for "best of one" — every matching
  // column is kept.
  for (const col of results) {
    const parsed = parseHeaderAsDate(col.header, internshipStart, internshipEnd);
    if (parsed) {
      col.role = 'DATE';
      col.isoDate = parsed.iso;
      col.confidence = 1;
    }
  }

  // Pass 2: identity/status/notes roles — single best column per role.
  const identityRoles = Object.keys(ALIASES) as Array<keyof typeof ALIASES>;
  for (const role of identityRoles) {
    let bestCol: ClassifiedColumn | null = null;
    let bestScore = Infinity;
    for (const col of results) {
      if (col.role === 'DATE') continue; // already claimed
      const score = scoreAgainstRole(col.header, ALIASES[role]);
      if (score !== null && score < bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    if (bestCol) {
      bestCol.role = role;
      bestCol.confidence = bestScore === 0 ? 1 : Math.max(0.5, 1 - bestScore / 10);
    }
  }

  return results;
}

/** Convenience: did the classifier find enough date columns to treat this as a wide-format sheet? */
export function isWideFormat(columns: ClassifiedColumn[]): boolean {
  return columns.some((c) => c.role === 'DATE');
}
