/**
 * testimonials.js — SE LOGER CM
 * Lecture depuis Supabase (table testimonials)
 * Affichage sur about.html et index.html
 * Ajout / suppression via Supabase Auth (admin uniquement)
 */
(function () {

  /* ─── Fallback si Supabase indisponible ─── */
  const DEMO_TESTIMONIALS = [
    {
      id: 'demo1', name: 'Marie K.', service: 'Location résidentielle',
      location: 'Bonamoussadi, Douala', stars: 5, is_demo: true,
      created_at: '2025-11-15',
      content: 'Équipe très professionnelle et réactive. J\'ai trouvé mon appartement en moins de deux semaines. Je recommande vivement SE LOGER CM à tous ceux qui cherchent un logement à Douala.'
    },
    {
      id: 'demo2', name: 'Paul N.', service: 'Vente immobilière',
      location: 'Bonapriso, Douala', stars: 5, is_demo: true,
      created_at: '2025-10-28',
      content: 'Grâce à SE LOGER CM, j\'ai vendu ma villa en un mois au prix souhaité. Leur connaissance du marché local est impressionnante. Un accompagnement de A à Z vraiment irréprochable.'
    },
    {
      id: 'demo3', name: 'Christelle M.', service: 'Gestion locative',
      location: 'Akwa, Douala', stars: 4, is_demo: true,
      created_at: '2025-09-10',
      content: 'Je leur ai confié la gestion de mon appartement et je n\'ai plus aucun souci. Loyers versés à temps, locataires sérieux. Exactement ce dont j\'avais besoin en tant que propriétaire.'
    }
  ];

  /* ─── Attendre Supabase ─── */
  async function waitSB(ms = 5000) {
    const step = 100; let elapsed = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && elapsed < ms) {
      await new Promise(r => setTimeout(r, step)); elapsed += step;
    }
    return window.SLCM_DB?.client || null;
  }

  /* ─── Vérifier admin via Supabase Auth ─── */
  async function checkIsAdmin() {
    try {
      if (!window.SLCM) return false;
      const user = await window.SLCM.getCurrentUser();
      return !!(user && window.SLCM.isAdmin(user));
    } catch(e) { return false; }
  }

  /* ─── Lire depuis Supabase ─── */
  async function fetchTestimonials() {
    const client = await waitSB();
    if (!client) return DEMO_TESTIMONIALS;
    try {
      const { data, error } = await client
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data?.length) return DEMO_TESTIMONIALS;
      return data;
    } catch(e) { return DEMO_TESTIMONIALS; }
  }

  /* ─── Ajouter dans Supabase ─── */
  async function addTestimonial(item) {
    const client = await waitSB();
    if (!client) return null;
    const { data, error } = await client
      .from('testimonials')
      .insert([{
        name:     item.name,
        service:  item.service || '',
        location: item.location || '',
        content:  item.content,
        stars:    item.stars || 5,
        rating:   item.stars || 5,
        is_demo:  false
      }])
      .select().single();
    if (error) { console.error('addTestimonial:', error); return null; }
    return data;
  }

  /* ─── Supprimer dans Supabase ─── */
  async function removeTestimonial(id) {
    const client = await waitSB();
    if (!client) return false;
    const { error } = await client.from('testimonials').delete().eq('id', id);
    if (error) { console.error('removeTestimonial:', error); return false; }
    return true;
  }

  /* ─── API publique ─── */
  window.SLCM_testimonials = { getAll: fetchTestimonials, add: addTestimonial, remove: removeTestimonial };

  /* ─── Helpers d'affichage ─── */
  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const AVATAR_COLORS = ['#1D9E75', '#ff7a00', '#378ADD', '#7F77DD', '#D85A30', '#D4537E'];
  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name||'').length; i++) h += name.charCodeAt(i);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  function starsHtml(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
  function getLang() { return localStorage.getItem('slcm_lang') || 'fr'; }

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(
      getLang() === 'en' ? 'en-GB' : 'fr-FR',
      { month: 'long', year: 'numeric' }
    );
  }

  /* ─── Construire une card ─── */
  function buildCard(item, isAdmin) {
    const card  = document.createElement('div');
    card.className  = 'temoignage-card';
    card.dataset.id = item.id;
    const stars = item.stars || item.rating || 5;

    card.innerHTML = `
      ${isAdmin && !item.is_demo ? `<button class="temoignage-delete" data-id="${item.id}" title="Supprimer"><i class="fas fa-trash-alt"></i></button>` : ''}
      <div class="temoignage-quote">${item.content || ''}</div>
      <div class="temoignage-footer">
        <div class="temoignage-avatar" style="background:${avatarColor(item.name)}">${initials(item.name)}</div>
        <div>
          <div class="temoignage-name">${item.name}</div>
          <div class="temoignage-meta">${item.service || ''}${item.location ? ' · ' + item.location : ''}</div>
          <div class="temoignage-stars">${starsHtml(stars)}</div>
        </div>
        <div style="margin-left:auto;font-size:.72rem;color:#bbb">${fmtDate(item.created_at)}</div>
      </div>`;

    card.querySelector('.temoignage-delete')?.addEventListener('click', async () => {
      if (!confirm(getLang() === 'en' ? 'Delete this testimonial?' : 'Supprimer ce témoignage ?')) return;
      if (!await removeTestimonial(item.id)) return;
      card.style.cssText += 'transition:opacity .3s,transform .3s;opacity:0;transform:scale(.9)';
      setTimeout(() => { card.remove(); checkEmpty(card.parentElement); }, 300);
    });

    return card;
  }

  function checkEmpty(grid) {
    if (!grid || grid.querySelectorAll('.temoignage-card').length > 0) return;
    grid.innerHTML = `<div class="temoignage-placeholder"><i class="fas fa-quote-left"></i><p>${getLang()==='en'?'No testimonials yet.':'Aucun témoignage pour l\'instant.'}</p></div>`;
  }

  /* ─── Rendu grille ─── */
  async function renderGrid(gridEl, limit) {
    if (!gridEl) return;
    gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#aaa"><i class="fas fa-spinner fa-spin"></i></div>';
    const isAdmin = await checkIsAdmin();
    if (isAdmin) gridEl.classList.add('admin-mode');
    const list = (await fetchTestimonials()).slice(0, limit || 99);
    gridEl.innerHTML = '';
    if (!list.length) {
      gridEl.innerHTML = `<div class="temoignage-placeholder"><i class="fas fa-quote-left"></i><p>${getLang()==='en'?'Coming soon.':'Bientôt disponible.'}</p></div>`;
      return;
    }
    list.forEach(item => gridEl.appendChild(buildCard(item, isAdmin)));
  }

  function refreshAllGrids() {
    const main = document.getElementById('temoignagesGrid');
    if (main) renderGrid(main);
    const home = document.getElementById('testimonialsSection');
    if (home) renderGrid(home, 3);
  }
  document.addEventListener('slcm:langchange', refreshAllGrids);

  /* ─── Formulaire admin ─── */
  async function initAdminForm() {
    const isAdmin  = await checkIsAdmin();
    const adminBtn = document.getElementById('adminTestimonialBtn');
    if (!adminBtn) return;
    if (isAdmin) adminBtn.style.display = 'block';

    let selectedStars = 5;
    const starSel = document.getElementById('starSelect');
    const starVal = document.getElementById('starValue');
    if (starSel) {
      const stars = starSel.querySelectorAll('span');
      function updateStars(val) {
        selectedStars = val;
        stars.forEach(s => { s.classList.toggle('active', Number(s.dataset.val) <= val); s.classList.remove('hover'); });
        if (starVal) starVal.textContent = `${val} / 5`;
      }
      updateStars(5);
      stars.forEach(s => {
        s.addEventListener('mouseover', () => stars.forEach(x => x.classList.toggle('hover', Number(x.dataset.val) <= Number(s.dataset.val))));
        s.addEventListener('mouseout',  () => stars.forEach(x => x.classList.remove('hover')));
        s.addEventListener('click',     () => updateStars(Number(s.dataset.val)));
      });
    }

    const formWrap = document.getElementById('testimonialForm');
    document.getElementById('openTestimonialForm')?.addEventListener('click', () => {
      formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('tfCancel')?.addEventListener('click', () => { formWrap.style.display = 'none'; });

    document.getElementById('tfSave')?.addEventListener('click', async () => {
      const name    = document.getElementById('tfName')?.value.trim();
      const content = document.getElementById('tfContent')?.value.trim();
      if (!name || !content) { alert('Nom et témoignage sont obligatoires.'); return; }

      const btn = document.getElementById('tfSave');
      btn.disabled = true; btn.textContent = 'Enregistrement…';

      const item = await addTestimonial({
        name,
        service:  document.getElementById('tfService')?.value.trim(),
        location: document.getElementById('tfLocation')?.value.trim(),
        content,
        stars: selectedStars
      });

      btn.disabled = false; btn.textContent = 'Enregistrer';
      if (!item) { alert('Erreur lors de l\'enregistrement.'); return; }

      const grid = document.getElementById('temoignagesGrid');
      if (grid) { grid.querySelector('.temoignage-placeholder')?.remove(); grid.insertBefore(buildCard(item, true), grid.firstChild); }
      ['tfName','tfService','tfLocation','tfContent'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      formWrap.style.display = 'none';
    });
  }

  /* ─── Init ─── */
  async function init() {
    const grid = document.getElementById('temoignagesGrid');
    if (grid) { await renderGrid(grid); await initAdminForm(); }
    const home = document.getElementById('testimonialsSection');
    if (home) await renderGrid(home, 3);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
