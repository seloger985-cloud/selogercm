/* ════════════════════════════════════════════════════════════════════════
   visite-seo.js — Fonction Netlify pour les partages /visites-express/{id}

   Quand un lien de réel est partagé (WhatsApp, réseaux), les crawlers
   n'exécutent pas le JS : ils lisent les balises OG. Cette fonction lit
   l'annonce, sert la HOMEPAGE patchée avec l'image OG (poster du réel),
   le titre et la description du bien. À l'ouverture côté humain, reels.js
   détecte l'URL /visites-express/{id} et ouvre le lecteur sur ce réel.

   Miroir de sale-seo.js / listing-seo.js.
   ════════════════════════════════════════════════════════════════════════ */
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

function fmtPrice(n, rentSale) {
  const v = (n || 0).toLocaleString('fr-FR') + ' FCFA';
  return rentSale === 'sale' ? v : v + ' / mois';
}

function parseSlug(event) {
  let p = event.path || '';
  if (!p.includes('/visites-express/') && event.rawUrl) {
    try { p = new URL(event.rawUrl).pathname; } catch (_) { /* keep */ }
  }
  const raw = p
    .replace(/^\/\.netlify\/functions\/visite-seo\/?/i, '')
    .replace(/^\/visites-express\/?/i, '')
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

function buildSeo(ad, slug) {
  const canonicalSlug = ad.slug || ad.id || slug;
  const title = ad.title || 'Visite Express';
  const city = [ad.district, ad.city].filter(Boolean).join(', ');
  const poster = (ad.images && ad.images[0]) || `${SITE}/assets/img/og-cover.png`;
  const adImg = cfVariant(poster, 'og');
  const pageTitle = `Visite Express : ${title}${city ? ' — ' + city : ''} | SE LOGER CM`;
  const adDesc = `Visite vidéo de ${title}${city ? ' à ' + city : ''} — ${fmtPrice(ad.price, ad.rent_sale)}. Découvrez ce bien en vidéo sur SE LOGER CM.`;
  const adUrl = `${SITE}/visites-express/${encodeURIComponent(canonicalSlug)}`;
  return { pageTitle, adDesc, adImg, adUrl };
}

function readTemplate() {
  const candidates = [
    path.join(__dirname, 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, '../../index.html'),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } catch (_) { /* next */ }
  }
  return null;
}

/* Patche la home : titre + description + OG/twitter (on retire les OG existants
   de la home pour éviter les doublons, puis on injecte ceux du réel). */
function patchTemplate(html, seo) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(seo.pageTitle)}</title>`);
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${esc(seo.adDesc)}">`);
  out = out.replace(/\s*<meta\s+property="og:[^"]*"[^>]*>/gi, '');
  out = out.replace(/\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
  const headInject = `  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${esc(seo.adUrl)}">
  <meta property="og:title" content="${esc(seo.pageTitle)}">
  <meta property="og:description" content="${esc(seo.adDesc)}">
  <meta property="og:image" content="${esc(seo.adImg)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seo.pageTitle)}">
  <meta name="twitter:description" content="${esc(seo.adDesc)}">
  <meta name="twitter:image" content="${esc(seo.adImg)}">
</head>`;
  out = out.replace(/<\/head>/i, headInject);
  return out;
}

const INVALID_SLUG_VALUES = new Set(['undefined', 'null', 'NaN', '0', 'false']);

exports.handler = async function (event) {
  const slug = parseSlug(event);
  const template = readTemplate();

  /* Garde-fou : si on ne peut pas lire la home, on laisse Netlify servir la home statique. */
  const serveHome = (patched, code) => ({
    statusCode: code || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
    body: patched,
  });

  // Slug invalide → on sert simplement la home (le lecteur ne s'ouvrira pas).
  if (!slug || INVALID_SLUG_VALUES.has(slug.toLowerCase())) {
    return template ? serveHome(template) : { statusCode: 302, headers: { Location: '/' }, body: '' };
  }

  try {
    const ad = await fetchListing(slug);

    // Bien introuvable → home (pas de 404 brutal pour un lien de réel).
    if (!ad) {
      return template ? serveHome(template) : { statusCode: 302, headers: { Location: '/' }, body: '' };
    }

    // Bien sans vidéo → rediriger vers sa fiche classique.
    if (!ad.video_url) {
      return { statusCode: 302, headers: { Location: `/annonce/${encodeURIComponent(ad.slug || ad.id)}` }, body: '' };
    }

    const seo = buildSeo(ad, slug);
    const body = template
      ? patchTemplate(template, seo)
      : `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(seo.pageTitle)}</title>
<meta property="og:title" content="${esc(seo.pageTitle)}">
<meta property="og:description" content="${esc(seo.adDesc)}">
<meta property="og:image" content="${esc(seo.adImg)}">
<meta property="og:url" content="${esc(seo.adUrl)}">
<meta http-equiv="refresh" content="0;url=/"></head><body></body></html>`;

    return serveHome(body);
  } catch (err) {
    // En cas d'erreur, on sert la home pour ne jamais casser un partage.
    return template ? serveHome(template) : { statusCode: 302, headers: { Location: '/' }, body: '' };
  }
};
