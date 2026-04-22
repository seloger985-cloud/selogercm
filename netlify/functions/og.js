/**
 * Serverless function for social share HTML.
 * Route: /share/:slug  -> /.netlify/functions/og
 */

const SUPABASE_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
const SITE_URL = 'https://www.selogercm.com';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtPrice(value, mode) {
  const amount = Number(value || 0).toLocaleString('fr-FR') + ' FCFA';
  return mode === 'sale' ? amount : `${amount}/mois`;
}

function extractSlug(event) {
  const rawUrl = event.rawUrl || '';
  const path = event.path || '';

  const fromRaw = rawUrl.match(/\/share\/([^/?#]+)/)?.[1];
  const fromPath = path.match(/\/share\/([^/?#]+)/)?.[1];
  const fromQuery = event.queryStringParameters?.slug;

  return decodeURIComponent(fromRaw || fromPath || fromQuery || '').trim() || null;
}

exports.handler = async function handler(event) {
  const SB_KEY = process.env.SB_ANON_KEY;
  const slug = extractSlug(event);

  if (!SB_KEY) {
    return htmlResponse(buildFallbackHtml({
      url: `${SITE_URL}/annonces`,
      title: 'SE LOGER CM',
      description: 'Trouvez votre bien immobilier à Douala et au Cameroun.',
      image: `${SITE_URL}/og-image/default`,
    }));
  }

  if (!slug) {
    return htmlResponse(buildFallbackHtml({
      url: `${SITE_URL}/annonces`,
      title: 'SE LOGER CM',
      description: 'Trouvez votre bien immobilier à Douala et au Cameroun.',
      image: `${SITE_URL}/og-image/default`,
    }));
  }

  const canonicalUrl = `${SITE_URL}/annonce/${slug}`;
  const dynamicImageUrl = `${SITE_URL}/og-image/${encodeURIComponent(slug)}`;

  try {
    const apiUrl = `${SUPABASE_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=title,description,price,rent_sale,city,district,type,ref&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return htmlResponse(buildFallbackHtml({
        url: canonicalUrl,
        title: 'SE LOGER CM',
        description: 'Trouvez votre bien immobilier à Douala et au Cameroun.',
        image: dynamicImageUrl,
      }));
    }

    const [ad] = await res.json();

    if (!ad) {
      return htmlResponse(buildFallbackHtml({
        url: canonicalUrl,
        title: 'SE LOGER CM',
        description: 'Annonce immobilière sur SE LOGER CM.',
        image: dynamicImageUrl,
      }));
    }

    const title = escapeHtml(ad.title || 'Annonce immobilière');
    const price = fmtPrice(ad.price, ad.rent_sale);
    const location = [ad.district, ad.city].filter(Boolean).join(', ');
    const rentSale = ad.rent_sale === 'sale' ? 'À vendre' : 'À louer';
    const shortDescription = ad.description
      ? String(ad.description).replace(/\s+/g, ' ').trim().slice(0, 110)
      : `${rentSale} sur SE LOGER CM.`;

    const description = escapeHtml(
      [price, location, shortDescription].filter(Boolean).join(' · ')
    );

    return htmlResponse(buildShareHtml({
      title,
      description,
      image: dynamicImageUrl,
      url: canonicalUrl,
    }));
  } catch {
    return htmlResponse(buildFallbackHtml({
      url: canonicalUrl,
      title: 'SE LOGER CM',
      description: 'Trouvez votre bien immobilier à Douala et au Cameroun.',
      image: dynamicImageUrl,
    }));
  }
};

function htmlResponse(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body,
  };
}

function buildShareHtml({ title, description, image, url }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title} | SE LOGER CM</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="noindex, nofollow">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SE LOGER CM">
  <meta property="og:locale" content="fr_CM">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${title} | SE LOGER CM">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} | SE LOGER CM">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <link rel="canonical" href="${escapeHtml(url)}">

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 56px auto; padding: 0 20px; color: #1f2937; }
    .card { border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
    .preview { width: 100%; display: block; }
    .content { padding: 20px; }
    .muted { color: #6b7280; }
    a { color: #ff7a00; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <img class="preview" src="${escapeHtml(image)}" alt="${title}">
    <div class="content">
      <h1>${title}</h1>
      <p>${description}</p>
      <p class="muted">Aperçu social prêt pour Facebook, WhatsApp et X.</p>
      <p><a href="${escapeHtml(url)}">Voir l’annonce</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildFallbackHtml({ title, description, image, url }) {
  return buildShareHtml({ title: escapeHtml(title), description: escapeHtml(description), image, url });
}
