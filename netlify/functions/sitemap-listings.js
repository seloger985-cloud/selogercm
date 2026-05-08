/**
 * Netlify Function — sitemap-listings.js
 * Génère un sitemap XML dynamique avec toutes les annonces actives.
 * Utilise le SDK @supabase/supabase-js pour éviter les 401 server-to-server.
 *
 * Variables d'environnement à définir dans Netlify Dashboard → Environment Variables :
 *   SUPABASE_URL       https://hozlyddiqodvjguqywty.supabase.co
 *   SUPABASE_ANON_KEY  <clé anon publique>
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ5NzgsImV4cCI6MjA1OTI1MDk3OH0.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68';
const SITE_URL      = 'https://www.selogercm.com';

exports.handler = async function() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, slug, title, city, district, type, updated_at, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(`Supabase error: ${error.message}`);

    const urls = (listings || []).map(l => {
      const lastmod = (l.updated_at || l.created_at || '').split('T')[0];
      const id      = l.slug || l.id;
      return `  <url>
    <loc>${SITE_URL}/annonce?id=${encodeURIComponent(id)}</loc>
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
        'Cache-Control': 'public, max-age=3600',
      },
      body: xml,
    };

  } catch (err) {
    console.error('sitemap-listings error:', err.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `sitemap-listings error: ${err.message || err}`,
    };
  }
};
