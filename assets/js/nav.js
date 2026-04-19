/**
 * nav.js — SE LOGER CM
 * Injecte le header universel + bouton WhatsApp flottant sur toutes les pages
 */
(function () {

  /* ─── Liens de navigation avec traductions ─── */
  const NAV_LINKS = [
    { href: '/',       fr: 'Accueil',      en: 'Home',        icon: 'fa-home' },
    { href: '/annonces', fr: 'Annonces',     en: 'Listings',    icon: 'fa-search' },
    { href: '/services',    fr: 'Services',     en: 'Services',    icon: 'fa-concierge-bell' },
    { href: '/blog',        fr: 'Blog',         en: 'Blog',        icon: 'fa-newspaper' },
    { href: '/a-propos',       fr: 'À propos',     en: 'About',       icon: 'fa-info-circle' },
    { href: '/rendez-vous',         fr: 'Rendez-vous',  en: 'Book a call', icon: 'fa-calendar-check', cta: true },
  ];

  const currentPage = window.location.pathname.split('/').pop() || '/';
  let currentLang = localStorage.getItem('slcm_lang') || 'fr';

  /* ─── Styles ─── */
  const style = document.createElement('style');
  style.textContent = `
    :root { --orange: #ff7a00; --nav-h: 68px; }
    header { position:fixed; top:0; left:0; right:0; z-index:1000; background:#fff; border-bottom:1px solid #eee; height:var(--nav-h); }
    .navbar { display:flex; align-items:center; justify-content:space-between; height:100%; gap:1rem; }
    .brand { display:flex; align-items:center; gap:.5rem; text-decoration:none; flex-shrink:0; }
    .brand img { height:36px; width:auto; }
    .brand span { font-weight:900; font-size:1rem; color:#111; letter-spacing:-.3px; }
    .nav-menu { display:flex; align-items:center; gap:.25rem; list-style:none; margin:0; padding:0; }
    .nav-menu a { display:flex; align-items:center; gap:.35rem; padding:.45rem .85rem; border-radius:999px; text-decoration:none; font-size:.875rem; font-weight:600; color:#444; transition:color .2s,background .2s; white-space:nowrap; }
    .nav-menu a:hover { color:var(--orange); background:#fff4e8; }
    .nav-menu a.active { color:var(--orange); }
    .nav-menu a.nav-cta { background:var(--orange); color:#fff !important; padding:.45rem 1.1rem; }
    .nav-menu a.nav-cta:hover { opacity:.88; background:var(--orange); }
    .nav-menu i { font-size:.78rem; }
    .nav-right-wrap { display:flex; align-items:center; gap:.75rem; flex-shrink:0; }
    .lang { display:flex; align-items:center; gap:.15rem; font-size:.8rem; font-weight:700; color:#888; }
    .lang button { background:none; border:none; cursor:pointer; font-weight:700; font-size:.8rem; padding:.2rem .3rem; color:#888; transition:color .2s; }
    .lang button:hover, .lang button.active-lang { color:var(--orange); }
    .btn-publish { background:#111; color:#fff; border:none; padding:.5rem 1rem; border-radius:999px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; text-decoration:none; white-space:nowrap; transition:opacity .2s,transform .2s; display:inline-flex; align-items:center; gap:.35rem; }
    .btn-publish:hover { opacity:.85; transform:translateY(-1px); }
    .btn-dashboard { background:var(--orange); color:#fff; border:none; padding:.5rem 1rem; border-radius:999px; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; text-decoration:none; white-space:nowrap; transition:opacity .2s,transform .2s; display:none; align-items:center; gap:.35rem; }
    .btn-dashboard:hover { opacity:.85; transform:translateY(-1px); }
    .btn-dashboard.visible { display:inline-flex; }
    .burger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:.4rem; z-index:1100; }
    .burger span { display:block; width:24px; height:2px; background:#111; border-radius:2px; transition:transform .3s,opacity .3s; }
    .burger.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
    .burger.open span:nth-child(2) { opacity:0; }
    .burger.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
    .mobile-nav { display:none; position:fixed; top:var(--nav-h); left:0; right:0; bottom:0; background:#fff; z-index:999; flex-direction:column; padding:1.5rem; overflow-y:auto; }
    .mobile-nav.open { display:flex; }
    .mobile-nav a { display:flex; align-items:center; gap:.75rem; padding:1rem .75rem; border-radius:12px; text-decoration:none; font-size:1rem; font-weight:700; color:#222; border-bottom:1px solid #f0f0f0; transition:background .15s; }
    .mobile-nav a:last-child { border-bottom:none; }
    .mobile-nav a:hover, .mobile-nav a.active { color:var(--orange); background:#fff4e8; }
    .mobile-nav a.nav-cta { background:var(--orange); color:#fff; margin-top:.75rem; border-bottom:none; justify-content:center; }
    .mobile-nav i { width:20px; text-align:center; font-size:.95rem; }
    body { padding-top:var(--nav-h); }
    @media (max-width:900px) { .nav-menu { display:none; } .btn-publish { display:none; } .burger { display:flex; } }
    @media (max-width:480px) { .brand span { display:none; } }
    .wa-float { position:fixed; bottom:24px; right:24px; z-index:999; background:#25d366; color:#fff; border:none; width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.6rem; box-shadow:0 4px 16px rgba(37,211,102,.45); text-decoration:none; transition:transform .2s,box-shadow .2s; }
    .wa-float:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(37,211,102,.6); }
    .wa-float-tooltip { position:fixed; bottom:90px; right:24px; z-index:999; background:#111; color:#fff; font-size:.78rem; font-weight:600; padding:.4rem .8rem; border-radius:8px; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .2s; }
    .wa-float:hover + .wa-float-tooltip { opacity:1; }
  `;
  document.head.appendChild(style);

  /* ─── Obtenir le label selon la langue ─── */
  function label(link) {
    return currentLang === 'en' ? link.en : link.fr;
  }

  /* ─── Construire le header ─── */
  function buildHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    const existingNavbar = header.querySelector('.navbar');
    if (existingNavbar) existingNavbar.remove();

    const navbar = document.createElement('div');
    navbar.className = 'container px navbar';
    navbar.innerHTML = `
      <a class="brand" href="/" aria-label="SE LOGER CM">
        <img src="./assets/img/logo.png" alt="SE LOGER CM logo">
        <span>SE LOGER CM</span>
      </a>
    `;

    /* Menu desktop */
    const ul = document.createElement('ul');
    ul.className = 'nav-menu';

    NAV_LINKS.forEach(link => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.href;
      a.dataset.navKey = link.href;
      a.innerHTML = `<i class="fas ${link.icon}"></i><span class="nav-label">${label(link)}</span>`;
      if (link.cta) a.classList.add('nav-cta');
      if (currentPage === link.href) a.classList.add('active');
      li.appendChild(a);
      ul.appendChild(li);
    });
    navbar.appendChild(ul);

    /* Droite */
    const right = document.createElement('div');
    right.className = 'nav-right-wrap';
    right.innerHTML = `
      <div class="lang">
        <button id="langFR" type="button">FR</button>
        <span>/</span>
        <button id="langEN" type="button">EN</button>
      </div>
      <a href="/publier" class="btn-publish" id="publishBtn">
        <i class="fas fa-plus"></i> <span id="publishLabel">${currentLang === 'en' ? 'Post' : 'Publier'}</span>
      </a>
      <a href="/mon-espace" class="btn-dashboard" id="dashboardBtn">
        <i class="fas fa-th-large"></i> <span id="dashLabel">${currentLang === 'en' ? 'Dashboard' : 'Dashboard'}</span>
      </a>
      <button class="burger" id="burgerBtn" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    `;
    navbar.appendChild(right);
    header.appendChild(navbar);

    /* Menu mobile */
    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-nav';
    mobileNav.id = 'mobileNav';

    NAV_LINKS.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.dataset.navKey = link.href;
      a.innerHTML = `<i class="fas ${link.icon}"></i><span class="nav-label">${label(link)}</span>`;
      if (link.cta) a.classList.add('nav-cta');
      if (currentPage === link.href) a.classList.add('active');
      mobileNav.appendChild(a);
    });

    const pubMobile = document.createElement('a');
    pubMobile.href = '/publier';
    pubMobile.id = 'publishBtnMobile';
    pubMobile.innerHTML = `<i class="fas fa-plus"></i><span id="publishLabelMobile">${currentLang === 'en' ? 'Post a listing' : 'Publier une annonce'}</span>`;
    pubMobile.style.cssText = 'background:#111;color:#fff;justify-content:center;margin-top:.5rem;border-bottom:none;border-radius:12px;';
    mobileNav.appendChild(pubMobile);
    document.body.appendChild(mobileNav);

    /* Burger */
    const burger = document.getElementById('burgerBtn');
    burger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    /* Publier — vérif session Supabase */
    async function guardPublish(e) {
      e.preventDefault();
      let loggedIn = false;
      try {
        if (window.SLCM_DB && window.SLCM_DB.client) {
          const { data } = await window.SLCM_DB.client.auth.getSession();
          loggedIn = !!data?.session;
        }
      } catch(err) {}
      window.location.href = loggedIn ? '/publier' : '/connexion';
    }
    document.getElementById('publishBtn')?.addEventListener('click', guardPublish);
    pubMobile.addEventListener('click', guardPublish);

    /* Langue active */
    document.getElementById('langFR')?.classList.toggle('active-lang', currentLang === 'fr');
    document.getElementById('langEN')?.classList.toggle('active-lang', currentLang === 'en');

    /* Bind changement de langue */
    document.getElementById('langFR')?.addEventListener('click', () => switchLang('fr'));
    document.getElementById('langEN')?.addEventListener('click', () => switchLang('en'));

    /* Signin/Signout + Dashboard selon session */
    (async () => {
      try {
        /* Attendre Supabase */
        let tries = 0;
        while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 30) {
          await new Promise(r => setTimeout(r, 100)); tries++;
        }
        if (!window.SLCM_DB?.client) return;

        const { data } = await window.SLCM_DB.client.auth.getSession();
        const session = data?.session;
        const dashBtn = document.getElementById('dashboardBtn');
        const pubBtn  = document.getElementById('publishBtn');

        if (session) {
          /* Connecté — afficher Dashboard, cacher Publier */
          if (dashBtn) dashBtn.classList.add('visible');
          /* Ajouter bouton déconnexion si pas déjà présent */
          if (!document.getElementById('navSignoutBtn')) {
            const signoutBtn = document.createElement('button');
            signoutBtn.id = 'navSignoutBtn';
            signoutBtn.style.cssText = 'background:none;border:1.5px solid #ddd;padding:.4rem .8rem;border-radius:999px;font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer;color:#555;transition:all .2s';
            signoutBtn.textContent = currentLang === 'en' ? 'Sign out' : 'Déconnexion';
            signoutBtn.addEventListener('mouseover', () => signoutBtn.style.borderColor = '#ff7a00');
            signoutBtn.addEventListener('mouseout',  () => signoutBtn.style.borderColor = '#ddd');
            signoutBtn.addEventListener('click', async () => {
              await window.SLCM_DB.client.auth.signOut();
              window.location.href = '/';
            });
            document.querySelector('.nav-right-wrap')?.insertBefore(signoutBtn, document.getElementById('burgerBtn'));
          }
        } else {
          /* Non connecté — icône discrète (le CTA principal reste "Publier une annonce") */
          if (!document.getElementById('navSigninBtn')) {
            const signinBtn = document.createElement('a');
            signinBtn.id = 'navSigninBtn';
            signinBtn.href = '/connexion';
            signinBtn.title = currentLang === 'en' ? 'Sign in' : 'Connexion';
            signinBtn.setAttribute('aria-label', currentLang === 'en' ? 'Sign in' : 'Connexion');
            signinBtn.style.cssText = 'width:36px;height:36px;border:1.5px solid #e5e5e5;border-radius:50%;background:#fff;color:#888;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:all .2s;font-size:.9rem';
            signinBtn.innerHTML = '<i class="fas fa-user"></i>';
            signinBtn.addEventListener('mouseover', () => { signinBtn.style.borderColor = '#ff7a00'; signinBtn.style.color = '#ff7a00'; });
            signinBtn.addEventListener('mouseout',  () => { signinBtn.style.borderColor = '#e5e5e5'; signinBtn.style.color = '#888'; });
            document.querySelector('.nav-right-wrap')?.insertBefore(signinBtn, document.getElementById('burgerBtn'));
          }
        }
      } catch(e) { console.error('nav session:', e); }
    })();
  }

  /* ─── Changer la langue et mettre à jour les labels ─── */
  function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem('slcm_lang', lang);

    /* Mettre à jour les labels du bandeau */
    document.querySelectorAll('[data-nav-key]').forEach(a => {
      const key = a.dataset.navKey;
      const link = NAV_LINKS.find(l => l.href === key);
      if (link) {
        const span = a.querySelector('.nav-label');
        if (span) span.textContent = label(link);
      }
    });

    /* Publier label */
    const publishLabel = document.getElementById('publishLabel');
    if (publishLabel) publishLabel.textContent = lang === 'en' ? 'Post' : 'Publier';
    const publishLabelMobile = document.getElementById('publishLabelMobile');
    if (publishLabelMobile) publishLabelMobile.textContent = lang === 'en' ? 'Post a listing' : 'Publier une annonce';

    /* Boutons actifs */
    document.getElementById('langFR')?.classList.toggle('active-lang', lang === 'fr');
    document.getElementById('langEN')?.classList.toggle('active-lang', lang === 'en');

    /* Propager au système i18n existant si disponible */
    if (typeof applyLang === 'function') applyLang(lang);
    document.dispatchEvent(new CustomEvent('slcm:langchange', { detail: { lang } }));
  }

  /* ─── WhatsApp flottant ─── */
  function buildWhatsApp() {
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = 'https://wa.me/237650840714?text=Bonjour%2C%20je%20souhaite%20des%20informations%20sur%20un%20bien%20immobilier.';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Contacter sur WhatsApp');
    wa.innerHTML = '<i class="fab fa-whatsapp"></i>';

    const tooltip = document.createElement('div');
    tooltip.className = 'wa-float-tooltip';
    tooltip.textContent = currentLang === 'en' ? 'Chat on WhatsApp' : 'Discuter sur WhatsApp';

    document.body.appendChild(wa);
    document.body.appendChild(tooltip);
  }

  /* ─── Init ─── */
  function initNav() {
    buildHeader();
    buildWhatsApp();
    document.dispatchEvent(new CustomEvent('slcm:navready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
