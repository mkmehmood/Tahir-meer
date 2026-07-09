// ================================================================
//  js/translate.js  —  Online Auto-Translation
//  ARAAIN BANNU
//
//  Translates admin-entered English content to Urdu automatically.
//  Uses free public APIs in order of preference with fallbacks.
//
//  APIs tried in order:
//    1. MyMemory (free, no key, 1000 words/day)
//       https://mymemory.translated.net
//    2. LibreTranslate public instance (free, no key)
//       https://translate.argosopentech.com
//
//  Both are free, require no API key, support en→ur, and are
//  CORS-enabled — works directly from the browser.
//
//  Caching:  sessionStorage per browser session
//            In-memory Map for same-page re-renders (instant)
// ================================================================

const CACHE_NS = 'ab_tr_v1_';   // namespace for sessionStorage keys
const _mem     = new Map();      // in-memory cache — survives re-renders

// ── Detect Urdu / Arabic script ──────────────────────────────
const isArabicScript = t => /[\u0600-\u06FF]/.test(t);

// ── sessionStorage helpers ────────────────────────────────────
function _read(text) {
  if (_mem.has(text)) return _mem.get(text);
  try {
    const key = CACHE_NS + text.trim().slice(0, 80);
    const val = sessionStorage.getItem(key);
    if (val) { _mem.set(text, val); return val; }
  } catch (_) {}
  return null;
}

function _write(text, translated) {
  _mem.set(text, translated);
  try {
    sessionStorage.setItem(CACHE_NS + text.trim().slice(0, 80), translated);
  } catch (_) {}
}

// ── API 1: MyMemory ───────────────────────────────────────────
async function _myMemory(text) {
  const url = 'https://api.mymemory.translated.net/get'
    + `?q=${encodeURIComponent(text)}`
    + '&langpair=en%7Cur'
    + '&de=admin%40arainbannu.org';
  const res  = await fetch(url, { signal: AbortSignal.timeout(7000) });
  const data = await res.json();
  const out  = data?.responseData?.translatedText;
  if (data?.responseStatus === 200 && out && isArabicScript(out)) return out;
  return null;
}

// ── API 2: LibreTranslate (Argos public instance) ─────────────
async function _libreTranslate(text) {
  const res = await fetch('https://translate.argosopentech.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'ur' }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  const out  = data?.translatedText;
  if (out && isArabicScript(out)) return out;
  return null;
}

// ── Core translate function ───────────────────────────────────
/**
 * translateToUrdu(text)
 *
 * Translates a string from English to Urdu.
 * Returns original text if already Urdu, empty, or all APIs fail.
 *
 * @param  {string} text
 * @returns {Promise<string>}
 */
export async function translateToUrdu(text) {
  if (!text || text.trim().length < 2) return text;
  if (isArabicScript(text)) return text;         // already Urdu

  const cached = _read(text);
  if (cached) return cached;

  // Try APIs in sequence
  for (const fn of [_myMemory, _libreTranslate]) {
    try {
      const result = await fn(text);
      if (result) {
        _write(text, result);
        return result;
      }
    } catch (_) {
      // Try next API
    }
  }

  console.warn('[ARAAIN BANNU Translate] All APIs failed for:', text.slice(0, 40));
  return text;  // graceful fallback — show original English
}

// ── Batch translate ───────────────────────────────────────────
/**
 * translateAll(map)
 *
 * Translates multiple strings in parallel.
 * @param  {Object} map  { id: 'English text', ... }
 * @returns {Promise<Object>} { id: 'Urdu text', ... }
 */
export async function translateAll(map) {
  const entries = Object.entries(map).filter(([, v]) => v && !isArabicScript(v));
  if (!entries.length) return map;

  const results = await Promise.allSettled(
    entries.map(([, text]) => translateToUrdu(text))
  );

  const out = { ...map };
  entries.forEach(([key], i) => {
    if (results[i].status === 'fulfilled') out[key] = results[i].value;
  });
  return out;
}

// ── DOM helper ────────────────────────────────────────────────
/**
 * translateElement(id, text, lang)
 * Translates text and updates element in-place.
 */
export async function translateElement(id, text, lang) {
  if (lang !== 'ur' || !text || isArabicScript(text)) return;
  const el = document.getElementById(id);
  if (!el) return;
  const urdu = await translateToUrdu(text);
  if (urdu && urdu !== text) el.textContent = urdu;
}
