import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Attendance } from '../database/entities/attendance.entity';
import { AttendanceStatus } from '../database/entities/enums';
import { Internship } from '../database/entities/internship.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';
import { bestMatch } from '../common/utils/levenshtein.util';
import { readSheet } from './import/sheet-reader.util';
import { classifyColumns, ClassifiedColumn, isWideFormat } from './import/column-classifier.util';
import { lookupAttendanceCode, buildCodeLegend, SpecialCode } from './import/attendance-code.util';

export interface StagingRow {
  rowId: string;
  rowNumber: number;
  identifierRaw: string | null;
  studentNameRaw: string | null;
  divisionRaw: string | null;
  date: string | null;
  rawCode: string | null;
  status: AttendanceStatus | null;
  note: string | null;
  resolvedStudentId: string | null;
  resolvedStudentName: string | null;
  suggestedStudentId: string | null;
  suggestedStudentName: string | null;
  isDuplicateInFile: boolean;
  isDuplicateInDb: boolean;
  isSkippedHoliday: boolean;
  errors: string[];
  warnings: string[];
}

export interface StagingResult {
  format: 'WIDE' | 'LONG';
  headers: ClassifiedColumn[];
  codeLegend: ReturnType<typeof buildCodeLegend>;
  rows: StagingRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  skippedHolidayRows: number;
  duplicateInFileRows: number;
  duplicateInDbRows: number;
  unmappedColumns: string[];
  missingStudents: Array<{ studentId: string; name: string; rollNumber: string | null }>;
}

interface EnrolledStudent {
  studentId: string;
  name: string;
  rollNumber: string | null;
  email: string | null;
}

/** Intermediate, format-agnostic representation of one sheet cell that represents an attendance mark. */
interface RawCell {
  rowNumber: number;
  identifierRaw: string;
  studentNameRaw: string | null;
  divisionRaw: string | null;
  date: string | null; // ISO, or null if unparsable
  rawCode: string;
}

@Injectable()
export class ImportParserService {
  constructor(private readonly ds: DataSource) {}

  async preview(buffer: Buffer, filename: string, internshipId: string): Promise<StagingResult> {
    const internship = await this.ds.getRepository(Internship).findOne({ where: { id: internshipId } });
    if (!internship) throw new BadRequestException('Internship not found');

    const grid = await readSheet(buffer, filename);
    if (!grid.headers.length) {
      throw new BadRequestException('The file has no header row, or could not be read.');
    }

    const anchorStart = new Date(internship.startDate);
    const anchorEnd = new Date(internship.endDate);
    const columns = classifyColumns(grid.headers, anchorStart, anchorEnd);
    const wide = isWideFormat(columns);

    const rawCells = wide ? this.extractWideCells(grid, columns) : this.extractLongCells(grid, columns);

    const enrolled = await this.loadEnrolledRoster(internshipId);
    const existingAttendanceKeys = await this.loadExistingAttendanceKeys(internshipId);

    const { rows, foundStudentIds } = this.buildStagingRows(rawCells, enrolled, existingAttendanceKeys, internship);

    const missingStudents = enrolled
      .filter((s) => !foundStudentIds.has(s.studentId))
      .map((s) => ({ studentId: s.studentId, name: s.name, rollNumber: s.rollNumber }));

    const unmappedColumns = columns.filter((c) => c.role === 'UNKNOWN').map((c) => c.header);

    return {
      format: wide ? 'WIDE' : 'LONG',
      headers: columns,
      codeLegend: buildCodeLegend(),
      rows,
      totalRows: rows.length,
      validRows: rows.filter((r) => r.errors.length === 0 && !r.isSkippedHoliday).length,
      errorRows: rows.filter((r) => r.errors.length > 0).length,
      skippedHolidayRows: rows.filter((r) => r.isSkippedHoliday).length,
      duplicateInFileRows: rows.filter((r) => r.isDuplicateInFile).length,
      duplicateInDbRows: rows.filter((r) => r.isDuplicateInDb).length,
      unmappedColumns,
      missingStudents,
    };
  }

