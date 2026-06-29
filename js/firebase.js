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
 *  METADATA (added by this function, not from form)
 *    status            string   — always "new" on first save
 *    submittedAt       Timestamp — Firestore server timestamp (for ordering)
 * ─────────────────────────────────────────────────────────
 */
export async function saveRegistrationToCloud(formData) {
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

    // ── Metadata ──────────────────────────────────────────
    status:            'new',
    submittedAt:       serverTimestamp()
  });

  return doc.id;
}

export { db };
