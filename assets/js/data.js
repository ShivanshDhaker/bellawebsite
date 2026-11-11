/* Bella Foundation — shared data layer.
   One source of truth for projects, partners and editable website content.
   • If a Supabase backend is configured, published content is read from it.
   • Otherwise the site reads the plain files in /data (projects.json, partners.json, content.json).
   • Adding ?demo=1 to the address loads clearly-labelled sample data from /data/demo. */
(function () {
  'use strict';
  var BF = window.BF = window.BF || {};
  var params = new URLSearchParams(location.search);
  BF.demo = params.get('demo') === '1';
  BF.previewId = params.get('preview') || '';
  BF.root = (document.currentScript && document.currentScript.getAttribute('data-root')) || '';
  /* sample and preview views must never be indexed by search engines */
  if (BF.demo || BF.previewId) { var rb = document.createElement('meta'); rb.name = 'robots'; rb.content = 'noindex, nofollow'; document.head.appendChild(rb); }

  BF.STATUS = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed' };
  BF.CATEGORIES = ['Education', 'Healthcare and Sanitation', "Women's Empowerment", 'Environment and Sustainability', 'Rural Development and Livelihoods', 'Skill Development'];

  /* ── safe HTML for rich-text fields ── */
  var OK = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, UL: 1, OL: 1, LI: 1, A: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, SPAN: 1, DIV: 1 };
  BF.sanitize = function (html) {
    if (html == null) return '';
    var doc = new DOMParser().parseFromString('<div>' + String(html) + '</div>', 'text/html');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 8) { n.remove(); return; }
        if (n.nodeType !== 1) return;
        if (!OK[n.tagName]) {
          if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|MATH|FORM|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(n.tagName)) { n.remove(); return; }
          walk(n); while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n); n.remove(); return;
        }
        Array.prototype.slice.call(n.attributes).forEach(function (a) {
          var keep = n.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:|tel:|#|\/|[a-z0-9_\-.]+\.html)/i.test(a.value.trim());
          if (!keep) n.removeAttribute(a.name);
        });
        if (n.tagName === 'A') { n.setAttribute('rel', 'noopener'); if (/^https?:/i.test(n.getAttribute('href') || '')) n.setAttribute('target', '_blank'); }
        if (n.tagName === 'DIV') { var p = doc.createElement('p'); while (n.firstChild) p.appendChild(n.firstChild); n.parentNode.replaceChild(p, n); n = p; }
        walk(n);
      });
    })(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
  };
  BF.plain = function (html) { var d = document.createElement('div'); d.innerHTML = BF.sanitize(html); return (d.textContent || '').trim(); };
  BF.hasText = function (html) { return !!BF.plain(html); };
  BF.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  BF.safeUrl = function (u) { u = String(u || '').trim(); return /^(https?:\/\/|\/|\.\.?\/|assets\/|data:image\/)/i.test(u) ? u : ''; };
  BF.fmtDate = function (d) {
    if (!d) return '';
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(d); if (!m) return String(d);
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1] + ' ' + m[1];
  };
  BF.period = function (p) {
    var a = BF.fmtDate(p.start_date), b = BF.fmtDate(p.end_date);
    if (a && b) return a === b ? a : a + ' – ' + b;
    if (a) return a + (p.status === 'ongoing' ? ' – ongoing' : '');
    return b || '';
  };
  BF.arr = function (v) { if (Array.isArray(v)) return v; if (typeof v === 'string' && v) { try { var j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch (e) { return []; } } return []; };

  /* ── backend configuration ── */
  var cfgPromise = null;
  BF.getConfig = function () {
    if (cfgPromise) return cfgPromise;
    cfgPromise = (async function () {
      var c = window.BF_SUPABASE || {};
      if (c.url && c.key) return { url: c.url, key: c.key };
      if (location.protocol === 'file:') return null;
      try {
        var res = await fetch('/api/config', { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        var j = await res.json();
        return j && j.url && j.key ? { url: j.url, key: j.key } : null;
      } catch (e) { return null; }
    })();
    return cfgPromise;
  };
  BF.client = async function () {
    if (BF._client !== undefined) return BF._client;
    var c = await BF.getConfig();
    BF._client = c && window.BFSupabase ? new window.BFSupabase(c.url, c.key) : null;
    return BF._client;
  };

  function normProject(p) {
    p.states = BF.arr(p.states).map(function (s) { return String(s).toUpperCase(); });
    p.partner_ids = BF.arr(p.partner_ids).map(String);
    p.gallery = BF.arr(p.gallery); p.documents = BF.arr(p.documents); p.videos = BF.arr(p.videos);
    p.indicators = BF.arr(p.indicators); p.updates = BF.arr(p.updates);
    p.id = String(p.id);
    p.status = BF.STATUS[p.status] ? p.status : 'ongoing';
    return p;
  }
  function sortProjects(a, b) {
    return (a.sort_order || 0) - (b.sort_order || 0) || String(b.start_date || '').localeCompare(String(a.start_date || '')) || String(a.title).localeCompare(String(b.title));
  }
  async function getJSON(path) {
    try { var r = await fetch(BF.root + path, { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
  }

  var loadPromise = null;
  BF.load = function () {
    if (loadPromise) return loadPromise;
    loadPromise = (async function () {
      var out = { projects: [], partners: [], content: {}, source: 'static' };
      var sb = BF.demo ? null : await BF.client();
      var ok = false;
      if (sb) {
        try {
          var r = await Promise.all([
            sb.select('projects', { visibility: 'eq.published' }, true),
            sb.select('partners', { visibility: 'eq.published', order: 'sort_order.asc,name.asc' }, true),
            sb.select('site_content', {}, true)
          ]);
          out.projects = r[0] || []; out.partners = r[1] || [];
          (r[2] || []).forEach(function (row) { out.content[row.key] = row.value; });
          out.source = 'supabase'; ok = true;
          if (BF.previewId && sb.session) {
            try {
              var pv = await sb.select('projects', { id: 'eq.' + BF.previewId });
              if (pv && pv[0] && !out.projects.some(function (p) { return String(p.id) === String(pv[0].id); })) { pv[0].__preview = true; out.projects.push(pv[0]); }
              var pp = await sb.select('partners', {});
              (pp || []).forEach(function (x) { if (!out.partners.some(function (y) { return String(y.id) === String(x.id); })) { x.__preview = true; out.partners.push(x); } });
            } catch (e) {}
          }
        } catch (e) { if (window.console) console.warn('Bella Foundation: backend unavailable, using the files in /data instead.', e.message); }
      }
      if (!ok) {
        var dir = BF.demo ? 'data/demo/' : 'data/';
        var f = await Promise.all([getJSON(dir + 'projects.json'), getJSON(dir + 'partners.json'), BF.demo ? null : getJSON('data/content.json')]);
        out.projects = ((f[0] && (f[0].projects || f[0])) || []).filter(function (p) { return p && p.title && (p.visibility || 'published') === 'published'; });
        out.partners = ((f[1] && (f[1].partners || f[1])) || []).filter(function (p) { return p && p.name && (p.visibility || 'published') === 'published'; });
        out.content = (f[2] && typeof f[2] === 'object') ? f[2] : {};
        out.source = BF.demo ? 'demo' : 'static';
      }
      BF.source = out.source;
      out.projects = out.projects.map(normProject).sort(sortProjects);
      out.partners.forEach(function (p) { p.id = String(p.id); });
      out.partnerById = {}; out.partners.forEach(function (p) { out.partnerById[p.id] = p; });
      return out;
    })();
    return loadPromise;
  };
})();

/* State and Union Territory names (codes used throughout the site and in the project data). */
(function () {
  var BF = window.BF;
  BF.STATES = [
    ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'], ['CG', 'Chhattisgarh'], ['GA', 'Goa'], ['GJ', 'Gujarat'],
    ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JH', 'Jharkhand'], ['KA', 'Karnataka'], ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'],
    ['MN', 'Manipur'], ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
    ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'], ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
    ['AN', 'Andaman and Nicobar Islands', 1], ['CH', 'Chandigarh', 1], ['DH', 'Dadra and Nagar Haveli and Daman and Diu', 1], ['DL', 'Delhi', 1],
    ['JK', 'Jammu and Kashmir', 1], ['LA', 'Ladakh', 1], ['LD', 'Lakshadweep', 1], ['PY', 'Puducherry', 1]
  ].map(function (s) { return { code: s[0], name: s[1], type: s[2] ? 'ut' : 'state' }; });
  BF.STATE_NAME = {}; BF.STATES.forEach(function (s) { BF.STATE_NAME[s.code] = s.name; });
  BF.stateNames = function (codes) { return BF.arr(codes).map(function (c) { return BF.STATE_NAME[c] || c; }); };
  BF.place = function (p) {
    var parts = [];
    if (p.location) parts.push(p.location);
    if (p.district && String(p.district).toLowerCase() !== String(p.location || '').toLowerCase()) parts.push(/district/i.test(p.district) ? p.district : p.district + ' district');
    var st = BF.stateNames(p.states); if (st.length) parts.push(st.length > 3 ? st.length + ' states and UTs' : st.join(', '));
    return parts.join(', ');
  };
  /* The address of a project. With the database connected every published project has its own page
     (/projects/<slug>) that search engines can read; otherwise it opens inside the Projects page. */
  BF.projectUrl = function (p, base) {
    if (BF.source === 'supabase' && p.slug && !p.__preview && !BF.previewId) return '/projects/' + encodeURIComponent(p.slug);
    return (base || '') + '#project=' + encodeURIComponent(p.id);
  };
  BF.partnersOf = function (p, data) { return p.partner_ids.map(function (id) { return data.partnerById[id]; }).filter(Boolean); };

  /* A project card, used on the homepage preview and on the Projects & Impact page. */
  BF.projectCard = function (p, data, opt) {
    opt = opt || {};
    var a = document.createElement('a');
    a.className = 'pcard pcard--link' + (opt.light ? ' pcard--light' : '');
    a.href = BF.projectUrl(p, opt.base);
    a.setAttribute('data-project', p.id);
    var cover = BF.safeUrl(p.cover_image), html = '';
    html += '<div class="pcard-img' + (cover ? '' : ' pcard-img--empty') + '">' + (cover ? '<img src="' + BF.esc(cover) + '" alt="' + BF.esc(p.cover_caption || p.title) + '" loading="lazy" style="object-position:' + BF.esc(p.cover_focus || '50% 50%') + '">' : '') +
      '<span class="tag tag--live tag--' + p.status + '">' + BF.STATUS[p.status] + '</span></div>';
    html += '<div class="pcard-body">';
    if (p.category) html += '<p class="kicker">' + BF.esc(p.category) + '</p>';
    html += '<h3 class="h3">' + BF.esc(p.title) + '</h3>';
    if (p.summary) html += '<p>' + BF.esc(p.summary) + '</p>';
    var rows = [['Location', BF.place(p)], ['Partner', BF.partnersOf(p, data).map(function (x) { return x.name; }).join(', ')], ['Period', BF.period(p)]].filter(function (r) { return r[1]; });
    if (rows.length) html += '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + BF.esc(r[1]) + '</dd>'; }).join('') + '</dl>';
    html += '<span class="pcard-more">View project details <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8"/></svg></span></div>';
    a.innerHTML = html;
    var img = a.querySelector('img'); if (img) img.onerror = function () { img.parentNode.classList.add('pcard-img--empty'); img.remove(); };
    return a;
  };
  BF.partnerTile = function (pt, count, base) {
    var el = document.createElement(count ? 'a' : 'div');
    el.className = 'plogo';
    if (count) el.href = (base || '') + '#partner=' + encodeURIComponent(pt.id);
    var logo = pt.logo_authorised !== false ? BF.safeUrl(pt.logo) : '';
    el.innerHTML = (logo ? '<img src="' + BF.esc(logo) + '" alt="' + BF.esc(pt.name) + '" loading="lazy">' : '<span class="plogo-name">' + BF.esc(pt.name) + '</span>');
    el.setAttribute('aria-label', pt.name + (count ? ' — ' + count + (count === 1 ? ' project' : ' projects') : ''));
    var img = el.querySelector('img'); if (img) img.onerror = function () { el.innerHTML = '<span class="plogo-name">' + BF.esc(pt.name) + '</span>'; };
    return el;
  };
})();
