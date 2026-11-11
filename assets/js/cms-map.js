/* Bella Foundation — the list of homepage texts that can be edited from the admin dashboard.
   Each entry points at an element on index.html. The words in the HTML file are the defaults;
   anything saved in the dashboard replaces them when the page loads. */
(function () {
  var F = [];
  function add(group, key, label, sel, type) { F.push({ group: group, key: key, label: label, sel: sel, type: type || 'text' }); }
  add('Hero', 'hero.title', 'Main headline', '.hero h1', 'line');
  add('Hero', 'hero.tagline', 'Tagline', '.hero .hero-tag', 'line');
  add('Hero', 'hero.text', 'Introduction', '.hero p.lead', 'text');
  add('Hero', 'hero.cta1', 'First button', '.hero-cta .btn--gold', 'label');
  add('Hero', 'hero.cta2', 'Second button', '.hero-cta .btn--line', 'label');
  add('About Us', 'about.heading', 'Section heading', '#about-h', 'line');
  add('About Us', 'about.lead', 'Opening statement', '.about-copy .lead', 'text');
  add('About Us', 'about.body', 'About text', '.about-copy .muted', 'rich');
  add('About Us', 'about.quote', 'Pull quote', '.pull blockquote', 'text');
  add('Vision and Mission', 'vision.title', 'Vision statement', '.vm article:nth-child(1) .h3', 'text');
  add('Vision and Mission', 'vision.text', 'Vision description', '.vm article:nth-child(1) .muted', 'text');
  add('Vision and Mission', 'mission.title', 'Mission statement', '.vm article:nth-child(2) .h3', 'text');
  add('Vision and Mission', 'mission.text', 'Mission description', '.vm article:nth-child(2) .muted', 'text');
  add('Focus Areas', 'focus.heading', 'Section heading', '#focus-h', 'line');
  add('Focus Areas', 'focus.intro', 'Section introduction', '#focus .sec-head .sub', 'text');
  for (var i = 1; i <= 6; i++) {
    var c = '.focus-grid .fcard:nth-child(' + i + ')';
    add('Focus Areas', 'focus.' + i + '.title', 'Area ' + i + ' — title', c + ' h3', 'line');
    add('Focus Areas', 'focus.' + i + '.summary', 'Area ' + i + ' — objective', c + ' > p:not(.fcard-sch)', 'text');
    add('Focus Areas', 'focus.' + i + '.interventions', 'Area ' + i + ' — interventions', c + ' dl div:nth-child(1) dd', 'text');
    add('Focus Areas', 'focus.' + i + '.outcomes', 'Area ' + i + ' — intended outcomes', c + ' dl div:nth-child(2) dd', 'text');
  }
  add('CSR Partnerships', 'partnerships.heading', 'Section heading', '#part-h', 'line');
  add('CSR Partnerships', 'partnerships.intro', 'Section introduction', '#partnerships .sec-head .sub', 'text');
  add('CSR Partnerships', 'partnerships.cta', 'Call-to-action button', '.cta-row .btn', 'label');
  add('Our Approach', 'approach.heading', 'Section heading', '#app-h', 'line');
  add('Our Approach', 'approach.intro', 'Section introduction', '#approach .sec-head .sub', 'text');
  add('Projects & Impact', 'impact.heading', 'Section heading', '#impact-h', 'line');
  add('Projects & Impact', 'impact.intro', 'Section introduction', '#impact .sec-head .sub', 'text');
  add('Projects & Impact', 'impact.credit', 'Photograph credit line', '#impact .photo-credit', 'text');
  add('Governance', 'governance.heading', 'Section heading', '#gov-h', 'line');
  add('Governance', 'governance.intro', 'Section introduction', '#governance .sec-head .sub', 'text');
  add('Contact', 'contact.heading', 'Section heading', '#contact-h', 'line');
  add('Contact', 'contact.intro', 'Section introduction', '#contact .sec-head .sub', 'text');
  add('Footer', 'footer.tagline', 'Tagline', '.foot .foot-tag', 'line');
  add('Footer', 'footer.about', 'Short description', '.foot .foot-about', 'text');
  /* ── more of the homepage ── */
  var i2;
  for (i2 = 1; i2 <= 3; i2++) add('Hero', 'hero.meta' + i2, 'Small label ' + i2 + ' above the headline', '.hero-meta span:nth-child(' + i2 + ')', 'line');
  for (i2 = 1; i2 <= 4; i2++) {
    add('At a glance strip', 'glance.' + i2 + '.label', 'Item ' + i2 + ' — label', '.glance li:nth-child(' + i2 + ') b', 'line');
    add('At a glance strip', 'glance.' + i2 + '.text', 'Item ' + i2 + ' — text', '.glance li:nth-child(' + i2 + ') p', 'text');
  }
  for (i2 = 1; i2 <= 5; i2++) {
    add('Core values', 'values.' + i2 + '.title', 'Value ' + i2 + ' — name', '.values li:nth-child(' + i2 + ') h3', 'line');
    add('Core values', 'values.' + i2 + '.text', 'Value ' + i2 + ' — description', '.values li:nth-child(' + i2 + ') p', 'text');
  }
  for (i2 = 1; i2 <= 3; i2++) {
    add('CSR Partnerships', 'models.' + i2 + '.title', 'Partnership model ' + i2 + ' — title', '.paths .path:nth-child(' + i2 + ') h3', 'line');
    add('CSR Partnerships', 'models.' + i2 + '.text', 'Partnership model ' + i2 + ' — description', '.paths .path:nth-child(' + i2 + ') h3 + p', 'text');
    add('CSR Partnerships', 'models.' + i2 + '.list', 'Partnership model ' + i2 + ' — points', '.paths .path:nth-child(' + i2 + ') ul', 'list');
  }
  add('CSR Partnerships', 'partnerships.ctanote', 'Small text beside the call-to-action', '#partnerships .cta-row small', 'text');
  for (i2 = 1; i2 <= 5; i2++) {
    add('What a partner can expect', 'expect.' + i2 + '.title', 'Commitment ' + i2 + ' — title', '.expect-list li:nth-child(' + i2 + ') h4', 'line');
    add('What a partner can expect', 'expect.' + i2 + '.text', 'Commitment ' + i2 + ' — description', '.expect-list li:nth-child(' + i2 + ') p', 'text');
  }
  for (i2 = 1; i2 <= 5; i2++) {
    add('Our Approach', 'stage.' + i2 + '.title', 'Stage ' + i2 + ' — title', '#stage-' + i2 + ' h3', 'line');
    add('Our Approach', 'stage.' + i2 + '.text', 'Stage ' + i2 + ' — description', '#stage-' + i2 + ' h3 + p', 'text');
    add('Our Approach', 'stage.' + i2 + '.list', 'Stage ' + i2 + ' — points', '#stage-' + i2 + ' ul', 'list');
  }
  add('Our Approach', 'approach.notetitle', 'Note — title', '.callout h4', 'line');
  add('Our Approach', 'approach.note', 'Note — text', '.callout p', 'text');
  for (i2 = 1; i2 <= 4; i2++) {
    add('Projects & Impact', 'flow.' + i2 + '.title', 'Monitoring step ' + i2 + ' — title', '.flow li:nth-child(' + i2 + ') h3', 'line');
    add('Projects & Impact', 'flow.' + i2 + '.text', 'Monitoring step ' + i2 + ' — description', '.flow li:nth-child(' + i2 + ') h3 + p', 'text');
  }
  for (i2 = 1; i2 <= 3; i2++) {
    add('Governance', 'gov.' + i2 + '.title', 'Point ' + i2 + ' — title', '.gov-points li:nth-child(' + i2 + ') h3', 'line');
    add('Governance', 'gov.' + i2 + '.text', 'Point ' + i2 + ' — description', '.gov-points li:nth-child(' + i2 + ') p', 'text');
  }
  [['registration', 'Legal form'], ['pan', 'PAN'], ['tan', 'TAN'], ['reg12a', 'Section 12A'], ['reg80g', 'Section 80G'], ['darpan', 'NGO Darpan ID']].forEach(function (d) {
    add('Registration details', 'reg.' + d[0] + '.value', d[1] + ' — number', '[data-doc="' + d[0] + '"] .doc-val', 'line');
    add('Registration details', 'reg.' + d[0] + '.note', d[1] + ' — small description', '[data-doc="' + d[0] + '"] small', 'line');
  });
  /* ── the Projects & Impact page ── */
  function addP(key, label, sel, type) { F.push({ group: 'Projects & Impact page', key: key, label: label, sel: sel, type: type || 'text', page: 'projects.html' }); }
  addP('ppage.title', 'Main headline', '.phero h1', 'line');
  addP('ppage.intro', 'Introduction', '.phero .lead', 'text');
  addP('ppage.atlas.heading', 'Map section — heading', '#atlas-h', 'line');
  addP('ppage.atlas.intro', 'Map section — introduction', '#atlas .sec-head .sub', 'text');
  addP('ppage.mapnote', 'Note under the map', '.map-note', 'text');
  addP('ppage.projects.heading', 'Projects section — heading', '#projects-h', 'line');
  addP('ppage.projects.intro', 'Projects section — introduction', '#projects .sec-head .sub', 'text');
  addP('ppage.partners.heading', 'Partners section — heading', '#partners-h', 'line');
  addP('ppage.partners.intro', 'Partners section — introduction', '#partners .sec-head .sub', 'text');
  /* ── what search engines and link previews show ── */
  F.push({ group: 'Search engines (SEO)', key: 'seo.home.title', label: 'Homepage — title shown in Google and on the browser tab (about 60 characters)', sel: 'title', type: 'doctitle' });
  F.push({ group: 'Search engines (SEO)', key: 'seo.home.description', label: 'Homepage — description shown under the title in Google (about 155 characters)', sel: 'meta[name="description"]', type: 'meta' });
  F.push({ group: 'Search engines (SEO)', key: 'seo.projects.title', label: 'Projects page — title', sel: 'title', type: 'doctitle', page: 'projects.html' });
  F.push({ group: 'Search engines (SEO)', key: 'seo.projects.description', label: 'Projects page — description', sel: 'meta[name="description"]', type: 'meta', page: 'projects.html' });
  window.BF_CMS_FIELDS = F;
  /* Built-in homepage photographs (used until they are replaced from the dashboard). */
  window.BF_DEFAULT_PHOTOS = {
    e1: { url: 'assets/images/e1.jpg', alt: 'Women participants at an agriculture event', pos: '45% 35%' },
    e2: { url: 'assets/images/e2.jpg', alt: 'Information stalls at a district agriculture programme, Pithoragarh', pos: '45% 60%' },
    e3: { url: 'assets/images/e3.jpg', alt: 'Community members attending a public meeting', pos: '40% 60%' },
    e4: { url: 'assets/images/e4.jpg', alt: 'A public meeting with farmers and residents', pos: '50% 45%' },
    e5: { url: 'assets/images/e5.jpg', alt: 'A group learning session beside a compost pit on terraced land', pos: '52% 40%' },
    e6: { url: 'assets/images/e6.jpg', alt: 'Bio-input preparation units for natural farming', pos: '50% 60%' },
    e7: { url: 'assets/images/e7.jpg', alt: 'Women attending a training session', pos: '35% 50%' },
    n4: { url: 'assets/images/n4.jpg', alt: 'Young saplings on open ground, Kadamtala, Tripura', pos: '30% 50%' },
    n5: { url: 'assets/images/n5.jpg', alt: 'Tree plantation beside a meadow, Kadamtala, Tripura', pos: '60% 50%' },
    n6: { url: 'assets/images/n6.jpg', alt: 'A village pond and homesteads, Kadamtala, Tripura', pos: '35% 50%' },
    n7: { url: 'assets/images/n7.jpg', alt: 'Plantation beside paddy fields, Kadamtala, Tripura', pos: '40% 40%' },
    n8: { url: 'assets/images/n8.jpg', alt: 'Sheep grazing in a tree plantation, Kadamtala, Tripura', pos: '50% 60%' },
    n9: { url: 'assets/images/n9.jpg', alt: 'Open ground near the Block Development Office, Kadamtala, Tripura', pos: '45% 50%' }
  };
  window.BF_PHOTO_SLOTS = [
    { key: 'hero', label: 'Hero photograph (shown on desktop)', defaults: ['e5', 'n8', 'e3', 'n5'] },
    { key: 'about_main', label: 'About Us — large photograph', defaults: ['e7', 'n7', 'e5', 'e1'] },
    { key: 'about_small', label: 'About Us — small photograph', defaults: ['e6', 'n8', 'e2'] },
    { key: 'partner', label: 'CSR Partnerships photograph', defaults: ['e4', 'e1', 'n5', 'e3'] },
    { key: 'impact_a', label: 'Projects & Impact — left photograph', defaults: ['e3', 'n4', 'e6', 'e4'] },
    { key: 'impact_b', label: 'Projects & Impact — right photograph', defaults: ['n7', 'e7', 'e2', 'n6'] }
  ];
  window.BF_DOCUMENTS = [
    { key: 'registration', label: 'Certificate of incorporation (Section 8 company)' },
    { key: 'pan', label: 'PAN' },
    { key: 'tan', label: 'TAN' },
    { key: 'reg12a', label: 'Section 12A registration' },
    { key: 'reg80g', label: 'Section 80G approval' },
    { key: 'darpan', label: 'NGO Darpan registration' },
    { key: 'csr1', label: 'Form CSR-1 registration' },
    { key: 'annual', label: 'Annual reports' },
    { key: 'audited', label: 'Audited financial statements' },
    { key: 'policies', label: 'Organisational policies' }
  ];

})();
