/**
 * SE LOGER CM — Reels Visites Express
 * Section vidéo verticale sur la homepage.
 *
 * Comportement :
 *   - Mobile (< 768px) : plein écran vertical, swipe haut/bas, autoplay muet, tap pour son
 *   - Desktop (≥ 768px) : carousel horizontal, vidéo centrale active + 2 aperçus latéraux
 *
 * Source des données : table `listings` où `video_url IS NOT NULL` et `status = 'active'`.
 * Les vidéos sont stockées dans le bucket Supabase Storage `listing-videos`.
 *
 * Admin-only (phase 1) : les agents n'uploadent pas encore via publish.html.
 */

const SLCM_reels = (() => {

  const MOBILE_BREAKPOINT = 768;
  const MAX_REELS = 10;

  let reels = [];
  let activeIndex = 0;
  let isMobile = window.innerWidth < MOBILE_BREAKPOINT;

  /* ── Accès Supabase ─────────────────────────────────────────────── */
  async function sb() {
    return window.SLCM_DB ? window.SLCM_DB.init() : null;
  }

  /* ── Sécurité XSS (pattern cohérent avec admin_dashboard.html) ──── */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Formatage prix (réutilise listings.js si dispo, sinon fallback) */
  function fmtPrice(n) {
    if (window.SLCM_listings && window.SLCM_listings.fmtPrice) {
      return window.SLCM_listings.fmtPrice(n);
    }
    return (n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  /* ── Charger les reels depuis Supabase ──────────────────────────── */
  async function loadReels() {
    const client = await sb();
    if (!client) { console.warn('[reels] Supabase indisponible'); return []; }

    const { data, error } = await client
      .from('listings')
      .select('id, title, city, district, price, rent_sale, type, video_url, images, premium')
      .eq('status', 'active')
      .not('video_url', 'is', null)
      .order('premium', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MAX_REELS);

    if (error) { console.error('[reels] loadReels:', error); return []; }
    return (data || []).filter(r => r.video_url && r.video_url.trim());
  }

  /* ── Injecter les styles CSS (inline, pattern homepage-boost.js) ── */
  function injectStyles() {
    if (document.getElementById('slcmReelsStyles')) return;
    const style = document.createElement('style');
    style.id = 'slcmReelsStyles';
    style.textContent = `
      /* ══ Conteneur section ══ */
      #reelsSection {
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
        color: #fff;
        padding: 2.5rem 0 3rem;
        position: relative;
        overflow: hidden;
      }
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
      #reelsSection .reels-sub {
        font-size: .85rem; color: #aaa; margin: 0;
      }
      @keyframes reelPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
        50%      { opacity: .4; box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      /* ══ DESKTOP — carousel horizontal Netflix-like ══ */
      @media (min-width: ${MOBILE_BREAKPOINT}px) {
        #reelsSection .reels-track {
          max-width: 1200px; margin: 0 auto; padding: 0 1rem;
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; position: relative; min-height: 600px;
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
      }

      /* ══ MOBILE — plein écran vertical TikTok-like ══ */
      @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
        #reelsSection {
          padding: 0;
          height: 100vh; height: 100dvh;
          /* IMPORTANT : désactive le scroll-snap parent sur cette section */
          scroll-snap-align: none !important;
        }
        #reelsSection .reels-header {
          position: absolute; top: 0; left: 0; right: 0; z-index: 20;
          margin: 0; padding: 1rem;
          background: linear-gradient(180deg, rgba(0,0,0,.6) 0%, transparent 100%);
        }
        #reelsSection .reels-title { font-size: 1.1rem; color: #fff; }
        #reelsSection .reels-sub { display: none; }
        #reelsSection .reels-track {
          height: 100%;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        #reelsSection .reels-track::-webkit-scrollbar { display: none; }
        #reelsSection .reel-card {
          height: 100vh; height: 100dvh;
          width: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          position: relative;
          background: #000;
        }
        #reelsSection .reel-nav { display: none; }
        #reelsSection .reel-exit {
          position: fixed;
          bottom: 2rem; left: 50%; transform: translateX(-50%);
          background: rgba(255,255,255,.95); color: #111;
          border: none; padding: .7rem 1.4rem; border-radius: 999px;
          font-weight: 700; font-size: .85rem; cursor: pointer;
          z-index: 30; box-shadow: 0 4px 20px rgba(0,0,0,.4);
        }
      }

      /* ══ Commun — vidéo + overlay infos ══ */
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
      #reelsSection .reel-loc {
        font-size: .8rem; opacity: .9; margin: 0 0 .5rem;
      }
      #reelsSection .reel-price {
        font-size: 1rem; font-weight: 900; color: #ff9633;
        margin: 0 0 .7rem;
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
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(0,0,0,.5); color: #fff;
        border: none; cursor: pointer; font-size: .9rem;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(6px);
      }

      /* ══ Empty state (aucune vidéo en base) : on cache la section ══ */
      #reelsSection.is-empty { display: none; }
    `;
    document.head.appendChild(style);
  }

  /* ── Générer le HTML d'un reel ──────────────────────────────────── */
  function renderReel(r, index) {
    const title = escapeHtml(r.title || 'Visite');
    const loc   = escapeHtml([r.district, r.city].filter(Boolean).join(' · '));
    const href  = `/annonce?id=${encodeURIComponent(r.id)}`;
    const rentMode = r.rent_sale === 'sale' ? '' : '<span style="font-size:.75rem;font-weight:400;opacity:.8">/mois</span>';
    const premiumBadge = r.premium ? '<div class="reel-badge-premium">PREMIUM</div>' : '';

    return `
      <div class="reel-card" data-index="${index}" data-id="${escapeHtml(r.id)}">
        <video
          class="reel-video"
          src="${escapeHtml(r.video_url)}"
          playsinline
          muted
          loop
          preload="metadata"
          poster="${escapeHtml((r.images && r.images[0]) || '')}"
        ></video>
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

  /* ── Construire la section complète ─────────────────────────────── */
  function buildSection() {
    const anchor = document.getElementById('reelsSection');
    if (!anchor) { console.warn('[reels] #reelsSection introuvable dans index.html'); return; }

    if (!reels.length) {
      anchor.classList.add('is-empty');
      return;
    }
    anchor.classList.remove('is-empty');

    const headerHtml = `
      <div class="reels-header">
        <h2 class="reels-title">
          <span class="pulse-dot"></span>
          Visites Express
        </h2>
        <p class="reels-sub">Découvre les biens en vidéo · ${reels.length} visite${reels.length > 1 ? 's' : ''}</p>
      </div>`;

    const trackHtml = `
      <div class="reels-track" id="reelsTrack">
        ${reels.map((r, i) => renderReel(r, i)).join('')}
      </div>`;

    const navHtml = !isMobile ? `
      <button class="reel-nav reel-prev" aria-label="Précédent" type="button">‹</button>
      <button class="reel-nav reel-next" aria-label="Suivant" type="button">›</button>
    ` : '';

    const exitHtml = isMobile ? `
      <button class="reel-exit" type="button">Voir les annonces ↓</button>
    ` : '';

    anchor.innerHTML = headerHtml + trackHtml + navHtml + exitHtml;

    bindInteractions();
    setActiveReel(0);
  }

  /* ── Interactions (desktop + mobile) ────────────────────────────── */
  function bindInteractions() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;

    /* Desktop : flèches */
    if (!isMobile) {
      const prev = document.querySelector('#reelsSection .reel-prev');
      const next = document.querySelector('#reelsSection .reel-next');
      if (prev) prev.addEventListener('click', () => setActiveReel(activeIndex - 1));
      if (next) next.addEventListener('click', () => setActiveReel(activeIndex + 1));

      /* Desktop : clic sur une card latérale = devient active */
      track.addEventListener('click', (e) => {
        const card = e.target.closest('.reel-card');
        if (!card) return;
        const idx = parseInt(card.dataset.index, 10);
        if (idx !== activeIndex) {
          e.preventDefault();
          setActiveReel(idx);
        }
      });
    }

    /* Mobile : bouton sortie */
    if (isMobile) {
      const exitBtn = document.querySelector('#reelsSection .reel-exit');
      if (exitBtn) {
        exitBtn.addEventListener('click', () => {
          const next = document.getElementById('reelsSection').nextElementSibling;
          if (next) next.scrollIntoView({ behavior: 'smooth' });
        });
      }

      /* Mobile : observer d'intersection pour autoplay du reel visible */
      setupMobileAutoplay(track);
    }

    /* Bouton son (commun) */
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
      });
    });
  }

  /* ── Desktop : activer un reel (vidéo centrale qui autoplay) ────── */
  function setActiveReel(idx) {
    if (idx < 0) idx = reels.length - 1;
    if (idx >= reels.length) idx = 0;
    activeIndex = idx;

    const cards = document.querySelectorAll('#reelsSection .reel-card');
    cards.forEach((card, i) => {
      const video = card.querySelector('.reel-video');
      if (i === idx) {
        card.classList.add('is-active');
        if (video) {
          video.currentTime = 0;
          const p = video.play();
          if (p && p.catch) p.catch(() => {}); // autoplay bloqué = silencieux
        }
      } else {
        card.classList.remove('is-active');
        if (video) { video.pause(); video.currentTime = 0; }
      }
    });

    /* Sur desktop : ramène la card active au centre visuellement */
    if (!isMobile) {
      const activeCard = cards[idx];
      if (activeCard && activeCard.scrollIntoView) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  /* ── Mobile : IntersectionObserver pour autoplay du reel visible ── */
  function setupMobileAutoplay(track) {
    const cards = track.querySelectorAll('.reel-card');
    if (!('IntersectionObserver' in window)) {
      /* Fallback : lance juste le premier */
      const first = cards[0]?.querySelector('.reel-video');
      if (first) first.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target.querySelector('.reel-video');
        if (!video) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { root: track, threshold: [0, 0.6, 1] });

    cards.forEach(card => observer.observe(card));
  }

  /* ── Re-render si bascule mobile <-> desktop ────────────────────── */
  let resizeTimer = null;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (nowMobile !== isMobile) {
        isMobile = nowMobile;
        buildSection();
      }
    }, 200);
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  async function init() {
    injectStyles();
    reels = await loadReels();
    buildSection();
    window.addEventListener('resize', handleResize);
  }

  /* Attente DOM ready + config disponible */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, loadReels };
})();

window.SLCM_reels = SLCM_reels;
