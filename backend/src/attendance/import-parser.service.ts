import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import { Attendance } from '../database/entities/attendance.entity';
import { AttendanceStatus, UserRole } from '../database/entities/enums';
import { bestMatch } from '../common/utils/levenshtein.util';
import { User } from '../database/entities/user.entity';
import { Profile } from '../database/entities/profile.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';

/** Canonical import headers with a list of aliases used for fuzzy matching. */
const HEADER_MAP: Record<string, string[]> = {
  identifier: ['email', 'roll_number', 'rollno', 'roll no', 'student', 'student_id'],
  date: ['date', 'day', 'attendance_date'],
  status: ['status', 'attendance', 'present', 'mark'],
  notes: ['notes', 'note', 'remarks', 'comment'],
};

const STATUS_MAP: Record<string, AttendanceStatus> = {
  p: AttendanceStatus.PRESENT,
  present: AttendanceStatus.PRESENT,
  a: AttendanceStatus.ABSENT,
  absent: AttendanceStatus.ABSENT,
  h: AttendanceStatus.HALF_DAY,
  hd: AttendanceStatus.HALF_DAY,
  half: AttendanceStatus.HALF_DAY,
  'half-day': AttendanceStatus.HALF_DAY,
  half_day: AttendanceStatus.HALF_DAY,
};

export interface StagingRow {
  rowNumber: number;
  identifier: string | null;
  date: string | null;
  status: AttendanceStatus | null;
  notes: string | null;
  resolvedStudentId?: string | null;
  errors: string[];
}

export interface StagingResult {
  headers: { canonical: string; source: string | null }[];
  rows: StagingRow[];
  totalRows: number;
  errorRows: number;
}

@Injectable()
export class ImportParserService {
  constructor(private readonly ds: DataSource) {}

  async parseFile(buffer: Buffer, filename: string): Promise<Record<string, unknown>[]> {
    if (/\.csv$/i.test(filename)) {
      const text = buffer.toString('utf8');
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      if (parsed.errors.length) {
        throw new BadRequestException(`CSV parse error: ${parsed.errors[0].message}`);
      }
      return parsed.data;
    }
    if (/\.xlsx?$/i.test(filename)) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = wb.worksheets[0];
      if (!sheet) return [];
      const rows: Record<string, unknown>[] = [];
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, col) => (headers[col] = String(cell.value ?? '').trim()));
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const obj: Record<string, unknown> = {};
        for (let c = 1; c < headers.length; c++) {
          const key = headers[c];
          if (!key) continue;
          const cell = row.getCell(c);
          obj[key] = cell.value === null || cell.value === undefined ? '' : String(cell.value);
        }
        rows.push(obj);
      }
      return rows;
    }
    throw new BadRequestException('Unsupported file type. Use .csv or .xlsx');
  }

  mapHeaders(rawHeaders: string[]) {
    const canonicalKeys = Object.keys(HEADER_MAP);
    return canonicalKeys.map((canonical) => {
      const aliases = HEADER_MAP[canonical];
      let source: string | null = null;
      for (const h of rawHeaders) {
        const norm = h.toLowerCase().replace(/[_\s]/g, '');
        for (const a of [canonical, ...aliases]) {
          const na = a.toLowerCase().replace(/[_\s]/g, '');
          if (norm === na) {
            source = h;
            break;
          }
        }
        if (source) break;
      }
      if (!source) {
        const flat = [canonical, ...aliases];
        for (const h of rawHeaders) {
          const m = bestMatch(h, flat, 2);
          if (m) {
            source = h;
            break;
          }
        }
      }
      return { canonical, source };
    });
  }

  async buildStaging(
    rows: Record<string, unknown>[],
    internshipId: string,
  ): Promise<StagingResult> {
    const rawHeaders = rows.length ? Object.keys(rows[0]) : [];
    const headers = this.mapHeaders(rawHeaders);
    const idKey = headers.find((h) => h.canonical === 'identifier')?.source;
    const dateKey = headers.find((h) => h.canonical === 'date')?.source;
    const statusKey = headers.find((h) => h.canonical === 'status')?.source;
    const notesKey = headers.find((h) => h.canonical === 'notes')?.source;

    // Resolve identifiers in bulk (email OR rollNumber) restricted to internship enrollment.
    const identifiers = new Set<string>();
    rows.forEach((r) => {
      const v = idKey ? String(r[idKey] ?? '').trim() : '';
      if (v) identifiers.add(v);
    });

    const enrolled = await this.ds
      .getRepository(InternshipStudent)
      .createQueryBuilder('is')
      .leftJoinAndSelect('is.student', 's')
      .leftJoinAndSelect('s.profile', 'p')
      .where('is.internship_id = :id', { id: internshipId })
      .getMany();

    const lookup = new Map<string, string>();
    for (const en of enrolled) {
      if (en.student?.email) lookup.set(en.student.email.toLowerCase(), en.studentId);
      const roll = en.student?.profile?.rollNumber;
      if (roll) lookup.set(roll.toLowerCase(), en.studentId);
    }

    const staging: StagingRow[] = [];
    let errorRows = 0;
    rows.forEach((raw, idx) => {
      const identifier = idKey ? String(raw[idKey] ?? '').trim() : '';
      const dateStr = dateKey ? String(raw[dateKey] ?? '').trim() : '';
      const statusStr = statusKey ? String(raw[statusKey] ?? '').trim().toLowerCase() : '';
      const notes = notesKey ? String(raw[notesKey] ?? '').trim() : '';

      const errors: string[] = [];
      const status = STATUS_MAP[statusStr] ?? null;
      const parsedDate = this.parseDate(dateStr);

      if (!identifier) errors.push('Missing identifier');
      if (!parsedDate) errors.push(`Invalid date: "${dateStr}"`);
      if (!status) errors.push(`Invalid status: "${statusStr}"`);

      const resolved = identifier ? lookup.get(identifier.toLowerCase()) ?? null : null;
      if (identifier && !resolved) errors.push('Student not enrolled in internship');

      if (errors.length) errorRows++;
      staging.push({
        rowNumber: idx + 2,
        identifier: identifier || null,
        date: parsedDate,
        status,
        notes: notes || null,
        resolvedStudentId: resolved,
        errors,
      });
    });

    return { headers, rows: staging, totalRows: rows.length, errorRows };
  }

  private parseDate(input: string): string | null {
    if (!input) return null;
    // Accept YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(input)) return input;
    const parts = input.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts.map((p) => p.trim());
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      // Heuristic DD/MM/YYYY (Indian default)
      const yyyy = c.length === 2 ? `20${c}` : c;
      return `${yyyy}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }

  async commit(
    staging: StagingResult,
    input: { internshipId: string; mentorId: string },
  ): Promise<{ inserted: number; skipped: number }> {
    const validRows = staging.rows.filter((r) => r.errors.length === 0 && r.resolvedStudentId);
    if (!validRows.length) return { inserted: 0, skipped: staging.rows.length };

    return this.ds.transaction(async (m) => {
      let inserted = 0;
      const repo = m.getRepository(Attendance);
      for (const r of validRows) {
        // Idempotent skip on duplicate.
        const dup = await repo.findOne({
          where: {
            studentId: r.resolvedStudentId!,
            internshipId: input.internshipId,
            date: r.date!,
          },
        });
        if (dup) continue;
        await repo.insert({
          studentId: r.resolvedStudentId!,
          internshipId: input.internshipId,
          mentorId: input.mentorId,
          date: r.date!,
          status: r.status!,
          notes: r.notes ?? null,
        });
        inserted++;
      }
      return { inserted, skipped: staging.rows.length - inserted };
    });
  }
}
