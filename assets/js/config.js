/* Bella Foundation — optional manual backend configuration.
   Normally leave both values empty: when the site runs on Vercel, the values are
   read from the SUPABASE_URL and SUPABASE_ANON_KEY environment variables through
   /api/config. Fill these in only if you host the site somewhere without that function.
   Both values are safe to publish: the key is the public (publishable) key, and the
   database is protected by the security rules in supabase/schema.sql. */
window.BF_SUPABASE = { url: "", key: "" };
