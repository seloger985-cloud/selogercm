/* ═══════════════════════════════════════════════════════════════
   SE LOGER CM — Bandeaux promo dynamiques homepage
   ─────────────────────────────────────────────────────────────
   - 10 thèmes pré-configurés (filtres SQL réels sur listings)
   - 4 emplacements : 2 en mode LOUER + 2 en mode VENDRE
   - Vignettes auto-remplies depuis Supabase (3 annonces par bandeau)
   - Si 0 annonce ne matche → bandeau caché (pas de zone vide)
   - Cache sessionStorage 1h pour éviter requêtes inutiles

   POUR CHANGER LES THÈMES ACTIFS :
   Modifier les 4 lignes du bloc ACTIVE_BANNERS ci-dessous,
   commit + push GitHub. Aucune autre modif nécessaire.
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ─── CONFIGURATION : choix des thèmes actifs ─── */
  const ACTIVE_BANNERS = {
    rent_1: 'studios_80k',          // Entre unfurnished et furnished
    rent_2: 'Appartements_200k',     // Entre furnished et locaux commerciaux
    sale_1: 'ventes_50m',           // Entre villas et terrains
    sale_2: 'fonds_commerce_vente'  // Entre terrains et fonds de commerce
  };

  /* ─── DÉFINITION DES 10 THÈMES ─── */
  const THEMES = {
    studios_80k: {
      kicker: 'Cette semaine',
      title: 'Studios disponibles à moins de 80 000 FCFA',
      cta: 'Voir tous les studios <80K',
      ctaHref: '/listings_v2.html?mode=rent&type=studio&price=0-80000',
      filter: (q) => q.eq('type', 'studio').eq('rent_sale', 'rent').eq('furnished', false).lte('price', 80000)
    },
    apparts_150k: {
      kicker: 'Budget moyen',
      title: 'Appartements à moins de 150 000 FCFA',
      cta: 'Voir tous les apparts <150K',
      ctaHref: '/listings_v2.html?mode=rent&type=apartment&price=0-150000',
      filter: (q) => q.eq('type', 'apartment').eq('rent_sale', 'rent').eq('furnished', false).lte('price', 150000)
    },
    apparts_familial_200k: {
      kicker: 'Plan famille',
      title: 'Appartements familiaux 3 chambres à moins de 200 000 FCFA',
      cta: 'Voir tous les apparts 3 chambres',
      ctaHref: '/listings_v2.html?mode=rent&type=apartment&bedrooms=3&price=0-200000',
      filter: (q) => q.eq('type', 'apartment').eq('rent_sale', 'rent').gte('bedrooms', 3).lte('price', 200000)
    },
    maisons_villas_250k: {
      kicker: 'Pour la famille',
      title: 'Maisons & villas à louer moins de 250 000 FCFA',
      cta: 'Voir maisons & villas',
      ctaHref: '/listings_v2.html?mode=rent&type=villa&price=0-250000',
      filter: (q) => q.in('type', ['house', 'villa']).eq('rent_sale', 'rent').lte('price', 250000)
    },
    meubles_25k_jour: {
      kicker: 'Plan court séjour',
      title: 'Meublés à moins de 25 000 FCFA / jour',
      cta: 'Voir tous les meublés courte durée',
      ctaHref: '/listings_v2.html?mode=rent&furnished=true',
      filter: (q) => q.eq('furnished', true).eq('rent_sale', 'rent').not('price_per_day', 'is', null).lte('price_per_day', 25000)
    },
    apparts_bonapriso_premium: {
      kicker: 'Quartier Bonapriso',
      title: 'Appartements premium Bonapriso à moins de 500 000 FCFA',
      cta: 'Voir tous les apparts Bonapriso',
      ctaHref: '/listings_v2.html?mode=rent&district=Bonapriso',
      filter: (q) => q.eq('type', 'apartment').eq('district', 'Bonapriso').eq('rent_sale', 'rent').lte('price', 500000)
    },
    entrepots_2000_m2: {
      kicker: 'Pour entreprises',
      title: 'Entrepôts à moins de 2 000 FCFA/m²',
      cta: 'Voir tous les entrepôts',
      ctaHref: '/listings_v2.html?mode=rent&type=warehouse',
      filter: (q) => q.eq('type', 'warehouse').eq('rent_sale', 'rent'),
      postFilter: (items) => items.filter(item => {
        const sup = parseFloat(item.superficie);
        const px  = parseFloat(item.price);
        return sup > 0 && (px / sup) <= 2000;
      })
    },
    fonds_commerce_vente: {
      kicker: 'Vous voulez lancer un projet ?',
      title: 'Visitez nos fonds de commerce à vendre',
      cta: 'Voir tous les fonds de commerce',
      ctaHref: '/listings_v2.html?mode=sale&type=fonds-commerce',
      filter: (q) => q.eq('type', 'fonds-commerce').eq('rent_sale', 'sale')
    },
    ventes_50m: {
      kicker: 'Petits lots, petits budgets',
      title: 'Annonces à vendre à moins de 50 millions FCFA',
      cta: 'Voir toutes les ventes <50M',
      ctaHref: '/listings_v2.html?mode=sale&price=0-50000000',
      filter: (q) => q.eq('rent_sale', 'sale').lte('price', 50000000)
    },
    meubles_annuels_bonapriso: {
      kicker: 'Débarque avec tes valises !',
      title: 'Meublés en location annuelle à Bonapriso',
      cta: 'Voir tous les meublés Bonapriso',
      ctaHref: '/listings_v2.html?mode=rent&district=Bonapriso&furnished=true',
      filter: (q) => q.eq('type', 'apartment').eq('district', 'Bonapriso').eq('furnished', true).eq('rent_sale', 'rent').is('price_per_day', null)
    }
  };

  /* ─── HELPERS ─── */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtPrice(n) {
    return Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  /* ─── CACHE LOCAL (1h) ─── */
  const CACHE_KEY_PREFIX = 'slcm_banner_';
  const CACHE_TTL = 60 * 60 * 1000;

  function getCache(key) {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch (e) { return null; }
  }
  function setCache(key, data) {
    try {
      sessionStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) {}
  }

  /* ─── REQUÊTE SUPABASE D'UN THÈME ─── */
  async function fetchThemeListings(themeKey) {
    const cached = getCache(themeKey);
    if (cached) return cached;

    const theme = THEMES[themeKey];
    if (!theme) {
      console.warn('[banners] Thème inconnu:', themeKey);
      return [];
    }

    /* Attendre que Supabase soit prêt */
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!window.SLCM_DB || !window.SLCM_DB.client) {
      console.warn('[banners] Supabase indisponible');
      return [];
    }

    const client = window.SLCM_DB.client;
    let query = client.from('listings').select('*').eq('status', 'active');
    query = theme.filter(query);
    query = query.order('created_at', { ascending: false }).limit(theme.postFilter ? 20 : 6);

    const { data, error } = await query;
    if (error) {
      console.warn('[banners] Erreur fetch:', themeKey, error.message);
      return [];
    }

    let items = data || [];
    if (theme.postFilter) items = theme.postFilter(items).slice(0, 6);

    setCache(themeKey, items);
    return items;
  }

  /* ─── RENDU D'UNE VIGNETTE ─── */
  function renderTile(listing, themeKey) {
    const photo = listing.cover_url || listing.photo1 || listing.image_url || '';
    const district = listing.district || listing.city || 'Douala';
    const title = listing.title || (listing.type || 'Annonce');

    let priceLabel;
    if (themeKey === 'meubles_25k_jour' && listing.price_per_day) {
      priceLabel = fmtPrice(listing.price_per_day) + ' / jour';
    } else if (themeKey === 'entrepots_2000_m2' && listing.superficie > 0) {
      const pxm2 = Math.round(listing.price / listing.superficie);
      priceLabel = fmtPrice(listing.price) + ' (' + fmtPrice(pxm2) + '/m²)';
    } else {
      priceLabel = fmtPrice(listing.price);
    }

    const slug = listing.slug || listing.id;
    const url = '/annonce/' + encodeURIComponent(slug);

    return ''
      + '<a class="slcm-banner-tile" href="' + escapeHtml(url) + '">'
      +   '<div class="slcm-banner-tile-photo">'
      +     (photo ? '<img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(title) + '" loading="lazy">' : '<span>photo</span>')
      +   '</div>'
      +   '<div class="slcm-banner-tile-body">'
      +     '<p class="slcm-banner-tile-title">' + escapeHtml(title) + '</p>'
      +     '<p class="slcm-banner-tile-meta">' + escapeHtml(district) + '</p>'
      +     '<p class="slcm-banner-tile-price">' + escapeHtml(priceLabel) + '</p>'
      +   '</div>'
      + '</a>';
  }

  /* ─── RENDU D'UN BANDEAU COMPLET ─── */
  function renderBanner(theme, items, themeKey) {
    const tilesHtml = items.slice(0, 3).map(item => renderTile(item, themeKey)).join('');
    return ''
      + '<div class="slcm-banner">'
      +   '<div class="slcm-banner-head">'
      +     '<div class="slcm-banner-titles">'
      +       '<p class="slcm-banner-kicker">' + escapeHtml(theme.kicker) + '</p>'
      +       '<p class="slcm-banner-title">' + escapeHtml(theme.title) + '</p>'
      +     '</div>'
      +     '<a class="slcm-banner-cta" href="' + escapeHtml(theme.ctaHref) + '">'
      +       escapeHtml(theme.cta) + ' →'
      +     '</a>'
      +   '</div>'
      +   '<div class="slcm-banner-tiles">' + tilesHtml + '</div>'
      + '</div>';
  }

  /* ─── INJECTION DES STYLES UNE SEULE FOIS ─── */
  function injectStyles() {
    if (document.getElementById('slcm-banner-styles')) return;
    const style = document.createElement('style');
    style.id = 'slcm-banner-styles';
    style.textContent = ''
      + '.slcm-banner-wrapper { padding: 0 1rem; }'
      + '.slcm-banner { max-width: 760px; margin: 0 auto 2rem; background: #fff; border: 1px solid #ffe0b2; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.04); }'
      + '.slcm-banner-head { background: #fff7ed; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #ffe0b2; flex-wrap: wrap; }'
      + '.slcm-banner-titles { flex: 1; min-width: 200px; }'
      + '.slcm-banner-kicker { font-size: 11px; color: #c2410c; margin: 0; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }'
      + '.slcm-banner-title { font-size: 15px; color: #111; margin: 2px 0 0; font-weight: 600; line-height: 1.3; }'
      + '.slcm-banner-cta { font-size: 12px; color: #ea580c; text-decoration: none; font-weight: 700; white-space: nowrap; padding: 6px 12px; border-radius: 6px; transition: background .15s; }'
      + '.slcm-banner-cta:hover { background: rgba(234, 88, 12, 0.08); }'
      + '.slcm-banner-tiles { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: #f0f0f0; }'
      + '.slcm-banner-tile { background: #fff; padding: 12px; text-decoration: none; color: inherit; transition: background .15s; display: block; }'
      + '.slcm-banner-tile:hover { background: #fafafa; }'
      + '.slcm-banner-tile-photo { background: #f3f4f6; height: 110px; border-radius: 6px; margin-bottom: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px; }'
      + '.slcm-banner-tile-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }'
      + '.slcm-banner-tile-title { font-size: 13px; margin: 0 0 2px; font-weight: 600; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
      + '.slcm-banner-tile-meta { font-size: 11px; color: #666; margin: 0 0 4px; }'
      + '.slcm-banner-tile-price { font-size: 14px; color: #ea580c; margin: 0; font-weight: 700; }'
      + '@media (max-width: 700px) { .slcm-banner-tiles { grid-template-columns: 1fr; } .slcm-banner-tile-photo { height: 90px; } .slcm-banner-head { padding: 10px 14px; } .slcm-banner-cta { padding: 4px 8px; font-size: 11px; } }';
    document.head.appendChild(style);
  }

  /* ─── INSERTION D'UN BANDEAU À UN EMPLACEMENT ─── */
  async function insertBanner(themeKey, anchorSection, position) {
    if (!themeKey || !THEMES[themeKey]) return;
    const theme = THEMES[themeKey];
    const items = await fetchThemeListings(themeKey);
    if (!items.length) {
      console.log('[banners] Pas d\'annonces pour le thème:', themeKey, '→ bandeau caché');
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'slcm-banner-wrapper';
    wrapper.innerHTML = renderBanner(theme, items, themeKey);
    if (position === 'after' && anchorSection) {
      anchorSection.parentNode.insertBefore(wrapper, anchorSection.nextSibling);
    } else if (position === 'before' && anchorSection) {
      anchorSection.parentNode.insertBefore(wrapper, anchorSection);
    }
  }

  /* ─── INITIALISATION ─── */
  async function init() {
    injectStyles();

    const unfurnished = document.getElementById('unfurnished');
    if (unfurnished) await insertBanner(ACTIVE_BANNERS.rent_1, unfurnished, 'after');

    const furnished = document.getElementById('furnishedSection');
    if (furnished) await insertBanner(ACTIVE_BANNERS.rent_2, furnished, 'after');

    const saleSections = document.getElementById('saleSections');
    if (saleSections) {
      const villasSection = saleSections.querySelector('section[aria-label="Top Villas"]');
      if (villasSection) await insertBanner(ACTIVE_BANNERS.sale_1, villasSection, 'after');
      const terrainsSection = saleSections.querySelector('section[aria-label="Top Terrains"]');
      if (terrainsSection) await insertBanner(ACTIVE_BANNERS.sale_2, terrainsSection, 'after');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
