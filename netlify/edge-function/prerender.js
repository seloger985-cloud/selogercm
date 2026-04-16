const PRERENDER_TOKEN = 'EBhUM6np0kVJWsmaEz3k';
const SITE_URL = 'https://www.selogercm.com';

const BOTS = [
  'facebookexternalhit','facebot','twitterbot','linkedinbot',
  'whatsapp','telegrambot','slackbot','googlebot','bingbot','applebot'
];

export default async function(request, context) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOTS.some(b => ua.includes(b));

  if (!isBot) return context.next();

  try {
    const url = request.url;
    const res = await fetch(`https://service.prerender.io/${url}`, {
      headers: { 'X-Prerender-Token': PRERENDER_TOKEN }
    });
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch(e) {
    return context.next();
  }
}

export const config = { path: '/annonce' };
