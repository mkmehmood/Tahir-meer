// ================================================================
//  js/translate.js  —  Persistent Online Translation
//  ARAAIN BANNU
//
//  ARCHITECTURE:
//    • First Urdu load  → fetches all 210 UI strings via MyMemory
//                         API, saves to localStorage permanently.
//    • Every later load → reads from localStorage instantly (same
//                         speed as the old static dictionary).
//    • Admin content    → translated fresh each session and cached
//                         in sessionStorage.
//
//  APIs (tried in order, first success wins):
//    1. MyMemory  — https://api.mymemory.translated.net
//    2. Argos LibreTranslate — https://translate.argosopentech.com
//
//  No API key required for either. Free tier is sufficient for a
//  community website with localStorage caching (quota only hit
//  once per device per cache version).
//
//  localStorage key format:  ab_translations_<DICT_HASH>
//  Old cache keys are cleaned up automatically on init.
// ================================================================

import { EN, NO_TRANSLATE, DICT_HASH, setUrCache } from './lang.js?v=1787370110';

// ── Storage keys ──────────────────────────────────────────────
const LS_KEY  = `ab_translations_${DICT_HASH}`;
const SS_PREFIX = 'ab_sess_tr_';        // sessionStorage for content

// ── Detect Arabic / Urdu script ──────────────────────────────
const isArabic = t => /[\u0600-\u06FF]/.test(t);
const isBlank  = t => !t || t.trim().length < 2;

// ── Persistent cache (localStorage) ──────────────────────────
let _persistent = {};     // { key: urduText }
let _loaded     = false;

function _loadPersistent() {
  if (_loaded) return;
  _loaded = true;
  try {
    // Clean up stale cache keys from old versions
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('ab_translations_') && k !== LS_KEY) {
        localStorage.removeItem(k);
      }
    }
    const raw = localStorage.getItem(LS_KEY);
    if (raw) _persistent = JSON.parse(raw);
  } catch (_) {}
}

function _savePersistent() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(_persistent)); }
  catch (_) {}
}

// ── Session cache (sessionStorage — for admin content) ────────
const _session = new Map();

function _sessRead(text) {
  if (_session.has(text)) return _session.get(text);
  try {
    const v = sessionStorage.getItem(SS_PREFIX + text.slice(0, 80));
    if (v) { _session.set(text, v); return v; }
  } catch (_) {}
  return null;
}

function _sessWrite(text, translated) {
  _session.set(text, translated);
  try { sessionStorage.setItem(SS_PREFIX + text.slice(0, 80), translated); }
  catch (_) {}
}

// ── Single-string API translation ─────────────────────────────
async function _apiMyMemory(text) {
  const url = 'https://api.mymemory.translated.net/get'
    + `?q=${encodeURIComponent(text)}`
    + '&langpair=en%7Cur'
    + '&de=admin%40arainbannu.org';
  const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
  const d = await r.json();
  const t = d?.responseData?.translatedText;
  return (d?.responseStatus === 200 && t && isArabic(t)) ? t : null;
}

async function _apiLibre(text) {
  const r = await fetch('https://translate.argosopentech.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'ur', format: 'text' }),
    signal: AbortSignal.timeout(5000),
  });
  const d = await r.json();
  const t = d?.translatedText;
  return (t && isArabic(t)) ? t : null;
}

async function _translate(text) {
  if (isBlank(text) || isArabic(text)) return text;
  for (const fn of [_apiMyMemory, _apiLibre]) {
    try { const r = await fn(text); if (r) return r; }
    catch (_) { /* try next */ }
  }
  return text;  // graceful fallback
}

// ── Concurrency limiter (avoid hammering the API) ─────────────
async function _pool(tasks, concurrency = 8) {
  const results = new Array(tasks.length);
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]().catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * initTranslations()
 *
 * Call once at boot (before renderAll).
 * - Loads the localStorage cache into memory
 * - Passes it to lang.js so t(key,'ur') resolves instantly
 * - Returns true  if cache is COMPLETE (all keys translated)
 * - Returns false if this is a cold start (needs prefetch)
 */
export function initTranslations() {
  _loadPersistent();
  const map = new Map(Object.entries(_persistent));
  setUrCache(map);

  // Check if every translatable EN key is in the cache
  const missing = Object.keys(EN).filter(k =>
    !NO_TRANSLATE.has(k) && !_persistent[k]
  );
  return missing.length === 0;
}

/**
 * prefetchAllTranslations(onProgress)
 *
 * Translates every EN string that isn't in the cache yet.
 * Calls onProgress(done, total) as strings complete.
 * Saves to localStorage as each batch finishes.
 *
 * @param {Function} onProgress   (done: number, total: number) => void
 * @returns {Promise<void>}
 */
export async function prefetchAllTranslations(onProgress) {
  _loadPersistent();

  const todo = Object.entries(EN).filter(
    ([k, v]) => !NO_TRANSLATE.has(k) && !_persistent[k] && v && v.trim().length > 1
  );

  if (!todo.length) return;

  let done = 0;
  const total = todo.length;
  if (onProgress) onProgress(0, total);

  const tasks = todo.map(([key, enText]) => async () => {
    const urdu = await _translate(enText);
    if (urdu && urdu !== enText) {
      _persistent[key] = urdu;
    }
    done++;
    if (onProgress) onProgress(done, total);
    // Save to localStorage every 20 completions
    if (done % 20 === 0 || done === total) _savePersistent();
    return [key, urdu];
  });

  await _pool(tasks, 8);

  // Final save + push updated cache to lang.js
  _savePersistent();
  setUrCache(new Map(Object.entries(_persistent)));
}

/**
 * translateToUrdu(text)
 *
 * Translates a single arbitrary string (admin content).
 * Uses sessionStorage cache — not localStorage (content changes).
 *
 * @param  {string} text
 * @returns {Promise<string>}
 */
export async function translateToUrdu(text) {
  if (isBlank(text) || isArabic(text)) return text;
  const cached = _sessRead(text);
  if (cached) return cached;
  const result = await _translate(text);
  if (result && result !== text) _sessWrite(text, result);
  return result;
}

/**
 * translateAll(map)
 *
 * Translates multiple admin-content strings in parallel.
 * @param  {Object} map  { id: 'English text', ... }
 * @returns {Promise<Object>} { id: 'Urdu text', ... }
 */
export async function translateAll(map) {
  const entries = Object.entries(map).filter(([, v]) => v && !isArabic(v));
  if (!entries.length) return map;
  const tasks = entries.map(([, text]) => () => translateToUrdu(text));
  const results = await _pool(tasks, 8);
  const out = { ...map };
  entries.forEach(([key], i) => {
    if (results[i] && results[i] !== map[key]) out[key] = results[i];
  });
  return out;
}

/**
 * clearCache()
 * Removes the persistent translation cache so it will be rebuilt
 * on the next Urdu page load. Call from admin panel if needed.
 */
export function clearCache() {
  try { localStorage.removeItem(LS_KEY); }
  catch (_) {}
  _persistent = {};
  _loaded = false;
  setUrCache(new Map());
}
