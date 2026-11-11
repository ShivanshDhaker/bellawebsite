/* Bella Foundation — Projects & Impact page: India map, state explorer, filters, project details, partners.
   Everything on this page is calculated from the project and partner records. Nothing is typed in by hand. */
(function () {
  'use strict';
  var BF = window.BF, INDIA = window.BF_INDIA, NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = BF.esc;
  var byCode = {}; INDIA.states.forEach(function (s) { byCode[s.code] = s; });
  var FULL = [-12, -12, 1024, 1158];
  var SMALL = ['CH', 'DL', 'DH', 'PY', 'LD'];
  var S = { data: null, f: { state: '', category: '', status: '', partner: '', q: '' }, project: null };
  var svg, tip, els = {}, view = FULL.slice(), anim = 0;

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function sv(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs || {}) n.setAttribute(k, attrs[k]); return n; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); }

  /* ── filtering ── */
  function matches(p, ignoreState) {
    var f = S.f;
    if (!ignoreState && f.state && p.states.indexOf(f.state) < 0) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.partner && p.partner_ids.indexOf(f.partner) < 0) return false;
    if (f.q) {
      var hay = [p.title, p.summary, p.location, p.district, p.category, p.code, BF.stateNames(p.states).join(' '), BF.partnersOf(p, S.data).map(function (x) { return x.name; }).join(' ')].join(' ').toLowerCase();
      if (f.q.toLowerCase().split(/\s+/).some(function (w) { return w && hay.indexOf(w) < 0; })) return false;
    }
    return true;
  }
  function counts(list) {
    var m = {};
    list.forEach(function (p) {
      p.states.forEach(function (c) {
        if (!byCode[c]) return;
        var o = m[c] || (m[c] = { total: 0, ongoing: 0, completed: 0, planned: 0 });
        o.total++; o[p.status]++;
      });
    });
    return m;
  }
  function kind(o) {
    if (!o || !o.total) return 'none';
    if (o.ongoing && o.completed) return 'both';
    if (o.ongoing) return 'ongoing';
    if (o.completed) return 'completed';
    return 'planned';
  }
  function countText(o) {
    if (!o || !o.total) return 'No published projects';
    var bits = [];
    if (o.ongoing) bits.push(o.ongoing + ' ongoing');
    if (o.completed) bits.push(o.completed + ' completed');
    if (o.planned) bits.push(o.planned + ' planned');
    return plural(o.total, 'published project') + ' — ' + bits.join(', ');
  }

  /* ── the map ── */
  function buildMap() {
    svg = $('#indiaMap'); tip = $('#mapTip');
    svg.setAttribute('viewBox', FULL.join(' '));
    var defs = sv('defs');
    defs.innerHTML = '<pattern id="bfBoth" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#6f7f4f"/><rect width="6" height="12" fill="#b9623f"/></pattern>';
    svg.appendChild(defs);
    var gStates = sv('g', { class: 'states' }), gLabels = sv('g', { class: 'labels', 'aria-hidden': 'true' }), gBadges = sv('g', { class: 'badges', 'aria-hidden': 'true' });
    INDIA.states.slice().sort(function (a, b) { return b.area - a.area; }).forEach(function (s) {
      var g = sv('g', { class: 'st st--none', 'data-code': s.code, tabindex: '0', role: 'button' });
      g.appendChild(sv('path', { d: s.d, 'fill-rule': 'evenodd' }));
      if (SMALL.indexOf(s.code) > -1) {
        g.classList.add('st--small');
        g.appendChild(sv('circle', { class: 'st-hit', cx: s.cx, cy: s.cy, r: 15 }));
        g.appendChild(sv('circle', { class: 'st-dot', cx: s.cx, cy: s.cy, r: 5.500 }));
      }
      gStates.appendChild(g);
      var lab = null;
      if (s.area > 2300) { lab = sv('text', { class: 'st-label', x: s.cx, y: s.cy + 5 }); lab.textContent = s.code; gLabels.appendChild(lab); }
      var b = sv('g', { class: 'badge', transform: 'translate(' + s.cx + ' ' + s.cy + ')' });
      var inner = sv('g', { class: 'badge-in' });
      inner.appendChild(sv('circle', { r: 15 }));
      var t = sv('text', { y: 5.500 }); inner.appendChild(t); b.appendChild(inner); b.style.display = 'none';
      gBadges.appendChild(b);
      els[s.code] = { g: g, label: lab, badge: b, num: t };
      g.addEventListener('click', function () { go('state=' + s.code); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('state=' + s.code); } });
      g.addEventListener('mousemove', function (e) { showTip(s, e); });
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', function () { showTip(s, null); });
      g.addEventListener('blur', hideTip);
    });
    svg.appendChild(gStates); svg.appendChild(gLabels); svg.appendChild(gBadges);
    var chips = $('#mapChips');
    ['AN', 'CH', 'DH', 'DL', 'GA', 'LD', 'PY', 'SK', 'TR'].forEach(function (c) {
      var b = el('button', 'chip'); b.type = 'button'; b.setAttribute('data-code', c); b.textContent = byCode[c].name.replace('Dadra and Nagar Haveli and Daman and Diu', 'DNH and Daman & Diu').replace('Andaman and Nicobar Islands', 'Andaman & Nicobar');
      b.addEventListener('click', function () { go('state=' + c); });
      chips.appendChild(b);
    });
    $('#mapBack').addEventListener('click', function () { go('atlas'); });
  }
  var mapCounts = {};
  function showTip(s, e) {
    tip.innerHTML = '<strong>' + esc(s.name) + '</strong><span>' + esc(countText(mapCounts[s.code])) + '</span>';
    tip.hidden = false;
    var fr = svg.parentNode.getBoundingClientRect(), x, y;
    if (e) { x = e.clientX - fr.left; y = e.clientY - fr.top; }
    else { var r = els[s.code].g.getBoundingClientRect(); x = r.left + r.width / 2 - fr.left; y = r.top - fr.top; }
    tip.style.left = Math.max(8, Math.min(fr.width - tip.offsetWidth - 8, x + 14)) + 'px';
    tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + 'px';
  }
  function hideTip() { tip.hidden = true; }
  function setView(v) {
    view = v; svg.setAttribute('viewBox', v.map(function (n) { return n.toFixed(1); }).join(' '));
    svg.style.setProperty('--k', (v[2] / FULL[2]).toFixed(3));
  }
  function zoomTo(target) {
    cancelAnimationFrame(anim);
    if (BF.reduced) { setView(target); return; }
    var from = view.slice(), t0 = null;
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 650), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setView(from.map(function (a, i) { return a + (target[i] - a) * e; }));
      if (p < 1) anim = requestAnimationFrame(step);
    })(performance.now());
  }
  function stateView(s) {
    var b = s.bbox, w = b[2] - b[0], h = b[3] - b[1], ar = FULL[2] / FULL[3];
    var vw = Math.max(w * 1.5, h * 1.5 * ar, 250), vh = vw / ar;
    if (vw > FULL[2]) return FULL.slice();
    var x = (b[0] + b[2]) / 2 - vw / 2, y = (b[1] + b[3]) / 2 - vh / 2;
    x = Math.max(FULL[0], Math.min(FULL[0] + FULL[2] - vw, x)); y = Math.max(FULL[1], Math.min(FULL[1] + FULL[3] - vh, y));
    return [x, y, vw, vh];
  }
  function updateMap() {
    mapCounts = counts(S.data.projects.filter(function (p) { return matches(p, true); }));
    INDIA.states.forEach(function (s) {
      var o = mapCounts[s.code], k = kind(o), e = els[s.code];
      e.g.setAttribute('class', 'st st--' + k + (SMALL.indexOf(s.code) > -1 ? ' st--small' : '') + (S.f.state === s.code ? ' is-sel' : ''));
      e.g.setAttribute('aria-label', s.name + ': ' + countText(o));
      e.g.setAttribute('aria-pressed', String(S.f.state === s.code));
      var n = o ? o.total : 0;
      e.badge.style.display = n ? '' : 'none'; e.num.textContent = n || '';
      if (e.label) { e.label.style.display = n ? 'none' : ''; e.label.setAttribute('class', 'st-label' + (k === 'none' || k === 'planned' ? '' : ' st-label--on')); }
    });
    if (S.f.state && els[S.f.state]) els[S.f.state].g.parentNode.appendChild(els[S.f.state].g);
    $('#mapBack').hidden = !S.f.state;
    $('#mapTitle').textContent = S.f.state ? byCode[S.f.state].name : 'All India';
    $$('#mapChips .chip').forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-code') === S.f.state); });
  }

  /* ── side panel ── */
  function miniList(list) {
    var ul = el('ul', 'mini');
    list.forEach(function (p) {
      var li = el('li'), a = el('a');
      a.href = BF.projectUrl(p); a.setAttribute('data-project', p.id);
      var cover = BF.safeUrl(p.cover_image);
      a.innerHTML = '<span class="mini-img"' + (cover ? ' style="background-image:url(&quot;' + esc(cover) + '&quot;)"' : '') + '></span><span class="mini-t"><b>' + esc(p.title) + '</b><small><i class="dot dot--' + p.status + '"></i>' + BF.STATUS[p.status] + (p.district || p.location ? ' · ' + esc(p.district || p.location) : '') + '</small></span>';
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function renderPanel() {
    var panel = $('#panel'); panel.innerHTML = '';
    var all = S.data.projects, c = counts(all);
    if (S.f.state && byCode[S.f.state]) {
      var s = byCode[S.f.state], list = all.filter(function (p) { return p.states.indexOf(s.code) > -1; }), o = c[s.code];
      var back = el('button', 'back', '← All India'); back.type = 'button'; back.addEventListener('click', function () { go('atlas'); }); panel.appendChild(back);
      panel.appendChild(el('p', 'kicker', s.type === 'ut' ? 'Union Territory' : 'State'));
      panel.appendChild(el('h3', 'panel-h', esc(s.name)));
      if (!list.length) {
        panel.appendChild(el('p', 'muted', 'No project records have been published for ' + esc(s.name) + ' yet.'));
        var a = el('a', 'btn btn--line-d', 'Discuss a programme in ' + esc(s.name)); a.href = 'index.html#contact'; a.setAttribute('data-interest', 'Corporate CSR Partnership'); panel.appendChild(a);
        return;
      }
      var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); };
      var facts = [
        ['Published projects', String(o.total)],
        ['Status', [o.ongoing && o.ongoing + ' ongoing', o.completed && o.completed + ' completed', o.planned && o.planned + ' planned'].filter(Boolean).join(' · ')],
        ['Focus areas', uniq(list.map(function (p) { return p.category; })).join(', ')],
        ['Districts covered', uniq(list.map(function (p) { return p.district; })).join(', ')],
        ['Corporate partners', uniq([].concat.apply([], list.map(function (p) { return BF.partnersOf(p, S.data).map(function (x) { return x.name; }); }))).join(', ')]
      ].filter(function (r) { return r[1]; });
      panel.appendChild(el('dl', 'facts', facts.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('')));
      panel.appendChild(el('p', 'panel-sub', 'Projects in ' + esc(s.name)));
      panel.appendChild(miniList(list));
      var more = el('a', 'more', 'See these projects in detail ↓'); more.href = '#projects'; panel.appendChild(more);
      return;
    }
    panel.appendChild(el('p', 'kicker', 'Overview'));
    panel.appendChild(el('h3', 'panel-h', 'All India'));
    var codes = Object.keys(c).sort(function (a, b) { return c[b].total - c[a].total || byCode[a].name.localeCompare(byCode[b].name); });
    if (!all.length) panel.appendChild(el('p', 'muted', 'No project records have been published yet. States and Union Territories are highlighted on the map as soon as a project is published for them.'));
    else {
      panel.appendChild(el('p', 'muted', plural(all.length, 'published project') + ' across ' + plural(codes.length, 'state or Union Territory', 'states and Union Territories') + '. Select a highlighted area on the map, or choose from the list.'));
      var act = el('ul', 'state-list state-list--active');
      codes.forEach(function (code) { act.appendChild(stateRow(byCode[code], c[code])); });
      panel.appendChild(act);
    }
    panel.appendChild(el('p', 'panel-sub', 'All states and Union Territories'));
    var search = el('input', 'state-search'); search.type = 'search'; search.placeholder = 'Search a state or Union Territory'; search.setAttribute('aria-label', 'Search a state or Union Territory');
    panel.appendChild(search);
    var ul = el('ul', 'state-list state-list--all');
    INDIA.states.forEach(function (s) { ul.appendChild(stateRow(s, c[s.code])); });
    panel.appendChild(ul);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      $$('li', ul).forEach(function (li) { li.hidden = q && li.getAttribute('data-name').indexOf(q) < 0; });
    });
  }
  function stateRow(s, o) {
    var li = el('li'); li.setAttribute('data-name', (s.name + ' ' + s.code).toLowerCase());
    var b = el('button'); b.type = 'button';
    b.innerHTML = '<i class="dot dot--' + kind(o) + '"></i><span>' + esc(s.name) + '</span>' + (o && o.total ? '<em>' + o.total + '</em>' : '');
    b.setAttribute('aria-label', s.name + ': ' + countText(o));
    b.addEventListener('click', function () { go('state=' + s.code); });
    li.appendChild(b); return li;
  }

  /* ── statistics ── */
  function renderStats() {
    var all = S.data.projects, ul = $('#stats'), note = $('#statsNote');
    ul.innerHTML = '';
    if (!all.length) { ul.hidden = true; note.hidden = false; return; }
    ul.hidden = false; note.hidden = true;
    var c = counts(all), reached = 0;
    all.forEach(function (p) { var n = Number(p.beneficiaries_reached); if (n > 0 && isFinite(n)) reached += n; });
    var partnerIds = {}; all.forEach(function (p) { BF.partnersOf(p, S.data).forEach(function (x) { partnerIds[x.id] = 1; }); });
    var items = [
      [all.length, 'Published projects'],
      [Object.keys(c).length, 'States and UTs covered'],
      [all.filter(function (p) { return p.status === 'ongoing'; }).length, 'Ongoing projects'],
      [all.filter(function (p) { return p.status === 'completed'; }).length, 'Completed projects'],
      [reached, 'Verified beneficiaries reached'],
      [Object.keys(partnerIds).length, 'Corporate partners']
    ].filter(function (r, i) { return i < 2 || r[0] > 0; });
    items.forEach(function (r) {
      var li = el('li', '', '<strong>0</strong><span>' + r[1] + '</span>'), num = li.firstChild, end = r[0];
      ul.appendChild(li);
      if (BF.reduced || end < 4) { num.textContent = end.toLocaleString('en-IN'); return; }
      var t0 = null;
      requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1100);
        num.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      });
    });
  }

  /* ── filters and cards ── */
  function fillSelect(sel, opts, first) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + first + '</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
    sel.value = cur;
  }
  function setupFilters() {
    var all = S.data.projects, c = counts(all);
    fillSelect($('#fState'), INDIA.states.map(function (s) { return [s.code, s.name + (c[s.code] ? ' (' + c[s.code].total + ')' : '')]; }), 'All India');
    var cats = BF.CATEGORIES.slice(); all.forEach(function (p) { if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); });
    fillSelect($('#fCategory'), cats.map(function (x) { return [x, x]; }), 'All focus areas');
    fillSelect($('#fStatus'), Object.keys(BF.STATUS).map(function (k) { return [k, BF.STATUS[k]]; }), 'Any status');
    fillSelect($('#fPartner'), S.data.partners.map(function (x) { return [x.id, x.name]; }), 'All partners');
    $('#fPartner').closest('label').hidden = !S.data.partners.length;
    $('#fState').addEventListener('change', function (e) { go(e.target.value ? 'state=' + e.target.value : 'projects', true); });
    $('#fCategory').addEventListener('change', function (e) { S.f.category = e.target.value; refresh(); });
    $('#fStatus').addEventListener('change', function (e) { S.f.status = e.target.value; refresh(); });
    $('#fPartner').addEventListener('change', function (e) { S.f.partner = e.target.value; refresh(); });
    var t; $('#fQ').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { S.f.q = e.target.value.trim(); refresh(); }, 160); });
    $('#filters').addEventListener('submit', function (e) { e.preventDefault(); });
    $('#fReset').addEventListener('click', function () { S.f = { state: '', category: '', status: '', partner: '', q: '' }; $('#fQ').value = ''; go('projects', true); });
  }
  function renderGrid() {
    var all = S.data.projects, list = all.filter(function (p) { return matches(p); });
    var grid = $('#projGrid'), empty = $('#projEmpty'), f = S.f;
    ['State', 'Category', 'Status', 'Partner'].forEach(function (k) { $('#f' + k).value = f[k.toLowerCase()] || ''; });
    grid.innerHTML = '';
    list.forEach(function (p) { grid.appendChild(BF.projectCard(p, S.data, { light: true })); });
    var filtered = f.state || f.category || f.status || f.partner || f.q;
    $('#fReset').hidden = !filtered;
    var bits = [];
    if (f.state && byCode[f.state]) bits.push(byCode[f.state].name);
    if (f.category) bits.push(f.category);
    if (f.status) bits.push(BF.STATUS[f.status]);
    if (f.partner && S.data.partnerById[f.partner]) bits.push(S.data.partnerById[f.partner].name);
    if (f.q) bits.push('“' + f.q + '”');
    $('#resultLine').textContent = !all.length ? '' : (filtered ? 'Showing ' + list.length + ' of ' + plural(all.length, 'published project') + ' — ' + bits.join(' · ') : 'Showing all ' + plural(all.length, 'published project') + ' — All India');
    empty.hidden = !!list.length;
    if (!list.length) empty.innerHTML = !all.length
      ? '<h3 class="h3">No project records have been published yet.</h3><p class="muted">Projects appear here, and on the map, as soon as their records are published.</p>'
      : '<h3 class="h3">No published projects match these filters.</h3><p class="muted">Try removing a filter, or return to the All India view.</p>';
  }

  /* ── project detail ── */
  function block(title, html) { return BF.hasText(html) ? '<section class="d-block"><h3>' + title + '</h3><div class="rich">' + BF.sanitize(html) + '</div></section>' : ''; }
  function renderDetail() {
    var box = $('#detail'), listUi = $('#listUi');
    var p = S.project && S.data.projects.filter(function (x) { return x.id === S.project; })[0];
    if (!p) {
      box.hidden = true; box.innerHTML = ''; listUi.hidden = false;
      if (S.project) { S.project = null; $('#projEmpty').hidden = false; $('#projEmpty').innerHTML = '<h3 class="h3">This project is not available.</h3><p class="muted">It may have been unpublished or its address may have changed.</p>'; }
      return;
    }
    listUi.hidden = true; box.hidden = false;
    var partners = BF.partnersOf(p, S.data), cover = BF.safeUrl(p.cover_image), h = '';
    h += '<button type="button" class="back" id="detailBack">← Back to projects</button>';
    if (p.__preview) h += '<p class="preview-bar">Preview — this project is saved as a draft and is not visible to the public.</p>';
    h += '<header class="d-head"><p class="kicker">' + esc([p.category, p.code].filter(Boolean).join(' · ')) + '</p><h2 class="h2">' + esc(p.title) + '</h2>' +
      (BF.place(p) ? '<p class="d-place">' + esc(BF.place(p)) + '</p>' : '') +
      '<p class="d-tags"><span class="tag tag--live tag--' + p.status + '">' + BF.STATUS[p.status] + '</span>' + (BF.period(p) ? '<span class="d-period">' + esc(BF.period(p)) + '</span>' : '') + '</p></header>';
    if (cover) h += '<figure class="d-cover"><img src="' + esc(cover) + '" alt="' + esc(p.cover_caption || p.title) + '" style="object-position:' + esc(p.cover_focus || '50% 50%') + '">' + (p.cover_caption ? '<figcaption>' + esc(p.cover_caption) + '</figcaption>' : '') + '</figure>';
    h += '<div class="d-grid"><div class="d-main">';
    if (p.summary) h += '<p class="d-lead">' + esc(p.summary) + '</p>';
    h += block('Background and community needs', p.background) + block('Objectives', p.objectives) + block('Scope of work', p.scope) + block('Implementation activities', p.activities) + block('Work completed and outcomes', p.outcomes);
    var ups = p.updates.filter(function (u) { return u && (u.text || u.title); });
    if (ups.length) h += '<section class="d-block"><h3>Project updates</h3><ol class="timeline">' + ups.map(function (u) { return '<li>' + (u.date ? '<time>' + esc(BF.fmtDate(u.date)) + '</time>' : '') + (u.title ? '<b>' + esc(u.title) + '</b>' : '') + (u.text ? '<p>' + esc(u.text) + '</p>' : '') + '</li>'; }).join('') + '</ol></section>';
    var gal = p.gallery.filter(function (g) { return g && BF.safeUrl(g.url); });
    if (gal.length) h += '<section class="d-block"><h3>Photographs</h3><div class="gallery">' + gal.map(function (g) {
      return '<figure><a href="' + esc(BF.safeUrl(g.url)) + '" target="_blank" rel="noopener"><img src="' + esc(BF.safeUrl(g.url)) + '" alt="' + esc(g.caption || p.title) + '" loading="lazy"></a>' + (g.caption || g.date ? '<figcaption>' + esc(g.caption || '') + (g.date ? '<time>' + esc(BF.fmtDate(g.date)) + '</time>' : '') + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div></section>';
    var links = function (arr, label) { arr = arr.filter(function (d) { return d && BF.safeUrl(d.url); }); return arr.length ? '<section class="d-block"><h3>' + label + '</h3><ul class="doclinks">' + arr.map(function (d) { return '<li><a href="' + esc(BF.safeUrl(d.url)) + '" target="_blank" rel="noopener">' + esc(d.title || d.url) + '</a></li>'; }).join('') + '</ul></section>' : ''; };
    h += links(p.videos, 'Videos') + links(p.documents, 'Reports and documents');
    h += '</div><aside class="d-side">';
    var reached = Number(p.beneficiaries_reached) > 0 ? Number(p.beneficiaries_reached).toLocaleString('en-IN') + (p.beneficiaries_note ? ' — ' + p.beneficiaries_note : '') : '';
    var facts = [['Project ID', p.code], ['Status', BF.STATUS[p.status]], ['Timeline', BF.period(p)], ['State / UT', BF.stateNames(p.states).join(', ')], ['District', p.district], ['Location', p.location], ['CSR focus area', p.category], ['Target beneficiaries', p.target_beneficiaries], ['Beneficiaries reached (verified)', reached], ['Implementation partners', p.implementation_partners], ['Other stakeholders', p.stakeholders]].filter(function (r) { return r[1]; });
    h += '<dl class="facts">' + facts.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>';
    var ind = p.indicators.filter(function (i) { return i && i.label && i.value; });
    if (ind.length) h += '<h4 class="side-h">Impact indicators</h4><ul class="indicators">' + ind.map(function (i) { return '<li><strong>' + esc(i.value) + '</strong><span>' + esc(i.label) + '</span></li>'; }).join('') + '</ul>';
    if (partners.length) h += '<h4 class="side-h">Corporate CSR partner' + (partners.length > 1 ? 's' : '') + '</h4><div class="plogos" id="detailPartners"></div>';
    h += '</aside></div>';
    box.innerHTML = h;
    var dp = $('#detailPartners', box); if (dp) partners.forEach(function (pt) { dp.appendChild(BF.partnerTile(pt, 1)); });
    $$('img', box).forEach(function (im) { im.onerror = function () { var f = im.closest('figure'); if (f) f.remove(); }; });
    $('#detailBack').addEventListener('click', function () { go(S.f.state ? 'state=' + S.f.state : 'projects', true); scrollToEl($('#projects')); });
  }

  /* ── partners ── */
  function renderPartners() {
    var grid = $('#partnerGrid'), empty = $('#partnerEmpty'), list = S.data.partners.filter(function (x) { return !x.__preview; });
    grid.innerHTML = ''; empty.hidden = !!list.length;
    list.forEach(function (pt) {
      var n = S.data.projects.filter(function (p) { return p.partner_ids.indexOf(pt.id) > -1; }).length;
      var card = el('article', 'partner');
      card.appendChild(BF.partnerTile(pt, 0));
      var body = el('div', 'partner-body');
      body.innerHTML = '<h3 class="h3">' + esc(pt.name) + '</h3>' + (pt.status ? '<p class="kicker">' + esc(pt.status === 'past' ? 'Past partnership' : pt.status === 'active' ? 'Active partnership' : pt.status) + '</p>' : '') + (BF.hasText(pt.description) ? '<div class="rich muted">' + BF.sanitize(pt.description) + '</div>' : '');
      var row = el('p', 'partner-links');
      if (n) { var a = el('a', '', 'View ' + plural(n, 'project') + ' →'); a.href = '#partner=' + encodeURIComponent(pt.id); row.appendChild(a); }
      var site = /^https?:\/\//i.test(pt.website || '') ? pt.website : '';
      if (site) { var w = el('a', '', 'Company website ↗'); w.href = site; w.target = '_blank'; w.rel = 'noopener'; row.appendChild(w); }
      if (row.children.length) body.appendChild(row);
      card.appendChild(body); grid.appendChild(card);
    });
  }

  /* ── routing: #state=UK, #project=ID, #partner=ID ── */
  function scrollToEl(node) { if (node) node.scrollIntoView({ behavior: BF.reduced ? 'auto' : 'smooth', block: 'start' }); }
  function go(hash, quiet) {
    /* on a project's own page (/projects/<slug>) every other view lives on the main Projects page */
    if (window.BF_INITIAL_PROJECT) { location.href = '/projects.html#' + hash; return; }
    history.pushState(null, '', location.pathname + location.search + '#' + hash);
    route(quiet ? 'quiet' : 'user');
  }
  function refresh() { updateMap(); renderPanel(); renderGrid(); }
  function route(mode) {
    var h = decodeURIComponent(location.hash.slice(1)), m = /^(state|project|partner)=(.+)$/.exec(h);
    var prevState = S.f.state;
    S.project = null;
    if (m && m[1] === 'project') S.project = m[2];
    else if (window.BF_INITIAL_PROJECT && !h) S.project = String(window.BF_INITIAL_PROJECT);
    else if (m && m[1] === 'state') S.f.state = byCode[m[2].toUpperCase()] ? m[2].toUpperCase() : '';
    else if (m && m[1] === 'partner') { S.f.partner = S.data.partnerById[m[2]] ? m[2] : ''; S.f.state = ''; }
    else if (h === 'atlas' || h === 'projects' || h === '') S.f.state = '';
    refresh(); renderDetail();
    if (S.f.state !== prevState || mode === 'load') zoomTo(S.f.state ? stateView(byCode[S.f.state]) : FULL.slice());
    if (mode === 'quiet') return;
    if (S.project && window.BF_INITIAL_PROJECT && mode === 'load') { /* the page opened directly on this project: stay at the top */ }
    else if (S.project) { scrollToEl($('#projects')); var d = $('#detail'); if (!d.hidden) d.focus({ preventScroll: true }); }
    else if (m && m[1] === 'partner') scrollToEl($('#projects'));
    else if (mode !== 'user' && m && m[1] === 'state') scrollToEl($('#atlas'));
    else if (mode !== 'user' && h && !m) scrollToEl(document.getElementById(h));
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildMap();
    $('#demoBar').hidden = !BF.demo;
    BF.load().then(function (d) {
      S.data = d;
      setupFilters(); renderStats(); renderPartners();
      route('load');
      window.addEventListener('popstate', function () { route('pop'); });
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
        var h = a.getAttribute('href').slice(1);
        if (/^(state|project|partner)=/.test(h)) { e.preventDefault(); go(h); }
      });
      document.documentElement.classList.add('bf-loaded');
    });
  });
})();
