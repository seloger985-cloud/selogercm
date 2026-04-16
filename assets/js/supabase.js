/**
 * SE LOGER CM — Configuration Supabase
 * Script classique (sans type="module").
 * Le CDN UMD doit être chargé AVANT ce fichier.
 */
(function () {
  const SUPABASE_URL  = 'https://hozlyddiqodvjguqywty.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzA1NzcsImV4cCI6MjA4OTc0NjU3N30.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68';

  if (window.SLCM_DB && window.SLCM_DB.client) return;

  function initClient() {
    if (typeof window.supabase === 'undefined') {
      setTimeout(initClient, 100);
      return;
    }

    /* Forcer la persistance de session */
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
        storage:           window.localStorage
      }
    });

    window.SLCM_DB = {
      client: client,
      init: function() { return Promise.resolve(client); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClient);
  } else {
    initClient();
  }
})();