  // ---------- format-specific extraction ----------

  /** Wide format: one row per student, one column per date. Cell = attendance code. */
  private extractWideCells(grid: { headers: string[]; rows: string[][] }, columns: ClassifiedColumn[]): RawCell[] {
    const identityCol = columns.find((c) => c.role === 'ROLL_NUMBER' || c.role === 'ENROLLMENT_NUMBER' || c.role === 'EMAIL');
    const nameCol = columns.find((c) => c.role === 'NAME');
    const divisionCol = columns.find((c) => c.role === 'DIVISION');
    const dateCols = columns.filter((c) => c.role === 'DATE');

    if (!identityCol) {
      throw new BadRequestException(
        'Could not detect a student identifier column (roll number, enrollment number, or email). ' +
          'Detected headers: ' + grid.headers.join(', '),
      );
    }

    const cells: RawCell[] = [];
    grid.rows.forEach((row, rowIdx) => {
      const identifierRaw = (row[identityCol.index] ?? '').trim();
      if (!identifierRaw) return; // fully blank row for identity — skip silently, not an error
      const studentNameRaw = nameCol ? (row[nameCol.index] ?? '').trim() || null : null;
      const divisionRaw = divisionCol ? (row[divisionCol.index] ?? '').trim() || null : null;

      for (const dateCol of dateCols) {
        const rawCode = (row[dateCol.index] ?? '').trim();
        if (!rawCode) continue; // no mark for this student on this day — not an error, just absent data
        cells.push({
          rowNumber: rowIdx + 2, // +1 for header row, +1 for 1-based
          identifierRaw,
          studentNameRaw,
          divisionRaw,
          date: dateCol.isoDate ?? null,
          rawCode,
        });
      }
    });
    return cells;
  }

  /** Legacy long format: one row per (student, date) — identifier + date + status columns. */
  private extractLongCells(grid: { headers: string[]; rows: string[][] }, columns: ClassifiedColumn[]): RawCell[] {
    const identityCol = columns.find((c) => c.role === 'ROLL_NUMBER' || c.role === 'ENROLLMENT_NUMBER' || c.role === 'EMAIL');
    const nameCol = columns.find((c) => c.role === 'NAME');
    const divisionCol = columns.find((c) => c.role === 'DIVISION');
    const statusCol = columns.find((c) => c.role === 'STATUS');
    // In pure legacy sheets the "date" column is literally named "date" but
    // won't have been classified as role DATE (that role is reserved for
    // header-is-a-date wide columns) — find it among UNKNOWN columns by name.
    const dateCol = columns.find((c) => /date|day/i.test(c.header) && c.role === 'UNKNOWN');

    if (!identityCol || !statusCol || !dateCol) {
      throw new BadRequestException(
        'Could not detect student identifier, date, and status columns. ' +
          'Detected headers: ' + grid.headers.join(', '),
      );
    }

    const cells: RawCell[] = [];
    grid.rows.forEach((row, rowIdx) => {
      const identifierRaw = (row[identityCol.index] ?? '').trim();
      const rawCode = (row[statusCol.index] ?? '').trim();
      const dateRaw = (row[dateCol.index] ?? '').trim();
      if (!identifierRaw && !rawCode && !dateRaw) return; // fully blank row
      cells.push({
        rowNumber: rowIdx + 2,
        identifierRaw,
        studentNameRaw: nameCol ? (row[nameCol.index] ?? '').trim() || null : null,
        divisionRaw: divisionCol ? (row[divisionCol.index] ?? '').trim() || null : null,
        date: this.parseLooseDate(dateRaw),
        rawCode,
      });
    });
    return cells;
  }

