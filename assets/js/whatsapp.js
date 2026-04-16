/**
 * SE LOGER CM — Module WhatsApp
 *
 * Deux modes :
 *   1. DIRECT   → ouvre wa.me avec un message pré-rempli (fonctionne sans API)
 *   2. API      → envoie une notification WhatsApp à l'équipe via la Netlify Function
 *
 * Usage :
 *   SLCM_WA.notify('contact', { name, email, message })
 *   SLCM_WA.notify('rdv',     { name, phone, date, time, listing_title })
 *   SLCM_WA.notify('new_listing', { listing_title, listing_url, name })
 *   SLCM_WA.openChat({ text: 'Bonjour, je suis intéressé par...' })
 */

const SLCM_WA = (() => {

  const PHONE      = '237650840714';
  const NOTIFY_URL = '/.netlify/functions/whatsapp-notify';

  /* ── 1. Ouvrir une conversation WhatsApp directe (côté visiteur) ── */
  function openChat({ text = '' } = {}) {
    const encoded = encodeURIComponent(text);
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?phone=${PHONE}&text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${PHONE}&text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ── Messages pré-remplis contextuels ── */
  const PREFILL = {
    contact:     (d) => `Bonjour SE LOGER CM, je m'appelle ${d.name || ''}. ${d.message || ''}`,
    rdv:         (d) => `Bonjour, je souhaite prendre RDV pour visiter "${d.listing_title || 'un bien'}" le ${d.date || ''} à ${d.time || ''}.`,
    listing:     (d) => `Bonjour, je suis intéressé(e) par l'annonce "${d.title}" (${d.price}) à ${d.location}. Pouvez-vous me donner plus d'informations ?`,
    general:     ()  => `Bonjour SE LOGER CM, j'aimerais avoir des informations sur vos annonces.`,
  };

  function chatFromListing(listing) {
    openChat({ text: PREFILL.listing(listing) });
  }

  /* ── 2. Notifier l'équipe via la Netlify Function (API Twilio) ── */
  async function notify(type, data) {
    try {
      const res = await fetch(NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[SLCM_WA] Notification échouée :', err.error || res.status);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[SLCM_WA] Erreur réseau :', e.message);
      return false;
    }
  }

  /* ── 3. Init auto : boutons WhatsApp contextuels sur les cartes d'annonce ── */
  function initListingButtons() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wa-listing]');
      if (!btn) return;
      try {
        const data = JSON.parse(btn.dataset.waListing);
        chatFromListing(data);
      } catch {
        openChat({ text: PREFILL.general() });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initListingButtons);

  return { openChat, chatFromListing, notify, PREFILL };
})();

window.SLCM_WA = SLCM_WA;
