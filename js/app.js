// ================================================================
//  js/app.js  —  ARAAIN BANNU Frontend Engine  (v3 — full dynamic render)
//  All content comes from Firestore (cloud) first.
//  Falls back to local SQLite seed if offline.
//  Live onSnapshot keeps index.html updated without refresh.
// ================================================================
import { initDB, getAllSettings, getPrograms, getLeaders, getEvents,
         getPages, getPage, getGallery, addSubmission, addMessage, addDonation }
  from './db.js?v=1788154543';
import { saveRegistrationToCloud, saveDonationToCloud } from './firebase.js?v=1788154543';
import { fetchAllSiteContent, subscribeToSiteContent } from './cloud.js?v=1788154543';
import { initTranslations, prefetchAllTranslations, translateAll } from './translate.js?v=1788154543';
import { t, EN } from './lang.js?v=1788154543';
import { iconHTML } from './icons.js?v=1788154543';

// ── State ─────────────────────────────────────────────────────
let S    = {};   // flat settings object
let lang = localStorage.getItem('araain_bannu_lang') || 'ur';
let _ro;         // IntersectionObserver for .reveal

// Cloud content — null means "not yet loaded from Firestore"
let _cPrograms = null;
let _cLeaders  = null;
let _cEvents   = null;
let _cPages    = null;
let _cGallery  = null;

// ── Data getters — cloud wins, SQLite is offline fallback ─────
const data = {
  programs: () => _cPrograms !== null ? _cPrograms : getPrograms(),
  leaders:  () => _cLeaders  !== null ? _cLeaders  : getLeaders(),
  events:   () => _cEvents   !== null ? _cEvents   : getEvents(),
  pages:    () => _cPages    !== null ? _cPages    : getPages(),
  gallery:  () => _cGallery  !== null ? _cGallery  : getGallery(),
};

// ── DOM helpers ───────────────────────────────────────────────
const g   = id  => document.getElementById(id);
const qs  = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);
const esc = s   => String(s||'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const set = (id, text) => { const el = g(id); if (el) el.textContent = text; };
const setHTML = (id, html) => { const el = g(id); if (el) el.innerHTML = html; };

// tv(key) — translatable value with cloud override support.
// Priority order:
//   1. S[key]   — admin-set cloud value (works for both languages)
//   2. UR[key]  — Urdu dict (when lang=ur)
//   3. EN[key]  — English dict fallback
// Cloud values (S[key]) are set by the admin in the dashboard.
// When lang=ur and no S[key] is set, UR[key] provides the Urdu default.
const tv = key => {
  if (S[key]) return S[key];        // cloud admin override always wins
  if (lang === 'ur') return t(key, 'ur') || EN[key] || '';
  return EN[key] || '';
};

// ── Boot ──────────────────────────────────────────────────────
// Wrapped in try/finally so loaderShow(false) ALWAYS runs, no matter
// what throws inside — the splash screen can never get stuck forever.
async function boot() {
  loaderShow(true);

  try {
    // 1. Init local SQLite
    await initDB().catch(console.error);

    // 2. Load translation cache from localStorage (instant — no network needed)
    const cacheReady = initTranslations();

    // 3. Show translation progress overlay for Urdu cold start
    if (lang === 'ur' && !cacheReady) {
      _showTransProgress(0, 1);
    }

    // 4. Fetch Firestore content
    try {
      const cloud = await fetchAllSiteContent();
      applyCloudPatch(cloud);
    } catch (err) {
      console.warn('[ARAAIN BANNU] Firestore unavailable, using local seed:', err.message);
      S = getAllSettings();
    }

    // 5. Urdu cold start: fetch & cache all UI translations before first render.
    //    HARD CAPPED at 12 seconds total — if translation APIs are slow,
    //    blocked, or unreachable, we stop waiting and render with whatever
    //    got cached so far (English fallback for the rest). Translation
    //    continues silently in the background via translateAdminContent()
    //    on subsequent renders, so nothing is ever permanently stuck.
    if (lang === 'ur' && !cacheReady) {
      const MAX_WAIT_MS = 12000;
      let timedOut = false;
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => { timedOut = true; resolve(); }, MAX_WAIT_MS);
      });
      await Promise.race([
        prefetchAllTranslations((done, total) => {
          if (!timedOut) _showTransProgress(done, total);
        }),
        timeoutPromise,
      ]).catch(err => console.warn('[ARAAIN BANNU] Translation prefetch error:', err.message));
      _hideTransProgress();
    }
  } catch (err) {
    // Should be unreachable given the inner guards above, but this is the
    // final safety net — the page must always become visible and usable.
    console.error('[ARAAIN BANNU] Boot error (recovering):', err);
    if (!S || !Object.keys(S).length) S = getAllSettings();
  } finally {
    // GUARANTEED to run — the splash screen is always dismissed.
    loaderShow(false);
    _hideTransProgress();
  }

  renderAll();
  bindNav();
  bindModals();
  bindForms();
  bindBackTop();
  bindDonationTabs();
  bindCopyBtns();
  bindHeroCards();
  initCounters();
  observeReveal();

  // 6. Live Firestore subscription — re-render on admin saves
  subscribeToSiteContent(patch => {
    applyCloudPatch(patch);
    renderAll();
    bindCopyBtns();
    initCounters();
    observeReveal();
  });
}

