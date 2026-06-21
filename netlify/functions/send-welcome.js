/**
 * Netlify Function — send-welcome.js
 * Envoie l'email de bienvenue à un nouvel annonceur (déclenché à sa 1ère publication).
 * Envoi via Zoho SMTP (nodemailer) — aucun template externe, aucun plafond EmailJS.
 *
 * Appel : POST /.netlify/functions/send-welcome   body { email, name }
 *
 * Variables d'environnement Netlify requises :
 *   ZOHO_USER        → adresse d'envoi (ex: contact@selogercm.com)  [REQUIS]
 *   ZOHO_PASS        → mot de passe d'application Zoho (PAS le mot de passe du compte)  [REQUIS]
 * Optionnelles :
 *   ZOHO_SMTP_HOST   → défaut "smtp.zoho.com" ; mettre "smtppro.zoho.com" si domaine perso payant
 *   ZOHO_SMTP_PORT   → défaut 465 (SSL) ; sinon 587 (TLS)
 *   WELCOME_FROM_NAME→ défaut "SE LOGER CM"
 */

const nodemailer = require('nodemailer');

const ZOHO_USER = process.env.ZOHO_USER || '';
const ZOHO_PASS = process.env.ZOHO_PASS || '';
const SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
const SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465);
const FROM_NAME = process.env.WELCOME_FROM_NAME || 'SE LOGER CM';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml(name) {
  const prenom = esc(name) || 'cher annonceur';
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#222222;max-width:560px">
  <p>Bonjour ${prenom},</p>
  <p>Bienvenue sur <b>SE LOGER CM</b> ! Votre compte est prêt : vous pouvez dès maintenant publier vos biens et les mettre devant des milliers de visiteurs à Douala.</p>
  <p><b>Pour démarrer du bon pied :</b></p>
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:15px;color:#222">
    <tr><td style="vertical-align:top;padding:0 8px 10px 0;color:#ff7a00;font-weight:bold">1.</td>
        <td style="padding-bottom:10px"><b>Vérifiez votre identité (KYC)</b> — rapide, et ça débloque la <b>visite vidéo</b> de vos annonces ainsi que le badge « profil vérifié » qui rassure les clients.</td></tr>
    <tr><td style="vertical-align:top;padding:0 8px 10px 0;color:#ff7a00;font-weight:bold">2.</td>
        <td style="padding-bottom:10px"><b>Publiez votre première annonce</b> — photos, description, localisation : quelques minutes suffisent.<br>
        <a href="https://selogercm.com/publish" style="color:#ff7a00;font-weight:bold;text-decoration:none">Publier un bien &rarr;</a></td></tr>
    <tr><td style="vertical-align:top;padding:0 8px 10px 0;color:#ff7a00;font-weight:bold">3.</td>
        <td style="padding-bottom:10px"><b>Gagnez en visibilité</b> — passez <b>Pro</b> ou activez un <b>boost</b> pour diffuser vos biens en <b>Réels</b> sur la page d'accueil, le format vidéo qui capte le plus l'attention.</td></tr>
  </table>
  <p>Vous pilotez tout depuis votre espace : <a href="https://selogercm.com/agent-dashboard" style="color:#ff7a00;font-weight:bold;text-decoration:none">votre tableau de bord</a>.</p>
  <p>Une question, un bien à mettre en avant ? Je suis joignable directement sur WhatsApp au <b>+237&nbsp;650&nbsp;840&nbsp;714</b>.</p>
  <p>Au plaisir de voir vos premières annonces en ligne.</p>
  <p style="margin-bottom:22px">Bien à vous,</p>
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
    <tr>
      <td style="vertical-align:middle;padding-right:18px">
        <img src="https://selogercm.com/assets/img/logo.png" alt="SE LOGER CM" width="68" height="68" style="display:block;border:0;border-radius:10px">
      </td>
      <td style="vertical-align:middle;border-left:3px solid #ff7a00;padding-left:18px">
        <div style="font-size:18px;font-weight:bold;color:#111111;letter-spacing:.3px">SE&nbsp;LOGER&nbsp;<span style="color:#ff7a00">CM</span></div>
        <div style="font-size:12px;color:#777777;font-style:italic;padding:3px 0 11px">Unique Solutions, Smart Living.</div>
        <div style="font-size:13px;line-height:1.85;color:#333333">
          <a href="tel:+237650840714" style="color:#333333;text-decoration:none">+237&nbsp;650&nbsp;840&nbsp;714</a>
          &nbsp;&nbsp;<span style="color:#dddddd">|</span>&nbsp;&nbsp;
          <a href="https://wa.me/237650840714" style="color:#333333;text-decoration:none">WhatsApp</a><br>
          <a href="https://selogercm.com" style="color:#ff7a00;text-decoration:none;font-weight:bold">selogercm.com</a>
          &nbsp;&nbsp;<span style="color:#dddddd">|</span>&nbsp;&nbsp;
          <a href="mailto:contact@selogercm.com" style="color:#333333;text-decoration:none">contact@selogercm.com</a>
        </div>
        <div style="font-size:12px;color:#999999;padding-top:7px">Bonamoussadi, Douala &mdash; Cameroun</div>
      </td>
    </tr>
  </table>
</div>`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!ZOHO_USER || !ZOHO_PASS) {
    console.warn('[welcome] ZOHO_USER / ZOHO_PASS non définis — envoi ignoré');
    return { statusCode: 200, body: 'skip: SMTP not configured' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  const email = String(body.email || '').trim();
  const name  = String(body.name  || '').trim();
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email manquant' }) };

  try {
    const transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: SMTP_PORT === 465,   // 465 = SSL implicite ; 587 = STARTTLS
      auth:   { user: ZOHO_USER, pass: ZOHO_PASS },
    });

    await transporter.sendMail({
      from:    `"${FROM_NAME}" <${ZOHO_USER}>`,   // doit correspondre à ZOHO_USER (sinon Zoho refuse)
      to:      email,
      subject: 'Bienvenue parmi les annonceurs SE LOGER CM',
      html:    buildHtml(name),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('[welcome] Erreur SMTP:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
