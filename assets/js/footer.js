/**
 * footer.js — SE LOGER CM
 * Footer uniforme bilingue FR/EN sur toutes les pages
 * Se regénère automatiquement au changement de langue
 * L'adresse physique est invariable (FR et EN identiques)
 */
(function () {

  const style = document.createElement('style');
  style.textContent = `
    footer { background: #111; color: #fff; padding: 2.5rem 0 1.5rem; margin-top: auto; }
    .footer-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
    .footer-top {
      display: grid; grid-template-columns: 1.4fr repeat(3, 1fr);
      gap: 2rem; padding-bottom: 2rem;
      border-bottom: 1px solid rgba(255,255,255,.1);
    }
    .footer-brand-col .footer-logo { height: 36px; margin-bottom: .75rem; }
    .footer-brand-col .footer-name { font-size: 1.1rem; font-weight: 900; display: block; margin-bottom: .5rem; }
    .footer-brand-col p { font-size: .82rem; color: rgba(255,255,255,.55); line-height: 1.6; margin-bottom: 1rem; }
    .footer-social { display: flex; gap: .75rem; }
    .footer-social a {
      width: 34px; height: 34px; border-radius: 8px;
      background: rgba(255,255,255,.08); color: #fff;
      display: flex; align-items: center; justify-content: center;
      text-decoration: none; font-size: .9rem; transition: background .2s;
    }
    .footer-social a:hover { background: #ff7a00; }
    .footer-col h4 {
      font-size: .8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: rgba(255,255,255,.45); margin-bottom: .9rem;
    }
    .footer-col ul { list-style: none; padding: 0; margin: 0; }
    .footer-col ul li { margin-bottom: .55rem; }
    .footer-col ul a { color: rgba(255,255,255,.7); text-decoration: none; font-size: .87rem; font-weight: 500; transition: color .2s; }
    .footer-col ul a:hover { color: #ff7a00; }
    .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 1.2rem; flex-wrap: wrap; gap: .5rem; }
    .footer-copy { font-size: .78rem; color: rgba(255,255,255,.35); }
    .footer-legal { display: flex; gap: 1rem; }
    .footer-legal a { font-size: .78rem; color: rgba(255,255,255,.35); text-decoration: none; }
    .footer-legal a:hover { color: rgba(255,255,255,.7); }
    @media (max-width: 768px) { .footer-top { grid-template-columns: 1fr 1fr; } .footer-brand-col { grid-column: 1 / -1; } }
    @media (max-width: 480px) { .footer-top { grid-template-columns: 1fr; } .footer-bottom { flex-direction: column; text-align: center; } }
  `;
  document.head.appendChild(style);

  function getLang() { return localStorage.getItem('slcm_lang') || 'fr'; }

  /* Adresse invariable FR/EN */
  const ADDR = 'Blvd de la République, Bonamoussadi';

  const C = {
    tagline: {
      fr: 'Unique Solutions, Smart Living.<br>Votre partenaire immobilier de confiance à Douala.',
      en: 'Unique Solutions, Smart Living.<br>Your trusted real estate partner in Douala.'
    },
    colNav:      { fr: 'Navigation', en: 'Navigation' },
    colServices: { fr: 'Services',   en: 'Services'   },
    colContact:  { fr: 'Contact',    en: 'Contact'     },
    navLinks: {
      fr: [
        { href: 'index.html',       label: 'Accueil' },
        { href: 'listings_v2.html', label: 'Annonces' },
        { href: 'publish.html',     label: 'Publier une annonce' },
        { href: 'blog.html',        label: 'Blog' },
      ],
      en: [
        { href: 'index.html',       label: 'Home' },
        { href: 'listings_v2.html', label: 'Listings' },
        { href: 'publish.html',     label: 'List your ad' },
        { href: 'blog.html',        label: 'Blog' },
      ]
    },
    serviceLinks: {
      fr: [
        { href: 'services.html',           label: 'Nos services' },
        { href: 'services.html#location',  label: 'Location' },
        { href: 'services.html#vente',     label: 'Vente' },
        { href: 'services.html#gestion',   label: 'Gestion locative' },
        { href: '/pricing',                label: 'Tarifs & Boost' },
      ],
      en: [
        { href: 'services.html',           label: 'Our services' },
        { href: 'services.html#location',  label: 'Rental' },
        { href: 'services.html#vente',     label: 'Sale' },
        { href: 'services.html#gestion',   label: 'Property management' },
        { href: '/pricing',                label: 'Pricing & Boost' },
      ]
    },
    contactLinks: {
      fr: [
        { href: 'about.html',                 label: 'À propos' },
        { href: 'rdv.html',                   label: 'Prendre RDV' },
        { href: 'rdv.html',                   label: ADDR,              icon: 'fa-map-marker-alt' },
        { href: 'tel:+237650840714',          label: '(+237) 650 840 714', icon: 'fa-phone' },
        { href: 'https://wa.me/237650840714', label: 'WhatsApp', target: '_blank' },
      ],
      en: [
        { href: 'about.html',                 label: 'About us' },
        { href: 'rdv.html',                   label: 'Book a meeting' },
        { href: 'rdv.html',                   label: ADDR,              icon: 'fa-map-marker-alt' },
        { href: 'tel:+237650840714',          label: '(+237) 650 840 714', icon: 'fa-phone' },
        { href: 'https://wa.me/237650840714', label: 'WhatsApp', target: '_blank' },
      ]
    },
    copyright: {
      fr: (y) => `© ${y} SE LOGER CM — Tous droits réservés.`,
      en: (y) => `© ${y} SE LOGER CM — All rights reserved.`
    },
    legal:   { fr: 'Mentions légales', en: 'Legal notice' },
    privacy: { fr: 'Confidentialité',  en: 'Privacy'      },
    cgu:     { fr: 'CGU',              en: 'Terms'        },
    cookies: { fr: 'Cookies',          en: 'Cookies'      },
  };

  function buildFooter() {
    const el = document.querySelector('footer');
    if (!el) return;
    const lang = getLang();
    const year = new Date().getFullYear();
    const links = (list) => list.map(l => `
      <li><a href="${l.href}"${l.target ? ` target="${l.target}" rel="noopener"` : ''}>
        ${l.icon ? `<i class="fas ${l.icon}" style="font-size:.75rem;margin-right:.3rem"></i>` : ''}${l.label}
      </a></li>`).join('');

    el.innerHTML = `
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-col">
            <picture>
              <source srcset="/assets/img/logo.webp" type="image/webp">
              <img src="/assets/img/logo.png" alt="SE LOGER CM" class="footer-logo" width="120" height="36">
            </picture>
            <span class="footer-name">SE LOGER CM</span>
            <p>${C.tagline[lang]}</p>
            <div class="footer-social">
              <a href="https://wa.me/237650840714" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
              <a href="https://t.me/seloger237" target="_blank" rel="noopener" aria-label="Telegram"><i class="fab fa-telegram"></i></a>
              <a href="https://www.tiktok.com/@se.loger6" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
            </div>
          </div>
          <div class="footer-col"><h4>${C.colNav[lang]}</h4><ul>${links(C.navLinks[lang])}</ul></div>
          <div class="footer-col"><h4>${C.colServices[lang]}</h4><ul>${links(C.serviceLinks[lang])}</ul></div>
          <div class="footer-col"><h4>${C.colContact[lang]}</h4><ul>${links(C.contactLinks[lang])}</ul></div>
        </div>
        <!-- Recherches populaires — maillage interne SEO -->
        <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:1.2rem;margin-top:1rem">
          <p style="font-size:.72rem;font-weight:700;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.8px;margin-bottom:.6rem">
            ${lang === 'fr' ? 'Recherches populaires' : 'Popular searches'}
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem .8rem">
            ${[
              { href: '/appartements-bonapriso',    fr: 'Appartements Bonapriso',    en: 'Apartments Bonapriso'   },
              { href: '/appartements-bali',         fr: 'Appartements Bali',          en: 'Apartments Bali'        },
              { href: '/appartements-bonanjo',      fr: 'Appartements Bonanjo',       en: 'Apartments Bonanjo'     },
              { href: '/studios-bali',              fr: 'Studios Bali',               en: 'Studios Bali'           },
              { href: '/studios-bonapriso',         fr: 'Studios Bonapriso',          en: 'Studios Bonapriso'      },
              { href: '/villas-a-louer-douala',     fr: 'Villas à louer Douala',      en: 'Villas for rent Douala' },
              { href: '/maisons-a-louer-douala',    fr: 'Maisons à louer Douala',     en: 'Houses for rent Douala' },
              { href: '/appartements-meubles-douala', fr: 'Appartements meublés',     en: 'Furnished apartments'   },
              { href: '/terrains-a-vendre-bonapriso', fr: 'Terrains Bonapriso',       en: 'Land Bonapriso'         },
              { href: '/appartements-bonamoussadi', fr: 'Appartements Bonamoussadi',  en: 'Apartments Bonamoussadi'},
              { href: '/douala',                    fr: 'Immobilier à Douala',         en: 'Real estate Douala'      },
            ].map(l => `<a href="${l.href}" style="font-size:.75rem;color:rgba(255,255,255,.45);text-decoration:none;transition:color .2s" onmouseover="this.style.color='#ff7a00'" onmouseout="this.style.color='rgba(255,255,255,.45)'">${lang === 'fr' ? l.fr : l.en}</a>`).join('')}
          </div>
        </div>

        <div class="footer-bottom">
          <p class="footer-copy">${C.copyright[lang](year)}</p>
          <div class="footer-legal">
            <a href="/mentions-legales">${C.legal[lang]}</a>
            <a href="/confidentialite">${C.privacy[lang]}</a>
            <a href="/cgu">${C.cgu[lang]}</a>
            <a href="/cookies">${C.cookies[lang]}</a>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildFooter);
  } else {
    buildFooter();
  }

  document.addEventListener('slcm:langchange', buildFooter);

})();
