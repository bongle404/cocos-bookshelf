import { useState } from 'react';
import { useBookData } from './hooks/useBookData';
import { UploadZone } from './components/UploadZone';
import { SummaryBar } from './components/SummaryBar';
import { FilterBar } from './components/FilterBar';
import { BookTable } from './components/BookTable';
import { ExportButton } from './components/ExportButton';
import { Settings, getSellThroughPct } from './components/Settings';
import type { ParseResult } from './parsers';

export default function App() {
  const {
    books,
    rawSheet,
    filteredBooks,
    filters,
    setFilters,
    loadBooks,
    toggleFlag,
    updateBook,
    categories,
    hasHachette,
  } = useBookData();

  const [sellThroughPct, setSellThroughPct] = useState(getSellThroughPct);

  const hasBooks = books.length > 0;

  function handleSettingsSaved() {
    setSellThroughPct(getSellThroughPct());
    if (hasBooks) loadBooks(books);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <h1 className="text-lg font-bold text-gray-900">Coco's BookShelf</h1>
          </div>
          <div className="flex items-center gap-3">
            {hasBooks && (
              <>
                <ExportButton books={books} rawSheet={rawSheet} sellThroughPct={sellThroughPct} />
                <button
                  onClick={() => loadBooks([])}
                  className="text-sm text-gray-400 hover:text-gray-600 underline"
                >
                  Load new file
                </button>
              </>
            )}
            <Settings onSaved={handleSettingsSaved} />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto">
        {!hasBooks ? (
          <div className="px-4">
            <UploadZone onLoad={(result: ParseResult) => loadBooks(result)} />
          </div>
        ) : (
          <div className="flex flex-col">
            <SummaryBar all={books} filtered={filteredBooks} sellThroughPct={sellThroughPct} />
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              disableMargin={hasHachette}
              onReset={() => setFilters({ format: '', category: '', minMargin: '', minStock: '', search: '' })}
            />
            <BookTable
              books={filteredBooks}
              showCarton={hasHachette}
              onToggleFlag={toggleFlag}
              onUpdateBook={updateBook}
            />
          </div>
        )}
      </main>
    </div>
  );
}
