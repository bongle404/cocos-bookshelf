import * as XLSX from 'xlsx';
import type { BookRow, Distributor } from '../types/book';
import { parsePanMac } from './panmac';
import { parseHachette } from './hachette';
import { parseAllenUnwin } from './allenunwin';

export type CellValue = string | number | boolean | null;

export interface RawSheetData {
  headers: string[];
  rows: Record<string, CellValue>[];
  isbnKey: string;
}

export interface ParseResult {
  books: BookRow[];
  rawSheet: RawSheetData;
}

function detectFormat(workbook: XLSX.WorkBook): Distributor {
  if (workbook.SheetNames.includes('Current List')) return 'panmac';

  if (workbook.SheetNames.includes('Sheet1')) {
    const sheet = workbook.Sheets['Sheet1'];
    const a1 = sheet['A1']?.v;
    if (typeof a1 === 'string' && a1.toLowerCase().includes('hachette')) {
      return 'hachette';
    }
  }

  // Allen & Unwin: any sheet where row 1 col A = "ISBN" and col B header contains "ALLEN"
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    if (rows.length > 0) {
      const headers = rows[0] as unknown[];
      const col0 = String(headers[0] ?? '').trim().toLowerCase();
      const col1 = String(headers[1] ?? '').trim().toLowerCase();
      if (col0 === 'isbn' && col1.includes('allen')) {
        return 'allenunwin';
      }
    }
  }

  return 'unknown';
}

export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  const distributor = detectFormat(workbook);

  if (distributor === 'panmac') {
    const sheet = workbook.Sheets['Current List'];
    return parsePanMac(sheet);
  }

  if (distributor === 'hachette') {
    const sheet = workbook.Sheets['Sheet1'];
    return parseHachette(sheet);
  }

  if (distributor === 'allenunwin') {
    // Use first sheet (could be "Kids & YA", "Fiction", etc.)
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return parseAllenUnwin(sheet);
  }

  throw new Error(
    'Unrecognised file format. Expected a Pan Mac ("Current List" sheet), Hachette ("Sheet1" starting with "Hachette"), or Allen & Unwin spreadsheet.',
  );
}
