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
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_ANON_KEY   = process.env.SB_ANON_KEY   || process.env.SUPABASE_ANON_KEY || '';
const CACHE_TIME    = 300; /* 5 min */

exports.handler = async function (event) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return { statusCode: 400, body: JSON.stringify({ error: 'CF credentials manquants' }) };
  }

  const tag   = event.queryStringParameters?.tag || 'homepage-section-1';
  const limit = parseInt(event.queryStringParameters?.limit || '6', 10);
  const debug = event.queryStringParameters?.debug === '1'; /* ?debug=1 retourne les meta brutes */

  /* Sécurité : tags autorisés */
  if (!debug && !['homepage-section-1', 'homepage-section-2', 'all'].includes(tag)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Tag non autorisé' }) };
  }

  try {
    /* Récupérer toutes les vidéos puis filtrer par meta.section + state=ready */
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?limit=100`,
      { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CF Stream API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    /* Mode debug : retourner les meta brutes pour diagnostic */
    if (debug) {
      const raw = (data.result || []).map(v => ({
        uid:           v.uid,
        name:          v.meta?.name,
        meta:          v.meta,
        status:        v.status,
        readyToStream: v.readyToStream,
      }));
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ total: raw.length, videos: raw }) };
    }

    /* Filtrer par meta.section (tag=all → toutes les vidéos prêtes) */
    const filtered = (data.result || [])
      .filter(v => {
        if (!(v.status?.state === 'ready' || v.readyToStream === true)) return false;
        if (tag === 'all') return true;
        return v.meta?.section === tag;
      })
      .slice(0, limit);

    /* Enrichir avec les données Supabase si listing_id présent */
    const listingIds = filtered.map(v => v.meta?.listing_id).filter(Boolean);
    let listingsMap = {};

    if (listingIds.length && SB_ANON_KEY) {
      try {
        const sbRes = await fetch(
          `${SUPABASE_URL}/rest/v1/listings?id=in.(${listingIds.join(',')})&select=id,title,price,district,city,rent_sale,slug,premium,owner_phone`,
          { headers: { 'apikey': SB_ANON_KEY, 'Authorization': `Bearer ${SB_ANON_KEY}` } }
        );
        if (sbRes.ok) {
          const rows = await sbRes.json();
          rows.forEach(l => { listingsMap[l.id] = l; });
        }
      } catch(e) { /* Supabase indisponible — on continue avec meta CF */ }
    }

    const videos = filtered.map(v => {
      const l = listingsMap[v.meta?.listing_id] || {};
      const district = l.district || v.meta?.location?.split(',')[0]?.trim() || '';
      const city     = l.city     || v.meta?.location?.split(',')[1]?.trim() || '';
      return {
        id:         v.uid,
        listing_id: v.meta?.listing_id || null,
        slug:       l.slug   || v.meta?.slug   || null,
        title:      l.title  || v.meta?.title  || v.meta?.name || 'Visite',
        price:      l.price  || parseInt(v.meta?.price?.replace(/\D/g,'')) || 0,
        location:   district && city ? `${district}, ${city}` : (district || city || ''),
        district,
        city,
        rent_sale:  l.rent_sale || 'rent',
        premium:    l.premium   || v.meta?.premium === 'true',
        owner_phone: l.owner_phone || '',
        thumbnail:  `https://videodelivery.net/${v.uid}/thumbnails/thumbnail.jpg?time=2s&height=400`,
        hls:        `https://videodelivery.net/${v.uid}/manifest/video.m3u8`,
        iframe:     `https://iframe.videodelivery.net/${v.uid}`,
        duration:   v.duration || 0,
      };
    });

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