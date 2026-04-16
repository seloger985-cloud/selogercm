/**
 * Netlify Function — og-listing.js
 * Gère /annonce?id=UUID pour tous les visiteurs :
 * - Bot social (Facebook, WhatsApp...) → Prerender.io (exécute le JS, retourne vraies OG)
 * - Humain → redirige vers listing_detail.html
 */

const PRERENDER_TOKEN = 'EBhUM6np0kVJWsmaEz3k';
const SITE_URL        = 'https://www.selogercm.com';

const BOT_AGENTS = [
  'facebookexternalhit', 'facebot',
  'twitterbot', 'linkedinbot', 'whatsapp',
  'telegrambot', 'slackbot', 'googlebot',
  'bingbot', 'applebot', 'redditbot',
  'pinterest', 'vkshare', 'w3c_validator',
];

function isBot(userAgent = '') {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some(b => ua.includes(b));
}

exports.handler = async function(event) {
  const userAgent = event.headers['user-agent'] || '';
  const params    = event.queryStringParameters || {};
  const id        = params.id || '';

  /* Pas d'ID → /annonces */
  if (!id) {
    return {
      statusCode: 302,
      headers: { Location: `${SITE_URL}/annonces` },
      body: '',
    };
  }

  /* Humain → listing_detail.html directement */
  if (!isBot(userAgent)) {
    return {
      statusCode: 302,
      headers: {
        Location: `${SITE_URL}/listing_detail.html?id=${id}`,
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  }

  /* Bot → Prerender.io qui exécute le JS et retourne les vraies balises OG */
  try {
    const targetUrl   = `${SITE_URL}/listing_detail.html?id=${id}`;
    const prerenderUrl = `https://service.prerender.io/${targetUrl}`;

    const response = await fetch(prerenderUrl, {
      headers: {
        'X-Prerender-Token': PRERENDER_TOKEN,
        'User-Agent': userAgent,
      },
    });

    const html = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
      body: html,
    };

  } catch (err) {
    console.error('Prerender error:', err);
    /* Fallback si Prerender échoue */
    return {
      statusCode: 302,
      headers: { Location: `${SITE_URL}/listing_detail.html?id=${id}` },
      body: '',
    };
  }
};
