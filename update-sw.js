#!/usr/bin/env node
/**
 * update-sw.js  —  Run this after any file change (or in a CI/deploy step).
 *
 * What it does:
 *   1. Hashes every tracked file in the AWC project.
 *   2. Derives a short fingerprint from those hashes.
 *   3. Writes the new CACHE_VERSION into sw.js.
 *
 * Usage:
 *   node update-sw.js            # run from the awc/ directory
 *   node update-sw.js --dry-run  # print the new version without writing
 *
 * Tip: add  "prebuild": "node update-sw.js"  to your package.json scripts
 * so it runs automatically before every deployment.
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT   = __dirname;          // directory this script lives in
const SW     = path.join(ROOT, 'sw.js');
const DRY    = process.argv.includes('--dry-run');

// ── Files to fingerprint ─────────────────────────────────────────────────────
// Add or remove entries here if you add new assets to the project.
const FILES = [
  'index.html',
  'admin.html',
  'styles.css',
  'js/app.js',
  'js/db.js',
  'js/lang.js',
  'js/icons.js',
  'js/sql.js',
  'js/sql-wasm.js',
  'js/sql-wasm.wasm',
  'sw.js',
];

// ── Hash each file ────────────────────────────────────────────────────────────
const combined = crypto.createHash('md5');

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`  ⚠  Skipping missing file: ${rel}`);
    continue;
  }
  const buf = fs.readFileSync(abs);
  combined.update(buf);
}

const fingerprint = combined.digest('hex').slice(0, 8);
const newVersion  = `awc-${fingerprint}`;

// ── Read current sw.js and extract existing version ──────────────────────────
const swSource  = fs.readFileSync(SW, 'utf8');
const versionRx = /const CACHE_VERSION = '(awc-[a-f0-9]+)';/;
const match     = swSource.match(versionRx);
const oldVersion = match ? match[1] : '(none)';

if (oldVersion === newVersion) {
  console.log(`✔  Cache version unchanged: ${newVersion}`);
  process.exit(0);
}

// ── Write updated sw.js ───────────────────────────────────────────────────────
const updated = swSource.replace(versionRx, `const CACHE_VERSION = '${newVersion}';`);

if (DRY) {
  console.log(`  Dry run — would update: ${oldVersion}  →  ${newVersion}`);
} else {
  fs.writeFileSync(SW, updated, 'utf8');
  console.log(`✔  Updated CACHE_VERSION: ${oldVersion}  →  ${newVersion}`);
}
