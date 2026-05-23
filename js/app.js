import { initDB, getAllSettings, getPrograms, getLeaders, getEvents, getPages, getPage, getGallery, addSubmission, addMessage } from './db.js';
import { t, EN, UR } from './lang.js';
import { iconHTML } from './icons.js';
let S = {};
let lang = localStorage.getItem('awc_lang') || 'ur';
let _ro;
async function boot() {
  loaderShow(true);
  await initDB().catch(console.error);
  S = getAllSettings();
  loaderShow(false);
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
}
function loaderShow(on) {
  const el = g('awc-loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}
function g(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }
function e(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function tv(key) {
  if (lang === 'ur') { const v = UR[key]; if (v) return v; }
  return S[key] || EN[key] || '';
}
function applyDir() {
  const isUr = lang === 'ur';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', isUr ? 'rtl' : 'ltr');
  document.body.classList.toggle('urdu', isUr);
}
function set(id, text) { const el = g(id); if (el) el.textContent = text; }
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
}
function renderHeader() {
  const logo = g('headerLogo');
  if (logo) {
    logo.innerHTML = S.logoData
      ? '<img src="' + e(S.logoData) + '" alt="logo" style="height:52px;width:52px;object-fit:cover;border-radius:12px"/>'
      : '<div class="logo-icon">AWC</div>';
  }
  set('headerSiteName', tv('siteName'));
  set('headerTagline', tv('siteTagline'));
  set('headerSubName', t('siteSubName', lang));
  qsa('.nav-link-home').forEach(el => { el.textContent = t('navHome', lang); });
  qsa('.nav-link-about').forEach(el => { el.textContent = t('navAbout', lang); });
  qsa('.nav-link-programs').forEach(el => { el.textContent = t('navPrograms', lang); });
  qsa('.nav-link-leadership').forEach(el => { el.textContent = t('navLeadership', lang); });
  qsa('.nav-link-events').forEach(el => { el.textContent = t('navEvents', lang); });
  qsa('.nav-link-gallery').forEach(el => { el.textContent = t('navGallery', lang); });
  qsa('.nav-link-contact').forEach(el => { el.textContent = t('navContact', lang); });
  qsa('.nav-cta-mem').forEach(el => { el.textContent = t('navMembership', lang); });
}
function renderHero() {
  set('heroBadge', tv('heroBadge') || t('heroBadge', lang));
  set('heroTitle', tv('heroTitle') || t('heroTitle', lang));
  set('heroBannuLabel', t('siteSubName', lang));
  set('heroSub', tv('heroSub') || t('heroSub', lang));
  set('heroTagline', tv('heroTagline') || t('heroTagline', lang));
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
function renderAbout() {
  set('section-label-about', t('aboutLabel', lang));
  set('about-h2', tv('aboutTitle') || t('aboutTitle', lang));
  set('about-h3', tv('aboutSubtitle') || t('aboutSubtitle', lang));
  set('about-p1', tv('aboutP1') || t('aboutP1', lang));
  set('about-p2', tv('aboutP2') || t('aboutP2', lang));
  set('about-p3', tv('aboutP3') || t('aboutP3', lang));
  set('chairman-name', tv('chairmanName') || t('chairmanName', lang));
  set('chairman-quote', tv('chairmanQuote') || t('chairmanQuote', lang));
  set('chairmanBadge', t('chairmanBadge', lang));
  set('joinBtn', t('joinBtn', lang));
  set('statMembersLabel', t('statMembersLabel', lang));
  set('statProgramsLabel', t('statProgramsLabel', lang));
  set('statCitiesLabel', t('statCitiesLabel', lang));
  const mn = g('statMembersNum'); if (mn) mn.dataset.val = S.statMembers || '500+';
  const pn = g('statProgramsNum'); if (pn) pn.dataset.val = S.statPrograms || '8';
  const cn = g('statCitiesNum'); if (cn) cn.dataset.val = S.statCities || '30+';
}
function renderPrograms() {
  const grid = g('programsGrid');
  if (!grid) return;
  set('programsSectionLabel', t('programsLabel', lang));
  set('programsTitle', tv('programsTitle') || t('programsTitle', lang));
  set('programsDesc', tv('programsDesc') || t('programsDesc', lang));
  const progs = getPrograms();
  if (!progs.length) { grid.innerHTML = '<p class="empty-state">' + t('noPrograms', lang) + '</p>'; return; }
  grid.innerHTML = progs.map(p => `
<div class="prog-card reveal" style="--c:${e(p.color)}">
<div class="prog-icon">${iconHTML(p.icon_name || 'handshake','icon-prog')}</div>
<h3 class="fancy">${e(p.title)}</h3>
<p>${e(p.desc)}</p>
</div>`).join('');
  observeReveal();
  addProgTilt();
}
function renderLeaders() {
  const grid = g('leadershipGrid');
  if (!grid) return;
  set('leadershipSectionLabel', t('teamLabel', lang));
  set('leadershipTitle', tv('leadershipTitle') || t('leadershipTitle', lang));
  const leaders = getLeaders();
  if (!leaders.length) { grid.innerHTML = '<p class="empty-state">' + t('noLeaders', lang) + '</p>'; return; }
  grid.innerHTML = leaders.map(l => {
    const avatarContent = l.photo_data
      ? '<img src="' + e(l.photo_data) + '" alt="' + e(l.name) + '" class="leader-photo"/>'
      : '<span class="leader-initials">' + e(l.initials) + '</span>';
    return `
<div class="leader-card reveal${l.featured ? ' featured' : ''}">
<div class="leader-avatar">${avatarContent}</div>
<div class="leader-info">
<h4 class="fancy">${e(l.name)}</h4>
<span class="leader-role">${e(l.role)}</span>
<a class="leader-email" href="mailto:${e(l.email)}">${e(l.email)}</a>
</div>
</div>`;
  }).join('');
  const saw = g('seeAllWrap');
  if (saw) { const a = saw.querySelector('a, button'); if (a) a.textContent = t('seeAllMembers', lang); }
  observeReveal();
}
function renderEvents() {
  const list = g('eventsList');
  if (!list) return;
  set('eventsSectionLabel', t('upcomingLabel', lang));
  set('eventsTitle', tv('eventsTitle') || t('eventsTitle', lang));
  const evs = getEvents();
  if (!evs.length) { list.innerHTML = '<p class="empty-state">' + t('noEvents', lang) + '</p>'; return; }
  list.innerHTML = evs.map(ev => `
<div class="event-card reveal">
<div class="event-date">
<span class="event-day">${e(ev.day)}</span>
<span class="event-month">${e(ev.month)}</span>
</div>
<div class="event-body">
<span class="event-tag">${e(ev.tag)}</span>
<h4 class="fancy">${e(ev.title)}</h4>
<div class="event-meta">
<span>${iconHTML('clock','icon-xs')} ${e(ev.time_str)}</span>
<span>${iconHTML('mapPin','icon-xs')} ${e(ev.place)}</span>
</div>
<button class="btn-sm open-membership">${t('registerNow', lang)}</button>
</div>
</div>`).join('');
  observeReveal();
}
function renderCTA() {
  set('ctaMemberTitle', tv('membershipTitle') || t('membershipTitle', lang));
  set('ctaMemberDesc', tv('membershipDesc') || t('membershipDesc', lang));
  set('ctaDonateTitle', tv('donateTitle') || t('donateTitle', lang));
  set('ctaDonateDesc', tv('donateDesc') || t('donateDesc', lang));
  set('ctaRegisterBtn', t('registerNow', lang));
  set('ctaDonateBtn', t('donateNow', lang));
}
function renderGallery() {
  set('gallerySectionLabel', t('galleryLabel', lang));
  set('galleryTitle', tv('galleryTitle') || t('galleryTitle', lang));
  set('galleryDesc', tv('galleryDesc') || t('galleryDesc', lang));
  const grid = g('galleryGrid');
  if (!grid) return;
  const items = getGallery();
  if (!items.length) { grid.innerHTML = '<p class="empty-state">' + t('galleryEmpty', lang) + '</p>'; return; }
  grid.innerHTML = items.map(item => `
<div class="gallery-item reveal" onclick="openLightbox('${e(item.data_url)}','${e(item.caption)}')">
<img src="${e(item.data_url)}" alt="${e(item.caption)}" loading="lazy"/>
${item.caption ? '<div class="gallery-caption">' + e(item.caption) + '</div>' : ''}
</div>`).join('');
  observeReveal();
}
window.openLightbox = function(src, caption) {
  const lb = g('lightbox');
  if (!lb) return;
  g('lightboxImg').src = src;
  g('lightboxCaption').textContent = caption || '';
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
};
function renderContact() {
  set('contactSectionLabel', t('touchLabel', lang));
  set('contactHeading', t('contactUs', lang));
  set('addressLabel', t('addressLabel', lang));
  set('hoursLabel', t('hoursLabel', lang));
  set('phoneLabel', t('phoneLabel', lang));
  set('emailLabel', t('emailLabel', lang));
  set('contactAddress', tv('contactAddress'));
  set('contactHours', tv('contactHours'));
  const cp = g('contactPhone');
  if (cp) { cp.textContent = tv('contactPhone'); cp.href = 'https://wa.me/' + (tv('contactPhone') || '').replace(/\D/g,''); }
  const ce = g('contactEmail');
  if (ce) { ce.textContent = tv('contactEmail'); ce.href = 'mailto:' + tv('contactEmail'); }
  const sb = qs('#contactForm [type=submit]');
  if (sb) sb.textContent = t('sendMessage', lang);
  const labels = { cfName:'formName', cfEmail:'formEmail', cfSubject:'formSubject', cfMessage:'formMessage' };
  Object.entries(labels).forEach(([fieldId, tk]) => {
    const lbl = qs('label[for=' + fieldId + ']');
    if (lbl) lbl.textContent = t(tk, lang);
  });
  const phs = { cfName:'phName', cfEmail:'phEmail', cfSubject:'phSubject', cfMessage:'phMessage' };
  Object.entries(phs).forEach(([fieldId, tk]) => {
    const el = g(fieldId);
    if (el) el.placeholder = t(tk, lang);
  });
}
function renderFooter() {
  set('footerSiteName', tv('siteName') || t('siteName', lang));
  set('footerSubName', t('siteSubName', lang));
  set('footerDesc', tv('footerDesc') || t('footerDesc', lang));
  set('footerCopy', tv('footerCopy') || t('footerCopy', lang));
  set('footerUsefulLinks', t('usefulLinks', lang));
  set('footerRecentNews', t('recentNews', lang));
  set('footerContactUs', t('contactUsFooter', lang));
  set('footerContactAddress', tv('contactAddress'));
  const fcp = g('footerContactPhone');
  if (fcp) { fcp.textContent = tv('contactPhone'); fcp.href = 'https://wa.me/' + (tv('contactPhone') || '').replace(/\D/g,''); }
  const fn1 = qs('.footer-news a:nth-child(1) span');
  if (fn1) fn1.textContent = t('news1', lang);
  const fn2 = qs('.footer-news a:nth-child(2) span');
  if (fn2) fn2.textContent = t('news2', lang);
}
function renderPageLinks() {
  const ul = g('footerPageLinks');
  if (!ul) return;
  const slugLabelMap = {
    blog:'pageLabBlog', history:'pageLabHistory', documentation:'pageLabDocs',
    environmental:'pageLabEnv', gallery_page:'pageLabGallery', department:'pageLabDept',
  };
  ul.innerHTML = getPages().filter(p => p.published).map(p => {
    const labelKey = slugLabelMap[p.slug] || '';
    const label = labelKey ? t(labelKey, lang) : p.label;
    return `<li><a href="#" class="page-link fancy" data-slug="${e(p.slug)}">${e(label)}</a></li>`;
  }).join('');
  ul.querySelectorAll('.page-link').forEach(a => {
    a.addEventListener('click', ev => { ev.preventDefault(); openPageModal(a.dataset.slug); });
  });
}
function openPageModal(slug) {
  const pg = getPage(slug);
  if (!pg) return;
  const titleKeyMap = {
    blog:'pageTitleBlog', history:'pageTitleHistory', documentation:'pageTitleDocs',
    environmental:'pageTitleEnv', gallery_page:'pageTitleGallery', department:'pageTitleDept',
  };
  const bodyKeyMap = {
    blog:'pageBodyBlog', history:'pageBodyHistory', documentation:'pageBodyDocs',
    environmental:'pageBodyEnv', gallery_page:'pageBodyGallery', department:'pageBodyDept',
  };
  const titleKey = titleKeyMap[pg.slug] || '';
  const bodyKey  = bodyKeyMap[pg.slug]  || '';
  const title = titleKey ? t(titleKey, lang) : pg.title;
  const body  = bodyKey  ? t(bodyKey,  lang) : pg.body;
  set('pageModalTitle', title);
  const bodyEl = g('pageModalBody');
  if (bodyEl) bodyEl.innerHTML = (body || '').replace(/\n/g,'<br>');
  openModal('pageModal');
}
function renderDonationModal() {
  set('donModalTitle', t('donateToAWC', lang));
  set('donModalSub', t('donSub', lang));
  set('donAmtLabel', t('suggestedAmounts', lang));
  set('donCustomLabel', t('custom', lang));
  const lblMap = {
    'bl-bankName':'bankName','bl-bankTitle':'accountTitle',
    'bl-bankAccount':'accountNo','bl-bankIBAN':'IBAN','bl-bankBranch':'branchCode',
  };
  Object.entries(lblMap).forEach(([id, tk]) => { const el = g(id); if (el) el.textContent = t(tk, lang); });
  const valMap = {
    'bv-bankName':'bankName','bv-bankTitle':'bankTitle','bv-bankAccount':'bankAccount',
    'bv-bankIBAN':'bankIBAN','bv-bankBranch':'bankBranch','bv-epTitle':'epTitle',
    'bv-epNumber':'epNumber','bv-jcTitle':'jcTitle','bv-jcNumber':'jcNumber',
    'bv-intBank':'intBank','bv-intSwift':'intSwift','bv-intIBAN':'intIBAN',
  };
  Object.entries(valMap).forEach(([id, sk]) => { set(id, S[sk] || ''); });
  set('bankNoteEl',  t('bankNote', lang));
  set('epNoteEl',    t('easypaisaNote', lang));
  set('jcNoteEl',    t('jazzcashNote', lang));
  set('intNoteEl',   t('intNote', lang));
  const tabMap = { bank:'tabBank', easypaisa:'tabEasypaisa', jazzcash:'tabJazzcash', international:'tabInternational' };
  qsa('.bank-tab').forEach(tab => {
    const key = tabMap[tab.dataset.tab];
    if (key) { const icon = tab.querySelector('.svg-icon'); tab.textContent = t(key, lang); if (icon) tab.insertBefore(icon, tab.firstChild); }
  });
  qsa('.blabel').forEach(el => {
    if (el.textContent === 'Service' || el.textContent === 'سروس') el.textContent = t('service', lang);
    if (el.textContent === 'Mobile No.' || el.textContent === 'موبائل نمبر') el.textContent = t('mobileNo', lang);
  });
}
function rebuildMembershipForm() {
  set('memAppTitle',         t('memAppTitle', lang));
  set('memAppSub',           t('memAppSub', lang));
  set('memInstrTitle',       t('memInstrTitle', lang));
  ['memInstr1','memInstr2','memInstr3','memInstr4','memInstr5'].forEach(k => set(k, t(k, lang)));
  set('memNote',             t('memNote', lang));
  set('memSecPersonal',      t('memPersonal', lang));
  set('memSecContact',       t('memContact', lang));
  set('memSecProfessional',  t('memProfessional', lang));
  set('memSecAddress',       t('memAddress', lang));
  set('memTermsTitle',       t('memTermsTitle', lang));
  ['memTerm1','memTerm2','memTerm3'].forEach(k => set(k, t(k, lang)));
  set('memConsentLabel',     t('memConsent', lang));
  set('memSubmitBtn',        t('submitApp', lang));
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
  Object.entries(phMap).forEach(([sel, tk]) => { const el = qs(sel); if (el) el.placeholder = t(tk, lang); });
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
     [t('eGrad',lang),'Graduate'],[t('ePG',lang),'Post Graduate'],[t('eOther',lang),'Other']]);
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
    ['Pakistan','cPakistan'],['United States of America','cUSA'],['United Kingdom','cUK'],
    ['Canada','cCanada'],['Australia','cAustralia'],['United Arab Emirates','cUAE'],
    ['Saudi Arabia','cSaudi'],['Germany','cGermany'],['France','cFrance'],
    ['Netherlands','cNetherlands'],['Other','cOther'],
  ];
  sel.innerHTML = '<option value="">' + t('selectOpt', lang) + '</option>'
    + countries.map(([val, tk]) => `<option value="${val}">${t(tk, lang)}</option>`).join('');
}
function observeReveal() {
  if (!_ro) {
    _ro = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); _ro.unobserve(en.target); } });
    }, { threshold: 0.1 });
  }
  qsa('.reveal:not(.is-visible)').forEach(el => _ro.observe(el));
}
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const raw = el.dataset.val || el.textContent.trim();
      el.dataset.val = raw;
      const plus = raw.includes('+');
      const num = parseInt(raw.replace(/\D/g,''), 10);
      if (isNaN(num)) return;
      const t0 = performance.now(), dur = 1400;
      const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * num) + (plus ? '+' : '');
        if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
      };
      requestAnimationFrame(step);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  qsa('.stat-num').forEach(el => obs.observe(el));
}
function bindNav() {
  const hbg = g('hamburger');
  const nav = g('mainNav');
  if (hbg && nav) {
    hbg.addEventListener('click', () => { const o = nav.classList.toggle('open'); hbg.classList.toggle('open', o); });
    nav.querySelectorAll('a, button').forEach(el => el.addEventListener('click', () => { nav.classList.remove('open'); hbg.classList.remove('open'); }));
    document.addEventListener('click', ev => { if (!hbg.contains(ev.target) && !nav.contains(ev.target)) { nav.classList.remove('open'); hbg.classList.remove('open'); } });
  }
  const sections = qsa('section[id]');
  const navAs = qsa('.main-nav a[href^="#"]');
  window.addEventListener('scroll', () => {
    const sy = window.scrollY + 130;
    let cur = '';
    sections.forEach(s => { if (s.offsetTop <= sy) cur = s.id; });
    navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }, { passive: true });
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', ev => {
      const tgt = qs(a.getAttribute('href'));
      if (tgt) { ev.preventDefault(); window.scrollTo({ top: tgt.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
    });
  });
  const hdr = qs('.site-header');
  window.addEventListener('scroll', () => { if (hdr) hdr.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(10,40,25,.14)' : ''; }, { passive: true });
  const lb = g('langBtn');
  if (lb) {
    lb.addEventListener('click', () => {
      lang = lang === 'en' ? 'ur' : 'en';
      localStorage.setItem('awc_lang', lang);
      renderAll();
      document.body.classList.add('lang-flash');
      setTimeout(() => document.body.classList.remove('lang-flash'), 400);
    });
  }
}
function bindBackTop() {
  const btn = g('backTop');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
function bindHeroCards() {
  qsa('.hero-card[data-target]').forEach(card => {
    card.addEventListener('click', () => {
      const tgt = qs(card.dataset.target);
      if (tgt) window.scrollTo({ top: tgt.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });
}
function openModal(id) { g(id)?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { g(id)?.classList.remove('open'); document.body.style.overflow = ''; }
function bindModals() {
  qsa('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  qsa('.modal-overlay').forEach(ov => ov.addEventListener('click', ev => { if (ev.target === ov) closeModal(ov.id); }));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') qsa('.modal-overlay.open').forEach(m => closeModal(m.id)); });
  document.addEventListener('click', ev => { if (ev.target.closest('.open-membership')) { rebuildMembershipForm(); openModal('membershipModal'); } });
  qsa('.open-donation').forEach(btn => btn.addEventListener('click', () => { renderDonationModal(); openModal('donationModal'); }));
  const lbc = g('lightboxClose');
  if (lbc) lbc.addEventListener('click', () => closeModal('lightbox'));
  const lbOv = g('lightbox');
  if (lbOv) lbOv.addEventListener('click', ev => { if (ev.target === lbOv) closeModal('lightbox'); });
}
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
    btn.addEventListener('click', () => { qsa('.don-amt').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
  });
}
function bindCopyBtns() {
  qsa('.copy-btn').forEach(btn => {
    btn.innerHTML = iconHTML('copy','icon-xs');
    btn.addEventListener('click', () => {
      const src = g(btn.dataset.copy);
      if (!src) return;
      navigator.clipboard.writeText(src.textContent.trim()).catch(() => {
        const ta = Object.assign(document.createElement('textarea'), { value: src.textContent.trim() });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      });
      const orig = btn.innerHTML;
      btn.innerHTML = iconHTML('check','icon-xs');
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
  });
}
function bindForms() {
  const mf = g('membershipForm');
  const ms = g('membershipSuccess');
  if (mf) {
    mf.addEventListener('submit', async ev => {
      ev.preventDefault();
      let ok = true;
      mf.querySelectorAll('input[required]:not([type=radio]),select[required],textarea[required]').forEach(f => {
        f.classList.remove('error');
        if (!f.value.trim()) { f.classList.add('error'); ok = false; }
      });
      ['gender','membershipType','residentialStatus','affiliated','education','work'].forEach(name => {
        if (!mf.querySelector('[name=' + name + ']:checked')) {
          mf.querySelectorAll('[name=' + name + ']').forEach(r => r.classList.add('error'));
          ok = false;
        }
      });
      if (!ok) { mf.querySelector('.error')?.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
      const fd = new FormData(mf);
      const data = {};
      for (const [k, v] of fd.entries()) if (k !== 'photo' && k !== 'consent') data[k] = v;
      const btn = g('memSubmitBtn');
      btn.disabled = true;
      btn.textContent = t('submitting', lang);
      await addSubmission(data).catch(console.error);
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = t('submitApp', lang);
        mf.reset();
        if (ms) { ms.innerHTML = iconHTML('check','icon-sm') + '<span>' + t('appSuccess', lang) + '</span>'; ms.classList.add('show'); setTimeout(() => ms.classList.remove('show'), 6000); }
      }, 900);
    });
  }
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
      btn.disabled = true;
      btn.textContent = t('sending', lang);
      await addMessage({ name: g('cfName').value, email: g('cfEmail').value, subject: g('cfSubject').value, message: g('cfMessage').value }).catch(console.error);
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = t('sendMessage', lang);
        cf.reset();
        if (cs) { cs.innerHTML = iconHTML('check','icon-sm') + '<span>' + t('msgSuccess', lang) + '</span>'; cs.classList.add('show'); setTimeout(() => cs.classList.remove('show'), 4000); }
      }, 800);
    });
  }
}
function addProgTilt() {
  qsa('.prog-card').forEach(card => {
    card.addEventListener('mousemove', ev => {
      const r = card.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width  - 0.5) * 8;
      const y = ((ev.clientY - r.top)  / r.height - 0.5) * -8;
      card.style.transform = 'translateY(-6px) rotateX(' + y + 'deg) rotateY(' + x + 'deg)';
      card.style.transition = 'transform 0.1s ease';
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.transition = 'transform 0.4s ease'; });
  });
}
boot().catch(console.error);
