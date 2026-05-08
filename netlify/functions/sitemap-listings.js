/**
 * Netlify Function — sitemap-listings.js
 * Génère un sitemap XML dynamique avec toutes les annonces actives.
 * Utilise fetch natif (Node.js 18) — pas de dépendance externe.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL       || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ5NzgsImV4cCI6MjA1OTI1MDk3OH0.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68';
const SITE_URL      = 'https://www.selogercm.com';

exports.handler = async function () {
  try {
    const url = `${SUPABASE_URL}/rest/v1/listings`
      + `?select=id,slug,title,updated_at,created_at`
      + `&status=eq.active`
      + `&order=created_at.desc`
      + `&limit=500`;

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

    const urls = (listings || []).map(l => {
      const lastmod = (l.updated_at || l.created_at || '').split('T')[0];
      const id      = encodeURIComponent(l.slug || l.id);
      return `  <url>
    <loc>${SITE_URL}/annonce?id=${id}</loc>
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
        'Cache-Control': 'public, max-age=3600',
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
