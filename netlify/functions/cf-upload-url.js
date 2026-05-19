/**
 * Netlify Function — cf-upload-url.js
 * Génère une URL d'upload direct vers Cloudflare Stream.
 * Le client uploade le fichier vidéo directement vers CF (pas via Netlify)
 * → évite la limite de taille des fonctions Netlify.
 *
 * POST /.netlify/functions/cf-upload-url
 * Body JSON : { title, listingId, section, maxDuration }
 *
 * Retourne : { uid, uploadURL, hlsUrl }
 *
 * Variables d'environnement :
 *   CF_ACCOUNT_ID  → feeb29a4f4182a12fd0133b07bc57bd0
 *   CF_API_TOKEN   → cfat_...
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { statusCode: 400, body: JSON.stringify({ error: 'CF credentials manquants' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { title = 'Visite', listingId = '', section = '', maxDuration = 300 } = body;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: maxDuration,
          meta: {
            name:       title,
            listing_id: listingId,
            section:    section || undefined,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CF Stream error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const uid  = data.result?.uid;
    if (!uid) throw new Error('CF Stream: uid manquant dans la réponse');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        uid,
        uploadURL: data.result.uploadURL,
        hlsUrl:    `https://videodelivery.net/${uid}/manifest/video.m3u8`,
      }),
    };

  } catch (err) {
    console.error('[cf-upload-url]', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};