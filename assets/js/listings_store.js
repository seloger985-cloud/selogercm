// ===============================
// SE LOGER CM — Listings Store
// Source unique de données
// ===============================

// Démo (sera remplacé plus tard par API)
const SAMPLE_LISTINGS = [
  {
    id: '1',
    title_en: '2BR Apartment — Akwa',
    title_fr: 'Appartement 2 ch — Akwa',
    price: 300000,
    city: 'Douala',
    district: 'Akwa',
    type: 'apartment',
    bedrooms: 2,
    furnished: true,
    premium: true,
    rentSale: 'rent',
    images: []
  }
];

// Charger depuis localStorage
export function loadUserListings() {
  try {
    return JSON.parse(localStorage.getItem('selogercm_listings')) || [];
  } catch {
    return [];
  }
}

// Toutes les annonces
export function getAllListings() {
  return [...SAMPLE_LISTINGS, ...loadUserListings()];
}

// Filtres génériques
export function filterListings(filters = {}) {
  return getAllListings().filter(l => {
    if (filters.mode && l.rentSale !== filters.mode) return false;
    if (filters.city && l.city !== filters.city) return false;
    if (filters.district && l.district !== filters.district) return false;
    if (filters.type && l.type !== filters.type) return false;
    if (filters.furnished !== undefined && l.furnished !== filters.furnished) return false;
    if (filters.minPrice && l.price < filters.minPrice) return false;
    if (filters.maxPrice && l.price > filters.maxPrice) return false;
    return true;
  });
}

// Sélections utiles
export function getFeatured({ furnished }) {
  return getAllListings()
    .filter(l => l.premium && l.furnished === furnished)
    .slice(0, 3);
}
