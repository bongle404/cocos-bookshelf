import { useState, useMemo, useCallback } from 'react';
import type { BookRow } from '../types/book';
import type { ParseResult, RawSheetData } from '../parsers/index';
import { useLocalStorage } from './useLocalStorage';
import { fetchGoogleBooks } from '../services/googleBooks';

export interface Filters {
  format: string;
  category: string;
  minMargin: string;
  minStock: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  format: '',
  category: '',
  minMargin: '',
  minStock: '',
  search: '',
};

export function useBookData() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [rawSheet, setRawSheet] = useState<RawSheetData | null>(null);
  const [flaggedISBNs, setFlaggedISBNs] = useLocalStorage<string[]>('flagged-isbns', []);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const loadBooks = useCallback((result: ParseResult | BookRow[]) => {
    const newBooks: BookRow[] = Array.isArray(result) ? result : result.books;
    const newRawSheet: RawSheetData | null = Array.isArray(result) ? null : result.rawSheet;

    const flaggedSet = new Set(flaggedISBNs);
    const withFlags = newBooks.map(b => ({
      ...b,
      flagged: flaggedSet.has(b.isbn),
    }));
    setBooks(withFlags);
    if (newRawSheet) setRawSheet(newRawSheet);
    setFilters(DEFAULT_FILTERS);

    // Background: Google Books enrichment (category + rating)
    for (const book of withFlags) {
      fetchGoogleBooks(book.isbn).then(async data => {
        let subjects = data?.subjects ?? [];

        if (!subjects.length && book.title) {
          try {
            const q = encodeURIComponent(book.title.slice(0, 40));
            const res = await fetch(
              `https://openlibrary.org/search.json?title=${q}&fields=subject,isbn&limit=5`,
            );
            if (res.ok) {
              const json = await res.json() as { docs?: Array<{ subject?: string[]; isbn?: string[] }> };
              const match = json.docs?.find(d => d.isbn?.includes(book.isbn));
              if (match?.subject?.length) subjects = match.subject;
            }
          } catch { /* ignore */ }
        }

        if (!subjects.length) return;
        const category = subjects[0].split('--')[0].split('/')[0].trim();
        setBooks(prev =>
          prev.map(b =>
            b.isbn === book.isbn && !b.category
              ? { ...b, category, categoryRaw: subjects[0] }
              : b,
          ),
        );
      });
    }
  }, [flaggedISBNs]);

  const toggleFlag = useCallback((isbn: string) => {
    setFlaggedISBNs(prev => {
      const set = new Set(prev);
      if (set.has(isbn)) {
        set.delete(isbn);
      } else {
        set.add(isbn);
      }
      return Array.from(set);
    });
    setBooks(prev =>
      prev.map(b => b.isbn === isbn ? { ...b, flagged: !b.flagged } : b),
    );
  }, [setFlaggedISBNs]);

  const updateBook = useCallback((isbn: string, patch: Partial<BookRow>) => {
    setBooks(prev =>
      prev.map(b => b.isbn === isbn ? { ...b, ...patch } : b),
    );
  }, []);

  const filteredBooks = useMemo(() => {
    const search = filters.search.toLowerCase();
    const minMargin = filters.minMargin !== '' ? parseFloat(filters.minMargin) : null;
    const minStock = filters.minStock !== '' ? parseInt(filters.minStock, 10) : null;

    return books.filter(b => {
      if (filters.format && b.format !== filters.format) return false;
      if (filters.category && b.category !== filters.category) return false;
      if (minMargin !== null && (b.marginPct === null || b.marginPct < minMargin)) return false;
      if (minStock !== null && b.stock < minStock) return false;
      if (search) {
        const hay = `${b.isbn} ${b.title} ${b.author}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [books, filters]);

  const categories = useMemo(() => {
    const set = new Set(books.map(b => b.category).filter(Boolean));
    return Array.from(set).sort();
  }, [books]);

  const hasHachette = useMemo(() => books.some(b => b.distributor === 'hachette'), [books]);

  return {
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
  };
}
