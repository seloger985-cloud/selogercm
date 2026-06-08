/**
 * SE LOGER CM — Listings Supabase
 * Gestion complète des annonces : lecture, création, filtres, favoris.
 */

const SLCM_listings = (() => {

  /* Attend que SLCM_DB soit initialisé (race condition avec supabase.js async).
     Réessaie pendant max 5 secondes — au-delà on retourne null pour éviter de freeze. */
  async function sb() {
    let tries = 0;
    while (tries < 50) {
      if (window.SLCM_DB && typeof window.SLCM_DB.init === 'function') {
        try {
          const client = await window.SLCM_DB.init();
          if (client) return client;
        } catch (_) { /* retry */ }
      }
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    console.error('[SLCM] Supabase client unavailable after 5s');
    return null;
  }

  /* Champs nécessaires pour l'affichage en card — évite de fetcher
     description, superficies, charges, etc. inutiles pour les grilles.
     IMPORTANT: 'slug' est requis pour générer les URLs SEO /annonce/{slug}. */
  const CARD_FIELDS = [
    'id', 'slug', 'title', 'images', 'video_url',
    'rent_sale', 'furnished', 'premium', 'boost_expires_at',
    'price', 'price_per_day', 'bedrooms', 'district', 'city',
    'type', 'status', 'statut', 'rental_segment', 'created_at', 'owner_phone',
    'owner_kyc_verified', 'owner_is_pro'
  ].join(',');

  /* Construit une URL d'annonce robuste — préfère le slug, fallback id, garde contre undefined */
  function getListingUrl(listing) {
    const ref = (listing && (listing.slug || listing.id)) || '';
    if (!ref) return '/annonces';  /* garde-fou : redirige vers la liste si pas d'identifiant */
    return '/annonce/' + encodeURIComponent(ref);
  }

  /* ── Formatage prix ─────────────────────────────────────────────── */
  function fmtPrice(n) {
    return (n || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  /* ── Lire toutes les annonces (avec filtres optionnels) ─────────── */
  async function getListings(filters = {}) {
    const client = await sb();
    if (!client) {
      console.error('[SLCM_listings] Supabase indisponible');
      return [];
    }
    let query = client
      .from('listings')
      .select(CARD_FIELDS)
      .eq('status', 'active');

    if      (filters.sort === 'price_asc')  query = query.order('price',      { ascending: true  });
    else if (filters.sort === 'price_desc') query = query.order('price',      { ascending: false });
    else                                    query = query.order('created_at', { ascending: false });

    if (filters.mode)     query = query.eq('rent_sale', filters.mode);
    if (filters.city)     query = query.eq('city', filters.city);
    if (filters.district) {
      const districts = Array.isArray(filters.district)
        ? filters.district.filter(Boolean)
        : [filters.district];
      if (districts.length === 1) query = query.eq('district', districts[0]);
      else if (districts.length > 1) query = query.in('district', districts);
    }
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
        '0-15m':     [0,         15000000],
        '10m+':      [10000000,  999999999],
        '15m-50m':   [15000000,  50000000],
        '50m-100m':  [50000000,  100000000],
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
    const { data, error } = await client
      .from('listings')
      .select(CARD_FIELDS)
      .eq('status', 'active')
      .eq('premium', true)
      .eq('furnished', furnished)
      .eq('rent_sale', 'rent')
      .in('type', ['apartment', 'house', 'studio', 'villa', 'duplex'])
      .order('boost_expires_at', { ascending: false, nullsFirst: false })
      .order('created_at',       { ascending: false });
    if (error) { console.error('getPremiumListings:', error); return []; }

    const now  = Date.now();
    const all  = data || [];
    /* Séparer : boosts actifs (priorité garantie) et le reste */
    const boosted   = all.filter(l => l.boost_expires_at && new Date(l.boost_expires_at) > now);
    const unboosted = all.filter(l => !l.boost_expires_at || new Date(l.boost_expires_at) <= now);

    /* Slots boostés d'abord, puis rotation sur le reste */
    const slots = limit - Math.min(boosted.length, limit);
    return [...boosted.slice(0, limit), ...rotatePremium(unboosted, slots)].slice(0, limit);
  }

  /* Rotation déterministe basée sur l'heure (tranche de 30 min) */
  function rotatePremium(arr, limit) {
    if (!arr.length || !limit) return [];
    if (arr.length <= limit) return arr;
    const seed   = Math.floor(Date.now() / (30 * 60 * 1000));
    const offset = seed % arr.length;
    return [...arr.slice(offset), ...arr.slice(0, offset)].slice(0, limit);
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

  /* ── Resize côté client avant upload (Canvas API) ──────────────── */
  function resizeImage(file, maxW, maxH, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => resolve(blob || file),
            'image/webp', quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  /* ── Dérive une variante Cloudflare Images depuis l'URL stockée (.../public)
     Fallback : URL Supabase non encore migrée renvoyée telle quelle (transition). ── */
  function cfVariant(url, variant) {
    if (!url) return '';
    if (url.includes('imagedelivery.net')) {
      return url.replace(/\/[^/]+$/, '/' + variant);
    }
    return url;
  }

  function getTransformUrl(url, opts = {}) {
    const w = opts.width || 0;
    let variant = 'public';
    if (w && w <= 360)       variant = 'thumb';
    else if (w && w <= 1100) variant = 'gallery';
    return cfVariant(url, variant);
  }

  /* ── Upload photos vers Cloudflare Images ───────────────────────── */
  async function uploadImages(files, listingId) {
    const client = await sb();
    if (!client) { console.error('uploadImages: client non disponible'); return []; }
    const urls = [];
    const token = (await client.auth.getSession()).data.session?.access_token;
    for (const file of files) {
      /* Resize à 1200×900 max en WebP avant upload (compression conservée) */
      const resized = await resizeImage(file, 1200, 900, 0.82);
      try {
        const r = await fetch('/.netlify/functions/cf-image-upload-url', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!r.ok) throw new Error("URL d'upload indisponible");
        const { uploadURL, id, accountHash } = await r.json();
        const fd = new FormData();
        fd.append('file', new File([resized], 'photo.webp', { type: 'image/webp' }));
        const up = await fetch(uploadURL, { method: 'POST', body: fd });
        if (up.ok) urls.push(`https://imagedelivery.net/${accountHash}/${id}/public`);
      } catch (err) {
        console.error('uploadImages CF:', err.message);
      }
    }
    return urls;
  }

  /* ── Générer une card HTML ──────────────────────────────────────── */
  function renderCard(listing, { showFav = true } = {}) {
    const rawImg = (listing.images && listing.images[0]) || '';
    const img = rawImg
      ? getTransformUrl(rawImg, { width: 320, height: 240 })
      : 'assets/img/no-image.png';
    const hasVideo = !!listing.video_url;
    const title = listing.title || listing.title_fr || 'Annonce';
    const mode  = listing.rent_sale === 'sale' ? 'À vendre' : 'À louer';
    const rentSale = listing.rent_sale || listing.rentSale || 'rent';
    const isBoosted = listing.boost_expires_at && new Date(listing.boost_expires_at) > Date.now();
    /* Badge Loué / Vendu — overlay semi-transparent sur la vignette */
    const soldBadge = (listing.statut === 'loue' || listing.statut === 'vendu') ? `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;pointer-events:none">
        <span style="background:${listing.statut === 'vendu' ? '#111' : '#1565c0'};color:#fff;padding:.35rem 1rem;border-radius:999px;font-weight:800;font-size:.82rem">
          ${listing.statut === 'vendu' ? '🔑 Vendu' : '🏠 Loué'}
        </span>
      </div>` : '';

    const agentBadges = (listing.owner_kyc_verified || listing.owner_is_pro) ? `
      <div style="position:absolute;bottom:8px;left:8px;display:flex;gap:4px">
        ${listing.owner_kyc_verified ? '<span style="background:rgba(22,163,74,.9);color:#fff;border-radius:999px;padding:.15rem .5rem;font-size:.65rem;font-weight:800">✅ Vérifié</span>' : ''}
        ${listing.owner_is_pro       ? '<span style="background:rgba(146,64,14,.9);color:#fff;border-radius:999px;padding:.15rem .5rem;font-size:.65rem;font-weight:800">⭐ Pro</span>' : ''}
      </div>` : '';

    const segmentLabels = { long_stay: 'Longue durée', short_stay: 'Court séjour', flexible: 'Flexible' };
    const segmentBadge = listing.rental_segment && segmentLabels[listing.rental_segment]
      ? `<div class="listing-badge" style="background:#1565c0;color:#fff">${segmentLabels[listing.rental_segment]}</div>` : '';

    const badge = isBoosted
      ? '<div class="listing-badge premium" style="background:#ff7a00">⚡ VITRINE</div>'
      : listing.premium
        ? '<div class="listing-badge premium">PREMIUM</div>'
        : listing.furnished && !listing.rental_segment
          ? '<div class="listing-badge">Meublé</div>'
          : segmentBadge || '';

    const fav = showFav
      ? `<button class="fav-btn" data-id="${listing.id}" title="Ajouter aux favoris" onclick="event.preventDefault()">
           <i class="far fa-heart"></i>
         </button>` : '';

    return `
      <div class="listing-card${hasVideo ? ' has-video' : ''}">
        <a href="${getListingUrl(listing)}" style="text-decoration:none;color:inherit">
         <div class="listing-thumb" style="position:relative;height:200px;background:#eee;overflow:hidden">
            <img src="${img}" alt="${title}" loading="lazy" width="400" height="200" style="width:100%;height:100%;object-fit:cover">
            ${badge}
            ${soldBadge}
            ${agentBadges}
            ${hasVideo ? '<div class="card-video-badge"><span class="pulse-dot"></span><i class="fas fa-video"></i> Vidéo</div>' : ''}
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
            ${listing.furnished && listing.price_per_day && rentSale === 'rent' ? `
            <div style="font-size:.85rem;font-weight:700;color:#666;margin-top:.2rem">
              ${fmtPrice(listing.price_per_day)}<span style="font-size:.78rem;font-weight:400">/jour</span>
            </div>` : ''}
            <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap">
              <span style="background:#f0f0f0;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${mode}</span>
              ${listing.bedrooms ? `<span style="background:#f0f0f0;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">${listing.bedrooms} ch.</span>` : ''}
              ${listing.furnished ? `<span style="background:#fff4e8;color:#ff7a00;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700">Meublé</span>` : ''}
            </div>
          </div>
        </a>
      </div>`;
  }

  return {
    getListings, getPremiumListings, getListingById,
    getMyListings, createListing, updateListing, deleteListing,
    uploadImages, renderCard, fmtPrice, getTransformUrl, getListingUrl, cfVariant
  };
})();

window.SLCM_listings = SLCM_listings;
