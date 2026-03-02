import * as XLSX from 'xlsx';
import type { BookRow } from '../types/book';
import type { RawSheetData, CellValue } from '../parsers/index';

interface Props {
  books: BookRow[];
  rawSheet: RawSheetData | null;
  sellThroughPct: number;
}

export function ExportButton({ books, rawSheet, sellThroughPct }: Props) {
  const flagged = books.filter(b => b.flagged);

  function download() {
    if (flagged.length === 0) return;

    const wb = XLSX.utils.book_new();
    let ws: XLSX.WorkSheet;

    if (rawSheet && rawSheet.rows.length > 0) {
      const bookMap = new Map(flagged.map(b => [b.isbn, b]));

      const filteredRaw = rawSheet.rows.filter(row => {
        const isbn = String(row[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
        return bookMap.has(isbn);
      });

      const extraHeaders = [
        'Order Cartons',
        'Units Ordered',
        'Cost/unit (AUD)',
        'Total Cost (AUD)',
        'Est. Sell-Through %',
        'Revenue Projection (AUD)',
      ];

      const allHeaders = [...rawSheet.headers, ...extraHeaders];

      const dataRows: CellValue[][] = filteredRaw.map(rawRow => {
        const isbn = String(rawRow[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
        const book = bookMap.get(isbn)!;

        const cartons = book.orderCartons ?? 1;
        const cartonQty = book.cartonQty ?? 1;
        const units = cartons * cartonQty;
        const cost = book.buyPriceOverride ?? book.buyPrice;
        const totalCost = cost !== null ? Math.round(units * cost * 100) / 100 : null;
        const revProj = book.rrp !== null
          ? Math.round(units * book.rrp * (sellThroughPct / 100) * 100) / 100
          : null;

        const origValues = rawSheet.headers.map(h => rawRow[h] ?? null);
        const extraValues: CellValue[] = [cartons, units, cost ?? null, totalCost, sellThroughPct, revProj];
        return [...origValues, ...extraValues];
      });

      // Summary row
      const extraOffset = rawSheet.headers.length;
      const summaryRow: CellValue[] = allHeaders.map(() => null);
      summaryRow[0] = 'TOTALS';

      summaryRow[extraOffset + 0] = filteredRaw.reduce((sum, rawRow) => {
        const isbn = String(rawRow[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
        return sum + (bookMap.get(isbn)?.orderCartons ?? 1);
      }, 0);
      summaryRow[extraOffset + 1] = filteredRaw.reduce((sum, rawRow) => {
        const isbn = String(rawRow[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
        const b = bookMap.get(isbn);
        return sum + (b?.orderCartons ?? 1) * (b?.cartonQty ?? 1);
      }, 0);
      summaryRow[extraOffset + 3] = Math.round(
        filteredRaw.reduce((sum, rawRow) => {
          const isbn = String(rawRow[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
          const b = bookMap.get(isbn);
          const cost = b?.buyPriceOverride ?? b?.buyPrice ?? null;
          if (!b || cost === null || cost === undefined) return sum;
          return sum + (b.orderCartons ?? 1) * (b.cartonQty ?? 1) * cost;
        }, 0) * 100,
      ) / 100;
      summaryRow[extraOffset + 5] = Math.round(
        filteredRaw.reduce((sum, rawRow) => {
          const isbn = String(rawRow[rawSheet.isbnKey] ?? '').trim().replace(/\D/g, '');
          const b = bookMap.get(isbn);
          if (!b || b.rrp === null) return sum;
          return sum + (b.orderCartons ?? 1) * (b.cartonQty ?? 1) * b.rrp * (sellThroughPct / 100);
        }, 0) * 100,
      ) / 100;

      ws = XLSX.utils.aoa_to_sheet([allHeaders, ...dataRows, summaryRow]);
    } else {
      // Fallback: no rawSheet
      const headers = [
        'ISBN', 'Title', 'Author', 'Format', 'Category', 'RRP',
        'Buy Price', 'Margin %', 'Stock', 'Pub Year', 'Carton Qty', 'Distributor',
        'Order Cartons', 'Units Ordered', 'Cost/unit (AUD)', 'Total Cost (AUD)',
        'Est. Sell-Through %', 'Revenue Projection (AUD)',
      ];
      const rows = flagged.map(b => {
        const units = (b.orderCartons ?? 1) * (b.cartonQty ?? 1);
        const cost = b.buyPriceOverride ?? b.buyPrice;
        const totalCost = cost !== null ? Math.round(units * cost * 100) / 100 : '';
        const revProj = b.rrp !== null
          ? Math.round(units * b.rrp * (sellThroughPct / 100) * 100) / 100 : '';
        return [
          b.isbn, b.title, b.author, b.format, b.category,
          b.rrp ?? '', b.buyPrice ?? '', b.marginPct ?? '', b.stock,
          b.pubYear ?? '', b.cartonQty ?? '', b.distributor,
          b.orderCartons ?? 1, units, cost ?? '', totalCost, sellThroughPct, revProj,
        ];
      });
      ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Order');
    XLSX.writeFile(wb, `order-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      onClick={download}
      disabled={flagged.length === 0}
      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      ⬇ Export Order XLSX {flagged.length > 0 ? `(${flagged.length} flagged)` : ''}
    </button>
  );
}
