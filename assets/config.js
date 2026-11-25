/* N-KELL — database configuration.
   Fill in your Supabase project values to switch the site to cloud mode
   (Supabase Dashboard → Project Settings → API).
   The anon key is designed to be public: security is enforced by the row-level security
   rules in supabase/schema.sql. NEVER put the service_role key here.
   Leave both empty to run in local mode (data stays in the browser). */
window.NK = window.NK || {};
NK.CLOUD_CONFIG = {
  url: '',      // e.g. 'https://abcdefghijkl.supabase.co'
  anonKey: ''   // the "anon public" key
};
