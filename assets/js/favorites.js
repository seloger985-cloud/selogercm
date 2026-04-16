/**
 * favorites.js — SE LOGER CM
 * Gestion des favoris via localStorage
 */

const SLCM_favorites = (() => {
  const KEY = 'selogercm_favorites';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch(e) { return []; }
  }

  function save(ids) {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }

  function isFav(id) {
    return load().includes(id);
  }

  function toggle(id) {
    const favs = load();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id);
    else favs.splice(idx, 1);
    save(favs);
    return idx === -1; // true = ajouté
  }

  /* ── Rendu de la page favorites.html ── */
  async function renderFavoritesPage() {
    const area  = document.getElementById('favoritesArea');
    const label = document.getElementById('favCountLabel');
    if (!area) return;

    const ids = load();

    if (!ids.length) {
      if (label) label.textContent = '0 favori';
      area.innerHTML = `
        <div class="fav-empty">
          <i class="fas fa-heart" style="font-size:3rem;color:#eee;display:block;margin-bottom:1rem"></i>
          <h3>Aucun favori pour l'instant</h3>
          <p>Sauvegardez des annonces en cliquant sur le ❤️</p>
          <a href="/annonces" class="fav-browse-btn">
            <i class="fas fa-search"></i> Voir les annonces
          </a>
        </div>`;
      return;
    }

    area.innerHTML = `<div style="text-align:center;padding:2rem;color:#aaa"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem"></i></div>`;

    /* Attendre Supabase */
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100)); tries++;
    }

    if (!window.SLCM_DB?.client) {
      area.innerHTML = '<p style="color:#c00;text-align:center">Erreur de connexion.</p>';
      return;
    }

    const { data, error } = await window.SLCM_DB.client
      .from('listings')
      .select('*')
      .in('id', ids);

    if (error || !data?.length) {
      if (label) label.textContent = '0 favori';
      area.innerHTML = `
        <div class="fav-empty">
          <i class="fas fa-heart" style="font-size:3rem;color:#eee;display:block;margin-bottom:1rem"></i>
          <h3>Aucun favori trouvé</h3>
          <p>Les annonces sauvegardées ont peut-être expiré.</p>
          <a href="/annonces" class="fav-browse-btn"><i class="fas fa-search"></i> Voir les annonces</a>
        </div>`;
      return;
    }

    if (label) label.textContent = `${data.length} favori${data.length > 1 ? 's' : ''}`;

    area.innerHTML = `<div class="fav-grid">${data.map(ad => {
      const img   = ad.images?.[0] || 'assets/img/no-image.png';
      const title = ad.title_fr || ad.title || 'Annonce';
      const mode  = ad.rent_sale === 'sale' ? 'À vendre' : 'À louer';
      const price = (ad.price || 0).toLocaleString('fr-FR') + ' FCFA';

      return `
        <div class="fav-card">
          <a href="/annonce?id=${ad.id}" style="text-decoration:none;color:inherit">
            <div class="fav-thumb">
              <img src="${img}" alt="${title}" loading="lazy">
              ${ad.premium ? '<span class="fav-badge premium">PREMIUM</span>' : ''}
            </div>
            <div class="fav-body">
              <div class="fav-title">${title}</div>
              <div class="fav-meta"><i class="fas fa-map-marker-alt"></i> ${ad.district || ''} ${ad.city || ''} · ${mode}</div>
              <div class="fav-price">${price}</div>
            </div>
          </a>
          <div class="fav-actions">
            <a href="/annonce?id=${ad.id}" class="fav-see-btn">
              <i class="fas fa-eye"></i> Voir l'annonce
            </a>
            <button class="fav-remove-btn" data-id="${ad.id}">
              <i class="fas fa-trash"></i> Retirer
            </button>
          </div>
        </div>`;
    }).join('')}</div>`;

    /* Bind boutons retirer */
    area.querySelectorAll('.fav-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle(btn.dataset.id);
        renderFavoritesPage();
      });
    });
  }

  /* ── Mettre à jour les boutons ❤️ sur les pages de listing ── */
  function updateFavButtons() {
    document.querySelectorAll('.fav-btn[data-id]').forEach(btn => {
      const id = btn.dataset.id;
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isFav(id) ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = isFav(id) ? '#ff4f4f' : '';
      }
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    /* Page favorites.html */
    if (document.getElementById('favoritesArea')) {
      renderFavoritesPage();
    }

    /* Délégation sur les boutons ❤️ */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.fav-btn[data-id]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id    = btn.dataset.id;
      const added = toggle(id);
      const icon  = btn.querySelector('i');
      if (icon) {
        icon.className = added ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = added ? '#ff4f4f' : '';
      }
      /* Toast */
      if (window.SLCM_toast) {
        SLCM_toast(added ? '❤️ Ajouté aux favoris' : 'Retiré des favoris');
      }
    });

    updateFavButtons();
  });

  return { load, save, isFav, toggle, updateFavButtons };
})();

window.SLCM_favorites = SLCM_favorites;
