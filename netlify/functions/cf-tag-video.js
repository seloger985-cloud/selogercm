/**
 * Netlify Function — cf-tag-video.js
 * PATCH meta.section sur une vidéo CF Stream
 *
 * POST /.netlify/functions/cf-tag-video
 * Body : { uid: "...", section: "homepage-section-1" | "homepage-section-2" | "" }
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return { statusCode: 400, body: JSON.stringify({ error: 'CF credentials manquants' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { uid, section, _delete } = body;
  if (!uid) return { statusCode: 400, body: JSON.stringify({ error: 'uid manquant' }) };

  /* Suppression de la vidéo CF Stream */
  if (_delete) {
    try {
      const delRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
      );
      if (!delRes.ok) throw new Error(`DELETE error ${delRes.status}`);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true, uid, deleted: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  const allowed = ['homepage-section-1', 'homepage-section-2', ''];
  if (!allowed.includes(section)) return { statusCode: 400, body: JSON.stringify({ error: 'section invalide' }) };

  try {
    /* Récupérer les meta existantes */
    const getRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
      { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
    );
    if (!getRes.ok) throw new Error(`GET video error ${getRes.status}`);
    const existing = await getRes.json();
    const existingMeta = existing.result?.meta || {};

    /* Merger le champ section */
    const newMeta = { ...existingMeta };
    if (section) newMeta.section = section;
    else delete newMeta.section;

    /* PATCH */
    const patchRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
      {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ meta: newMeta }),
      }
    );
    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`PATCH error ${patchRes.status}: ${err.slice(0, 200)}`);
    }

    const result = await patchRes.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, uid, section, meta: result.result?.meta }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};