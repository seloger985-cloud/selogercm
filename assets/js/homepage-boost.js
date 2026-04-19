/**
 * SE LOGER CM — Homepage Boost
 * 1. Bandeau urgence sous le hero (stats live)
 * 2. Animations au scroll (fade-in + slide-up)
 * 3. CTA "Publier GRATUITEMENT" avant le footer
 */

(function() {
  'use strict';

  /* Ne s'exécute que sur la page d'accueil */
  const path = window.location.pathname;
  if (path !== '/' && path !== '/index.html' && path !== '') return;

  /* ══════════════════════════════════════
     1. BANDEAU URGENCE — sous le hero
  ══════════════════════════════════════ */
  function buildUrgencyBanner() {
    const hero = document.querySelector('.hero');
    if (!hero || document.getElementById('urgencyBanner')) return;

    /* Position absolute en bas du hero pour rester visible avec scroll-snap */
    const banner = document.createElement('div');
    banner.id = 'urgencyBanner';
    banner.innerHTML = `
      <style>
        #urgencyBanner {
          background: linear-gradient(90deg, #ff7a00, #ff9633);
          color: #fff;
          padding: .75rem 1rem;
          overflow: hidden;
          position: absolute;
          bottom: 0; left: 0; right: 0;
          z-index: 5;
          box-shadow: 0 -4px 12px rgba(0,0,0,.1);
        }
        section.hero { position: relative; }
        #urgencyBanner .ub-track {
          display: flex; align-items: center; justify-content: center;
          gap: 2.5rem; flex-wrap: wrap;
          max-width: 1100px; margin: auto;
          font-size: .85rem; font-weight: 700;
        }
        #urgencyBanner .ub-item {
          display: inline-flex; align-items: center; gap: .4rem;
          white-space: nowrap;
        }
        #urgencyBanner .ub-num {
          font-weight: 900; font-size: 1rem;
        }
        @media (max-width: 600px) {
          #urgencyBanner .ub-track { gap: 1.2rem; font-size: .75rem; }
          #urgencyBanner .ub-num { font-size: .9rem; }
        }
      </style>
      <div class="ub-track">
        <span class="ub-item">🔥 <span class="ub-num" id="ubNew">…</span> nouvelles cette semaine</span>
        <span class="ub-item">✅ <span class="ub-num" id="ubTotal">…</span> annonces vérifiées</span>
        <span class="ub-item">🌍 Diaspora active</span>
        <span class="ub-item">⚡ Publication en 3 minutes</span>
      </div>
    `;
    /* S'assurer que le hero est position:relative pour position:absolute du banner */
    hero.style.position = 'relative';
    hero.appendChild(banner);

    /* Compter les annonces depuis Supabase */
    fetchStats();
  }

  async function fetchStats() {
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    if (!window.SLCM_DB?.client) return;

    try {
      /* Total annonces actives */
      const { count: totalCount } = await window.SLCM_DB.client
        .from('listings').select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      /* Nouvelles cette semaine */
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newCount } = await window.SLCM_DB.client
        .from('listings').select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', weekAgo.toISOString());

      animateCounter('ubTotal', totalCount || 0);
      animateCounter('ubNew', newCount || 0);
    } catch(e) {
      /* Fallback si erreur */
      animateCounter('ubTotal', 50);
      animateCounter('ubNew', 5);
    }
  }

  function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = 0;
    const duration = 1500;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
      el.textContent = Math.round(start + (target - start) * eased) + (target >= 100 ? '+' : '');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ══════════════════════════════════════
     2. ANIMATIONS AU SCROLL
  ══════════════════════════════════════ */
  function setupScrollAnimations() {
    /* Respecter prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const style = document.createElement('style');
    style.textContent = `
      .slcm-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity .7s ease-out, transform .7s ease-out;
      }
      .slcm-fade-in.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    /* Cibler toutes les sections sauf hero */
    const sections = document.querySelectorAll('section.section-soft, section.section-partner');
    sections.forEach(s => s.classList.add('slcm-fade-in'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    sections.forEach(s => observer.observe(s));
  }

  /* ══════════════════════════════════════
     3. CTA PUBLIER — avant le footer
  ══════════════════════════════════════ */
  function buildPublishCTA() {
    const partnerSection = document.querySelector('.section-partner');
    if (!partnerSection || document.getElementById('publishCTA')) return;

    const cta = document.createElement('section');
    cta.id = 'publishCTA';
    cta.innerHTML = `
      <style>
        #publishCTA {
          background: linear-gradient(135deg, #111 0%, #1a1a1a 50%, #2a2a2a 100%);
          padding: 4rem 1.5rem;
          position: relative;
          overflow: hidden;
        }
        #publishCTA::before {
          content: '';
          position: absolute; top:-50%; right:-10%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(255,122,0,.2) 0%, transparent 70%);
          pointer-events: none;
        }
        #publishCTA .pc-inner {
          max-width: 900px; margin: auto;
          text-align: center; position: relative; z-index: 1;
        }
        #publishCTA .pc-badge {
          display: inline-block;
          background: rgba(255,122,0,.2); color: #ff7a00;
          padding: .35rem 1rem; border-radius: 999px;
          font-size: .78rem; font-weight: 800;
          letter-spacing: .04em; text-transform: uppercase;
          margin-bottom: 1rem;
        }
        #publishCTA h2 {
          color: #fff; font-size: 2rem; font-weight: 900;
          line-height: 1.2; margin-bottom: 1rem;
        }
        #publishCTA h2 .accent { color: #ff7a00; }
        #publishCTA p {
          color: rgba(255,255,255,.7); font-size: 1rem;
          line-height: 1.6; margin-bottom: 2rem;
          max-width: 600px; margin-left: auto; margin-right: auto;
        }
        #publishCTA .pc-btn {
          display: inline-flex; align-items: center; gap: .6rem;
          background: #ff7a00; color: #fff;
          padding: 1.1rem 2.2rem; border-radius: 999px;
          font-weight: 800; font-size: 1rem;
          text-decoration: none; border: none; cursor: pointer;
          font-family: inherit;
          transition: transform .2s, box-shadow .2s;
          box-shadow: 0 12px 30px rgba(255,122,0,.35);
        }
        #publishCTA .pc-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(255,122,0,.5);
        }
        #publishCTA .pc-features {
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 1.5rem; margin-top: 2rem;
          font-size: .85rem; color: rgba(255,255,255,.6);
        }
        #publishCTA .pc-features span {
          display: inline-flex; align-items: center; gap: .4rem;
        }
        @media (max-width: 600px) {
          #publishCTA { padding: 3rem 1rem; }
          #publishCTA h2 { font-size: 1.5rem; }
          #publishCTA p { font-size: .9rem; }
          #publishCTA .pc-btn { padding: .9rem 1.5rem; font-size: .9rem; }
        }
      </style>
      <div class="pc-inner">
        <span class="pc-badge">⚡ Gratuit · 3 minutes</span>
        <h2>Vous avez un bien à louer ou à vendre ?<br><span class="accent">Publiez GRATUITEMENT</span> votre annonce</h2>
        <p>Touchez des milliers d'acheteurs et locataires au Cameroun et dans la diaspora. Sans frais cachés. Sans engagement.</p>
        <a href="/publier" class="pc-btn">
          <i class="fas fa-plus-circle"></i> Publier mon annonce maintenant
        </a>
        <div class="pc-features">
          <span>✅ Sans frais</span>
          <span>📸 Jusqu'à 10 photos</span>
          <span>🔥 Boost optionnel</span>
          <span>📱 Visible sur mobile</span>
        </div>
      </div>
    `;
    partnerSection.parentNode.insertBefore(cta, partnerSection);
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  function init() {
    buildUrgencyBanner();
    buildPublishCTA();
    setupScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
