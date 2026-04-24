-- ══════════════════════════════════════════════════════════════════
-- SE LOGER CM — Migration : Reels Visites Express
-- Ajoute le support vidéo aux annonces pour la section Reels
-- ══════════════════════════════════════════════════════════════════
-- Cette migration est idempotente : tu peux la relancer sans crainte.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ══════════════════════════════════════════════════════════════════

-- 1. Colonne video_url sur la table listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN listings.video_url IS
  'URL publique Supabase Storage vers la vidéo Reel de l''annonce (bucket listing-videos). NULL = pas de reel.';

-- 2. Index partiel pour accélérer la requête "annonces avec vidéo"
CREATE INDEX IF NOT EXISTS listings_video_idx
  ON listings(created_at DESC)
  WHERE video_url IS NOT NULL;

-- 3. Bucket public dédié aux vidéos Reels
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-videos', 'listing-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies storage pour le bucket listing-videos
--    (DROP + CREATE pour garantir l'idempotence)

-- 4a. Upload : tout utilisateur authentifié (phase admin-only : seul l'admin uploadera en pratique)
DROP POLICY IF EXISTS "listing_videos_upload_authenticated" ON storage.objects;
CREATE POLICY "listing_videos_upload_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-videos');

-- 4b. Lecture : publique (les reels doivent être visibles par tous les visiteurs)
DROP POLICY IF EXISTS "listing_videos_read_public" ON storage.objects;
CREATE POLICY "listing_videos_read_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'listing-videos');

-- 4c. Update : propriétaire du fichier uniquement
DROP POLICY IF EXISTS "listing_videos_update_own" ON storage.objects;
CREATE POLICY "listing_videos_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4d. Delete : propriétaire du fichier uniquement
DROP POLICY IF EXISTS "listing_videos_delete_own" ON storage.objects;
CREATE POLICY "listing_videos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Vérification post-migration
--    Ces deux lignes te confirment que la migration est bien passée.
SELECT
  COUNT(*) AS total_listings,
  COUNT(video_url) AS listings_with_video
FROM listings;

SELECT id, name, public
FROM storage.buckets
WHERE id = 'listing-videos';

-- ══════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- Étape suivante : uploade 2-3 vidéos test dans le bucket
-- listing-videos via la console Supabase Storage, copie leur URL
-- publique, et colle-les via /admin → bouton "🎬 Vidéo" sur une annonce.
-- ══════════════════════════════════════════════════════════════════
