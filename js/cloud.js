// ================================================================
//  js/cloud.js  —  Firestore Cloud Sync Layer  (v2)
//  ARAAIN BANNU | ARAAIN BANNU | tahir-meer
//
//  index.html uses:
//    • fetchAllSiteContent()   — initial load (Promise)
//    • subscribeToSiteContent(callback) — live onSnapshot listener
//
//  admin.html uses:
//    • push*() helpers         — write after every admin save
// ================================================================

import { initializeApp, getApps }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore,
         doc, getDoc, setDoc,
         collection, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDQWTvTbXX6o1QvHy5E9HeD5k0DmySlsPg",
  authDomain:        "tahir-meer.firebaseapp.com",
  projectId:         "tahir-meer",
  storageBucket:     "tahir-meer.firebasestorage.app",
  messagingSenderId: "275167373986",
  appId:             "1:275167373986:web:0eef7d041ca22df4c3c5fb"
};

const _existingApp = getApps().find(a => a.name === 'awc-cloud');
const app = _existingApp || initializeApp(FIREBASE_CONFIG, 'awc-cloud');
export const db = getFirestore(app);

// ── siteConfig document names ─────────────────────────────────
const DOCS = ['settings', 'programs', 'leaders', 'events', 'pages', 'gallery'];
const siteDoc = (key) => doc(db, 'siteConfig', key);

// ── Safe single-doc fetch ─────────────────────────────────────
async function _fetch(key) {
  try {
    const snap = await getDoc(siteDoc(key));
    if (!snap.exists()) return null;
    // settings is a flat object; everything else wraps an items array
    return key === 'settings' ? snap.data() : (snap.data().items || []);
  } catch (e) {
    console.warn(`[ARAAIN BANNU Cloud] fetch(${key}) failed:`, e.message);
    return null;
  }
}

// ── Initial parallel fetch (used in boot) ─────────────────────
export async function fetchAllSiteContent() {
  const [settings, programs, leaders, events, pages, gallery] =
    await Promise.all(DOCS.map(_fetch));
  return { settings, programs, leaders, events, pages, gallery };
}

// ── Live listener — calls callback(patch) on every admin save ──
// patch has the same shape as fetchAllSiteContent() result,
// but only the key that changed is non-null in each snapshot.
// We accumulate all keys and always pass a full object.
export function subscribeToSiteContent(callback) {
  const cache = { settings:null, programs:null, leaders:null,
                  events:null,   pages:null,    gallery:null };
  const unsubs = [];

  DOCS.forEach(key => {
    const unsub = onSnapshot(siteDoc(key), snap => {
      if (!snap.exists()) return;
      cache[key] = key === 'settings'
        ? snap.data()
        : (snap.data().items || []);
      callback({ ...cache });
    }, err => {
      console.warn(`[ARAAIN BANNU Cloud] onSnapshot(${key}) error:`, err.message);
    });
    unsubs.push(unsub);
  });

  // Return an unsubscribe-all function
  return () => unsubs.forEach(u => u());
}

// ── Write helpers (admin.html) ────────────────────────────────
export const pushSettings = (obj)   => setDoc(siteDoc('settings'), obj, { merge: true });
export const pushPrograms = (items) => setDoc(siteDoc('programs'), { items });
export const pushLeaders  = (items) => setDoc(siteDoc('leaders'),  { items });
export const pushEvents   = (items) => setDoc(siteDoc('events'),   { items });
export const pushPages    = (items) => setDoc(siteDoc('pages'),    { items });
export const pushGallery  = (items) => setDoc(siteDoc('gallery'),  { items });
