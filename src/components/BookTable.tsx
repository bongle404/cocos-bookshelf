import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useEffect } from 'react';
import type { BookRow } from '../types/book';
import { ResearchLinks } from './ResearchLinks';
import { fetchGoogleBooks } from '../services/googleBooks';

interface Props {
  books: BookRow[];
  showCarton: boolean;
  onToggleFlag: (isbn: string) => void;
  onUpdateBook: (isbn: string, patch: Partial<BookRow>) => void;
}

const col = createColumnHelper<BookRow>();

function MarginCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 italic text-xs">N/A</span>;
  const cls =
    value >= 85 ? 'text-green-700 font-semibold' :
    value >= 70 ? 'text-yellow-700 font-semibold' :
                  'text-red-700 font-semibold';
  return <span className={cls}>{value}%</span>;
}

function FormatBadge({ format }: { format: BookRow['format'] }) {
  const colours: Record<BookRow['format'], string> = {
    'Paperback':       'bg-blue-100 text-blue-700',
    'Trade Paperback': 'bg-purple-100 text-purple-700',
    'Hardback':        'bg-amber-100 text-amber-700',
    'Board/Novelty':   'bg-pink-100 text-pink-700',
    'Other':           'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${colours[format]}`}>
      {format}
    </span>
  );
}

function PubYearCell({ year }: { year: number | null }) {
  if (year === null) return <span className="text-gray-400">—</span>;
  const isOld = new Date().getFullYear() - year > 5;
  return <span className={isOld ? 'text-orange-600' : ''}>{year}</span>;
}

function PriceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 italic text-xs">N/A</span>;
  return <span>${value.toFixed(2)}</span>;
}

function RatingCell({ isbn }: { isbn: string }) {
  const [state, setState] = useState<{
    rating: number | null;
    count: number | null;
    done: boolean;
  }>({ rating: null, count: null, done: false });

  useEffect(() => {
    let cancelled = false;
    fetchGoogleBooks(isbn).then(data => {
      if (!cancelled) {
        setState({
          rating: data?.rating ?? null,
          count: data?.ratingsCount ?? null,
          done: true,
        });
      }
    });
    return () => { cancelled = true; };
  }, [isbn]);

  if (!state.done) {
    return <span className="text-gray-300 text-xs animate-pulse">…</span>;
  }
  if (state.rating === null) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <span
      title={`${state.count?.toLocaleString() ?? '?'} ratings on Google Books`}
      className="whitespace-nowrap text-sm"
    >
      <span className="text-yellow-500">★</span>{' '}
      {state.rating.toFixed(1)}
      <span className="text-gray-400 text-xs ml-1">({state.count ?? '?'})</span>
    </span>
  );
}

function OrderQtyCell({
  book,
  onUpdate,
}: {
  book: BookRow;
  onUpdate: (isbn: string, patch: Partial<BookRow>) => void;
}) {
  const [val, setVal] = useState(String(book.orderCartons));

  function commit() {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) {
      onUpdate(book.isbn, { orderCartons: n });
    } else {
      setVal(String(book.orderCartons));
    }
  }

  return (
    <input
      type="number"
      min="0"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
      className="w-14 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
    />
  );
}

function BuyPriceCell({
  book,
  onUpdate,
}: {
  book: BookRow;
  onUpdate: (isbn: string, patch: Partial<BookRow>) => void;
}) {
  const effective = book.buyPriceOverride ?? book.buyPrice;
  const [val, setVal] = useState(effective !== null ? String(effective) : '');

  function commit() {
    if (val.trim() === '') {
      onUpdate(book.isbn, { buyPriceOverride: null });
      return;
    }
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      onUpdate(book.isbn, { buyPriceOverride: Math.round(n * 100) / 100 });
    } else {
      const eff = book.buyPriceOverride ?? book.buyPrice;
      setVal(eff !== null ? String(eff) : '');
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        placeholder="—"
        className="w-20 text-xs border border-gray-200 rounded pl-4 pr-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
      />
    </div>
  );
}

