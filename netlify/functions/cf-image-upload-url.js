/**
 * Netlify Function — cf-image-upload-url.js
 * Génère une URL d'upload direct vers Cloudflare Images.
 * Le client uploade la photo directement vers CF (pas via Netlify)
 * → évite la limite de taille des fonctions Netlify.
 *
 * GET /.netlify/functions/cf-image-upload-url
 * En-tête requis : Authorization: Bearer <token Supabase>
 *
 * Retourne : { id, uploadURL, accountHash }
 *
 * Variables d'environnement :
 *   CF_ACCOUNT_ID    → feeb29a4f4182a12fd0133b07bc57bd0
 *   CF_API_TOKEN     → cfat_...
 *   CF_ACCOUNT_HASH  → hash des URLs imagedelivery.net (visible dans tes URLs de posters)
 *   SUPABASE_URL     → https://hozlyddiqodvjguqywty.supabase.co
 *   SB_ANON_KEY      → clé anon Supabase
 */

const CF_ACCOUNT_ID   = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN    = process.env.CF_API_TOKEN;
const CF_ACCOUNT_HASH = process.env.CF_ACCOUNT_HASH;
const SUPABASE_URL    = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_ANON_KEY     = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

exports.handler = async function (event) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_ACCOUNT_HASH) {
    return { statusCode: 400, body: JSON.stringify({ error: 'CF credentials manquants' }) };
  }

  // ── Auth : exiger une session Supabase valide (protège ton compte CF Images de l'abus anonyme)
  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (!auth) {
    return { statusCode: 401, body: JSON.stringify({ error: 'auth requise' }) };
  }
  try {
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SB_ANON_KEY },
    });
    if (!who.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: 'session invalide' }) };
    }
  } catch (err) {
    console.error('[cf-image-upload-url] auth', err.message);
    return { statusCode: 401, body: JSON.stringify({ error: 'auth indisponible' }) };
  }

  // ── Demander une URL d'upload directe à Cloudflare Images
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
        body: new URLSearchParams({ requireSignedURLs: 'false' }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CF Images error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const id   = data.result?.id;
    const uploadURL = data.result?.uploadURL;
    if (!id || !uploadURL) throw new Error('CF Images: id/uploadURL manquant dans la réponse');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ id, uploadURL, accountHash: CF_ACCOUNT_HASH }),
    };

  } catch (err) {
    console.error('[cf-image-upload-url]', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
