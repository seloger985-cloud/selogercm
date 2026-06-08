/**
 * Netlify Function — og.js
 * Génère une page de partage social (/share/:slug) avec meta tags Open Graph.
 *
 * Comportement :
 *   - CRAWLER social (Facebook, WhatsApp, LinkedIn, Twitter, etc.) :
 *     reçoit la page AVEC les meta tags, SANS redirection.
 *     → Facebook/WhatsApp scrapent les bons tags et affichent l'aperçu de l'annonce.
 *
 *   - HUMAIN qui clique sur un lien /share/... :
 *     reçoit la page AVEC meta refresh vers /annonce/:slug.
 *     → L'utilisateur arrive directement sur l'annonce, expérience fluide.
 *
 * IMPORTANT : ne JAMAIS rediriger les crawlers, sinon ils suivent la chaîne
 * /share → /annonce → / (homepage) et finissent par scraper la homepage,
 * ce qui casse complètement les aperçus de partage.
 */

const SUPABASE_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = 'https://selogercm.com';
const DEFAULT_IMG = `${SITE}/assets/img/og-cover.png`;

/* User-Agents des crawlers sociaux qu'on doit servir SANS redirection.
   Liste basée sur la documentation officielle de chaque plateforme. */
const CRAWLER_REGEX = /facebookexternalhit|facebot|twitterbot|whatsapp|linkedinbot|slackbot|telegrambot|discordbot|pinterest|redditbot|applebot|googlebot|bingbot|skypeuripreview|vkshare|w3c_validator|embedly|quora link preview|outbrain|nuzzel|bitlybot|tumblr|bufferbot|metainspector/i;

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Transforme une image portrait en 1200×630 paysage pour OG Facebook/WhatsApp.
   wsrv.nl : CDN open-source gratuit, pas de compte requis.
   Note: Supabase Image Transform testé mais cause des redirections que
   Facebook interprète comme l'URL /annonce au lieu de /share. */
function ogImage(url) {
  if (!url) return DEFAULT_IMG;
  // Image déjà sur Cloudflare Images : servir la variante "og" native (1200×630),
  // pas de hop wsrv.nl, et pas de redirection (Facebook scrape directement).
  if (url.includes('imagedelivery.net')) return url.replace(/\/[^/]+$/, '/og');
  // Sinon (image Supabase non encore migrée) : transformer via wsrv.nl.
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&h=630&fit=cover&output=jpg&q=80`;
}

function firstImage(ad) {
  if (Array.isArray(ad.images) && ad.images.length) return ogImage(ad.images[0]);
  return DEFAULT_IMG;
}

exports.handler = async function (event) {
  const path   = event.path || '';
  const qs     = event.queryStringParameters || {};
  const isArticle = qs.type === 'article' || path.includes('/share/article/');
  const articleId  = qs.id || path.replace(/.*\/share\/article\//, '').split('?')[0];
  const slug   = decodeURIComponent(path.replace('/share/', '').replace('article/', '').split('?')[0]);

  let targetUrl = isArticle
    ? `${SITE}/article/${encodeURIComponent(articleId)}`
    : `${SITE}/annonce/${encodeURIComponent(slug)}`;
  const shareUrl = isArticle
    ? `${SITE}/share/article/${articleId}`
    : `${SITE}/share/${encodeURIComponent(slug)}`;
  let canonicalUrl = targetUrl;

  /* Détection crawler vs humain via User-Agent */
  const userAgent = (event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || '';
  const isCrawler = CRAWLER_REGEX.test(userAgent);

  /* Valeurs par défaut */
  let title = 'SE LOGER CM | Immobilier Cameroun';
  let desc  = isArticle
    ? 'Conseils et actualités immobilières au Cameroun par SE LOGER CM.'
    : 'Découvrez cette annonce immobilière sur SE LOGER CM.';
  let img   = DEFAULT_IMG;

  try {
    if (SB_KEY) {
      if (isArticle && articleId) {
        /* ── Partage article de blog ── */
        const apiUrl = `${SUPABASE_URL}/rest/v1/blog_articles?id=eq.${encodeURIComponent(articleId)}&select=title,excerpt,cover&limit=1`;
        const res  = await fetch(apiUrl, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' } });
        const data = await res.json();
        const art  = data && data[0];
        if (art) {
          title = `${art.title || 'Article'} | SE LOGER CM`;
          desc  = art.excerpt || desc;
          img   = art.cover || DEFAULT_IMG;
        }
      } else if (slug) {
        /* ── Partage annonce : cherche par slug d'abord, puis par id (UUID) ── */
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const filter  = UUID_RE.test(slug) ? `id=eq.${encodeURIComponent(slug)}` : `slug=eq.${encodeURIComponent(slug)}`;
        const apiUrl  = `${SUPABASE_URL}/rest/v1/listings?${filter}&status=eq.active&select=title,description,price,city,district,images,slug&limit=1`;
        const res  = await fetch(apiUrl, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' } });
        const data = await res.json();
        const ad   = data && data[0];
        if (ad) {
          const price    = ad.price ? Number(ad.price).toLocaleString('fr-FR') + ' FCFA' : '';
          const location = [ad.district, ad.city].filter(Boolean).join(', ');
          title = `${ad.title || 'Annonce immobilière'} | SE LOGER CM`;
          desc  = `${price}${location ? ' · ' + location : ''}. Contact rapide WhatsApp.`;
          img   = firstImage(ad);
          const canonicalSlug = (ad.slug || '').trim() || slug;
          targetUrl    = `${SITE}/annonce/${encodeURIComponent(canonicalSlug)}`;
          canonicalUrl = targetUrl;
        }
      }
    }
  } catch (e) {
    console.error('OG error:', e.message);
  }

  const refreshTag = isCrawler
    ? ''
    : `<meta http-equiv="refresh" content="0; url=${esc(targetUrl)}">`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">

<meta property="og:type" content="article">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:secure_url" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="SE LOGER CM">
<meta property="og:locale" content="fr_CM">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">

<link rel="canonical" href="${esc(canonicalUrl)}">
<meta name="robots" content="noindex, follow">
${refreshTag}

<style>
  body {
    font-family: Arial, sans-serif;
    max-width: 700px;
    margin: 60px auto;
    padding: 20px;
    text-align: center;
    color: #222;
  }
  img { max-width: 100%; border-radius: 12px; }
  a.cta {
    display: inline-block;
    margin-top: 20px;
    padding: 12px 24px;
    background: #ff7a00;
    color: #fff;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
  }
</style>
</head>
<body>
<img src="${esc(img)}" alt="${esc(title)}">
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<a href="${esc(targetUrl)}" class="cta">Voir l'annonce →</a>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    body: html
  };
};
