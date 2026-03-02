import type { BookRow } from '../types/book';

interface Props {
  all: BookRow[];
  filtered: BookRow[];
}

export function SummaryBar({ all, filtered }: Props) {
  const total = filtered.length;
  const flagged = filtered.filter(b => b.flagged).length;

  const margins = filtered.map(b => b.marginPct).filter((m): m is number => m !== null);
  const avgMargin = margins.length > 0
    ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
    : null;

  const formats: Record<string, number> = {};
  for (const b of filtered) {
    formats[b.format] = (formats[b.format] ?? 0) + 1;
  }

  const isFiltered = total !== all.length;

  return (
    <div className="flex flex-wrap gap-4 px-4 py-3 bg-gray-50 border-b text-sm text-gray-600">
      <span>
        <strong className="text-gray-900">{total.toLocaleString()}</strong> books
        {isFiltered && <span className="text-gray-400"> of {all.length.toLocaleString()}</span>}
      </span>
      {avgMargin !== null && (
        <span>
          Avg margin: <strong className="text-gray-900">{avgMargin}%</strong>
        </span>
      )}
      {flagged > 0 && (
        <span>
          <strong className="text-yellow-600">{flagged}</strong> flagged
        </span>
      )}
      {Object.entries(formats)
        .sort((a, b) => b[1] - a[1])
        .map(([fmt, count]) => (
          <span key={fmt} className="text-gray-500">
            {fmt}: <strong className="text-gray-700">{count}</strong>
          </span>
        ))}
    </div>
  );
}
