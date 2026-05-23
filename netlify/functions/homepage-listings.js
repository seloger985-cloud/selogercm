/**
 * Netlify Function — homepage-listings.js
 * Retourne en une seule requête toutes les annonces nécessaires à l'homepage.
 * Mis en cache 5 min sur le CDN Netlify → LCP mobile divisé par ~4.
 *
 * RÈGLES MÉTIER :
 *   - Sections "Meublé" / "Non meublé" : UNIQUEMENT biens d'habitation
 *     (apartment, studio, house, villa, duplex)
 *   - Section "Locaux commerciaux à louer" : warehouse, office, shop, bureau, commercial
 *   - Les biens récemment loués/vendus (statut=loue/vendu, dans les 10 derniers jours)
 *     restent dans LEUR section d'origine pendant 10 jours, pas réaiguillés ailleurs.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SB_ANON_KEY   || process.env.SUPABASE_ANON_KEY || '';
const CARD_FIELDS   = 'id,slug,title,images,video_url,rent_sale,furnished,premium,boost_expires_at,price,price_per_day,bedrooms,district,city,type,status,statut,created_at,owner_phone';

/* Types autorisés par section */
const HABITATION_TYPES   = ['apartment', 'studio', 'house', 'villa', 'duplex'];
const COMMERCIAL_TYPES   = ['commercial', 'warehouse', 'shop', 'bureau', 'office'];
const VILLA_SALE_TYPES   = ['villa', 'house', 'duplex'];
const LAND_TYPES         = ['plots-of-land'];
const COMM_SALE_TYPES    = ['commercial', 'warehouse', 'shop', 'fonds-commerce'];

/* Encodage pour les filtres "in" PostgREST : type=in.(a,b,c) */
function inList(arr) { return `(${arr.join(',')})`; }

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

/* Détermine la SECTION D'ORIGINE d'une annonce.
   Utilisée pour ranger correctement les biens loué/vendu sans les déplacer. */
function sectionOfListing(l) {
  if (l.rent_sale === 'rent') {
    if (HABITATION_TYPES.includes(l.type)) {
      return l.furnished ? 'furnished' : 'unfurnished';
    }
    if (COMMERCIAL_TYPES.includes(l.type)) return 'commercialRent';
    return null; /* type non géré (ex: plots-of-land en location) */
  }
  if (l.rent_sale === 'sale') {
    if (VILLA_SALE_TYPES.includes(l.type))   return 'villas';
    if (LAND_TYPES.includes(l.type))         return 'terrains';
    if (COMM_SALE_TYPES.includes(l.type))    return 'commercialSale';
    return null;
  }
  return null;
}

exports.handler = async function () {
  try {
    const base = `select=${CARD_FIELDS}&status=eq.active`;

    /* Toutes les requêtes en parallèle.
       NOTE : les sections habitation filtrent désormais sur type IN (...) pour exclure
       entrepôts/bureaux/locaux commerciaux qui ont leur propre section. */
    const [unfurnished, furnished, commercialRent, villas, terrains, commercialSale] = await Promise.all([
      /* Location non meublé — habitations premium uniquement (pool large pour rotation 30min) */
      sbFetch(`${base}&rent_sale=eq.rent&furnished=eq.false&premium=eq.true&type=in.${inList(HABITATION_TYPES)}&order=boost_expires_at.desc.nullslast,created_at.desc&limit=50`),
      /* Location meublé — habitations premium uniquement */
      sbFetch(`${base}&rent_sale=eq.rent&furnished=eq.true&premium=eq.true&type=in.${inList(HABITATION_TYPES)}&order=boost_expires_at.desc.nullslast,created_at.desc&limit=30`),
      /* Locaux commerciaux à louer — inclut bureaux et espaces de travail */
      sbFetch(`${base}&rent_sale=eq.rent&type=in.${inList(COMMERCIAL_TYPES)}&order=created_at.desc&limit=6`),
      /* Villas & maisons à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.${inList(VILLA_SALE_TYPES)}&order=created_at.desc&limit=3`),
      /* Terrains à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.${inList(LAND_TYPES)}&order=created_at.desc&limit=3`),
      /* Fonds de commerce à vendre */
      sbFetch(`${base}&rent_sale=eq.sale&premium=eq.true&type=in.${inList(COMM_SALE_TYPES)}&order=created_at.desc&limit=3`),
    ]);

    /* Fallback location si pas de premium — limité aux habitations */
    let unFinal = unfurnished, fuFinal = furnished;
    if (!unFinal.length || !fuFinal.length) {
      const allRent = await sbFetch(`${base}&rent_sale=eq.rent&type=in.${inList(HABITATION_TYPES)}&order=created_at.desc&limit=20`);
      if (!unFinal.length) unFinal = allRent.filter(l => !l.furnished).slice(0, 6);
      if (!fuFinal.length) fuFinal = allRent.filter(l =>  l.furnished).slice(0, 6);
      if (!unFinal.length) unFinal = allRent.slice(0, 6);
    }

    /* Fallback vente villas si pas de premium */
    let villasFinal = villas;
    if (!villasFinal.length) {
      const allSale = await sbFetch(`${base}&rent_sale=eq.sale&type=in.${inList(VILLA_SALE_TYPES)}&order=created_at.desc&limit=6`);
      villasFinal = allSale.slice(0, 3);
    }

    let commercialRentFinal = commercialRent || [];
    let terrainsFinal       = terrains       || [];
    let commercialSaleFinal = commercialSale || [];

    /* Biens premium récemment loués/vendus — RESTENT DANS LEUR SECTION D'ORIGINE
       (calculée via sectionOfListing — basée sur rent_sale + type + furnished, PAS sur statut) */
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const baseSold = `select=${CARD_FIELDS}&premium=eq.true&statut=in.(loue,vendu)&sold_rented_at=gte.${tenDaysAgo}&order=sold_rented_at.desc&limit=12`;
    const soldRecent = await sbFetch(baseSold).catch(() => []);

    /* Pour chaque bien loué/vendu : on l'ajoute à sa SECTION D'ORIGINE,
       jamais à une autre. Limites par section pour ne pas saturer. */
    const sectionRefs = {
      unfurnished:    { arr: unFinal,             max: 6 },
      furnished:      { arr: fuFinal,             max: 6 },
      commercialRent: { arr: commercialRentFinal, max: 6 },
      villas:         { arr: villasFinal,         max: 4 },
      terrains:       { arr: terrainsFinal,       max: 3 },
      commercialSale: { arr: commercialSaleFinal, max: 3 },
    };

    const existingIds = new Set(
      Object.values(sectionRefs).flatMap(s => s.arr.map(l => l.id))
    );

    for (const l of (soldRecent || [])) {
      if (existingIds.has(l.id)) continue;
      const section = sectionOfListing(l);
      if (!section || !sectionRefs[section]) continue; /* type non géré, on l'ignore */
      const ref = sectionRefs[section];
      ref.arr = [...ref.arr, l].slice(0, ref.max);
      sectionRefs[section] = ref;
      existingIds.add(l.id);
    }

    const payload = {
      unfurnished:    sectionRefs.unfurnished.arr,
      furnished:      sectionRefs.furnished.arr,
      commercialRent: sectionRefs.commercialRent.arr,
      villas:         sectionRefs.villas.arr,
      terrains:       sectionRefs.terrains.arr,
      commercialSale: sectionRefs.commercialSale.arr,
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
