/* Vercel serverless function — tells the website where its backend is.
   Reads two environment variables set in Vercel → Project → Settings → Environment Variables:
     SUPABASE_URL        e.g. https://abcdefgh.supabase.co
     SUPABASE_ANON_KEY   the PUBLIC key (called "Publishable key", or "anon" on older projects)
   Never put a secret or service-role key here: this function refuses to hand one out. */
function isSecret(key) {
  if (/^sb_secret_/i.test(key)) return true;
  var parts = key.split('.');
  if (parts.length === 3) {
    try { return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')).role === 'service_role'; } catch (e) {}
  }
  return false;
}
module.exports = function (req, res) {
  var url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  var key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.statusCode = 200;
  if (!url || !key) return res.end(JSON.stringify({ configured: false }));
  if (isSecret(key)) return res.end(JSON.stringify({ configured: false, error: 'SUPABASE_ANON_KEY contains a secret key. Replace it with the public (publishable) key.' }));
  res.end(JSON.stringify({ configured: true, url: url, key: key }));
};
module.exports.isSecret = isSecret;
