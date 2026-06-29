/* ════════════════════════════════════════════════════════════════════════
   vente-index.js — Page collection /vente (server-rendue, crawlable SEO)

   Liste TOUS les biens à vendre en « dossier complet » sous forme de cartes
   avec liens <a href="/vente/{slug}"> rendus dans le HTML brut — donc
   indexables sans JavaScript. Sert de hub interne vers chaque fiche premium.

   Sert la route /vente (remplace l'ancien 302 → /annonces).
   Helpers calqués sur sale-seo.js.
   ════════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE = 'https://selogercm.com';

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

function fmtPrice(n) {
  return (Number(n) || 0).toLocaleString('fr-FR') + ' FCFA';
}

const TYPE_FR = {
  villa: 'Villa', apartment: 'Appartement', house: 'Maison', land: 'Terrain',
  studio: 'Studio', office: 'Bureau', shop: 'Local commercial',
  commercial: 'Local commercial', warehouse: 'Entrepôt', duplex: 'Duplex'
};

async function sbGet(url) {
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchDossierSales() {
  if (!SB_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/listings`
    + `?status=eq.active&rent_sale=eq.sale&dossier_complet=eq.true`
    + `&select=slug,id,title,price,type,district,city,images`
    + `&order=created_at.desc&limit=200`;
  const rows = await sbGet(url);
  return rows || [];
}

function card(l) {
  const ref = l.slug || l.id;
  const img = cfVariant((l.images && l.images[0]) || '', 'gallery') || `${SITE}/assets/img/og-cover.png`;
  const loc = [l.district, l.city].filter(Boolean).join(', ');
  const t = TYPE_FR[l.type] || (l.type ? l.type.charAt(0).toUpperCase() + l.type.slice(1) : '');
  const title = l.title || ((t || 'Bien') + ' à vendre' + (l.district ? ' à ' + l.district : ''));
  return `<a class="vc" href="/vente/${esc(ref)}">
        <div class="vc-img" style="background-image:url('${esc(img)}')"><span class="vc-badge">Dossier complet</span></div>
        <div class="vc-body">
          ${t ? `<div class="vc-type">${esc(t)}</div>` : ''}
          <h2 class="vc-title">${esc(title)}</h2>
          ${loc ? `<div class="vc-loc">${esc(loc)}</div>` : ''}
          <div class="vc-price">${esc(fmtPrice(l.price))}</div>
        </div>
      </a>`;
}

exports.handler = async function () {
  let rows = [];
  try { rows = await fetchDossierSales(); } catch (_) { rows = []; }
  const count = rows.length;

  const title = `Biens à vendre à Douala — Dossier complet${count ? ` (${count})` : ''} | SE LOGER CM`;
  const desc = `Sélection de biens à vendre à Douala entièrement documentés : titre foncier, bornage, certificats vérifiés. Villas, terrains et appartements en dossier complet, consultables en agence — SE LOGER CM.`;
  const cards = rows.map(card).join('\n      ');

  const body = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${SITE}/vente">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${SITE}/vente">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${SITE}/assets/img/og-cover.png">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/img/favicon.ico">
  <link rel="stylesheet" href="/assets/css/style.css">
  <style>
    .vente-wrap{max-width:1180px;margin:0 auto;padding:1.5rem 1.1rem 4rem}
    .vente-crumb{font-size:.8rem;color:#888;margin-bottom:1rem}
    .vente-crumb a{color:#888;text-decoration:none}
    .vente-crumb a:hover{color:#ff7a00}
    .vente-head{background:#efe6d6;border-radius:18px;padding:1.8rem 1.6rem;margin-bottom:1.8rem}
    .vente-head h1{font-size:1.7rem;font-weight:900;color:#15161b;margin:0 0 .5rem;line-height:1.15}
    .vente-head p{font-size:.95rem;color:#5f5443;line-height:1.6;margin:0;max-width:760px}
    .vente-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:1.3rem}
    .vc{display:flex;flex-direction:column;background:#fff;border:1px solid #ececec;border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;transition:box-shadow .2s,transform .2s}
    .vc:hover{box-shadow:0 12px 30px rgba(0,0,0,.1);transform:translateY(-2px)}
    .vc-img{position:relative;aspect-ratio:4/3;background:#f0f0f0 center/cover no-repeat}
    .vc-badge{position:absolute;top:10px;left:10px;background:#15161b;color:#fff;font-size:.66rem;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:.32rem .6rem;border-radius:999px}
    .vc-body{padding:.95rem 1rem 1.1rem}
    .vc-type{font-size:.7rem;font-weight:800;color:#ff7a00;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.25rem}
    .vc-title{font-size:1rem;font-weight:700;color:#15161b;margin:0 0 .35rem;line-height:1.3}
    .vc-loc{font-size:.83rem;color:#777;margin-bottom:.5rem}
    .vc-price{font-size:1.05rem;font-weight:800;color:#15161b}
    .vente-empty{background:#fff;border:1px solid #ececec;border-radius:16px;padding:2.5rem 1.5rem;text-align:center;color:#666}
    .vente-empty a{color:#ff7a00;font-weight:700}
    @media(max-width:560px){ .vente-head h1{font-size:1.35rem} .vente-grid{grid-template-columns:1fr 1fr;gap:.8rem} .vc-title{font-size:.9rem} }
  </style>
</head>
<body>
  <header></header>

  <main class="vente-wrap">
    <nav class="vente-crumb" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <span>À vendre · Dossier complet</span></nav>

    <div class="vente-head">
      <h1>Biens à vendre à Douala — Dossier complet</h1>
      <p>${esc(desc)}</p>
    </div>

    ${count
      ? `<div class="vente-grid">\n      ${cards}\n    </div>`
      : `<div class="vente-empty">Aucun bien en dossier complet publié pour le moment.<br>Découvrez en attendant <a href="/annonces">toutes nos annonces</a>.</div>`}
  </main>

  <footer></footer>

  <script src="/assets/js/supabase.js" defer></script>
  <script src="/assets/js/config.js" defer></script>
  <script src="/assets/js/nav.js" defer></script>
  <script src="/assets/js/footer.js" defer></script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
    body,
  };
};
