/* Bella Foundation — small Supabase client (Auth, Database, Storage) built on fetch.
   No external library is needed. Only the public key is ever used in the browser. */
(function () {
  'use strict';
  var SK = 'bf_admin_session';

  function SB(url, key) {
    this.url = String(url || '').replace(/\/+$/, '');
    this.key = key || '';
    this.session = null;
    try { this.session = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) {}
  }

  SB.prototype._save = function (s) {
    this.session = s;
    try { if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); } catch (e) {}
  };

  SB.prototype._headers = function (extra, anon) {
    var h = { apikey: this.key };
    var token = !anon && this.session && this.session.access_token;
    if (token) h.Authorization = 'Bearer ' + token;
    else if (/^eyJ/.test(this.key)) h.Authorization = 'Bearer ' + this.key; /* legacy anon keys are JWTs */
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  };

  SB.prototype._fetch = async function (path, opts, anon) {
    opts = opts || {};
    if (!anon && this.session && this.session.expires_at && this.session.expires_at - Date.now() / 1000 < 60) {
      try { await this.refresh(); } catch (e) {}
    }
    var self = this;
    var go = function () {
      return fetch(self.url + path, { method: opts.method || 'GET', headers: self._headers(opts.headers, anon), body: opts.body });
    };
    var res = await go();
    if (res.status === 401 && !anon && this.session && this.session.refresh_token) {
      try { await this.refresh(); res = await go(); } catch (e) {}
    }
    var text = await res.text(), data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      var msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('Request failed (' + res.status + ')');
      var err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  };

  /* ── Auth ── */
  SB.prototype._setSession = function (d) {
    this._save({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: d.user || (this.session && this.session.user) });
    return this.session;
  };
  SB.prototype.signIn = async function (email, password) {
    var d = await this._fetch('/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) }, true);
    return this._setSession(d);
  };
  SB.prototype.refresh = async function () {
    if (!this.session || !this.session.refresh_token) throw new Error('Not signed in');
    try {
      var d = await this._fetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: this.session.refresh_token }) }, true);
      return this._setSession(d);
    } catch (e) { if (e.status === 400 || e.status === 401) this._save(null); throw e; }
  };
  SB.prototype.signOut = async function () {
    try { await this._fetch('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
    this._save(null);
  };
  SB.prototype.updatePassword = function (password) {
    return this._fetch('/auth/v1/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password }) });
  };

  /* ── Database (REST) ── */
  function qs(obj) {
    var out = [];
    for (var k in obj || {}) if (obj[k] !== undefined && obj[k] !== null) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
    return out.length ? '?' + out.join('&') : '';
  }
  SB.prototype.select = function (table, query, anon) {
    var q = { select: '*' }; for (var k in query || {}) q[k] = query[k];
    return this._fetch('/rest/v1/' + table + qs(q), {}, anon);
  };
  SB.prototype.insert = function (table, rows, opt) {
    opt = opt || {};
    var prefer = ['return=' + (opt.minimal ? 'minimal' : 'representation')];
    if (opt.upsert) prefer.push('resolution=merge-duplicates');
    return this._fetch('/rest/v1/' + table + (opt.onConflict ? '?on_conflict=' + opt.onConflict : ''), { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: prefer.join(',') }, body: JSON.stringify(rows) });
  };
  SB.prototype.update = function (table, id, patch, col) {
    return this._fetch('/rest/v1/' + table + '?' + (col || 'id') + '=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(patch) });
  };
  SB.prototype.remove = function (table, id, col) {
    return this._fetch('/rest/v1/' + table + '?' + (col || 'id') + '=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  };

  /* ── Storage ── */
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  SB.prototype.publicUrl = function (bucket, path) { return this.url + '/storage/v1/object/public/' + bucket + '/' + encPath(path); };
  SB.prototype.upload = async function (bucket, path, blob, contentType) {
    await this._fetch('/storage/v1/object/' + bucket + '/' + encPath(path), { method: 'POST', headers: { 'Content-Type': contentType || blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': 'max-age=3600' }, body: blob });
    return this.publicUrl(bucket, path);
  };
  SB.prototype.removeFiles = function (bucket, paths) {
    return this._fetch('/storage/v1/object/' + bucket, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) });
  };

  window.BFSupabase = SB;
})();
