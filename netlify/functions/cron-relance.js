/**
 * Netlify Scheduled Function — cron-relance.js
 * Tourne tous les jours à 8h du matin (UTC).
 * Envoie un email de relance aux agents dont une annonce expire dans 7 jours.
 *
 * Variables d'environnement :
 *   SB_SERVICE_KEY      → Supabase service_role (bypass RLS)
 *   SUPABASE_URL        → URL Supabase
 *   EMAILJS_RELANCE_TPL → ID template EmailJS relance (ex: template_xxxxxxx)
 *
 * Template EmailJS variables :
 *   {{to_email}}, {{listing_title}}, {{listing_url}},
 *   {{days_left}}, {{price}}, {{location}}
 */

const SUPABASE_URL  = process.env.SUPABASE_URL        || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY   = process.env.SB_SERVICE_KEY       || '';
const EMAILJS_SVC   = 'service_udg2825';
const EMAILJS_TPL   = process.env.EMAILJS_RELANCE_TPL  || '';
const EMAILJS_KEY   = '-7BBiUvdS0GiAoTSZ';
const SITE_URL      = 'https://www.selogercm.com';
const DAYS_BEFORE   = 7;

function sbHeaders() {
  return {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };
}

function fmtPrice(n) {
  return n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '';
}

async function getOwnerEmail(userId) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: sbHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

async function sendRelance(toEmail, listing) {
  if (!EMAILJS_TPL) { console.warn('[cron-relance] EMAILJS_RELANCE_TPL non défini'); return false; }

  const location = [listing.district, listing.city].filter(Boolean).join(', ');
  const url = listing.slug
    ? `${SITE_URL}/annonce/${listing.slug}`
    : `${SITE_URL}/annonce?id=${listing.id}`;

  const body = {
    service_id:  EMAILJS_SVC,
    template_id: EMAILJS_TPL,
    user_id:     EMAILJS_KEY,
    template_params: {
      to_email:      toEmail,
      listing_title: listing.title || 'Votre annonce',
      listing_url:   url,
      days_left:     String(DAYS_BEFORE),
      price:         fmtPrice(listing.price),
      location,
    },
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('[cron-relance] EmailJS error:', res.status, await res.text());
    return false;
  }
  return true;
}

exports.handler = async function () {
  if (!SERVICE_KEY) {
    console.warn('[cron-relance] SB_SERVICE_KEY manquant');
    return { statusCode: 200, body: 'skip: no service key' };
  }

  try {
    /* Annonces actives créées il y a exactement 23 jours (expireront dans 7j) */
    const from = new Date(Date.now() - (30 - DAYS_BEFORE + 1) * 24 * 60 * 60 * 1000).toISOString();
    const to   = new Date(Date.now() - (30 - DAYS_BEFORE)     * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?status=eq.active&created_at=gte.${from}&created_at=lt.${to}&select=id,title,price,district,city,slug,owner_id`,
      { headers: sbHeaders() }
    );

    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const listings = await res.json();

    console.log(`[cron-relance] ${listings.length} annonce(s) à relancer`);
    let sent = 0;

    for (const listing of listings) {
      try {
        const email = await getOwnerEmail(listing.owner_id);
        if (!email) { console.warn('[cron-relance] Email introuvable pour', listing.owner_id); continue; }
        const ok = await sendRelance(email, listing);
        if (ok) sent++;
      } catch (err) {
        console.error('[cron-relance] Erreur listing', listing.id, err.message);
      }
    }

    console.log(`[cron-relance] ${sent} email(s) envoyé(s)`);
    return { statusCode: 200, body: `ok: ${sent} sent` };

  } catch (err) {
    console.error('[cron-relance] Erreur globale:', err.message);
    return { statusCode: 500, body: err.message };
  }
};