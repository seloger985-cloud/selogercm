/**
 * favorites.js — SE LOGER CM
 * Favoris synchronisés : Supabase si connecté, localStorage sinon.
 * Migration automatique au login : localStorage → Supabase.
 */

const SLCM_favorites = (() => {
  const KEY = 'selogercm_favorites';
  let _cachedFavs = null;   /* Cache pour éviter de spammer Supabase */
  let _isLoading = false;

  /* ══════════════════════════════════════
     HELPERS SESSION
  ══════════════════════════════════════ */
  async function getUser() {
    if (!window.SLCM_DB?.client) return null;
    try {
      const { data: { session } } = await window.SLCM_DB.client.auth.getSession();
      return session?.user || null;
    } catch { return null; }
  }

  /* ══════════════════════════════════════
     LECTURE DES FAVORIS
  ══════════════════════════════════════ */
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function saveLocal(ids) {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }

  async function loadRemote(userId) {
    if (!window.SLCM_DB?.client) return [];
    const { data, error } = await window.SLCM_DB.client
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId);
    if (error) { console.warn('fav load:', error.message); return []; }
    return (data || []).map(r => r.listing_id);
  }

  /* Retourne la liste d'IDs en favori — async */
  async function load() {
    if (_cachedFavs !== null) return _cachedFavs;
    const user = await getUser();
    if (user) {
      _cachedFavs = await loadRemote(user.id);
    } else {
      _cachedFavs = loadLocal();
    }
    return _cachedFavs;
  }

  /* Synchrone pour les vérifications rapides UI (utilise le cache) */
  function loadSync() {
    return _cachedFavs !== null ? _cachedFavs : loadLocal();
  }

  function isFav(id) {
    return loadSync().includes(id);
  }

  /* ══════════════════════════════════════
     TOGGLE (ajouter/retirer)
  ══════════════════════════════════════ */
  async function toggle(id) {
    const user = await getUser();
    const favs = await load();
    const isAlreadyFav = favs.includes(id);

    if (user) {
      if (isAlreadyFav) {
        await window.SLCM_DB.client
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        _cachedFavs = favs.filter(x => x !== id);
      } else {
        await window.SLCM_DB.client
          .from('favorites')
          .insert({ user_id: user.id, listing_id: id });
        _cachedFavs = [...favs, id];
      }
    } else {
      /* Fallback localStorage */
      if (isAlreadyFav) {
        _cachedFavs = favs.filter(x => x !== id);
      } else {
        _cachedFavs = [...favs, id];
      }
      saveLocal(_cachedFavs);
    }

    return !isAlreadyFav; /* true = ajouté */
  }

  /* ══════════════════════════════════════
     MIGRATION localStorage → Supabase (au login)
  ══════════════════════════════════════ */
  async function migrateLocalToRemote(userId) {
    const localFavs = loadLocal();
    if (!localFavs.length || !window.SLCM_DB?.client) return;

    /* Récupérer favoris déjà en base */
    const remoteFavs = await loadRemote(userId);
    const toInsert = localFavs
      .filter(id => !remoteFavs.includes(id))
      .map(id => ({ user_id: userId, listing_id: id }));

    if (toInsert.length) {
      const { error } = await window.SLCM_DB.client
        .from('favorites')
        .insert(toInsert);
      if (!error) {
        localStorage.removeItem(KEY);  /* Nettoyer local après migration */
        console.log(`Favoris migrés vers Supabase : ${toInsert.length}`);
      }
    } else {
      /* Tout est déjà en base — on peut nettoyer le local */
      localStorage.removeItem(KEY);
    }

    _cachedFavs = null;  /* Invalider le cache */
  }

  /* ══════════════════════════════════════
     RENDU DE LA PAGE favorites.html
  ══════════════════════════════════════ */
  async function renderFavoritesPage() {
    const area  = document.getElementById('favoritesArea');
    const label = document.getElementById('favCountLabel');
    if (!area) return;

    if (_isLoading) return;
    _isLoading = true;

    area.innerHTML = `<div style="text-align:center;padding:2rem;color:#aaa"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem"></i></div>`;

    /* Attendre Supabase */
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100)); tries++;
    }

    if (!window.SLCM_DB?.client) {
      area.innerHTML = '<p style="color:#c00;text-align:center">Erreur de connexion.</p>';
      _isLoading = false;
      return;
    }

    /* Charger les favoris */
    const ids = await load();
    _isLoading = false;

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

    const { data, error } = await window.SLCM_DB.client
      .from('listings')
      .select('*')
      .in('id', ids)
      .eq('status', 'active');

    if (error || !data?.length) {
      if (label) label.textContent = '0 favori';
      area.innerHTML = `
        <div class="fav-empty">
          <i class="fas fa-heart" style="font-size:3rem;color:#eee;display:block;margin-bottom:1rem"></i>
          <h3>Aucun favori trouvé</h3>
          <p>Les annonces sauvegardées ont peut-être été retirées.</p>
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
      const url   = ad.slug ? `/annonce/${ad.slug}` : `/annonce?id=${ad.id}`;

      return `
        <div class="fav-card">
          <a href="${url}" style="text-decoration:none;color:inherit">
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
            <a href="${url}" class="fav-see-btn">
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
      btn.addEventListener('click', async () => {
        await toggle(btn.dataset.id);
        renderFavoritesPage();
      });
    });
  }

  /* ══════════════════════════════════════
     MISE À JOUR DES BOUTONS ❤️ sur les cards
  ══════════════════════════════════════ */
  async function updateFavButtons() {
    await load();  /* S'assure que le cache est rempli */
    document.querySelectorAll('.fav-btn[data-id]').forEach(btn => {
      const id = btn.dataset.id;
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isFav(id) ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = isFav(id) ? '#ff4f4f' : '';
      }
    });
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', async () => {
    /* Attendre Supabase pour la migration */
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 30) {
      await new Promise(r => setTimeout(r, 100)); tries++;
    }

    if (window.SLCM_DB?.client) {
      const user = await getUser();
      if (user) {
        await migrateLocalToRemote(user.id);
      }

      /* Écouter les changements d'auth (login/logout) pour invalider le cache */
      window.SLCM_DB.client.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN') {
          const u = await getUser();
          if (u) await migrateLocalToRemote(u.id);
          _cachedFavs = null;
          updateFavButtons();
        } else if (event === 'SIGNED_OUT') {
          _cachedFavs = null;
          updateFavButtons();
        }
      });
    }

    /* Page favorites.html */
    if (document.getElementById('favoritesArea')) {
      renderFavoritesPage();
    }

    /* Délégation sur les boutons ❤️ */
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.fav-btn[data-id]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id    = btn.dataset.id;

      /* Animation immédiate pour UX */
      const icon = btn.querySelector('i');
      const willAdd = !isFav(id);
      if (icon) {
        icon.className = willAdd ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = willAdd ? '#ff4f4f' : '';
      }

      /* Toggle asynchrone */
      try {
        const added = await toggle(id);
        if (window.SLCM_toast) {
          SLCM_toast(added ? '❤️ Ajouté aux favoris' : 'Retiré des favoris');
        }
      } catch (err) {
        /* Revert UI en cas d'erreur */
        if (icon) {
          icon.className = willAdd ? 'far fa-heart' : 'fas fa-heart';
          icon.style.color = willAdd ? '' : '#ff4f4f';
        }
        console.error('fav toggle:', err);
      }
    });

    updateFavButtons();
  });

  /* API publique */
  return {
    load, loadSync, isFav, toggle,
    updateFavButtons, renderFavoritesPage,
    migrateLocalToRemote
  };
})();

window.SLCM_favorites = SLCM_favorites;
