/**
 * Netlify Scheduled Function — cron-cleanup.js
 * Tourne chaque dimanche à 3h du matin (UTC).
 * Supprime les images orphelines du bucket listing-images
 * (images dont le listing a été supprimé).
 *
 * Variables d'environnement :
 *   SB_SERVICE_KEY  → Supabase service_role (bypass RLS)
 *   SUPABASE_URL    → URL Supabase
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SERVICE_KEY  = process.env.SB_SERVICE_KEY || '';
const BUCKET       = 'listing-images';

function sbHeaders() {
  return {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
  };
}

exports.handler = async function () {
  if (!SERVICE_KEY) {
    console.warn('[cron-cleanup] SB_SERVICE_KEY manquant');
    return { statusCode: 200, body: 'skip: no service key' };
  }

  try {
    /* 1. Lister tous les dossiers du bucket (listing_id = nom du dossier) */
    const listRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
      {
        method:  'POST',
        headers: sbHeaders(),
        body:    JSON.stringify({ prefix: 'listings/', limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
      }
    );

    if (!listRes.ok) throw new Error(`Storage list error: ${listRes.status}`);
    const files = await listRes.json();

    /* 2. Extraire les listing IDs uniques depuis les chemins listings/{id}/... */
    const uuidRe = /^listings\/([0-9a-f-]{36})\//;
    const idsInStorage = [...new Set(
      (files || []).map(f => f.name?.match(uuidRe)?.[1]).filter(Boolean)
    )];

    if (!idsInStorage.length) {
      return { statusCode: 200, body: 'ok: nothing to clean' };
    }

    /* 3. Vérifier quels listings existent encore en base */
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?id=in.(${idsInStorage.join(',')})&select=id`,
      { headers: sbHeaders() }
    );
    if (!checkRes.ok) throw new Error(`Listings check error: ${checkRes.status}`);
    const existing = await checkRes.json();
    const existingIds = new Set(existing.map(l => l.id));

    /* 4. Identifier les dossiers orphelins */
    const orphanIds = idsInStorage.filter(id => !existingIds.has(id));
    if (!orphanIds.length) {
      console.log('[cron-cleanup] Aucun orphelin trouvé');
      return { statusCode: 200, body: 'ok: no orphans' };
    }

    /* 5. Collecter les fichiers orphelins à supprimer */
    const toDelete = (files || [])
      .filter(f => {
        const id = f.name?.match(uuidRe)?.[1];
        return id && orphanIds.includes(id);
      })
      .map(f => f.name);

    if (!toDelete.length) {
      return { statusCode: 200, body: 'ok: no files to delete' };
    }

    /* 6. Supprimer par batch de 100 */
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const delRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}`,
        {
          method:  'DELETE',
          headers: sbHeaders(),
          body:    JSON.stringify({ prefixes: batch }),
        }
      );
      if (delRes.ok) deleted += batch.length;
    }

    console.log(`[cron-cleanup] ${deleted} fichier(s) orphelin(s) supprimé(s) (${orphanIds.length} listing(s) inexistants)`);
    return { statusCode: 200, body: `ok: ${deleted} files deleted` };

  } catch (err) {
    console.error('[cron-cleanup] Erreur:', err.message);
    return { statusCode: 500, body: err.message };
  }
};