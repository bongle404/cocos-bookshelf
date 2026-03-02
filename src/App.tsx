import { useBookData } from './hooks/useBookData';
import { UploadZone } from './components/UploadZone';
import { SummaryBar } from './components/SummaryBar';
import { FilterBar } from './components/FilterBar';
import { BookTable } from './components/BookTable';
import { ExportButton } from './components/ExportButton';
import { Settings } from './components/Settings';
import type { BookRow } from './types/book';

export default function App() {
  const {
    books,
    filteredBooks,
    filters,
    setFilters,
    loadBooks,
    toggleFlag,
    categories,
    hasHachette,
  } = useBookData();

  const hasBooks = books.length > 0;
  const showCarton = hasHachette;

  function handleLoad(newBooks: BookRow[]) {
    loadBooks(newBooks);
  }

  function resetFilters() {
    setFilters({ format: '', category: '', minMargin: '', minStock: '', search: '' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <h1 className="text-lg font-bold text-gray-900">Coco's BookShelf</h1>
          </div>
          <div className="flex items-center gap-3">
            {hasBooks && (
              <>
                <ExportButton books={books} />
                <button
                  onClick={() => loadBooks([])}
                  className="text-sm text-gray-400 hover:text-gray-600 underline"
                >
                  Load new file
                </button>
              </>
            )}
            <Settings onSaved={() => { if (hasBooks) loadBooks(books); }} />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto">
        {!hasBooks ? (
          <div className="px-4">
            <UploadZone onLoad={handleLoad} />
          </div>
        ) : (
          <div className="flex flex-col">
            <SummaryBar all={books} filtered={filteredBooks} />
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              disableMargin={hasHachette}
              onReset={resetFilters}
            />
            <BookTable
              books={filteredBooks}
              showCarton={showCarton}
              onToggleFlag={toggleFlag}
            />
          </div>
        )}
      </main>
    </div>
  );
}
