import { useState } from 'react';
import { getApiKey, setApiKey } from '../services/googleBooks';

const SELL_THROUGH_STORAGE = 'sell-through-pct';

export function getSellThroughPct(): number {
  const stored = localStorage.getItem(SELL_THROUGH_STORAGE);
  return stored ? parseFloat(stored) : 70;
}

function setSellThroughPct(pct: number): void {
  localStorage.setItem(SELL_THROUGH_STORAGE, String(pct));
}

interface Props {
  onSaved: () => void;
}

export function Settings({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(getApiKey());
  const [sellThrough, setSellThrough] = useState(String(getSellThroughPct()));
  const hasKey = Boolean(getApiKey());

  function save() {
    setApiKey(draft.trim());
    const pct = parseFloat(sellThrough);
    if (!isNaN(pct) && pct > 0 && pct <= 100) {
      setSellThroughPct(pct);
    }
    onSaved();
    setOpen(false);
  }

  function clear() {
    setDraft('');
    setApiKey('');
    onSaved();
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => { setDraft(getApiKey()); setSellThrough(String(getSellThroughPct())); setOpen(true); }}
        title="Settings"
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        ⚙
        {hasKey && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full" title="Google Books API key configured" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Google Books API key */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">Google Books API Key</span>
                {hasKey
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Configured ✓</span>
                  : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Not set</span>
                }
              </div>
              <p className="text-sm text-gray-500">
                A free API key gives you accurate ratings and categories for every book.
                Without it, data comes from Open Library, which is incomplete for many titles.
              </p>
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="AIza..."
                className="border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={!draft.trim() && !hasKey}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                {hasKey && (
                  <button
                    onClick={clear}
                    className="px-4 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <hr />

            {/* Sell-through % */}
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-gray-800">Default Sell-Through %</span>
              <p className="text-sm text-gray-500">
                Used in revenue projection: <em>Units × RRP × sell-through%</em>. Default is 70%.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sellThrough}
                  onChange={e => setSellThrough(e.target.value)}
                  className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <button
                onClick={save}
                className="self-start bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>

            {/* Google Books instructions */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How to get a free Google Books key (3 minutes)</p>
              <ol className="flex flex-col gap-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">1.</span>
                  <span>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.cloud.google.com</a> and sign in.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">2.</span>
                  <span>Create a new project, then search for <strong>Books API</strong> and enable it.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">3.</span>
                  <span>Go to <strong>APIs &amp; Services → Credentials → Create API Key</strong> and paste it above.</span>
                </li>
              </ol>
              <p className="text-xs text-gray-400 mt-3">Free tier: 1,000 requests/day. Key stored only in your browser.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
