import { BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface SheetGrid {
  /** Raw header cells, in column order, exactly as they appeared in row 1. */
  headers: string[];
  /** One array of cell values per data row, aligned by index to `headers`. */
  rows: string[][];
}

/**
 * Reads CSV, XLSX, or legacy XLS into a plain grid (headers + row
 * arrays), rather than the previous header-keyed-object approach.
 * A grid preserves column order and tolerates blank/duplicate headers,
 * both of which matter for wide-format sheets (many similarly-named
 * date columns) — a keyed object would silently collide on duplicate
 * header text.
 */
export async function readSheet(buffer: Buffer, filename: string): Promise<SheetGrid> {
  if (/\.csv$/i.test(filename)) {
    return readCsv(buffer);
  }
  if (/\.xlsx$/i.test(filename)) {
    return readXlsx(buffer);
  }
  if (/\.xls$/i.test(filename)) {
    return readLegacyXls(buffer);
  }
  throw new BadRequestException('Unsupported file type. Use .csv, .xls, or .xlsx');
}

function readCsv(buffer: Buffer): SheetGrid {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  if (parsed.errors.length) {
    throw new BadRequestException(`CSV parse error: ${parsed.errors[0].message}`);
  }
  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow) return { headers: [], rows: [] };
  return {
    headers: headerRow.map((h) => String(h ?? '').trim()),
    rows: dataRows.map((r) => headerRow.map((_, i) => String(r[i] ?? '').trim())),
  };
}

async function readXlsx(buffer: Buffer): Promise<SheetGrid> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  let maxCol = 0;
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellToString(cell.value);
    maxCol = Math.max(maxCol, col);
  });

  const rows: string[][] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    const values: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
      values.push(cellToString(row.getCell(c).value));
    }
    if (values.every((v) => !v)) continue; // skip fully blank rows
    rows.push(values);
  }

  return { headers, rows };
}

/** Legacy binary .xls — ExcelJS can't read this format, SheetJS can. */
function readLegacyXls(buffer: Buffer): SheetGrid {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const [headerRow, ...dataRows] = grid;
  if (!headerRow) return { headers: [], rows: [] };
  const headers = (headerRow as unknown[]).map((h) => String(h ?? '').trim());
  const rows = dataRows
    .map((r) => headers.map((_, i) => String((r as unknown[])[i] ?? '').trim()))
    .filter((r) => r.some((v) => v));
  return { headers, rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in (value as any)) return String((value as any).text ?? '');
  if (typeof value === 'object' && 'result' in (value as any)) return String((value as any).result ?? '');
  return String(value).trim();
}
