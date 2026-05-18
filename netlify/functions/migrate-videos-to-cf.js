/**
 * Netlify Function — migrate-videos-to-cf.js
 * Migration one-shot : Supabase Storage (listing-videos) → Cloudflare Stream
 *
 * Déclencher via : GET /.netlify/functions/migrate-videos-to-cf?batch=0
 * Incrémenter batch jusqu'à done=true
 *
 * Après migration : video_url dans Supabase = HLS Cloudflare Stream
 * Admin tag ensuite les vidéos homepage-section-1 / homepage-section-2
 * via le dashboard Cloudflare Stream.
 *
 * Variables d'environnement :
 *   CF_ACCOUNT_ID   → feeb29a4f4182a12fd0133b07bc57bd0
 *   CF_API_TOKEN    → cfat_...
 *   SB_SERVICE_KEY  → Supabase service_role
 *   SUPABASE_URL    → URL Supabase
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;
const SUPABASE_URL  = process.env.SUPABASE_URL   || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY   = process.env.SB_SERVICE_KEY || '';

const BATCH_SIZE = 5; /* vidéos par batch — Stream processing est async */

function cfHeaders()  { return { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' }; }
function sbHeaders()  { return { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

/* Upload une vidéo vers Cloudflare Stream via son URL Supabase */
async function uploadVideoFromUrl(videoUrl, listingId, listingTitle) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/copy`,
    {
      method: 'POST',
      headers: cfHeaders(),
      body: JSON.stringify({
        url: videoUrl,
        meta: {
          name:       listingTitle || listingId,
          listing_id: listingId,
        },
        /* requireSignedURLs: false pour usage public */
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CF Stream upload error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const uid  = data.result?.uid;
  if (!uid) throw new Error('CF Stream: uid manquant dans la réponse');

  /* URL HLS de lecture (disponible après processing CF) */
  return {
    uid,
    hlsUrl:       `https://videodelivery.net/${uid}/manifest/video.m3u8`,
    thumbnailUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
  };
}

/* Mettre à jour video_url dans Supabase */
async function updateListingVideo(listingId, hlsUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ video_url: hlsUrl }),
    }
  );
  if (!res.ok) throw new Error(`Supabase update error ${res.status}`);
}

exports.handler = async function (event) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !SERVICE_KEY) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Variables d\'environnement manquantes' }) };
  }

  const batch  = parseInt(event.queryStringParameters?.batch || '0', 10);
  const offset = batch * BATCH_SIZE;

  try {
    /* Récupérer les listings avec vidéo Supabase (pas encore migrés) */
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,title,video_url&video_url=not.is.null&order=created_at.asc&limit=${BATCH_SIZE}&offset=${offset}`,
      { headers: sbHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase fetch error ${res.status}`);
    const listings = await res.json();

    /* Filtrer ceux qui ont encore une URL Supabase (pas encore CF) */
    const toMigrate = (listings || []).filter(l =>
      l.video_url && !l.video_url.includes('videodelivery.net') && !l.video_url.includes('cloudflarestream.com')
    );

    if (!toMigrate.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ done: listings.length < BATCH_SIZE, message: listings.length < BATCH_SIZE ? 'Migration vidéos terminée ✅' : 'Batch vide — toutes les vidéos du batch sont déjà migrées', batch, next_batch: batch + 1 })
      };
    }

    const results = [];

    for (const listing of toMigrate) {
      try {
        const { uid, hlsUrl } = await uploadVideoFromUrl(listing.video_url, listing.id, listing.title);
        await updateListingVideo(listing.id, hlsUrl);
        results.push({ id: listing.id, status: 'migrated', uid, hlsUrl });
      } catch (err) {
        results.push({ id: listing.id, status: 'error', error: err.message });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        done: listings.length < BATCH_SIZE,
        batch,
        next_batch: batch + 1,
        processed: toMigrate.length,
        results,
        info: 'Les vidéos sont en cours de processing par Cloudflare (quelques minutes). Tagger ensuite dans le dashboard CF : homepage-section-1 ou homepage-section-2'
      }),
    };

  } catch (err) {
    console.error('[migrate-videos] Erreur:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};