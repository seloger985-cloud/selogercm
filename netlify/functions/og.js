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
const DEFAULT_IMG = `${SITE}/assets/img/og-cover.jpg`;

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

function firstImage(ad) {
  if (Array.isArray(ad.images) && ad.images.length) return ad.images[0];
  return DEFAULT_IMG;
}

exports.handler = async function (event) {
  const path = event.path || '';
  const slug = decodeURIComponent(path.replace('/share/', '').split('?')[0]);
  const targetUrl = `${SITE}/annonce/${slug}`;
  const shareUrl  = `${SITE}/share/${slug}`;

  /* Détection crawler vs humain via User-Agent */
  const userAgent = (event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || '';
  const isCrawler = CRAWLER_REGEX.test(userAgent);

  /* Valeurs par défaut (cas sans slug ou erreur Supabase) */
  let title = 'SE LOGER CM | Immobilier Cameroun';
  let desc  = 'Découvrez cette annonce immobilière sur SE LOGER CM.';
  let img   = DEFAULT_IMG;

  /* Récupération de l'annonce depuis Supabase */
  try {
    if (SB_KEY && slug) {
      const apiUrl =
        `${SUPABASE_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}` +
        `&select=title,description,price,city,district,images&limit=1`;

      const res = await fetch(apiUrl, {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          Accept: 'application/json'
        }
      });

      const data = await res.json();
      const ad = data && data[0];

      if (ad) {
        const price    = ad.price ? Number(ad.price).toLocaleString('fr-FR') + ' FCFA' : '';
        const location = [ad.district, ad.city].filter(Boolean).join(', ');
        title = `${ad.title || 'Annonce immobilière'} | SE LOGER CM`;
        desc  = `${price}${location ? ' · ' + location : ''}. Contact rapide WhatsApp.`;
        img   = firstImage(ad);
      }
    }
  } catch (e) {
    console.error('OG error:', e.message);
  }

  /* Le meta refresh n'est inclus QUE pour les humains.
     Les crawlers reçoivent la page sans redirection pour scraper les meta tags. */
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

<link rel="canonical" href="${esc(shareUrl)}">
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
