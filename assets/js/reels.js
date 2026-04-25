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
  const DESKTOP_LIMIT = 6;
  const MOBILE_LIMIT  = 8;

  const MOBILE_QUOTA = {
    rentUnfurnished: 5,
    rentFurnishedOrCommercial: 2,
    sale: 1
  };

  let reels = [];
  let isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  let activeIndex = 0;
  let viewerOpen = false;
  let viewerIndex = 0;

  async function sb() {
    return window.SLCM_DB ? window.SLCM_DB.init() : null;
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
    const client = await sb();
    if (!client) { console.warn('[reels] Supabase indisponible'); return []; }

    const { data, error } = await client
      .from('listings')
      .select('id, title, city, district, price, rent_sale, type, furnished, video_url, images, premium, created_at')
      .eq('status', 'active')
      .not('video_url', 'is', null)
      .order('premium', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) { console.error('[reels] loadReels:', error); return []; }
    const pool = (data || []).filter(r => r.video_url && r.video_url.trim());

    return isMobile ? applyMobileQuota(pool) : pool.slice(0, DESKTOP_LIMIT);
  }

  /* ════════════════════ STYLES ════════════════════ */
  function injectStyles() {
    if (document.getElementById('slcmReelsStyles')) return;
    const style = document.createElement('style');
    style.id = 'slcmReelsStyles';
    style.textContent = `
      #reelsSection {
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      #reelsSection.is-empty { display: none; }

      @keyframes reelPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
        50%      { opacity: .4; box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      /* ══════ DESKTOP — carousel inchangé ══════ */
      @media (min-width: ${MOBILE_BREAKPOINT}px) {
        #reelsSection { padding: 2.5rem 0 3rem; }
        #reelsSection .reels-header {
          max-width: 1200px; margin: 0 auto 1.5rem; padding: 0 1rem;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap;
        }
        #reelsSection .reels-title {
          font-size: 1.5rem; font-weight: 900; margin: 0;
          display: flex; align-items: center; gap: .6rem;
        }
        #reelsSection .reels-title .pulse-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #ef4444; animation: reelPulse 1.5s ease-in-out infinite;
        }
        #reelsSection .reels-sub { font-size: .85rem; color: #aaa; margin: 0; }
        #reelsSection .reels-viewport {
          max-width: 1200px; margin: 0 auto; padding: 0 1rem;
          overflow: hidden; position: relative; min-height: 600px;
        }
        #reelsSection .reels-track {
          display: flex; align-items: center; gap: 1rem;
          padding-left: calc(50% - 160px);
          padding-right: calc(50% - 160px);
          transition: transform .5s cubic-bezier(.2,.9,.3,1);
          will-change: transform;
        }
        #reelsSection .reel-card {
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
        #reelsSection .reel-card.is-active {
          width: 320px; height: 570px;
          opacity: 1; z-index: 2;
          box-shadow: 0 25px 60px rgba(255,122,0,.25);
        }
        #reelsSection .reel-card:not(.is-active):hover { opacity: .8; }
        #reelsSection .reel-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(255,255,255,.95); color: #111;
          border: none; cursor: pointer; z-index: 10;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,.3);
          transition: transform .2s;
        }
        #reelsSection .reel-nav:hover { transform: translateY(-50%) scale(1.1); }
        #reelsSection .reel-prev { left: 1rem; }
        #reelsSection .reel-next { right: 1rem; }
        #reelsSection .reel-nav:disabled { opacity: .35; cursor: not-allowed; }
      }

      /* ══════ MOBILE — bande de vignettes ══════ */
      @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
        #reelsSection { padding: 1rem 0 1.25rem; }
        #reelsSection .reels-header {
          padding: 0 1rem .75rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        #reelsSection .reels-title {
          font-size: 1rem; font-weight: 800; margin: 0;
          display: flex; align-items: center; gap: .5rem; color: #fff;
        }
        #reelsSection .reels-title .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #ef4444; animation: reelPulse 1.5s ease-in-out infinite;
        }
        #reelsSection .reels-sub { font-size: .75rem; color: #aaa; margin: 0; }
        #reelsSection .reels-strip {
          display: flex; gap: .6rem;
          padding: 0 1rem .25rem;
          overflow-x: auto; overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        #reelsSection .reels-strip::-webkit-scrollbar { display: none; }
        #reelsSection .reel-thumb {
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
        #reelsSection .reel-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        #reelsSection .reel-thumb-overlay {
          position: absolute; left: 0; right: 0; bottom: 0;
          padding: .5rem;
          background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 100%);
          color: #fff; pointer-events: none;
        }
        #reelsSection .reel-thumb-title {
          font-size: .7rem; font-weight: 700; margin: 0 0 .15rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,.6);
        }
        #reelsSection .reel-thumb-price {
          font-size: .7rem; font-weight: 800; color: #ff9633; margin: 0;
        }
        #reelsSection .reel-thumb-premium {
          position: absolute; top: .35rem; left: .35rem;
          background: #ff7a00; color: #fff;
          font-size: .55rem; font-weight: 900;
          padding: .15rem .35rem; border-radius: 3px;
          letter-spacing: .3px;
        }
        #reelsSection .reel-thumb-play {
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
        #reelsSection .reels-cta-next {
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
        #reelsSection .reels-cta-next:active {
          background: rgba(255,255,255,.15);
        }
        #reelsSection .reels-cta-next .arrow {
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
      #slcmReelViewer .viewer-info a { pointer-events: auto; }
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
      #reelsSection .reel-video {
        width: 100%; height: 100%; object-fit: cover;
        display: block; background: #000;
      }
      #reelsSection .reel-overlay {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 1rem;
        background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 100%);
        color: #fff; pointer-events: none;
      }
      #reelsSection .reel-overlay a { pointer-events: auto; }
      #reelsSection .reel-title {
        font-size: .95rem; font-weight: 800; margin: 0 0 .3rem;
        text-shadow: 0 1px 3px rgba(0,0,0,.6);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #reelsSection .reel-loc { font-size: .8rem; opacity: .9; margin: 0 0 .5rem; }
      #reelsSection .reel-price {
        font-size: 1rem; font-weight: 900; color: #ff9633; margin: 0 0 .7rem;
      }
      #reelsSection .reel-cta {
        display: inline-block;
        background: #ff7a00; color: #fff; text-decoration: none;
        padding: .5rem 1rem; border-radius: 999px;
        font-weight: 700; font-size: .8rem;
      }
      #reelsSection .reel-badge-premium {
        position: absolute; top: 1rem; left: 1rem;
        background: #ff7a00; color: #fff;
        font-size: .65rem; font-weight: 900;
        padding: .25rem .55rem; border-radius: 4px;
        letter-spacing: .5px;
      }
      #reelsSection .reel-sound {
        position: absolute; top: 1rem; right: 1rem;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(0,0,0,.5); color: #fff;
        border: none; cursor: pointer; font-size: .95rem;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(6px);
        z-index: 25;
      }
    `;
    document.head.appendChild(style);
  }

  /* ════════════════════ DESKTOP carousel ════════════════════ */
  function renderDesktopCard(r, index) {
    const title = escapeHtml(r.title || 'Visite');
    const loc   = escapeHtml([r.district, r.city].filter(Boolean).join(' · '));
    const href  = `/annonce?id=${encodeURIComponent(r.id)}`;
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.75rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="reel-badge-premium">PREMIUM</div>' : '';

    return `
      <div class="reel-card" data-index="${index}" data-id="${escapeHtml(r.id)}">
        <video class="reel-video" src="${escapeHtml(r.video_url)}"
               playsinline muted loop preload="metadata"
               poster="${escapeHtml((r.images && r.images[0]) || '')}"></video>
        ${premiumBadge}
        <button class="reel-sound" aria-label="Activer le son" type="button">
          <i class="fas fa-volume-mute"></i>
        </button>
        <div class="reel-overlay">
          <p class="reel-title">${title}</p>
          <p class="reel-loc"><i class="fas fa-map-marker-alt"></i> ${loc}</p>
          <p class="reel-price">${fmtPrice(r.price)}${rentMode}</p>
          <a href="${href}" class="reel-cta">Voir l'annonce →</a>
        </div>
      </div>`;
  }

  function buildDesktopSection(anchor) {
    anchor.innerHTML = `
      <div class="reels-header">
        <h2 class="reels-title"><span class="pulse-dot"></span>Visites Express</h2>
        <p class="reels-sub">Découvre les biens en vidéo · ${reels.length} visite${reels.length > 1 ? 's' : ''}</p>
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

    const prev = document.querySelector('#reelsSection .reel-prev');
    const next = document.querySelector('#reelsSection .reel-next');
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
  }

  function setActiveDesktopReel(idx) {
    if (idx < 0) idx = 0;
    if (idx >= reels.length) idx = reels.length - 1;
    activeIndex = idx;

    const cards = document.querySelectorAll('#reelsSection .reel-card');
    cards.forEach((card, i) => {
      const video = card.querySelector('.reel-video');
      if (i === idx) {
        card.classList.add('is-active');
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      } else {
        card.classList.remove('is-active');
        if (video) { video.pause(); video.currentTime = 0; }
      }
    });

    const track = document.getElementById('reelsTrack');
    const viewport = document.querySelector('#reelsSection .reels-viewport');
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

    const prevBtn = document.querySelector('#reelsSection .reel-prev');
    const nextBtn = document.querySelector('#reelsSection .reel-next');
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx === reels.length - 1);
  }

  /* ════════════════════ MOBILE bande vignettes ════════════════════ */
  function renderMobileThumb(r, index) {
    const title = escapeHtml(r.title || 'Visite');
    const poster = escapeHtml((r.images && r.images[0]) || '');
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.6rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="reel-thumb-premium">PREMIUM</div>' : '';

    return `
      <button class="reel-thumb" type="button" data-index="${index}" aria-label="Ouvrir la visite ${title}">
        <img src="${poster}" alt="${title}" loading="lazy">
        ${premiumBadge}
        <div class="reel-thumb-play"><i class="fas fa-play"></i></div>
        <div class="reel-thumb-overlay">
          <p class="reel-thumb-title">${title}</p>
          <p class="reel-thumb-price">${fmtPrice(r.price)}${rentMode}</p>
        </div>
      </button>`;
  }

  function buildMobileSection(anchor) {
    anchor.innerHTML = `
      <div class="reels-header">
        <h2 class="reels-title"><span class="pulse-dot"></span>Visites Express</h2>
        <p class="reels-sub">${reels.length} visite${reels.length > 1 ? 's' : ''}</p>
      </div>
      <div class="reels-strip" id="reelsStrip">
        ${reels.map((r, i) => renderMobileThumb(r, i)).join('')}
      </div>
      <button class="reels-cta-next" type="button" id="reelsCtaNext">
        Voir les annonces <span class="arrow">↓</span>
      </button>`;

    bindMobileInteractions();
  }

  function bindMobileInteractions() {
    const strip = document.getElementById('reelsStrip');
    if (strip) {
      strip.querySelectorAll('.reel-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          const idx = parseInt(thumb.dataset.index, 10);
          openViewer(idx);
        });
      });
    }
    /* B2 — Bouton 'Voir les annonces' qui scroll vers la section suivante */
    const ctaNext = document.getElementById('reelsCtaNext');
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
    const href  = `/annonce?id=${encodeURIComponent(r.id)}`;
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.75rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="viewer-premium">PREMIUM</div>' : '';
    const poster = escapeHtml((r.images && r.images[0]) || '');

    return `
      <div class="viewer-slide" data-index="${index}">
        <video class="viewer-video" src="${escapeHtml(r.video_url)}"
               playsinline muted loop preload="metadata" poster="${poster}"></video>
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
        ${reels.map((r, i) => renderViewerSlide(r, i)).join('')}
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

    const slides = viewer.querySelectorAll('.viewer-slide');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector('.viewer-video');
          if (!video) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            video.play().catch(() => {});
            viewerIndex = parseInt(entry.target.dataset.index, 10);
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

    requestAnimationFrame(() => {
      const target = viewer.querySelector(`.viewer-slide[data-index="${viewerIndex}"]`);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      const video = target?.querySelector('.viewer-video');
      if (video) video.play().catch(() => {});
    });
  }

  function closeViewer() {
    const viewer = document.getElementById('slcmReelViewer');
    if (!viewer) return;
    viewerOpen = false;
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
    if (!anchor) { console.warn('[reels] #reelsSection introuvable'); return; }

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

  async function init() {
    injectStyles();

    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }

    reels = await loadReels();
    buildSection();
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
