/**
 * Netlify Function — sitemap-articles.js
 * Génère un sitemap XML dynamique avec tous les articles du blog.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL       || 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE_URL      = 'https://selogercm.com';
const CACHE_TIME    = 3600; /* Cache 1h */

exports.handler = async function () {
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_articles`
      + `?select=id,title,updated_at,created_at`
      + `&order=created_at.desc`
      + `&limit=1000`;

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

    const articles = await res.json();

    const urls = (articles || []).map(a => {
      const lastmod = (a.updated_at || a.created_at || '').split('T')[0];
      return `  <url>
    <loc>${SITE_URL}/article?id=${encodeURIComponent(a.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
    console.error('sitemap-articles error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: `sitemap-articles error: ${err.message}`,
    };
  }
};