  private parseLooseDate(input: string): string | null {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const parts = input.split(/[\/\-.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts.map((p) => p.trim());
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      const yyyy = c.length === 2 ? `20${c}` : c;
      return `${yyyy}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // ---------- shared enrichment / validation pipeline ----------

  private async loadEnrolledRoster(internshipId: string): Promise<EnrolledStudent[]> {
    const enrolled = await this.ds
      .getRepository(InternshipStudent)
      .createQueryBuilder('is')
      .leftJoinAndSelect('is.student', 's')
      .leftJoinAndSelect('s.profile', 'p')
      .where('is.internship_id = :id', { id: internshipId })
      .getMany();

    return enrolled.map((en) => ({
      studentId: en.studentId,
      name: [en.student?.profile?.firstName, en.student?.profile?.lastName].filter(Boolean).join(' ') || en.student?.email || 'Unknown',
      rollNumber: en.student?.profile?.rollNumber ?? null,
      email: en.student?.email ?? null,
    }));
  }

  private async loadExistingAttendanceKeys(internshipId: string): Promise<Set<string>> {
    const rows = await this.ds
      .getRepository(Attendance)
      .createQueryBuilder('a')
      .select(['a.studentId', 'a.date'])
      .where('a.internship_id = :id', { id: internshipId })
      .getMany();
    return new Set(rows.map((r) => `${r.studentId}|${r.date}`));
  }

  private buildStagingRows(
    cells: RawCell[],
    enrolled: EnrolledStudent[],
    existingKeys: Set<string>,
    internship: Internship,
  ): { rows: StagingRow[]; foundStudentIds: Set<string> } {
    // Identity lookup: roll number, enrollment number (aliased to roll
    // number — see note below), and email all resolve against the same
    // rollNumber/email columns, since the schema has no separate
    // enrollment-number field.
    const byRoll = new Map<string, EnrolledStudent>();
    const byEmail = new Map<string, EnrolledStudent>();
    const namePool: string[] = [];
    const nameToStudent = new Map<string, EnrolledStudent>();
    for (const s of enrolled) {
      if (s.rollNumber) byRoll.set(s.rollNumber.toLowerCase(), s);
      if (s.email) byEmail.set(s.email.toLowerCase(), s);
      namePool.push(s.name);
      nameToStudent.set(s.name.toLowerCase(), s);
    }
    const rollPool = enrolled.filter((s) => s.rollNumber).map((s) => s.rollNumber!.toLowerCase());

    const foundStudentIds = new Set<string>();
    const inFileKeys = new Set<string>();
    const rows: StagingRow[] = [];

    const internshipStart = new Date(internship.startDate).getTime();
    const internshipEnd = new Date(internship.endDate).getTime();
    const RANGE_BUFFER_MS = 3 * 24 * 60 * 60 * 1000; // tolerate a few grace days either side

    for (const cell of cells) {
      const errors: string[] = [];
      const warnings: string[] = [];
      const normId = cell.identifierRaw.toLowerCase();

      let resolved: EnrolledStudent | undefined =
        byRoll.get(normId) ?? byEmail.get(normId);

      let suggested: EnrolledStudent | undefined;
      if (!resolved) {
        // Try fuzzy match against roll numbers, then against names (typos, OCR-ish sheets).
        const rollGuess = bestMatch(normId, rollPool, 2);
        if (rollGuess) suggested = byRoll.get(rollGuess);
        if (!suggested && cell.studentNameRaw) {
          const nameGuess = bestMatch(cell.studentNameRaw.toLowerCase(), namePool, 3);
          if (nameGuess) suggested = nameToStudent.get(nameGuess);
        }
        errors.push(
          suggested
            ? `Student not enrolled in this internship — did you mean "${suggested.name}"?`
            : 'Student not enrolled in this internship',
        );
      }

      if (!cell.date) {
        errors.push(`Could not determine a valid date for this record`);
      } else {
        const t = new Date(cell.date).getTime();
        if (t < internshipStart - RANGE_BUFFER_MS || t > internshipEnd + RANGE_BUFFER_MS) {
          warnings.push(`Date ${cell.date} falls outside the internship's date range`);
        }
      }

      const { mapping, suggestion } = lookupAttendanceCode(cell.rawCode);
      let status: AttendanceStatus | null = null;
      let note: string | null = null;
      let isSkippedHoliday = false;

      if (!mapping) {
        errors.push(
          suggestion
            ? `Unrecognized attendance code "${cell.rawCode}" — did you mean "${suggestion}"?`
            : `Unrecognized attendance code "${cell.rawCode}"`,
        );
      } else if (mapping.result === SpecialCode.HOLIDAY) {
        isSkippedHoliday = true;
        note = mapping.note;
      } else {
        status = mapping.result;
        note = mapping.note;
      }

      let isDuplicateInFile = false;
      let isDuplicateInDb = false;
      if (resolved && cell.date && !isSkippedHoliday) {
        const key = `${resolved.studentId}|${cell.date}`;
        if (inFileKeys.has(key)) {
          isDuplicateInFile = true;
          errors.push('Duplicate record for this student and date within the uploaded file');
        } else {
          inFileKeys.add(key);
        }
        if (existingKeys.has(key)) {
          isDuplicateInDb = true;
          warnings.push('Attendance for this student and date is already recorded — will be skipped on commit');
        }
        foundStudentIds.add(resolved.studentId);
      }

      rows.push({
        rowId: `${cell.rowNumber}-${normId}-${cell.date ?? 'nodate'}`,
        rowNumber: cell.rowNumber,
        identifierRaw: cell.identifierRaw || null,
        studentNameRaw: cell.studentNameRaw,
        divisionRaw: cell.divisionRaw,
        date: cell.date,
        rawCode: cell.rawCode || null,
        status,
        note,
        resolvedStudentId: resolved?.studentId ?? null,
        resolvedStudentName: resolved?.name ?? null,
        suggestedStudentId: suggested?.studentId ?? null,
        suggestedStudentName: suggested?.name ?? null,
        isDuplicateInFile,
        isDuplicateInDb,
        isSkippedHoliday,
        errors,
        warnings,
      });
    }

