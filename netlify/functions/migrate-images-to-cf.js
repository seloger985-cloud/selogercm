/**
 * Netlify Function — migrate-images-to-cf.js
 * Migration one-shot : Supabase Storage → Cloudflare Images
 *
 * Déclencher via : GET /.netlify/functions/migrate-images-to-cf?batch=0
 * Incrémenter batch=0, 1, 2... jusqu'à ce que result.done = true
 *
 * Variables d'environnement requises :
 *   CF_ACCOUNT_ID    → ID compte Cloudflare
 *   CF_API_TOKEN     → Token API (Stream + Images : Edit)
 *   CF_ACCOUNT_HASH  → Hash compte pour les URLs imagedelivery.net
 *   SB_SERVICE_KEY   → Supabase service_role (bypass RLS)
 *   SUPABASE_URL     → URL Supabase
 */

const CF_ACCOUNT_ID   = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN    = process.env.CF_API_TOKEN;
const CF_ACCOUNT_HASH = process.env.CF_ACCOUNT_HASH;
const SUPABASE_URL    = process.env.SUPABASE_URL    || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY     = process.env.SB_SERVICE_KEY  || '';

const BATCH_SIZE = 10; /* listings par batch */
const CF_IMAGES_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`;

function cfHeaders() {
  return { 'Authorization': `Bearer ${CF_API_TOKEN}` };
}
function sbHeaders() {
  return { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

/* Upload une image Supabase vers Cloudflare Images via URL */
async function uploadImageFromUrl(supabaseUrl, listingId, photoIndex) {
  const formData = new FormData();
  formData.append('url', supabaseUrl);
  formData.append('id', `listing_${listingId}_${photoIndex}`);

  const res = await fetch(CF_IMAGES_URL, {
    method: 'POST',
    headers: cfHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    /* Image déjà uploadée → récupérer l'existante */
    if (res.status === 409) {
      return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/listing_${listingId}_${photoIndex}/public`;
    }
    throw new Error(`CF Images upload error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.result?.variants?.[0] || `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${data.result.id}/public`;
}

/* Mettre à jour les images d'une annonce dans Supabase */
async function updateListingImages(listingId, newImages) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ images: newImages }),
    }
  );
  if (!res.ok) throw new Error(`Supabase update error ${res.status}`);
}

exports.handler = async function (event) {
  /* Sécurité basique */
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_ACCOUNT_HASH || !SERVICE_KEY) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Variables d\'environnement manquantes' }) };
  }

  const batch  = parseInt(event.queryStringParameters?.batch || '0', 10);
  const offset = batch * BATCH_SIZE;

  try {
    /* Récupérer le batch de listings */
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,images&order=created_at.asc&limit=${BATCH_SIZE}&offset=${offset}`,
      { headers: sbHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase fetch error ${res.status}`);
    const listings = await res.json();

    if (!listings.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ done: true, message: 'Migration terminée ✅', batch, offset })
      };
    }

    const results = [];

    for (const listing of listings) {
      if (!listing.images?.length) { results.push({ id: listing.id, status: 'no_images' }); continue; }

      /* Vérifier si déjà migré */
      const alreadyMigrated = listing.images.every(url => url.includes('imagedelivery.net'));
      if (alreadyMigrated) { results.push({ id: listing.id, status: 'already_migrated' }); continue; }

      try {
        const newImages = [];
        for (let i = 0; i < listing.images.length; i++) {
          const url = listing.images[i];
          if (url.includes('imagedelivery.net')) {
            newImages.push(url); /* déjà CF */
          } else {
            const cfUrl = await uploadImageFromUrl(url, listing.id.replace(/-/g, '').slice(0, 16), i);
            newImages.push(cfUrl);
          }
        }
        await updateListingImages(listing.id, newImages);
        results.push({ id: listing.id, status: 'migrated', count: newImages.length });
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
        processed: listings.length,
        results,
      }),
    };

  } catch (err) {
    console.error('[migrate-images] Erreur:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};