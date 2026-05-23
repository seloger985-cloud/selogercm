/**
 * Netlify Scheduled Function — cron-expire.js
 * Tourne tous les jours à 2h du matin (UTC).
 * Passe en status='expired' toutes les annonces actives dont expires_at est dépassé.
 *
 * IMPORTANT : la source de vérité pour la date d'expiration est la colonne
 * `expires_at` (et non `created_at + 30j`), parce que :
 *   - les annonces premium peuvent être prolongées (expires_at > created_at + 30j)
 *   - les annonces renouvelées ont expires_at réinitialisé
 *   - la RLS masque déjà publiquement les annonces avec expires_at < now()
 * Aligner la cron sur expires_at garantit que admin et public voient la même chose.
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
    const now = new Date().toISOString();

    /* Cible : annonces actives dont la date d'expiration est dépassée.
       On exclut les NULL pour ne pas expirer des annonces sans expires_at défini
       (cas legacy ou annonces permanentes éventuelles). */
    const url =
      `${SUPABASE_URL}/rest/v1/listings` +
      `?status=eq.active` +
      `&expires_at=not.is.null` +
      `&expires_at=lt.${encodeURIComponent(now)}`;

    const res = await fetch(url, {
      method:  'PATCH',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({ status: 'expired' }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[cron-expire] Supabase error:', res.status, err);
      return { statusCode: 500, body: err };
    }

    const expired = await res.json();
    console.log(`[cron-expire] ${expired.length} annonce(s) basculée(s) en expired (cutoff=${now})`);
    return { statusCode: 200, body: `ok: ${expired.length} expired` };

  } catch (err) {
    console.error('[cron-expire] Erreur:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
