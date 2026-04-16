/**
 * notify.js — SE LOGER CM
 * Notifications EmailJS :
 *   - Clics WhatsApp : comptés localement, recap envoyé 1x/24h
 *   - Formulaire de contact : email immédiat
 */

(function () {

  const SERVICE_ID         = 'service_udg2825';
  const TEMPLATE_CONTACT   = 'template_7bwfdsa';
  const TEMPLATE_WHATSAPP  = 'template_uje7p22';
  const PUBLIC_KEY         = '-7BBiUvdS0GiAoTSZ';

  const WA_CLICKS_KEY    = 'selogercm_wa_clicks';
  const WA_LAST_SENT_KEY = 'selogercm_wa_last_sent';
  const WA_STATS_KEY     = 'selogercm_wa_stats';
  const WA_TOTAL_KEY     = 'selogercm_wa_total';
  const WA_HISTORY_KEY   = 'selogercm_wa_history';
  const WA_LAST_KEY      = 'selogercm_wa_last';

  /* ── Helpers localStorage ── */
  function loadWaClicks() {
    try { return JSON.parse(localStorage.getItem(WA_CLICKS_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function saveWaClicks(arr) {
    localStorage.setItem(WA_CLICKS_KEY, JSON.stringify(arr));
  }

  /* ── Mise à jour stats admin ── */
  function updateAdminStats(title, city, price) {
    const today = new Date().toLocaleDateString('fr-FR');

    // Compteur par jour
    let stats = {};
    try { stats = JSON.parse(localStorage.getItem(WA_STATS_KEY) || '{}'); } catch(e) {}
    stats[today] = (stats[today] || 0) + 1;
    localStorage.setItem(WA_STATS_KEY, JSON.stringify(stats));

    // Total cumulé
    const total = parseInt(localStorage.getItem(WA_TOTAL_KEY) || '0') + 1;
    localStorage.setItem(WA_TOTAL_KEY, String(total));

    // Dernier clic
    localStorage.setItem(WA_LAST_KEY, JSON.stringify({
      title, city, price, time: new Date().toLocaleString('fr-FR')
    }));

    // Historique des 30 derniers
    let history = [];
    try { history = JSON.parse(localStorage.getItem(WA_HISTORY_KEY) || '[]'); } catch(e) {}
    history.unshift({ title, city, price, time: new Date().toLocaleString('fr-FR') });
    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(WA_HISTORY_KEY, JSON.stringify(history));
  }

  /* ── Recap quotidien WhatsApp ── */
  function maybeSendDailyRecap(lastTitle, lastCity, lastPrice) {
    const lastSent = localStorage.getItem(WA_LAST_SENT_KEY);
    const now      = Date.now();
    const ONE_DAY  = 24 * 60 * 60 * 1000;

    if (lastSent && (now - parseInt(lastSent)) < ONE_DAY) return; // déjà envoyé aujourd'hui

    const clicks = loadWaClicks();
    if (clicks.length === 0) return;

    if (typeof emailjs === 'undefined') return;

    const lines = clicks.map((c, i) =>
      `${i + 1}. ${c.title} — ${c.city} — ${c.price} (${c.time})`
    ).join('\n');

    emailjs.send(SERVICE_ID, TEMPLATE_WHATSAPP, {
      listing_title : lastTitle,
      listing_city  : lastCity,
      listing_price : lastPrice,
      total_clicks  : clicks.length,
      clicks_detail : lines,
      time          : new Date().toLocaleString('fr-FR'),
    })
    .then(() => {
      saveWaClicks([]); // vider la liste après envoi
      localStorage.setItem(WA_LAST_SENT_KEY, String(Date.now()));
    })
    .catch(err => console.error('[SE LOGER CM] EmailJS WhatsApp error:', err));
  }

  /* ══════════════════════════════════════
     API PUBLIQUE
  ══════════════════════════════════════ */

  /**
   * Appeler quand quelqu'un clique sur WhatsApp
   * @param {string} title  - Titre de l'annonce
   * @param {string} city   - Ville
   * @param {string} price  - Prix formaté
   */
  function onWhatsAppClick(title, city, price) {
    if (!title) return;

    // 1. Stocker le clic
    const clicks = loadWaClicks();
    clicks.push({ title, city, price, time: new Date().toLocaleString('fr-FR') });
    saveWaClicks(clicks);

    // 2. Mettre à jour les stats admin (dashboard)
    updateAdminStats(title, city, price);

    // 3. Envoyer le recap si 24h écoulées
    maybeSendDailyRecap(title, city, price);
  }

  /**
   * Appeler à la soumission du formulaire de contact
   * @param {string}   name     - Nom de l'expéditeur
   * @param {string}   email    - Email de l'expéditeur
   * @param {string}   message  - Message
   * @param {Function} callback - (success: bool) => void
   */
  function onContactFormSubmit(name, email, message, callback) {
    if (typeof emailjs === 'undefined') {
      if (callback) callback(false);
      return;
    }

    emailjs.send(SERVICE_ID, TEMPLATE_CONTACT, {
      from_name  : name    || 'Anonymous',
      from_email : email   || '—',
      message    : message || '—',
      time       : new Date().toLocaleString('fr-FR'),
    })
    .then(() => { if (callback) callback(true); })
    .catch(err => {
      console.error('[SE LOGER CM] EmailJS contact error:', err);
      if (callback) callback(false);
    });
  }

  /* ── Init EmailJS ── */
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof emailjs !== 'undefined') {
        emailjs.init(PUBLIC_KEY);
      }
    }, 300);
  });

  /**
   * Appeler après publication d'une nouvelle annonce
   * @param {object} listing - { title, city, district, type, price, ref, mode }
   * @param {object} user    - { name, email }
   */
  function onNewListing(listing, user) {
    if (typeof emailjs === 'undefined') return;
    emailjs.send(SERVICE_ID, TEMPLATE_CONTACT, {
      from_name  : `📢 Nouvelle annonce — ${listing.ref || ''}`,
      from_email : user?.email || 'non renseigné',
      message    : [
        `Titre     : ${listing.title || '—'}`,
        `Type      : ${listing.type  || '—'}`,
        `Mode      : ${listing.mode  || '—'}`,
        `Ville     : ${listing.city  || '—'}`,
        `Quartier  : ${listing.district || '—'}`,
        `Prix      : ${listing.price || '—'} FCFA`,
        `Réf       : ${listing.ref   || '—'}`,
        `Publiée par : ${user?.name || user?.email || 'inconnu'}`,
      ].join('\n'),
      time : new Date().toLocaleString('fr-FR'),
    })
    .catch(err => console.error('[SE LOGER CM] EmailJS listing error:', err));
  }

  /**
   * Appeler après inscription d'un nouvel utilisateur
   * @param {object} user - { name, email, phone, role }
   */
  function onNewSignup(user) {
    if (typeof emailjs === 'undefined') return;
    emailjs.send(SERVICE_ID, TEMPLATE_CONTACT, {
      from_name  : `🆕 Nouvelle inscription — ${user?.role || 'user'}`,
      from_email : user?.email || 'non renseigné',
      message    : [
        `Nom       : ${user?.name  || '—'}`,
        `Email     : ${user?.email || '—'}`,
        `Téléphone : ${user?.phone || '—'}`,
        `Rôle      : ${user?.role  || '—'}`,
      ].join('\n'),
      time : new Date().toLocaleString('fr-FR'),
    })
    .catch(err => console.error('[SE LOGER CM] EmailJS signup error:', err));
  }

  /**
   * Envoyer confirmation de publication à l'annonceur
   * @param {object} listing - { title, city, district, type, price, ref, mode }
   * @param {object} user    - { name, email }
   */
  function onListingConfirmation(listing, user) {
    if (!user?.email || typeof emailjs === 'undefined') return;
    emailjs.send(SERVICE_ID, TEMPLATE_CONTACT, {
      from_name  : `✅ Votre annonce est en ligne — ${listing.ref || ''}`,
      from_email : user.email,
      message    : [
        `Bonjour ${user.name || ''},`,
        ``,
        `Votre annonce a été publiée avec succès sur SE LOGER CM !`,
        ``,
        `📋 Détails de votre annonce :`,
        `Titre     : ${listing.title || '—'}`,
        `Type      : ${listing.type  || '—'}`,
        `Mode      : ${listing.mode  || '—'}`,
        `Ville     : ${listing.city  || '—'}`,
        `Quartier  : ${listing.district || '—'}`,
        `Prix      : ${listing.price || '—'} FCFA`,
        `Réf       : ${listing.ref   || '—'}`,
        ``,
        `🔗 Voir votre annonce : https://selogercm.com/annonce?id=${listing.id || ''}`,
        ``,
        `Pour booster la visibilité de votre annonce, visitez : https://selogercm.com/tarifs`,
        ``,
        `L'équipe SE LOGER CM`,
      ].join('\n'),
      time : new Date().toLocaleString('fr-FR'),
    })
    .catch(err => console.error('[SE LOGER CM] EmailJS confirmation error:', err));
  }

  window.SLCM_notify = { onWhatsAppClick, onContactFormSubmit, onNewListing, onNewSignup, onListingConfirmation };

})();
