/**
 * SE LOGER CM — Netlify Function : WhatsApp Notifications via Twilio
 *
 * Variables d'environnement à configurer dans Netlify > Site settings > Env vars :
 *   TWILIO_ACCOUNT_SID   → votre Account SID Twilio (commence par AC...)
 *   TWILIO_AUTH_TOKEN    → votre Auth Token Twilio
 *   TWILIO_WA_FROM       → votre numéro Twilio WhatsApp ex: whatsapp:+14155238886
 *   TWILIO_WA_TO         → numéro SE LOGER CM ex: whatsapp:+237650840714
 *
 * Endpoint POST /.netlify/functions/whatsapp-notify
 * Body JSON attendu :
 *   { type, name, email, phone, message, listing_title?, listing_url?, date?, time? }
 */

const TEMPLATES = {
  contact: ({ name, email, message }) =>
    `📩 *Nouveau message contact — SE LOGER CM*\n\n👤 *Nom :* ${name || 'Non renseigné'}\n📧 *Email :* ${email}\n💬 *Message :*\n${message}`,

  rdv: ({ name, phone, date, time, listing_title }) =>
    `📅 *Nouveau RDV — SE LOGER CM*\n\n👤 *Nom :* ${name}\n📞 *Tél :* ${phone || 'Non renseigné'}\n🏠 *Bien :* ${listing_title || 'Non précisé'}\n📆 *Date :* ${date} à ${time}`,

  new_listing: ({ listing_title, listing_url, name }) =>
    `🏠 *Nouvelle annonce publiée — SE LOGER CM*\n\n📋 *Titre :* ${listing_title}\n👤 *Publiée par :* ${name}\n🔗 *Voir l'annonce :* ${listing_url}`,

  favorite: ({ name, listing_title, listing_url }) =>
    `❤️ *Annonce ajoutée aux favoris*\n\n👤 *Utilisateur :* ${name}\n🏠 *Annonce :* ${listing_title}\n🔗 ${listing_url}`,
};

exports.handler = async (event) => {
  /* CORS preflight */
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://www.selogercm.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  /* Variables d'environnement */
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WA_FROM,
    TWILIO_WA_TO,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WA_FROM || !TWILIO_WA_TO) {
    console.error('[whatsapp-notify] Variables Twilio manquantes');
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration Twilio incomplète' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps JSON invalide' }) };
  }

  const { type } = payload;
  if (!type || !TEMPLATES[type]) {
    return { statusCode: 400, body: JSON.stringify({ error: `Type inconnu : ${type}` }) };
  }

  /* Construire le message */
  const body = TEMPLATES[type](payload);

  /* Appel API Twilio */
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ From: TWILIO_WA_FROM, To: TWILIO_WA_TO, Body: body });
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[whatsapp-notify] Twilio error:', result);
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': 'https://www.selogercm.com' },
        body: JSON.stringify({ error: result.message || 'Erreur Twilio' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': 'https://www.selogercm.com' },
      body: JSON.stringify({ success: true, sid: result.sid }),
    };
  } catch (err) {
    console.error('[whatsapp-notify] Fetch error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://www.selogercm.com' },
      body: JSON.stringify({ error: 'Erreur réseau' }),
    };
  }
};