export function BookTable({ books, showCarton, onToggleFlag, onUpdateBook }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const isAllenUnwin = books[0]?.distributor === 'allenunwin';

  const columns = [
    col.accessor('flagged', {
      id: 'flag',
      header: '★',
      size: 40,
      cell: info => (
        <button
          onClick={() => onToggleFlag(info.row.original.isbn)}
          className={`text-lg leading-none transition-colors ${
            info.getValue() ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-200 hover:text-yellow-300'
          }`}
          title={info.getValue() ? 'Unflag' : 'Flag for export'}
        >
          ★
        </button>
      ),
      enableSorting: false,
    }),
    col.accessor('isbn', {
      header: 'ISBN',
      size: 130,
      cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
    }),
    col.accessor('title', {
      header: 'Title',
      size: 260,
      cell: info => (
        <span className="line-clamp-2 text-sm leading-tight" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor('author', {
      header: 'Author',
      size: 150,
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    col.accessor('format', {
      header: 'Format',
      size: 130,
      cell: info => <FormatBadge format={info.getValue()} />,
    }),
    col.accessor('category', {
      header: 'Category',
      size: 130,
      cell: info => (
        <span className="text-xs text-gray-600 line-clamp-1" title={info.row.original.categoryRaw}>
          {info.getValue()}
        </span>
      ),
    }),
    col.accessor('rrp', {
      header: 'RRP',
      size: 70,
      cell: info => <PriceCell value={info.getValue()} />,
    }),
    col.accessor('buyPrice', {
      header: 'Buy',
      size: 70,
      cell: info => <PriceCell value={info.getValue()} />,
    }),
    col.accessor('marginPct', {
      header: 'Margin',
      size: 80,
      cell: info => <MarginCell value={info.getValue()} />,
    }),
    col.accessor('stock', {
      header: 'Stock',
      size: 65,
    }),
    col.accessor('pubYear', {
      header: 'Year',
      size: 65,
      cell: info => <PubYearCell year={info.getValue()} />,
    }),
    ...(showCarton
      ? [
          col.accessor('cartonQty' as keyof BookRow, {
            header: 'Carton',
            size: 65,
            cell: (info: { getValue: () => unknown }) => {
              const v = info.getValue() as number | null;
              return <span>{v ?? 0}</span>;
            },
          }),
        ]
      : []),
    col.display({
      id: 'orderCartons',
      header: 'Order Qty',
      size: 80,
      cell: info => (
        <OrderQtyCell book={info.row.original} onUpdate={onUpdateBook} />
      ),
      enableSorting: false,
    }),
    col.display({
      id: 'buyPriceOverride',
      header: isAllenUnwin ? 'Offer Price' : 'Cost/unit',
      size: 90,
      cell: info => (
        <BuyPriceCell book={info.row.original} onUpdate={onUpdateBook} />
      ),
      enableSorting: false,
    }),
    col.display({
      id: 'rating',
      header: 'Rating',
      size: 110,
      cell: info => <RatingCell isbn={info.row.original.isbn} />,
      enableSorting: false,
    }),
    col.display({
      id: 'research',
      header: 'Research',
      size: 180,
      cell: info => <ResearchLinks isbn={info.row.original.isbn} />,
      enableSorting: false,
    }),
  ];

  const table = useReactTable({
    data: books,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={`
                      px-2 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200
                      ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-200' : ''}
                    `}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`
                  border-b border-gray-100
                  ${row.original.flagged ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  hover:bg-blue-50 transition-colors
                `}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-2 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {books.length === 0 && (
          <div className="text-center py-12 text-gray-400">No books match the current filters.</div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white text-sm text-gray-600">
          <span>
            Page {pageIndex + 1} of {pageCount} &nbsp;·&nbsp; {books.length} books
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              «
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              ‹
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              ›
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              »
            </button>
            <select
              value={pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="border rounded text-xs px-1"
            >
              {[25, 50, 100, 200].map(s => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
