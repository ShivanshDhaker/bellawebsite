/* Vercel serverless function — gives every published project its own page for search engines.
   /projects/<slug> is routed here (see vercel.json). The page is the normal Projects & Impact page
   with this project's title, description, sharing tags, structured data and full text already in
   the HTML, so search engines and link previews can read it without running any script. */
var cfg = require('./config.js');
var STATES = { AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', PB: 'Punjab', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TS: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh', UK: 'Uttarakhand', WB: 'West Bengal', AN: 'Andaman and Nicobar Islands', CH: 'Chandigarh', DH: 'Dadra and Nagar Haveli and Daman and Diu', DL: 'Delhi', JK: 'Jammu and Kashmir', LA: 'Ladakh', LD: 'Lakshadweep', PY: 'Puducherry' };
var STATUS = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed' };
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function env() {
  var url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  var key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return url && key && !cfg.isSecret(key) ? { url: url, key: key } : null;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function arr(v) { return Array.isArray(v) ? v : []; }
function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/)/i.test(u) ? u : (/^assets\//i.test(u) ? '/' + u : ''); }
function rich(html) {
  return String(html || '').replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '').replace(/<\/?(script|style|iframe|object|embed|form|input|button|link|meta)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
function plain(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function fmt(d) { var m = /^(\d{4})-(\d{2})/.exec(d || ''); return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : ''; }
function period(p) { var a = fmt(p.start_date), b = fmt(p.end_date); if (a && b) return a === b ? a : a + ' – ' + b; if (a) return a + (p.status === 'ongoing' ? ' – ongoing' : ''); return b; }
function place(p) {
  var parts = [], st = arr(p.states).map(function (c) { return STATES[c] || c; });
  if (p.location) parts.push(p.location);
  if (p.district && String(p.district).toLowerCase() !== String(p.location || '').toLowerCase()) parts.push(/district/i.test(p.district) ? p.district : p.district + ' district');
  if (st.length) parts.push(st.length > 3 ? st.length + ' states and UTs' : st.join(', '));
  return parts.join(', ');
}
async function rest(c, path) {
  var h = { apikey: c.key, Accept: 'application/json' };
  if (/^eyJ/.test(c.key)) h.Authorization = 'Bearer ' + c.key;
  var r = await fetch(c.url + '/rest/v1/' + path, { headers: h });
  if (!r.ok) throw new Error('database ' + r.status);
  return r.json();
}
function block(title, html) { return plain(html) ? '<section class="d-block"><h3>' + title + '</h3><div class="rich">' + rich(html) + '</div></section>' : ''; }

function detail(p, partners) {
  var cover = safeUrl(p.cover_image), h = '';
  h += '<a class="back" href="/projects.html">← All projects</a>';
  h += '<header class="d-head"><p class="kicker">' + esc([p.category, p.code].filter(Boolean).join(' · ')) + '</p><h2 class="h2">' + esc(p.title) + '</h2>' + (place(p) ? '<p class="d-place">' + esc(place(p)) + '</p>' : '') +
    '<p class="d-tags"><span class="tag tag--live tag--' + esc(p.status) + '">' + esc(STATUS[p.status] || '') + '</span>' + (period(p) ? '<span class="d-period">' + esc(period(p)) + '</span>' : '') + '</p></header>';
  if (cover) h += '<figure class="d-cover"><img src="' + esc(cover) + '" alt="' + esc(p.cover_caption || p.title) + '" style="object-position:' + esc(p.cover_focus || '50% 50%') + '">' + (p.cover_caption ? '<figcaption>' + esc(p.cover_caption) + '</figcaption>' : '') + '</figure>';
  h += '<div class="d-grid"><div class="d-main">';
  if (p.summary) h += '<p class="d-lead">' + esc(p.summary) + '</p>';
  h += block('Background and community needs', p.background) + block('Objectives', p.objectives) + block('Scope of work', p.scope) + block('Implementation activities', p.activities) + block('Work completed and outcomes', p.outcomes);
  var ups = arr(p.updates).filter(function (u) { return u && (u.text || u.title); });
  if (ups.length) h += '<section class="d-block"><h3>Project updates</h3><ol class="timeline">' + ups.map(function (u) { return '<li>' + (fmt(u.date) ? '<time>' + esc(fmt(u.date)) + '</time>' : '') + (u.title ? '<b>' + esc(u.title) + '</b>' : '') + (u.text ? '<p>' + esc(u.text) + '</p>' : '') + '</li>'; }).join('') + '</ol></section>';
  var gal = arr(p.gallery).filter(function (g) { return g && safeUrl(g.url); });
  if (gal.length) h += '<section class="d-block"><h3>Photographs</h3><div class="gallery">' + gal.map(function (g) { return '<figure><a href="' + esc(safeUrl(g.url)) + '"><img src="' + esc(safeUrl(g.url)) + '" alt="' + esc(g.caption || p.title) + '" loading="lazy"></a>' + (g.caption ? '<figcaption>' + esc(g.caption) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div></section>';
  var links = function (list, label) { list = arr(list).filter(function (d) { return d && safeUrl(d.url); }); return list.length ? '<section class="d-block"><h3>' + label + '</h3><ul class="doclinks">' + list.map(function (d) { return '<li><a href="' + esc(safeUrl(d.url)) + '" rel="noopener">' + esc(d.title || d.url) + '</a></li>'; }).join('') + '</ul></section>' : ''; };
  h += links(p.videos, 'Videos') + links(p.documents, 'Reports and documents') + '</div><aside class="d-side">';
  var reached = Number(p.beneficiaries_reached) > 0 ? Number(p.beneficiaries_reached).toLocaleString('en-IN') + (p.beneficiaries_note ? ' — ' + p.beneficiaries_note : '') : '';
  var facts = [['Project ID', p.code], ['Status', STATUS[p.status]], ['Timeline', period(p)], ['State / UT', arr(p.states).map(function (c) { return STATES[c] || c; }).join(', ')], ['District', p.district], ['Location', p.location], ['CSR focus area', p.category], ['Target beneficiaries', p.target_beneficiaries], ['Beneficiaries reached (verified)', reached], ['Corporate CSR partner', partners.map(function (x) { return x.name; }).join(', ')], ['Implementation partners', p.implementation_partners], ['Other stakeholders', p.stakeholders]].filter(function (r) { return r[1]; });
  h += '<dl class="facts">' + facts.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
  var ind = arr(p.indicators).filter(function (i) { return i && i.label && i.value; });
  if (ind.length) h += '<h4 class="side-h">Impact indicators</h4><ul class="indicators">' + ind.map(function (i) { return '<li><strong>' + esc(i.value) + '</strong><span>' + esc(i.label) + '</span></li>'; }).join('') + '</ul>';
  return h + '</aside></div>';
}

module.exports = async function (req, res) {
  var u = new URL(req.url, 'http://x'), slug = String((req.query && req.query.slug) || u.searchParams.get('slug') || '').trim();
  var host = req.headers['x-forwarded-host'] || req.headers.host || '', proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  var origin = proto + '://' + host, site = (process.env.SITE_URL || origin).replace(/\/+$/, ''), c = env();
  function redirect() { res.statusCode = 302; res.setHeader('Location', '/projects.html'); res.end(); }
  if (!c || !slug || !/^[\w-]{1,120}$/.test(slug)) return redirect();
  try {
    var rows = await rest(c, 'projects?select=*&visibility=eq.published&slug=eq.' + encodeURIComponent(slug));
    if (!rows.length && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slug)) rows = await rest(c, 'projects?select=*&visibility=eq.published&id=eq.' + slug);
    var tplRes = await fetch(origin + '/projects.html'); if (!tplRes.ok) throw new Error('template ' + tplRes.status);
    var tpl = (await tplRes.text()).replace(/(href|src)="(assets\/|index\.html|projects\.html)/g, '$1="/$2').replace('<script src="/assets/js/data.js">', '<script src="/assets/js/data.js" data-root="/">');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!rows.length) {
      res.statusCode = 404; res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.end(tpl.replace(/<title>[^<]*<\/title>/, '<title>Project not found — Bella Foundation</title><meta name="robots" content="noindex">'));
    }
    var p = rows[0], ids = arr(p.partner_ids), partners = [];
    if (ids.length) { try { partners = await rest(c, 'partners?select=id,name&visibility=eq.published&id=in.(' + ids.map(encodeURIComponent).join(',') + ')'); } catch (e) {} }
    var url = site + '/projects/' + encodeURIComponent(p.slug || p.id), title = p.title + ' — Bella Foundation';
    var desc = (p.summary || plain(p.background) || p.title).slice(0, 300), cover = safeUrl(p.cover_image), image = cover ? (/^https?:/i.test(cover) ? cover : site + cover) : site + '/assets/images/og-image.png';
    var ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: desc, image: [image], mainEntityOfPage: url, datePublished: p.published_at || p.created_at, dateModified: p.updated_at || p.published_at, articleSection: p.category || undefined,
      contentLocation: place(p) ? { '@type': 'Place', name: place(p) } : undefined, author: { '@type': 'Organization', name: 'Bella Foundation', url: site }, publisher: { '@type': 'Organization', name: 'Bella Foundation', logo: { '@type': 'ImageObject', url: site + '/assets/logo/bella-foundation.png' } } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: site + '/' }, { '@type': 'ListItem', position: 2, name: 'Projects & Impact', item: site + '/projects.html' }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] }];
    var html = tpl
      .replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(desc) + '">')
      .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(url) + '">')
      .replace(/<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">')
      .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(title) + '">')
      .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(desc) + '">')
      .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(url) + '">')
      .replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + esc(image) + '">')
      .replace(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + esc(image) + '">')
      .replace('</head>', '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n</head>')
      .replace(/(<section class="phero"[\s\S]*?<p class="hero-meta">)[\s\S]*?<\/p>\s*<h1>[\s\S]*?<\/h1>\s*<p class="lead">[\s\S]*?<\/p>/, function (m, a) { return a + '<span>Project</span>' + (p.category ? '<span>' + esc(p.category) + '</span>' : '') + '</p>\n    <h1>' + esc(p.title) + '</h1>\n    <p class="lead">' + esc(p.summary || place(p)) + '</p>'; })
      .replace('<body>', '<body class="is-project">')
      .replace('<div id="listUi">', '<div id="listUi" hidden>')
      .replace('<article class="detail" id="detail" tabindex="-1" hidden></article>', '<article class="detail" id="detail" tabindex="-1">' + detail(p, partners) + '</article>')
      .replace('<script src="/assets/js/config.js">', '<script>window.BF_INITIAL_PROJECT=' + JSON.stringify(String(p.id)).replace(/</g, '\\u003c') + ';</script>\n<script src="/assets/js/config.js">');
    res.statusCode = 200; res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.end(html);
  } catch (e) { console.error('project page:', e && e.message); redirect(); }
};
