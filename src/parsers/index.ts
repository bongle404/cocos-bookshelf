import * as XLSX from 'xlsx';
import type { BookRow, Distributor } from '../types/book';
import { parsePanMac } from './panmac';
import { parseHachette } from './hachette';

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

  throw new Error(
    'Unrecognised file format. Expected a Pan Mac ("Current List" sheet) or Hachette ("Sheet1" starting with "Hachette") spreadsheet.',
  );
}
