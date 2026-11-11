/* Vercel serverless function — /sitemap.xml. Lists the two main pages and every published project page. */
var cfg = require('./config.js');
module.exports = async function (req, res) {
  var host = req.headers['x-forwarded-host'] || req.headers.host || 'bellafoundation.in', proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  var site = (process.env.SITE_URL || proto + '://' + host).replace(/\/+$/, '');
  var url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''), key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  var items = [{ loc: site + '/' }, { loc: site + '/projects.html' }];
  if (url && key && !cfg.isSecret(key)) {
    try {
      var h = { apikey: key, Accept: 'application/json' }; if (/^eyJ/.test(key)) h.Authorization = 'Bearer ' + key;
      var r = await fetch(url + '/rest/v1/projects?select=slug,updated_at&visibility=eq.published', { headers: h });
      if (r.ok) (await r.json()).forEach(function (p) { if (p.slug) items.push({ loc: site + '/projects/' + encodeURIComponent(p.slug), lastmod: String(p.updated_at || '').slice(0, 10) }); });
    } catch (e) {}
  }
  res.statusCode = 200; res.setHeader('Content-Type', 'application/xml; charset=utf-8'); res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items.map(function (i) { return '  <url><loc>' + i.loc.replace(/&/g, '&amp;') + '</loc>' + (i.lastmod ? '<lastmod>' + i.lastmod + '</lastmod>' : '') + '</url>'; }).join('\n') + '\n</urlset>\n');
};
