-- ═══════════════════════════════════════════════════════════════
-- SE LOGER CM — Migration : table invoices
-- Stocke les factures émises pour archivage et compta agrégée future.
-- Lien optionnel avec la table receipts pour traçage paiements.
-- Idempotent : peut être exécuté plusieurs fois sans risque.
-- ═══════════════════════════════════════════════════════════════

-- Table principale
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT UNIQUE NOT NULL,            -- format: FAC-2026-0001
  client_name     TEXT NOT NULL,                   -- nom du client
  client_phone    TEXT,                            -- téléphone (optionnel)
  client_email    TEXT,                            -- email (optionnel, pour envoi par mail)
  client_address  TEXT,                            -- adresse complète
  client_district TEXT,                            -- quartier
  property_type   TEXT,                            -- type de bien
  property_ref    TEXT,                            -- référence interne du bien
  -- Lignes de prestations (JSONB pour flexibilité)
  -- Format: [{type, label, base, rate, amount, detail1, detail2}]
  line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal        NUMERIC(15, 0) NOT NULL DEFAULT 0,
  discount        NUMERIC(15, 0) NOT NULL DEFAULT 0,
  total           NUMERIC(15, 0) NOT NULL DEFAULT 0,
  notes           TEXT,                            -- notes sur la facture
  -- Statut
  status          TEXT NOT NULL DEFAULT 'emise' CHECK (status IN ('emise', 'payee', 'annulee')),
  payment_date    DATE,                            -- date de paiement effectif (null si pas encore payée)
  receipt_id      UUID REFERENCES receipts(id) ON DELETE SET NULL,  -- lien vers reçu si payée
  -- Métadonnées
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,                            -- date d'échéance
  issued_by       TEXT,                            -- email de l'émetteur
  internal_notes  TEXT,                            -- notes internes (non imprimées)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS invoices_number_idx       ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS invoices_invoice_date_idx ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS invoices_client_idx       ON invoices(client_name);
CREATE INDEX IF NOT EXISTS invoices_status_idx       ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_receipt_idx      ON invoices(receipt_id);

-- Trigger pour auto-mettre à jour updated_at
-- (réutilise la même fonction que pour receipts si elle existe)
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_updated_at_trigger ON invoices;
CREATE TRIGGER invoices_updated_at_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- Seuls les utilisateurs authentifiés (admin) peuvent lire/écrire.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_admin_read   ON invoices;
DROP POLICY IF EXISTS invoices_admin_insert ON invoices;
DROP POLICY IF EXISTS invoices_admin_update ON invoices;
DROP POLICY IF EXISTS invoices_admin_delete ON invoices;

CREATE POLICY invoices_admin_read   ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY invoices_admin_insert ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY invoices_admin_update ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY invoices_admin_delete ON invoices FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- AJOUT À LA TABLE receipts : lien vers facture (optionnel)
-- Permet de savoir qu'un reçu a été émis suite à une facture précise.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS receipts_invoice_idx ON receipts(invoice_id);

-- ═══════════════════════════════════════════════════════════════
-- Vérification : à exécuter pour confirmer
-- ═══════════════════════════════════════════════════════════════
-- SELECT count(*) FROM invoices;
-- SELECT * FROM pg_indexes WHERE tablename = 'invoices';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'invoice_id';
