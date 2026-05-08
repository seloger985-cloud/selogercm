-- ═══════════════════════════════════════════════════════════
--  SE LOGER CM — Table saved_searches (alertes annonces)
--  À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saved_searches (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email            TEXT        NOT NULL,
  city             TEXT,
  districts        TEXT[]      DEFAULT '{}',
  mode             TEXT        DEFAULT 'rent',
  type             TEXT,
  bedrooms         INTEGER,
  price            TEXT,
  furnished        BOOLEAN,
  active           BOOLEAN     DEFAULT true,
  token            TEXT        DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_email  ON saved_searches(email);
CREATE INDEX IF NOT EXISTS idx_ss_active ON saved_searches(active);
CREATE INDEX IF NOT EXISTS idx_ss_token  ON saved_searches(token);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut s'abonner (visiteur anonyme)
CREATE POLICY "ss_anyone_insert" ON saved_searches
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Le token permet de se désabonner (UPDATE via Netlify function)
CREATE POLICY "ss_token_update" ON saved_searches
  FOR UPDATE TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════
--  NOTE : la fonction Netlify send-alerts lit via service_role
--  (bypass RLS) — aucune policy SELECT n'est nécessaire.
--  Ajouter SB_SERVICE_KEY dans Netlify → Site config → Env vars.
-- ═══════════════════════════════════════════════════════════
