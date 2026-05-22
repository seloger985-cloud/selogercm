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
      + `?select=id,slug,updated_at,created_at`
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

    /* Générer les URLs — utiliser slug si disponible, sinon ID */
    const urls = (listings || []).map(l => {
      const lastmod = (l.updated_at || l.created_at || '').split('T')[0];
      /* Préférer /annonce/slug plutôt que /annonce?id= pour SEO */
      const path = l.slug ? `/annonce/${encodeURIComponent(l.slug)}` : `/annonce?id=${encodeURIComponent(l.id)}`;
      return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

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
