import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BookRow } from '../types/book';

function excelSerialToISO(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

function normaliseFormat(ed: string): BookRow['format'] {
  switch (ed.toUpperCase().trim()) {
    case 'P': return 'Paperback';
    case 'T': return 'Trade Paperback';
    case 'H': return 'Hardback';
    case 'N':
    case 'Z': return 'Board/Novelty';
    default:   return 'Other';
  }
}

export function parseHachette(sheet: WorkSheet): BookRow[] {
  const allRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (allRows.length < 2) return [];

  // Find header row dynamically — it's the row where col A = 'ISBN'
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const first = String((allRows[i] as unknown[])[0] ?? '').trim().toLowerCase();
    if (first === 'isbn') {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error('Hachette: could not find header row');

  const headers = (allRows[headerRowIdx] as unknown[]).map(h => String(h ?? '').trim());
  const dataRows = allRows.slice(headerRowIdx + 1) as unknown[][];

  // Exact match first, then substring match — handles any naming variant
  const col = (names: string | string[]): number => {
    const candidates = Array.isArray(names) ? names : [names];
    // Exact (case-insensitive)
    for (const name of candidates) {
      const i = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
      if (i !== -1) return i;
    }
    // Contains
    for (const name of candidates) {
      const i = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      if (i !== -1) return i;
    }
    return -1;
  };

  const isbnIdx    = col('ISBN');
  const titleIdx   = col('Title');
  const authorIdx  = col(['Author', 'Contributor']);
  const edIdx      = col(['Ed', 'Format', 'Bind']);
  // Category column varies wildly across Hachette files — try all known names
  const categoryIdx = col(['BIC', 'Subject', 'Category', 'BISAC', 'Genre', 'Subject Code', 'Subject Desc']);
  const rrpIdx     = col(['RRP', 'RRP (inc)', 'Price']);
  // 'Offer GST Inc' is blank in Hachette — buyPrice will always be null
  const stockIdx   = col(['Remainder QTY', 'Remainder Qty', 'SOH', 'Stock', 'QTY']);
  const cartonIdx  = col(['Carton Qty', 'Carton QTY', 'Carton']);
  const pubDateIdx = col(['Pub Date', 'Publication Date', 'Pub']);

  const rows: BookRow[] = [];

  for (const row of dataRows) {
    const isbnRaw = row[isbnIdx];
    // Skip empty rows
    if (isbnRaw === null || isbnRaw === undefined || String(isbnRaw).trim() === '') continue;

    const isbn = String(isbnRaw).trim().replace(/\D/g, '');
    if (isbn.length < 10) continue; // skip non-ISBN rows

    const title      = String(row[titleIdx]   ?? '').trim();
    const author     = String(row[authorIdx]  ?? '').trim();
    const edRaw      = String(row[edIdx]      ?? '').trim();
    const categoryRaw = String(row[categoryIdx] ?? '').trim();
    const category   = categoryRaw.split(',')[0].trim();

    const rrp =
      typeof row[rrpIdx] === 'number'
        ? Math.round((row[rrpIdx] as number) * 100) / 100
        : null;

    // Offer GST Inc is blank → buyPrice is always null
    const buyPrice: null = null;
    const marginPct: null = null;

    const stock =
      typeof row[stockIdx] === 'number' ? Math.round(row[stockIdx] as number) : 0;

    const cartonRaw = row[cartonIdx];
    const cartonQty =
      typeof cartonRaw === 'number' ? Math.round(cartonRaw) : 0;

    let pubDate = '';
    let pubYear: number | null = null;
    const pubRaw = row[pubDateIdx];
    if (typeof pubRaw === 'number') {
      pubDate = excelSerialToISO(pubRaw);
      pubYear = parseInt(pubDate.slice(0, 4), 10);
    } else if (typeof pubRaw === 'string' && pubRaw) {
      pubDate = pubRaw;
      pubYear = parseInt(pubRaw.slice(0, 4), 10) || null;
    }

    rows.push({
      isbn,
      title,
      author,
      format: normaliseFormat(edRaw),
      category,
      categoryRaw,
      rrp,
      buyPrice,
      marginPct,
      stock,
      pubYear,
      pubDate,
      cartonQty,
      distributor: 'hachette',
      flagged: false,
    });
  }

  return rows;
}
