/* Vercel serverless function — receives the website enquiry form.
   The enquiry is stored in the "enquiries" table of the Supabase project (visible in the admin
   dashboard under Enquiries). The visitor is told it was received only if the database accepted it.

   Uses the same environment variables as /api/config (SUPABASE_URL, SUPABASE_ANON_KEY).
   Optional email alert: set RESEND_API_KEY, ENQUIRY_NOTIFY_TO and ENQUIRY_NOTIFY_FROM to also
   receive each enquiry by email through resend.com. The enquiry is saved even if the email fails. */
var cfg = require('./config.js');
var TYPES = ['Corporate CSR Partnership', 'Project Implementation', 'Institutional Collaboration', 'NGO Partnership', 'Volunteering', 'General Enquiry'];

function env() {
  var url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  var key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return url && key && !cfg.isSecret(key) ? { url: url, key: key } : null;
}
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve(null); } }
    return Promise.resolve(req.body);
  }
  return new Promise(function (resolve) {
    var data = '';
    req.on('data', function (c) { data += c; if (data.length > 50000) req.destroy(); });
    req.on('end', function () { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve(null); } });
    req.on('error', function () { resolve(null); });
  });
}
function clean(v, max) { return String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, max); }

module.exports = async function (req, res) {
  var c = env();
  if (req.method === 'GET') return send(res, 200, { ready: !!c });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'method_not_allowed' }); }
  if (!c) return send(res, 503, { ok: false, error: 'not_configured' });

  var b = await readBody(req);
  if (!b || typeof b !== 'object') return send(res, 422, { ok: false, error: 'invalid', message: 'The enquiry could not be read. Please try again.' });
  if (clean(b.website, 200)) return send(res, 200, { ok: true }); /* spam trap: bots fill the hidden field; nothing is stored */

  var row = {
    name: clean(b.name, 160), organisation: clean(b.organisation, 200), email: clean(b.email, 200), phone: clean(b.phone, 40),
    enquiry_type: TYPES.indexOf(clean(b.enquiry_type, 60)) > -1 ? clean(b.enquiry_type, 60) : 'General Enquiry', message: clean(b.message, 5000)
  };
  if (!row.name || !row.message) return send(res, 422, { ok: false, error: 'invalid', message: 'Please complete your name, email and message.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return send(res, 422, { ok: false, error: 'invalid', message: 'Please enter a valid email address.' });

  var headers = { 'Content-Type': 'application/json', apikey: c.key, Prefer: 'return=minimal' };
  if (/^eyJ/.test(c.key)) headers.Authorization = 'Bearer ' + c.key;
  try {
    var r = await fetch(c.url + '/rest/v1/enquiries', { method: 'POST', headers: headers, body: JSON.stringify(row) });
    if (!r.ok) {
      console.error('Enquiry not stored:', r.status, (await r.text()).slice(0, 300));
      return send(res, 502, { ok: false, error: 'store_failed' });
    }
  } catch (e) {
    console.error('Enquiry not stored:', e && e.message);
    return send(res, 502, { ok: false, error: 'store_failed' });
  }

  /* optional email alert — never changes the answer given to the visitor */
  var rk = process.env.RESEND_API_KEY, to = process.env.ENQUIRY_NOTIFY_TO, from = process.env.ENQUIRY_NOTIFY_FROM;
  if (rk && to && from) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + rk },
        body: JSON.stringify({ from: from, to: to.split(',').map(function (s) { return s.trim(); }), reply_to: row.email, subject: 'Website enquiry — ' + row.enquiry_type + ' — ' + row.name,
          text: ['Name: ' + row.name, 'Organisation: ' + (row.organisation || '—'), 'Email: ' + row.email, 'Phone: ' + (row.phone || '—'), 'Enquiry type: ' + row.enquiry_type, '', row.message].join('\n') })
      });
    } catch (e) { console.error('Enquiry email alert failed:', e && e.message); }
  }
  return send(res, 200, { ok: true });
};