// ── Translation progress overlay ──────────────────────────────
// Shown only on the very first Urdu page load on a new device.
// After prefetch completes, all translations live in localStorage
// and this overlay never appears again.
function _showTransProgress(done, total) {
  let ov = g('_transOv');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_transOv';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:10000;background:var(--bg);' +
      'display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:20px;font-family:var(--font-en);' +
      'padding:24px;text-align:center;';
    ov.innerHTML =
      '<div style="width:52px;height:52px;border:3px solid rgba(109,40,217,.2);' +
      'border-top-color:var(--purple);border-radius:50%;' +
      'animation:spin .75s linear infinite"></div>' +
      '<div>' +
        '<p style="color:var(--text);font-size:17px;font-weight:700;margin-bottom:6px">' +
          'ترجمہ ہو رہا ہے…' +
        '</p>' +
        '<p style="color:var(--text-muted);font-size:13px">' +
          'Setting up Urdu — one-time download' +
        '</p>' +
      '</div>' +
      '<div style="width:min(280px,80vw);background:var(--bg-card2);' +
      'border-radius:30px;height:8px;overflow:hidden">' +
        '<div id="_transBar" style="height:100%;width:0%;border-radius:30px;' +
        'background:linear-gradient(90deg,var(--purple),var(--purple-lt));' +
        'transition:width .25s ease"></div>' +
      '</div>' +
      '<p id="_transLbl" style="color:var(--text-muted);font-size:12px"></p>';
    document.body.appendChild(ov);
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = g('_transBar');
  const lbl = g('_transLbl');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = done + ' / ' + total + ' strings';
}

function _hideTransProgress() {
  const ov = g('_transOv');
  if (!ov) return;
  ov.style.transition = 'opacity .4s ease';
  ov.style.opacity = '0';
  setTimeout(() => ov.remove(), 450);
}


// Apply a cloud patch object — only overwrite keys that arrived non-null
function applyCloudPatch(patch) {
  if (patch.settings) S = { ...getAllSettings(), ...patch.settings };
  if (patch.programs !== null && patch.programs !== undefined) _cPrograms = patch.programs;
  if (patch.leaders  !== null && patch.leaders  !== undefined) _cLeaders  = patch.leaders;
  if (patch.events   !== null && patch.events   !== undefined) _cEvents   = patch.events;
  if (patch.pages    !== null && patch.pages    !== undefined) _cPages    = patch.pages;
  if (patch.gallery  !== null && patch.gallery  !== undefined) _cGallery  = patch.gallery;

  // Sync page <title> to org name
  const titleEl = g('pageTitle');
  if (titleEl && S.siteName) {
    titleEl.textContent = (S.siteName || 'ARAAIN BANNU')
      + (S.siteSubName ? ' — ' + S.siteSubName : '');
  }
}

