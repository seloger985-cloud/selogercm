/**
 * Netlify Function — og.js
 * Sert du HTML avec les bonnes balises Open Graph pour le partage social.
 */

const SUPABASE_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
const SITE_URL     = 'https://www.selogercm.com';
const DEFAULT_IMG  = 'https://www.selogercm.com/assets/img/og-cover.jpg';

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
  const SB_KEY = process.env.SB_ANON_KEY;

  // 🔥 Slug robuste depuis /share/:slug ou ?slug=
  const rawUrl = event.rawUrl || '';
  const match = rawUrl.match(/\/share\/([^/?]+)/) || rawUrl.match(/slug=([^&]+)/);
  const slug = match ? decodeURIComponent(match[1]) : null;

  console.log('og.js start — slug:', slug, '| has_key:', !!SB_KEY);

  if (!SB_KEY) {
    console.error('SB_ANON_KEY missing');
    return htmlResponse(genericHtml(SITE_URL));
  }

  if (!slug) {
    return htmlResponse(genericHtml(SITE_URL + '/annonces'));
  }

  const targetUrl = `${SITE_URL}/annonce/${slug}`;

  try {
    const apiUrl = `${SUPABASE_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=title,description,price,rent_sale,city,district,type,images&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Accept': 'application/json',
      }
    });

    if (!res.ok) {
      console.error('Supabase error:', res.status);
      return htmlResponse(genericHtml(targetUrl));
    }

    const data = await res.json();
    const ad = data && data[0];

    if (!ad) {
      return htmlResponse(genericHtml(targetUrl));
    }

    const title    = escapeHtml(ad.title || 'Annonce immobilière');
    const price    = fmtPrice(ad.price, ad.rent_sale);
    const location = [ad.district, ad.city].filter(Boolean).join(', ');
    const mode     = ad.rent_sale === 'sale' ? 'À vendre' : 'À louer';

    const desc = escapeHtml(
      `${price} · ${location}. ${mode}. Contact rapide sur WhatsApp.`
    );

    const img = (ad.images?.[0] || DEFAULT_IMG)
      .replace('http://', 'https://');

    return htmlResponse(buildHtml({
      title,
      desc,
      img,
      url: targetUrl
    }));

  } catch (err) {
    console.error('EXCEPTION:', err.message);
    return htmlResponse(genericHtml(targetUrl));
  }
};

function htmlResponse(html) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
    body: html,
  };
}

function buildHtml({ title, desc, img, url }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title} | SE LOGER CM</title>
  <meta name="description" content="${desc}">

  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${title} | SE LOGER CM">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${escapeHtml(img)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="SE LOGER CM">
  <meta property="og:locale" content="fr_CM">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} | SE LOGER CM">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${escapeHtml(img)}">

  <link rel="canonical" href="${escapeHtml(url)}">

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width:600px; margin:80px auto; padding:0 20px; text-align:center; color:#333; }
    a { color:#ff7a00; font-weight:700; text-decoration:none; }
    img { max-width:100%; border-radius:12px; margin:20px 0; }
  </style>
</head>
<body>
  <img src="${escapeHtml(img)}" alt="${title}">
  <h1>${title}</h1>
  <p>${desc}</p>

  <p>
    <a href="${escapeHtml(url)}">Voir l’annonce</a>
  </p>

  <!-- 🔥 redirection propre sans casser Facebook -->
  <noscript>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
  </noscript>
</body>
</html>`;
}

function genericHtml(url) {
  return buildHtml({
    title: 'SE LOGER CM',
    desc: 'Trouvez votre bien immobilier à Douala et au Cameroun.',
    img: DEFAULT_IMG,
    url
  });
}