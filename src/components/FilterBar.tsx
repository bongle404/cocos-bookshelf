import type { ChangeEvent } from 'react';
import type { Filters } from '../hooks/useBookData';

interface Props {
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  categories: string[];
  disableMargin: boolean;
  onReset: () => void;
}

const FORMATS = ['Paperback', 'Trade Paperback', 'Hardback', 'Board/Novelty', 'Other'];

export function FilterBar({ filters, setFilters, categories, disableMargin, onReset }: Props) {
  const update = (key: keyof Filters) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters(prev => ({ ...prev, [key]: e.target.value }));

  const hasAny = Object.values(filters).some(v => v !== '');

  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 border-b bg-white items-end">
      {/* Search */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Search</label>
        <input
          type="text"
          placeholder="ISBN, title, author…"
          value={filters.search}
          onChange={update('search')}
          className="border rounded px-2 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Format */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Format</label>
        <select
          value={filters.format}
          onChange={update('format')}
          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All formats</option>
          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Category</label>
        <select
          value={filters.category}
          onChange={update('category')}
          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Min Margin */}
      <div className="flex flex-col gap-1">
        <label className={`text-xs font-medium ${disableMargin ? 'text-gray-300' : 'text-gray-500'}`}>
          Min Margin %
        </label>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="e.g. 75"
          value={filters.minMargin}
          onChange={update('minMargin')}
          disabled={disableMargin}
          className="border rounded px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
        />
      </div>

      {/* Min Stock */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Min Stock</label>
        <input
          type="number"
          min={0}
          placeholder="e.g. 10"
          value={filters.minStock}
          onChange={update('minStock')}
          className="border rounded px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Clear */}
      {hasAny && (
        <button
          onClick={onReset}
          className="self-end text-sm text-blue-600 hover:text-blue-800 underline pb-1.5"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
