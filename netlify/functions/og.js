/**
 * Netlify Function — og.js
 * Version finale absolue
 * IMPORTANT :
 * - Facebook / WhatsApp doivent rester sur /share/:slug
 * - Aucune redirection vers /annonce/:slug
 * - og:url = /share/:slug
 */

const SUPABASE_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
const SITE_URL = 'https://selogercm.com';

const DEFAULT_OG_IMAGE =
  'https://hozlyddiqodvjguqywty.supabase.co/storage/v1/object/public/listing-images/listings/listing_1776010205589/photo_0_1776010205589.webp';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtPrice(n, mode) {
  const price = Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
  return mode === 'sale' ? price : price + '/mois';
}

exports.handler = async function (event) {
  const SB_KEY = process.env.SB_ANON_KEY;

  const rawUrl = event.rawUrl || '';
  const match =
    rawUrl.match(/\/share\/([^/?]+)/) ||
    rawUrl.match(/slug=([^&]+)/);

  const slug = match ? decodeURIComponent(match[1]) : null;

  if (!slug) {
    return htmlResponse(
      buildHtml({
        title: 'SE LOGER CM',
        desc: 'Trouvez votre bien immobilier au Cameroun.',
        img: DEFAULT_OG_IMAGE,
        url: `${SITE_URL}/share/home`,
        viewUrl: `${SITE_URL}`
      })
    );
  }

  const shareUrl = `${SITE_URL}/share/${slug}`;
  const realUrl = `${SITE_URL}/annonce/${slug}`;

  if (!SB_KEY) {
    return htmlResponse(
      buildHtml({
        title: 'SE LOGER CM',
        desc: 'Trouvez votre bien immobilier au Cameroun.',
        img: DEFAULT_OG_IMAGE,
        url: shareUrl,
        viewUrl: realUrl
      })
    );
  }

  try {
    const apiUrl =
      `${SUPABASE_URL}/rest/v1/listings` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=title,description,price,rent_sale,city,district,images` +
      `&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error('Supabase error ' + res.status);
    }

    const data = await res.json();
    const ad = data && data[0];

    if (!ad) {
      throw new Error('Listing not found');
    }

    const title = ad.title || 'Annonce immobilière';

    const price = fmtPrice(ad.price, ad.rent_sale);

    const location = [ad.district, ad.city]
      .filter(Boolean)
      .join(', ');

    const mode =
      ad.rent_sale === 'sale'
        ? 'À vendre'
        : 'À louer';

    const desc = `${price} · ${location}. ${mode}. Contact rapide WhatsApp.`;

    const img =
      (ad.images && ad.images[0]) ||
      DEFAULT_OG_IMAGE;

    return htmlResponse(
      buildHtml({
        title,
        desc,
        img,
        url: shareUrl,     // 🔥 CRUCIAL : /share/
        viewUrl: realUrl   // lien humain
      })
    );
  } catch (e) {
    return htmlResponse(
      buildHtml({
        title: 'SE LOGER CM',
        desc: 'Trouvez votre bien immobilier au Cameroun.',
        img: DEFAULT_OG_IMAGE,
        url: shareUrl,
        viewUrl: realUrl
      })
    );
  }
};

function htmlResponse(html) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    },
    body: html
  };
}

function buildHtml({ title, desc, img, url, viewUrl }) {
  const t = escapeHtml(title);
  const d = escapeHtml(desc);
  const i = escapeHtml(img);
  const u = escapeHtml(url);
  const v = escapeHtml(viewUrl);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${t}</title>

<meta name="description" content="${d}">

<meta property="og:type" content="article">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:image:secure_url" content="${i}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${u}">
<meta property="og:site_name" content="SE LOGER CM">
<meta property="og:locale" content="fr_CM">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">

<link rel="canonical" href="${u}">

<style>
body{
font-family:Arial,sans-serif;
max-width:700px;
margin:60px auto;
padding:20px;
text-align:center;
color:#222;
}
img{
max-width:100%;
border-radius:12px;
}
a{
display:inline-block;
margin-top:20px;
padding:12px 18px;
background:#ff7a00;
color:#fff;
text-decoration:none;
border-radius:8px;
font-weight:bold;
}
</style>
</head>
<body>

<img src="${i}" alt="${t}">
<h1>${t}</h1>
<p>${d}</p>

<a href="${v}">
Voir l'annonce
</a>

</body>
</html>`;
}