// =========================================================
//  js/firebase.js  —  Firebase v10 Modular SDK
//  AWC | Arain World Council — tahir-meer project
//
//  Firestore document structure mirrors the exact fields
//  from index.html membershipForm + db.js submissions table.
// =========================================================

import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore,
         collection,
         addDoc,
         serverTimestamp }     from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDQWTvTbXX6o1QvHy5E9HeD5k0DmySlsPg",
  authDomain:        "tahir-meer.firebaseapp.com",
  projectId:         "tahir-meer",
  storageBucket:     "tahir-meer.firebasestorage.app",
  messagingSenderId: "275167373986",
  appId:             "1:275167373986:web:0eef7d041ca22df4c3c5fb"
};

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

/**
 * saveRegistrationToCloud(formData)
 *
 * Writes one membership application to Firestore collection
 * "registrations". Field names match exactly what FormData
 * collects from index.html #membershipForm (same as db.js).
 *
 * Firestore document structure:
 * ─────────────────────────────────────────────────────────
 *  PERSONAL INFORMATION
 *    fullName          string   — Full Name (required)
 *    fatherName        string   — Father Name (required)
 *    gender            string   — "Male" | "Female" | "Other"
 *    membershipType    string   — "Executive Member" | "General Member"
 *                                 "Youth Member" | "Associate Member"
 *    cnic              string   — "XXXXX-XXXXXXX-X" (optional)
 *    dob               string   — "YYYY-MM-DD" (required)
 *
 *  CONTACT & RESIDENTIAL
 *    email             string   — Email Address (required)
 *    whatsapp          string   — WhatsApp No e.g. "+92XXXXXXXXXX" (required)
 *    residentialStatus string   — "Resident Pakistani" | "Overseas Pakistani"
 *    affiliated        string   — "Yes" | "No"
 *
 *  PROFESSIONAL INFORMATION
 *    education         string   — "Matric" | "Intermediate" | "Graduate"
 *                                 "Post Graduate" | "Other"
 *    work              string   — "Student" | "Job Holder" | "Government Employee"
 *                                 "Business Owner" | "Freelancer" | "Other"
 *    reason            string   — Why they want to join (optional)
 *
 *  ADDRESS
 *    street            string   — Street Address (required)
 *    city              string   — City (required)
 *    state             string   — State / Province (required)
 *    country           string   — Country (required)
 *
 *  PHOTO
 *    photoData         string   — base64 JPEG data URL, resized to a max
 *                                 480px dimension client-side before upload
 *                                 (keeps each document comfortably under
 *                                 Firestore's 1MB-per-document limit).
 *                                 Empty string if no photo was provided.
 *
 *  METADATA (added by this function, not from form)
 *    status            string   — always "new" on first save
 *    submittedAt       Timestamp — Firestore server timestamp (for ordering)
 * ─────────────────────────────────────────────────────────
 */
export async function saveRegistrationToCloud(formData) {
  // Safety net: Firestore hard-rejects any document over 1MB. The
  // client-side compression in app.js keeps photos small, but if a
  // photo somehow still comes through too large, drop it rather than
  // let the whole submission fail to save.
  const MAX_PHOTO_CHARS = 700_000; // ~700KB of base64 text, safely under the 1MB cap
  const photoData = (formData.photoData && formData.photoData.length <= MAX_PHOTO_CHARS)
    ? formData.photoData
    : '';

  const doc = await addDoc(collection(db, 'registrations'), {
    // ── Personal ──────────────────────────────────────────
    fullName:          formData.fullName          || '',
    fatherName:        formData.fatherName        || '',
    gender:            formData.gender            || '',
    membershipType:    formData.membershipType    || '',
    cnic:              formData.cnic              || '',
    dob:               formData.dob               || '',

    // ── Contact & Residential ─────────────────────────────
    email:             formData.email             || '',
    whatsapp:          formData.whatsapp          || '',
    residentialStatus: formData.residentialStatus || '',
    affiliated:        formData.affiliated        || '',

    // ── Professional ──────────────────────────────────────
    education:         formData.education         || '',
    work:              formData.work              || '',
    reason:            formData.reason            || '',

    // ── Address ───────────────────────────────────────────
    street:            formData.street            || '',
    city:              formData.city              || '',
    state:             formData.state             || '',
    country:           formData.country           || '',

    // ── Photo ──────────────────────────────────────────────
    photoData:         photoData,

    // ── Metadata ──────────────────────────────────────────
    status:            'new',
    submittedAt:       serverTimestamp()
  });

  return doc.id;
}

/**
 * saveDonationToCloud(data)
 *
 * Writes a donation confirmation record to Firestore "donations" collection.
 *
 * Firestore document structure:
 *   donorName   string  — Donor full name
 *   phone       string  — WhatsApp / phone number
 *   email       string  — Email (optional)
 *   amount      string  — Amount donated (text, e.g. "5000" or "PKR 5,000")
 *   method      string  — "bank" | "easypaisa" | "jazzcash" | "international"
 *   txId        string  — Transaction ID / reference number
 *   note        string  — Optional message from donor
 *   photoData   string  — base64 JPEG of payment screenshot (max 700KB)
 *   status      string  — "unverified" on first save
 *   submittedAt Timestamp
 */
export async function saveDonationToCloud(data) {
  const MAX_PHOTO_CHARS = 700_000;
  const photoData = (data.photoData && data.photoData.length <= MAX_PHOTO_CHARS)
    ? data.photoData : '';

  const ref = await addDoc(collection(db, 'donations'), {
    donorName:   data.donorName  || '',
    phone:       data.phone      || '',
    email:       data.email      || '',
    amount:      data.amount     || '',
    method:      data.method     || '',
    txId:        data.txId       || '',
    note:        data.note       || '',
    photoData:   photoData,
    status:      'unverified',
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export { db };
