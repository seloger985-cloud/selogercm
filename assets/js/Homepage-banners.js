/* ═══════════════════════════════════════════════════════════════
   SE LOGER CM — Bandeaux promo homepage (sans vignettes)
   ─────────────────────────────────────────────────────────────
   4 bandeaux au total : 2 en zone Location, 2 en zone Vente.
   Chaque bandeau alterne automatiquement entre 2 thèmes (4,5 s).

   BANNER_STYLE : 'slide'  → bandeau sombre auto-rotatif (défaut)
                 'ticker' → bande fine texte défilant en boucle

   POUR CHANGER LES THÈMES :
   Modifier uniquement le bloc ACTIVE_BANNERS ci-dessous.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     ZONE ÉDITORIALE — seule partie à modifier régulièrement
     ═══════════════════════════════════════════════════════════════

     BANNER_STYLE : 'slide' | 'ticker'

     ACTIVE_BANNERS — 4 bandeaux × 2 thèmes :
       rent_1a / rent_1b  → Bandeau 1 Location (entre Unfurnished et Furnished)
       rent_2a / rent_2b  → Bandeau 2 Location (entre Furnished et Locaux Commerciaux)
       sale_1a / sale_1b  → Bandeau 1 Vente (entre Villas et Terrains)
       sale_2a / sale_2b  → Bandeau 2 Vente (entre Terrains et Fonds de Commerce)

     Clés disponibles :
       'loc_2p_akwa_bali_bonapriso'      Apparts 2 pièces — Akwa·Bali·Bonapriso
       'loc_3p_bali_bonanjo_bonapriso'   Apparts 3 pièces — Bali·Bonanjo·Bonapriso
       'meubles_long_sejour'             Meublés 2&3ch long séjour
       'villas_famille'                  Villas à louer pour familles
       'petits_lots_budget'              Vente petits budgets <50M
       'lots_3b'                         Lots Bali·Bonapriso·Bonanjo
       'lancez_vous_commercial'          Biens commerciaux accessibles
       'investir_malin'                  Fonds de commerce & locaux pros
     ═══════════════════════════════════════════════════════════════ */

  const BANNER_STYLE = 'slide'; /* 'slide' | 'ticker' */

  const ACTIVE_BANNERS = {
    rent_1a: 'loc_2p_akwa_bali_bonapriso',
    rent_1b: 'loc_3p_bali_bonanjo_bonapriso',
    rent_2a: 'meubles_long_sejour',
    rent_2b: 'villas_famille',
    sale_1a: 'petits_lots_budget',
    sale_1b: 'lots_3b',
    sale_2a: 'lancez_vous_commercial',
    sale_2b: 'investir_malin'
  };

  const EDITO_OVERRIDES = {
    /* Exemple — décommenter pour surcharger le wording d'un thème :
    'loc_2p_akwa_bali_bonapriso': {
      kicker: 'Bon plan du moment',
      title:  'Apparts 2 pièces à prix doux',
      cta:    'Voir'
    }
    */
  };

  /* ═══════════════════════════════════════════════════════════════
     FIN ZONE ÉDITORIALE
     ═══════════════════════════════════════════════════════════════ */

  const THEMES = {
    /* ── Location ── */
    loc_2p_akwa_bali_bonapriso: {
      kicker:   'Disponible maintenant',
      title:    'Appartements 2 pièces — Akwa · Bali · Bonapriso',
      cta:      'Voir les 2 pièces',
      kickerEN: 'Available now',
      titleEN:  '2-bedroom apartments — Akwa · Bali · Bonapriso',
      ctaEN:    'See 2-bedroom units',
      ctaHref:  '/listings_v2.html?mode=rent&type=apartment&bedrooms=2'
    },
    loc_3p_bali_bonanjo_bonapriso: {
      kicker:   'Bon plan espace',
      title:    'Appartements 3 pièces — Bali · Bonanjo · Bonapriso',
      cta:      'Voir les 3 pièces',
      kickerEN: 'More space',
      titleEN:  '3-bedroom apartments — Bali · Bonanjo · Bonapriso',
      ctaEN:    'See 3-bedroom units',
      ctaHref:  '/listings_v2.html?mode=rent&type=apartment&bedrooms=3'
    },
    meubles_long_sejour: {
      kicker:   'Long séjour',
      title:    'Posez vos valises — meublés 2 & 3 chambres disponibles',
      cta:      'Voir les meublés',
      kickerEN: 'Long stay',
      titleEN:  'Move right in — furnished 2 & 3-bedroom units available',
      ctaEN:    'See furnished units',
      ctaHref:  '/listings_v2.html?mode=rent&furnished=true'
    },
    villas_famille: {
      kicker:   'Pour toute la famille',
      title:    'Villas spacieuses à louer — entrée en famille',
      cta:      'Voir les villas',
      kickerEN: 'For the whole family',
      titleEN:  'Spacious villas to rent — family-ready',
      ctaEN:    'See villas',
      ctaHref:  '/listings_v2.html?mode=rent&type=villa'
    },
    /* ── Vente ── */
    petits_lots_budget: {
      kicker:   'Petits budgets',
      title:    'De petits lots pour bien commencer — à partir de 5M FCFA',
      cta:      'Voir les petits lots',
      kickerEN: 'Small budgets',
      titleEN:  'Small lots to get started — from 5M FCFA',
      ctaEN:    'See small lots',
      ctaHref:  '/listings_v2.html?mode=sale&price=0-50000000'
    },
    lots_3b: {
      kicker:   'Les 3B',
      title:    'Lots en vente à Bali · Bonapriso · Bonanjo',
      cta:      'Explorer les 3B',
      kickerEN: 'The 3Bs',
      titleEN:  'Lots for sale in Bali · Bonapriso · Bonanjo',
      ctaEN:    'Explore the 3Bs',
      ctaHref:  '/listings_v2.html?mode=sale'
    },
    lancez_vous_commercial: {
      kicker:   'Lancez-vous',
      title:    'Démarrez votre activité — biens commerciaux accessibles',
      cta:      'Voir les biens pro',
      kickerEN: 'Start your business',
      titleEN:  'Launch your activity — affordable commercial properties',
      ctaEN:    'See commercial listings',
      ctaHref:  '/listings_v2.html?mode=sale&type=commercial'
    },
    investir_malin: {
      kicker:   'Investir malin',
      title:    'Fonds de commerce & locaux pros à petits prix',
      cta:      'Explorer',
      kickerEN: 'Smart investment',
      titleEN:  'Business goodwill & commercial spaces at great prices',
      ctaEN:    'Explore',
      ctaHref:  '/listings_v2.html?mode=sale&type=fonds-commerce'
    }
  };

  /* ─── LANGUE ─── */
  function getLang() {
    return localStorage.getItem('slcm_lang') || 'fr';
  }

  /* ─── HELPERS ─── */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getTheme(themeKey, lang) {
    if (!themeKey || !THEMES[themeKey]) {
      console.warn('[banners] Thème inconnu:', themeKey);
      return null;
    }
    const base = THEMES[themeKey];
    const ov   = EDITO_OVERRIDES[themeKey] || {};
    const en   = (lang || getLang()) === 'en';
    return {
      key:     themeKey,
      kicker:  ov.kicker  || (en && base.kickerEN ? base.kickerEN : base.kicker),
      title:   ov.title   || (en && base.titleEN  ? base.titleEN  : base.title),
      cta:     ov.cta     || (en && base.ctaEN    ? base.ctaEN    : base.cta),
      ctaHref: ov.ctaHref || base.ctaHref
    };
  }

  /* ─── STYLES ─── */
  function injectStyles() {
    if (document.getElementById('slcm-banner-styles')) return;
    const style = document.createElement('style');
    style.id = 'slcm-banner-styles';
    style.textContent = `
/* ── Wrapper commun ── */
.slcm-banner-wrapper { margin: 0; padding: 0; }

/* ════════════════════════════════════
   STYLE SLIDE
════════════════════════════════════ */
.slcm-slide-outer {
  padding: 20px 1rem;
  background: #f8f8f8;
}
.slcm-slide-banner {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(120deg, #111 0%, #1e1e1e 60%, #2a1a0a 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}
.slcm-slide-track {
  position: relative;
  height: 104px;
}
.slcm-slide-item {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 32px;
  opacity: 0;
  transition: opacity 0.55s ease;
  pointer-events: none;
}
.slcm-slide-item.active {
  opacity: 1;
  pointer-events: auto;
}
.slcm-slide-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 20px;
}
.slcm-slide-texts { flex: 1; min-width: 0; }
.slcm-slide-kicker {
  font-size: 10px;
  color: #ea580c;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin: 0 0 5px;
}
.slcm-slide-title {
  font-size: 17px;
  color: #fff;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slcm-slide-cta {
  font-size: 12px;
  color: #ea580c;
  text-decoration: none;
  font-weight: 800;
  padding: 9px 18px;
  border: 1.5px solid #ea580c;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background .15s, color .15s;
}
.slcm-slide-cta:hover { background: #ea580c; color: #fff; }
.slcm-slide-dots {
  position: absolute;
  bottom: 10px;
  right: 16px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.slcm-slide-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,.25);
  cursor: pointer;
  transition: background .25s, transform .25s;
}
.slcm-slide-dot.active {
  background: #ea580c;
  transform: scale(1.35);
}
.slcm-slide-banner::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 3px;
  background: #ea580c;
  border-radius: 0 3px 3px 0;
}
@media (max-width: 680px) {
  .slcm-slide-track { height: auto; min-height: 90px; }
  .slcm-slide-item { padding: 14px 18px; align-items: flex-start; }
  .slcm-slide-content { flex-direction: column; align-items: flex-start; gap: 10px; }
  .slcm-slide-title { font-size: 14px; white-space: normal; }
  .slcm-slide-cta { font-size: 11px; padding: 7px 14px; }
  .slcm-slide-dots { bottom: 8px; right: 12px; }
}

/* ════════════════════════════════════
   STYLE TICKER
════════════════════════════════════ */
.slcm-ticker-outer {
  background: #111;
  overflow: hidden;
  border-top: 1px solid rgba(255,255,255,.06);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.slcm-ticker-inner {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  animation: slcm-ticker-scroll 28s linear infinite;
  will-change: transform;
}
.slcm-ticker-outer:hover .slcm-ticker-inner {
  animation-play-state: paused;
}
@keyframes slcm-ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.slcm-ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 0 48px;
  height: 48px;
}
.slcm-ticker-item + .slcm-ticker-item {
  border-left: 1px solid rgba(255,255,255,.12);
}
.slcm-ticker-kicker {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  color: #ea580c;
  letter-spacing: 1.2px;
}
.slcm-ticker-sep { color: rgba(255,255,255,.25); font-size: 14px; }
.slcm-ticker-title {
  font-size: 13px;
  color: rgba(255,255,255,.85);
  font-weight: 500;
}
.slcm-ticker-cta {
  font-size: 11px;
  color: #ea580c;
  text-decoration: none;
  font-weight: 700;
  padding: 4px 12px;
  border: 1px solid #ea580c;
  border-radius: 999px;
  transition: background .15s, color .15s;
  flex-shrink: 0;
}
.slcm-ticker-cta:hover { background: #ea580c; color: #fff; }
`;
    document.head.appendChild(style);
  }

  /* ─── RENDER SLIDE ─── */
  function renderSlide(themes) {
    const slides = themes.map((t, i) => `
      <div class="slcm-slide-item${i === 0 ? ' active' : ''}" data-theme-key="${escapeHtml(t.key)}">
        <div class="slcm-slide-content">
          <div class="slcm-slide-texts">
            <p class="slcm-slide-kicker">${escapeHtml(t.kicker)}</p>
            <p class="slcm-slide-title">${escapeHtml(t.title)}</p>
          </div>
          <a class="slcm-slide-cta" href="${escapeHtml(t.ctaHref)}">${escapeHtml(t.cta)} →</a>
        </div>
      </div>`).join('');

    const dots = `<div class="slcm-slide-dots">${themes.map((_, i) =>
      `<span class="slcm-slide-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>`;

    return `<div class="slcm-slide-outer"><div class="slcm-slide-banner">
      <div class="slcm-slide-track">${slides}</div>${dots}
    </div></div>`;
  }

  /* ─── RENDER TICKER ─── */
  function renderTicker(themes) {
    const itemsHtml = themes.map(t => `
      <span class="slcm-ticker-item" data-theme-key="${escapeHtml(t.key)}">
        <span class="slcm-ticker-kicker">${escapeHtml(t.kicker)}</span>
        <span class="slcm-ticker-sep">·</span>
        <span class="slcm-ticker-title">${escapeHtml(t.title)}</span>
        <a class="slcm-ticker-cta" href="${escapeHtml(t.ctaHref)}">${escapeHtml(t.cta)} →</a>
      </span>`).join('');
    return `<div class="slcm-ticker-outer"><div class="slcm-ticker-inner">${itemsHtml}${itemsHtml}${itemsHtml}</div></div>`;
  }

  /* ─── MISE À JOUR LANGUE (sans re-créer le DOM) ─── */
  function applyLang(lang) {
    /* Slides */
    document.querySelectorAll('.slcm-slide-item[data-theme-key]').forEach(item => {
      const t = getTheme(item.dataset.themeKey, lang);
      if (!t) return;
      const kicker = item.querySelector('.slcm-slide-kicker');
      const title  = item.querySelector('.slcm-slide-title');
      const cta    = item.querySelector('.slcm-slide-cta');
      if (kicker) kicker.textContent = t.kicker;
      if (title)  title.textContent  = t.title;
      if (cta)  { cta.textContent = t.cta + ' →'; cta.href = t.ctaHref; }
    });
    /* Ticker — une seule mise à jour suffit (les 3 copies se synchronisent) */
    document.querySelectorAll('.slcm-ticker-item[data-theme-key]').forEach(item => {
      const t = getTheme(item.dataset.themeKey, lang);
      if (!t) return;
      const kicker = item.querySelector('.slcm-ticker-kicker');
      const title  = item.querySelector('.slcm-ticker-title');
      const cta    = item.querySelector('.slcm-ticker-cta');
      if (kicker) kicker.textContent = t.kicker;
      if (title)  title.textContent  = t.title;
      if (cta)  { cta.textContent = t.cta + ' →'; cta.href = t.ctaHref; }
    });
  }

  /* ─── AUTO-ROTATION (slide) ─── */
  function startAutoRotate(wrapper) {
    const items = wrapper.querySelectorAll('.slcm-slide-item');
    const dots  = wrapper.querySelectorAll('.slcm-slide-dot');
    if (items.length <= 1) return;
    let idx = 0;
    setInterval(() => {
      items[idx].classList.remove('active');
      dots[idx]?.classList.remove('active');
      idx = (idx + 1) % items.length;
      items[idx].classList.add('active');
      dots[idx]?.classList.add('active');
    }, 4500);
  }

  /* ─── INSERTION ─── */
  function insertBanner(keys, anchorSection, position) {
    const themes = keys.map(getTheme).filter(Boolean);
    if (!themes.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'slcm-banner-wrapper';

    if (BANNER_STYLE === 'ticker') {
      wrapper.innerHTML = renderTicker(themes);
    } else {
      wrapper.innerHTML = renderSlide(themes);
      setTimeout(() => startAutoRotate(wrapper), 50);
    }

    if (position === 'after' && anchorSection) {
      anchorSection.parentNode.insertBefore(wrapper, anchorSection.nextSibling);
    } else if (position === 'before' && anchorSection) {
      anchorSection.parentNode.insertBefore(wrapper, anchorSection);
    }
  }

  /* ─── INITIALISATION ─── */
  function init() {
    injectStyles();

    /* ── Zone LOCATION ── */
    const unfurnished  = document.getElementById('unfurnished');
    const furnished    = document.getElementById('furnishedSection');

    /* Bandeau 1 : entre Unfurnished et Furnished */
    if (unfurnished) insertBanner([ACTIVE_BANNERS.rent_1a, ACTIVE_BANNERS.rent_1b], unfurnished, 'after');
    /* Bandeau 2 : entre Furnished et Locaux Commerciaux */
    if (furnished)   insertBanner([ACTIVE_BANNERS.rent_2a, ACTIVE_BANNERS.rent_2b], furnished,   'after');

    /* ── Zone VENTE ── */
    const saleSections = document.getElementById('saleSections');
    if (saleSections) {
      const villasSection   = saleSections.querySelector('section[aria-label="Top Villas"]');
      const terrainsSection = saleSections.querySelector('section[aria-label="Top Terrains"]');
      /* Bandeau 1 : entre Villas et Terrains */
      if (villasSection)   insertBanner([ACTIVE_BANNERS.sale_1a, ACTIVE_BANNERS.sale_1b], villasSection,   'after');
      /* Bandeau 2 : entre Terrains et Fonds de Commerce */
      if (terrainsSection) insertBanner([ACTIVE_BANNERS.sale_2a, ACTIVE_BANNERS.sale_2b], terrainsSection, 'after');
    }
  }

  /* Écouter les changements de langue du site */
  document.addEventListener('slcm:langchange', (e) => applyLang(e.detail.lang));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
