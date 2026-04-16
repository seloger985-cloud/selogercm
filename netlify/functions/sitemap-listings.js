/**
 * Netlify Function — sitemap-listings.js
 * Génère un sitemap XML dynamique avec toutes les annonces actives de Supabase.
 * URL d'accès : https://selogercm.com/.netlify/functions/sitemap-listings
 *
 * Pour l'utiliser dans Google Search Console, soumettre cette URL comme sitemap secondaire,
 * ou créer un sitemap index qui référence à la fois sitemap.xml et cette fonction.
 */

const SUPABASE_URL  = 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ5NzgsImV4cCI6MjA1OTI1MDk3OH0.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68';
const SITE_URL      = 'https://www.selogercm.com';

exports.handler = async function(event, context) {
  try {
    /* Récupérer toutes les annonces actives */
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,title,city,district,type,updated_at,created_at&status=eq.active&order=created_at.desc&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const listings = await res.json();

    /* Générer les entrées XML */
    const urls = listings.map(l => {
      const lastmod = (l.updated_at || l.created_at || '').split('T')[0];
      const title   = encodeXML(l.title || 'Annonce immobilière');
      return `  <url>
    <loc>${SITE_URL}/annonce?id=${l.id}</loc>
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
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', /* Cache 1h */
      },
      body: xml,
    };

  } catch (err) {
    console.error('sitemap-listings error:', err);
    return {
      statusCode: 500,
      body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
    };
  }
};

function encodeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