function loaderShow(on) {
  const el = g('awc-loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}

// ── Direction ─────────────────────────────────────────────────
function applyDir() {
  const isUr = lang === 'ur';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', isUr ? 'rtl' : 'ltr');
  document.body.classList.toggle('urdu', isUr);
}

// ── Async Urdu translation of admin-entered content ───────────
// Runs AFTER renderAll() has already shown the page (instant render).
// Replaces any English S[key] content with API-translated Urdu,
// only when lang=ur and the content looks like English.
async function translateAdminContent() {
  if (lang !== 'ur') return;

  // Map of DOM element ID → current S[key] value that may be English
  // Only include elements where the admin might have typed English text
  const contentMap = {
    'heroTitle':         S.heroTitle        || '',
    'heroSub':           S.heroSub          || '',
    'heroTagline':       S.heroTagline      || '',
    'heroBadge':         S.heroBadge        || '',
    'about-h2':          S.aboutTitle       || '',
    'about-h3':          S.aboutSubtitle    || '',
    'about-p1':          S.aboutP1          || '',
    'about-p2':          S.aboutP2          || '',
    'about-p3':          S.aboutP3          || '',
    'chairman-quote':    S.chairmanQuote    || '',
    'chairman-name':     S.chairmanName     || '',
    'programsTitle':     S.programsTitle    || '',
    'programsDesc':      S.programsDesc     || '',
    'leadershipTitle':   S.leadershipTitle  || '',
    'eventsTitle':       S.eventsTitle      || '',
    'galleryTitle':      S.galleryTitle     || '',
    'galleryDesc':       S.galleryDesc      || '',
    'ctaMemberTitle':    S.membershipTitle  || '',
    'ctaMemberDesc':     S.membershipDesc   || '',
    'ctaDonateTitle':    S.donateTitle      || '',
    'ctaDonateDesc':     S.donateDesc       || '',
    'footerDesc':        S.footerDesc       || '',
    'footerCopy':        S.footerCopy       || '',
    'contactAddress':    S.contactAddress   || '',
    'contactHours':      S.contactHours     || '',
    'footerContactAddress': S.contactAddress || '',
    'footerSiteName':    S.siteName         || '',
    'footerSubName':     S.siteSubName      || '',
  };

  // Filter: only translate non-empty values that are actually English
  const toTranslate = {};
  const isUrduText = t => /[\u0600-\u06FF]/.test(t);
  for (const [id, text] of Object.entries(contentMap)) {
    if (text && !isUrduText(text)) toTranslate[id] = text;
  }
  if (!Object.keys(toTranslate).length) return;

  // Batch-translate all in parallel (MyMemory API)
  try {
    const translated = await translateAll(toTranslate);
    for (const [id, urdu] of Object.entries(translated)) {
      const el = g(id);
      if (el && urdu && urdu !== toTranslate[id]) el.textContent = urdu;
    }

    // Also translate program card titles/descriptions
    const progCards = document.querySelectorAll('.prog-card');
    for (const card of progCards) {
      const h3 = card.querySelector('h3');
      const p  = card.querySelector('p');
      if (h3 && h3.textContent) {
        const urduH3 = await translateAll({ t: h3.textContent });
        if (urduH3.t !== h3.textContent) h3.textContent = urduH3.t;
      }
      if (p && p.textContent) {
        const urduP = await translateAll({ t: p.textContent });
        if (urduP.t !== p.textContent) p.textContent = urduP.t;
      }
    }

    // Translate event titles
    for (const h4 of document.querySelectorAll('.event-body h4')) {
      if (h4.textContent) {
        const r = await translateAll({ t: h4.textContent });
        if (r.t !== h4.textContent) h4.textContent = r.t;
      }
    }
  } catch (err) {
    console.warn('[ARAAIN BANNU] Content translation failed:', err.message);
  }
}

// ── Master render ─────────────────────────────────────────────
function renderAll() {
  applyDir();
  renderHeader();
  renderHero();
  renderAbout();
  renderPrograms();
  renderLeaders();
  renderEvents();
  renderCTA();
  renderGallery();
  renderContact();
  renderFooter();
  renderPageLinks();
  renderDonationModal();
  rebuildMembershipForm();
  set('langBtn', t('langToggleLabel', lang));
  // Post-render: auto-translate any English admin-set content to Urdu
  // Runs async so initial render is instant, Urdu replaces in ~1-2s
  translateAdminContent().catch(console.warn);
}

// ── Header ────────────────────────────────────────────────────
function renderHeader() {
  const logo = g('headerLogo');
  if (logo) {
    logo.innerHTML = S.logoData
      ? `<img src="${esc(S.logoData)}" alt="logo"
           style="height:52px;width:52px;object-fit:cover;border-radius:12px"/>`
      : `<div class="logo-icon">${esc(tv('siteName')).substring(0,5)||'ARAAIN'}</div>`;
  }
  set('headerSiteName', tv('siteName'));
  set('headerTagline',  tv('siteTagline'));
  set('headerSubName',  tv('siteSubName') || t('siteSubName', lang));

  // Nav labels
  const navMap = {
    '.nav-link-home':       'navHome',
    '.nav-link-about':      'navAbout',
    '.nav-link-programs':   'navPrograms',
    '.nav-link-leadership': 'navLeadership',
    '.nav-link-events':     'navEvents',
    '.nav-link-gallery':    'navGallery',
    '.nav-link-contact':    'navContact',
    '.nav-cta-mem':         'navMembership',
  };
  Object.entries(navMap).forEach(([sel, key]) => {
    qsa(sel).forEach(el => { el.textContent = t(key, lang); });
  });
}

// ── Hero ──────────────────────────────────────────────────────
function renderHero() {
  set('heroBadge',      tv('heroBadge')   || t('heroBadge', lang));
  set('heroTitle',      tv('heroTitle')   || t('heroTitle', lang));
  set('heroBannuLabel', tv('siteSubName') || t('siteSubName', lang));
  set('heroSub',        tv('heroSub')     || t('heroSub', lang));
  set('heroTagline',    tv('heroTagline') || t('heroTagline', lang));

  const ab = qs('.hero-btns .btn-primary');
  if (ab) ab.textContent = t('heroAboutBtn', lang);
  const eb = qs('.hero-btns .btn-outline');
  if (eb) eb.textContent = t('heroEventsBtn', lang);

  const hcKeys = ['heroDept','heroEvents','heroGallery','heroGuide'];
  qsa('.hero-card').forEach((card, i) => {
    const sp = card.querySelector('span:last-child');
    if (sp && hcKeys[i]) sp.textContent = t(hcKeys[i], lang);
  });
}

// ── About ─────────────────────────────────────────────────────
function renderAbout() {
  set('section-label-about', t('aboutLabel', lang));
  set('about-h2',     tv('aboutTitle')    || t('aboutTitle', lang));
  set('about-h3',     tv('aboutSubtitle') || t('aboutSubtitle', lang));
  set('about-p1',     tv('aboutP1')       || t('aboutP1', lang));
  set('about-p2',     tv('aboutP2')       || t('aboutP2', lang));
  set('about-p3',     tv('aboutP3')       || t('aboutP3', lang));
  set('chairman-name',  tv('chairmanName')  || t('chairmanName', lang));
  set('chairman-quote', tv('chairmanQuote') || t('chairmanQuote', lang));
  set('chairmanBadge',  t('chairmanBadge', lang));
  set('joinBtn',        t('joinBtn', lang));
  set('statMembersLabel',  t('statMembersLabel', lang));
  set('statProgramsLabel', t('statProgramsLabel', lang));
  set('statCitiesLabel',   t('statCitiesLabel', lang));

  const mn = g('statMembersNum');  if (mn) mn.dataset.val = S.statMembers  || '500+';
  const pn = g('statProgramsNum'); if (pn) pn.dataset.val = S.statPrograms || '8';
  const cn = g('statCitiesNum');   if (cn) cn.dataset.val = S.statCities   || '30+';
}

// ── Programs ──────────────────────────────────────────────────
function renderPrograms() {
  const grid = g('programsGrid');
  if (!grid) return;
  set('programsSectionLabel', t('programsLabel', lang));
  set('programsTitle', tv('programsTitle') || t('programsTitle', lang));
  set('programsDesc',  tv('programsDesc')  || t('programsDesc', lang));
  const progs = data.programs();
  if (!progs.length) {
    grid.innerHTML = `<p class="empty-state">${t('noPrograms', lang)}</p>`;
    return;
  }
  grid.innerHTML = progs.map(p => `
<div class="prog-card reveal" style="--c:${esc(p.color)}">
  <div class="prog-icon">${iconHTML(p.icon_name || 'handshake','icon-prog')}</div>
  <h3>${esc(p.title)}</h3>
  <p>${esc(p.desc)}</p>
</div>`).join('');
  observeReveal();
  addProgTilt();
}

// ── Leaders ───────────────────────────────────────────────────
function renderLeaders() {
  const grid = g('leadershipGrid');
  if (!grid) return;
  set('leadershipSectionLabel', t('teamLabel', lang));
  set('leadershipTitle', tv('leadershipTitle') || t('leadershipTitle', lang));
  const leaders = data.leaders();
  if (!leaders.length) {
    grid.innerHTML = `<p class="empty-state">${t('noLeaders', lang)}</p>`;
    return;
  }
  grid.innerHTML = leaders.map(l => {
    const avatar = l.photo_data
      ? `<img src="${esc(l.photo_data)}" alt="${esc(l.name)}" class="leader-photo"/>`
      : `<span class="leader-initials">${esc(l.initials)}</span>`;
    return `
<div class="leader-card reveal${l.featured ? ' featured' : ''}">
  <div class="leader-avatar">${avatar}</div>
  <div class="leader-info">
    <h4>${esc(l.name)}</h4>
    <span class="leader-role">${esc(l.role)}</span>
    <a class="leader-email" href="mailto:${esc(l.email)}">${esc(l.email)}</a>
  </div>
</div>`;
  }).join('');
  const saw = g('seeAllWrap');
  if (saw) { const a = saw.querySelector('a,button'); if (a) a.textContent = t('seeAllMembers', lang); }
  observeReveal();
}

// ── Events ────────────────────────────────────────────────────
function renderEvents() {
  const list = g('eventsList');
  if (!list) return;
  set('eventsSectionLabel', t('upcomingLabel', lang));
  set('eventsTitle', tv('eventsTitle') || t('eventsTitle', lang));
  const evs = data.events();
  if (!evs.length) {
    list.innerHTML = `<p class="empty-state">${t('noEvents', lang)}</p>`;
    return;
  }
  list.innerHTML = evs.map(ev => `
<div class="event-card reveal">
  <div class="event-date">
    <span class="event-day">${esc(ev.day)}</span>
    <span class="event-month">${esc(ev.month)}</span>
  </div>
  <div class="event-body">
    <span class="event-tag">${esc(ev.tag)}</span>
    <h4>${esc(ev.title)}</h4>
    <div class="event-meta">
      <span>${iconHTML('clock','icon-xs')} ${esc(ev.time_str)}</span>
      <span>${iconHTML('mapPin','icon-xs')} ${esc(ev.place)}</span>
    </div>
    <button class="btn-sm open-membership">${t('registerNow', lang)}</button>
  </div>
</div>`).join('');
  observeReveal();
}

// ── CTA ───────────────────────────────────────────────────────
function renderCTA() {
  set('ctaMemberTitle',  tv('membershipTitle') || t('membershipTitle', lang));
  set('ctaMemberDesc',   tv('membershipDesc')  || t('membershipDesc', lang));
  set('ctaDonateTitle',  tv('donateTitle')     || t('donateTitle', lang));
  set('ctaDonateDesc',   tv('donateDesc')      || t('donateDesc', lang));
  set('ctaRegisterBtn',  t('registerNow', lang));
  set('ctaDonateBtn',    t('donateNow', lang));
}

// ── Gallery ───────────────────────────────────────────────────
function renderGallery() {
  set('gallerySectionLabel', t('galleryLabel', lang));
  set('galleryTitle', tv('galleryTitle') || t('galleryTitle', lang));
  set('galleryDesc',  tv('galleryDesc')  || t('galleryDesc', lang));
  const grid = g('galleryGrid');
  if (!grid) return;
  const items = data.gallery();
  if (!items.length) {
    grid.innerHTML = `<p class="empty-state">${t('galleryEmpty', lang)}</p>`;
    return;
  }
  grid.innerHTML = items.map(item => `
<div class="gallery-item reveal"
     onclick="openLightbox('${esc(item.data_url)}','${esc(item.caption)}')">
  <img src="${esc(item.data_url)}" alt="${esc(item.caption)}" loading="lazy"/>
  ${item.caption ? `<div class="gallery-caption">${esc(item.caption)}</div>` : ''}
</div>`).join('');
  observeReveal();
}
window.openLightbox = (src, caption) => {
  const lb = g('lightbox');
  if (!lb) return;
  g('lightboxImg').src = src;
  g('lightboxCaption').textContent = caption || '';
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
};

// ── Contact ───────────────────────────────────────────────────
function renderContact() {
  set('contactSectionLabel', t('touchLabel', lang));
  set('contactHeading',      t('contactUs', lang));
  set('addressLabel',        t('addressLabel', lang));
  set('hoursLabel',          t('hoursLabel', lang));
  set('phoneLabel',          t('phoneLabel', lang));
  set('emailLabel',          t('emailLabel', lang));
  // Contact details: use cloud S[key] if admin has set them,
  // otherwise fall back to the correct language dict default
  const cAddr  = S.contactAddress || t(lang==='ur' ? 'contactAddressDefault' : 'contactAddressDefault', lang);
  const cHours = S.contactHours   || t('contactHoursDefault', lang);
  set('contactAddress', cAddr);
  set('contactHours',   cHours);

  const cp = g('contactPhone');
  if (cp) {
    const phone = S.contactPhone || t('contactPhoneDefault', lang);
    cp.textContent = phone;
    cp.href = 'https://wa.me/' + (phone||'').replace(/\D/g,'');
  }
  const ce = g('contactEmail');
  if (ce) {
    const email = S.contactEmail || t('contactEmailDefault', lang);
    ce.textContent = email;
    ce.href = 'mailto:' + email;
  }
  const sb = qs('#contactForm [type=submit]');
  if (sb) sb.textContent = t('sendMessage', lang);

  [['cfName','formName'],['cfEmail','formEmail'],
   ['cfSubject','formSubject'],['cfMessage','formMessage']].forEach(([fid, tk]) => {
    const lbl = qs(`label[for=${fid}]`);
    if (lbl) lbl.textContent = t(tk, lang);
  });
  [['cfName','phName'],['cfEmail','phEmail'],
   ['cfSubject','phSubject'],['cfMessage','phMessage']].forEach(([fid, tk]) => {
    const el = g(fid); if (el) el.placeholder = t(tk, lang);
  });
}

// ── Footer ────────────────────────────────────────────────────
function renderFooter() {
  // Logo abbreviation in footer: first 3 chars of org name
  const abbr = (tv('siteName') || 'ARAAIN BANNU').substring(0,2).toUpperCase();
  const footerLogoIcon = qs('.site-footer .logo-icon');
  if (footerLogoIcon && !S.logoData) footerLogoIcon.textContent = abbr;

  set('footerSiteName', tv('siteName') || t('siteName', lang));
  set('footerSubName',  tv('siteSubName') || t('siteSubName', lang));
  set('footerDesc',     tv('footerDesc')  || t('footerDesc', lang));
  set('footerSubTagline', tv('siteSubTagline'));
  set('footerCopy',     tv('footerCopy')  || t('footerCopy', lang));
  set('footerUsefulLinks', t('usefulLinks', lang));
  set('footerRecentNews',  t('recentNews', lang));
  set('footerContactUs',   t('contactUsFooter', lang));
  set('footerContactAddress', S.contactAddress || t('contactAddressDefault', lang));

  const fcp = g('footerContactPhone');
  if (fcp) {
    const fPhone = S.contactPhone || t('contactPhoneDefault', lang);
    fcp.textContent = fPhone;
    fcp.href = 'https://wa.me/' + (fPhone||'').replace(/\D/g,'');
  }

  // Footer news — pull from events if available
  const evs = data.events().slice(0, 2);
  const fnews = qs('.footer-news');
  if (fnews && evs.length) {
    fnews.innerHTML = evs.map(ev => `
<a href="#events">
  <span>${esc(ev.title)}</span>
  <small>${esc(ev.month)} ${esc(ev.day)}</small>
</a>`).join('');
  }
}

// ── Page links (footer) ───────────────────────────────────────
function renderPageLinks() {
  const ul = g('footerPageLinks');
  if (!ul) return;
  const slugLabelMap = {
    blog:'pageLabBlog', history:'pageLabHistory', documentation:'pageLabDocs',
    environmental:'pageLabEnv', gallery_page:'pageLabGallery', department:'pageLabDept',
  };
  const pages = data.pages();
  ul.innerHTML = pages.filter(p => p.published).map(p => {
    const labelKey = slugLabelMap[p.slug] || '';
    const label = labelKey ? t(labelKey, lang) : (p.label || p.title);
    return `<li><a href="#" class="page-link" data-slug="${esc(p.slug)}">${esc(label)}</a></li>`;
  }).join('');
  ul.querySelectorAll('.page-link').forEach(a => {
    a.addEventListener('click', ev => {
      ev.preventDefault();
      openPageModal(a.dataset.slug);
    });
  });
}

function openPageModal(slug) {
  // Check cloud pages first, fall back to SQLite getPage()
  const cloudPage = data.pages().find(p => p.slug === slug);
  const pg = cloudPage || getPage(slug);
  if (!pg) return;
  const titleKeyMap = {
    blog:'pageTitleBlog', history:'pageTitleHistory', documentation:'pageTitleDocs',
    environmental:'pageTitleEnv', gallery_page:'pageTitleGallery', department:'pageTitleDept',
  };
  const bodyKeyMap = {
    blog:'pageBodyBlog', history:'pageBodyHistory', documentation:'pageBodyDocs',
    environmental:'pageBodyEnv', gallery_page:'pageBodyGallery', department:'pageBodyDept',
  };
  const tk = titleKeyMap[pg.slug];
  const bk = bodyKeyMap[pg.slug];
  const title = (tk ? t(tk, lang) : null) || pg.title;
  const body  = (bk ? t(bk, lang) : null) || pg.body;
  set('pageModalTitle', title);
  const bodyEl = g('pageModalBody');
  if (bodyEl) bodyEl.innerHTML = (body||'').replace(/\n/g,'<br>');
  openModal('pageModal');
}

// ── Donation modal ────────────────────────────────────────────
function renderDonationModal() {
  set('donModalTitle',  t('donateToAraainBannu', lang));
  set('donModalSub',    t('donSub', lang));
  set('donAmtLabel',    t('suggestedAmounts', lang));
  set('donCustomLabel', t('custom', lang));

  const lblMap = {
    'bl-bankName':'bankName','bl-bankTitle':'accountTitle',
    'bl-bankAccount':'accountNo','bl-bankIBAN':'IBAN','bl-bankBranch':'branchCode',
    'bl-epNumber':'mobileNo','bl-jcNumber':'mobileNo',
    'bl-intSwift':'swiftBic','bl-intIBAN':'IBAN',
  };
  Object.entries(lblMap).forEach(([id, tk]) => {
    const el = g(id); if (el) el.textContent = t(tk, lang);
  });

  // Also update CNIC and WhatsApp labels in membership form
  const lCnic = g('lCnic'); if (lCnic) lCnic.textContent = t('fCnic', lang);
  const lWa   = g('lWhatsapp'); if (lWa) lWa.textContent = t('fWhatsapp', lang);

  const valMap = {
    'bv-bankName':'bankName', 'bv-bankTitle':'bankTitle',
    'bv-bankAccount':'bankAccount', 'bv-bankIBAN':'bankIBAN',
    'bv-bankBranch':'bankBranch', 'bv-epTitle':'epTitle',
    'bv-epNumber':'epNumber', 'bv-jcTitle':'jcTitle',
    'bv-jcNumber':'jcNumber', 'bv-intBank':'intBank',
    'bv-intSwift':'intSwift', 'bv-intIBAN':'intIBAN',
  };
  Object.entries(valMap).forEach(([id, sk]) => set(id, S[sk] || ''));

  set('bankNoteEl', t('bankNote', lang));
  set('epNoteEl',   t('easypaisaNote', lang));
  set('jcNoteEl',   t('jazzcashNote', lang));
  set('intNoteEl',  t('intNote', lang));

  const tabMap = {
    bank:'tabBank', easypaisa:'tabEasypaisa',
    jazzcash:'tabJazzcash', international:'tabInternational',
  };
  qsa('.bank-tab').forEach(tab => {
    const key = tabMap[tab.dataset.tab];
    if (key) {
      const icon = tab.querySelector('.svg-icon');
      tab.textContent = t(key, lang);
      if (icon) tab.insertBefore(icon, tab.firstChild);
    }
  });

  // Donation confirmation form labels
  set('donFormTitle',  t('donFormTitle', lang));
  set('donFormSub',    t('donFormSub',   lang));
  set('lDonorName',    t('donorName',    lang));
  set('lDonorPhone',   t('donorPhone',   lang));
  set('lDonorEmail',   t('donorEmail',   lang));
  set('lDonAmount',    t('donAmount',    lang));
  set('lDonMethod',    t('donMethod',    lang));
  set('lDonTxID',      t('donTxID',      lang));
  set('lDonNote',      t('donNote',      lang));
  set('lDonProof',     t('donProof',     lang));
  set('donSubmitBtn',  t('donSubmitBtn', lang));
  const dfTxId = g('dfTxId');
  if (dfTxId) dfTxId.placeholder = t('donTxIDPh', lang);
  const dfNote = g('dfNote');
  if (dfNote) dfNote.placeholder = t('donNotePh', lang);
}

// ── Membership form ───────────────────────────────────────────
function rebuildMembershipForm() {
  set('memAppTitle',        t('memAppTitle', lang));
  set('memAppSub',          t('memAppSub', lang));
  set('memInstrTitle',      t('memInstrTitle', lang));
  ['memInstr1','memInstr2','memInstr3','memInstr4','memInstr5']
    .forEach(k => set(k, t(k, lang)));
  set('memNote',            t('memNote', lang));
  set('memSecPersonal',     t('memPersonal', lang));
  set('memSecContact',      t('memContact', lang));
  set('memSecProfessional', t('memProfessional', lang));
  set('memSecAddress',      t('memAddress', lang));
  set('memTermsTitle',      t('memTermsTitle', lang));
  ['memTerm1','memTerm2','memTerm3'].forEach(k => set(k, t(k, lang)));
  set('memConsentLabel', t('memConsent', lang));
  set('memSubmitBtn',    t('submitApp', lang));

  const lblMap = {
    lFullName:'fFullName', lFatherName:'fFatherName', lGender:'fGender',
    lMemberType:'fMemberType', lCnic:'fCnic', lDob:'fDob',
    lEmail:'fEmailF', lWhatsapp:'fWhatsapp', lResidential:'fResidential',
    lAffiliated:'fAffiliated', lEducation:'fEducation', lWork:'fWork',
    lReason:'fReason', lPhoto:'fPhoto', lStreet:'fStreet',
    lCity:'fCity', lState:'fState', lCountry:'fCountry',
  };
  Object.entries(lblMap).forEach(([id, tk]) => set(id, t(tk, lang)));

  const phMap = {
    'input[name=fullName]':'phFullName', 'input[name=fatherName]':'phFatherName',
    'input[name=cnic]':'phCnic', 'input[name=whatsapp]':'phWhatsapp',
    'input[name=street]':'phStreet', 'input[name=city]':'phCity',
    'input[name=state]':'phState',
  };
  Object.entries(phMap).forEach(([sel, tk]) => {
    const el = qs(sel); if (el) el.placeholder = t(tk, lang);
  });
  const ta = qs('textarea[name=reason]');
  if (ta) ta.placeholder = t('phReason', lang);

  buildRadios('genderGroup','gender',
    [[t('gFemale',lang),'Female'],[t('gMale',lang),'Male'],[t('gOther',lang),'Other']]);
  buildRadios('memberTypeGroup','membershipType',
    [[t('mExec',lang),'Executive Member'],[t('mGeneral',lang),'General Member'],
     [t('mYouth',lang),'Youth Member'],[t('mAssoc',lang),'Associate Member']]);
  buildRadios('residentialGroup','residentialStatus',
    [[t('rResident',lang),'Resident Pakistani'],[t('rOverseas',lang),'Overseas Pakistani']]);
  buildRadios('affiliatedGroup','affiliated',
    [[t('yes',lang),'Yes'],[t('no',lang),'No']]);
  buildRadios('educationGroup','education',
    [[t('eMatric',lang),'Matric'],[t('eInter',lang),'Intermediate'],
     [t('eGrad',lang),'Graduate'],[t('ePG',lang),'Post Graduate'],
     [t('eOther',lang),'Other']]);
  buildRadios('workGroup','work',
    [[t('wStudent',lang),'Student'],[t('wJob',lang),'Job Holder'],
     [t('wGov',lang),'Government Employee'],[t('wBiz',lang),'Business Owner'],
     [t('wFree',lang),'Freelancer'],[t('eOther',lang),'Other']]);
  buildCountrySelect('countrySelect');
}

function buildRadios(containerId, name, options) {
  const cont = g(containerId);
  if (!cont) return;
  cont.innerHTML = options.map(([label, val]) => `
<label class="radio-pill">
  <input type="radio" name="${name}" value="${val}" required/>
  <span>${label}</span>
</label>`).join('');
}

function buildCountrySelect(id) {
  const sel = g(id);
  if (!sel) return;
  const countries = [
    ['Pakistan','cPakistan'],['United States of America','cUSA'],
    ['United Kingdom','cUK'],['Canada','cCanada'],['Australia','cAustralia'],
    ['United Arab Emirates','cUAE'],['Saudi Arabia','cSaudi'],
    ['Germany','cGermany'],['France','cFrance'],
    ['Netherlands','cNetherlands'],['Other','cOther'],
  ];
  sel.innerHTML = `<option value="">${t('selectOpt', lang)}</option>`
    + countries.map(([val, tk]) =>
        `<option value="${val}">${t(tk, lang)}</option>`).join('');
}

// ── Reveal animation ──────────────────────────────────────────
function observeReveal() {
  if (!_ro) {
    _ro = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          _ro.unobserve(en.target);
        }
      });
    }, { threshold: 0.1 });
  }
  qsa('.reveal:not(.is-visible)').forEach(el => _ro.observe(el));
}

