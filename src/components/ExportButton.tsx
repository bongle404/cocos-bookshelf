import type { BookRow } from '../types/book';

interface Props {
  books: BookRow[];
}

export function ExportButton({ books }: Props) {
  const flagged = books.filter(b => b.flagged);

  function download() {
    if (flagged.length === 0) return;

    const headers = [
      'ISBN', 'Title', 'Author', 'Format', 'Category', 'RRP',
      'Buy Price', 'Margin %', 'Stock', 'Pub Year', 'Carton Qty', 'Distributor',
    ];

    const rows = flagged.map(b => [
      b.isbn,
      b.title,
      b.author,
      b.format,
      b.category,
      b.rrp ?? '',
      b.buyPrice ?? '',
      b.marginPct ?? '',
      b.stock,
      b.pubYear ?? '',
      b.cartonQty ?? '',
      b.distributor,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flagged-books-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={flagged.length === 0}
      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      ⬇ Export {flagged.length > 0 ? `${flagged.length} flagged` : 'flagged'} CSV
    </button>
  );
}
