const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Resolves a (month, day) pair with no year in the source header into a
 * concrete ISO date by picking whichever year — the internship's start
 * year or the year after — keeps the result inside a sane window
 * around the internship's actual date range. Falls back to the start
 * year if neither fits (still deterministic, and the row-level range
 * check in the parser will flag it for review either way).
 */
function resolveYear(month: number, day: number, anchorStart: Date, anchorEnd: Date): number {
  const startYear = anchorStart.getUTCFullYear();
  const candidates = [startYear, startYear + 1, startYear - 1];
  for (const year of candidates) {
    if (!isValidCalendarDate(year, month, day)) continue;
    const candidate = new Date(Date.UTC(year, month - 1, day));
    // Internships can run a few days past their nominal window in practice
    // (late marking, grace days) — allow a generous ±45 day buffer instead
    // of a hard range check, since the goal here is picking the *right
    // year*, not validating the date (that happens later, against the
    // internship's actual range).
    const bufferMs = 45 * 24 * 60 * 60 * 1000;
    if (
      candidate.getTime() >= anchorStart.getTime() - bufferMs &&
      candidate.getTime() <= anchorEnd.getTime() + bufferMs
    ) {
      return year;
    }
  }
  return startYear;
}

export interface ParsedHeaderDate {
  iso: string; // YYYY-MM-DD
}

/**
 * Attempts to parse a spreadsheet column header as a date, trying the
 * formats real attendance sheets actually use, in order:
 *   - ISO: 2026-01-09
 *   - Slash/dash with explicit year: 09/01/2026, 09-01-2026, 01/09/2026
 *   - Day-Month(-Year?): 09-Jan, 9-Jan-26, 09 Jan 2026, Jan 9
 *   - A bare Excel serial date number (e.g. 45666), which ExcelJS/xlsx
 *     sometimes hands back as the literal header text when a date-typed
 *     header cell wasn't formatted as text.
 * Returns null if the header doesn't look like a date at all (e.g.
 * "Roll No", "Name") — those are left for alias-based classification.
 */
export function parseHeaderAsDate(
  rawHeader: string,
  anchorStart: Date,
  anchorEnd: Date,
): ParsedHeaderDate | null {
  const header = rawHeader.trim();
  if (!header) return null;

  // ISO: YYYY-MM-DD
  let m = header.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    if (isValidCalendarDate(+y, +mo, +d)) return { iso: `${y}-${pad2(+mo)}-${pad2(+d)}` };
  }

  // DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY (ambiguous — prefer DD/MM, the
  // convention used throughout the rest of this codebase's date parsing)
  m = header.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const [, a, b, yRaw] = m;
    const year = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
    if (isValidCalendarDate(year, +b, +a)) return { iso: `${year}-${pad2(+b)}-${pad2(+a)}` };
    if (isValidCalendarDate(year, +a, +b)) return { iso: `${year}-${pad2(+a)}-${pad2(+b)}` };
  }

  // DD-Mon(-YY|-YYYY)? e.g. "09-Jan", "9-Jan-26", "09-Jan-2026"
  m = header.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})\.?[\s\-]?(\d{2,4})?$/);
  if (m) {
    const [, dRaw, monRaw, yRaw] = m;
    const month =
      MONTH_NAMES[monRaw.toLowerCase().slice(0, 4)] ?? MONTH_NAMES[monRaw.toLowerCase().slice(0, 3)];
    if (month) {
      const day = +dRaw;
      if (yRaw) {
        const year = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
        if (isValidCalendarDate(year, month, day)) return { iso: `${year}-${pad2(month)}-${pad2(day)}` };
      } else if (isValidCalendarDate(anchorStart.getUTCFullYear(), month, day) || isValidCalendarDate(anchorStart.getUTCFullYear() + 1, month, day)) {
        const year = resolveYear(month, day, anchorStart, anchorEnd);
        return { iso: `${year}-${pad2(month)}-${pad2(day)}` };
      }
    }
  }

  // Mon-DD(-YY|-YYYY)? e.g. "Jan-09", "Jan 9 2026"
  m = header.match(/^([A-Za-z]{3,9})\.?[\s\-](\d{1,2})[\s\-,]?(\d{2,4})?$/);
  if (m) {
    const [, monRaw, dRaw, yRaw] = m;
    const month =
      MONTH_NAMES[monRaw.toLowerCase().slice(0, 4)] ?? MONTH_NAMES[monRaw.toLowerCase().slice(0, 3)];
    if (month) {
      const day = +dRaw;
      if (yRaw) {
        const year = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
        if (isValidCalendarDate(year, month, day)) return { iso: `${year}-${pad2(month)}-${pad2(day)}` };
      } else {
        const year = resolveYear(month, day, anchorStart, anchorEnd);
        if (isValidCalendarDate(year, month, day)) return { iso: `${year}-${pad2(month)}-${pad2(day)}` };
      }
    }
  }

  // Bare Excel serial date number (days since 1899-12-30), typically 4-6 digits.
  m = header.match(/^\d{4,6}(\.\d+)?$/);
  if (m) {
    const serial = parseFloat(header);
    // Sanity window: serials for 2015-2035 roughly span 42000-49000.
    if (serial > 25000 && serial < 60000) {
      const epoch = Date.UTC(1899, 11, 30);
      const date = new Date(epoch + Math.round(serial) * 86400000);
      return { iso: date.toISOString().slice(0, 10) };
    }
  }

  return null;
}