// ── Counter animation ─────────────────────────────────────────
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el  = en.target;
      const raw = el.dataset.val || el.textContent.trim();
      el.dataset.val = raw;
      const plus = raw.includes('+');
      const num  = parseInt(raw.replace(/\D/g,''), 10);
      if (isNaN(num)) return;
      const t0 = performance.now(), dur = 1400;
      const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * num) + (plus ? '+' : '');
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      };
      requestAnimationFrame(step);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  qsa('.stat-num').forEach(el => obs.observe(el));
}

// ── Nav ───────────────────────────────────────────────────────
function bindNav() {
  const hbg = g('hamburger');
  const nav = g('mainNav');
  if (hbg && nav) {
    hbg.addEventListener('click', () => {
      const o = nav.classList.toggle('open');
      hbg.classList.toggle('open', o);
    });
    nav.querySelectorAll('a,button').forEach(el =>
      el.addEventListener('click', () => {
        nav.classList.remove('open');
        hbg.classList.remove('open');
      }));
    document.addEventListener('click', ev => {
      if (!hbg.contains(ev.target) && !nav.contains(ev.target)) {
        nav.classList.remove('open');
        hbg.classList.remove('open');
      }
    });
  }

  const sections = qsa('section[id]');
  const navAs    = qsa('.main-nav a[href^="#"]');
  window.addEventListener('scroll', () => {
    const sy = window.scrollY + 130;
    let cur = '';
    sections.forEach(s => { if (s.offsetTop <= sy) cur = s.id; });
    navAs.forEach(a =>
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }, { passive: true });

  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', ev => {
      const tgt = qs(a.getAttribute('href'));
      if (tgt) {
        ev.preventDefault();
        window.scrollTo({
          top: tgt.getBoundingClientRect().top + window.scrollY - 80,
          behavior: 'smooth',
        });
      }
    });
  });

  const lb = g('langBtn');
  if (lb) {
    lb.addEventListener('click', async () => {
      lang = lang === 'en' ? 'ur' : 'en';
      localStorage.setItem('araain_bannu_lang', lang);

      // If switching to Urdu and cache is cold, prefetch first —
      // hard-capped so the toggle button can never hang indefinitely.
      if (lang === 'ur') {
        try {
          const ready = initTranslations();
          if (!ready) {
            _showTransProgress(0, 1);
            const MAX_WAIT_MS = 12000;
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, MAX_WAIT_MS));
            await Promise.race([
              prefetchAllTranslations((done, total) => _showTransProgress(done, total)),
              timeoutPromise,
            ]);
          }
        } catch (err) {
          console.warn('[ARAAIN BANNU] Translation prefetch error:', err.message);
        } finally {
          _hideTransProgress();
        }
      }

      renderAll();
      document.body.classList.add('lang-flash');
      setTimeout(() => document.body.classList.remove('lang-flash'), 400);
    });
  }
}

