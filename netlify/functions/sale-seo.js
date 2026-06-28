/**
 * Netlify Function — sale-seo.js
 * Sert /vente/:slug avec HTML complet (meta OG, JSON-LD, contenu prérendu)
 * puis hydratation client via vente_detail.html (scripts inchangés).
 * Jumelle de listing-seo.js, spécialisée pour les ventes à dossier complet.
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

/* Variante Cloudflare Images (.../public → .../<variant>). Sinon URL telle quelle. */
function cfVariant(url, variant) {
  if (!url) return '';
  return url.includes('imagedelivery.net') ? url.replace(/\/[^/]+$/, '/' + variant) : url;
}

const TITLE_STATUS = {
  titre_foncier: 'Titre foncier — pleine propriété',
  immatriculation_en_cours: 'Immatriculation en cours',
  non_titre: 'Non titré',
};

function parseSlug(event) {
  let p = event.path || '';
  if (!p.includes('/vente/') && event.rawUrl) {
    try { p = new URL(event.rawUrl).pathname; } catch (_) { /* keep */ }
  }
  const raw = p
    .replace(/^\/\.netlify\/functions\/sale-seo\/?/i, '')
    .replace(/^\/vente\/?/i, '')
    .split('?')[0];
  return decodeURIComponent(raw || '').trim();
}

