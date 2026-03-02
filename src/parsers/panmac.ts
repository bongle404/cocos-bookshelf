import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BookRow } from '../types/book';

function excelSerialToISO(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

function normaliseFormat(raw: string): BookRow['format'] {
  const lower = raw.toLowerCase().trim();
  if (lower === 'paperback') return 'Paperback';
  if (lower === 'trade paperback') return 'Trade Paperback';
  if (lower === 'hardback' || lower === 'hardcover') return 'Hardback';
  if (lower.includes('board') || lower.includes('novelty')) return 'Board/Novelty';
  return 'Other';
}

export function parsePanMac(sheet: WorkSheet): BookRow[] {
  // sheet_to_json with header:1 gives rows as arrays; first row is headers
  const allRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (allRows.length < 2) return [];

  const headers = (allRows[0] as unknown[]).map(h => String(h ?? '').trim());
  const dataRows = allRows.slice(1) as unknown[][];

  const col = (name: string) => headers.findIndex(h => h === name);

  const iIdx = col('ISBN');
  const titleIdx = col('Title');
  const authorIdx = col('Author');
  const bindIdx = col('Bind');
  const categoryIdx = col('Category');
  const rrpIdx = col('RRP (inc)');
  const buyIdx = col('SELL (INC)');
  const stockIdx = col('SOH');
  const pubDateIdx = col('Publication Date');

  const rows: BookRow[] = [];

  for (const row of dataRows) {
    const isbnRaw = row[iIdx];
    // Skip empty rows — real ISBNs are 13-digit numbers > 9,000,000,000,000
    if (typeof isbnRaw !== 'number' || isbnRaw <= 9_000_000_000_000) continue;

    const isbn = String(Math.round(isbnRaw));
    const title = String(row[titleIdx] ?? '').trim();
    const author = String(row[authorIdx] ?? '').trim();
    const bindRaw = String(row[bindIdx] ?? '').trim();
    const categoryRaw = String(row[categoryIdx] ?? '').trim();
    const category = categoryRaw.split(',')[0].trim();

    const rrp =
      typeof row[rrpIdx] === 'number'
        ? Math.round((row[rrpIdx] as number) * 100) / 100
        : null;
    const buyRaw = typeof row[buyIdx] === 'number' ? (row[buyIdx] as number) : null;
    const buyPrice = buyRaw !== null ? Math.round(buyRaw * 100) / 100 : null;

    const marginPct =
      rrp !== null && buyPrice !== null && rrp > 0
        ? Math.round(((rrp - buyPrice) / rrp) * 100)
        : null;

    const stock =
      typeof row[stockIdx] === 'number' ? Math.round(row[stockIdx] as number) : 0;

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
      format: normaliseFormat(bindRaw),
      category,
      categoryRaw,
      rrp,
      buyPrice,
      marginPct,
      stock,
      pubYear,
      pubDate,
      cartonQty: null,
      distributor: 'panmac',
      flagged: false,
    });
  }

  return rows;
}
