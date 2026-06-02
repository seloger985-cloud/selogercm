/**
 * Netlify Function — sms-otp.js
 * Envoi et vérification d'OTP par SMS via Africa's Talking
 *
 * POST /.netlify/functions/sms-otp
 * Actions :
 *   { action: 'send',   phone: '+237XXXXXXXXX' }
 *   { action: 'verify', phone: '+237XXXXXXXXX', code: '123456' }
 *
 * Variables d'environnement Netlify :
 *   AT_API_KEY      → clé API Africa's Talking (app selogercm)
 *   AT_USERNAME     → username AT (SLCM en prod, sandbox en test)
 *   SB_SERVICE_KEY  → Supabase service_role key
 *   SUPABASE_URL    → URL Supabase
 */

const AT_USERNAME  = process.env.AT_USERNAME  || 'sandbox';
const AT_API_KEY   = process.env.AT_API_KEY   || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hozlyddiqodvjguqywty.supabase.co';
const SB_KEY       = process.env.SB_SERVICE_KEY || '';

const OTP_EXPIRY_MIN = 10;
const AT_ENDPOINT = AT_USERNAME === 'sandbox'
  ? 'https://api.sandbox.africastalking.com/version1/messaging'
  : 'https://api.africastalking.com/version1/messaging';

function sbHeaders() {
  return { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSMS(to, code) {
  const params = new URLSearchParams({
    username: AT_USERNAME,
    to,
    message: `SE LOGER CM\n\nVotre code de verification : ${code}\n\nValable ${OTP_EXPIRY_MIN} minutes. Ne le partagez pas.`,
  });

  const res = await fetch(AT_ENDPOINT, {
    method:  'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'apiKey':       AT_API_KEY,
    },
    body: params.toString(),
  });

  const data = await res.json();
  const recipient = data?.SMSMessageData?.Recipients?.[0];

  if (!recipient || (recipient.statusCode !== 101 && recipient.status !== 'Success')) {
    throw new Error(`AT SMS error: ${recipient?.status || JSON.stringify(data)}`);
  }
}

async function storeCode(phone, code) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?phone=eq.${encodeURIComponent(phone)}`,
    { method: 'DELETE', headers: sbHeaders() });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/otp_codes`, {
    method:  'POST',
    headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
    body:    JSON.stringify({ phone, code, expires_at: expiresAt }),
  });
  if (!res.ok) throw new Error('Erreur stockage OTP');
}

async function verifyCode(phone, code) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/otp_codes?phone=eq.${encodeURIComponent(phone)}&code=eq.${code}&used=eq.false&expires_at=gte.${new Date().toISOString()}&select=id`,
    { headers: sbHeaders() }
  );
  const rows = await res.json();
  if (!rows?.length) return false;
  await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?id=eq.${rows[0].id}`,
    { method: 'PATCH', headers: { ...sbHeaders(), 'Prefer': 'return=minimal' }, body: JSON.stringify({ used: true }) });
  return true;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SB_KEY)     return { statusCode: 503, body: JSON.stringify({ error: 'Service OTP non configuré' }) };
  if (!AT_API_KEY) return { statusCode: 503, body: JSON.stringify({ error: 'Clé API SMS manquante' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { action, phone, code } = body;
  if (!phone) return { statusCode: 400, body: JSON.stringify({ error: 'Numéro manquant' }) };

  try {
    if (action === 'send') {
      const otp = generateCode();
      await storeCode(phone, otp);
      await sendSMS(phone, otp);
      return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Code SMS envoyé' }) };
    }

    if (action === 'verify') {
      if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Code manquant' }) };
      const valid = await verifyCode(phone, code);
      if (!valid) return { statusCode: 400, body: JSON.stringify({ error: 'Code incorrect ou expiré' }) };
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Action invalide' }) };

  } catch(err) {
    console.error('[sms-otp]', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
