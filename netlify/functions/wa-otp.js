/**
 * Netlify Function — wa-otp.js
 * Envoi et vérification d'OTP via WhatsApp Cloud API (Meta)
 *
 * POST /.netlify/functions/wa-otp
 * Actions :
 *   { action: 'send',   phone: '+237XXXXXXXXX' }
 *   { action: 'verify', phone: '+237XXXXXXXXX', code: '123456' }
 *
 * Variables d'environnement :
 *   WHATSAPP_PHONE_ID → Phone Number ID Meta
 *   WHATSAPP_TOKEN    → Bearer token (permanent recommandé)
 *   SB_SERVICE_KEY    → Supabase service_role
 *   SUPABASE_URL      → URL Supabase
 */

const PHONE_ID     = process.env.WHATSAPP_PHONE_ID;
const WA_TOKEN     = process.env.WHATSAPP_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL   || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY       = process.env.SB_SERVICE_KEY || '';

const OTP_EXPIRY_MIN = 10;

function sbHeaders() {
  return { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* Envoyer le code via WhatsApp Cloud API */
async function sendWhatsApp(to, code) {
  const url = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;

  /* Template Authentication (approbation rapide) — sinon fallback texte libre */
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name:     'selogercm_otp',
      language: { code: 'fr' },
      components: [{
        type: 'body',
        parameters: [{ type: 'text', text: code }]
      }, {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: code }]
      }]
    }
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  /* Si template non approuvé, fallback message texte (test) */
  if (!res.ok) {
    const errText = await res.text();
    /* Tenter message texte libre (ne marche que si le numéro est dans les contacts test) */
    const fallback = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: `SE LOGER CM\n\nVotre code de vérification est : *${code}*\n\nValable ${OTP_EXPIRY_MIN} minutes. Ne le partagez pas.` }
    };
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fallback),
    });
    if (!res2.ok) throw new Error(`WhatsApp API error: ${errText}`);
  }
}

/* Stocker le code dans Supabase */
async function storeCode(phone, code) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();
  /* Supprimer les anciens codes pour ce numéro */
  await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?phone=eq.${encodeURIComponent(phone)}`,
    { method: 'DELETE', headers: sbHeaders() });
  /* Insérer le nouveau */
  const res = await fetch(`${SUPABASE_URL}/rest/v1/otp_codes`, {
    method:  'POST',
    headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ phone, code, expires_at: expiresAt }),
  });
  if (!res.ok) throw new Error('Erreur stockage OTP');
}

/* Vérifier le code */
async function verifyCode(phone, code) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/otp_codes?phone=eq.${encodeURIComponent(phone)}&code=eq.${code}&used=eq.false&expires_at=gte.${new Date().toISOString()}&select=id`,
    { headers: sbHeaders() }
  );
  const rows = await res.json();
  if (!rows?.length) return false;
  /* Marquer comme utilisé */
  await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?id=eq.${rows[0].id}`,
    { method: 'PATCH', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ used: true }) });
  return true;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SB_KEY) {
    console.error('[wa-otp] SB_SERVICE_KEY manquant');
    return { statusCode: 503, body: JSON.stringify({ error: 'Service OTP non configuré' }) };
  }
  if (!PHONE_ID || !WA_TOKEN) return { statusCode: 400, body: JSON.stringify({ error: 'WhatsApp credentials manquants' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { action, phone, code } = body;
  if (!phone) return { statusCode: 400, body: JSON.stringify({ error: 'Numéro manquant' }) };

  try {
    if (action === 'send') {
      const otp = generateCode();
      await storeCode(phone, otp);
      await sendWhatsApp(phone, otp);
      return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Code envoyé sur WhatsApp' }) };
    }

    if (action === 'verify') {
      if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Code manquant' }) };
      const valid = await verifyCode(phone, code);
      if (!valid) return { statusCode: 400, body: JSON.stringify({ error: 'Code incorrect ou expiré' }) };
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Action invalide' }) };

  } catch (err) {
    console.error('[wa-otp]', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};