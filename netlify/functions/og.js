/**
 * Netlify Function — og.js
 * Génère le HTML avec les vraies balises Open Graph pour les bots sociaux.
 * 
 * URL d'accès : /share/:slug
 * - Bot (Facebook, WhatsApp, LinkedIn, Twitter) → HTML avec bonnes OG
 * - Humain → redirection 302 vers /annonce/:slug
 */

const SUPABASE_URL  = 'https://hozlyddiqodvjguqywty.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ5NzgsImV4cCI6MjA1OTI1MDk3OH0.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68';
const SITE_URL      = 'https://www.selogercm.com';
const DEFAULT_IMG   = 'https://www.selogercm.com/assets/img/og-cover.jpg';

const BOT_AGENTS = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'googlebot', 'bingbot',
  'applebot', 'redditbot', 'pinterest', 'vkshare', 'yandex',
];

function isBot(userAgent = '') {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(b => ua.includes(b));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtPrice(n, mode) {
  const price = (n || 0).toLocaleString('fr-FR') + ' FCFA';
  return mode === 'sale' ? price : price + '/mois';
}

exports.handler = async function(event) {
  const userAgent = event.headers['user-agent'] || '';
  
  /* Récupérer le slug depuis le path */
  const pathMatch = event.path.match(/\/share\/([^/?]+)/);
  const slug = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

  /* Pas de slug → redirection vers /annonces */
  if (!slug) {
    return {
      statusCode: 302,
      headers: { Location: `${SITE_URL}/annonces` },
      body: '',
    };
  }

  const targetUrl = `${SITE_URL}/annonce/${slug}`;

  /* Humain → redirection vers la vraie page */
  if (!isBot(userAgent)) {
    return {
      statusCode: 302,
      headers: { Location: targetUrl, 'Cache-Control': 'no-cache' },
      body: '',
    };
  }

  /* Bot → chercher l'annonce dans Supabase par slug */
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=title,description,price,rent_sale,city,district,type,images,ref&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
        }
      }
    );

    const data = await res.json();
    const ad   = data && data[0];

    /* Annonce introuvable → OG génériques */
    if (!ad) {
      return genericOG(targetUrl);
    }

    const title    = escapeHtml(ad.title || 'Annonce immobilière');
    const price    = fmtPrice(ad.price, ad.rent_sale);
    const location = [ad.district, ad.city].filter(Boolean).join(', ');
    const mode     = ad.rent_sale === 'sale' ? 'À vendre' : 'À louer';
    const descSrc  = ad.description ? ad.description.slice(0, 150) : `${mode} sur SE LOGER CM`;
    const desc     = escapeHtml(`${price} · ${location} · ${descSrc}`);
    const img      = (ad.images && ad.images[0]) || DEFAULT_IMG;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title} | SE LOGER CM</title>
  <meta name="description" content="${desc}">

  <!-- Open Graph -->
  <meta property="og:type"         content="website">
  <meta property="og:url"          content="${escapeHtml(targetUrl)}">
  <meta property="og:title"        content="${title} | SE LOGER CM">
  <meta property="og:description"  content="${desc}">
  <meta property="og:image"        content="${escapeHtml(img)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"    content="SE LOGER CM">
  <meta property="og:locale"       content="fr_CM">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${title} | SE LOGER CM">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image"       content="${escapeHtml(img)}">

  <link rel="canonical" href="${escapeHtml(targetUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}">
</head>
<body>
  <p>Redirection... <a href="${escapeHtml(targetUrl)}">Cliquez ici si la page ne s'affiche pas.</a></p>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
      body: html,
    };

  } catch (err) {
    console.error('og function error:', err);
    return genericOG(targetUrl);
  }
};

function genericOG(targetUrl) {
  return {
    statusCode: 302,
    headers: { Location: targetUrl },
    body: '',
  };
}
