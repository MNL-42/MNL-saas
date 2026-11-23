/* ───────────────────────────────────────────────────────────────
   NACRE · configuration
   Ces deux valeurs pointent vers TA base Supabase « nacre ».
   La clé « publishable » est faite pour être publique : ce sont les
   règles RLS de schema.sql qui protègent tes données, pas la clé.
   NE METS JAMAIS ici la clé « service_role » ou « secret ».
   ─────────────────────────────────────────────────────────────── */
window.NACRE_CONFIG = {
  SUPABASE_URL:      'https://pxkstvwikiwczwntfldl.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_fXg3KYi7ey9SvUOFVIhHhg_3ChfocVa',
  TABLE_PREFIX:      ''   // laisse vide : les tables s'appellent profiles, accounts, transactions…
};
