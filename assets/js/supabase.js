/**
 * SE LOGER CM — Configuration Supabase
 * Clé anon chargée via /.netlify/functions/public-config (variable Netlify SB_ANON_KEY).
 * Le CDN UMD @supabase/supabase-js doit être chargé AVANT ce fichier.
 *
 * Architecture : window.SLCM_DB est exposé IMMÉDIATEMENT avec un init()
 * qui retourne une Promise se résolvant quand le client est prêt.
 * Permet aux consommateurs (listings.js, favorites.js, etc.) d'await init()
 * sans race condition.
 */
(function () {
  const DEFAULT_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
  const CONFIG_URL  = '/.netlify/functions/public-config';

  if (window.SLCM_DB && window.SLCM_DB.client) return;

  let _client     = null;
  let _resolveReady;
  let _rejectReady;
  const _readyPromise = new Promise(function (resolve, reject) {
    _resolveReady = resolve;
    _rejectReady  = reject;
  });

  /* Exposer SLCM_DB IMMÉDIATEMENT — les consommateurs peuvent await init() */
  window.SLCM_DB = {
    client:  null,
    url:     null,
    anonKey: null,
    init:    function () { return _readyPromise; },
  };

  let configPromise = null;
  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch(CONFIG_URL)
        .then(function (res) {
          if (!res.ok) throw new Error('public-config ' + res.status);
          return res.json();
        });
    }
    return configPromise;
  }

  async function initClient(attempt) {
    attempt = attempt || 0;

    /* Attente du CDN UMD Supabase — max 50 tentatives (5 secondes) */
    if (typeof window.supabase === 'undefined') {
      if (attempt > 50) {
        const err = new Error('Supabase UMD CDN non chargé après 5s');
        console.error('[SLCM]', err.message);
        _rejectReady(err);
        return;
      }
      setTimeout(function () { initClient(attempt + 1); }, 100);
      return;
    }

    try {
      const cfg = await loadConfig();
      const url = cfg.url || DEFAULT_URL;
      const key = cfg.anonKey;
      if (!key) throw new Error('anonKey manquante');

      _client = window.supabase.createClient(url, key, {
        auth: {
          persistSession:     true,
          autoRefreshToken:   true,
          detectSessionInUrl: true,
          storage:            window.localStorage,
        },
      });

      /* Mettre à jour SLCM_DB avec le client prêt */
      window.SLCM_DB.client  = _client;
      window.SLCM_DB.url     = url;
      window.SLCM_DB.anonKey = key;

      _resolveReady(_client);
    } catch (err) {
      console.error('[SLCM] Supabase init failed:', err.message);
      _rejectReady(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initClient(0); });
  } else {
    initClient(0);
  }
})();
