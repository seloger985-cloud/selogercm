/**
 * SE LOGER CM — Configuration Supabase
 * Clé anon chargée via /.netlify/functions/public-config (variable Netlify SB_ANON_KEY).
 * Le CDN UMD @supabase/supabase-js doit être chargé AVANT ce fichier.
 */
(function () {
  const DEFAULT_URL = 'https://hozlyddiqodvjguqywty.supabase.co';
  const CONFIG_URL  = '/.netlify/functions/public-config';

  if (window.SLCM_DB && window.SLCM_DB.client) return;

  let configPromise = null;

  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch(CONFIG_URL)
        .then(res => {
          if (!res.ok) throw new Error('public-config ' + res.status);
          return res.json();
        });
    }
    return configPromise;
  }

  async function initClient() {
    if (typeof window.supabase === 'undefined') {
      setTimeout(initClient, 100);
      return;
    }

    try {
      const cfg = await loadConfig();
      const url = cfg.url || DEFAULT_URL;
      const key = cfg.anonKey;
      if (!key) throw new Error('anonKey manquante');

      const client = window.supabase.createClient(url, key, {
        auth: {
          persistSession:     true,
          autoRefreshToken:   true,
          detectSessionInUrl: true,
          storage:            window.localStorage,
        },
      });

      window.SLCM_DB = {
        client:   client,
        url:      url,
        anonKey:  key,
        init:     function () { return Promise.resolve(client); },
      };
    } catch (err) {
      console.error('[SLCM] Supabase init failed:', err.message);
      window.SLCM_DB = {
        client:  null,
        anonKey: null,
        init:    function () { return Promise.reject(err); },
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClient);
  } else {
    initClient();
  }
})();
