/**
 * lang.js — SE LOGER CM
 * Système de traduction FR / EN
 * - Lit/écrit la langue dans localStorage ('slcm_lang')
 * - Applique les traductions via data-fr / data-en sur les éléments
 * - Gère le bouton FR/EN injecté par nav.js
 * - Traduit aussi les placeholders, aria-labels et title
 */
(function () {

  const STORAGE_KEY = 'slcm_lang';
  const DEFAULT_LANG = 'fr';

  /* ─── Dictionnaire global (textes non marqués data-fr/data-en) ─── */
  const DICT = {

    /* ── Navigation ── */
    'nav.home':        { fr: 'Accueil',           en: 'Home' },
    'nav.listings':    { fr: 'Annonces',           en: 'Listings' },
    'nav.services':    { fr: 'Services',           en: 'Services' },
    'nav.blog':        { fr: 'Blog',               en: 'Blog' },
    'nav.about':       { fr: 'À propos',           en: 'About' },
    'nav.rdv':         { fr: 'Rendez-vous',        en: 'Book a meeting' },
    'nav.publish':     { fr: 'Publier',            en: 'List your ad' },
    'nav.favorites':   { fr: 'Mes favoris',        en: 'My favorites' },

    /* ── Page d'accueil ── */
    'home.headline':   { fr: 'Unique Solutions, Smart Living', en: 'Unique Solutions, Smart Living' },
    'home.sub':        { fr: 'Que vous achetiez, vendiez ou louiez, nous sommes là à chaque étape.', en: 'Whether you\'re buying, listing, or renting, we\'re here every step of the way.' },
    'home.rent':       { fr: 'À LOUER',            en: 'TO RENT' },
    'home.sale':       { fr: 'À VENDRE',           en: 'FOR SALE' },
    'home.search':     { fr: 'RECHERCHER',         en: 'SEARCH' },
    'home.city':       { fr: 'Ville',              en: 'City' },
    'home.district':   { fr: 'Quartier',           en: 'District' },
    'home.type':       { fr: 'Type de bien',       en: 'Property type' },
    'home.bedrooms':   { fr: 'Chambres',           en: 'Bedrooms' },
    'home.price':      { fr: 'Prix',               en: 'Price' },
    'home.publish':    { fr: 'Publier une annonce', en: 'List your ad' },
    'home.unfurnishedTitle': { fr: 'Appartements non meublés', en: 'Unfurnished Apartments' },
    'home.furnishedTitle':   { fr: 'Appartements meublés',     en: 'Furnished Apartments' },
    'home.premium':    { fr: 'Premium • Sélection', en: 'Premium • Selection' },

    /* ── Listings ── */
    'listings.title':  { fr: 'Toutes les annonces', en: 'All listings' },
    'listings.empty':  { fr: 'Aucune annonce trouvée.', en: 'No listings found.' },
    'listings.torent': { fr: 'À LOUER',  en: 'TO RENT' },
    'listings.tosale': { fr: 'À VENDRE', en: 'FOR SALE' },
    'listings.search': { fr: 'Rechercher', en: 'Search' },

    /* ── Publish ── */
    'publish.title':    { fr: 'Publier une annonce', en: 'Publish your listing' },
    'publish.torent':   { fr: 'À Louer',   en: 'To Rent' },
    'publish.tosale':   { fr: 'À Vendre',  en: 'For Sale' },
    'publish.adtitle':  { fr: 'Titre de l\'annonce', en: 'Listing title' },
    'publish.city':     { fr: 'Ville',     en: 'City' },
    'publish.district': { fr: 'Quartier',  en: 'District' },
    'publish.type':     { fr: 'Type de bien', en: 'Property type' },
    'publish.bedrooms': { fr: 'Chambres',  en: 'Bedrooms' },
    'publish.price':    { fr: 'Prix (FCFA)', en: 'Price (FCFA)' },
    'publish.furnished':{ fr: 'Bien meublé', en: 'Furnished' },
    'publish.desc':     { fr: 'Description', en: 'Description' },
    'publish.photos':   { fr: 'Photos (8 maximum)', en: 'Photos (max 8)' },
    'publish.cancel':   { fr: 'Annuler',   en: 'Cancel' },
    'publish.submit':   { fr: 'Publier l\'annonce', en: 'Publish listing' },
    'publish.success':  { fr: 'Annonce publiée avec succès !', en: 'Listing published!' },

    /* ── Signin ── */
    'signin.login':     { fr: 'Connexion',     en: 'Sign in' },
    'signin.register':  { fr: 'Créer un compte', en: 'Create account' },
    'signin.email':     { fr: 'Adresse email', en: 'Email address' },
    'signin.pass':      { fr: 'Mot de passe',  en: 'Password' },
    'signin.name':      { fr: 'Nom complet',   en: 'Full name' },
    'signin.confirm':   { fr: 'Confirmer le mot de passe', en: 'Confirm password' },
    'signin.submit':    { fr: 'Se connecter',  en: 'Sign in' },
    'signin.create':    { fr: 'Créer mon compte', en: 'Create my account' },
    'signin.whatsapp':  { fr: 'Contacter via WhatsApp', en: 'Contact via WhatsApp' },

    /* ── RDV ── */
    'rdv.title':        { fr: 'Prendre Rendez-vous', en: 'Book a Meeting' },
    'rdv.sub':          { fr: 'Notre équipe vous répond sous 24h.', en: 'Our team replies within 24h.' },
    'rdv.find':         { fr: 'Nous trouver', en: 'Find us' },
    'rdv.address':      { fr: 'Adresse',  en: 'Address' },
    'rdv.phone':        { fr: 'Téléphone', en: 'Phone' },
    'rdv.hours':        { fr: 'Horaires', en: 'Opening hours' },
    'rdv.response':     { fr: 'Délai de réponse', en: 'Response time' },
    'rdv.form':         { fr: '📅 Formulaire de demande', en: '📅 Request form' },
    'rdv.name':         { fr: 'Nom complet *', en: 'Full name *' },
    'rdv.pphone':       { fr: 'Téléphone *', en: 'Phone *' },
    'rdv.service':      { fr: 'Service souhaité *', en: 'Desired service *' },
    'rdv.avail':        { fr: 'Disponibilités souhaitées', en: 'Preferred availability' },
    'rdv.message':      { fr: 'Votre projet en quelques mots', en: 'Describe your project' },
    'rdv.send':         { fr: 'Envoyer ma demande', en: 'Send my request' },
    'rdv.sending':      { fr: 'Envoi en cours...', en: 'Sending...' },
    'rdv.success':      { fr: '✅ Demande envoyée ! Nous vous contacterons sous 24h.', en: '✅ Request sent! We\'ll contact you within 24h.' },

    /* ── About ── */
    'about.title':           { fr: 'À Propos de SE LOGER CM',                      en: 'About SE LOGER CM' },
    'about.sub':             { fr: 'Votre partenaire immobilier de confiance à Douala.', en: 'Your trusted real estate partner in Douala.' },
    'about.mission':         { fr: 'Notre Mission',                                 en: 'Our Mission' },
    'about.values':          { fr: 'Nos Valeurs',                                   en: 'Our Values' },
    'about.team':            { fr: 'Notre Équipe',                                  en: 'Our Team' },
    'about.reviews':         { fr: 'Ce que disent nos clients',                     en: 'What our clients say' },
    'about.reviews.title':   { fr: 'Ce que disent nos clients',                     en: 'What our clients say' },
    'about.reviews.sub':     { fr: 'Des témoignages authentiques de personnes que nous avons accompagnées.', en: 'Authentic testimonials from people we have supported.' },
    'about.reviews.seeall':  { fr: 'Voir tous les témoignages',                     en: 'See all testimonials' },

    /* ── Services ── */
    'services.title':   { fr: 'Nos Services', en: 'Our Services' },
    'services.sub':     { fr: 'Tout pour votre projet immobilier à Douala.', en: 'Everything for your real estate project in Douala.' },

    /* ── Blog ── */
    'blog.title':       { fr: 'Blog Immobilier', en: 'Real Estate Blog' },
    'blog.sub':         { fr: 'Actualités, conseils et tendances par nos experts.', en: 'News, tips and trends from our experts.' },
    'blog.all':         { fr: 'Tous les articles', en: 'All articles' },
    'blog.read':        { fr: 'Lire l\'article', en: 'Read article' },
    'blog.empty':       { fr: 'Aucun article dans cette catégorie.', en: 'No articles in this category.' },

    /* ── 404 ── */
    '404.title':        { fr: 'Page introuvable', en: 'Page not found' },
    '404.msg':          { fr: 'Oups ! La page que vous cherchez n\'existe pas.', en: 'Oops! The page you\'re looking for doesn\'t exist.' },
    '404.home':         { fr: 'Retour à l\'accueil', en: 'Back to home' },
    '404.back':         { fr: 'Page précédente', en: 'Go back' },

    /* ── Listing detail ── */
    'detail.back':      { fr: '← Retour', en: '← Back' },
    'detail.contact':   { fr: 'Contacter le propriétaire', en: 'Contact the owner' },
    'detail.call':      { fr: 'Appeler', en: 'Call us' },
    'detail.verified':  { fr: 'SE LOGER CM vérifie toutes les annonces', en: 'SE LOGER CM verifies all listings' },
    'detail.location':  { fr: 'Localisation approximative', en: 'Approximate location' },
    'detail.notfound':  { fr: 'Annonce introuvable', en: 'Listing not found' },

    /* ── Footer ── */
    'footer.tagline':   { fr: 'Votre partenaire immobilier de confiance à Douala.', en: 'Your trusted real estate partner in Douala.' },
    'footer.nav':       { fr: 'Navigation', en: 'Navigation' },
    'footer.services':  { fr: 'Services',   en: 'Services' },
    'footer.contact':   { fr: 'Contact',    en: 'Contact' },
    'footer.legal':     { fr: 'Mentions légales', en: 'Legal notice' },
    'footer.privacy':   { fr: 'Confidentialité',  en: 'Privacy' },

    /* ── Chatbot ── */
    'chat.header':      { fr: 'Assistant SE LOGER CM', en: 'SE LOGER CM Assistant' },
    'chat.sub':         { fr: 'Propulsé par l\'IA • Disponible 24h/24', en: 'AI-powered • Available 24/7' },
    'chat.placeholder': { fr: 'Décrivez votre logement idéal...', en: 'Describe your ideal home...' },
    'chat.tooltip':     { fr: 'Assistant IA', en: 'AI Assistant' },

    /* ── Favoris ── */
    'fav.title':        { fr: 'Mes Favoris', en: 'My Favorites' },
    'fav.empty.title':  { fr: 'Aucun favori pour l\'instant', en: 'No favorites yet' },
    'fav.empty.sub':    { fr: 'Sauvegardez des annonces en cliquant sur le ❤️', en: 'Save listings by clicking the ❤️' },
    'fav.see':          { fr: 'Voir l\'annonce', en: 'View listing' },
    'fav.remove':       { fr: 'Retirer', en: 'Remove' },
    'fav.clear':        { fr: 'Tout effacer', en: 'Clear all' },
    'fav.added':        { fr: 'Ajouté aux favoris', en: 'Added to favorites' },
    'fav.removed':      { fr: 'Retiré des favoris', en: 'Removed from favorites' },

    /* ── Général ── */
    'general.back':     { fr: 'Retour à l\'accueil', en: 'Back to home' },
    'general.listings': { fr: 'Voir les annonces', en: 'See listings' },
    'general.rdv':      { fr: 'Prendre RDV', en: 'Book a meeting' },
    'general.partner':  { fr: 'Devenir partenaire', en: 'Become a partner' },
    'general.readmore': { fr: 'Lire la suite', en: 'Read more' },
    'general.copyright':{ fr: '© {year} SE LOGER CM — Tous droits réservés.', en: '© {year} SE LOGER CM — All rights reserved.' },
  };

  /* ─── Obtenir / définir la langue ─── */
  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
    updateToggleUI(lang);
  }

  /* ─── Appliquer la langue sur la page ─── */
  function applyLang(lang) {
    document.documentElement.lang = lang;

    /* 1. Éléments avec data-fr / data-en */
    document.querySelectorAll('[data-fr], [data-en]').forEach(el => {
      const text = el.dataset[lang];
      if (text !== undefined) {
        // Ne pas écraser les éléments avec des enfants complexes
        if (el.children.length === 0) {
          el.textContent = text;
        } else if (el.dataset.translatable === 'html') {
          el.innerHTML = text;
        }
      }
    });

    /* 2. Placeholders */
    document.querySelectorAll('[data-ph-fr], [data-ph-en]').forEach(el => {
      const ph = el.dataset['ph' + lang.charAt(0).toUpperCase() + lang.slice(1)];
      if (ph !== undefined) el.placeholder = ph;
    });

    /* 3. Aria-labels */
    document.querySelectorAll('[data-aria-fr], [data-aria-en]').forEach(el => {
      const aria = el.dataset['aria' + lang.charAt(0).toUpperCase() + lang.slice(1)];
      if (aria !== undefined) el.setAttribute('aria-label', aria);
    });

    /* 4. Éléments avec data-i18n key → dictionnaire */
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const entry = DICT[key];
      if (!entry) return;
      const text = entry[lang];
      if (text === undefined) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else if (el.children.length === 0) {
        // Pas d'enfants — remplacement direct
        el.textContent = text;
      } else {
        // A des enfants (ex: <h2> avec <span>) — on remplace en gardant la structure
        // On cherche un nœud texte direct à mettre à jour, sinon on utilise innerHTML
        const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (textNode) {
          textNode.textContent = text.replace(/<[^>]+>/g, '') + ' ';
        } else {
          // Fallback : innerHTML si data-i18n-html autorisé
          if (el.dataset.i18nHtml !== undefined) el.innerHTML = text;
        }
      }
    });

    /* 5. Cas spéciaux — titre de la page */
    const pageTitle = document.querySelector('[data-title-fr]');
    if (pageTitle) {
      document.title = (lang === 'fr' ? pageTitle.dataset.titleFr : pageTitle.dataset.titleEn) + ' — SE LOGER CM';
    }

    /* 6. Copyright dynamique */
    const year = new Date().getFullYear();
    document.querySelectorAll('.footer-copy').forEach(el => {
      const entry = DICT['general.copyright'];
      if (entry) el.textContent = entry[lang].replace('{year}', year);
    });

    /* 7. Déclencher un événement personnalisé pour les modules qui écoutent */
    document.dispatchEvent(new CustomEvent('slcm:langchange', { detail: { lang } }));
  }

  /* ─── Mettre à jour le bouton FR/EN dans le header ─── */
  function updateToggleUI(lang) {
    document.querySelectorAll('#langFR').forEach(btn => {
      btn.classList.toggle('active-lang', lang === 'fr');
    });
    document.querySelectorAll('#langEN').forEach(btn => {
      btn.classList.toggle('active-lang', lang === 'en');
    });
  }

  /* ─── Brancher les boutons FR/EN via délégation ─── */
  // Délégation sur document = fonctionne peu importe quand les boutons sont injectés
  // Pas besoin d'attendre nav.js — ça marche toujours
  let clickBound = false;
  function bindToggleButtons() {
    if (clickBound) return;
    clickBound = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#langFR, #langEN');
      if (!btn) return;
      const newLang = btn.id === 'langFR' ? 'fr' : 'en';
      setLang(newLang);
    });
  }

  /* ─── Exposer l'API globalement ─── */
  window.SLCM_lang = {
    get: getLang,
    set: setLang,
    t: (key) => {
      const entry = DICT[key];
      if (!entry) return key;
      return entry[getLang()] || entry['fr'] || key;
    },
    dict: DICT,
  };

  /* ─── Init principale ─── */
  function init() {
    const lang = getLang();
    applyLang(lang);
    updateToggleUI(lang);
    bindToggleButtons();
  }

  /* ─── Stratégie de chargement robuste ─── */

  // 1. Brancher les clics immédiatement (délégation = pas besoin des boutons en DOM)
  bindToggleButtons();

  // 2. Appliquer la langue dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 3. Ré-appliquer quand nav.js a injecté le header (pour updateToggleUI)
  document.addEventListener('slcm:navready', () => {
    updateToggleUI(getLang());
    applyLang(getLang()); // ré-appliquer au cas où des éléments data-i18n ont été injectés
  });

})();
