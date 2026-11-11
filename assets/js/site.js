/* Bella Foundation — behaviour shared by every public page:
   navigation, scroll effects, rotating photographs, editable content, enquiry form. */
(function () {
  'use strict';
  var BF = window.BF = window.BF || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  BF.reduced = reduced;

  /* Default homepage photographs. They can be replaced from the admin dashboard (Homepage photographs). */
  var DEFAULT_PHOTOS = {};
  Object.keys(window.BF_DEFAULT_PHOTOS || {}).forEach(function (k) { var d = window.BF_DEFAULT_PHOTOS[k]; DEFAULT_PHOTOS[k] = { src: BF.root + d.url, alt: d.alt, pos: d.pos }; });
  BF.DEFAULT_PHOTOS = DEFAULT_PHOTOS;
  var photoSeconds = 5;

  /* ── scroll reveals ── */
  var rio = null;
  BF.observe = function (root) {
    var els = $$('[data-reveal],[data-stagger]', root || document);
    if (!document.documentElement.classList.contains('js') || !rio) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    els.forEach(function (el) { if (!el.classList.contains('in')) rio.observe(el); });
  };

  /* ── rotating photographs ── */
  var rot = { paused: reduced, buttons: [] };
  var ICONS = '<svg class="i-pause" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3.500" height="12"/><rect x="8.500" y="1" width="3.500" height="12"/></svg><svg class="i-play" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1l9 6-9 6z"/></svg>';
  function syncButtons() {
    rot.buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(rot.paused));
      b.setAttribute('aria-label', rot.paused ? 'Resume changing photographs' : 'Pause changing photographs');
    });
    document.body.classList.toggle('motion-paused', rot.paused);
  }
  var slotVis = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.__vis = en.isIntersecting; });
  }, { rootMargin: '100px' }) : null;

  function initSlot(fig, items, idx) {
    if (fig.__timer) clearInterval(fig.__timer);
    if (fig.__t0) clearTimeout(fig.__t0);
    $$('img.ph,.slot-btn', fig).forEach(function (n) { rot.buttons = rot.buttons.filter(function (b) { return b !== n; }); n.remove(); });
    fig.classList.remove('has-img');
    items = (items || []).map(function (it) { return it && { src: BF.safeUrl(it.src || it.url), alt: it.alt || it.caption || '', pos: it.pos || '50% 50%' }; }).filter(function (it) { return it && it.src; });
    var capT = $('.slot-cap-t', fig), capN = $('.slot-cap-n', fig), cap = $('.slot-cap', fig);
    if (!items.length) { if (capT) capT.textContent = ''; if (capN) capN.textContent = ''; return; }
    var front = new Image(), back = new Image();
    [front, back].forEach(function (im) { im.className = 'ph'; im.alt = ''; im.decoding = 'async'; fig.insertBefore(im, cap); });
    var cur = 0, busy = false;
    function load(img, i) { img.style.objectPosition = items[i].pos; img.alt = items[i].alt; img.src = items[i].src; }
    function caption(i) {
      if (capT) capT.textContent = items[i].alt;
      if (capN) capN.textContent = items.length > 1 ? (i + 1) + ' / ' + items.length : '';
    }
    front.onload = function () { fig.classList.add('has-img'); front.onload = null; };
    load(front, 0); front.classList.add('on'); caption(0);
    fig.__vis = true;
    if (slotVis) slotVis.observe(fig);
    if (items.length < 2) return;
    function next() {
      if (busy) return; busy = true;
      var n = (cur + 1) % items.length;
      var swap = function () { back.classList.add('on'); front.classList.remove('on'); var t = front; front = back; back = t; cur = n; caption(n); busy = false; };
      load(back, n);
      if (back.decode) back.decode().then(swap, swap); else swap();
    }
    fig.__t0 = setTimeout(function () {
      fig.__timer = setInterval(function () { if (!rot.paused && fig.__vis && !document.hidden) next(); }, Math.max(3, photoSeconds) * 1000);
    }, 600 + (idx || 0) * 850);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'slot-btn'; btn.innerHTML = ICONS;
    btn.addEventListener('click', function () { rot.paused = !rot.paused; syncButtons(); });
    fig.appendChild(btn); rot.buttons.push(btn);
    syncButtons();
  }
  function defaultItems(fig) {
    return (fig.getAttribute('data-photos') || '').split(',').map(function (k) { return DEFAULT_PHOTOS[k.trim()]; }).filter(Boolean);
  }

  /* ── editable content (saved in the admin dashboard) ── */
  function inline(v) {
    return BF.esc(String(v)).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  }
  BF.contactEmail = 'info@bellafoundation.in';
  BF.contactPhone = '+91 90988 86443';
  function applyContent(c) {
    c = c || {};
    var text = c.text || {};
    var onProjects = !!document.getElementById('indiaMap');
    (window.BF_CMS_FIELDS || []).forEach(function (f) {
      var v = text[f.key]; if (v == null || String(v).trim() === '') return;
      if ((f.page === 'projects.html') !== onProjects) return;   /* each field belongs to one page */
      if (window.BF_INITIAL_PROJECT && (f.type === 'doctitle' || f.type === 'meta' || /phero/.test(f.sel))) return;   /* a project's own page keeps its own title and heading */
      var el = $(f.sel); if (!el) return;
      if (f.type === 'label') { var svg = el.querySelector('svg'); el.textContent = BF.plain(v) + ' '; if (svg) el.appendChild(svg); }
      else if (f.type === 'doctitle') { document.title = BF.plain(v); $$('meta[property="og:title"],meta[name="twitter:title"]').forEach(function (m) { m.setAttribute('content', BF.plain(v)); }); }
      else if (f.type === 'meta') { el.setAttribute('content', BF.plain(v)); $$('meta[property="og:description"],meta[name="twitter:description"]').forEach(function (m) { m.setAttribute('content', BF.plain(v)); }); }
      else if (f.type === 'rich') el.innerHTML = BF.sanitize(v);
      else if (f.type === 'list') {
        $$('li', el).forEach(function (li) { if (!li.classList.contains('stage-out')) li.remove(); });
        String(v).split('\n').forEach(function (line) { line = line.trim(); if (!line) return; var li = document.createElement('li'); li.textContent = line; el.appendChild(li); });
      }
      else { el.innerHTML = inline(v); el.classList.remove('split'); }
    });
    var ct = c.contact || {};
    if (ct.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email)) {
      $$('a[href^="mailto:"]').forEach(function (a) {
        var old = a.getAttribute('href').slice(7).split('?')[0];
        if (a.textContent.trim() === old) a.textContent = ct.email;
        a.setAttribute('href', 'mailto:' + ct.email);
      });
      BF.contactEmail = ct.email;
    }
    if (ct.phone) {
      $$('a[href^="tel:"]').forEach(function (a) { a.textContent = ct.phone; a.setAttribute('href', 'tel:' + ct.phone.replace(/[^\d+]/g, '')); });
      BF.contactPhone = ct.phone;
    }
    /* keep the organisation details that search engines read in step with the contact details */
    var org = $('#orgData');
    if (org && (ct.email || ct.phone)) {
      try {
        var ld = JSON.parse(org.textContent), o = ld[0], tel = ct.phone ? ct.phone.replace(/[^\d+]/g, '') : '';
        if (ct.email) { o.email = ct.email; if (o.contactPoint) o.contactPoint.email = ct.email; }
        if (tel) { o.telephone = tel; if (o.contactPoint) o.contactPoint.telephone = tel; }
        org.textContent = JSON.stringify(ld);
      } catch (e) {}
    }
    if (ct.address) $$('[data-address]').forEach(function (el) { el.innerHTML = BF.esc(ct.address).replace(/\n/g, '<br>'); });
    if (ct.map) {
      var mq = encodeURIComponent(ct.map);
      $$('.map iframe').forEach(function (f) { var src = 'https://www.google.com/maps?q=' + mq + '&output=embed'; if (f.getAttribute('src') !== src) f.setAttribute('src', src); });
      $$('a.map-link').forEach(function (a) { a.setAttribute('href', 'https://www.google.com/maps/search/?api=1&query=' + mq); });
    }
    if (ct.address_short) $$('[data-address-short]').forEach(function (el) { el.textContent = ct.address_short; });
    var st = c.settings || {};
    if (+st.photo_seconds >= 3) photoSeconds = +st.photo_seconds;
    var ph = c.photos || {};
    $$('.slot[data-slot]').forEach(function (fig, i) {
      var list = ph[fig.getAttribute('data-slot')];
      if (Array.isArray(list) && list.length) initSlot(fig, list, i);
    });
    /* Registration details: a row with a number is always shown; any row gains a "View document"
       link once a file is published for it; rows with neither stay hidden. */
    var docs = c.documents || {};
    $$('[data-doc]').forEach(function (li) {
      var d = docs[li.getAttribute('data-doc')], url = BF.safeUrl(d && (d.url || d));
      var old = $('a.doc-link', li); if (old) old.remove();
      if (url) {
        var a = document.createElement('a');
        a.className = 'doc-link'; a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'View document';
        li.appendChild(a); li.hidden = false;
      } else if (!$('.doc-val', li)) li.hidden = true;
    });
  }

  /* ── homepage: recent projects and partners preview ── */
  function homeDynamic(d) {
    var grid = $('#homeProjects'), blockEl = $('#homeProjectsBlock');
    if (grid && blockEl) {
      var list = d.projects.filter(function (p) { return !p.__preview; });
      var pick = list.filter(function (p) { return p.featured; }).concat(list.filter(function (p) { return !p.featured; })).slice(0, 3);
      grid.innerHTML = '';
      pick.forEach(function (p) { grid.appendChild(BF.projectCard(p, d, { base: 'projects.html' })); });
      blockEl.hidden = !pick.length;
    }
    var hp = $('#homePartners');
    if (hp && d.partners.length) {
      var row = $('.plogos', hp); row.innerHTML = '';
      d.partners.filter(function (x) { return !x.__preview; }).slice(0, 8).forEach(function (pt) {
        var n = d.projects.filter(function (p) { return p.partner_ids.indexOf(pt.id) > -1; }).length;
        row.appendChild(BF.partnerTile(pt, n, 'projects.html'));
      });
      hp.hidden = !row.children.length;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* reveals */
    if (document.documentElement.classList.contains('js')) {
      rio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    BF.observe(document);
    window.__bfReady = true;

    /* cached content first (so saved wording appears without a flash), then the live copy */
    if (!BF.demo) { try { var cached = JSON.parse(localStorage.getItem('bf_content_cache') || 'null'); if (cached) applyContent(cached); } catch (e) {} }

    /* hero headline: word-by-word reveal */
    if (!reduced) (function () {
      var h1 = $('.hero h1'); if (!h1) return;
      var i = 0;
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'w';
              var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
              wi.style.animationDelay = (1.05 + i++ * 0.07) + 's';
              w.appendChild(wi); frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) split(n);
        });
      })(h1);
      h1.classList.add('split');
    })();

    /* photographs */
    $$('.slot[data-photos]').forEach(function (fig, i) { initSlot(fig, defaultItems(fig), i); });
    syncButtons();

    /* pointer polish: gentle card tilt and button pull (mouse only) */
    if (!reduced && finePointer) {
      $$('.fcard,.path').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          card.style.transform = 'perspective(1000px) rotateX(' + (-py * 3.2) + 'deg) rotateY(' + (px * 3.8) + 'deg) translateY(-5px)';
        });
        card.addEventListener('mouseleave', function () { card.style.transform = ''; });
      });
      $$('.btn').forEach(function (b) {
        b.addEventListener('mousemove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .16) + 'px,' + ((e.clientY - r.top - r.height / 2) * .24) + 'px)';
        });
        b.addEventListener('mouseleave', function () { b.style.transform = ''; });
      });
    }

    /* nav: progress, hide/show, solid, active section */
    var nav = $('#nav'), progress = $('#progress'), lastY = window.scrollY, ticking = false, nums = $$('.sec-head .num');
    function onScroll() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      nav.classList.toggle('is-solid', y > 40);
      if (!nav.classList.contains('menu-open')) {
        if (y > lastY + 6 && y > 420) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y <= 420) nav.classList.remove('is-hidden');
      }
      if (!reduced) nums.forEach(function (n) { var r = n.getBoundingClientRect(); if (r.bottom > -200 && r.top < innerHeight + 200) n.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - innerHeight / 2) * -0.07).toFixed(1) + 'px,0)'; });
      lastY = y; ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });

    var navLinks = $$('.nav-links a[href^="#"]');
    if (navLinks.length && 'IntersectionObserver' in window) {
      var aio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          navLinks.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + en.target.id;
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach(function (s) { aio.observe(s); });
    }

    /* mobile menu */
    var burger = $('#burger'), menu = $('#menu');
    function setMenu(open) {
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('menu-open', open);
      nav.classList.remove('is-hidden');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180 && menu.classList.contains('is-open')) setMenu(false); });

    /* links: close the menu, preselect the enquiry type */
    var interest = $('#f-int');
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      if (menu.classList.contains('is-open')) setMenu(false);
      var pick = a.getAttribute('data-interest');
      if (pick) { if (interest) interest.value = pick; else try { sessionStorage.setItem('bf_interest', pick); } catch (er) {} }
    });
    if (interest) { try { var keep = sessionStorage.getItem('bf_interest'); if (keep) { interest.value = keep; sessionStorage.removeItem('bf_interest'); } } catch (er) {} }

    /* enquiry form */
    var form = $('#form');
    if (form) (function () {
      var status = $('#formStatus'), btn = $('#formBtn'), note = $('#formNote');
      function say(kind, html) { status.className = 'form-status full' + (kind ? ' ' + kind : ''); status.innerHTML = html; }
      function mailLink() { return '<a href="mailto:' + BF.esc(BF.contactEmail) + '">' + BF.esc(BF.contactEmail) + '</a>'; }
      /* Delivery:
         1. Email — the enquiry is emailed to the foundation's address through the FormSubmit relay.
         2. Record — when the database is connected, it is also saved for the dashboard's Enquiries page.
         The visitor is told it was sent only if at least one of the two confirms it. Otherwise the
         visitor's own email application is opened with the message drafted. */
      var canSend = location.protocol === 'http:' || location.protocol === 'https:';
      var live = false;
      if (canSend) {
        fetch('/api/contact', { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { live = !!(j && j.ready === true); }).catch(function () {});
      } else note.textContent = 'Your enquiry will open in your email application, ready to send to ' + BF.contactEmail + '.';
      function emailIt(data) {
        var body = { _subject: 'Website enquiry — ' + data.enquiry_type + ' — ' + data.name, _replyto: data.email, _template: 'table', _captcha: 'false',
          Name: data.name, Organisation: data.organisation || '—', Email: data.email, Phone: data.phone || '—', 'Enquiry type': data.enquiry_type, Message: data.message };
        return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(BF.contactEmail), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && String(j.success) === 'true'; }); })
          .catch(function () { return false; });
      }
      function storeIt(data) {
        if (!live) return Promise.resolve(false);
        return fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok === true; }); })
          .catch(function () { return false; });
      }
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var v = function (id) { return ($('#' + id).value || '').trim(); };
        var missing = ['f-name', 'f-email', 'f-msg'].filter(function (id) { return !v(id); });
        if (missing.length) { say('err', 'Please complete your name, email and message.'); $('#' + missing[0]).focus(); return; }
        if (!$('#f-email').checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('f-email'))) { say('err', 'Please enter a valid email address.'); $('#f-email').focus(); return; }
        if (v('f-web')) return; /* spam trap: this hidden field is only ever filled by bots */
        var data = { name: v('f-name'), organisation: v('f-org'), email: v('f-email'), phone: v('f-phone'), enquiry_type: v('f-int'), message: v('f-msg') };
        function viaEmail(lead) {
          var subject = 'Website enquiry — ' + data.enquiry_type + ' — ' + data.name;
          var body = ['Name: ' + data.name, 'Organisation: ' + (data.organisation || '—'), 'Email: ' + data.email, 'Phone: ' + (data.phone || '—'), 'Enquiry type: ' + data.enquiry_type, '', data.message].join('\n');
          window.location.href = 'mailto:' + BF.contactEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          say(lead ? 'err' : '', (lead || '') + 'Your email application should now open with this enquiry drafted. It is sent only when you press Send there. If nothing opened, please write to ' + mailLink() + ' or call ' + BF.esc(BF.contactPhone) + '.');
        }
        if (!canSend) { viaEmail(); return; }
        btn.disabled = true; say('', 'Sending your enquiry…');
        var done = await Promise.all([emailIt(data), storeIt(data)]);
        btn.disabled = false;
        if (done[0] || done[1]) { form.reset(); say('ok', 'Thank you. Your enquiry has been sent to the Bella Foundation team, and we will respond by email.'); }
        else viaEmail('Your enquiry could not be sent from this page. ');
      });
    })();

    /* hero background */
    if ($('#gl')) {
      function initGL() {
        var canvas = $('#gl'), hero = $('.hero');
        var gl = null;
        try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) {}
        if (!gl) return;
        var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
        var fs = [
          'precision highp float;uniform vec2 r;uniform float t;uniform vec2 m;',
          'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
          'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
          'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}',
          'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv;p.x*=r.x/r.y;vec2 mm=(m-.5)*.3;',
          'float q=fbm(p*1.3+vec2(t*.04,-t*.03)+mm);',
          'float w=fbm(p*1.9+q*1.7+vec2(-t*.03,t*.045)-mm);',
          'vec3 a=vec3(.05,.09,.17),b=vec3(.13,.22,.38),c=vec3(.80,.58,.32),d=vec3(.70,.36,.24);',
          'vec3 col=mix(a,b,smoothstep(.2,.85,w));',
          'col=mix(col,c,smoothstep(.34,.64,w*q*1.9)*.52);',
          'col=mix(col,d,smoothstep(.45,.85,fbm(p*1.1-vec2(t*.03)+w))*.34*(1.-uv.y*.6));',
          'col*=.8+.3*uv.y;gl_FragColor=vec4(col,1.);}'
        ].join('\n');
        function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
        var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
        if (!a || !b) return;
        var prog = gl.createProgram(); gl.attachShader(prog, a); gl.attachShader(prog, b); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        var uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');
        var tx = .7, ty = .6, cx = tx, cy = ty, visible = true, running = false, start = performance.now();
        function size() {
          var dpr = Math.min(window.devicePixelRatio || 1, 1.25), w = hero.clientWidth, hgt = hero.clientHeight;
          canvas.width = Math.max(1, Math.floor(w * dpr * .7)); canvas.height = Math.max(1, Math.floor(hgt * dpr * .7));
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
        function frame(now) {
          if (!visible) { running = false; return; }
          cx += (tx - cx) * .04; cy += (ty - cy) * .04;
          gl.uniform2f(uR, canvas.width, canvas.height);
          gl.uniform1f(uT, (now - start) / 1000);
          gl.uniform2f(uM, cx, cy);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (reduced) { running = false; return; }
          requestAnimationFrame(frame);
        }
        function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
        size(); kick(); canvas.classList.add('is-on');
        window.addEventListener('resize', function () { size(); kick(); });
        hero.addEventListener('mousemove', function (e) { var r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; }, { passive: true });
        if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
        document.addEventListener('visibilitychange', function () { if (document.hidden) visible = false; else { visible = true; kick(); } });
      }
      if ('requestIdleCallback' in window) requestIdleCallback(initGL, { timeout: 1200 }); else setTimeout(initGL, 300);
    }

    /* live content, recent projects and partners */
    if (BF.load) BF.load().then(function (d) {
      if (!BF.demo) { try { localStorage.setItem('bf_content_cache', JSON.stringify(d.content || {})); } catch (e) {} }
      applyContent(d.content);
      homeDynamic(d);
      document.dispatchEvent(new CustomEvent('bf:data', { detail: d }));
    });
  });
})();
