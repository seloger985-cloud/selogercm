/**
 * Netlify Function — listing-seo.js
 * Sert /annonce/:slug avec HTML complet (meta, JSON-LD, contenu visible)
 * puis hydratation client via listing_detail.html (scripts inchangés).
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE = 'https://selogercm.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseSlug(event) {
  let path = event.path || '';
  if (!path.includes('/annonce/') && event.rawUrl) {
    try { path = new URL(event.rawUrl).pathname; } catch (_) { /* keep */ }
  }
  const raw = path
    .replace(/^\/\.netlify\/functions\/listing-seo\/?/i, '')
    .replace(/^\/annonce\/?/i, '')
    .split('?')[0];
  return decodeURIComponent(raw || '').trim();
}

async function fetchListing(slug) {
  if (!slug || !SB_KEY) return null;
  const filter = UUID_RE.test(slug)
    ? `id=eq.${encodeURIComponent(slug)}`
    : `slug=eq.${encodeURIComponent(slug)}`;
  const url = `${SUPABASE_URL}/rest/v1/listings?${filter}&status=eq.active&select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

function buildSeo(ad, slug) {
  const adTitle = ad.title || ad.title_en || ad.title_fr || 'Annonce immobilière';
  const adCity = [ad.district, ad.city].filter(Boolean).join(', ') || 'Douala';
  const adPrice = (ad.price || 0).toLocaleString('fr-FR') + ' FCFA';
  const adMode = ad.rent_sale === 'sale' ? 'à vendre' : 'à louer';
  const adImg = (ad.images && ad.images[0]) || `${SITE}/assets/img/og-cover.png`;
  const canonicalSlug = ad.slug || slug;
  const adUrl = `${SITE}/annonce/${encodeURIComponent(canonicalSlug)}`;
  const pageTitle = `${adTitle} — ${adCity} | SE LOGER CM`;
  const adDesc = ad.type === 'fonds-commerce'
    ? `${adTitle} — ${adCity} — Prix du fonds : ${adPrice}.${ad.business_rent ? ' Loyer : ' + (Number(ad.business_rent) || 0).toLocaleString('fr-FR') + ' FCFA/mois.' : ''} ${ad.description ? String(ad.description).slice(0, 120) + '…' : 'Annonce vérifiée par SE LOGER CM.'}`
    : `${adTitle} — ${adCity} — ${adPrice} ${adMode}. ${ad.description ? String(ad.description).slice(0, 160) + '…' : 'Annonce immobilière vérifiée par SE LOGER CM.'}`;

  const typeMap = {
    apartment: 'Apartment',
    studio: 'Apartment',
    house: 'House',
    villa: 'House',
    duplex: 'House',
    office: 'Place',
    shop: 'Store',
    'fonds-commerce': 'Store',
    land: 'Place',
    warehouse: 'Place',
  };
  const schemaType = typeMap[ad.type] || 'Residence';
  const schema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: adTitle,
    description: adDesc,
    url: adUrl,
    image: ad.images && ad.images.length ? ad.images.slice(0, 6) : [adImg],
    address: {
      '@type': 'PostalAddress',
      addressLocality: ad.district || ad.city || 'Douala',
      addressRegion: ad.city || 'Littoral',
      addressCountry: 'CM',
    },
    offers: {
      '@type': 'Offer',
      price: ad.price || 0,
      priceCurrency: 'XAF',
      availability: 'https://schema.org/InStock',
      url: adUrl,
      businessFunction: ad.rent_sale === 'sale'
        ? 'https://schema.org/Sell'
        : 'https://schema.org/LeaseOut',
    },
  };

  return { adTitle, adCity, adPrice, adMode, adImg, adUrl, pageTitle, adDesc, schema };
}

function buildPrerender(ad, seo) {
  const desc = ad.description
    ? `<div class="desc-block"><h2>Description</h2><p>${esc(ad.description)}</p></div>`
    : '';
  const modeLabel = ad.rent_sale === 'sale' ? 'À vendre' : 'À louer';
  return `
    <article class="listing-seo-prerender info-panel" style="background:#fff;border-radius:16px;padding:1.4rem;box-shadow:0 6px 20px rgba(0,0,0,.07)">
      <img src="${esc(seo.adImg)}" alt="${esc(seo.adTitle)}" width="800" height="450" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-bottom:1rem" loading="eager" fetchpriority="high">
      <h1 style="font-size:1.5rem;font-weight:800;margin-bottom:.5rem">${esc(seo.adTitle)}</h1>
      <p style="font-size:1.35rem;font-weight:800;color:#ff7a00;margin-bottom:.5rem">${esc(seo.adPrice)} <span style="font-size:.9rem;color:#666">${ad.rent_sale === 'sale' ? '' : '/ mois'}</span></p>
      <p style="color:#555;margin-bottom:1rem"><strong>${esc(seo.adCity)}</strong> · ${esc(modeLabel)}</p>
      ${desc}
      <p style="margin-top:1rem"><a href="${esc(seo.adUrl)}" style="color:#ff7a00;font-weight:700">Voir l'annonce complète sur SE LOGER CM</a></p>
    </article>`;
}

function readTemplate() {
  const candidates = [
    path.join(__dirname, 'listing_detail.html'),
    path.join(process.cwd(), 'listing_detail.html'),
    path.join(__dirname, '../../listing_detail.html'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (_) { /* next */ }
  }
  return null;
}

function patchTemplate(html, seo, prerender) {
  let out = html;

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(seo.pageTitle)}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"/i,
    `<meta name="description" content="${esc(seo.adDesc)}"`,
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"/i,
    `<link rel="canonical" href="${esc(seo.adUrl)}"`,
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"/i,
    `<link rel="alternate" hreflang="x-default" href="${esc(seo.adUrl)}"`,
  );

  const ogPairs = [
    ['og:url', seo.adUrl],
    ['og:title', seo.pageTitle],
    ['og:description', seo.adDesc],
    ['og:image', seo.adImg],
  ];
  for (const [prop, val] of ogPairs) {
    const re = new RegExp(`<meta\\s+property="${prop}"\\s+content="[^"]*"`, 'i');
    out = out.replace(re, `<meta property="${prop}" content="${esc(val)}"`);
  }

  const twPairs = [
    ['twitter:title', seo.pageTitle],
    ['twitter:description', seo.adDesc],
    ['twitter:image', seo.adImg],
  ];
  for (const [name, val] of twPairs) {
    const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"`, 'i');
    out = out.replace(re, `<meta name="${name}" content="${esc(val)}"`);
  }

  out = out.replace(
    /<script\s+type="application\/ld\+json"\s+id="schema-listing">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="schema-listing">${JSON.stringify(seo.schema)}</script>`,
  );

  out = out.replace(
    /<div\s+id="pageContent"><\/div>/i,
    `<div id="pageContent">${prerender}</div>`,
  );

  /* Script SEO immédiat : lire le slug depuis le path */
  out = out.replace(
    /var slug = p\.get\('slug'\) \|\| p\.get\('id'\) \|\| '';/,
    `var parts = location.pathname.split('/').filter(Boolean);
      var slug = (parts[0] === 'annonce' && parts[1]) ? decodeURIComponent(parts[1]) : (p.get('slug') || p.get('id') || '');`,
  );

  return out;
}

function notFoundHtml(slug) {
  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Annonce introuvable | SE LOGER CM</title>
<link rel="canonical" href="${SITE}/annonces">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem">
<h1>Annonce introuvable</h1>
<p>L'annonce « ${esc(slug)} » n'existe pas ou n'est plus disponible.</p>
<p><a href="${SITE}/annonces" style="color:#ff7a00;font-weight:700">← Retour aux annonces</a></p>
</body></html>`;
}

