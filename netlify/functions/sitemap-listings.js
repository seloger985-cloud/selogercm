/**
 * Netlify Function — sitemap-listings.js
 * Génère un sitemap XML dynamique avec toutes les annonces actives.
 * Optimisé pour cache et performances.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL       || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE_URL      = 'https://selogercm.com';
const CACHE_TIME    = 7200; /* Cache 2h pour ne pas surcharger Supabase */

exports.handler = async function () {
  try {
    /* Récupérer les listings actifs */
    const url = `${SUPABASE_URL}/rest/v1/listings`
      + `?select=id,slug,updated_at,created_at,rent_sale,dossier_complet`
      + `&status=eq.active`
      + `&order=created_at.desc`
      + `&limit=50000`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase ${res.status}: ${body}`);
    }

    const listings = await res.json();

    /* URLs canoniques : slug non vide uniquement, sans doublons */
    const seen = new Set();
    const urls = (listings || [])
      .filter(l => {
        const s = (l.slug || '').trim();
        if (!s || seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .map(l => {
        const lastmod = (l.updated_at || l.created_at || '').split('T')[0];
        /* Dossier complet vente → URL premium /vente/{slug} (sinon /annonce/{slug}).
           Évite le doublon : chaque bien n'apparaît qu'une fois, à sa bonne URL. */
        const isDossier = l.dossier_complet === true && l.rent_sale === 'sale';
        const slug = encodeURIComponent(l.slug.trim());
        const path = isDossier ? `/vente/${slug}` : `/annonce/${slug}`;
        const priority = isDossier ? '0.9' : '0.8';
        return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TIME}, stale-while-revalidate=86400`,
      },
      body: xml,
    };

  } catch (err) {
    console.error('sitemap-listings error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `sitemap-listings error: ${err.message}`,
    };
  }
};