async function sbGet(url) {
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchListing(slug) {
  if (!slug || !SB_KEY) return null;
  const filter = UUID_RE.test(slug)
    ? `id=eq.${encodeURIComponent(slug)}`
    : `slug=eq.${encodeURIComponent(slug)}`;
  const rows = await sbGet(`${SUPABASE_URL}/rest/v1/listings?${filter}&status=eq.active&select=*&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

async function fetchDossier(listingId) {
  if (!listingId || !SB_KEY) return {};
  const rows = await sbGet(`${SUPABASE_URL}/rest/v1/sale_dossier_public?listing_id=eq.${encodeURIComponent(listingId)}&select=*&limit=1`);
  return (rows && rows[0]) ? rows[0] : {};
}

/* Autres ventes à dossier complet (même ville) — maillage interne. */
async function fetchRelated(ad) {
  if (!SB_KEY || !ad) return [];
  const base = `${SUPABASE_URL}/rest/v1/listings?status=eq.active&rent_sale=eq.sale&dossier_complet=eq.true&select=slug,title,district,city,price&order=created_at.desc&limit=4`;
  const ex = ad.id ? `&id=neq.${encodeURIComponent(ad.id)}` : '';
  const tries = [];
  if (ad.city) tries.push(`${base}${ex}&city=eq.${encodeURIComponent(ad.city)}`);
  tries.push(`${base}${ex}`);
  for (const url of tries) {
    try {
      const rows = await sbGet(url);
      const list = (rows || []).filter(r => r && r.slug);
      if (list.length) return list;
    } catch (_) { /* suivant */ }
  }
  return [];
}

function buildSeo(ad, dossier, slug) {
  const adTitle = ad.title || 'Bien à vendre';
  const adCity = [ad.district, ad.city].filter(Boolean).join(', ') || 'Douala';
  const adPrice = (Number(ad.price) || 0).toLocaleString('fr-FR') + ' FCFA';
  const cleanDescription = ad.description ? String(ad.description).replace(/\s+/g, ' ').trim() : '';
  const adImg = cfVariant((ad.images && ad.images[0]) || `${SITE}/assets/img/og-cover.png`, 'og');
  const adImgFull = cfVariant((ad.images && ad.images[0]) || `${SITE}/assets/img/og-cover.png`, 'gallery');
  const canonicalSlug = ad.slug || slug;
  const adUrl = `${SITE}/vente/${encodeURIComponent(canonicalSlug)}`;
  const pageTitle = `${adTitle} à vendre — ${adCity} · Dossier complet | SE LOGER CM`;

  const docLabels = Array.isArray(dossier.documents)
    ? dossier.documents.map(x => x && x.label).filter(Boolean).slice(0, 4).join(', ')
    : '';
  const adDesc = `${adTitle} à vendre à ${adCity} — ${adPrice}. Dossier complet${docLabels ? ' : ' + docLabels : ''}, consultables en agence. ${cleanDescription ? cleanDescription.slice(0, 120) + '…' : 'Vente accompagnée par SE LOGER CM, passage notaire.'}`;

  const typeMap = { apartment:'Apartment', studio:'Apartment', house:'House', villa:'House', duplex:'House', office:'Place', shop:'Store', land:'Place', warehouse:'Place' };
  const schemaType = typeMap[ad.type] || 'Residence';
  const listingSchema = {
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
      businessFunction: 'https://schema.org/Sell',
    },
  };

  return { adTitle, adCity, adPrice, adImg, adImgFull, adUrl, pageTitle, adDesc, schema: listingSchema };
}

function buildPrerender(ad, dossier, seo, related = []) {
  const desc = ad.description
    ? `<div class="desc-block"><h2>Description</h2><p>${esc(ad.description)}</p></div>`
    : '';
  const titleLine = dossier.title_status
    ? `<p style="font-weight:700">${esc(TITLE_STATUS[dossier.title_status] || dossier.title_status)}</p>` : '';
  const docs = Array.isArray(dossier.documents) ? dossier.documents : [];
  const docsHtml = docs.length
    ? `<h2 style="font-size:1.1rem;font-weight:800;margin:1rem 0 .5rem">Dossier juridique</h2>
       <ul style="margin:0;padding-left:1.1rem;color:#333">
         ${docs.map(d => `<li>${esc(d.label || 'Document')} <span style="color:#1f7a44">— ${esc(d.status || 'consultable en agence')}</span></li>`).join('')}
       </ul>` : '';
  const relatedHtml = (related && related.length)
    ? `<nav aria-label="Autres biens à vendre" style="margin-top:1.6rem;border-top:1px solid #eee;padding-top:1rem">
        <h2 style="font-size:1.1rem;font-weight:800;margin-bottom:.7rem">Autres biens à vendre à ${esc(ad.city || 'Douala')}</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:.55rem">
          ${related.map(r => `<li><a href="${SITE}/vente/${encodeURIComponent(r.slug)}" style="color:#111;text-decoration:none;font-weight:600">${esc(r.title || 'Bien à vendre')}</a> <span style="color:#888;font-size:.9rem">— ${esc([r.district, r.city].filter(Boolean).join(', '))} · ${esc((r.price || 0).toLocaleString('fr-FR'))} FCFA</span></li>`).join('')}
        </ul>
      </nav>`
    : '';
  return `
    <article class="sale-seo-prerender" style="background:#fff;border-radius:16px;padding:1.4rem;box-shadow:0 6px 20px rgba(0,0,0,.07)">
      <img src="${esc(seo.adImgFull)}" alt="${esc(seo.adTitle)}" width="800" height="450" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-bottom:1rem" loading="eager" fetchpriority="high">
      <h1 style="font-size:1.5rem;font-weight:800;margin-bottom:.5rem">${esc(seo.adTitle)}</h1>
      <p style="font-size:1.35rem;font-weight:800;color:#ff7a00;margin-bottom:.5rem">${esc(seo.adPrice)}</p>
      <p style="color:#555;margin-bottom:1rem"><strong>${esc(seo.adCity)}</strong> · À vendre · Dossier complet</p>
      ${titleLine}
      ${desc}
      ${docsHtml}
      <p style="margin-top:.8rem;font-size:.85rem;color:#8a7c63">Documents fournis par le vendeur, consultables en agence. Vente devant notaire (art. 8 de l'ordonnance n° 74-1 du 6 juillet 1974).</p>
      <p style="margin-top:1rem"><a href="${esc(seo.adUrl)}" style="color:#ff7a00;font-weight:700">Voir le dossier complet sur SE LOGER CM</a></p>
      ${relatedHtml}
      <p style="margin-top:1.2rem;border-top:1px solid #eee;padding-top:1rem;font-size:.92rem"><a href="${SITE}/vente" style="color:#c25e00;text-decoration:none;font-weight:700">Voir tous nos biens à vendre en dossier complet →</a><br><a href="${SITE}/toutes-les-annonces" style="color:#c25e00;text-decoration:none;font-weight:600">Toutes les annonces immobilières à Douala →</a></p>
    </article>`;
}

function readTemplate() {
  const candidates = [
    path.join(__dirname, 'vente_detail.html'),
    path.join(process.cwd(), 'vente_detail.html'),
    path.join(__dirname, '../../vente_detail.html'),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } catch (_) { /* next */ }
  }
  return null;
}

function patchTemplate(html, seo, prerender) {
  let out = html;

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(seo.pageTitle)}</title>`);
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${esc(seo.adDesc)}"`);
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"/i, `<link rel="canonical" href="${esc(seo.adUrl)}"`);

  // vente_detail.html n'a pas de balises OG : on les injecte avant </head>
  const headInject = `  <link rel="preload" as="image" fetchpriority="high" href="${esc(seo.adImgFull)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(seo.adUrl)}">
  <meta property="og:title" content="${esc(seo.pageTitle)}">
  <meta property="og:description" content="${esc(seo.adDesc)}">
  <meta property="og:image" content="${esc(seo.adImg)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seo.pageTitle)}">
  <meta name="twitter:description" content="${esc(seo.adDesc)}">
  <meta name="twitter:image" content="${esc(seo.adImg)}">
  <script type="application/ld+json">${JSON.stringify(seo.schema)}</script>
</head>`;
  out = out.replace(/<\/head>/i, headInject);

  // Remplace le placeholder de chargement par le contenu prérendu (crawlers)
  out = out.replace(/<div class="v-loading">[\s\S]*?<\/div>/i, prerender);

  return out;
}

function notFoundHtml(slug) {
  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Bien introuvable | SE LOGER CM</title>
<link rel="canonical" href="${SITE}/annonces">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem">
<h1>Bien introuvable</h1>
<p>Ce bien à vendre n'existe pas ou n'est plus disponible.</p>
<p><a href="${SITE}/annonces" style="color:#ff7a00;font-weight:700">← Retour aux annonces</a></p>
</body></html>`;
}

const INVALID_SLUG_VALUES = new Set(['undefined', 'null', 'NaN', '0', 'false']);

exports.handler = async function (event) {
  const slug = parseSlug(event);

  if (!slug || INVALID_SLUG_VALUES.has(slug.toLowerCase())) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
      body: notFoundHtml(slug || ''),
    };
  }

  try {
    const ad = await fetchListing(slug);
    if (!ad) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
        body: notFoundHtml(slug),
      };
    }

    // Ce n'est pas une vente à dossier complet → rediriger vers la fiche normale
    if (!(ad.rent_sale === 'sale' && ad.dossier_complet)) {
      return { statusCode: 301, headers: { Location: `/annonce/${encodeURIComponent(ad.slug || ad.id)}` }, body: '' };
    }

    const dossier = await fetchDossier(ad.id);
    const seo = buildSeo(ad, dossier, slug);
    const related = await fetchRelated(ad);
    const prerender = buildPrerender(ad, dossier, seo, related);
    const template = readTemplate();

    const body = template
      ? patchTemplate(template, seo, prerender)
      : `<!DOCTYPE html><html lang="fr"><head><title>${esc(seo.pageTitle)}</title>
<meta name="description" content="${esc(seo.adDesc)}">
<link rel="canonical" href="${esc(seo.adUrl)}">
<script type="application/ld+json">${JSON.stringify(seo.schema)}</script>
</head><body>${prerender}</body></html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
      body,
    };
  } catch (err) {
    console.error('[sale-seo]', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: `sale-seo error: ${err.message}`,
    };
  }
};
