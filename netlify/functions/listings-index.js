/**
 * Netlify Function — listings-index.js
 * Page "annuaire" HTML rendue côté serveur : liste TOUTES les annonces actives
 * en vrais liens <a href>, groupées par quartier.
 * Rôle SEO : hub de maillage interne → donne à chaque fiche orpheline un lien
 * explorable, ce qui débloque le statut « Détectée, actuellement non indexée ».
 *
 * Brancher via une réécriture (netlify.toml ou _redirects) :
 *   /toutes-les-annonces   /.netlify/functions/listings-index   200
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY       = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SITE         = 'https://selogercm.com';
const CANONICAL    = `${SITE}/toutes-les-annonces`;
const CACHE_TIME   = 3600; /* 1h, revalidation en arrière-plan 24h */

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
const fmt = n => (Number(n) || 0).toLocaleString('fr-FR');

const TYPE_LABELS = {
  apartment: 'Appartement', studio: 'Studio', house: 'Maison', villa: 'Villa',
  duplex: 'Duplex', office: 'Bureau', shop: 'Local commercial',
  'fonds-commerce': 'Fonds de commerce', 'plots-of-land': 'Terrain', warehouse: 'Entrepôt',
  building: 'Immeuble',
};

exports.handler = async function () {
  try {
    const url = `${SUPABASE_URL}/rest/v1/listings`
      + `?select=slug,title,district,city,price,type,rent_sale`
      + `&status=eq.active`
      + `&order=district.asc,created_at.desc`
      + `&limit=50000`;

    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = await res.json();

    /* Dédoublonner par slug, regrouper par quartier */
    const seen = new Set();
    const byDistrict = new Map();
    let total = 0;
    for (const l of (rows || [])) {
      const s = (l.slug || '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      const d = (l.district || 'Autres quartiers').trim() || 'Autres quartiers';
      if (!byDistrict.has(d)) byDistrict.set(d, []);
      byDistrict.get(d).push(l);
      total++;
    }
    /* Quartiers triés par nombre d'annonces décroissant */
    const districts = [...byDistrict.entries()].sort((a, b) => b[1].length - a[1].length);

    const sections = districts.map(([d, items]) => {
      const li = items.map(l => {
        const t = esc(l.title || 'Annonce immobilière');
        const meta = `${TYPE_LABELS[l.type] || ''}${l.type ? ' · ' : ''}${fmt(l.price)} FCFA${l.rent_sale === 'sale' ? ' (vente)' : '/mois'}`;
        return `        <li><a href="${SITE}/annonce/${encodeURIComponent(l.slug.trim())}">${t}</a> <span class="m">— ${esc(meta)}</span></li>`;
      }).join('\n');
      return `    <section>
      <h2>${esc(d)} <span class="count">(${items.length})</span></h2>
      <ul>
${li}
      </ul>
    </section>`;
    }).join('\n');

    const body = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Toutes les annonces immobilières à Douala (${total}) | SE LOGER CM</title>
<meta name="description" content="Annuaire complet des ${total} annonces immobilières à louer et à vendre à Douala : appartements, studios, villas, terrains, classés par quartier. SE LOGER CM.">
<link rel="canonical" href="${CANONICAL}">
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2426;max-width:1000px;margin:0 auto;padding:1.2rem;line-height:1.5}
  h1{font-size:1.6rem;margin:.2rem 0 .4rem}
  .lead{color:#555;margin-bottom:1.2rem}
  .quartiers{margin:1rem 0;font-size:.9rem;line-height:1.9}
  .quartiers a{color:#c25e00;text-decoration:none;margin-right:.6rem}
  section{margin:1.4rem 0;border-top:1px solid #eee;padding-top:.7rem}
  h2{font-size:1.12rem;margin:0 0 .5rem}
  h2 .count{color:#999;font-weight:400;font-size:.9rem}
  ul{list-style:none;padding:0;margin:0;display:grid;gap:.4rem}
  li a{color:#111;text-decoration:none;font-weight:600}
  li a:hover{color:#ff7a00}
  li .m{color:#888;font-size:.86rem}
  .top a{color:#c25e00;text-decoration:none}
</style>
</head><body>
  <h1>Toutes les annonces immobilières à Douala</h1>
  <p class="lead">${total} annonces actives à louer et à vendre, classées par quartier. Cliquez sur une annonce pour voir la fiche complète : photos, vidéo, prix et contact.</p>
  <nav class="quartiers" aria-label="Recherches populaires">
    <a href="/annonces">Recherche avancée</a>
    <a href="/appartements-bonapriso">Appartements Bonapriso</a>
    <a href="/appartements-bonamoussadi">Appartements Bonamoussadi</a>
    <a href="/studios-bonapriso">Studios Bonapriso</a>
    <a href="/villas-a-louer-douala">Villas à louer</a>
    <a href="/appartements-meubles-douala">Appartements meublés</a>
  </nav>
${sections}
  <p class="top" style="margin-top:2rem"><a href="/">← Retour à l'accueil</a></p>
</body></html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TIME}, stale-while-revalidate=86400`,
      },
      body,
    };
  } catch (err) {
    console.error('listings-index error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: `listings-index error: ${err.message}`,
    };
  }
};