/* Valeurs de slug invalides qui ne doivent JAMAIS générer un appel Supabase */
const INVALID_SLUG_VALUES = new Set(['undefined', 'null', 'NaN', '0', 'false']);

exports.handler = async function (event) {
  const slug = parseSlug(event);

  /* Cas 1 : slug vide ou clairement invalide → 404 + noindex
     - Empêche l'indexation de pages-poubelle par Google
     - Évite un appel Supabase inutile sur des URLs malformées */
  if (!slug || INVALID_SLUG_VALUES.has(slug.toLowerCase())) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
      body: notFoundHtml(slug || ''),
    };
  }

  try {
    const ad = await fetchListing(slug);
    if (!ad) {
      /* Annonce vraiment introuvable en base : 404 + noindex */
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
        },
        body: notFoundHtml(slug),
      };
    }

    const seo = buildSeo(ad, slug);
    const prerender = buildPrerender(ad, seo);
    const template = readTemplate();

    const body = template
      ? patchTemplate(template, seo, prerender)
      : `<!DOCTYPE html><html lang="fr"><head><title>${esc(seo.pageTitle)}</title>
<meta name="description" content="${esc(seo.adDesc)}">
<link rel="canonical" href="${esc(seo.adUrl)}">
<script type="application/ld+json">${JSON.stringify(seo.schema)}</script>
</head><body>${prerender}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js" defer></script>
<script src="/assets/js/supabase.js" defer></script>
<script src="/assets/js/config.js"></script>
<script src="/assets/js/listings.js" defer></script>
</body></html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
      body,
    };
  } catch (err) {
    console.error('[listing-seo]', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: `listing-seo error: ${err.message}`,
    };
  }
};
