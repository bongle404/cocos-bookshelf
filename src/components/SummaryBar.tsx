import type { BookRow } from '../types/book';

interface Props {
  all: BookRow[];
  filtered: BookRow[];
  sellThroughPct: number;
}

export function SummaryBar({ all, filtered, sellThroughPct }: Props) {
  const total = filtered.length;
  const flaggedBooks = filtered.filter(b => b.flagged);
  const flagged = flaggedBooks.length;

  const margins = filtered.map(b => b.marginPct).filter((m): m is number => m !== null);
  const avgMargin = margins.length > 0
    ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
    : null;

  const formats: Record<string, number> = {};
  for (const b of filtered) {
    formats[b.format] = (formats[b.format] ?? 0) + 1;
  }

  // Order pack stats — only for flagged books
  const totalCartons = flaggedBooks.reduce((sum, b) => sum + (b.orderCartons ?? 1), 0);
  const totalUnits = flaggedBooks.reduce((sum, b) => sum + (b.orderCartons ?? 1) * (b.cartonQty ?? 1), 0);

  const totalOrderCost = flaggedBooks.reduce((sum, b) => {
    const cost = b.buyPriceOverride ?? b.buyPrice;
    if (cost === null) return sum;
    return sum + (b.orderCartons ?? 1) * (b.cartonQty ?? 1) * cost;
  }, 0);

  const totalRevenue = flaggedBooks.reduce((sum, b) => {
    if (b.rrp === null) return sum;
    const units = (b.orderCartons ?? 1) * (b.cartonQty ?? 1);
    return sum + units * b.rrp * (sellThroughPct / 100);
  }, 0);

  const hasOrderData = flaggedBooks.some(b => (b.buyPriceOverride ?? b.buyPrice) !== null);
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
        <>
          <span>
            <strong className="text-yellow-600">{flagged}</strong> flagged
          </span>
          <span>
            Cartons: <strong className="text-gray-900">{totalCartons}</strong>
            {totalUnits > 0 && <span className="text-gray-400"> ({totalUnits.toLocaleString()} units)</span>}
          </span>
          {hasOrderData && totalOrderCost > 0 && (
            <span>
              Order value: <strong className="text-red-700">${totalOrderCost.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          )}
          {totalRevenue > 0 && (
            <span title={`At ${sellThroughPct}% sell-through`}>
              Rev. proj: <strong className="text-green-700">${totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          )}
        </>
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
