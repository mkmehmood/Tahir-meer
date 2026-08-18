// v5: bumped from v4 because the 'donations' table and 'photo_data'
// column (submissions) were added after v4 databases were already
// created for some users. CREATE TABLE IF NOT EXISTS does not alter
// existing tables, so anyone with a persisted v4 database would be
// permanently missing the donations table / photo_data column and
// every query against them would throw. Bumping the version forces
// a clean, fully-current schema for everyone, old data simply starts
// fresh (this is a low-traffic admin tool, not user-facing data loss).
// v6: bumped from v5 because the 'leaders' table was missing a
// 'photo_data' column entirely — upsertLeader() silently dropped every
// leader photo upload (neither INSERT nor UPDATE ever wrote it). Anyone
// with a v5 database needs a fresh schema for leader photos to persist.
const DB_NAME = 'araain_bannu_sqlite_v6';
const IDB_STORE = 'araain_bannu_db';
const IDB_KEY = 'main';
let _db = null;
let _SQL = null;
function idbOpen() {
return new Promise((res, rej) => {
const r = indexedDB.open(DB_NAME, 1);
r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
r.onsuccess = e => res(e.target.result);
r.onerror = e => rej(e.target.error);
});
}
async function idbLoad() {
const idb = await idbOpen();
return new Promise((res, rej) => {
const tx = idb.transaction(IDB_STORE, 'readonly');
const r = tx.objectStore(IDB_STORE).get(IDB_KEY);
r.onsuccess = e => res(e.target.result || null);
r.onerror = e => rej(e.target.error);
});
}
async function idbSave(data) {
const idb = await idbOpen();
return new Promise((res, rej) => {
const tx = idb.transaction(IDB_STORE, 'readwrite');
const r = tx.objectStore(IDB_STORE).put(data, IDB_KEY);
r.onsuccess = () => res();
r.onerror = e => rej(e.target.error);
});
}
async function persist() {
if (_db) await idbSave(_db.export());
}
function rows(res) {
if (!res[0]) return [];
return res[0].values.map(row => Object.fromEntries(res[0].columns.map((c, i) => [c, row[i]])));
}
function createSchema() {
_db.run(`
CREATE TABLE IF NOT EXISTS settings (
key TEXT PRIMARY KEY,
value TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS programs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
icon_name TEXT NOT NULL DEFAULT 'handshake',
color TEXT NOT NULL DEFAULT '#6D28D9',
title TEXT NOT NULL DEFAULT '',
desc TEXT NOT NULL DEFAULT '',
sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS leaders (
id INTEGER PRIMARY KEY AUTOINCREMENT,
initials TEXT NOT NULL DEFAULT '',
name TEXT NOT NULL DEFAULT '',
role TEXT NOT NULL DEFAULT '',
email TEXT NOT NULL DEFAULT '',
featured INTEGER NOT NULL DEFAULT 0,
photo_data TEXT NOT NULL DEFAULT '',
sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
id INTEGER PRIMARY KEY AUTOINCREMENT,
day TEXT NOT NULL DEFAULT '',
month TEXT NOT NULL DEFAULT '',
tag TEXT NOT NULL DEFAULT 'Event',
title TEXT NOT NULL DEFAULT '',
time_str TEXT NOT NULL DEFAULT '',
place TEXT NOT NULL DEFAULT '',
sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS pages (
id INTEGER PRIMARY KEY AUTOINCREMENT,
slug TEXT NOT NULL UNIQUE,
label TEXT NOT NULL DEFAULT '',
title TEXT NOT NULL DEFAULT '',
body TEXT NOT NULL DEFAULT '',
published INTEGER NOT NULL DEFAULT 1,
sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gallery (
id INTEGER PRIMARY KEY AUTOINCREMENT,
data_url TEXT NOT NULL DEFAULT '',
caption TEXT NOT NULL DEFAULT '',
sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS submissions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
full_name TEXT NOT NULL DEFAULT '',
father_name TEXT NOT NULL DEFAULT '',
gender TEXT NOT NULL DEFAULT '',
member_type TEXT NOT NULL DEFAULT '',
cnic TEXT NOT NULL DEFAULT '',
dob TEXT NOT NULL DEFAULT '',
email TEXT NOT NULL DEFAULT '',
whatsapp TEXT NOT NULL DEFAULT '',
residential TEXT NOT NULL DEFAULT '',
affiliated TEXT NOT NULL DEFAULT '',
education TEXT NOT NULL DEFAULT '',
work TEXT NOT NULL DEFAULT '',
reason TEXT NOT NULL DEFAULT '',
street TEXT NOT NULL DEFAULT '',
city TEXT NOT NULL DEFAULT '',
state TEXT NOT NULL DEFAULT '',
country TEXT NOT NULL DEFAULT '',
photo_data TEXT NOT NULL DEFAULT '',
status TEXT NOT NULL DEFAULT 'new',
created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL DEFAULT '',
email TEXT NOT NULL DEFAULT '',
subject TEXT NOT NULL DEFAULT '',
message TEXT NOT NULL DEFAULT '',
status TEXT NOT NULL DEFAULT 'unread',
created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS donations (
id INTEGER PRIMARY KEY AUTOINCREMENT,
donor_name TEXT NOT NULL DEFAULT '',
phone TEXT NOT NULL DEFAULT '',
email TEXT NOT NULL DEFAULT '',
amount TEXT NOT NULL DEFAULT '',
method TEXT NOT NULL DEFAULT '',
tx_id TEXT NOT NULL DEFAULT '',
note TEXT NOT NULL DEFAULT '',
photo_data TEXT NOT NULL DEFAULT '',
status TEXT NOT NULL DEFAULT 'unverified',
created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
}
function seedSettings() {
const d = {
siteName: 'ARAAIN BANNU',
siteTagline: 'Unity | Empowerment | Development',
siteSubName: 'Bannu Regional Organisation',
siteSubTagline: 'Bannu | KPK | Pakistan',
logoData: '',
heroBadge: 'Welcome to ARAAIN BANNU',
heroTitle: 'ARAAIN BANNU',
heroSub: 'Empowering Our Next Generation, Proud Of Our Heritage',
heroTagline: 'Uniting the Arain Community Worldwide — Strength, Unity, Progress',
aboutP1: 'ARAAIN BANNU is a non-political, welfare-oriented platform established to unite the global Arain community under one vision of progress, unity, and empowerment.',
aboutP2: 'The Council actively works in education, employment, youth development, and social welfare, guiding the younger generation and providing professional growth opportunities.',
aboutP3: 'All members contribute voluntarily with dedication. ARAAIN BANNU believes in transparency, unity, and service to humanity without any discrimination.',
statMembers: '500+',
statPrograms: '8',
statCities: '30+',
chairmanName: 'Dr. Aitzaz Chaudhary Arain',
chairmanQuote: '"Our mission is to build a strong, educated, and united community that supports youth, respects its heritage, and creates opportunities for future generations."',
programsTitle: 'Programs / Initiatives',
programsDesc: 'We work on all the projects below. Our goal is to provide all facilities to the entire Arain community.',
leadershipTitle: 'Meet Our Leadership',
membershipTitle: 'Apply Membership',
membershipDesc: 'From void to light, shaping paths where living moments turn into lasting journeys.',
donateTitle: 'Give Donation',
donateDesc: 'Do you want to support the Arain Family and make a meaningful difference?',
eventsTitle: 'Events & Programs',
galleryTitle: 'Photo Gallery',
galleryDesc: 'Memories from ARAAIN BANNU events, gatherings, and milestones.',
contactAddress: 'Bannu, Khyber Pakhtunkhwa, Pakistan',
contactHours: 'Mon – Fri: 8:00 am – 6:00 pm',
contactPhone: '+92-33-9192-9922',
contactEmail: 'admin@arainbannu.org',
footerDesc: 'ARAAIN BANNU unites the global Arain community, empowering youth, promoting education, supporting welfare, and building strong networks for progress worldwide.',
footerCopy: '© 2026 ARAAIN BANNU — All Rights Reserved.',
bankName: 'Meezan Bank Ltd.',
bankTitle: 'ARAAIN BANNU',
bankAccount: '0226-0106765474',
bankIBAN: 'PK52MEZN0002260106765474',
bankBranch: '0226',
epTitle: 'Dr. Aitzaz Chaudhary Arain',
epNumber: '0339-1929922',
jcTitle: 'ARAAIN BANNU Fund',
jcNumber: '0339-1929922',
intBank: 'Meezan Bank Ltd.',
intSwift: 'MEZNPKKA',
intIBAN: 'PK52MEZN0002260106765474',
};
const s = _db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
for (const [k, v] of Object.entries(d)) s.run([k, v]);
s.free();
}
function seedPrograms() {
if (_db.exec('SELECT COUNT(*) FROM programs')[0].values[0][0] > 0) return;
const p = [
['handshake','#6D28D9','Community Welfare','Supporting families across the community with essential welfare services.',0],
['briefcase','#7C3AED','Jobs & Career Support','Connecting qualified Arain youth with employment and professional growth opportunities.',1],
['school','#6D28D9','Arain Education Institutes','Establishing and supporting educational institutions for the Arain community.',2],
['award','#9333EA','Arain Heroes Recognition','Celebrating outstanding Arain individuals who inspire the community.',3],
['droplets','#A855F7','Flood Relief Activities','Providing immediate relief to flood-affected Arain families across Pakistan.',4],
['ring','#8B5CF6','Arain Marriage Bureau','Facilitating matrimonial connections within the Arain community.',5],
['building','#5B21B6','Arain Community Centers','Building dedicated community centers for cultural and educational activities.',6],
['womanDesk','#7C3AED',"Women's Business Support",'Empowering Arain women entrepreneurs with resources and training.',7],
];
const s = _db.prepare('INSERT INTO programs (icon_name,color,title,desc,sort_order) VALUES (?,?,?,?,?)');
p.forEach(r => s.run(r));
s.free();
}
function seedLeaders() {
if (_db.exec('SELECT COUNT(*) FROM leaders')[0].values[0][0] > 0) return;
const l = [
['SM','Saba Mumtaz Bano','Chairperson (Global)','saba@arainworldcouncil.org',0,0],
['AC','Dr. Aitzaz Chaudhary','Global Chairman','chairman@arainworldcouncil.org',1,1],
['AS','Asim Chaudhary','President (Global)','asim@arainworldcouncil.org',0,2],
];
const s = _db.prepare('INSERT INTO leaders (initials,name,role,email,featured,sort_order) VALUES (?,?,?,?,?,?)');
l.forEach(r => s.run(r));
s.free();
}
function seedEvents() {
if (_db.exec('SELECT COUNT(*) FROM events')[0].values[0][0] > 0) return;
const e = [
['02','Jan','Business','Strategically Build Your Business','Jan 2, 2025 @ 15:00 – 19:00','Bannu, KPK, Pakistan',0],
['19','Apr','Community','ARAAIN BANNU Annual Gathering 2025','Apr 19, 2025 @ 09:30 – 13:00','Bannu Sports Complex',1],
['10','Dec','Youth','Youth Leadership Summit 2025','Dec 10, 2025 @ 10:00 – 16:00','Bannu Press Club',2],
];
const s = _db.prepare('INSERT INTO events (day,month,tag,title,time_str,place,sort_order) VALUES (?,?,?,?,?,?,?)');
e.forEach(r => s.run(r));
s.free();
}
function seedPages() {
if (_db.exec('SELECT COUNT(*) FROM pages')[0].values[0][0] > 0) return;
const p = [
['blog','Our Blog','ARAAIN BANNU Blog','Welcome to the ARAAIN BANNU Blog. Stay updated with the latest news, stories, and announcements from the ARAAIN BANNU community.',1,0],
['history','Our History','ARAAIN BANNU History','The ARAAIN BANNU was founded with a vision to unite Arains globally. From humble beginnings, ARAAIN BANNU has grown into a worldwide movement for community empowerment and development.',1,1],
['documentation','Documentation','ARAAIN BANNU Documentation','Official documents, policies, and guidelines of the ARAAIN BANNU. All resources are available for members and the public.',1,2],
['environmental','Environmental','ARAAIN BANNU Environmental Initiatives','ARAAIN BANNU is committed to environmental protection and sustainability. We promote tree planting, clean water initiatives, and eco-friendly community programs.',1,3],
['gallery_page','Town Gallery','ARAAIN BANNU Gallery','Explore photos and memories from ARAAIN BANNU events, community gatherings, and milestones across cities and countries.',1,4],
['department','Department','ARAAIN BANNU Departments','ARAAIN BANNU operates through multiple departments including Education, Welfare, Youth Affairs, Women Empowerment, and International Relations.',1,5],
];
const s = _db.prepare('INSERT INTO pages (slug,label,title,body,published,sort_order) VALUES (?,?,?,?,?,?)');
p.forEach(r => s.run(r));
s.free();
}
export async function initDB() {
if (_db) return _db;
_SQL = await new Promise((res, rej) => {
const sc = document.createElement('script');
sc.src = 'js/sql-wasm.js?v=1787053330';
sc.onload = () => initSqlJs({
  locateFile: () => 'js/sql-wasm.wasm',
  // Compile the WASM module directly from an ArrayBuffer instead of
  // relying on WebAssembly.instantiateStreaming(), which requires the
  // server to send "Content-Type: application/wasm" exactly. Some static
  // hosts (file://, misconfigured CDNs, GitHub Pages, etc.) don't send
  // that header, which makes streaming compilation fail — sql.js then
  // falls back to this same ArrayBuffer method anyway, just with an
  // extra failed network attempt and a console warning first. Doing it
  // this way from the start skips the failed attempt and the warning,
  // with no real performance cost for a WASM module this size.
  instantiateWasm: (imports, successCallback) => {
    fetch('js/sql-wasm.wasm', { credentials: 'same-origin' })
      .then(response => response.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, imports))
      .then(result => successCallback(result.instance, result.module))
      .catch(rej);
    return {}; // tells Emscripten async instantiation is in progress
  },
}).then(res).catch(rej);
sc.onerror = rej;
document.head.appendChild(sc);
});
const saved = await idbLoad();
_db = saved ? new _SQL.Database(saved) : new _SQL.Database();
createSchema();
seedSettings();
seedPrograms();
seedLeaders();
seedEvents();
seedPages();
await persist();
return _db;
}
export function getAllSettings() {
const r = _db.exec('SELECT key,value FROM settings');
const o = {};
(r[0]?.values || []).forEach(([k, v]) => { o[k] = v; });
return o;
}
export function getSetting(key) {
const r = _db.exec('SELECT value FROM settings WHERE key=?', [key]);
return r[0]?.values[0]?.[0] ?? '';
}
export async function setSettings(obj) {
const s = _db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
for (const [k, v] of Object.entries(obj)) s.run([k, String(v)]);
s.free();
await persist();
}
export function getPrograms() { return rows(_db.exec('SELECT * FROM programs ORDER BY sort_order')); }
export async function upsertProgram(p) {
if (p.id) {
_db.run('UPDATE programs SET icon_name=?,color=?,title=?,desc=?,sort_order=? WHERE id=?', [p.icon_name, p.color, p.title, p.desc, p.sort_order || 0, p.id]);
} else {
_db.run('INSERT INTO programs (icon_name,color,title,desc,sort_order) VALUES (?,?,?,?,?)', [p.icon_name || 'handshake', p.color || '#6D28D9', p.title || '', p.desc || '', p.sort_order || 0]);
}
await persist();
}
export async function deleteProgram(id) { _db.run('DELETE FROM programs WHERE id=?', [id]); await persist(); }
export function getLeaders() { return rows(_db.exec('SELECT * FROM leaders ORDER BY sort_order')); }
export async function upsertLeader(l) {
if (l.id) {
_db.run('UPDATE leaders SET initials=?,name=?,role=?,email=?,featured=?,photo_data=?,sort_order=? WHERE id=?', [l.initials, l.name, l.role, l.email || '', l.featured ? 1 : 0, l.photo_data || '', l.sort_order || 0, l.id]);
} else {
_db.run('INSERT INTO leaders (initials,name,role,email,featured,photo_data,sort_order) VALUES (?,?,?,?,?,?,?)', [l.initials || '??', l.name || '', l.role || '', l.email || '', l.featured ? 1 : 0, l.photo_data || '', l.sort_order || 0]);
}
await persist();
}
export async function deleteLeader(id) { _db.run('DELETE FROM leaders WHERE id=?', [id]); await persist(); }
export function getEvents() { return rows(_db.exec('SELECT * FROM events ORDER BY sort_order')); }
export async function upsertEvent(ev) {
if (ev.id) {
_db.run('UPDATE events SET day=?,month=?,tag=?,title=?,time_str=?,place=?,sort_order=? WHERE id=?', [ev.day, ev.month, ev.tag || 'Event', ev.title || '', ev.time_str || '', ev.place || '', ev.sort_order || 0, ev.id]);
} else {
_db.run('INSERT INTO events (day,month,tag,title,time_str,place,sort_order) VALUES (?,?,?,?,?,?,?)', [ev.day || '01', ev.month || 'Jan', ev.tag || 'Event', ev.title || '', ev.time_str || '', ev.place || '', ev.sort_order || 0]);
}
await persist();
}
export async function deleteEvent(id) { _db.run('DELETE FROM events WHERE id=?', [id]); await persist(); }
export function getPages() { return rows(_db.exec('SELECT * FROM pages ORDER BY sort_order')); }
export function getPage(slug) {
const r = rows(_db.exec('SELECT * FROM pages WHERE slug=?', [slug]));
return r[0] || null;
}
export async function upsertPage(p) {
if (p.id) {
_db.run('UPDATE pages SET label=?,title=?,body=?,published=?,sort_order=? WHERE id=?', [p.label, p.title || '', p.body || '', p.published ? 1 : 0, p.sort_order || 0, p.id]);
} else {
_db.run('INSERT INTO pages (slug,label,title,body,published,sort_order) VALUES (?,?,?,?,?,?)', [p.slug, p.label, p.title || '', p.body || '', p.published ? 1 : 0, p.sort_order || 0]);
}
await persist();
}
export function getGallery() { return rows(_db.exec('SELECT * FROM gallery ORDER BY sort_order')); }
export async function addGalleryItem(item) {
_db.run('INSERT INTO gallery (data_url,caption,sort_order) VALUES (?,?,?)', [item.data_url, item.caption || '', item.sort_order || 0]);
await persist();
}
export async function deleteGalleryItem(id) { _db.run('DELETE FROM gallery WHERE id=?', [id]); await persist(); }
export async function updateGalleryCaption(id, caption) { _db.run('UPDATE gallery SET caption=? WHERE id=?', [caption, id]); await persist(); }
export async function addSubmission(d) {
_db.run('INSERT INTO submissions (full_name,father_name,gender,member_type,cnic,dob,email,whatsapp,residential,affiliated,education,work,reason,street,city,state,country,photo_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
[d.fullName || '', d.fatherName || '', d.gender || '', d.membershipType || '', d.cnic || '', d.dob || '', d.email || '', d.whatsapp || '', d.residentialStatus || '', d.affiliated || '', d.education || '', d.work || '', d.reason || '', d.street || '', d.city || '', d.state || '', d.country || '', d.photoData || '']);
await persist();
}
export function getSubmissions(filter) {
let sql = 'SELECT * FROM submissions';
const args = [];
if (filter) {
sql += ' WHERE full_name LIKE ? OR email LIKE ? OR city LIKE ? OR member_type LIKE ?';
const f = '%' + filter + '%';
args.push(f, f, f, f);
}
return rows(_db.exec(sql + ' ORDER BY id DESC', args));
}
export async function updateSubmissionStatus(id, status) { _db.run('UPDATE submissions SET status=? WHERE id=?', [status, id]); await persist(); }
export async function deleteSubmission(id) { _db.run('DELETE FROM submissions WHERE id=?', [id]); await persist(); }
export function countSubmissions() { return _db.exec('SELECT COUNT(*) FROM submissions')[0].values[0][0]; }
export function countNew() { return _db.exec("SELECT COUNT(*) FROM submissions WHERE status='new'")[0].values[0][0]; }
export async function addMessage(d) {
_db.run('INSERT INTO messages (name,email,subject,message) VALUES (?,?,?,?)', [d.name || '', d.email || '', d.subject || '', d.message || '']);
await persist();
}
export function getMessages() { return rows(_db.exec('SELECT * FROM messages ORDER BY id DESC')); }

export async function addDonation(d) {
_db.run('INSERT INTO donations (donor_name,phone,email,amount,method,tx_id,note,photo_data) VALUES (?,?,?,?,?,?,?,?)',
[d.donorName || '', d.phone || '', d.email || '', d.amount || '', d.method || '', d.txId || '', d.note || '', d.photoData || '']);
await persist();
}
export function getDonations() { return rows(_db.exec('SELECT * FROM donations ORDER BY id DESC')); }
export async function updateDonationStatus(id, status) {
_db.run('UPDATE donations SET status=? WHERE id=?', [status, id]);
await persist();
}
export async function deleteDonation(id) {
_db.run('DELETE FROM donations WHERE id=?', [id]);
await persist();
}
export function countDonations() { return _db.exec('SELECT COUNT(*) FROM donations')[0]?.values[0][0] || 0; }
export function countUnverified() { return _db.exec("SELECT COUNT(*) FROM donations WHERE status='unverified'")[0]?.values[0][0] || 0; }
export function exportBlob() { return new Blob([_db.export()], { type: 'application/octet-stream' }); }
export async function resetDB() {
['programs','leaders','events','pages','gallery','submissions','messages','settings'].forEach(t => _db.run('DROP TABLE IF EXISTS ' + t));
createSchema();
seedSettings();
seedPrograms();
seedLeaders();
seedEvents();
seedPages();
await persist();
}
