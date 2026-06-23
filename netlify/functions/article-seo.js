/**
 * Netlify Function — article-seo.js
 * Sert /article/:id avec un HTML complet (meta OG/Twitter, JSON-LD BlogPosting,
 * contenu visible) PUIS hydratation client via article.html (scripts inchangés).
 *
 * Objectif : que TOUT partage de l'URL d'article (Facebook, WhatsApp, LinkedIn,
 * Twitter…) affiche le bon aperçu — et que Googlebot voie le texte de l'article —
 * sans aucune redirection (le SPA s'hydrate normalement pour les humains).
 *
 * Contrairement à og.js (page /share/ avec meta-refresh), on NE redirige PAS :
 * on renvoie le vrai article.html enrichi. Brancher /article/:id sur og.js
 * provoquerait une boucle (refresh vers /article/:id → og → refresh…).
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE = 'https://selogercm.com';
const DEFAULT_IMG = `${SITE}/assets/img/og-cover.png`;

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Normalise la couverture en URL absolue exploitable par Facebook :
   - Cloudflare Images : sert la variante "og" (1200×630) native ;
   - URL absolue : telle quelle ;
   - chemin relatif : préfixe le domaine ;
   - vide : image par défaut. */
function ogImage(url) {
  const u = url ? String(url).trim() : '';
  if (!u) return DEFAULT_IMG;
  if (u.includes('imagedelivery.net')) return u.replace(/\/[^/]+$/, '/og');
  if (/^https?:\/\//i.test(u)) return u;
  return SITE + (u.startsWith('/') ? '' : '/') + u;
}

function parseId(event) {
  let p = event.path || '';
  if (!p.includes('/article/') && !p.includes('/article-seo') && event.rawUrl) {
    try { p = new URL(event.rawUrl).pathname; } catch (_) { /* keep */ }
  }
  const qs = event.queryStringParameters || {};
  let id = (qs.id || '').trim();
  if (!id) {
    id = p
      .replace(/^\/\.netlify\/functions\/article-seo\/?/i, '')
      .replace(/^\/article\/?/i, '')
      .split('?')[0];
  }
  return decodeURIComponent(id || '').trim();
}

async function fetchArticle(id) {
  if (!id || !SB_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/blog_articles?id=eq.${encodeURIComponent(id)}`
    + `&select=title,excerpt,cover,category,content,created_at&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

function buildSeo(art, id) {
  const title = art.title || 'Article';
  const pageTitle = `${title} — SE LOGER CM`;
  const cleanExcerpt = art.excerpt ? String(art.excerpt).replace(/\s+/g, ' ').trim() : '';
  const desc = cleanExcerpt
    || `${title} — Conseils et actualités immobilières au Cameroun par SE LOGER CM.`;
  const img = ogImage(art.cover);
  const url = `${SITE}/article/${encodeURIComponent(id)}`;
  const published = art.created_at ? new Date(art.created_at).toISOString() : new Date().toISOString();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    image: img,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: published,
    dateModified: published,
    author: { '@type': 'Organization', name: 'SE LOGER CM', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'SE LOGER CM',
      logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo.png` },
    },
  };
  return { title, pageTitle, desc, img, url, schema };
}

/* Pré-rendu visible par les crawlers ; remplacé par le JS pour les humains
   (article.html fait `area.innerHTML = …` au chargement). */
function buildPrerender(art, seo) {
  const cover = seo.img
    ? `<div class="article-cover"><img src="${esc(seo.img)}" alt="${esc(seo.title)}" width="1200" height="630" loading="eager"></div>`
    : '';
  const body = art.content || `<p>${esc(seo.desc)}</p>`;
  return `<article class="article-seo-prerender">
      <h1 class="article-title">${esc(seo.title)}</h1>
      ${cover}
      <div class="article-body">${body}</div>
      <p style="margin-top:1.4rem"><a href="${esc(seo.url)}">Lire l'article complet sur SE LOGER CM</a> · <a href="${SITE}/blog">Tous les articles du blog</a></p>
    </article>`;
}

function readTemplate() {
  const candidates = [
    path.join(__dirname, 'article.html'),
    path.join(process.cwd(), 'article.html'),
    path.join(__dirname, '../../article.html'),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } catch (_) { /* next */ }
  }
  return null;
}

function patchTemplate(html, seo, prerender) {
  let out = html;

  // Remplace les balises statiques existantes (on garde leur '>' / '/>' d'origine)
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(seo.pageTitle)}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"/i,
    `<meta name="description" content="${esc(seo.desc)}"`,
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"/i,
    `<link rel="canonical" href="${esc(seo.url)}"`,
  );

  // Injecte OG / Twitter / JSON-LD (absents du template) juste avant </head>
  const headInject = `
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SE LOGER CM">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="${esc(seo.url)}">
  <meta property="og:title" content="${esc(seo.pageTitle)}">
  <meta property="og:description" content="${esc(seo.desc)}">
  <meta property="og:image" content="${esc(seo.img)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seo.pageTitle)}">
  <meta name="twitter:description" content="${esc(seo.desc)}">
  <meta name="twitter:image" content="${esc(seo.img)}">
  <script type="application/ld+json">${JSON.stringify(seo.schema)}</script>
</head>`;
  out = out.replace(/<\/head>/i, headInject);

  // Pré-rendu du contenu (vu par les crawlers, écrasé par le JS pour les humains)
  out = out.replace(
    /<div\s+id="articleContent">\s*<\/div>/i,
    `<div id="articleContent">${prerender}</div>`,
  );

  return out;
}

function notFoundHtml(id) {
  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Article introuvable | SE LOGER CM</title>
<link rel="canonical" href="${SITE}/blog">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem">
<h1>Article introuvable</h1>
<p>L'article demandé n'existe pas ou n'est plus disponible.</p>
<p><a href="${SITE}/blog" style="color:#ff7a00;font-weight:700">← Retour au blog</a></p>
</body></html>`;
}

/* Valeurs d'id invalides qui ne doivent JAMAIS générer un appel Supabase */
const INVALID_IDS = new Set(['undefined', 'null', 'nan', '0', 'false', '']);

exports.handler = async function (event) {
  const id = parseId(event);

  if (!id || INVALID_IDS.has(id.toLowerCase())) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
      body: notFoundHtml(id),
    };
  }

  try {
    const art = await fetchArticle(id);
    if (!art) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
        body: notFoundHtml(id),
      };
    }

    const seo = buildSeo(art, id);
    const prerender = buildPrerender(art, seo);
    const template = readTemplate();

    const body = template
      ? patchTemplate(template, seo, prerender)
      : `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(seo.pageTitle)}</title>
<meta name="description" content="${esc(seo.desc)}">
<link rel="canonical" href="${esc(seo.url)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(seo.url)}">
<meta property="og:title" content="${esc(seo.pageTitle)}">
<meta property="og:description" content="${esc(seo.desc)}">
<meta property="og:image" content="${esc(seo.img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(seo.img)}">
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
    console.error('[article-seo]', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: `article-seo error: ${err.message}`,
    };
  }
};
