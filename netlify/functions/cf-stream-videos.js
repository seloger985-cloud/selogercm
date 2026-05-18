/**
 * Netlify Function — cf-stream-videos.js
 * Proxy sécurisé → Cloudflare Stream API
 * Retourne les vidéos taguées homepage-section-1 ou homepage-section-2
 *
 * Usage : GET /.netlify/functions/cf-stream-videos?tag=homepage-section-1
 *
 * Variables d'environnement :
 *   CF_ACCOUNT_ID  → feeb29a4f4182a12fd0133b07bc57bd0
 *   CF_API_TOKEN   → cfat_...
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;
const CACHE_TIME    = 300; /* 5 min */

exports.handler = async function (event) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { statusCode: 400, body: JSON.stringify({ error: 'CF credentials manquants' }) };
  }

  const tag   = event.queryStringParameters?.tag || 'homepage-section-1';
  const limit = parseInt(event.queryStringParameters?.limit || '6', 10);

  /* Sécurité : n'autoriser que les tags homepage */
  if (!['homepage-section-1', 'homepage-section-2'].includes(tag)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Tag non autorisé' }) };
  }

  try {
    /* Récupérer toutes les vidéos prêtes puis filtrer par meta.section */
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?status=ready&limit=100`,
      { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CF Stream API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    /* Filtrer par meta.section = tag (key=section, value=homepage-section-1|2) */
    const videos = (data.result || [])
      .filter(v => v.status?.state === 'ready' && v.meta?.section === tag)
      .slice(0, limit)
      .map(v => ({
        id:           v.uid,
        title:        v.meta?.title    || v.meta?.name || 'Visite',
        price:        v.meta?.price    || '',
        location:     v.meta?.location || '',
        listing_id:   v.meta?.listing_id || null,
        slug:         v.meta?.slug     || null,
        premium:      v.meta?.premium === 'true',
        thumbnail:    `https://videodelivery.net/${v.uid}/thumbnails/thumbnail.jpg?time=2s&height=400`,
        hls:          `https://videodelivery.net/${v.uid}/manifest/video.m3u8`,
        iframe:       `https://iframe.videodelivery.net/${v.uid}`,
        duration:     v.duration || 0,
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': `public, max-age=${CACHE_TIME}, stale-while-revalidate=600`,
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ videos, tag, count: videos.length }),
    };

  } catch (err) {
    console.error('[cf-stream-videos] Erreur:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};