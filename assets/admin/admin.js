/* Bella Foundation — admin dashboard.
   Everything saved here is written to the Supabase database and file storage of the project.
   Nothing is kept only in the browser: if the backend is not connected, the dashboard says so
   and refuses to pretend. */
(function () {
  'use strict';
  var BF = window.BF, sb = null, me = null, dirty = false;
  var SITE = '../';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = $('#root');
  var cache = { projects: null, partners: null, content: null, media: null };

  /* ── small helpers ── */
  function h(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value') n.value = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(n, x); }); return; }
    n.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function toast(msg, kind) {
    var t = h('div', { class: 'toast ' + (kind || ''), text: msg });
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'err' ? 8000 : 4000);
  }
  function fail(e, what) { console.error(e); toast((what ? what + ': ' : '') + friendly(e), 'err'); }
  function friendly(e) {
    var m = (e && e.message) || String(e);
    if (/row-level security|permission denied|not authori[sz]ed|Unauthorized/i.test(m)) return 'This account is not allowed to make changes. Check that it is listed as an administrator (see the setup guide, step 4).';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Could not reach the server. Check your internet connection and try again.';
    if (/duplicate key/i.test(m)) return 'That value is already in use (for example, a Project ID). Please change it.';
    if (/Payload too large|exceeded the maximum|too large/i.test(m)) return 'That file is too large to upload.';
    return m;
  }
  function dialog(build, wide) {
    return new Promise(function (resolve) {
      var ov = h('div', { class: 'overlay' }), box = h('div', { class: 'dialog' + (wide ? ' dialog--wide' : ''), role: 'dialog', 'aria-modal': 'true' });
      var prev = document.activeElement;
      function close(v) { ov.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); resolve(v); }
      function key(e) { if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', key);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(null); });
      build(box, close); ov.appendChild(box); document.body.appendChild(ov);
      var f = $('button,input,select,textarea', box); if (f) f.focus();
    });
  }
  function confirmBox(title, text, yes, danger) {
    return dialog(function (box, close) {
      add(box, [h('h2', { text: title }), h('p', { class: 'muted', text: text }),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: function () { close(false); } }),
          h('button', { class: 'btn ' + (danger ? 'btn--danger' : 'btn--pri'), type: 'button', text: yes || 'Confirm', onclick: function () { close(true); } }))]);
    });
  }
  async function busy(btn, fn) {
    var old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Working…';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
  }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file'; }
  function when(d) { if (!d) return ''; var x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function siteUrl(u) { u = BF.safeUrl(u); return u && !/^(https?:|data:|\/)/i.test(u) ? SITE + u : u; }
  function field(label, input, help, full) {
    var id = input.id || (input.id = 'f' + Math.random().toString(36).slice(2, 9));
    return h('div', { class: 'fld' + (full ? ' full' : '') }, h('label', { for: id, text: label }), input, help ? h('small', { text: help }) : null);
  }
  function markDirty() { dirty = true; }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ── rich text editor ── */
  function rte(value, placeholder) {
    var body = h('div', { class: 'rte-body', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'data-ph': placeholder || 'Write here…', html: BF.sanitize(value || '') });
    function cmd(c, v) { body.focus(); document.execCommand(c, false, v); markDirty(); }
    var bar = h('div', { class: 'rte-bar' },
      h('button', { type: 'button', title: 'Bold', html: '<b>B</b>', onclick: function () { cmd('bold'); } }),
      h('button', { type: 'button', title: 'Italic', html: '<i>I</i>', onclick: function () { cmd('italic'); } }),
      h('button', { type: 'button', title: 'Bulleted list', text: '• List', onclick: function () { cmd('insertUnorderedList'); } }),
      h('button', { type: 'button', title: 'Numbered list', text: '1. List', onclick: function () { cmd('insertOrderedList'); } }),
      h('button', { type: 'button', title: 'Add a link', text: 'Link', onclick: function () { var u = prompt('Paste the web address (starting with https://)'); if (u && /^https?:\/\//i.test(u.trim())) cmd('createLink', u.trim()); else if (u) toast('A link must start with https://', 'err'); } }),
      h('button', { type: 'button', title: 'Remove formatting', text: 'Clear', onclick: function () { cmd('removeFormat'); cmd('unlink'); } }));
    body.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    body.addEventListener('input', markDirty);
    var wrap = h('div', { class: 'rte' }, bar, body);
    wrap.getValue = function () { var v = BF.sanitize(body.innerHTML); return BF.hasText(v) ? v : ''; };
    return wrap;
  }

  /* ── uploads ── */
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That image could not be read.')); };
      im.src = url;
    });
  }
  async function prepare(file, opt) {
    opt = opt || {};
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { blob: file, type: file.type || 'application/octet-stream', ext: ext, w: null, h: null };
    var im = await loadImage(file), max = opt.max || 1800, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    var w = Math.round(im.naturalWidth * k), hh = Math.round(im.naturalHeight * k);
    var png = opt.keepPng && file.type === 'image/png', type = png ? 'image/png' : 'image/jpeg';
    var cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    var cx = cv.getContext('2d');
    if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, hh); }
    cx.drawImage(im, 0, 0, w, hh);
    var blob = await new Promise(function (r) { cv.toBlob(r, type, 0.82); });
    if (!blob || (k === 1 && file.type === type && blob.size >= file.size)) { blob = file; type = file.type; } else ext = png ? 'png' : 'jpg';
    return { blob: blob, type: type, ext: ext, w: w, h: hh };
  }
  var IMG_OK = /^image\/(jpeg|png|webp|gif|svg\+xml)$/, DOC_OK = /^application\/pdf$/;
  async function uploadOne(file, folder, opt) {
    opt = opt || {};
    var isImg = IMG_OK.test(file.type), isDoc = DOC_OK.test(file.type);
    if (!isImg && !isDoc) throw new Error('“' + file.name + '” is not a supported file. Upload photographs (JPG, PNG, WebP), logos (PNG, SVG) or PDF documents.');
    if (opt.only === 'image' && !isImg) throw new Error('Please choose an image file.');
    if (opt.only === 'pdf' && !isDoc) throw new Error('Please choose a PDF file.');
    if (file.size > 20 * 1024 * 1024) throw new Error('“' + file.name + '” is larger than 20 MB.');
    var p = await prepare(file, opt);
    var base = file.name.replace(/\.[^.]+$/, '');
    var path = opt.path || (folder + '/' + new Date().getFullYear() + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + slug(base) + '.' + (p.ext || 'bin'));
    var url = await sb.upload('media', path, p.blob, p.type);
    var row = { path: path, url: url, name: base, kind: isImg ? 'image' : 'document', mime: p.type, size: p.blob.size, width: p.w, height: p.h };
    if (opt.mediaId) { var u = await sb.update('media', opt.mediaId, { mime: row.mime, size: row.size, width: row.width, height: row.height }); cache.media = null; return u[0]; }
    var saved = await sb.insert('media', row); cache.media = null;
    return saved[0];
  }
  async function uploadMany(files, folder, opt) {
    var out = [], list = Array.prototype.slice.call(files);
    for (var i = 0; i < list.length; i++) {
      var t = h('div', { class: 'toast', text: 'Uploading ' + (i + 1) + ' of ' + list.length + '…' }); $('#toasts').appendChild(t);
      try { out.push(await uploadOne(list[i], folder, opt)); } catch (e) { fail(e, 'Upload failed'); } finally { t.remove(); }
    }
    if (out.length) toast(out.length === 1 ? 'File uploaded.' : out.length + ' files uploaded.', 'ok');
    return out;
  }
  function dropzone(text, accept, multiple, onFiles) {
    var input = h('input', { type: 'file', accept: accept, multiple: multiple, hidden: true, onchange: function () { if (input.files.length) onFiles(input.files); input.value = ''; } });
    var z = h('div', { class: 'drop', tabindex: '0', role: 'button' }, h('strong', { text: text }), h('span', { class: 'small', text: 'Drag files here, or click to choose from your computer' }), input);
    z.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
    z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.remove('over'); }); });
    z.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
    return z;
  }
  async function getMedia() { if (!cache.media) cache.media = await sb.select('media', { order: 'created_at.desc' }); return cache.media; }
  function pickMedia(kind, folder) {
    return dialog(function (box, close) {
      var grid = h('div', { class: 'media-grid' }), q = h('input', { type: 'search', placeholder: 'Search the media library' });
      async function draw() {
        var list = (await getMedia()).filter(function (m) { return m.kind === kind; });
        var term = q.value.trim().toLowerCase();
        if (term) list = list.filter(function (m) { return ((m.name || '') + ' ' + (m.caption || '')).toLowerCase().indexOf(term) > -1; });
        grid.innerHTML = '';
        if (!list.length) add(grid, h('p', { class: 'muted', text: 'Nothing here yet. Upload a file above.' }));
        list.forEach(function (m) {
          add(grid, h('button', { type: 'button', class: 'media-item', onclick: function () { close(m); } },
            kind === 'image' ? h('img', { src: m.url, alt: '', loading: 'lazy' }) : h('div', { class: 'doc', text: 'PDF' }), h('p', { text: m.name || m.path })));
        });
      }
      q.addEventListener('input', draw);
      add(box, [h('h2', { text: kind === 'image' ? 'Choose a photograph' : 'Choose a document' }),
        dropzone(kind === 'image' ? 'Upload a new photograph' : 'Upload a new PDF', kind === 'image' ? 'image/*' : 'application/pdf', false, async function (files) { var r = await uploadMany(files, folder || 'library', { only: kind === 'image' ? 'image' : 'pdf' }); if (r[0]) close(r[0]); }),
        h('div', { class: 'toolbar', style: 'margin-top:14px' }, q), grid,
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: function () { close(null); } }))]);
      draw().catch(fail);
    }, true);
  }
  function focusBox(url, pos, onChange) {
    var p = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(pos || '') || [0, 50, 50];
    var dot = h('i', { style: 'left:' + p[1] + '%;top:' + p[2] + '%' });
    var img = h('img', { src: url, alt: '', style: 'object-position:' + p[1] + '% ' + p[2] + '%' });
    var box = h('div', { class: 'focus-box', title: 'Click the most important part of the photograph' }, img, dot);
    box.addEventListener('click', function (e) {
      var r = box.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / r.width * 100), y = Math.round((e.clientY - r.top) / r.height * 100);
      dot.style.left = x + '%'; dot.style.top = y + '%'; img.style.objectPosition = x + '% ' + y + '%';
      onChange(x + '% ' + y + '%'); markDirty();
    });
    return box;
  }

  /* ── data ── */
  async function projects(force) { if (force || !cache.projects) cache.projects = await sb.select('projects', { order: 'updated_at.desc' }); return cache.projects; }
  async function partners(force) { if (force || !cache.partners) cache.partners = await sb.select('partners', { order: 'sort_order.asc,name.asc' }); return cache.partners; }
  async function content(force) {
    if (force || !cache.content) { cache.content = {}; (await sb.select('site_content', {})).forEach(function (r) { cache.content[r.key] = r.value; }); }
    return cache.content;
  }
  async function saveContent(key, value) {
    await sb.insert('site_content', { key: key, value: value }, { upsert: true, onConflict: 'key' });
    if (cache.content) cache.content[key] = value;
    try { localStorage.removeItem('bf_content_cache'); } catch (e) {}
  }

  /* ── shell ── */
  var NAV = [
    ['dashboard', 'Dashboard'], ['projects', 'Projects'], ['partners', 'Corporate Partners'], ['media', 'Media Library'],
    ['-', 'Website'], ['content', 'Website Content'], ['homepage', 'Homepage'], ['documents', 'Governance Documents'],
    ['-', 'Other'], ['enquiries', 'Enquiries'], ['settings', 'Settings']
  ];
  var views = {};
  function shell(active, title, sub, actions) {
    root.innerHTML = '';
    var side = h('aside', { class: 'side', id: 'side' }, h('div', { class: 'side-logo' }, h('img', { src: SITE + 'assets/logo/bella-foundation-640.png', alt: 'Bella Foundation' })));
    NAV.forEach(function (n) {
      if (n[0] === '-') { add(side, h('p', { class: 'side-sep', text: n[1] })); return; }
      add(side, h('a', { href: '#/' + n[0], class: n[0] === active ? 'on' : '', id: 'nav-' + n[0], text: n[1] }));
    });
    add(side, h('a', { href: SITE + 'index.html', target: '_blank', rel: 'noopener', text: 'View website ↗' }));
    add(side, h('div', { class: 'side-foot' }, 'Signed in as', h('br'), me ? me.email : ''));
    var main = h('main', { class: 'main', id: 'view' },
      h('div', { class: 'top' }, h('div', {}, h('button', { class: 'btn btn--sm menu-btn', type: 'button', text: '☰ Menu', style: 'margin-bottom:10px', onclick: function () { side.classList.toggle('open'); } }), h('h1', { text: title }), sub ? h('p', { text: sub }) : null),
        h('div', { class: 'actions' }, actions || [])));
    side.addEventListener('click', function (e) { if (e.target.closest('a')) side.classList.remove('open'); });
    add(root, h('div', { class: 'app' }, side, main));
    sb.select('enquiries', { handled: 'eq.false', select: 'id' }).then(function (r) { if (r.length) { var a = $('#nav-enquiries'); if (a) add(a, h('em', { text: r.length })); } }).catch(function () {});
    return main;
  }
  async function router() {
    var parts = location.hash.replace(/^#\/?/, '').split('/'), name = parts[0] || 'dashboard';
    if (!views[name]) name = 'dashboard';
    dirty = false;
    try { await views[name](parts[1]); } catch (e) { fail(e, 'This page could not be loaded'); }
    window.scrollTo(0, 0);
  }
  var lastHash = location.hash;
  window.addEventListener('hashchange', async function () {
    if (dirty) {
      var target = location.hash;
      history.replaceState(null, '', lastHash || '#/dashboard');
      var leave = await confirmBox('Leave without saving?', 'You have changes on this page that have not been saved.', 'Leave page', true);
      if (!leave) return;
      dirty = false; history.replaceState(null, '', target);
    }
    lastHash = location.hash;
    if (me) router();
  });
  function nav(hash) { dirty = false; if (location.hash === hash) router(); else location.hash = hash; }

  /* ── sign-in ── */
  function setupScreen(detail) {
    root.innerHTML = '';
    add(root, h('div', { class: 'login' }, h('div', { class: 'login-card setup' },
      h('img', { src: SITE + 'assets/logo/bella-foundation-640.png', alt: 'Bella Foundation' }),
      h('h1', { text: 'The dashboard is not connected yet' }),
      h('p', { text: 'The website is working, but its database has not been connected, so nothing can be saved from here yet.' }),
      detail ? h('div', { class: 'msg err', text: detail }) : null,
      h('ol', {}, h('li', { text: 'Create a free Supabase project.' }), h('li', { text: 'Run the file supabase/schema.sql in its SQL Editor.' }), h('li', { text: 'In Vercel, add the environment variables SUPABASE_URL and SUPABASE_ANON_KEY, then redeploy.' }), h('li', { text: 'Create your administrator login.' })),
      h('p', { class: 'small muted', text: 'The step-by-step instructions are in README.md, which came with the website files.' }))));
  }
  function loginScreen(message) {
    root.innerHTML = '';
    var email = h('input', { type: 'email', autocomplete: 'username', required: true }), pass = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    var msg = h('div', { class: 'msg err', hidden: !message, text: message || '' });
    var btn = h('button', { class: 'btn btn--pri', type: 'submit', text: 'Sign in' });
    var form = h('form', { class: 'login-card', novalidate: true },
      h('img', { src: SITE + 'assets/logo/bella-foundation-640.png', alt: 'Bella Foundation' }), h('h1', { text: 'Website admin' }), h('p', { text: 'Sign in to manage projects, partners and website content.' }),
      msg, field('Email', email), field('Password', pass), btn,
      h('p', { class: 'small muted', style: 'margin-top:14px;text-align:center', text: 'Forgotten your password? It can be reset in the Supabase dashboard under Authentication → Users.' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!email.value.trim() || !pass.value) { msg.hidden = false; msg.textContent = 'Enter your email and password.'; return; }
      busy(btn, async function () {
        try { await sb.signIn(email.value.trim(), pass.value); await start(); }
        catch (er) { msg.hidden = false; msg.textContent = /invalid/i.test(er.message) ? 'The email or password is not correct.' : friendly(er); }
      });
    });
    add(root, h('div', { class: 'login' }, form));
    email.focus();
  }
  async function start() {
    if (!sb.session) return loginScreen();
    try {
      var rows = await sb.select('admins', { user_id: 'eq.' + sb.session.user.id });
      if (!rows.length) { var em = sb.session.user.email; await sb.signOut(); return loginScreen(em + ' can sign in but has not been made an administrator of this website. Add it to the “admins” table (setup guide, step 4).'); }
    } catch (e) {
      if (e.status === 401 || e.status === 403) { sb._save(null); return loginScreen('Your session has ended. Please sign in again.'); }
      if (e.status === 404 || /relation|does not exist|schema cache/i.test(e.message)) return setupScreen('The database tables were not found. Run supabase/schema.sql in the Supabase SQL Editor.');
      return loginScreen(friendly(e));
    }
    me = sb.session.user;
    router();
  }
  async function signOut() { await sb.signOut(); me = null; cache = { projects: null, partners: null, content: null, media: null }; loginScreen(); }

  /* ══════════ DASHBOARD ══════════ */
  views.dashboard = async function () {
    var r = await Promise.all([projects(true), partners(true), sb.select('enquiries', { order: 'created_at.desc' })]);
    var ps = r[0], pt = r[1], en = r[2];
    var main = shell('dashboard', 'Dashboard', 'Manage the Bella Foundation website from here. Changes appear on the public site as soon as they are published.',
      [h('a', { class: 'btn btn--pri', href: '#/projects/new', text: '+ Add New Project' }), h('a', { class: 'btn', href: '#/partners/new', text: '+ Add Partner' })]);
    var n = function (v) { return ps.filter(function (p) { return p.visibility === v; }).length; };
    add(main, h('div', { class: 'tiles' },
      h('a', { class: 'tile', href: '#/projects' }, h('strong', { text: n('published') }), h('span', { text: 'Published projects' })),
      h('a', { class: 'tile', href: '#/projects' }, h('strong', { text: n('draft') }), h('span', { text: 'Draft projects' })),
      h('a', { class: 'tile', href: '#/partners' }, h('strong', { text: pt.filter(function (p) { return p.visibility === 'published'; }).length }), h('span', { text: 'Published partners' })),
      h('a', { class: 'tile', href: '#/enquiries' }, h('strong', { text: en.filter(function (e) { return !e.handled; }).length }), h('span', { text: 'New enquiries' }))));
    var recent = h('div', { class: 'card' }, h('h2', { text: 'Recently edited projects' }));
    if (!ps.length) add(recent, h('div', { class: 'empty' }, h('h3', { text: 'No projects yet' }), h('p', { text: 'Add your first project. It stays a private draft until you press Publish.' }), h('a', { class: 'btn btn--pri', href: '#/projects/new', text: '+ Add New Project' })));
    else add(recent, h('table', { class: 'table' }, h('tbody', {}, ps.slice(0, 5).map(function (p) {
      return h('tr', {}, h('td', {}, h('a', { class: 't-title', href: '#/projects/' + p.id, text: p.title })), h('td', {}, h('span', { class: 'pill pill--' + p.visibility, text: p.visibility })), h('td', { class: 'muted small', text: 'Edited ' + when(p.updated_at) }));
    }))));
    add(main, recent);
    add(main, h('div', { class: 'card' }, h('h2', { text: 'How publishing works' }), h('p', { class: 'muted', text: 'A project or partner is visible to the public only while it is marked Published. When you publish a project, the India map, the project counts, the state lists and the homepage preview update by themselves — there is nothing else to do.' })));
  };

  /* ══════════ PROJECTS ══════════ */
  function previewLink(p) { return SITE + 'projects.html?preview=' + encodeURIComponent(p.id) + '#project=' + encodeURIComponent(p.id); }
  views.projects = async function (id) {
    if (id) return projectForm(id);
    var list = await projects(true);
    var main = shell('projects', 'Projects', 'Every project record for the Projects & Impact page and the India map.', [h('a', { class: 'btn btn--pri', href: '#/projects/new', text: '+ Add New Project' })]);
    var q = h('input', { type: 'search', placeholder: 'Search projects', 'aria-label': 'Search projects' });
    var vis = h('select', { 'aria-label': 'Show' }, h('option', { value: '', text: 'All projects' }), h('option', { value: 'published', text: 'Published' }), h('option', { value: 'draft', text: 'Drafts' }), h('option', { value: 'archived', text: 'Archived' }));
    var box = h('div', { class: 'card' });
    add(main, [h('div', { class: 'toolbar' }, q, vis), box]);
    async function patch(p, change, msg) {
      try { await sb.update('projects', p.id, change); toast(msg, 'ok'); views.projects(); } catch (e) { fail(e, 'Could not save'); }
    }
    function draw() {
      var t = q.value.trim().toLowerCase(), rows = list.filter(function (p) {
        return (!vis.value || p.visibility === vis.value) && (!t || ((p.title || '') + ' ' + (p.code || '') + ' ' + BF.stateNames(p.states).join(' ') + ' ' + (p.district || '')).toLowerCase().indexOf(t) > -1);
      });
      box.innerHTML = '';
      if (!list.length) return add(box, h('div', { class: 'empty' }, h('h3', { text: 'No projects yet' }), h('p', { text: 'Add a project to place it on the map and the Projects & Impact page.' }), h('a', { class: 'btn btn--pri', href: '#/projects/new', text: '+ Add New Project' })));
      if (!rows.length) return add(box, h('p', { class: 'muted', text: 'No projects match.' }));
      add(box, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Project' }), h('th', { text: 'Status' }), h('th', { text: 'Visibility' }), h('th', { text: '' }))),
        h('tbody', {}, rows.map(function (p) {
          var cover = siteUrl(p.cover_image);
          return h('tr', {},
            h('td', {}, cover ? h('img', { class: 'thumb', src: cover, alt: '' }) : h('div', { class: 'thumb' })),
            h('td', {}, h('a', { class: 't-title', href: '#/projects/' + p.id, text: p.title || '(untitled)' }), h('div', { class: 'muted small', text: [p.code, BF.stateNames(p.states).join(', ')].filter(Boolean).join(' · ') })),
            h('td', {}, h('span', { class: 'pill pill--' + p.status, text: BF.STATUS[p.status] || p.status })),
            h('td', {}, h('span', { class: 'pill pill--' + p.visibility, text: p.visibility })),
            h('td', {}, h('div', { class: 't-actions' },
              h('a', { class: 'btn btn--sm', href: '#/projects/' + p.id, text: 'Edit' }),
              h('a', { class: 'btn btn--sm', href: previewLink(p), target: '_blank', rel: 'noopener', text: 'Preview' }),
              p.visibility === 'published'
                ? h('button', { class: 'btn btn--sm', type: 'button', text: 'Unpublish', onclick: function () { patch(p, { visibility: 'draft' }, 'Project unpublished. It is no longer on the public site.'); } })
                : h('button', { class: 'btn btn--sm btn--go', type: 'button', text: 'Publish', onclick: function () { var miss = missingForPublish(p); if (miss.length) { toast('Before publishing, open the project and add: ' + miss.join(', ') + '.', 'err'); return; } patch(p, { visibility: 'published', published_at: p.published_at || new Date().toISOString() }, 'Project published.'); } }),
              p.status !== 'completed' ? h('button', { class: 'btn btn--sm', type: 'button', text: 'Mark completed', onclick: function () { patch(p, { status: 'completed' }, 'Project marked as completed.'); } }) : null,
              p.visibility !== 'archived' ? h('button', { class: 'btn btn--sm', type: 'button', text: 'Archive', onclick: async function () { if (await confirmBox('Archive this project?', '“' + p.title + '” will be removed from the public site but kept here. You can publish it again later.', 'Archive')) patch(p, { visibility: 'archived' }, 'Project archived.'); } }) : null,
              h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Delete', onclick: async function () { if (await confirmBox('Delete this project permanently?', '“' + p.title + '” and its record will be deleted. This cannot be undone. Its photographs stay in the Media Library.', 'Delete project', true)) { try { await sb.remove('projects', p.id); toast('Project deleted.', 'ok'); views.projects(); } catch (e) { fail(e, 'Could not delete'); } } } }))));
        }))));
    }
    q.addEventListener('input', draw); vis.addEventListener('change', draw); draw();
  };
  function missingForPublish(p) {
    var miss = [];
    if (!(p.title || '').trim()) miss.push('project name');
    if (!BF.arr(p.states).length) miss.push('at least one state or Union Territory');
    if (!p.category) miss.push('CSR category');
    if (!(p.summary || '').trim()) miss.push('short summary');
    return miss;
  }
  function repeater(list, cols, addLabel) {
    var wrap = h('div', { class: 'rep' }), rowsEl = h('div', { class: 'rep' });
    function draw() {
      rowsEl.innerHTML = '';
      list.forEach(function (item, i) {
        var row = h('div', { class: 'rep-row c' + cols.length });
        cols.forEach(function (c) {
          var el = c.type === 'textarea' ? h('textarea', { placeholder: c.ph, 'aria-label': c.ph, rows: '2' }) : h('input', { type: c.type || 'text', placeholder: c.ph, 'aria-label': c.ph });
          el.value = item[c.key] || '';
          el.addEventListener('input', function () { item[c.key] = el.value; markDirty(); });
          add(row, el);
        });
        add(row, h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove', onclick: function () { list.splice(i, 1); markDirty(); draw(); } }));
        add(rowsEl, row);
      });
    }
    add(wrap, [rowsEl, h('div', {}, h('button', { class: 'btn btn--sm', type: 'button', text: addLabel, onclick: function () { var o = {}; cols.forEach(function (c) { o[c.key] = ''; }); list.push(o); markDirty(); draw(); } }))]);
    draw(); return wrap;
  }
  function gallery(list) {
    var grid = h('div', { class: 'gal' }), drag = null;
    function draw() {
      grid.innerHTML = '';
      list.forEach(function (g, i) {
        var cap = h('input', { type: 'text', placeholder: 'Caption', 'aria-label': 'Caption' }); cap.value = g.caption || g.alt || '';
        cap.addEventListener('input', function () { g.caption = cap.value; if ('alt' in g) g.alt = cap.value; markDirty(); });
        var item = h('div', { class: 'gal-item', draggable: 'true' }, h('img', { src: siteUrl(g.url), alt: '' }), h('div', { class: 'in' }, cap,
          'date' in g ? (function () { var d = h('input', { type: 'date', 'aria-label': 'Date taken' }); d.value = g.date || ''; d.addEventListener('input', function () { g.date = d.value; markDirty(); }); return d; })() : null,
          h('div', { class: 'row' },
            h('span', {}, h('button', { class: 'btn btn--sm', type: 'button', title: 'Move earlier', text: '←', disabled: i === 0, onclick: function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); markDirty(); draw(); } }), ' ',
              h('button', { class: 'btn btn--sm', type: 'button', title: 'Move later', text: '→', disabled: i === list.length - 1, onclick: function () { list.splice(i + 1, 0, list.splice(i, 1)[0]); markDirty(); draw(); } })),
            h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove', onclick: function () { list.splice(i, 1); markDirty(); draw(); } }))));
        item.addEventListener('dragstart', function () { drag = i; item.classList.add('dragging'); });
        item.addEventListener('dragend', function () { item.classList.remove('dragging'); });
        item.addEventListener('dragover', function (e) { e.preventDefault(); });
        item.addEventListener('drop', function (e) { e.preventDefault(); if (drag === null || drag === i) return; list.splice(i, 0, list.splice(drag, 1)[0]); drag = null; markDirty(); draw(); });
        add(grid, item);
      });
    }
    grid.redraw = draw; draw(); return grid;
  }
  async function projectForm(id) {
    var isNew = id === 'new', all = await projects(isNew ? false : true), pts = await partners();
    var p = isNew ? null : all.filter(function (x) { return String(x.id) === id; })[0];
    if (!isNew && !p) { toast('That project could not be found.', 'err'); return nav('#/projects'); }
    var s = Object.assign({ title: '', code: '', states: [], district: '', location: '', lat: null, lng: null, category: '', status: 'ongoing', start_date: '', end_date: '', summary: '', background: '', objectives: '', scope: '', activities: '',
      target_beneficiaries: '', beneficiaries_reached: null, beneficiaries_note: '', outcomes: '', indicators: [], updates: [], partner_ids: [], implementation_partners: '', stakeholders: '',
      cover_image: '', cover_focus: '50% 50%', cover_caption: '', gallery: [], videos: [], documents: [], visibility: 'draft', featured: false, sort_order: 0 }, JSON.parse(JSON.stringify(p || {})));
    ['states', 'partner_ids', 'indicators', 'updates', 'gallery', 'videos', 'documents'].forEach(function (k) { s[k] = BF.arr(s[k]); });
    s.gallery.forEach(function (g) { if (!('date' in g)) g.date = ''; });
    if (isNew) {
      var yr = new Date().getFullYear(), max = 0;
      all.forEach(function (x) { var m = new RegExp('^BF-' + yr + '-(\\d+)$').exec(x.code || ''); if (m) max = Math.max(max, +m[1]); });
      s.code = 'BF-' + yr + '-' + String(max + 1).padStart(3, '0');
    }
    var live = s.visibility === 'published';
    var main = shell('projects', isNew ? 'Add New Project' : 'Edit project', isNew ? 'Fill in what you know now. You can save a draft and come back.' : s.title, [h('a', { class: 'btn', href: '#/projects', text: '← All projects' })]);
    function inp(key, type, attrs) {
      var el = h(type === 'textarea' ? 'textarea' : 'input', Object.assign(type === 'textarea' ? {} : { type: type || 'text' }, attrs || {}));
      el.value = s[key] == null ? '' : s[key];
      el.addEventListener('input', function () { s[key] = el.value; markDirty(); });
      return el;
    }
    function sel(key, opts) {
      var el = h('select', {}, opts.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
      el.value = s[key] || ''; el.addEventListener('change', function () { s[key] = el.value; markDirty(); }); return el;
    }
    function picks(key, opts, chipsEl) {
      var box = h('div', { class: 'picks' });
      function chips() { if (!chipsEl) return; chipsEl.innerHTML = ''; s[key].forEach(function (v) { var o = opts.filter(function (x) { return x[0] === v; })[0]; if (o) add(chipsEl, h('span', { text: o[1] })); }); }
      opts.forEach(function (o) {
        var c = h('input', { type: 'checkbox' }); c.checked = s[key].indexOf(o[0]) > -1;
        c.addEventListener('change', function () { if (c.checked) s[key].push(o[0]); else s[key] = s[key].filter(function (v) { return v !== o[0]; }); markDirty(); chips(); });
        add(box, h('label', {}, c, o[1]));
      });
      chips(); return box;
    }
    var R = { background: rte(s.background, 'Why the project is needed: the situation and the needs the community identified'), objectives: rte(s.objectives, 'What the project sets out to achieve'), scope: rte(s.scope, 'What is included in the project'), activities: rte(s.activities, 'What is being done on the ground'), outcomes: rte(s.outcomes, 'Only verified, documented results') };
    var cats = BF.CATEGORIES.slice(); if (s.category && cats.indexOf(s.category) < 0) cats.push(s.category);
    var stateChips = h('div', { class: 'chips' }), stateFld;

    /* cover */
    var coverBox = h('div', {});
    function drawCover() {
      coverBox.innerHTML = '';
      if (!s.cover_image) { add(coverBox, dropzone('Upload the cover photograph', 'image/*', false, async function (f) { var r = await uploadMany(f, 'projects', { only: 'image' }); if (r[0]) { s.cover_image = r[0].url; s.cover_focus = r[0].focus || '50% 50%'; markDirty(); drawCover(); } })); 
        add(coverBox, h('p', { style: 'margin-top:8px' }, h('button', { class: 'link', type: 'button', text: 'or choose from the Media Library', onclick: async function () { var m = await pickMedia('image', 'projects'); if (m) { s.cover_image = m.url; s.cover_focus = m.focus || '50% 50%'; if (!s.cover_caption && m.caption) s.cover_caption = m.caption; markDirty(); drawCover(); } } })));
        return; }
      add(coverBox, h('div', { class: 'cover' }, focusBox(siteUrl(s.cover_image), s.cover_focus, function (v) { s.cover_focus = v; }),
        h('div', {}, field('Cover caption (optional)', inp('cover_caption')), h('p', { class: 'small muted', style: 'margin:8px 0', text: 'Click on the photograph to mark its most important part. That part stays in view when the photo is cropped to fit.' }),
          h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove cover photograph', onclick: function () { s.cover_image = ''; markDirty(); drawCover(); } }))));
    }
    drawCover();
    var gal = gallery(s.gallery);
    var docsBox = h('div', {});
    function drawDocs() {
      docsBox.innerHTML = '';
      add(docsBox, repeater(s.documents, [{ key: 'title', ph: 'Document title' }, { key: 'url', ph: 'Link (filled in when you upload)', type: 'url' }], '+ Add a link to a document'));
    }
    drawDocs();

    add(main, [
      !isNew ? h('div', { class: 'msg info' }, 'This project is currently ', h('strong', { text: s.visibility === 'published' ? 'published — visible to the public.' : s.visibility === 'archived' ? 'archived — not visible to the public.' : 'a draft — not visible to the public.' }), s.visibility === 'published' && s.slug ? [' Its own page: ', h('a', { href: '/projects/' + s.slug, target: '_blank', rel: 'noopener', text: location.origin + '/projects/' + s.slug })] : null) : null,
      h('div', { class: 'card' }, h('h2', { text: '1. The basics' }), h('p', { class: 'muted', text: 'These details place the project on the map and in the lists.' }), h('div', { class: 'form-grid' },
        field('Project name *', inp('title', 'text', { id: 'p-title', maxlength: '160' }), null, true),
        field('Project ID', inp('code', 'text', { maxlength: '40' }), 'A short reference shown on the project page. Filled in for you; change it if you use your own numbering.'),
        field('CSR category *', sel('category', [['', 'Choose a category']].concat(cats.map(function (c) { return [c, c]; })))),
        (stateFld = h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'States and Union Territories *' }), picks('states', BF.STATES.map(function (x) { return [x.code, x.name]; }), stateChips), stateChips, h('small', { text: 'Tick every state or UT where this project operates. The project is listed under each of them and each is highlighted on the map.' }))),
        field('District', inp('district', 'text', { maxlength: '120' })),
        field('Location', inp('location', 'text', { maxlength: '160', placeholder: 'Village, block or town' })),
        field('Current status', sel('status', [['planned', 'Planned'], ['ongoing', 'Ongoing'], ['completed', 'Completed']])),
        h('div', {}),
        field('Start date', inp('start_date', 'date')), field('End date', inp('end_date', 'date'), 'Leave empty while the project is ongoing.'))),
      h('div', { class: 'card' }, h('h2', { text: '2. About the project' }), h('div', { class: 'form-grid' },
        field('Short summary *', inp('summary', 'textarea', { maxlength: '400', rows: '3' }), 'One or two sentences. Shown on the project card.', true),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Background and community needs' }), R.background),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Objectives' }), R.objectives),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Scope of work' }), R.scope),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Implementation activities' }), R.activities))),
      h('div', { class: 'card' }, h('h2', { text: '3. Beneficiaries, progress and outcomes' }), h('p', { class: 'muted', text: 'Enter only figures and results you can support with records. Anything left empty is simply not shown.' }), h('div', { class: 'form-grid' },
        field('Target beneficiaries', inp('target_beneficiaries', 'text', { maxlength: '200', placeholder: 'For example: 500 students in 10 schools' })),
        field('Beneficiaries reached (verified number)', inp('beneficiaries_reached', 'number', { min: '0', step: '1' }), 'Counted in the “Verified beneficiaries reached” total on the website.'),
        field('Note on the verified number (optional)', inp('beneficiaries_note', 'text', { maxlength: '200', placeholder: 'For example: as on 31 March 2026, attendance registers' }), null, true),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Work completed and verified outcomes' }), R.outcomes),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Impact indicators' }), repeater(s.indicators, [{ key: 'value', ph: 'Figure, e.g. 10' }, { key: 'label', ph: 'What it measures, e.g. Schools covered' }], '+ Add an indicator')),
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Project updates and milestones' }), repeater(s.updates, [{ key: 'date', ph: 'Date', type: 'date' }, { key: 'title', ph: 'Heading' }, { key: 'text', ph: 'What happened', type: 'textarea' }], '+ Add an update')))),
      h('div', { class: 'card' }, h('h2', { text: '4. Partners' }), h('div', { class: 'form-grid' },
        h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Corporate CSR partner' }), pts.length ? picks('partner_ids', pts.map(function (x) { return [String(x.id), x.name + (x.visibility === 'published' ? '' : ' (not published)')]; })) : h('p', { class: 'muted small' }, 'No partners have been added yet. ', h('a', { href: '#/partners/new', text: 'Add a partner' }), ' first, then come back.'), h('small', { text: 'A partner is shown on the project only once the partner itself is published.' })),
        field('Implementation partners', inp('implementation_partners', 'text', { maxlength: '300' })), field('Other stakeholders', inp('stakeholders', 'text', { maxlength: '300' })))),
      h('div', { class: 'card' }, h('h2', { text: '5. Photographs and documents' }),
        h('div', { class: 'fld', style: 'margin-bottom:18px' }, h('span', { class: 'lab', text: 'Cover photograph' }), coverBox),
        h('div', { class: 'fld', style: 'margin-bottom:18px' }, h('span', { class: 'lab', text: 'Project photographs' }),
          dropzone('Upload project photographs', 'image/*', true, async function (f) { var r = await uploadMany(f, 'projects', { only: 'image' }); r.forEach(function (m) { s.gallery.push({ url: m.url, caption: m.caption || '', date: '' }); }); if (r.length) { markDirty(); gal.redraw(); } }),
          h('small', { text: 'Large photographs are resized automatically. Drag a photograph, or use the arrows, to change the order.' }), gal),
        h('div', { class: 'fld', style: 'margin-bottom:18px' }, h('span', { class: 'lab', text: 'Reports and PDFs' }),
          dropzone('Upload a report or PDF', 'application/pdf', true, async function (f) { var r = await uploadMany(f, 'documents', { only: 'pdf' }); r.forEach(function (m) { s.documents.push({ title: m.name, url: m.url }); }); if (r.length) { markDirty(); drawDocs(); } }), h('div', { style: 'margin-top:10px' }, docsBox)),
        h('div', { class: 'fld' }, h('span', { class: 'lab', text: 'Videos (links)' }), repeater(s.videos, [{ key: 'title', ph: 'Video title' }, { key: 'url', ph: 'Link, e.g. https://youtube.com/…', type: 'url' }], '+ Add a video link'))),
      h('div', { class: 'card' }, h('h2', { text: '6. Display options' }), h('div', { class: 'form-grid' },
        (function () { var c = h('input', { type: 'checkbox', id: 'p-feat' }); c.checked = !!s.featured; c.addEventListener('change', function () { s.featured = c.checked; markDirty(); }); return h('label', { class: 'check', for: 'p-feat' }, c, 'Feature this project on the homepage'); })(),
        field('Order in lists', inp('sort_order', 'number', { step: '1' }), 'Lower numbers appear first. Leave at 0 to sort by date.')))
    ]);

    function collect(vis) {
      var o = {};
      ['title', 'code', 'district', 'location', 'category', 'status', 'summary', 'target_beneficiaries', 'beneficiaries_note', 'implementation_partners', 'stakeholders', 'cover_image', 'cover_focus', 'cover_caption'].forEach(function (k) { o[k] = String(s[k] == null ? '' : s[k]).trim(); });
      o.code = o.code || null;
      Object.keys(R).forEach(function (k) { o[k] = R[k].getValue(); });
      o.states = s.states.slice(); o.partner_ids = s.partner_ids.slice();
      o.start_date = s.start_date || null; o.end_date = s.end_date || null;
      var n = parseInt(s.beneficiaries_reached, 10); o.beneficiaries_reached = n > 0 ? n : null;
      o.sort_order = parseInt(s.sort_order, 10) || 0; o.featured = !!s.featured;
      o.indicators = s.indicators.filter(function (i) { return (i.label || '').trim() && (i.value || '').trim(); });
      o.updates = s.updates.filter(function (u) { return (u.title || '').trim() || (u.text || '').trim(); });
      o.gallery = s.gallery.filter(function (g) { return g.url; }).map(function (g) { return { url: g.url, caption: (g.caption || '').trim(), date: g.date || '' }; });
      o.videos = s.videos.filter(function (v) { return /^https?:\/\//i.test((v.url || '').trim()); }).map(function (v) { return { title: (v.title || '').trim(), url: v.url.trim() }; });
      o.documents = s.documents.filter(function (d) { return /^https?:\/\//i.test((d.url || '').trim()); }).map(function (d) { return { title: (d.title || '').trim() || 'Document', url: d.url.trim() }; });
      o.visibility = vis;
      if (!s.slug && o.title && vis === 'published') {   /* the page address is fixed the first time the project is published */
        var base = slug(o.title), taken = all.filter(function (x) { return !p || x.id !== p.id; }).map(function (x) { return x.slug; }), cand = base, n = 2;
        while (taken.indexOf(cand) > -1) cand = base + '-' + n++;
        s.slug = cand;
      }
      o.slug = s.slug || null;
      if (vis === 'published' && !s.published_at) o.published_at = new Date().toISOString();
      return o;
    }
    async function save(vis, btn, then) {
      var o = collect(vis);
      $$('.fld.bad', main).forEach(function (f) { f.classList.remove('bad'); });
      if (!o.title) { $('#p-title').closest('.fld').classList.add('bad'); $('#p-title').focus(); toast('Please enter the project name.', 'err'); return; }
      if (vis === 'published') {
        var miss = missingForPublish(o);
        if (miss.length) { if (!o.states.length) stateFld.classList.add('bad'); toast('To publish, please add: ' + miss.join(', ') + '.', 'err'); return; }
      }
      await busy(btn, async function () {
        try {
          var rows = isNew ? await sb.insert('projects', o) : await sb.update('projects', p.id, o);
          if (!rows || !rows[0]) throw new Error('The change was not saved. This account may not have permission (row-level security).');
          cache.projects = null; dirty = false;
          toast(vis === 'published' ? (live ? 'Saved. The public website is updated.' : 'Published. The project is now on the website and the map.') : vis === 'draft' ? (live ? 'Unpublished and saved as a draft.' : 'Draft saved.') : 'Saved.', 'ok');
          if (then) then(rows[0]); else if (isNew || vis !== s.visibility) nav('#/projects/' + rows[0].id);
          else { s.published_at = rows[0].published_at; }
        } catch (e) { fail(e, 'Could not save'); }
      });
    }
    var bDraft = h('button', { class: 'btn', type: 'button', text: live ? 'Unpublish (keep as draft)' : 'Save as Draft', onclick: function () { save('draft', bDraft); } });
    var bPub = h('button', { class: 'btn btn--go', type: 'button', text: live ? 'Save and update website' : 'Publish', onclick: function () { save('published', bPub); } });
    var bPrev = h('button', { class: 'btn', type: 'button', text: 'Save and preview', onclick: function () { var w = window.open('', '_blank'); save(live ? 'published' : (s.visibility === 'archived' ? 'archived' : 'draft'), bPrev, function (row) { if (w) w.location = previewLink(row); if (isNew) nav('#/projects/' + row.id); }); } });
    add(main, h('div', { class: 'savebar' }, h('span', { class: 'state', text: live ? 'Published — visible to the public' : 'Not visible to the public until published' }), h('div', { class: 'actions' }, bPrev, bDraft, bPub)));
  }

  /* ══════════ CORPORATE PARTNERS ══════════ */
  views.partners = async function (id) {
    if (id) return partnerForm(id);
    var list = await partners(true), ps = await projects();
    var main = shell('partners', 'Corporate Partners', 'Companies and institutions shown in the “Our Corporate Partners” section.', [h('a', { class: 'btn btn--pri', href: '#/partners/new', text: '+ Add Partner' })]);
    var box = h('div', { class: 'card' }); add(main, box);
    if (!list.length) return add(box, h('div', { class: 'empty' }, h('h3', { text: 'No partners yet' }), h('p', { text: 'Add a company once the partnership is agreed and it has authorised the use of its name.' }), h('a', { class: 'btn btn--pri', href: '#/partners/new', text: '+ Add Partner' })));
    add(box, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}), h('th', { text: 'Company' }), h('th', { text: 'Projects' }), h('th', { text: 'Visibility' }), h('th', {}))), h('tbody', {}, list.map(function (pt) {
      var n = ps.filter(function (p) { return BF.arr(p.partner_ids).map(String).indexOf(String(pt.id)) > -1; }).length;
      return h('tr', {}, h('td', {}, pt.logo ? h('img', { class: 'thumb', style: 'object-fit:contain;background:#fff', src: siteUrl(pt.logo), alt: '' }) : h('div', { class: 'thumb' })),
        h('td', {}, h('a', { class: 't-title', href: '#/partners/' + pt.id, text: pt.name })), h('td', { text: n }), h('td', {}, h('span', { class: 'pill pill--' + pt.visibility, text: pt.visibility })),
        h('td', {}, h('div', { class: 't-actions' }, h('a', { class: 'btn btn--sm', href: '#/partners/' + pt.id, text: 'Edit' }),
          h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove', onclick: async function () {
            if (!await confirmBox('Remove this partner?', '“' + pt.name + '” will be deleted and removed from its projects. This cannot be undone.', 'Remove partner', true)) return;
            try {
              for (var i = 0; i < ps.length; i++) { var ids = BF.arr(ps[i].partner_ids).map(String); if (ids.indexOf(String(pt.id)) > -1) await sb.update('projects', ps[i].id, { partner_ids: ids.filter(function (x) { return x !== String(pt.id); }) }); }
              await sb.remove('partners', pt.id); cache.projects = null; toast('Partner removed.', 'ok'); views.partners();
            } catch (e) { fail(e, 'Could not remove'); }
          } }))));
    }))));
  };
  async function partnerForm(id) {
    var isNew = id === 'new', list = await partners(isNew ? false : true), ps = await projects(true);
    var pt = isNew ? null : list.filter(function (x) { return String(x.id) === id; })[0];
    if (!isNew && !pt) { toast('That partner could not be found.', 'err'); return nav('#/partners'); }
    var s = Object.assign({ name: '', logo: '', website: '', description: '', status: 'active', visibility: 'draft', logo_authorised: false, sort_order: 0 }, pt || {});
    var linked = isNew ? [] : ps.filter(function (p) { return BF.arr(p.partner_ids).map(String).indexOf(String(pt.id)) > -1; }).map(function (p) { return String(p.id); });
    var before = linked.slice(), live = s.visibility === 'published';
    var main = shell('partners', isNew ? 'Add Partner' : 'Edit partner', isNew ? '' : s.name, [h('a', { class: 'btn', href: '#/partners', text: '← All partners' })]);
    var name = h('input', { type: 'text', maxlength: '160', id: 'pt-name' }); name.value = s.name; name.addEventListener('input', function () { s.name = name.value; markDirty(); });
    var web = h('input', { type: 'url', placeholder: 'https://' }); web.value = s.website || ''; web.addEventListener('input', function () { s.website = web.value; markDirty(); });
    var desc = rte(s.description, 'A sentence or two about the partnership (optional)');
    var status = h('select', {}, h('option', { value: 'active', text: 'Active partnership' }), h('option', { value: 'past', text: 'Past partnership' }), h('option', { value: '', text: 'Do not show a status' })); status.value = s.status || ''; status.addEventListener('change', function () { s.status = status.value; markDirty(); });
    var auth = h('input', { type: 'checkbox', id: 'pt-auth' }); auth.checked = !!s.logo_authorised; auth.addEventListener('change', function () { s.logo_authorised = auth.checked; markDirty(); });
    var order = h('input', { type: 'number', step: '1' }); order.value = s.sort_order || 0; order.addEventListener('input', function () { s.sort_order = order.value; markDirty(); });
    var logoBox = h('div', {});
    function drawLogo() {
      logoBox.innerHTML = '';
      if (s.logo) add(logoBox, [h('div', { style: 'display:grid;place-items:center;width:240px;max-width:100%;height:120px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:14px' }, h('img', { src: siteUrl(s.logo), alt: '', style: 'max-height:80px;max-width:200px;object-fit:contain' })),
        h('p', { style: 'margin-top:8px' }, h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove logo', onclick: function () { s.logo = ''; markDirty(); drawLogo(); } }))]);
      else add(logoBox, dropzone('Upload the company logo', 'image/png,image/svg+xml,image/jpeg,image/webp', false, async function (f) { var r = await uploadMany(f, 'partners', { only: 'image', keepPng: true, max: 800 }); if (r[0]) { s.logo = r[0].url; markDirty(); drawLogo(); } }));
    }
    drawLogo();
    var projBox = h('div', { class: 'picks' });
    ps.forEach(function (p) {
      var c = h('input', { type: 'checkbox' }); c.checked = linked.indexOf(String(p.id)) > -1;
      c.addEventListener('change', function () { if (c.checked) linked.push(String(p.id)); else linked = linked.filter(function (x) { return x !== String(p.id); }); markDirty(); });
      add(projBox, h('label', {}, c, p.title));
    });
    add(main, h('div', { class: 'card' }, h('div', { class: 'form-grid' },
      field('Company name *', name, null, true),
      h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Company logo' }), logoBox, h('small', { text: 'PNG or SVG with a transparent background works best. Without a logo, the company name is shown instead.' })),
      field('Company website', web), field('Partnership status', status),
      h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Partnership description' }), desc),
      h('div', { class: 'fld full' }, h('span', { class: 'lab', text: 'Related CSR projects' }), ps.length ? projBox : h('p', { class: 'muted small', text: 'No projects have been added yet. You can link projects later.' })),
      h('div', { class: 'fld full' }, h('label', { class: 'check', for: 'pt-auth' }, auth, 'The partnership is agreed, and the company has authorised Bella Foundation to show its name and logo publicly'), h('small', { text: 'Required before the partner can be published.' })),
      field('Order in the list', order, 'Lower numbers appear first.'))));
    async function save(vis, btn) {
      var o = { name: s.name.trim(), logo: s.logo || '', website: (s.website || '').trim(), description: desc.getValue(), status: s.status || '', logo_authorised: !!s.logo_authorised, sort_order: parseInt(s.sort_order, 10) || 0, visibility: vis };
      if (!o.name) { name.focus(); toast('Please enter the company name.', 'err'); return; }
      if (o.website && !/^https?:\/\//i.test(o.website)) { web.focus(); toast('The website address must start with https://', 'err'); return; }
      if (vis === 'published' && !o.logo_authorised) { auth.focus(); toast('Tick the authorisation box before publishing this partner.', 'err'); return; }
      await busy(btn, async function () {
        try {
          var rows = isNew ? await sb.insert('partners', o) : await sb.update('partners', pt.id, o);
          if (!rows || !rows[0]) throw new Error('The change was not saved. This account may not have permission (row-level security).');
          var pid = String(rows[0].id);
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i], want = linked.indexOf(String(p.id)) > -1, had = before.indexOf(String(p.id)) > -1;
            if (want === had) continue;
            var ids = BF.arr(p.partner_ids).map(String).filter(function (x) { return x !== pid; }); if (want) ids.push(pid);
            await sb.update('projects', p.id, { partner_ids: ids });
          }
          cache.partners = null; cache.projects = null; dirty = false;
          toast(vis === 'published' ? 'Partner published.' : 'Partner saved as a draft.', 'ok'); nav('#/partners');
        } catch (e) { fail(e, 'Could not save'); }
      });
    }
    var b1 = h('button', { class: 'btn', type: 'button', text: live ? 'Unpublish (keep as draft)' : 'Save as Draft', onclick: function () { save('draft', b1); } });
    var b2 = h('button', { class: 'btn btn--go', type: 'button', text: live ? 'Save and update website' : 'Publish', onclick: function () { save('published', b2); } });
    add(main, h('div', { class: 'savebar' }, h('span', { class: 'state', text: live ? 'Published — visible to the public' : 'Not visible to the public until published' }), h('div', { class: 'actions' }, b1, b2)));
  }

  /* ══════════ MEDIA LIBRARY ══════════ */
  views.media = async function () {
    cache.media = null;
    var list = await getMedia();
    var main = shell('media', 'Media Library', 'Every photograph, logo and PDF uploaded to the website.');
    var q = h('input', { type: 'search', placeholder: 'Search by name or caption', 'aria-label': 'Search media' });
    var kind = h('select', { 'aria-label': 'Type' }, h('option', { value: '', text: 'All files' }), h('option', { value: 'image', text: 'Photographs and logos' }), h('option', { value: 'document', text: 'Documents' }));
    var grid = h('div', { class: 'media-grid' });
    add(main, [h('div', { class: 'card' }, dropzone('Upload photographs, logos or PDFs', 'image/*,application/pdf', true, async function (f) { var r = await uploadMany(f, 'library'); if (r.length) views.media(); })),
      h('div', { class: 'card' }, h('div', { class: 'toolbar' }, q, kind), grid)]);
    function draw() {
      var t = q.value.trim().toLowerCase(), rows = list.filter(function (m) { return (!kind.value || m.kind === kind.value) && (!t || ((m.name || '') + ' ' + (m.caption || '')).toLowerCase().indexOf(t) > -1); });
      grid.innerHTML = '';
      if (!rows.length) add(grid, h('p', { class: 'muted', text: list.length ? 'No files match.' : 'Nothing has been uploaded yet.' }));
      rows.forEach(function (m) {
        add(grid, h('button', { type: 'button', class: 'media-item', onclick: function () { editMedia(m); } }, m.kind === 'image' ? h('img', { src: m.url, alt: '', loading: 'lazy' }) : h('div', { class: 'doc', text: 'PDF' }), h('p', { text: m.name || m.path })));
      });
    }
    q.addEventListener('input', draw); kind.addEventListener('change', draw); draw();
  };
  function editMedia(m) {
    dialog(function (box, close) {
      var name = h('input', { type: 'text' }); name.value = m.name || '';
      var cap = h('input', { type: 'text', placeholder: 'Describes the photograph; used as its caption' }); cap.value = m.caption || '';
      var focus = m.focus || '50% 50%';
      var rep = h('input', { type: 'file', hidden: true, accept: m.kind === 'image' ? 'image/*' : 'application/pdf', onchange: async function () {
        if (!rep.files[0]) return;
        try { await uploadOne(rep.files[0], '', { path: m.path, mediaId: m.id, only: m.kind === 'image' ? 'image' : 'pdf' }); toast('File replaced. Visitors may see the old version for up to an hour.', 'ok'); close(); views.media(); } catch (e) { fail(e, 'Could not replace'); }
      } });
      add(box, [h('h2', { text: m.kind === 'image' ? 'Photograph details' : 'Document details' }),
        m.kind === 'image' ? [focusBox(m.url + (m.updated_at ? '?v=' + encodeURIComponent(m.updated_at) : ''), focus, function (v) { focus = v; }), h('p', { class: 'small muted', style: 'margin:6px 0 14px', text: 'Click the most important part of the photograph (its focal point).' })] : h('p', { style: 'margin-bottom:14px' }, h('a', { href: m.url, target: '_blank', rel: 'noopener', text: 'Open the document ↗' })),
        h('div', { style: 'display:grid;gap:12px' }, field('File name', name), field('Caption', cap),
          field('Link', (function () { var i = h('input', { type: 'text', readonly: true }); i.value = m.url; i.addEventListener('focus', function () { i.select(); }); return i; })(), [m.width ? m.width + ' × ' + m.height + ' px' : '', m.size ? Math.round(m.size / 1024) + ' KB' : '', 'uploaded ' + when(m.created_at)].filter(Boolean).join(' · '))), rep,
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn--danger', type: 'button', text: 'Delete', onclick: async function () {
            if (!await confirmBox('Delete this file?', 'If it is used on a project or page, that photograph or link will stop working. This cannot be undone.', 'Delete file', true)) return;
            try { await sb.removeFiles('media', [m.path]); await sb.remove('media', m.id); cache.media = null; toast('File deleted.', 'ok'); close(); views.media(); } catch (e) { fail(e, 'Could not delete'); }
          } }),
          h('button', { class: 'btn', type: 'button', text: 'Replace file', onclick: function () { rep.click(); } }),
          h('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: function () { close(); } }),
          h('button', { class: 'btn btn--pri', type: 'button', text: 'Save', onclick: async function (e) {
            await busy(e.currentTarget, async function () {
              try { await sb.update('media', m.id, { name: name.value.trim(), caption: cap.value.trim(), focus: focus }); cache.media = null; dirty = false; toast('Saved.', 'ok'); close(); views.media(); } catch (er) { fail(er, 'Could not save'); }
            });
          } }))]);
    });
  }

  /* ══════════ WEBSITE CONTENT ══════════ */
  function toPlain(el) {
    var c = el.cloneNode(true);
    $$('svg', c).forEach(function (n) { n.remove(); });
    $$('em', c).forEach(function (n) { n.replaceWith('*' + n.textContent + '*'); });
    $$('br', c).forEach(function (n) { n.replaceWith('\n'); });
    return c.textContent.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
  }
  views.content = async function () {
    var c = await content(true), saved = c.text || {}, ct = Object.assign({}, c.contact || {});
    var docs = {};
    async function pageDoc(name) { if (!docs[name]) docs[name] = new DOMParser().parseFromString(await (await fetch(SITE + name, { cache: 'no-cache' })).text(), 'text/html'); return docs[name]; }
    await pageDoc('index.html'); await pageDoc('projects.html');
    var main = shell('content', 'Website Content', 'Edit the wording across the website: headings, paragraphs, lists, registration numbers and contact details. The layout and design stay exactly as they are.');
    add(main, h('div', { class: 'msg info', text: 'Tip: put *asterisks* around words to show them in the gold italic style used in headings.' }));
    var groups = {}, order = [], getters = [];
    (window.BF_CMS_FIELDS || []).forEach(function (f) {
      var el = docs[f.page || 'index.html'].querySelector(f.sel); if (!el) return;
      var def = f.type === 'meta' ? (el.getAttribute('content') || '') : f.type === 'rich' ? BF.sanitize(el.innerHTML).trim() : f.type === 'list' ? $$('li', el).filter(function (li) { return !li.classList.contains('stage-out'); }).map(function (li) { return li.textContent.trim(); }).join('\n') : toPlain(el), cur = saved[f.key] != null && saved[f.key] !== '' ? saved[f.key] : def, input, get;
      if (f.type === 'rich') { input = rte(cur); get = function () { return input.getValue(); }; }
      else {
        input = f.type === 'list' ? h('textarea', { rows: '5', placeholder: 'One point per line' }) : (f.type === 'text' || f.type === 'meta') ? h('textarea', { rows: '3' }) : h('input', { type: 'text' });
        input.value = cur; input.addEventListener('input', markDirty); get = function () { return input.value.trim(); };
      }
      var same = function (a, b) { return f.type === 'rich' ? BF.plain(a) === BF.plain(b) && a.replace(/\s+/g, '') === b.replace(/\s+/g, '') : a === b; };
      getters.push(function (out) { var v = get(); if (v && !same(v, def)) out[f.key] = v; });
      if (!groups[f.group]) { groups[f.group] = []; order.push(f.group); }
      var reset = h('button', { class: 'link', type: 'button', text: 'Restore original wording', onclick: function () { if (f.type === 'rich') $('.rte-body', input).innerHTML = def; else input.value = def; markDirty(); } });
      var w = f.type === 'rich' ? h('div', { class: 'fld' }, h('span', { class: 'lab', text: f.label }), input) : field(f.label, input);
      add(w, h('small', {}, f.type === 'list' ? 'One point per line. ' : '', reset)); groups[f.group].push(w);
    });
    order.forEach(function (g, i) { add(main, h('details', Object.assign({ class: 'grp' }, i === 0 ? { open: true } : {}), h('summary', { text: g }), h('div', {}, groups[g]))); });
    var em = h('input', { type: 'email' }), ph = h('input', { type: 'text' }), ad = h('textarea', { rows: '3' }), as = h('input', { type: 'text' }), mp = h('input', { type: 'text' });
    mp.value = ct.map || 'Hanuman Mandir, Vijay Park Extension, GMS Road, Dehradun, Uttarakhand 248001'; mp.addEventListener('input', markDirty);
    em.value = ct.email || 'info@bellafoundation.in'; ph.value = ct.phone || '+91 90988 86443';
    ad.value = ct.address || 'Behind Barista, Beside Hanuman Mandir,\nVijay Park Extension, GMS Road,\nDehradun, Uttarakhand 248001'; as.value = ct.address_short || 'Vijay Park Extension, GMS Road, Dehradun';
    [em, ph, ad, as].forEach(function (i) { i.addEventListener('input', markDirty); });
    add(main, h('details', { class: 'grp' }, h('summary', { text: 'Contact details (used across the whole site)' }), h('div', {}, field('Email address', em), field('Phone number', ph), field('Office address', ad, 'One line per row.'), field('Short address (mobile menu)', as), field('Map location', mp, 'What Google Maps should search for to show your office on the Contact map.'))));
    var btn = h('button', { class: 'btn btn--go', type: 'button', text: 'Save and publish', onclick: function () {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { em.closest('details').open = true; em.focus(); toast('Please enter a valid email address.', 'err'); return; }
      busy(btn, async function () {
        try {
          var text = {}; getters.forEach(function (g) { g(text); });
          await saveContent('text', text);
          await saveContent('contact', { email: em.value.trim(), phone: ph.value.trim(), address: ad.value.trim(), address_short: as.value.trim(), map: mp.value.trim() });
          dirty = false; toast('Saved. The website now shows the new wording.', 'ok');
        } catch (e) { fail(e, 'Could not save'); }
      });
    } });
    add(main, h('div', { class: 'savebar' }, h('span', { class: 'state', text: 'Changes go live as soon as you save.' }), h('div', { class: 'actions' }, h('a', { class: 'btn', href: SITE + 'index.html', target: '_blank', rel: 'noopener', text: 'View homepage ↗' }), btn)));
  };

  /* ══════════ HOMEPAGE ══════════ */
  views.homepage = async function () {
    var c = await content(true), ps = await projects(true);
    var photos = JSON.parse(JSON.stringify(c.photos || {})), settings = Object.assign({ photo_seconds: 5 }, c.settings || {});
    var main = shell('homepage', 'Homepage', 'Choose the rotating photographs and which projects are featured on the homepage.');
    var D = window.BF_DEFAULT_PHOTOS || {};
    (window.BF_PHOTO_SLOTS || []).forEach(function (slot) {
      var custom = Array.isArray(photos[slot.key]) && photos[slot.key].length;
      var list = custom ? photos[slot.key] : slot.defaults.map(function (k) { return { url: D[k].url, alt: D[k].alt, pos: D[k].pos }; });
      list.forEach(function (i) { i.caption = i.alt || ''; });
      photos[slot.key] = list;
      var gal = gallery(list);
      add(main, h('div', { class: 'card' }, h('h2', { text: slot.label }), h('p', { class: 'muted', text: 'These photographs fade from one to the next. The caption is shown on the photograph.' }), gal,
        h('div', { class: 'actions', style: 'margin-top:12px' },
          h('button', { class: 'btn btn--sm', type: 'button', text: '+ Add a photograph', onclick: async function () { var m = await pickMedia('image', 'homepage'); if (m) { list.push({ url: m.url, alt: m.caption || '', caption: m.caption || '', pos: m.focus || '50% 50%' }); markDirty(); gal.redraw(); } } }),
          h('button', { class: 'btn btn--sm', type: 'button', text: 'Restore the original photographs', onclick: function () { list.length = 0; slot.defaults.forEach(function (k) { list.push({ url: D[k].url, alt: D[k].alt, caption: D[k].alt, pos: D[k].pos }); }); markDirty(); gal.redraw(); } }))));
    });
    var secs = h('input', { type: 'number', min: '3', max: '30', step: '1' }); secs.value = settings.photo_seconds; secs.addEventListener('input', markDirty);
    add(main, h('div', { class: 'card' }, h('h2', { text: 'Photograph timing' }), h('div', { class: 'form-grid' }, field('Seconds each photograph stays on screen', secs))));
    var pub = ps.filter(function (p) { return p.visibility === 'published'; }), feat = {};
    var fbox = h('div', { class: 'picks' });
    pub.forEach(function (p) { var cb = h('input', { type: 'checkbox' }); cb.checked = !!p.featured; feat[p.id] = !!p.featured; cb.addEventListener('change', function () { feat[p.id] = cb.checked; markDirty(); }); add(fbox, h('label', {}, cb, p.title)); });
    add(main, h('div', { class: 'card' }, h('h2', { text: 'Featured projects' }), h('p', { class: 'muted', text: 'The homepage shows up to three published projects. Featured projects are shown first; otherwise the most recent are used.' }), pub.length ? fbox : h('p', { class: 'muted small', text: 'There are no published projects yet. Until there are, the homepage shows the proposed initiatives.' })));
    var btn = h('button', { class: 'btn btn--go', type: 'button', text: 'Save and publish', onclick: function () {
      busy(btn, async function () {
        try {
          var out = {};
          (window.BF_PHOTO_SLOTS || []).forEach(function (slot) {
            var l = photos[slot.key].filter(function (i) { return i.url; }).map(function (i) { return { url: i.url, alt: (i.caption || '').trim(), pos: i.pos || '50% 50%' }; });
            var defs = slot.defaults.map(function (k) { return D[k].url + '|' + D[k].alt; }).join('||');
            if (l.length && l.map(function (i) { return i.url + '|' + i.alt; }).join('||') !== defs) out[slot.key] = l;
          });
          await saveContent('photos', out);
          await saveContent('settings', Object.assign({}, c.settings || {}, { photo_seconds: Math.max(3, Math.min(30, parseInt(secs.value, 10) || 5)) }));
          for (var i = 0; i < pub.length; i++) if (!!pub[i].featured !== feat[pub[i].id]) await sb.update('projects', pub[i].id, { featured: feat[pub[i].id] });
          cache.projects = null; dirty = false; toast('Saved. The homepage is updated.', 'ok');
        } catch (e) { fail(e, 'Could not save'); }
      });
    } });
    add(main, h('div', { class: 'savebar' }, h('span', { class: 'state', text: 'Changes go live as soon as you save.' }), h('div', { class: 'actions' }, h('a', { class: 'btn', href: SITE + 'index.html', target: '_blank', rel: 'noopener', text: 'View homepage ↗' }), btn)));
  };

  /* ══════════ GOVERNANCE DOCUMENTS ══════════ */
  views.documents = async function () {
    var c = await content(true), docs = Object.assign({}, c.documents || {});
    var main = shell('documents', 'Governance Documents', 'Certificates and reports for the “Registration details” list on the homepage. Uploading a file adds a “View document” link to its row; rows with no number and no file stay hidden.');
    var box = h('div', { class: 'card' }); add(main, box);
    async function set(key, val, msg) { if (val) docs[key] = val; else delete docs[key]; try { await saveContent('documents', docs); toast(msg, 'ok'); draw(); } catch (e) { fail(e, 'Could not save'); } }
    function draw() {
      box.innerHTML = '';
      add(box, h('table', { class: 'table' }, h('tbody', {}, (window.BF_DOCUMENTS || []).map(function (d) {
        var cur = docs[d.key], url = cur && BF.safeUrl(cur.url || cur);
        return h('tr', {}, h('td', {}, h('span', { class: 't-title', text: d.label }), h('div', { class: 'small muted' }, url ? h('a', { href: url, target: '_blank', rel: 'noopener', text: (cur.name || 'View the published file') + ' ↗' }) : 'No file published')),
          h('td', {}, h('span', { class: 'pill pill--' + (url ? 'published' : 'draft'), text: url ? 'published' : 'empty' })),
          h('td', {}, h('div', { class: 't-actions' },
            h('button', { class: 'btn btn--sm', type: 'button', text: url ? 'Replace PDF' : 'Upload PDF', onclick: async function () { var m = await pickMedia('document', 'governance'); if (m) set(d.key, { url: m.url, name: m.name }, 'Document published.'); } }),
            url ? h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Remove', onclick: async function () { if (await confirmBox('Remove this document from the website?', 'The “View document” link will be removed. The file stays in the Media Library.', 'Remove')) set(d.key, null, 'Document removed from the website.'); } }) : null)));
      }))));
    }
    draw();
  };

  /* ══════════ ENQUIRIES ══════════ */
  views.enquiries = async function () {
    var list = await sb.select('enquiries', { order: 'created_at.desc' });
    var main = shell('enquiries', 'Enquiries', 'Messages sent through the contact form on the website.');
    var box = h('div', { class: 'card' }); add(main, box);
    if (!list.length) return add(box, h('div', { class: 'empty' }, h('h3', { text: 'No enquiries yet' }), h('p', { text: 'Messages from the website contact form will appear here.' })));
    list.forEach(function (e) {
      add(box, h('div', { class: 'enq' }, h('div', { class: 'enq-head' },
        h('div', {}, h('strong', { text: e.name }), e.organisation ? ' · ' + e.organisation : '', ' ', h('span', { class: 'pill' + (e.handled ? '' : ' pill--new'), text: e.handled ? 'handled' : 'new' }), ' ', h('span', { class: 'pill', text: e.enquiry_type })),
        h('span', { class: 'small muted', text: when(e.created_at) })),
        h('p', { class: 'small' }, h('a', { href: 'mailto:' + e.email, text: e.email }), e.phone ? ' · ' + e.phone : ''),
        h('p', { class: 'enq-msg', text: e.message }),
        h('div', { class: 'actions', style: 'margin-top:8px' },
          h('a', { class: 'btn btn--sm', href: 'mailto:' + e.email + '?subject=' + encodeURIComponent('Re: your enquiry to Bella Foundation'), text: 'Reply by email' }),
          h('button', { class: 'btn btn--sm', type: 'button', text: e.handled ? 'Mark as new' : 'Mark as handled', onclick: async function () { try { await sb.update('enquiries', e.id, { handled: !e.handled }); views.enquiries(); } catch (er) { fail(er); } } }),
          h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: 'Delete', onclick: async function () { if (await confirmBox('Delete this enquiry?', 'This cannot be undone.', 'Delete', true)) { try { await sb.remove('enquiries', e.id); toast('Enquiry deleted.', 'ok'); views.enquiries(); } catch (er) { fail(er); } } } }))));
    });
  };

  /* ══════════ SETTINGS ══════════ */
  views.settings = async function () {
    var main = shell('settings', 'Website Settings', 'Your account and the connection to the website database.');
    var p1 = h('input', { type: 'password', autocomplete: 'new-password' }), p2 = h('input', { type: 'password', autocomplete: 'new-password' });
    var btn = h('button', { class: 'btn btn--pri', type: 'button', text: 'Change password', onclick: function () {
      if (p1.value.length < 8) { toast('Use at least 8 characters.', 'err'); return; }
      if (p1.value !== p2.value) { toast('The two passwords do not match.', 'err'); return; }
      busy(btn, async function () { try { await sb.updatePassword(p1.value); p1.value = p2.value = ''; toast('Password changed.', 'ok'); } catch (e) { fail(e, 'Could not change the password'); } });
    } });
    add(main, [
      h('div', { class: 'card' }, h('h2', { text: 'Your account' }), h('p', { class: 'muted', text: 'Signed in as ' + me.email }), h('div', { class: 'form-grid' }, field('New password', p1), field('Repeat new password', p2)), h('div', { class: 'actions', style: 'margin-top:14px' }, btn, h('button', { class: 'btn', type: 'button', text: 'Sign out', onclick: signOut }))),
      h('div', { class: 'card' }, h('h2', { text: 'Connection' }), h('p', { class: 'muted', text: 'This dashboard saves to the Supabase project at:' }), h('p', { style: 'word-break:break-all;font-weight:600', text: sb.url }),
        h('p', { class: 'small muted', style: 'margin-top:10px', text: 'To add another administrator: create the user in Supabase (Authentication → Users), then add that user to the “admins” table as described in the setup guide.' })),
      h('div', { class: 'card' }, h('h2', { text: 'Enquiry email alerts' }), h('p', { class: 'muted', text: 'Each website enquiry is emailed to the address under Website Content → Contact details, and saved under Enquiries. If you change that email address, the new inbox must confirm one activation email before enquiries arrive there (see the setup guide).' }))
    ]);
  };

  /* ── start ── */
  (async function () {
    try { sb = await BF.client(); } catch (e) { sb = null; }
    if (!sb) return setupScreen();
    await start();
  })();
})();
