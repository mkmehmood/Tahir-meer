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
//
//  ── Firestore document structure ──────────────────────────────
//  Collection: siteConfig
//  One document per key in DOCS below. This is the cloud mirror of
//  the local SQLite tables in js/db.js — same fields, different
//  storage. index.html reads these documents (public, no login);
//  admin.html writes them after every edit.
//
//    siteConfig/settings   — flat key→value object (merge: true on write)
//                             mirrors the `settings` SQLite table
//                             (key TEXT PRIMARY KEY, value TEXT)
//
//    siteConfig/programs   — { items: [ {id, icon_name, color, title,
//                             desc, sort_order}, ... ] }
//    siteConfig/leaders    — { items: [ {id, initials, name, role, email,
//                             featured, photo_data, sort_order}, ... ] }
//    siteConfig/events     — { items: [ {id, day, month, tag, title,
//                             time_str, place, sort_order}, ... ] }
//    siteConfig/pages      — { items: [ {id, slug, label, title, body,
//                             published, sort_order}, ... ] }
//    siteConfig/gallery    — { items: [ {id, data_url, caption,
//                             sort_order}, ... ] }
//
//  Each non-settings doc is written as a whole-array replace
//  (setDoc without merge) — admin.html always pushes the FULL
//  current array for that collection, not a single item.
//
//  ── Auth requirement for writes ───────────────────────────────
//  firestore.rules only allows writes to siteConfig/* when
//  request.auth.uid matches the hard-coded admin UID. That means
//  every push*() call below MUST run on a Firebase App instance
//  that has an authenticated admin session — see the `app` export
//  and the note in admin.html's login script for how that's wired
//  up (both must share the same App instance, or writes fail with
//  [permission-denied] even while the UI shows you as logged in).
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
export const app = _existingApp || initializeApp(FIREBASE_CONFIG, 'awc-cloud');
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
