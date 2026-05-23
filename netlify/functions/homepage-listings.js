/**
 * Netlify Function — homepage-listings.js
 * Retourne en une seule requête toutes les annonces nécessaires à l'homepage.
 * Mis en cache 5 min sur le CDN Netlify → LCP mobile divisé par ~4.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SB_ANON_KEY   || process.env.SUPABASE_ANON_KEY || '';
const CARD_FIELDS   = 'id,slug,title,images,video_url,rent_sale,furnished,premium,boost_expires_at,price,price_per_day,bedrooms,district,city,type,status,statut,created_at,owner_phone';

async function sbFetch(params) {
  const url = `${SUPABASE_URL}/rest/v1/listings?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

exports.handler = async function () {
  try {
    const base = `select=${CARD_FIELDS}&status=eq.active`;

    /* Toutes les requêtes en parallèle */
    const [unfurnished, furnished, commercialRent, villas, terrains, commercialSale] = await Promise.all([
      /* Location non meublé — premium (pool large pour rotation 30min côté client) */
      sbFetch(`${base}&rent_sale=eq.rent&furnished=eq.false&premium=eq.true&order=boost_expires_at.desc.nullslast,created_at.desc&limit=50`),
      /* Location meublé — premium */
      sbFetch(`${base}&rent_sale=eq.rent&furnished=eq.true&premium=eq.true&order=boost_expires_at.desc.nullslast,created_at.desc&limit=30`),
      /* Locaux commerciaux à louer — inclut bureaux et espaces de travail */
      sbFetch(`${base}&rent_sale=eq.rent&type=in.(commercial,warehouse,shop,bureau,office)&order=created_at.desc&limit=6`),
      /* Villas & maisons à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.(villa,house,duplex)&order=created_at.desc&limit=3`),
      /* Terrains à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.(plots-of-land)&order=created_at.desc&limit=3`),
      /* Fonds de commerce à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.(commercial,warehouse,shop,fonds-commerce)&order=created_at.desc&limit=3`),
    ]);

    /* Fallback location si pas de premium */
    let unFinal = unfurnished, fuFinal = furnished;
    if (!unFinal.length || !fuFinal.length) {
      const allRent = await sbFetch(`${base}&rent_sale=eq.rent&order=created_at.desc&limit=20`);
      if (!unFinal.length) unFinal = allRent.filter(l => !l.furnished).slice(0, 6);
      if (!fuFinal.length) fuFinal = allRent.filter(l =>  l.furnished).slice(0, 6);
      if (!unFinal.length) unFinal = allRent.slice(0, 6);
    }

    /* Fallback vente si pas de premium */
    let villasFinal = villas;
    if (!villasFinal.length) {
      const allSale = await sbFetch(`${base}&rent_sale=eq.sale&order=created_at.desc&limit=6`);
      villasFinal = allSale.filter(l => ['villa','house','duplex','apartment'].includes(l.type)).slice(0, 3);
    }

    /* Biens premium récemment loués/vendus — fusionnés dans leurs sections d'origine */
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const baseSold = `select=${CARD_FIELDS}&premium=eq.true&statut=in.(loue,vendu)&sold_rented_at=gte.${tenDaysAgo}&order=sold_rented_at.desc&limit=6`;
    const soldRecent = await sbFetch(baseSold).catch(() => []);

    /* Fusionner dans les sections d'origine si pas déjà présents */
    const existingIds = new Set([...unFinal, ...fuFinal, ...villasFinal].map(l => l.id));
    for (const l of (soldRecent || [])) {
      if (existingIds.has(l.id)) continue;
      if (l.furnished) fuFinal = [...fuFinal, l].slice(0, 6);
      else if (['villa','house','duplex'].includes(l.type)) villasFinal = [...villasFinal, l].slice(0, 4);
      else unFinal = [...unFinal, l].slice(0, 6);
    }

    const payload = {
      unfurnished:    unFinal,
      furnished:      fuFinal,
      commercialRent: commercialRent || [],
      villas:         villasFinal,
      terrains:       terrains || [],
      commercialSale: commercialSale || [],
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json; charset=utf-8',
        'Cache-Control':               'public, max-age=300, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(payload),
    };

  } catch (err) {
    console.error('homepage-listings error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