// ── Back to top ───────────────────────────────────────────────
function bindBackTop() {
  const btn = g('backTop');
  if (!btn) return;
  window.addEventListener('scroll',
    () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Hero card scroll targets ───────────────────────────────────
function bindHeroCards() {
  qsa('.hero-card[data-target]').forEach(card => {
    card.addEventListener('click', () => {
      const tgt = qs(card.dataset.target);
      if (tgt) window.scrollTo({
        top: tgt.getBoundingClientRect().top + window.scrollY - 80,
        behavior: 'smooth',
      });
    });
  });
}

// ── Modals ────────────────────────────────────────────────────
const openModal  = id => { g(id)?.classList.add('open');    document.body.style.overflow = 'hidden'; };
const closeModal = id => { g(id)?.classList.remove('open'); document.body.style.overflow = ''; };

function bindModals() {
  qsa('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  qsa('.modal-overlay').forEach(ov =>
    ov.addEventListener('click', ev => { if (ev.target === ov) closeModal(ov.id); }));
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape')
      qsa('.modal-overlay.open').forEach(m => closeModal(m.id));
  });
  document.addEventListener('click', ev => {
    if (ev.target.closest('.open-membership')) {
      rebuildMembershipForm();
      openModal('membershipModal');
    }
  });
  qsa('.open-donation').forEach(btn =>
    btn.addEventListener('click', () => {
      renderDonationModal();
      openModal('donationModal');
    }));
  const lbc = g('lightboxClose');
  if (lbc) lbc.addEventListener('click', () => closeModal('lightbox'));
  const lbOv = g('lightbox');
  if (lbOv) lbOv.addEventListener('click',
    ev => { if (ev.target === lbOv) closeModal('lightbox'); });
}

