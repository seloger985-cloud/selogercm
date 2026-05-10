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
    const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
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
    /* Utilise le numéro du propriétaire si disponible, sinon SE LOGER CM */
    const ownerPhone = (listing.owner_phone || '').replace(/\D/g, '');
    const text = PREFILL.listing(listing);
    if (ownerPhone && ownerPhone.length >= 8) {
      const url = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      openChat({ text });
    }
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

  /* ── 4. Bouton flottant permanent ── */
  function injectFAB() {
    if (document.getElementById('slcm-wa-fab')) return;

    const style = document.createElement('style');
    style.textContent = `
      #slcm-wa-fab {
        position: fixed; bottom: 24px; right: 24px; z-index: 999;
        background: #25d366; color: #fff; border-radius: 999px;
        width: 56px; height: 56px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem; text-decoration: none;
        box-shadow: 0 4px 18px rgba(37,211,102,.45);
        transition: transform .2s, box-shadow .2s;
        overflow: hidden;
      }
      #slcm-wa-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(37,211,102,.55); }
      #slcm-wa-fab .wa-label { display: none; font-size: .82rem; font-weight: 800; white-space: nowrap; }
      @media (max-width: 600px) {
        #slcm-wa-fab {
          bottom: 16px; right: auto; left: 16px;
          width: auto; padding: 0 1.1rem; gap: .45rem; height: 50px;
        }
        #slcm-wa-fab .wa-label { display: block; }
      }
    `;
    document.head.appendChild(style);

    const fab = document.createElement('a');
    fab.id   = 'slcm-wa-fab';
    fab.href = '#';
    fab.setAttribute('aria-label', 'Contacter sur WhatsApp');
    fab.setAttribute('rel', 'noopener noreferrer');
    fab.innerHTML = `<i class="fab fa-whatsapp"></i><span class="wa-label">WhatsApp</span>`;
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      openChat({ text: PREFILL.general() });
    });
    document.body.appendChild(fab);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initListingButtons();
    injectFAB();
  });

  return { openChat, chatFromListing, notify, PREFILL };
})();

window.SLCM_WA = SLCM_WA;
