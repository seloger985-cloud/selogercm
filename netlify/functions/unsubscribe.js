/**
 * Netlify Function — unsubscribe.js
 * Désactive une alerte via son token unique.
 * URL : /.netlify/functions/unsubscribe?token=xxxx
 */

const SUPABASE_URL = process.env.SUPABASE_URL   || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY  = process.env.SB_SERVICE_KEY || '';

exports.handler = async function (event) {
  const token = event.queryStringParameters?.token;

  if (!SERVICE_KEY) {
    console.error('[unsubscribe] SB_SERVICE_KEY manquant');
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: '<p>Service temporairement indisponible. Réessayez plus tard.</p>',
    };
  }

  if (!token) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/html' },
      body: '<p>Lien invalide.</p>' };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_searches?token=eq.${encodeURIComponent(token)}`,
      {
        method:  'PATCH',
        headers: {
          'apikey':        SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ active: false }),
      }
    );

    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    return {
      statusCode: 200,
      headers:    { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
        <title>Désabonnement — SE LOGER CM</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f7f9}
        .box{background:#fff;border-radius:16px;padding:2.5rem 2rem;text-align:center;max-width:400px;box-shadow:0 8px 24px rgba(0,0,0,.08)}
        h1{font-size:1.3rem;color:#111}p{color:#666;margin:.75rem 0}a{color:#ff7a00;font-weight:700}</style>
        </head><body><div class="box">
        <p style="font-size:2rem">✅</p>
        <h1>Désabonnement confirmé</h1>
        <p>Vous ne recevrez plus d'alertes pour cette recherche.</p>
        <a href="/">Retour au site →</a>
        </div></body></html>`,
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/html' },
      body: `<p>Erreur : ${err.message}</p>` };
  }
};
