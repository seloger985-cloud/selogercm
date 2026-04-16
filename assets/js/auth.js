/**
 * SE LOGER CM — Auth Supabase
 * Gestion complète avec attente de la session initiale.
 */

const SLCM = (() => {

  /* Admin identifié uniquement via role=admin dans Supabase metadata */
  const ADMIN_EMAIL = null; // Désactivé — utiliser role=admin dans Supabase

  /* ── Attendre que le client soit prêt ───────────────────────────── */
  async function waitForClient(maxMs = 5000) {
    const step = 100;
    let elapsed = 0;
    while (elapsed < maxMs) {
      if (window.SLCM_DB && window.SLCM_DB.client) return window.SLCM_DB.client;
      await new Promise(r => setTimeout(r, step));
      elapsed += step;
    }
    console.error('[SLCM Auth] Client non disponible après', maxMs, 'ms');
    return null;
  }

  /* ── Attendre la session initiale (INITIAL_SESSION ou SIGNED_IN) ── */
  async function waitForSession(maxMs = 6000) {
    const client = await waitForClient();
    if (!client) return null;

    /* D'abord essayer getSession direct */
    const { data } = await client.auth.getSession();
    if (data?.session) return data.session;

    /* Sinon attendre l'événement Supabase */
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), maxMs);
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          clearTimeout(timer);
          subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  async function getSession() {
    return waitForSession();
  }

  async function getCurrentUser() {
    const session = await getSession();
    return session?.user ?? null;
  }

  function isAdmin(user) {
    if (!user) return false;
    /* Vérification via role=admin dans Supabase metadata uniquement */
    return user.user_metadata?.role === 'admin';
  }

  function isAgent(user) {
    if (!user) return false;
    /* Vérification uniquement via role=agent dans Supabase metadata */
    return user.user_metadata?.role === 'agent';
  }

  /* ── Connexion ──────────────────────────────────────────────────── */
  async function loginUser(email, password) {
    const client = await waitForClient();
    if (!client) return null;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) { console.error('[SLCM Auth] login:', error.message); return null; }
    return data.user;
  }

  async function loginAdmin(email, password) {
  const client = await waitForClient();
  if (!client) return false;
  
  // Connexion sans signOut automatique
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return false;
  
  // Vérifier le rôle SANS déclencher signOut
  if (!isAdmin(data.user)) {
    // SignOut silencieux sans déclencher l'écouteur
    await client.auth.signOut({ scope: 'local' });
    return false;
  }
  return true;
}

  /* Vérifie si l'utilisateur connecté est agent interne */
  async function loginAgent(email, password) {
    const user = await loginUser(email, password);
    if (!user) return false;
    if (!isAgent(user) && !isAdmin(user)) {
      const client = await waitForClient();
      await client?.auth.signOut();
      return false;
    }
    return true;
  }

  async function registerUser(email, password, name) {
    const client = await waitForClient();
    if (!client) return null;
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { name, role: 'user' } }
    });
    if (error) { console.error('[SLCM Auth] register:', error.message); return null; }
    return data.user;
  }

  async function signOut() {
    const client = await waitForClient();
    if (client) await client.auth.signOut();
    window.location.href = '/connexion';
  }

  /* ── Guards ─────────────────────────────────────────────────────── */
  async function requireLogin() {
    let user = await getCurrentUser();
    if (!user) {
      const client = await waitForClient();
      if (client) {
        user = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 4000);
          const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              clearTimeout(timer);
              subscription.unsubscribe();
              resolve(session?.user ?? null);
            }
          });
        });
      }
    }
    if (!user) {
      console.warn('[SLCM Auth] Non connecté → signin');
      window.location.href = '/connexion';
      return null;
    }
    return user;
  }

  async function requireAdmin() {
    let user = await getCurrentUser();
    if (!user) {
      const client = await waitForClient();
      if (client) {
        user = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 4000);
          const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              clearTimeout(timer);
              subscription.unsubscribe();
              resolve(session?.user ?? null);
            }
          });
        });
      }
    }
    if (!user || !isAdmin(user)) {
      console.warn('[SLCM Auth] Accès refusé → signin');
      window.location.href = '/connexion';
      return null;
    }
    return user;
  }

  /* ── Init au chargement ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('signOutBtn');
    if (btn) btn.addEventListener('click', signOut);

    const label = document.getElementById('userLabel');
    if (label) {
      const user = await getCurrentUser();
      if (user) label.textContent = 'Agent : ' + (user.user_metadata?.name || user.email);
    }
  });

  /* ── Écoute des changements ─────────────────────────────────────── */
  (async () => {
    const client = await waitForClient();
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        const page = window.location.pathname.split('/').pop();
        const publicPages = [
          '/connexion', '/', '', '/annonces',
          '/annonce', '/blog', '/article',
          '/services', '/a-propos', '/rendez-vous', '404.html',
          '/agent-profile', '/pricing', '/reset-password'
        ];
        if (!publicPages.includes(page)) window.location.href = '/connexion';
      }
    });
  })();

  return {
    getSession, getCurrentUser, isAdmin, isAgent,
    loginUser, loginAdmin, loginAgent, registerUser, signOut,
    requireLogin, requireAdmin, waitForClient
  };
})();

window.SLCM = SLCM;
