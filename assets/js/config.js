/**
 * SE LOGER CM — Configuration globale partagée
 * Source unique de vérité pour les villes, quartiers et types de biens.
 * À inclure avant tout autre script JS qui utilise ces données.
 */

const SLCM_CONFIG = {

  cities: {
    'Douala': [
      'Akwa', 'Bali', 'Béedi', 'Bepanda', 'Bessengue', 'Bonabéri', 'Bonadiwoto (Grand Mall)', 'Bonamoussadi',
      'Bonanjo', 'Bonapriso', 'Cité des Palmiers', 'Deïdo', 'Kotto',
      'Logbessou', 'Logpom', 'Makepe', 'Ndogbong', 'Ndogpassi', 'Ndokoti',
      'PK8', 'PK9', 'PK10', 'PK11', 'PK12', 'PK13', 'PK14', 'Yassa'
    ],
    'Yaoundé': [
      'Bastos', 'Centre Ville', 'Elig-Edzoa', 'Etoudi', 'Melen',
      'Mfandena', 'Nlongkak', 'Omnisports'
    ],
    'Bafoussam': [
      'Banengo', 'Djeleng', 'Évêché', 'Famla', 'Kamkop', 'Tamdja'
    ],
    'Autre': ['Autre quartier']
  },

  propertyTypes: [
    { value: 'apartment',     labelFR: 'Appartement',      labelEN: 'Apartment' },
    { value: 'house',         labelFR: 'Maison',           labelEN: 'House' },
    { value: 'studio',        labelFR: 'Studio',           labelEN: 'Studio' },
    { value: 'villa',         labelFR: 'Villa',            labelEN: 'Villa' },
    { value: 'duplex',        labelFR: 'Duplex',           labelEN: 'Duplex' },
    { value: 'warehouse',     labelFR: 'Entrepôt',         labelEN: 'Warehouse' },
    { value: 'commercial',    labelFR: 'Local commercial', labelEN: 'Commercial space' },
    { value: 'plots-of-land', labelFR: 'Terrain',          labelEN: 'Plot of land' },
    { value: 'immeuble',      labelFR: 'Immeuble',         labelEN: 'Building' },
    { value: 'residence',     labelFR: 'Résidence',        labelEN: 'Residence' }
  ],

  priceRanges: {
    rent: [
      { value: '0-100k',    labelFR: '≤ 100 000 F',         labelEN: '≤ 100,000 F' },
      { value: '100k-300k', labelFR: '100 000 – 300 000 F', labelEN: '100K – 300K F' },
      { value: '300k-600k', labelFR: '300 000 – 600 000 F', labelEN: '300K – 600K F' },
      { value: '600k+',     labelFR: '≥ 600 000 F',         labelEN: '≥ 600K F' }
    ],
    sale: [
      { value: '0-15m',    labelFR: '< 15 M F',    labelEN: '< 15M F' },
      { value: '15m-50m',  labelFR: '15 – 50 M F', labelEN: '15M – 50M F' },
      { value: '50m-100m', labelFR: '50 – 100 M F', labelEN: '50M – 100M F' },
      { value: '100m+',    labelFR: '≥ 100 M F',   labelEN: '≥ 100M F' }
    ]
  },

  contact: {
    whatsapp: '+237650840714',
    telegram: '@seloger237',
    tiktok:   '@se.loger6',
    phone:    '(+237) 650 840 714',
    address:  'Boulevard de la République, Bonamoussadi, Douala'
  },

  // Coordonnées GPS par quartier pour la carte Leaflet
  coords: {
    'Bonapriso':    [4.0157, 9.6834],
    'Akwa':         [4.0511, 9.7085],
    'Bali':         [4.0480, 9.6980],
    'Bonanjo':      [4.0340, 9.6960],
    'Deïdo':        [4.0620, 9.7100],
    'Bonamoussadi': [4.0720, 9.7430],
    'Makepe':       [4.0850, 9.7520],
    'Kotto':        [4.0640, 9.7680],
    'Logpom':       [4.0390, 9.7390],
    'Ndogbong':     [4.0200, 9.7560],
    'PK8':          [4.0100, 9.7850],
    'Ndogpassi':    [4.0300, 9.7700],
    'Ndokoti':      [4.0450, 9.7250],
    'Logbessou':    [4.0870, 9.7780],
    'Bessengue':    [4.0620, 9.6970],
    'Béedi':        [4.0280, 9.7050],
    'PK9':          [4.0070, 9.7920],
    'PK10':         [4.0020, 9.7990],
    'PK11':         [3.9970, 9.8060],
    'PK12':         [3.9920, 9.8130],
    'PK13':         [3.9870, 9.8200],
    'PK14':         [3.9820, 9.8270],
    'Bastos':       [3.8800, 11.5160],
    'Nlongkak':     [3.8720, 11.5080],
    'Etoudi':       [3.9010, 11.5240],
    'Elig-Edzoa':   [3.8660, 11.5050],
    'Centre Ville': [3.8667, 11.5167],
    'Melen':        [3.8580, 11.5310],
    'Banengo':      [5.4770, 10.4200],
    'Djeleng':      [5.4690, 10.4140],
    'Famla':        [5.4800, 10.4300],
    'Kamkop':       [5.4850, 10.4080],
    'Évêché':       [5.4760, 10.4220],
    'Tamdja':       [5.4700, 10.4160],
    'Douala':       [4.0511, 9.7085],
    'Yaoundé':      [3.8667, 11.5167],
    'Bafoussam':    [5.4765, 10.4191]
  },

  /**
   * Retourne les coordonnées GPS pour un quartier/ville donnés.
   * Ajoute un léger décalage aléatoire pour masquer l'adresse exacte.
   */
  getCoords(district, city) {
    const base = this.coords[district] || this.coords[city] || [4.0511, 9.7085];
    return [
      base[0] + (Math.random() - 0.5) * 0.004,
      base[1] + (Math.random() - 0.5) * 0.004
    ];
  },

  /**
   * Remplit un <select> avec les quartiers d'une ville.
   */
  fillDistricts(selectEl, city, placeholder = 'Choisir un quartier') {
    if (!selectEl) return;
    const list = this.cities[city] || this.cities['Douala'];
    selectEl.innerHTML = `<option value="">${placeholder}</option>` +
      list.map(q => `<option value="${q}">${q}</option>`).join('');
  }
};
