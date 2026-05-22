/**
 * Netlify Scheduled Function — send-alerts.js
 * Tourne toutes les 6h. Pour chaque recherche sauvegardée active,
 * vérifie s'il y a de nouvelles annonces matchantes et envoie un email.
 *
 * Variables d'environnement Netlify requises :
 *   SB_SERVICE_KEY        → Supabase service_role key (bypass RLS)
 *   EMAILJS_ALERT_TPL     → ID du template EmailJS "alertes" (ex: template_xxxxxxx)
 *
 * Variables déjà présentes :
 *   SUPABASE_URL          → URL Supabase
 *   SB_ANON_KEY           → clé anon (fallback)
 *
 * Template EmailJS à créer avec ces variables :
 *   {{to_email}}          → email du destinataire
 *   {{search_desc}}       → description lisible de la recherche
 *   {{count}}             → nombre de nouvelles annonces
 *   {{listings_preview}}  → aperçu texte des annonces (titre, prix, quartier)
 *   {{unsubscribe_url}}   → lien de désabonnement
 */

const SUPABASE_URL  = process.env.SUPABASE_URL    || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY   = process.env.SB_SERVICE_KEY  || '';
const ANON_KEY      = process.env.SB_ANON_KEY     || '';
const EMAILJS_SVC   = 'service_udg2825';
const EMAILJS_TPL   = process.env.EMAILJS_ALERT_TPL || '';
const EMAILJS_KEY   = '-7BBiUvdS0GiAoTSZ';
const SITE_URL      = 'https://selogercm.com';

/* ── Helpers ── */
function sbHeaders(useService = true) {
  const key = (useService && SERVICE_KEY) ? SERVICE_KEY : ANON_KEY;
  return { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function fmtPrice(n) {
  return n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '';
}

function buildSearchDesc(s) {
  const parts = [];
  if (s.mode)      parts.push(s.mode === 'rent' ? 'À louer' : 'À vendre');
  if (s.type)      parts.push(s.type);
  if (s.city)      parts.push(s.city);
  if (s.districts?.length) parts.push(s.districts.join(', '));
  if (s.bedrooms)  parts.push(s.bedrooms + ' chambre(s)');
  if (s.furnished === true)  parts.push('meublé');
  if (s.furnished === false) parts.push('non meublé');
  return parts.join(' · ') || 'Toutes annonces';
}

function buildPriceFilter(price) {
  const ranges = {
    '0-100k':    [0, 100000],    '100k-300k': [100000, 300000],
    '300k-600k': [300000, 600000], '600k+':   [600000, 999999999],
    '0-15m':     [0, 15000000],  '10m+':      [10000000, 999999999],
    '15m-50m':   [15000000, 50000000], '50m-100m': [50000000, 100000000],
    '100m+':     [100000000, 999999999],
  };
  return ranges[price] || null;
}

/* ── Requête Supabase via REST ── */
async function sbFetch(path, useService = true) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(useService) });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}`);
  return res.json();
}

/* ── Mise à jour last_notified_at ── */
async function updateNotified(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/saved_searches?id=eq.${id}`, {
    method:  'PATCH',
    headers: { ...sbHeaders(true), 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ last_notified_at: new Date().toISOString() }),
  });
}

/* ── Envoi email via EmailJS REST API ── */
async function sendEmail(to_email, search_desc, listings, token) {
  if (!EMAILJS_TPL) { console.warn('[alerts] EMAILJS_ALERT_TPL non défini'); return false; }

  const preview = listings.slice(0, 5).map(l =>
    `• ${l.title || 'Annonce'} — ${fmtPrice(l.price)} — ${l.district || l.city || ''}`
  ).join('\n');

  const body = {
    service_id:     EMAILJS_SVC,
    template_id:    EMAILJS_TPL,
    user_id:        EMAILJS_KEY,
    template_params: {
      to_email,
      search_desc,
      count:            String(listings.length),
      listings_preview: preview,
      unsubscribe_url:  `${SITE_URL}/.netlify/functions/unsubscribe?token=${token}`,
    },
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('[alerts] EmailJS error:', res.status, await res.text());
    return false;
  }
  return true;
}

/* ── Handler principal ── */
exports.handler = async function () {
  try {
    if (!SERVICE_KEY) { console.warn('[alerts] SB_SERVICE_KEY manquant'); return { statusCode: 200, body: 'skip: no service key' }; }

    /* 1. Charger toutes les recherches actives */
    const searches = await sbFetch(
      'saved_searches?active=eq.true&select=*&order=last_notified_at.asc&limit=200'
    );

    console.log(`[alerts] ${searches.length} recherches actives`);
    let sent = 0;

    for (const s of searches) {
      try {
        /* 2. Construire la requête listings */
        let qs = `status=eq.active&created_at=gt.${s.last_notified_at}&order=created_at.desc&limit=20&select=id,title,price,district,city,type,rent_sale`;
        if (s.mode)     qs += `&rent_sale=eq.${s.mode}`;
        if (s.city)     qs += `&city=eq.${encodeURIComponent(s.city)}`;
        if (s.type)     qs += `&type=eq.${encodeURIComponent(s.type)}`;
        if (s.bedrooms) qs += `&bedrooms=eq.${s.bedrooms}`;
        if (s.furnished !== null && s.furnished !== undefined)
          qs += `&furnished=eq.${s.furnished}`;
        if (s.districts?.length === 1) qs += `&district=eq.${encodeURIComponent(s.districts[0])}`;
        else if (s.districts?.length > 1)
          qs += `&district=in.(${s.districts.map(d => `"${d}"`).join(',')})`;

        let listings = await sbFetch(`listings?${qs}`, true);

        /* Filtre prix côté serveur si nécessaire */
        if (s.price && listings.length) {
          const range = buildPriceFilter(s.price);
          if (range) listings = listings.filter(l => l.price >= range[0] && l.price <= range[1]);
        }

        if (!listings.length) { await updateNotified(s.id); continue; }

        /* 3. Envoyer l'email */
        const desc = buildSearchDesc(s);
        const ok   = await sendEmail(s.email, desc, listings, s.token);
        if (ok) sent++;

        /* 4. Mettre à jour last_notified_at */
        await updateNotified(s.id);

      } catch (err) {
        console.error(`[alerts] Erreur pour ${s.email}:`, err.message);
      }
    }

    console.log(`[alerts] ${sent} email(s) envoyé(s)`);
    return { statusCode: 200, body: `ok: ${sent} sent` };

  } catch (err) {
    console.error('[alerts] Erreur globale:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
