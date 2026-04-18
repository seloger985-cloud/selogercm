/**
 * SE LOGER CM — Bandeau cookies
 * Stockage du choix dans localStorage (slcm_consent)
 * - 'accepted' : tous les cookies acceptés (analytics, ads)
 * - 'essential' : seuls les cookies essentiels
 * Le bandeau ne s'affiche que si aucun choix n'a été fait
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'slcm_consent';
  const CONSENT_VERSION = '1.0';

  /* ── Vérifier si l'utilisateur a déjà fait son choix ── */
  function hasConsent() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    try {
      const data = JSON.parse(stored);
      return data.version === CONSENT_VERSION;
    } catch { return false; }
  }

  /* ── Sauvegarder le choix ── */
  function saveConsent(choice) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      choice: choice,
      date: new Date().toISOString()
    }));

    /* Activer ou désactiver Google Analytics selon le choix */
    if (choice === 'accepted') {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
  }

  /* ── Récupérer le choix actuel ── */
  function getCurrentChoice() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored).choice;
    } catch { return null; }
  }

  /* ── Activer les analytics ── */
  function enableAnalytics() {
    if (window.gtag) {
      gtag('consent', 'update', {
        'ad_storage': 'granted',
        'analytics_storage': 'granted'
      });
    }
  }

  /* ── Désactiver les analytics ── */
  function disableAnalytics() {
    if (window.gtag) {
      gtag('consent', 'update', {
        'ad_storage': 'denied',
        'analytics_storage': 'denied'
      });
    }
  }

  /* ── Créer le bandeau ── */
  function createBanner() {
    if (document.getElementById('slcmCookieBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'slcmCookieBanner';
    banner.innerHTML = `
      <style>
        #slcmCookieBanner {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; box-shadow: 0 -4px 24px rgba(0,0,0,.12);
          padding: 1.2rem 1.5rem; z-index: 99999;
          font-family: 'Poppins', sans-serif;
          border-top: 3px solid #ff7a00;
          animation: slcmCookieSlide .4s ease-out;
        }
        @keyframes slcmCookieSlide {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        #slcmCookieBanner .slcm-cookie-inner {
          max-width: 1200px; margin: auto;
          display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap;
        }
        #slcmCookieBanner .slcm-cookie-text {
          flex: 1; min-width: 280px; font-size: .88rem;
          color: #444; line-height: 1.5;
        }
        #slcmCookieBanner .slcm-cookie-text strong {
          color: #111; display: block; margin-bottom: .25rem;
          font-size: .95rem;
        }
        #slcmCookieBanner .slcm-cookie-text a {
          color: #ff7a00; text-decoration: underline; font-weight: 600;
        }
        #slcmCookieBanner .slcm-cookie-btns {
          display: flex; gap: .5rem; flex-wrap: wrap;
        }
        #slcmCookieBanner button {
          padding: .65rem 1.2rem; border-radius: 999px;
          font-family: inherit; font-weight: 700; font-size: .85rem;
          cursor: pointer; border: none; transition: opacity .2s;
        }
        #slcmCookieBanner button:hover { opacity: .85; }
        #slcmCookieBanner .slcm-btn-refuse {
          background: #f0f0f0; color: #555;
        }
        #slcmCookieBanner .slcm-btn-accept {
          background: #ff7a00; color: #fff;
        }
        @media (max-width: 600px) {
          #slcmCookieBanner { padding: 1rem; }
          #slcmCookieBanner .slcm-cookie-btns { width: 100%; }
          #slcmCookieBanner .slcm-cookie-btns button { flex: 1; }
        }
      </style>
      <div class="slcm-cookie-inner">
        <div class="slcm-cookie-text">
          <strong>🍪 Nous utilisons des cookies</strong>
          Ce site utilise des cookies essentiels pour son fonctionnement et des cookies de mesure d'audience pour améliorer votre expérience.
          <a href="/cookies">En savoir plus</a>
        </div>
        <div class="slcm-cookie-btns">
          <button class="slcm-btn-refuse" onclick="window.SLCM_cookies.refuse()">
            Refuser
          </button>
          <button class="slcm-btn-accept" onclick="window.SLCM_cookies.accept()">
            Accepter tout
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
  }

  /* ── Masquer le bandeau ── */
  function hideBanner() {
    const banner = document.getElementById('slcmCookieBanner');
    if (banner) banner.remove();
  }

  /* ── API publique ── */
  window.SLCM_cookies = {
    accept() { saveConsent('accepted'); hideBanner(); },
    refuse() { saveConsent('essential'); hideBanner(); },
    openPanel() {
      /* Réafficher le bandeau pour modifier le choix */
      hideBanner();
      createBanner();
    },
    getChoice: getCurrentChoice
  };

  /* ── Init au chargement ── */
  function init() {
    /* Configurer Google consent mode par défaut (refusé) */
    if (window.gtag) {
      gtag('consent', 'default', {
        'ad_storage': 'denied',
        'analytics_storage': 'denied',
        'wait_for_update': 500
      });
    }

    /* Si déjà choisi → appliquer */
    if (hasConsent()) {
      const choice = getCurrentChoice();
      if (choice === 'accepted') enableAnalytics();
    } else {
      /* Sinon afficher le bandeau */
      if (document.body) createBanner();
      else document.addEventListener('DOMContentLoaded', createBanner);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
