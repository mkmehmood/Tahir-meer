# Arain World Council (AWC) — Bannu Regional Organisation v4

## Project Structure

```
awc/
├── index.html          Public website (fully dynamic, bilingual EN/UR)
├── admin.html          Admin panel (edit everything)
├── styles.css          Complete stylesheet
├── README.md
└── js/
    ├── app.js          Main ES module — renders all content from SQLite
    ├── db.js           SQLite CRUD layer (8 tables)
    ├── lang.js         Bilingual dictionary (EN + UR, ~280 keys)
    ├── icons.js        100+ inline SVG icons
    ├── sql-wasm.js     sql.js loader
    ├── sql-wasm.wasm   SQLite WebAssembly binary
    └── sql.js          sql.js library
```

## How to Run

```bash
cd awc
python3 -m http.server 8080
```
Open: http://localhost:8080 — or open index.html directly in Chrome/Edge/Firefox.

## Key Features

### Public Website
- No top bar — clean sticky header with logo + nav
- Language toggle pill in nav (EN ↔ UR) — switches entire DOM instantly via lang.js
- Zero API calls — fully offline language switching
- Bannu Regional Organisation branding throughout
- All content 100% dynamic — loaded from SQLite, editable via admin
- Radio pill buttons for membership form (no dropdowns)
- Photo gallery with lightbox
- Fancy Cinzel + Playfair Display typography
- Fully responsive — mobile, tablet, desktop
- Single language at a time — no mixed text

### Admin Panel
- Identity & Logo — upload logo image (stored as base64 in SQLite)
- Hero, About, Programs, Leadership, Events, CTA, Footer, Contact, Bank
- Gallery — upload/delete photos with captions, auto-resized to 800px
- Pages — Blog, History, Documentation, Environmental, Town Gallery, Department
- Submissions inbox — view, mark read, delete, CSV export
- Contact messages viewer
- Export .sqlite file, Reset to defaults

### Language System (lang.js)
- Two complete dictionaries: EN{} and UR{} with ~280 keys each
- t(key, lang) function returns the correct string
- All static UI text (nav, buttons, form labels, modal text) covered
- Dynamic content (titles, descriptions) stored in SQLite in English
- Admin adds content in English; lang.js handles all UI translation
- No API, no internet required, zero latency

### SQLite Tables
| Table        | Purpose                                           |
|--------------|---------------------------------------------------|
| settings     | All editable content (titles, descriptions, etc.) |
| programs     | Program cards                                     |
| leaders      | Leadership team                                   |
| events       | Upcoming events                                   |
| pages        | Blog, History, Docs, Environmental, Gallery, Dept |
| gallery      | Photos (base64 + captions)                        |
| submissions  | Membership applications                           |
| messages     | Contact form submissions                          |
