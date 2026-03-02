export interface GoogleBooksData {
  rating: number | null;
  ratingsCount: number | null;
  subjects: string[];
}

// ── API key (persisted in localStorage, readable by service) ────────────────
const KEY_STORAGE = 'google-books-api-key';
let _apiKey: string = localStorage.getItem(KEY_STORAGE) ?? '';

export function getApiKey(): string { return _apiKey; }

export function setApiKey(key: string): void {
  _apiKey = key;
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
  // Invalidate cache so existing "no data" results get retried with the key
  cache.clear();
}

// ── In-memory cache: ISBN → settled promise ──────────────────────────────────
const cache = new Map<string, Promise<GoogleBooksData | null>>();

// ── Concurrency gate ─────────────────────────────────────────────────────────
let active = 0;
const MAX_CONCURRENT = 4;
const waitQueue: Array<() => void> = [];
function acquire() {
  return new Promise<void>(resolve => {
    if (active < MAX_CONCURRENT) { active++; resolve(); }
    else waitQueue.push(resolve);
  });
}
function release() {
  active--;
  const next = waitQueue.shift();
  if (next) { active++; next(); }
}

async function safeFetch<T = unknown>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

// ── Core fetch ───────────────────────────────────────────────────────────────
async function fetchRaw(isbn: string): Promise<GoogleBooksData | null> {
  await acquire();
  try {
    let subjects: string[] = [];
    let rating: number | null = null;
    let ratingsCount: number | null = null;

    // ── Priority 1: Google Books with API key (best data, no quota issues) ──
    if (_apiKey) {
      type GBResponse = { items?: Array<{ volumeInfo?: { averageRating?: number; ratingsCount?: number; categories?: string[] } }> };
      const gb = await safeFetch<GBResponse>(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${_apiKey}&fields=items(volumeInfo(averageRating,ratingsCount,categories))&maxResults=1`,
      );
      const vi = gb?.items?.[0]?.volumeInfo;
      if (vi?.averageRating) {
        rating = Math.round(vi.averageRating * 10) / 10;
        ratingsCount = vi.ratingsCount ?? null;
      }
      if (vi?.categories?.length) subjects = vi.categories;
    }

    // ── Priority 2: Open Library search (free, decent subject coverage) ─────
    if (!rating || !subjects.length) {
      type OLSearch = { docs?: Array<{ subject?: string[]; ratings_average?: number; ratings_count?: number }> };
      const ol = await safeFetch<OLSearch>(
        `https://openlibrary.org/search.json?isbn=${isbn}&fields=ratings_average,ratings_count,subject&limit=1`,
      );
      const doc = ol?.docs?.[0];
      if (!subjects.length && doc?.subject?.length) subjects = doc.subject;
      if (!rating && doc?.ratings_average && doc.ratings_average > 0) {
        rating = Math.round(doc.ratings_average * 10) / 10;
        ratingsCount = doc.ratings_count ?? null;
      }
    }

    // ── Priority 3: OL works ratings (deeper lookup via work key) ────────────
    if (!rating) {
      type OLBooks = Record<string, { details?: { works?: Array<{ key: string }> } }>;
      const olBook = await safeFetch<OLBooks>(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`,
      );
      const workKey = olBook?.[`ISBN:${isbn}`]?.details?.works?.[0]?.key;
      if (workKey) {
        type OLRating = { summary?: { average?: number; count?: number } };
        const wr = await safeFetch<OLRating>(`https://openlibrary.org${workKey}/ratings.json`);
        const avg = wr?.summary?.average;
        const cnt = wr?.summary?.count;
        if (avg && avg > 0) {
          rating = Math.round(avg * 10) / 10;
          ratingsCount = cnt ?? null;
        }
      }
    }

    return { rating, ratingsCount, subjects };
  } catch {
    return null;
  } finally {
    release();
  }
}

export function fetchGoogleBooks(isbn: string): Promise<GoogleBooksData | null> {
  if (!cache.has(isbn)) cache.set(isbn, fetchRaw(isbn));
  return cache.get(isbn)!;
}