    return { rows, foundStudentIds };
  }

  // ---------- commit ----------

  /**
   * Re-validates every row server-side before inserting — the staging
   * payload came back from the client, which may have applied manual
   * corrections (a different resolvedStudentId, an overridden status),
   * so nothing about it is trusted at face value. Only rows that are
   * still internally consistent (resolved student actually enrolled,
   * status a real enum value, date well-formed) and don't already
   * exist in the DB are inserted.
   */
  async commit(
    staging: StagingResult,
    input: { internshipId: string; mentorId: string },
  ): Promise<{ inserted: number; skipped: number; rejected: number }> {
    if (!staging?.rows?.length) return { inserted: 0, skipped: 0, rejected: 0 };

    const enrolledIds = new Set(
      (await this.loadEnrolledRoster(input.internshipId)).map((s) => s.studentId),
    );
    const existingKeys = await this.loadExistingAttendanceKeys(input.internshipId);
    const validStatuses = new Set(Object.values(AttendanceStatus));

    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(Attendance);
      let inserted = 0;
      let skipped = 0;
      let rejected = 0;
      const seenInBatch = new Set<string>();

      for (const row of staging.rows) {
        if (row.isSkippedHoliday) continue;
        if (
          !row.resolvedStudentId ||
          !enrolledIds.has(row.resolvedStudentId) ||
          !row.date ||
          !row.status ||
          !validStatuses.has(row.status) ||
          row.errors.length > 0
        ) {
          rejected++;
          continue;
        }

        const key = `${row.resolvedStudentId}|${row.date}`;
        if (existingKeys.has(key) || seenInBatch.has(key)) {
          skipped++;
          continue;
        }
        seenInBatch.add(key);

        await repo.insert({
          studentId: row.resolvedStudentId,
          internshipId: input.internshipId,
          mentorId: input.mentorId,
          date: row.date,
          status: row.status,
          notes: row.note ?? null,
        });
        inserted++;
      }

      return { inserted, skipped, rejected };
    });
  }
}
