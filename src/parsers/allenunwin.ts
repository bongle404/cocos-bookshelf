import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BookRow } from '../types/book';
import type { ParseResult, CellValue } from './index';

function normaliseFormat(raw: string): BookRow['format'] {
  const s = raw.toLowerCase().trim();
  if (s === 'b' || s === 'paperback' || s === 'p') return 'Paperback';
  if (s === 't' || s === 'trade paperback' || s === 'tp') return 'Trade Paperback';
  if (s === 'h' || s === 'hardback' || s === 'hardcover' || s === 'hb' || s.includes('misc hb')) return 'Hardback';
  if (s.includes('board') || s.includes('novelty')) return 'Board/Novelty';
  return 'Other';
}

function parseDMY(dateStr: string): { pubDate: string; pubYear: number | null } {
  // Handles "DD/MM/YYYY" strings from Allen & Unwin sheets
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const year = parseInt(y, 10);
    return { pubDate: iso, pubYear: isNaN(year) ? null : year };
  }
  return { pubDate: dateStr, pubYear: null };
}

export function parseAllenUnwin(sheet: WorkSheet): ParseResult {
  const allRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (allRows.length < 2) return { books: [], rawSheet: { headers: [], rows: [], isbnKey: 'ISBN' } };

  const headers = (allRows[0] as unknown[]).map(h => String(h ?? '').trim());
  const dataRows = allRows.slice(1) as unknown[][];

  const col = (names: string | string[]): number => {
    const candidates = Array.isArray(names) ? names : [names];
    for (const name of candidates) {
      const i = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
      if (i !== -1) return i;
    }
    for (const name of candidates) {
      const i = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      if (i !== -1) return i;
    }
    return -1;
  };

  // Title column header contains "ALLEN & UNWIN" — fall back to index 1
  const titleIdx = headers.findIndex(h => h.toLowerCase().includes('allen')) !== -1
    ? headers.findIndex(h => h.toLowerCase().includes('allen'))
    : 1;

  const isbnIdx     = col('ISBN');
  const formatIdx   = col('Format');
  const rrpIdx      = col(['Retail Price Aus', 'RRP', 'Price']);
  const categoryIdx = col(['Category Description', 'Category', 'BIC', 'Subject']);
  const authorIdx   = col('Author');
  const pubdateIdx  = col(['Pubdate', 'Pub Date', 'Publication Date']);
  const stockIdx    = col(['Qty Avail', 'SOH', 'Stock', 'Remainder QTY']);

  const books: BookRow[] = [];
  const rawRows: Record<string, CellValue>[] = [];

  for (const row of dataRows) {
    const isbnRaw = row[isbnIdx];
    if (isbnRaw === null || isbnRaw === undefined) continue;
    const isbn = String(isbnRaw).trim().replace(/\D/g, '');
    if (isbn.length < 10) continue;

    const rawRow: Record<string, CellValue> = {};
    headers.forEach((h, i) => {
      const v = row[i];
      rawRow[h] = (v === undefined ? null : v) as CellValue;
    });
    rawRows.push(rawRow);

    const title       = String(row[titleIdx]    ?? '').trim();
    const author      = String(row[authorIdx]   ?? '').trim();
    const formatRaw   = String(row[formatIdx]   ?? '').trim();
    const categoryRaw = String(row[categoryIdx] ?? '').trim();
    const category    = categoryRaw.split(',')[0].trim();

    const rrp =
      typeof row[rrpIdx] === 'number'
        ? Math.round((row[rrpIdx] as number) * 100) / 100
        : null;

    const stock =
      typeof row[stockIdx] === 'number' ? Math.round(row[stockIdx] as number) : 0;

    let pubDate = '';
    let pubYear: number | null = null;
    const pubRaw = row[pubdateIdx];
    if (typeof pubRaw === 'string' && pubRaw) {
      ({ pubDate, pubYear } = parseDMY(pubRaw));
    } else if (typeof pubRaw === 'number') {
      // Excel serial date
      const d = new Date((pubRaw - 25569) * 86400 * 1000);
      pubDate = d.toISOString().split('T')[0];
      pubYear = d.getUTCFullYear();
    }

    books.push({
      isbn,
      title,
      author,
      format: normaliseFormat(formatRaw),
      category,
      categoryRaw,
      rrp,
      buyPrice: null,
      marginPct: null,
      stock,
      pubYear,
      pubDate,
      cartonQty: null,
      distributor: 'allenunwin',
      flagged: false,
      orderCartons: 1,
      buyPriceOverride: null,
    });
  }

  return {
    books,
    rawSheet: { headers, rows: rawRows, isbnKey: headers[isbnIdx] ?? 'ISBN' },
  };
}
