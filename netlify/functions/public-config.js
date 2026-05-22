/**
 * Netlify Function — public-config.js
 * Expose la clé anon Supabase au front (publique par design) sans la committer dans Git.
 *
 * Variables Netlify : SB_ANON_KEY (ou SUPABASE_ANON_KEY), SUPABASE_URL
 */

exports.handler = async function () {
  const url = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
  const anonKey = process.env.SB_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!anonKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'SB_ANON_KEY manquante dans Netlify' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type':                'application/json; charset=utf-8',
      'Cache-Control':               'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ url, anonKey }),
  };
};