// ── Donation tabs ─────────────────────────────────────────────
function bindDonationTabs() {
  qsa('.bank-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.bank-tab').forEach(t => t.classList.remove('active'));
      qsa('.bank-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      g('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });
  qsa('.don-amt').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.don-amt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ── Copy buttons ──────────────────────────────────────────────
function bindCopyBtns() {
  qsa('.copy-btn').forEach(btn => {
    btn.innerHTML = iconHTML('copy','icon-xs');
    btn.addEventListener('click', () => {
      const src = g(btn.dataset.copy);
      if (!src) return;
      navigator.clipboard.writeText(src.textContent.trim()).catch(() => {
        const ta = Object.assign(document.createElement('textarea'),
          { value: src.textContent.trim() });
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      });
      const orig = btn.innerHTML;
      btn.innerHTML = iconHTML('check','icon-xs');
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
  });
}

// ── Image compression helper ──────────────────────────────────
// Resizes + re-encodes an uploaded photo as JPEG so it stays well
// under Firestore's 1MB-per-document limit, regardless of how large
// the original phone/camera photo was.
function compressImageToDataURL(file, maxDim = 480, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { resolve(''); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image file'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width  = maxDim;
        } else if (height > maxDim) {
          width  = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Forms ─────────────────────────────────────────────────────
function bindForms() {
  // Membership
  const mf = g('membershipForm');
  const ms = g('membershipSuccess');
  if (mf) {
    mf.addEventListener('submit', async ev => {
      ev.preventDefault();
      let ok = true;
      mf.querySelectorAll('input[required]:not([type=radio]),select[required],textarea[required]')
        .forEach(f => {
          f.classList.remove('error');
          if (!f.value.trim()) { f.classList.add('error'); ok = false; }
        });
      ['gender','membershipType','residentialStatus','affiliated','education','work']
        .forEach(name => {
          if (!mf.querySelector(`[name=${name}]:checked`)) {
            mf.querySelectorAll(`[name=${name}]`).forEach(r => r.classList.add('error'));
            ok = false;
          }
        });
      if (!ok) {
        mf.querySelector('.error')?.scrollIntoView({ behavior:'smooth', block:'center' });
        return;
      }
      const fd   = new FormData(mf);
      const data = {};
      for (const [k, v] of fd.entries()) if (k !== 'photo' && k !== 'consent') data[k] = v;

      // Compress the uploaded photo (if any) into a small base64 JPEG
      // so it can be stored directly inside the Firestore document.
      const photoFile = fd.get('photo');
      if (photoFile && photoFile.size > 0) {
        try {
          data.photoData = await compressImageToDataURL(photoFile);
        } catch (err) {
          console.warn('[ARAAIN BANNU] Photo compression failed, submitting without photo:', err);
          data.photoData = '';
        }
      } else {
        data.photoData = '';
      }

      const btn = g('memSubmitBtn');
      btn.disabled    = true;
      btn.textContent = t('submitting', lang);

      await addSubmission(data).catch(console.error);
      await saveRegistrationToCloud(data).catch(err =>
        console.warn('[ARAAIN BANNU] Firestore write failed:', err));

      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = t('submitApp', lang);
        mf.reset();
        if (ms) {
          ms.innerHTML = iconHTML('check','icon-sm')
            + `<span>${t('appSuccess', lang)}</span>`;
          ms.classList.add('show');
          setTimeout(() => ms.classList.remove('show'), 6000);
        }
      }, 900);
    });
  }

  // Donation confirmation form
  const df = g('donationForm');
  const ds = g('donFormSuccess');
  if (df) {
    df.addEventListener('submit', async ev => {
      ev.preventDefault();
      let ok = true;
      ['dfName','dfPhone','dfAmount','dfMethod','dfTxId'].forEach(id => {
        const el = g(id);
        el?.classList.remove('error');
        if (!el?.value.trim()) { el?.classList.add('error'); ok = false; }
      });
      if (!ok) { g('dfName')?.scrollIntoView({ behavior:'smooth', block:'center' }); return; }

      const btn = g('donSubmitBtn');
      btn.disabled    = true;
      btn.textContent = t('donSubmitting', lang);

      // Compress the payment screenshot if provided
      const proofFile = df.querySelector('[name=proof]')?.files?.[0];
      let photoData = '';
      if (proofFile && proofFile.size > 0) {
        try { photoData = await compressImageToDataURL(proofFile, 800, 0.75); }
        catch (e) { console.warn('[ARAAIN BANNU] Screenshot compress failed:', e); }
      }

      const data = {
        donorName: g('dfName').value.trim(),
        phone:     g('dfPhone').value.trim(),
        email:     g('dfEmail').value.trim(),
        amount:    g('dfAmount').value.trim(),
        method:    g('dfMethod').value,
        txId:      g('dfTxId').value.trim(),
        note:      g('dfNote').value.trim(),
        photoData,
      };

      await addDonation(data).catch(console.error);
      await saveDonationToCloud(data).catch(err =>
        console.warn('[ARAAIN BANNU] Donation cloud save failed:', err));

      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = t('donSubmitBtn', lang);
        df.reset();
        if (ds) {
          ds.textContent = t('donSuccess', lang);
          ds.style.display = 'block';
          setTimeout(() => { ds.style.display = 'none'; }, 8000);
        }
      }, 900);
    });
  }

  // Contact
  const cf = g('contactForm');
  const cs = g('contactSuccess');
  if (cf) {
    cf.addEventListener('submit', async ev => {
      ev.preventDefault();
      let ok = true;
      ['cfName','cfEmail','cfSubject','cfMessage'].forEach(id => {
        const el = g(id); el?.classList.remove('error');
        if (!el?.value.trim()) { el?.classList.add('error'); ok = false; }
      });
      if (!ok) return;
      const btn = cf.querySelector('[type=submit]');
      btn.disabled    = true;
      btn.textContent = t('sending', lang);
      await addMessage({
        name:    g('cfName').value,
        email:   g('cfEmail').value,
        subject: g('cfSubject').value,
        message: g('cfMessage').value,
      }).catch(console.error);
      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = t('sendMessage', lang);
        cf.reset();
        if (cs) {
          cs.innerHTML = iconHTML('check','icon-sm')
            + `<span>${t('msgSuccess', lang)}</span>`;
          cs.classList.add('show');
          setTimeout(() => cs.classList.remove('show'), 4000);
        }
      }, 800);
    });
  }
}

// ── Program card tilt ─────────────────────────────────────────
function addProgTilt() {
  qsa('.prog-card').forEach(card => {
    card.addEventListener('mousemove', ev => {
      const r = card.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width  - 0.5) * 8;
      const y = ((ev.clientY - r.top)  / r.height - 0.5) * -8;
      card.style.transform = `translateY(-6px) rotateX(${y}deg) rotateY(${x}deg)`;
      card.style.transition = 'transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.4s ease';
    });
  });
}

// ── Start ─────────────────────────────────────────────────────
boot().catch(console.error);
