/**
 * SE LOGER CM — Listings Supabase
 * Gestion complète des annonces : lecture, création, filtres, favoris.
 */

const SLCM_listings = (() => {

  async function sb() { return window.SLCM_DB ? window.SLCM_DB.init() : null; }

  /* ── Formatage prix ─────────────────────────────────────────────── */
  function fmtPrice(n) {
    return (n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  /* ── Lire toutes les annonces (avec filtres optionnels) ─────────── */
  async function getListings(filters = {}) {
    const client = await sb();
    let query = client
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.mode)     query = query.eq('rent_sale', filters.mode);
    if (filters.city)     query = query.eq('city', filters.city);
    if (filters.district) query = query.eq('district', filters.district);
    if (filters.type)     query = query.eq('type', filters.type);
    if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);
    if (filters.furnished !== undefined) query = query.eq('furnished', filters.furnished);

    /* Filtre prix */
    if (filters.price) {
      const ranges = {
        '0-100k':    [0,       100000],
        '100k-300k': [100000,  300000],
        '300k-600k': [300000,  600000],
        '600k+':     [600000,  999999999],
        '0-15m':     [0,       15000000],
        '15m-50m':   [15000000, 50000000],
        '50m-100m':  [50000000, 100000000],
        '100m+':     [100000000, 999999999],
      };
      const [min, max] = ranges[filters.price] || [0, 999999999];
      query = query.gte('price', min).lte('price', max);
    }

    const { data, error } = await query;
    if (error) { console.error('getListings:', error); return []; }
    return data || [];
  }

  /* ── Annonces premium (pour l'accueil) ──────────────────────────── */
  async function getPremiumListings(furnished = false, limit = 6) {
    const client = await sb();
    /* Récupérer TOUS les premium LOCATION de type résidentiel uniquement
       (exclut les locaux commerciaux, terrains, fonds de commerce) */
    const { data, error } = await client
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .eq('premium', true)
      .eq('furnished', furnished)
      .eq('rent_sale', 'rent')
      .in('type', ['apartment', 'house', 'studio', 'villa', 'duplex'])
      .order('created_at', { ascending: false });
    if (error) { console.error('getPremiumListings:', error); return []; }
    /* Rotation déterministe : change toutes les 30 minutes */
    return rotatePremium(data || [], limit);
  }

  /* Rotation déterministe basée sur l'heure (tranche de 30 min) */
  function rotatePremium(arr, limit) {
    if (!arr.length) return [];
    if (arr.length <= limit) return arr;
    /* Seed = nombre de tranches de 30 min depuis epoch */
    const seed = Math.floor(Date.now() / (30 * 60 * 1000));
    /* Décalage circulaire basé sur le seed */
    const offset = seed % arr.length;
    const rotated = [...arr.slice(offset), ...arr.slice(0, offset)];
    return rotated.slice(0, limit);
  }

  /* ── Lire une annonce par ID ─────────────────────────────────────── */
  async function getListingById(id) {
    const client = await sb();
    const { data, error } = await client
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error('getListingById:', error); return null; }
    return data;
  }

  /* ── Annonces d'un utilisateur ──────────────────────────────────── */
  async function getMyListings(userId) {
    const client = await sb();
    const { data, error } = await client
      .from('listings')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('getMyListings:', error); return []; }
    return data || [];
  }

  /* ── Créer une annonce ──────────────────────────────────────────── */
  async function createListing(payload) {
    const client = await sb();
    const user   = await window.SLCM?.getCurrentUser();
    const item = {
      owner_id:    user?.id || null,
      title:       payload.title,
      description: payload.description || '',
      type:        payload.type,
      rent_sale:   payload.rentSale || 'rent',
      city:        payload.city,
      district:    payload.district || '',
      price:       Number(payload.price) || 0,
      bedrooms:    payload.bedrooms || null,
      furnished:   !!payload.furnished,
      business_rent: payload.business_rent || null,
      business_activity: payload.business_activity || null,
      premium:     false,
      status:      'active',
      images:      payload.images || [],
      created_at:  new Date().toISOString()
    };
    const { data, error } = await client.from('listings').insert([item]).select().single();
    if (error) { console.error('createListing:', error); return null; }
    return data;
  }

  /* ── Mettre à jour une annonce ──────────────────────────────────── */
  async function updateListing(id, updates) {
    const client = await sb();
    const { data, error } = await client
      .from('listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updateListing:', error); return null; }
    return data;
  }

  /* ── Supprimer une annonce ──────────────────────────────────────── */
  async function deleteListing(id) {
    const client = await sb();
    const { error } = await client.from('listings').delete().eq('id', id);
    if (error) { console.error('deleteListing:', error); return false; }
    return true;
  }

  /* ── Upload photos vers Supabase Storage ────────────────────────── */
  async function uploadImages(files, listingId) {
    const client = await sb();
    if (!client) { console.error('uploadImages: client non disponible'); return []; }
    const urls = [];
    for (const file of files) {
      const ext  = file.name.split('.').pop();
      const path = `listings/${listingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error } = await client.storage.from('listing-images').upload(path, file, {
        cacheControl: '3600', upsert: false
      });
      if (error) {
      } else {
        const { data } = client.storage.from('listing-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  }

  /* ── Générer une card HTML ──────────────────────────────────────── */
  function renderCard(listing, { showFav = true } = {}) {
    const img   = (listing.images && listing.images[0]) || 'assets/img/no-image.png';
    const title = listing.title || listing.title_fr || 'Annonce';
    const rentSale = listing.rent_sale || listing.rentSale || 'rent';
    const isBusiness = listing.type === 'fonds-commerce';
    const mode  = isBusiness ? 'Fonds de commerce' : (rentSale === 'sale' ? 'À vendre' : 'À louer');
    const badge = listing.premium
      ? '<div class="listing-badge premium">PREMIUM</div>'
      : listing.furnished
        ? '<div class="listing-badge">Meublé</div>'
        : (isBusiness ? '<div class="listing-badge">Cession</div>' : '');
    const fav = showFav
      ? `<button class="fav-btn" data-id="${listing.id}" title="Ajouter aux favoris" onclick="event.preventDefault()">
           <i class="far fa-heart"></i>
         </button>` : '';

    const businessLine = isBusiness && listing.business_rent
      ? `<div style="font-size:.82rem;color:#666;margin-top:.25rem">Loyer : ${fmtPrice(listing.business_rent)}/mois</div>`
      : '';

    const chips = isBusiness
      ? `<span style="background:#f0f0f0;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${mode}</span>
         ${listing.business_activity ? `<span style="background:#fff4e8;color:#ff7a00;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${listing.business_activity}</span>` : ''}`
      : `<span style="background:#f0f0f0;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${mode}</span>
         ${listing.bedrooms ? `<span style="background:#f0f0f0;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${listing.bedrooms} ch.</span>` : ''}
         ${listing.furnished ? `<span style="background:#fff4e8;color:#ff7a00;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">Meublé</span>` : ''}`;

    return `
      <div class="listing-card">
        <a href="/annonce?id=${listing.id}" style="text-decoration:none;color:inherit">
          <div class="listing-thumb" style="position:relative;height:200px;background:#eee;overflow:hidden">
            <img src="${img}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover">
            ${badge}
            ${fav}
          </div>
          <div class="listing-body" style="padding:1rem">
            <div style="font-weight:800;font-size:.95rem;color:#111;margin-bottom:.4rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            <div style="font-size:.82rem;color:#888;margin-bottom:.4rem">
              <i class="fas fa-map-marker-alt" style="color:#ff7a00"></i>
              ${listing.district || ''} ${listing.city || ''}
            </div>
            <div style="font-weight:900;font-size:1rem;color:#ff7a00">
              ${fmtPrice(listing.price)}
              ${rentSale === 'rent' ? '<span style="font-size:.8rem;font-weight:400;color:#888">/mois</span>' : ''}
            </div>
            ${businessLine}
            ${listing.furnished && listing.price_per_day && rentSale === 'rent' ? `
            <div style="font-size:.85rem;font-weight:700;color:#666;margin-top:.2rem">
              ${fmtPrice(listing.price_per_day)}<span style="font-size:.78rem;font-weight:400">/jour</span>
            </div>` : ''}
            <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap">
              ${chips}
            </div>
          </div>
        </a>
      </div>`;
  }

  return {
    getListings, getPremiumListings, getListingById,
    getMyListings, createListing, updateListing, deleteListing,
    uploadImages, renderCard, fmtPrice
  };
})();

window.SLCM_listings = SLCM_listings;
