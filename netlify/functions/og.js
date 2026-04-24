const SUPABASE_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SITE = 'https://selogercm.com';
const DEFAULT_IMG = `${SITE}/assets/img/og-cover.jpg`;

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

exports.handler = async function(event) {
  const path = event.path || '';
  const slug = decodeURIComponent(path.replace('/share/', '').split('?')[0]);

  const targetUrl = `${SITE}/annonce/${slug}`;
  const shareUrl = `${SITE}/share/${slug}`;

  let title = 'SE LOGER CM | Immobilier Cameroun';
  let desc = 'Découvrez cette annonce immobilière sur SE LOGER CM.';
  let img = DEFAULT_IMG;

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
        const price = ad.price ? Number(ad.price).toLocaleString('fr-FR') + ' FCFA' : '';
        const location = [ad.district, ad.city].filter(Boolean).join(', ');

        title = `${ad.title || 'Annonce immobilière'} | SE LOGER CM`;
        desc = `${price}${location ? ' · ' + location : ''}. Contact rapide WhatsApp.`;
        img = firstImage(ad);
      }
    }
  } catch (e) {
    console.error('OG error:', e.message);
  }

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
<meta property="og:site_name" content="SE LOGER CM">
<meta property="og:locale" content="fr_CM">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">

<link rel="canonical" href="${esc(shareUrl)}">
<meta http-equiv="refresh" content="0; url=${esc(targetUrl)}">
</head>
<body>
<p>Redirection...</p>
<p><a href="${esc(targetUrl)}">Ouvrir l’annonce</a></p>
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
