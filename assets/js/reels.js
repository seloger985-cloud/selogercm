/**
 * SE LOGER CM — Reels Visites Express
 * Section vidéo verticale sur la homepage.
 *
 * Architecture :
 *   - DESKTOP (≥ 768px) : carousel horizontal Netflix-like (vidéo centrale + latérales)
 *   - MOBILE (< 768px)  : bande compacte de vignettes verticales sur la homepage,
 *                         le tap ouvre un viewer modal plein écran TikTok (swipe vertical)
 *
 * Source : table `listings` où `video_url IS NOT NULL` et `status = 'active'`.
 * Bucket Supabase Storage : listing-videos
 *
 * Sélection :
 *   - Desktop : 6 reels (premium d'abord, puis date)
 *   - Mobile  : 8 reels avec quota éditorial (5 non-meublés + 2 meublés/commerciaux + 1 vente)
 */

const SLCM_reels = (() => {

  const MOBILE_BREAKPOINT = 768;
  const DESKTOP_LIMIT = 12; /* Carrousel Netflix fusionné sur desktop */
  const MOBILE_LIMIT  = 6;  /* 6 vidéos par section sur mobile */

  /* Quota mobile pour la section 1 (homepage)
     La section 2 mobile est dédiée aux meublés + commerciaux + studios,
     donc inutile de doublonner ici. Section 1 = location non meublée + vente. */
  const MOBILE_QUOTA = {
    rentUnfurnished: 5,
    sale: 1
    /* Total = MOBILE_LIMIT = 6 */
  };

  let reels = [];
  let isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  let activeIndex = 0;
  let viewerOpen = false;
  let viewerIndex = 0;
  let _viewerReels = null; /* reels actifs dans le viewer (null = section 1) */

  async function sb() {
    return window.SLCM_DB ? window.SLCM_DB.init() : null;
  }

  /* ── Lecteur vidéo universel : MP4 + HLS (hls.js pour Chrome/Firefox, natif pour Safari) ── */
  function loadVideo(videoEl, src, autoplay) {
    if (!src || !videoEl) return;
    const isHLS = src.includes('.m3u8') || src.includes('videodelivery.net');

    /* Détruire une instance hls.js précédente */
    if (videoEl._hls) { videoEl._hls.destroy(); videoEl._hls = null; }

    if (isHLS) {
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        /* Safari : HLS natif */
        videoEl.src = src;
        if (autoplay) videoEl.play().catch(() => {});
      } else if (window.Hls && Hls.isSupported()) {
        /* Chrome / Firefox via hls.js — config optimisée démarrage rapide mobile */
        const hls = new Hls({
          enableWorker:       false,
          startLevel:         2,      /* qualité moyenne d'entrée (pas la plus basse) */
          maxBufferLength:    8,
          maxMaxBufferLength: 15,
          autoStartLoad:      true,
          manifestLoadingMaxRetry: 3,
          fragLoadingMaxRetry:     3,
        });
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoplay) videoEl.play().catch(() => {});
        });
        videoEl._hls = hls;
      } else {
        videoEl.src = src;
        if (autoplay) videoEl.play().catch(() => {});
      }
    } else {
      /* MP4 standard */
      videoEl.src = src;
      if (autoplay) videoEl.play().catch(() => {});
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtPrice(n) {
    if (window.SLCM_listings && window.SLCM_listings.fmtPrice) {
      return window.SLCM_listings.fmtPrice(n);
    }
    return (n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  function categorize(r) {
    if (r.rent_sale === 'sale') return 'sale';
    if (r.furnished === true)   return 'rentFurnishedOrCommercial';
    if (r.type === 'commercial' || r.type === 'warehouse') return 'rentFurnishedOrCommercial';
    return 'rentUnfurnished';
  }

  function applyMobileQuota(allReels) {
    const buckets = { rentUnfurnished: [], rentFurnishedOrCommercial: [], sale: [] };
    allReels.forEach(r => buckets[categorize(r)].push(r));

    const selected = [];
    const used = new Set();

    Object.entries(MOBILE_QUOTA).forEach(([cat, quota]) => {
      buckets[cat].slice(0, quota).forEach(r => {
        selected.push(r);
        used.add(r.id);
      });
    });

    if (selected.length < MOBILE_LIMIT) {
      for (const r of allReels) {
        if (selected.length >= MOBILE_LIMIT) break;
        if (!used.has(r.id)) { selected.push(r); used.add(r.id); }
      }
    }

    return selected.sort((a, b) => {
      if (a.premium !== b.premium) return a.premium ? -1 : 1;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }

  async function loadReels() {
    /* Pool unique Supabase (source de vérité unique).
       Plus de tag CF nécessaire : la catégorisation section-1/section-2 se fait
       en JS via getSection() en utilisant furnished + type de la base.

       Pourquoi ce changement :
       - Les vidéos uploadées en direct sur le dashboard CF n'ont pas de tag
         meta.section (le système Tags du dashboard n'est pas exposé dans meta).
       - En lisant directement Supabase, toute annonce active avec video_url
         devient automatiquement visible, peu importe d'où vient la vidéo.
       - La règle métier reste : section-2 = meublé OU studio/commercial/office. */
    const all = await loadAllReelsFromSupabase();
    if (!all.length) return [];

    /* Filtrer pour la section 1 : non meublé ET pas studio/commercial/office */
    const section1 = all.filter(r => getSection(r) === 'section-1');
    const rotated = rotatePool(section1);
    if (isMobile) return applyMobileQuota(rotated);
    return rotated.slice(0, DESKTOP_LIMIT);
  }

  /* Lecture unique du pool Supabase — source de vérité unique pour les 2 sections.
     Renvoie toutes les annonces actives ayant une video_url, sans filtre catégorie. */
  async function loadAllReelsFromSupabase() {
    const client = await sb();
    if (!client) { console.warn('[reels] Supabase indisponible'); return []; }
    const { data, error } = await client
      .from('listings')
      .select('id, title, city, district, price, rent_sale, type, furnished, video_url, images, premium, created_at, owner_phone, owner_id, slug')
      .eq('status', 'active')
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error('[reels] loadAllReelsFromSupabase:', error); return []; }
    let rows = (data || []).filter(r => r.video_url?.trim());
    /* #3 — Numéro de contact = profil agent (à jour) → snapshot annonce → numéro par défaut.
       Évite que la mise à jour du contact sur le profil ne se reflète pas dans les Réels. */
    try {
      const ownerIds = [...new Set(rows.map(r => r.owner_id).filter(Boolean))];
      if (ownerIds.length) {
        const { data: profs } = await client.from('public_listing_contacts').select('id, agent_phone, phone').in('id', ownerIds);
        const pmap = {};
        (profs || []).forEach(p => { pmap[p.id] = p; });
        rows.forEach(r => {
          const p = pmap[r.owner_id] || {};
          r.owner_phone = p.agent_phone || p.phone || r.owner_phone || '237650840714';
        });
      } else {
        rows.forEach(r => { r.owner_phone = r.owner_phone || '237650840714'; });
      }
    } catch (e) { rows.forEach(r => { r.owner_phone = r.owner_phone || '237650840714'; }); }
    return rows;
  }

  /* #2 — Ouvre WhatsApp depuis un bouton reel/viewer (lit data-wa-listing). */
  function openReelWhatsApp(btn) {
    let d = {};
    try { d = JSON.parse(btn.getAttribute('data-wa-listing') || '{}'); } catch (e) {}
    let phone = String(d.owner_phone || '237650840714').replace(/\D/g, '');
    if (phone.length === 9) phone = '237' + phone;            /* numéro CM sans indicatif */
    const parts = ['Bonjour, je suis intéressé(e) par votre annonce'];
    if (d.title) parts.push(' « ' + d.title + ' »');
    if (d.price) parts.push(' (' + d.price + ')');
    if (d.location) parts.push(' à ' + d.location);
    parts.push(', vue dans les Réels SE LOGER CM. Est-elle toujours disponible ?');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(parts.join('')), '_blank');
  }

  /* Catégorisation dynamique d'un reel.
     - section-2 si meublé (furnished=true) OU type IN (studio, commercial, office)
     - section-1 sinon (location non meublée, apartment/villa/house/duplex) */
  function getSection(r) {
    if (r.furnished === true) return 'section-2';
    if (r.type === 'studio' || r.type === 'commercial' || r.type === 'office') return 'section-2';
    return 'section-1';
  }

  /* Rotation déterministe basée sur l'heure (tranches de 1h).
     Pool trié du plus récent au plus ancien. Décalage circulaire chaque heure
     pour exposer tous les reels équitablement. */
  function rotatePool(arr) {
    if (arr.length <= 1) return arr;
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const seed = Math.floor(Date.now() / ONE_HOUR_MS);
    const offset = seed % arr.length;
    return [...arr.slice(offset), ...arr.slice(0, offset)];
  }

  /* ════════════════════ STYLES ════════════════════ */
  function injectStyles() {
    if (document.getElementById('slcmReelsStyles')) return;
    const style = document.createElement('style');
    style.id = 'slcmReelsStyles';
    /* [id^="reelsSection"] cible [id^="reelsSection"] ET #reelsSection2 */
    style.textContent = `
      [id^="reelsSection"] {
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      [id^="reelsSection"].is-empty { display: none; }

      @keyframes reelPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
        50%      { opacity: .4; box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      /* ══════ DESKTOP — carousel inchangé ══════ */
      @media (min-width: ${MOBILE_BREAKPOINT}px) {
        [id^="reelsSection"] { padding: 2.5rem 0 3rem; }
        [id^="reelsSection"] .reels-header {
          max-width: 1200px; margin: 0 auto 1.5rem; padding: 0 1rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }
        [id^="reelsSection"] .reels-title {
          font-size: 1.5rem; font-weight: 900; margin: 0;
          display: flex; align-items: center; gap: .6rem;
        }
        [id^="reelsSection"] .reels-title .pulse-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #ef4444; animation: reelPulse 1.5s ease-in-out infinite;
        }
        [id^="reelsSection"] .reels-sub { font-size: .85rem; color: #aaa; margin: 0; }
        [id^="reelsSection"] .reels-viewport {
          max-width: 1200px; margin: 0 auto; padding: 0 1rem;
          overflow: hidden; position: relative; min-height: 600px;
        }
        [id^="reelsSection"] .reels-track {
          display: flex; align-items: center; gap: 1rem;
          padding-left: calc(50% - 160px);
          padding-right: calc(50% - 160px);
          transition: transform .5s cubic-bezier(.2,.9,.3,1);
          will-change: transform;
        }
        [id^="reelsSection"] .reel-card {
          flex-shrink: 0;
          width: 200px; height: 355px;
          border-radius: 16px; overflow: hidden; position: relative;
          background: #000; cursor: pointer;
          transition: transform .4s cubic-bezier(.2,.9,.3,1),
                      width .4s cubic-bezier(.2,.9,.3,1),
                      height .4s cubic-bezier(.2,.9,.3,1),
                      opacity .3s;
          opacity: .55;
        }
        [id^="reelsSection"] .reel-card.is-active {
          width: 320px; height: 570px;
          opacity: 1; z-index: 2;
          box-shadow: 0 25px 60px rgba(255,122,0,.25);
        }
        [id^="reelsSection"] .reel-card:not(.is-active):hover { opacity: .8; }
        [id^="reelsSection"] .reel-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(255,255,255,.95); color: #111;
          border: none; cursor: pointer; z-index: 10;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,.3);
          transition: transform .2s;
        }
        [id^="reelsSection"] .reel-nav:hover { transform: translateY(-50%) scale(1.1); }
        [id^="reelsSection"] .reel-prev { left: 1rem; }
        [id^="reelsSection"] .reel-next { right: 1rem; }
        [id^="reelsSection"] .reel-nav:disabled { opacity: .35; cursor: not-allowed; }
      }

      /* ══════ MOBILE — bande de vignettes ══════ */
      @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
        [id^="reelsSection"] { padding: 1rem 0 1.25rem; }
        [id^="reelsSection"] .reels-header {
          padding: 0 1rem .75rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        [id^="reelsSection"] .reels-title {
          font-size: 1rem; font-weight: 800; margin: 0;
          display: flex; align-items: center; gap: .5rem; color: #fff;
        }
        [id^="reelsSection"] .reels-title .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #ef4444; animation: reelPulse 1.5s ease-in-out infinite;
        }
        [id^="reelsSection"] .reels-sub { font-size: .75rem; color: #aaa; margin: 0; }
        [id^="reelsSection"] .reels-strip {
          display: flex; gap: .6rem;
          padding: 0 1rem .25rem;
          overflow-x: auto; overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        [id^="reelsSection"] .reels-strip::-webkit-scrollbar { display: none; }
        [id^="reelsSection"] .reel-thumb {
          flex-shrink: 0;
          width: 110px; height: 195px;
          border-radius: 12px; overflow: hidden;
          position: relative; background: #000;
          cursor: pointer;
          scroll-snap-align: start;
          border: none; padding: 0;
          touch-action: manipulation;
          -webkit-tap-highlight-color: rgba(255,122,0,.3);
        }
        [id^="reelsSection"] .reel-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        [id^="reelsSection"] .reel-thumb-overlay {
          position: absolute; left: 0; right: 0; bottom: 0;
          padding: .5rem;
          background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 100%);
          color: #fff; pointer-events: none;
        }
        [id^="reelsSection"] .reel-thumb-title {
          font-size: .7rem; font-weight: 700; margin: 0 0 .15rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,.6);
        }
        [id^="reelsSection"] .reel-thumb-price {
          font-size: .7rem; font-weight: 800; color: #ff9633; margin: 0;
        }
        [id^="reelsSection"] .reel-thumb-premium {
          position: absolute; top: .35rem; left: .35rem;
          background: #ff7a00; color: #fff;
          font-size: .55rem; font-weight: 900;
          padding: .15rem .35rem; border-radius: 3px;
          letter-spacing: .3px;
        }
        [id^="reelsSection"] .reel-thumb-play {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(0,0,0,.55); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem;
          backdrop-filter: blur(4px);
          pointer-events: none;
        }
        /* B2 — Indicateur 'Voir les annonces' mobile (juste sous la bande) */
        [id^="reelsSection"] .reels-cta-next {
          margin: .9rem 1rem 0;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.15);
          color: #fff;
          padding: .55rem 1rem;
          border-radius: 999px;
          font-size: .8rem;
          font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          gap: .4rem;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: rgba(255,255,255,.1);
          width: calc(100% - 2rem);
          transition: background .2s;
        }
        [id^="reelsSection"] .reels-cta-next:active {
          background: rgba(255,255,255,.15);
        }
        [id^="reelsSection"] .reels-cta-next .arrow {
          display: inline-block;
          animation: reelsCtaArrow 1.6s ease-in-out infinite;
        }
        @keyframes reelsCtaArrow {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(3px); }
        }
      }

      /* ══════ VIEWER MODAL (mobile, plein écran) ══════ */
      #slcmReelViewer {
        position: fixed; inset: 0;
        z-index: 99999;
        background: #000;
        display: none;
        flex-direction: column;
      }
      #slcmReelViewer.is-open { display: flex; }
      body.slcm-reel-viewer-open { overflow: hidden !important; }

      #slcmReelViewer .viewer-track {
        flex: 1;
        overflow-y: auto;
        scroll-snap-type: y mandatory;
        scroll-snap-stop: always;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      #slcmReelViewer .viewer-track::-webkit-scrollbar { display: none; }
      #slcmReelViewer .viewer-slide {
        height: 100vh; height: 100dvh;
        width: 100%;
        scroll-snap-align: start;
        scroll-snap-stop: always;
        position: relative;
        background: #000;
      }
      #slcmReelViewer .viewer-video {
        width: 100%; height: 100%;
        object-fit: cover; display: block; background: #000;
      }
      #slcmReelViewer .viewer-close {
        position: absolute; top: 1rem; right: 1rem;
        z-index: 10;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,.95); color: #111;
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem; font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,.4);
        touch-action: manipulation;
      }
      #slcmReelViewer .viewer-counter {
        position: absolute; top: 1rem; left: 1rem;
        z-index: 10;
        background: rgba(0,0,0,.5); color: #fff;
        padding: .35rem .7rem; border-radius: 999px;
        font-size: .75rem; font-weight: 700;
        backdrop-filter: blur(8px);
      }
      #slcmReelViewer .viewer-sound {
        position: absolute; top: 4.5rem; right: 1rem;
        z-index: 10;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(0,0,0,.5); color: #fff;
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: .95rem;
        backdrop-filter: blur(6px);
        touch-action: manipulation;
      }
      #slcmReelViewer .viewer-premium {
        position: absolute; top: 4.5rem; left: 1rem;
        z-index: 5;
        background: #ff7a00; color: #fff;
        font-size: .65rem; font-weight: 900;
        padding: .25rem .55rem; border-radius: 4px;
        letter-spacing: .5px;
      }
      #slcmReelViewer .viewer-info {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 1rem 1rem 1.5rem;
        background: linear-gradient(0deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 100%);
        color: #fff; pointer-events: none;
      }
      #slcmReelViewer .viewer-info a,
      #slcmReelViewer .viewer-info button { pointer-events: auto; }
      #slcmReelViewer .viewer-title {
        font-size: 1rem; font-weight: 800; margin: 0 0 .35rem;
        text-shadow: 0 1px 3px rgba(0,0,0,.6);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #slcmReelViewer .viewer-loc { font-size: .8rem; opacity: .9; margin: 0 0 .5rem; }
      #slcmReelViewer .viewer-price {
        font-size: 1.05rem; font-weight: 900; color: #ff9633; margin: 0 0 .8rem;
      }
      #slcmReelViewer .viewer-cta {
        display: inline-block;
        background: #ff7a00; color: #fff; text-decoration: none;
        padding: .55rem 1.1rem; border-radius: 999px;
        font-weight: 700; font-size: .85rem;
      }

      /* ══════ Cards desktop : overlay vidéo + boutons ══════ */
      [id^="reelsSection"] .reel-video {
        width: 100%; height: 100%; object-fit: cover;
        display: block; background: #000;
      }
      [id^="reelsSection"] .reel-overlay {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 1rem;
        background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 100%);
        color: #fff; pointer-events: none;
      }
      [id^="reelsSection"] .reel-overlay a,
      [id^="reelsSection"] .reel-overlay button.reel-wa-btn { pointer-events: auto; }
      [id^="reelsSection"] .reel-title {
        font-size: .95rem; font-weight: 800; margin: 0 0 .3rem;
        text-shadow: 0 1px 3px rgba(0,0,0,.6);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      [id^="reelsSection"] .reel-loc { font-size: .8rem; opacity: .9; margin: 0 0 .5rem; }
      [id^="reelsSection"] .reel-price {
        font-size: 1rem; font-weight: 900; color: #ff9633; margin: 0 0 .7rem;
      }
      [id^="reelsSection"] .reel-cta {
        display: inline-block;
        background: #ff7a00; color: #fff; text-decoration: none;
        padding: .5rem 1rem; border-radius: 999px;
        font-weight: 700; font-size: .8rem;
      }
      [id^="reelsSection"] .reel-badge-premium {
        position: absolute; top: 1rem; left: 1rem;
        background: #ff7a00; color: #fff;
        font-size: .65rem; font-weight: 900;
        padding: .25rem .55rem; border-radius: 4px;
        letter-spacing: .5px;
      }
      [id^="reelsSection"] .reel-sound {
        position: absolute; top: 1rem; right: 1rem;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(0,0,0,.5); color: #fff;
        border: none; cursor: pointer; font-size: .95rem;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(6px);
        z-index: 25;
      }

      /* ── Boutons WhatsApp Reels ── */
      .reel-cta-row {
        display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
      }
      .reel-wa-btn {
        display: inline-flex; align-items: center; gap: .35rem;
        background: #25d366; color: #fff; border: none;
        padding: .5rem .9rem; border-radius: 999px;
        font-weight: 700; font-size: .8rem; cursor: pointer;
        transition: opacity .2s; white-space: nowrap;
      }
      .reel-wa-btn:hover { opacity: .88; }
      .viewer-wa-btn {
        display: inline-flex; align-items: center; gap: .4rem;
        background: #25d366; color: #fff; border: none;
        padding: .55rem 1.1rem; border-radius: 999px;
        font-weight: 700; font-size: .85rem; cursor: pointer;
        transition: opacity .2s; margin-top: .4rem;
      }
      .viewer-wa-btn:hover { opacity: .88; }

      /* Spinner chargement video */
      .viewer-loader {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.3); transition: opacity .3s; pointer-events: none;
      }
      .viewer-loader.is-hidden { opacity: 0; }
      .viewer-spinner {
        width: 44px; height: 44px; border-radius: 50%;
        border: 3px solid rgba(255,255,255,.25); border-top-color: #fff;
        animation: spinnerRotate .7s linear infinite;
      }
      @keyframes spinnerRotate { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  /* ════════════════════ DESKTOP carousel ════════════════════ */
  function renderDesktopCard(r, index) {
    const title = escapeHtml(r.title || 'Visite');
    const loc   = escapeHtml([r.district, r.city].filter(Boolean).join(' · '));
    const href  = `/annonce/${r.slug || r.id}`;
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.75rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="reel-badge-premium">PREMIUM</div>' : '';

    return `
      <div class="reel-card" data-index="${index}" data-id="${escapeHtml(r.id)}">
        <video class="reel-video" data-src="${escapeHtml(r.video_url)}"
               playsinline muted loop preload="none"
               poster="${escapeHtml((r.images && r.images[0]) || '')}"></video>
        ${premiumBadge}
        <button class="reel-sound" aria-label="Activer le son" type="button">
          <i class="fas fa-volume-mute"></i>
        </button>
        <div class="reel-overlay">
          <p class="reel-title">${title}</p>
          <p class="reel-loc"><i class="fas fa-map-marker-alt"></i> ${loc}</p>
          <p class="reel-price">${fmtPrice(r.price)}${rentMode}</p>
          <div class="reel-cta-row">
            <a href="${href}" class="reel-cta">Voir l'annonce →</a>
            <button class="reel-wa-btn" type="button"
              data-wa-listing='${escapeHtml(JSON.stringify({id: r.id||'', title: r.title||'Visite', price: fmtPrice(r.price), location: [r.district,r.city].filter(Boolean).join(', '), owner_phone: r.owner_phone||''}))}'>
              <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
          </div>
        </div>
      </div>`;
  }

  function buildDesktopSection(anchor) {
    anchor.innerHTML = `
      <div class="reels-header">
        <h2 class="reels-title"><span class="pulse-dot"></span>Visitez depuis chez vous</h2>
        <p class="reels-sub">Découvrez les biens en vidéo · ${reels.length} visite${reels.length > 1 ? 's' : ''}</p>
      </div>
      <div class="reels-viewport">
        <div class="reels-track" id="reelsTrack">
          ${reels.map((r, i) => renderDesktopCard(r, i)).join('')}
        </div>
        <button class="reel-nav reel-prev" aria-label="Précédent" type="button">‹</button>
        <button class="reel-nav reel-next" aria-label="Suivant" type="button">›</button>
      </div>`;

    bindDesktopInteractions();
    setActiveDesktopReel(0);
  }

  function bindDesktopInteractions() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;

    const prev = document.querySelector('[id^="reelsSection"] .reel-prev');
    const next = document.querySelector('[id^="reelsSection"] .reel-next');
    if (prev) prev.addEventListener('click', () => setActiveDesktopReel(activeIndex - 1));
    if (next) next.addEventListener('click', () => setActiveDesktopReel(activeIndex + 1));

    track.addEventListener('click', (e) => {
      const card = e.target.closest('.reel-card');
      if (!card) return;
      const idx = parseInt(card.dataset.index, 10);
      if (idx !== activeIndex) {
        e.preventDefault();
        setActiveDesktopReel(idx);
      }
    });

    track.querySelectorAll('.reel-sound').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const card = btn.closest('.reel-card');
        const video = card?.querySelector('.reel-video');
        if (!video) return;
        video.muted = !video.muted;
        btn.innerHTML = video.muted
          ? '<i class="fas fa-volume-mute"></i>'
          : '<i class="fas fa-volume-up"></i>';
        if (!video.muted && video.paused) video.play().catch(() => {});
      });
    });

    track.querySelectorAll('.reel-wa-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openReelWhatsApp(btn); });
    });
  }

  function setActiveDesktopReel(idx) {
    if (idx < 0) idx = 0;
    if (idx >= reels.length) idx = reels.length - 1;
    activeIndex = idx;

    const cards = document.querySelectorAll('[id^="reelsSection"] .reel-card');
    cards.forEach((card, i) => {
      const video = card.querySelector('.reel-video');
      if (i === idx) {
        card.classList.add('is-active');
        if (video) {
          if (!video.src && !video._hls && video.dataset.src) {
            loadVideo(video, video.dataset.src, false);
          }
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      } else {
        card.classList.remove('is-active');
        if (video) { video.pause(); video.currentTime = 0; }
      }
    });
    /* Pre-warm la vidéo suivante */
    const nextCard = cards[idx + 1];
    if (nextCard) {
      const nv = nextCard.querySelector('.reel-video');
      if (nv && !nv.src && !nv._hls && nv.dataset.src) { loadVideo(nv, nv.dataset.src, false); }
    }

    const track = document.getElementById('reelsTrack');
    const viewport = document.querySelector('[id^="reelsSection"] .reels-viewport');
    const activeCard = cards[idx];
    if (track && viewport && activeCard) {
      requestAnimationFrame(() => {
        const viewportRect = viewport.getBoundingClientRect();
        const cardRect = activeCard.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const viewportCenter = viewportRect.left + viewportRect.width / 2;
        const delta = cardCenter - viewportCenter;
        const currentTransform = track.style.transform.match(/-?\d+\.?\d*/);
        const currentX = currentTransform ? parseFloat(currentTransform[0]) : 0;
        track.style.transform = `translateX(${currentX - delta}px)`;
      });
    }

    const prevBtn = document.querySelector('[id^="reelsSection"] .reel-prev');
    const nextBtn = document.querySelector('[id^="reelsSection"] .reel-next');
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx === reels.length - 1);
  }

  /* ════════════════════ MOBILE bande vignettes ════════════════════ */
  function renderMobileThumb(r, index) {
    const title    = escapeHtml(r.title || 'Visite');
    const poster   = escapeHtml((r.images && r.images[0]) || '');
    const videoSrc = escapeHtml(r.video_url || '');
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.6rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="reel-thumb-premium">PREMIUM</div>' : '';

    return `
      <button class="reel-thumb" type="button" data-index="${index}"
              data-video-src="${videoSrc}" aria-label="Ouvrir la visite ${title}">
        <!-- Niveau 3 : poster CF immédiat, pas d'écran blanc -->
        <img class="reel-thumb-img" src="${poster}" alt="${title}" loading="lazy">
        <!-- Niveau 2 : vidéo muted qui remplace l'img au scroll -->
        <video class="reel-thumb-vid" muted playsinline loop preload="none"
               poster="${poster}" style="display:none;width:100%;height:100%;object-fit:cover"></video>
        ${premiumBadge}
        <div class="reel-thumb-play"><i class="fas fa-play"></i></div>
        <div class="reel-thumb-overlay">
          <p class="reel-thumb-title">${title}</p>
          <p class="reel-thumb-price">${fmtPrice(r.price)}${rentMode}</p>
        </div>
      </button>`;
  }

  /* Autoplay muted dans le strip — libère les ressources hors viewport */
  function bindStripVideoObserver(strip, data) {
    if (!('IntersectionObserver' in window)) return;
    const thumbs = strip.querySelectorAll('.reel-thumb');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const thumb = entry.target;
        const vid   = thumb.querySelector('.reel-thumb-vid');
        const img   = thumb.querySelector('.reel-thumb-img');
        if (!vid) return;
        if (entry.isIntersecting) {
          /* Entrée dans le viewport : charger et jouer silencieusement */
          const src = thumb.dataset.videoSrc;
          if (src && !vid._hlsLoaded) {
            loadVideo(vid, src, true);
            vid._hlsLoaded = true;
          } else if (vid.paused) {
            vid.play().catch(() => {});
          }
          vid.style.display = 'block';
          if (img) img.style.display = 'none';
        } else {
          /* Sortie du viewport : pause + libérer bande passante */
          vid.pause();
          if (vid._hls) vid._hls.stopLoad();
          vid.style.display = 'none';
          if (img) img.style.display = 'block';
        }
      });
    }, { root: strip, threshold: 0.6 });
    thumbs.forEach(t => observer.observe(t));
  }

  function buildMobileSection(anchor, reelsData, title, sub) {
    const data = reelsData || reels;
    const sId = anchor.id || 'reelsSection';
    const heading = title || 'Visites Express';
    const subtitle = sub || (data.length + ' visite' + (data.length > 1 ? 's' : ''));
    anchor.innerHTML = `
      <div class="reels-header">
        <h2 class="reels-title"><span class="pulse-dot"></span>${heading}</h2>
        <p class="reels-sub">${subtitle}</p>
      </div>
      <div class="reels-strip" id="${sId}-strip">
        ${data.map((r, i) => renderMobileThumb(r, i)).join('')}
      </div>
      <button class="reels-cta-next" type="button" id="${sId}-cta">
        Voir les annonces <span class="arrow">↓</span>
      </button>`;

    bindMobileInteractions(anchor, data);

    /* Niveau 2 : autoplay muted au scroll dans le strip */
    const strip = anchor.querySelector('.reels-strip');
    if (strip) bindStripVideoObserver(strip, data);

    /* Pré-charger les manifests HLS des 3 premières vidéos dès que le strip est visible
       → quand l'user tape, le manifest est déjà fetché → lecture quasi-instantanée */
    if ('IntersectionObserver' in window) {
      const stripObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          stripObserver.disconnect();
          /* Construire le viewer silencieusement en arrière-plan */
          setTimeout(() => {
            _viewerReels = data;
            buildViewer(); /* crée le DOM viewer invisible */
            const vwr = document.getElementById('slcmReelViewer');
            if (vwr) {
              preloadAround(vwr, 0, 2); /* pré-charge vidéos 0, 1, 2 */
              vwr.classList.remove('is-open'); /* garde invisible */
            }
          }, 800); /* délai pour ne pas bloquer le rendu initial */
        }
      }, { threshold: 0.5 });
      stripObserver.observe(anchor);
    }
  }

  function bindMobileInteractions(anchor, reelsData) {
    const data = reelsData || reels;
    const strip = anchor.querySelector('.reels-strip');
    if (strip) {
      strip.querySelectorAll('.reel-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          const idx = parseInt(thumb.dataset.index, 10);
          _viewerReels = data; openViewer(idx);
        });
      });
    }
    /* B2 — Bouton 'Voir les annonces' qui scroll vers la section suivante */
    const ctaNext = anchor.querySelector('.reels-cta-next');
    if (ctaNext) {
      ctaNext.addEventListener('click', () => {
        const reelsAnchor = document.getElementById('reelsSection');
        /* Cherche le prochain bloc de contenu après la section Reels.
           Skip le bandeau orange si présent (homepage-boost l'injecte juste après). */
        let target = reelsAnchor?.nextElementSibling;
        if (target && target.id === 'urgencyBanner') {
          target = target.nextElementSibling;
        }
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  /* ════════════════════ VIEWER MODAL ════════════════════ */
  function renderViewerSlide(r, index) {
    const title = escapeHtml(r.title || 'Visite');
    const loc   = escapeHtml([r.district, r.city].filter(Boolean).join(' · '));
    const href  = `/annonce/${r.slug || r.id}`;
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.75rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="viewer-premium">PREMIUM</div>' : '';
    const poster = escapeHtml((r.images && r.images[0]) || '');

    return `
      <div class="viewer-slide" data-index="${index}">
        <video class="viewer-video" data-src="${escapeHtml(r.video_url)}"
               playsinline muted preload="metadata" poster="${poster}"></video>
        <div class="viewer-loader" aria-hidden="true">
          <div class="viewer-spinner"></div>
        </div>
        <div class="viewer-counter">${index + 1} / ${reels.length}</div>
        <button class="viewer-close" aria-label="Fermer" type="button">×</button>
        ${premiumBadge}
        <button class="viewer-sound" aria-label="Activer le son" type="button">
          <i class="fas fa-volume-mute"></i>
        </button>
        <div class="viewer-info">
          <p class="viewer-title">${title}</p>
          <p class="viewer-loc"><i class="fas fa-map-marker-alt"></i> ${loc}</p>
          <p class="viewer-price">${fmtPrice(r.price)}${rentMode}</p>
          <a href="${href}" class="viewer-cta">Voir l'annonce →</a>
          <button class="viewer-wa-btn" type="button"
            data-wa-listing='${escapeHtml(JSON.stringify({id: r.id||'', title: r.title||'Visite', price: fmtPrice(r.price), location: [r.district,r.city].filter(Boolean).join(', '), owner_phone: r.owner_phone||''}))}'>
            <i class="fab fa-whatsapp"></i> Contacter sur WhatsApp
          </button>
        </div>
      </div>`;
  }

  function buildViewer() {
    let viewer = document.getElementById('slcmReelViewer');
    if (viewer) viewer.remove();

    viewer = document.createElement('div');
    viewer.id = 'slcmReelViewer';
    viewer.setAttribute('aria-hidden', 'true');
    viewer.innerHTML = `
      <div class="viewer-track" id="viewerTrack">
        ${(_viewerReels || reels).map((r, i) => renderViewerSlide(r, i)).join('')}
      </div>`;
    document.body.appendChild(viewer);
    bindViewerInteractions(viewer);
  }

  function bindViewerInteractions(viewer) {
    const track = viewer.querySelector('#viewerTrack');
    if (!track) return;

    viewer.querySelectorAll('.viewer-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        closeViewer();
      });
    });

    viewer.querySelectorAll('.viewer-sound').forEach(btn => {
      const toggleSound = (e) => {
        e.stopPropagation(); e.preventDefault();
        const slide = btn.closest('.viewer-slide');
        const video = slide?.querySelector('.viewer-video');
        if (!video) return;
        video.muted = !video.muted;
        btn.innerHTML = video.muted
          ? '<i class="fas fa-volume-mute"></i>'
          : '<i class="fas fa-volume-up"></i>';
        if (!video.muted && video.paused) video.play().catch(() => {});
      };
      btn.addEventListener('touchend', toggleSound, { passive: false });
      btn.addEventListener('click', toggleSound);
    });

    viewer.querySelectorAll('.viewer-wa-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openReelWhatsApp(btn); });
    });

    const slides = viewer.querySelectorAll('.viewer-slide');

    /* D2 — Auto-passage au reel suivant après 1 loop complet.
       Compte les lectures terminées par slide, à la 2e scroll vers le suivant. */
    const playCountByIndex = new Map(); // index → nombre de fois où ended a fiér
    slides.forEach(slide => {
      const video = slide.querySelector('.viewer-video');
      const idx = parseInt(slide.dataset.index, 10);
      if (!video) return;
      video.addEventListener('ended', () => {
        const count = (playCountByIndex.get(idx) || 0) + 1;
        playCountByIndex.set(idx, count);
        if (count < 2) {
          /* 1ère fin → on relance pour 1 loop */
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          /* 2e fin → passage automatique au slide suivant (s'il existe) */
          const nextSlide = slides[idx + 1];
          if (nextSlide) {
            nextSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            /* Dernier reel : on boucle sur lui-même (pas de revenir au début) */
            video.currentTime = 0;
            video.play().catch(() => {});
          }
        }
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector('.viewer-video');
          if (!video) return;
          const idx = parseInt(entry.target.dataset.index, 10);
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            /* Reset du compteur quand on arrive sur un slide */
            playCountByIndex.set(idx, 0);
            const loader = entry.target.querySelector('.viewer-loader');
            if (!video.src && !video._hls && video.dataset.src) loadVideo(video, video.dataset.src, false);
            video.currentTime = 0;
            video.play().catch(() => {});
            /* Masquer le spinner dès que la vidéo joue */
            if (loader) {
              loader.classList.remove('is-hidden');
              video.addEventListener('playing', () => loader.classList.add('is-hidden'), { once: true });
              video.addEventListener('canplay',  () => loader.classList.add('is-hidden'), { once: true });
            }
            viewerIndex = idx;
            /* Pre-warm le slide suivant */
            const nextSlide = slides[idx + 1];
            if (nextSlide) {
              const nv = nextSlide.querySelector('.viewer-video');
              if (nv && !nv.src && !nv._hls && nv.dataset.src) loadVideo(nv, nv.dataset.src, false);
            }
          } else {
            video.pause();
          }
        });
      }, { root: track, threshold: [0, 0.6, 1] });
      slides.forEach(slide => observer.observe(slide));
    }

    viewer._escHandler = (e) => {
      if (e.key === 'Escape' && viewerOpen) closeViewer();
    };
    document.addEventListener('keydown', viewer._escHandler);
  }

  /* Pré-charge les vidéos autour de l'index actif (logique TikTok) */
  function preloadAround(viewer, centerIdx, radius) {
    const activeReels = _viewerReels || reels;
    for (let i = Math.max(0, centerIdx - 1); i <= Math.min(activeReels.length - 1, centerIdx + radius); i++) {
      const slide = viewer.querySelector(`.viewer-slide[data-index="${i}"]`);
      const v = slide?.querySelector('.viewer-video');
      if (v && !v.src && !v._hls && v.dataset.src) {
        loadVideo(v, v.dataset.src, false); /* charge sans lire */
      }
    }
  }

  function openViewer(startIndex) {
    if (!reels.length) return;
    buildViewer();
    const viewer = document.getElementById('slcmReelViewer');
    if (!viewer) return;

    viewerOpen = true;
    viewerIndex = Math.max(0, Math.min(startIndex, reels.length - 1));
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('slcm-reel-viewer-open');

    /* Pré-charger la vidéo tapée + les 2 suivantes AVANT d'afficher */
    preloadAround(viewer, viewerIndex, 2);

    requestAnimationFrame(() => {
      const target = viewer.querySelector(`.viewer-slide[data-index="${viewerIndex}"]`);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      const video = target?.querySelector('.viewer-video');
      if (video) {
        /* Déjà pré-chargée → juste play(), sinon charger et jouer */
        if (video.src || video._hls) {
          video.play().catch(() => {});
        } else if (video.dataset.src) {
          loadVideo(video, video.dataset.src, true);
        }
        /* Masquer spinner dès que ça joue */
        const loader = target.querySelector('.viewer-loader');
        if (loader) video.addEventListener('playing', () => loader.classList.add('is-hidden'), { once: true });
      }
    });
  }

  function closeViewer() {
    const viewer = document.getElementById('slcmReelViewer');
    if (!viewer) return;
    viewerOpen = false;
    _viewerReels = null; /* reset — section 1 par défaut au prochain ouverture */
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('slcm-reel-viewer-open');

    viewer.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; });

    if (viewer._escHandler) {
      document.removeEventListener('keydown', viewer._escHandler);
      viewer._escHandler = null;
    }
  }

  /* ════════════════════ ORCHESTRATION ════════════════════ */
  function buildSection() {
    const anchor = document.getElementById('reelsSection');
    if (!anchor) { console.warn('[reels] [id^="reelsSection"] introuvable'); return; }

    if (!reels.length) {
      anchor.classList.add('is-empty');
      return;
    }
    anchor.classList.remove('is-empty');

    if (isMobile) {
      buildMobileSection(anchor);
    } else {
      buildDesktopSection(anchor);
    }
  }

  let resizeTimer = null;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (nowMobile !== isMobile) {
        isMobile = nowMobile;
        if (!isMobile && viewerOpen) closeViewer();
        reels = await loadReels();
        buildSection();
      }
    }, 200);
  }

  /* ── Config des sections homepage ── */
  const SECTION_CONFIGS = {
    reelsSection: {
      title:    'Visitez depuis chez vous',
      sub:      'Les biens du moment en vidéo',
      cta:      'Voir toutes les visites →',
      cfTag:    'homepage-section-1',
      /* Supabase fallback : résidentiel non meublé */
      sbFilter: (q) => q.eq('furnished', false).not('video_url', 'is', null),
    },
    reelsSection2: {
      title:    'Ils ont leur style, trouvez le vôtre',
      sub:      'Meublés, studios, espaces de travail — en vidéo',
      cta:      'Voir les meublés et espaces pros →',
      cfTag:    'homepage-section-2',
      /* Supabase fallback : meublé + commercial + studio */
      sbFilter: (q) => q.or('furnished.eq.true,type.in.(commercial,office,studio)').not('video_url', 'is', null),
    },
  };

  /* ── Charger via Cloudflare Stream (si disponible) ── */
  async function loadFromCF(tag, limit) {
    const l = limit || (isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT);
    try {
      const res = await fetch(`/.netlify/functions/cf-stream-videos?tag=${encodeURIComponent(tag)}&limit=${l}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.videos?.length) return null;
      /* Convertir format CF → format interne reels */
      return data.videos.map(v => ({
        id:          v.listing_id || v.id,
        listing_id:  v.listing_id || null,
        slug:        v.slug       || null,
        title:       v.title      || 'Visite',
        city:        v.city       || '',
        district:    v.district   || '',
        price:       typeof v.price === 'number' ? v.price : (parseInt(String(v.price || '').replace(/\D/g,'')) || 0),
        rent_sale:   v.rent_sale  || 'rent',
        type:        'apartment',
        furnished:   false,
        video_url:   v.hls,
        images:      [v.thumbnail],
        premium:     v.premium    || false,
        owner_phone: v.owner_phone || '237650840714',
        created_at:  new Date().toISOString(),
        _cf: true,
      }));
    } catch { return null; }
  }

  async function init() {
    injectStyles();

    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }

    /* ── Section 1 ── */
    reels = await loadReels();
    buildSection();

    /* ── Section 2 : mobile uniquement ── */
    const anchor2 = document.getElementById('reelsSection2');
    if (anchor2) {
      if (!isMobile) {
        /* Desktop : masquer Section 2 — les 12 vidéos sont dans Section 1 */
        anchor2.classList.add('is-empty');
      } else {
        const cfg2 = SECTION_CONFIGS.reelsSection2;
        /* Section 2 mobile : meublés + studios + commerciaux + offices.
           Source : Supabase (même pool que la section 1), filtré via getSection().
           Plus besoin de CF tag meta.section. */
        const all = await loadAllReelsFromSupabase();
        const section2Pool = all.filter(r => getSection(r) === 'section-2');

        if (section2Pool.length) {
          const rotated2 = rotatePool(section2Pool);
          const reels2 = rotated2.slice(0, MOBILE_LIMIT);
          const savedReels = reels;
          reels = reels2;
          anchor2.classList.remove('is-empty');
          buildMobileSection(anchor2, reels2, cfg2.title, cfg2.sub);
          reels = savedReels;
        } else {
          anchor2.classList.add('is-empty');
        }
      }
    }

    window.addEventListener('resize', handleResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, loadReels, openViewer, closeViewer };
})();

window.SLCM_reels = SLCM_reels;
