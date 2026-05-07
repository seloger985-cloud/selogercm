-- ═══════════════════════════════════════════════════════════
--  SE LOGER CM — Table agent_contacts (CRM terrain)
--  À exécuter dans le SQL Editor de Supabase Dashboard
-- ═══════════════════════════════════════════════════════════

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS agent_contacts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  phone          TEXT,
  address        TEXT,
  district       TEXT,
  city           TEXT        NOT NULL DEFAULT 'Douala',
  type           TEXT        NOT NULL DEFAULT 'apartment',
  bedrooms       INTEGER,
  price_estimate BIGINT,
  furnished      BOOLEAN     NOT NULL DEFAULT false,
  rent_sale      TEXT        NOT NULL DEFAULT 'rent',
  status         TEXT        NOT NULL DEFAULT 'prospect'
                             CHECK (status IN ('prospect','contacted','agreement','published','closed')),
  notes          TEXT,
  listing_id     UUID        REFERENCES listings(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index utiles
CREATE INDEX IF NOT EXISTS idx_agent_contacts_agent_id ON agent_contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contacts_status   ON agent_contacts(status);
CREATE INDEX IF NOT EXISTS idx_agent_contacts_district ON agent_contacts(district);

-- 3. Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION slcm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_contacts_updated_at ON agent_contacts;
CREATE TRIGGER trg_agent_contacts_updated_at
  BEFORE UPDATE ON agent_contacts
  FOR EACH ROW EXECUTE PROCEDURE slcm_set_updated_at();

-- 4. Row Level Security
ALTER TABLE agent_contacts ENABLE ROW LEVEL SECURITY;

-- Politique actuelle : un utilisateur connecté voit tout (agent unique)
-- Plus tard, remplacer par : USING (agent_id = auth.uid())
CREATE POLICY "agents_full_access" ON agent_contacts
  FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
--  Note pour passage en multi-agents plus tard :
--  DROP POLICY "agents_full_access" ON agent_contacts;
--  CREATE POLICY "agent_own_contacts" ON agent_contacts
--    FOR ALL USING (agent_id = auth.uid())
--    WITH CHECK (agent_id = auth.uid());
-- ═══════════════════════════════════════════════════════════
