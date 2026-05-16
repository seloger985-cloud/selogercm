/**
 * Netlify Scheduled Function — cron-expire.js
 * Tourne tous les jours à 2h du matin (UTC).
 * Passe en status='expired' toutes les annonces actives depuis plus de 30 jours.
 *
 * Variables d'environnement :
 *   SB_SERVICE_KEY  → Supabase service_role (bypass RLS)
 *   SUPABASE_URL    → URL Supabase
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY  = process.env.SB_SERVICE_KEY || '';

exports.handler = async function () {
  if (!SERVICE_KEY) {
    console.warn('[cron-expire] SB_SERVICE_KEY manquant');
    return { statusCode: 200, body: 'skip: no service key' };
  }

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    /* Expire les annonces actives depuis plus de 30 jours */
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?status=eq.active&created_at=lt.${cutoff}`,
      {
        method:  'PATCH',
        headers: {
          'apikey':        SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({ status: 'expired' }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[cron-expire] Supabase error:', err);
      return { statusCode: 500, body: err };
    }

    const expired = await res.json();
    console.log(`[cron-expire] ${expired.length} annonce(s) expirée(s)`);
    return { statusCode: 200, body: `ok: ${expired.length} expired` };

  } catch (err) {
    console.error('[cron-expire] Erreur:', err.message);
    return { statusCode: 500, body: err.message };
  }
};