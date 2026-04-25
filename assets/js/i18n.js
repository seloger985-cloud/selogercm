/**
 * i18n.js — SE LOGER CM
 * Système de traduction FR / EN
 * Fonctionne sur toutes les pages via data-i18n="clé"
 *
 * Usage HTML :
 *   <span data-i18n="search">Search</span>
 *   <select data-i18n-placeholder="city">...</select>
 *
 * La langue choisie est sauvegardée dans localStorage (selogercm_lang)
 */

(function () {

  /* ══════════════════════════════════════
     DICTIONNAIRE
  ══════════════════════════════════════ */
  const TRANSLATIONS = {

    /* ── Index / Hero ── */
    headline:    { fr: 'Unique Solutions,\nSmart Living',  en: 'Unique Solutions,\nSmart Living' },
    kicker:      { fr: 'Agence immobilière & Marketplace au Cameroun', en: 'Real estate agency & Marketplace in Cameroon' },
    sub:         { fr: 'Que vous achetiez, publiiez ou louiez, nous sommes là à chaque étape.', en: 'Whether you\'re buying, listing, or renting, we\'re here to help every step of the way.' },
    publishAd:   { fr: 'Publier une annonce', en: 'List your ad' },

    /* ── Tabs recherche ── */
    rentTab:     { fr: 'À LOUER',   en: 'TO RENT' },
    saleTab:     { fr: 'À VENDRE',  en: 'FOR SALE' },

    /* ── Filtres ── */
    city:        { fr: 'Ville',      en: 'City' },
    district:    { fr: 'Quartier',   en: 'District' },
    type:        { fr: 'Type',       en: 'Type' },
    bedrooms:    { fr: 'Chambres',   en: 'Bedrooms' },
    price:       { fr: 'Prix',       en: 'Price' },
    search:      { fr: 'RECHERCHER', en: 'SEARCH' },

    /* ── Types de bien ── */
    apartment:   { fr: 'Appartement', en: 'Apartment' },
    house:       { fr: 'Maison',      en: 'House' },
    studio:      { fr: 'Studio',      en: 'Studio' },
    villa:       { fr: 'Villa',       en: 'Villa' },
    duplex:      { fr: 'Duplex',      en: 'Duplex' },
    warehouse:   { fr: 'Entrepôt',    en: 'Warehouse' },
    land:        { fr: 'Terrain',     en: 'Plots of land' },

    /* ── Sections accueil ── */
    unfurnishedTitle: { fr: 'Top Appartements Non Meublés', en: 'Top Unfurnished Apartments' },
    unfurnishedSub:   { fr: 'Premium • Non Meublé',         en: 'Premium • Unfurnished' },
    furnishedTitle:   { fr: 'Top Appartements Meublés',     en: 'Top Furnished Apartments' },
    furnishedSub:     { fr: 'Premium • Meublé',             en: 'Premium • Furnished' },

    /* ── Section partenaire ── */
    partner:    { fr: 'Devenez partenaire',                          en: 'Partner with us' },
    partnerSub: { fr: 'Devenez partenaire • Construisons ensemble.', en: 'Become a partner • Let\'s build modern real-estate experiences.' },
    contact:    { fr: 'Nous contacter',  en: 'Contact us' },
    send:       { fr: 'Envoyer',         en: 'Send' },
    cancel:     { fr: 'Annuler',         en: 'Cancel' },

    /* ── Navbar / Footer ── */
    home:       { fr: 'Accueil',   en: 'Home' },
    toRent:     { fr: 'À louer',   en: 'To rent' },
    forSale:    { fr: 'À vendre',  en: 'For sale' },
    publish:    { fr: 'Publier',   en: 'Publish' },

    /* ── Listings page ── */
    allListings:   { fr: 'Toutes les annonces', en: 'All listings' },
    noListings:    { fr: 'Aucune annonce trouvée.', en: 'No listings found.' },
    anyPrice:      { fr: 'Tout prix',  en: 'Any price' },
    furnished:     { fr: 'Meublé',     en: 'Furnished' },
    unfurnished:   { fr: 'Non meublé', en: 'Unfurnished' },

    /* ── Dashboard ── */
    myDashboard:   { fr: 'Mon Tableau de Bord', en: 'My Dashboard' },
    newListing:    { fr: 'Nouvelle annonce',    en: 'New listing' },
    myListings:    { fr: 'Mes annonces',        en: 'My listings' },
    signOut:       { fr: 'Déconnexion',         en: 'Sign out' },

    /* ── Publish ── */
    publishTitle:  { fr: 'Publier votre annonce', en: 'Publish your listing' },
    toRentBtn:     { fr: 'À Louer',  en: 'To Rent' },
    forSaleBtn:    { fr: 'À Vendre', en: 'For Sale' },

    /* ── Détail annonce ── */
    contactOwner:  { fr: 'Contacter le propriétaire', en: 'Contact the owner' },
    callUs:        { fr: 'Appeler',   en: 'Call us' },
    backToList:    { fr: '← Toutes les annonces', en: '← All listings' },
    forSaleBadge:  { fr: 'À Vendre', en: 'For Sale' },
    toRentBadge:   { fr: 'À Louer',  en: 'To Rent' },
  };

  /* ══════════════════════════════════════
     MOTEUR DE TRADUCTION
  ══════════════════════════════════════ */
  const LANG_KEY = 'slcm_lang';

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'fr';
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    updateToggleUI(lang);
  }

  function t(key, lang) {
    const entry = TRANSLATIONS[key];
    if (!entry) return null;
    return entry[lang] || entry['en'] || null;
  }

  function applyTranslations(lang) {
    /* Texte simple : data-i18n="key" */
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key  = el.getAttribute('data-i18n');
      const text = t(key, lang);
      if (text === null) return;

      /* Gestion des retours à la ligne dans le hero-title */
      if (el.classList.contains('hero-title') && text.includes('\n')) {
        el.innerHTML = text.split('\n')
          .map(line => `<span class="line">${line}</span>`)
          .join('');
        return;
      }
      el.textContent = text;
    });

    /* Placeholder de select : data-i18n-placeholder="key" */
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key  = el.getAttribute('data-i18n-placeholder');
      const text = t(key, lang);
      if (text === null) return;
      /* Mettre à jour la première option vide */
      const first = el.querySelector('option[value=""]');
      if (first) first.textContent = text;
    });

    /* Attribut lang sur <html> */
    document.documentElement.lang = lang;
  }

  function updateToggleUI(lang) {
    const btnFR = document.getElementById('langFR');
    const btnEN = document.getElementById('langEN');
    if (!btnFR || !btnEN) return;

    if (lang === 'fr') {
      btnFR.style.fontWeight = '900';
      btnFR.style.color      = 'var(--orange, #ff7a00)';
      btnEN.style.fontWeight = '400';
      btnEN.style.color      = '';
    } else {
      btnEN.style.fontWeight = '900';
      btnEN.style.color      = 'var(--orange, #ff7a00)';
      btnFR.style.fontWeight = '400';
      btnFR.style.color      = '';
    }
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    const lang = getLang();
    applyTranslations(lang);
    updateToggleUI(lang);

    /* Bind boutons FR / EN */
    const btnFR = document.getElementById('langFR');
    const btnEN = document.getElementById('langEN');
    if (btnFR) btnFR.addEventListener('click', () => setLang('fr'));
    if (btnEN) btnEN.addEventListener('click', () => setLang('en'));
  });

  /* Exposer globalement si besoin */
  window.SLCM_i18n = { getLang, setLang, t };

})();
