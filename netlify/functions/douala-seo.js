/* ════════════════════════════════════════════════════════════════════════
   douala-seo.js — Sert /douala (et /douala.html) avec la section
   « Dossier complet » rendue CÔTÉ SERVEUR : les liens « Villa à vendre à
   Bonapriso » sont dans le HTML brut, donc crawlables sans JavaScript.

   Lit douala.html comme template (via included_files), interroge Supabase
   pour les biens dossier-complet en vente, injecte les liens dans le
   placeholder et rend la section visible. Le script JS d'origine reste en
   place comme repli si la requête serveur échoue.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    + `&select=slug,id,type,district&order=created_at.desc&limit=12`;
  return (await sbGet(url)) || [];
}

function readTemplate() {
  const candidates = [
    path.join(__dirname, 'douala.html'),
    path.join(__dirname, '../../douala.html'),
    path.join(process.cwd(), 'douala.html'),
  ];
  for (const p of candidates) {
    try { return fs.readFileSync(p, 'utf8'); } catch (_) { /* essai suivant */ }
  }
  return null;
}

exports.handler = async function () {
  let html = readTemplate();
  if (!html) {
    /* Template introuvable : repli vers l'accueil plutôt qu'une 500 */
    return { statusCode: 302, headers: { Location: '/' }, body: '' };
  }

  let rows = [];
  try { rows = await fetchDossierSales(); } catch (_) { rows = []; }

  if (rows.length) {
    const links = rows.map(l => {
      const ref = l.slug || l.id;
      const t = TYPE_FR[l.type] || (l.type ? l.type.charAt(0).toUpperCase() + l.type.slice(1) : 'Bien');
      const label = t + ' à vendre' + (l.district ? ' à ' + l.district : '');
      return `<a href="/vente/${esc(ref)}" style="display:inline-block;font-size:.83rem;font-weight:600;color:#15161b;background:#fff;border:1px solid #e7d9c2;border-radius:999px;padding:.42rem .9rem;text-decoration:none">${esc(label)}</a>`;
    }).join('');

    /* Injecte les liens dans le placeholder + rend la section visible (retire display:none) */
    html = html.replace(
      '<div id="dossierDoualaLinks" style="display:flex;flex-wrap:wrap;gap:.5rem .7rem"></div>',
      `<div id="dossierDoualaLinks" style="display:flex;flex-wrap:wrap;gap:.5rem .7rem">${links}</div>`
    );
    html = html.replace(
      'id="dossierDoualaSection" style="margin-top:3rem;display:none"',
      'id="dossierDoualaSection" style="margin-top:3rem"'
    );
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
    },
    body: html,
  };
};
