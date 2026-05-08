/**
 * SE LOGER CM — Blog Supabase
 * Gestion des articles : lecture, création, suppression.
 */

const SLCM_blog = (() => {

  async function sb() {
    let tries = 0;
    while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 50) {
      await new Promise(r => setTimeout(r, 100)); tries++;
    }
    return window.SLCM_DB ? window.SLCM_DB.client : null;
  }

  const CATEGORIES = {
    marche:        { label: 'Marché Immobilier', icon: '📈', color: '#1565c0' },
    locataires:    { label: 'Conseils Locataires', icon: '🏠', color: '#2e7d32' },
    proprietaires: { label: 'Conseils Propriétaires', icon: '🔑', color: '#e65100' },
    tendances:     { label: 'Tendances Douala', icon: '📍', color: '#6a1b9a' }
  };

  function getCategoryInfo(cat) {
    return CATEGORIES[cat] || { label: cat, icon: '📄', color: '#555' };
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function readingTime(content) {
    const words = (content || '').replace(/<[^>]+>/g, '').split(/\s+/).length;
    const mins  = Math.max(1, Math.round(words / 200));
    return `${mins} min`;
  }

  /* ── Lire tous les articles ─────────────────────────────────────── */
  async function getAllArticles(category = null) {
    const client = await sb();
    let query = client
      .from('blog_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) { console.error('getAllArticles:', error); return []; }
    return data || [];
  }

  /* ── Lire un article par ID ─────────────────────────────────────── */
  async function getArticleById(id) {
    const client = await sb();
    const { data, error } = await client
      .from('blog_articles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error('getArticleById:', error); return null; }
    return data;
  }

  /* ── Sauvegarder un article (create ou update) ──────────────────── */
  async function saveArticle(article) {
    const client = await sb();
    const now = new Date().toISOString();
    const payload = {
      title:    article.title,
      category: article.category,
      excerpt:  article.excerpt,
      content:  article.content,
      author:   article.author || 'SE LOGER CM',
      cover:    article.cover  || null,
      date:     article.date   || now.split('T')[0],
      updated_at: now
    };

    /* UUID Supabase réel = 8-4-4-4-12 hex. Tout autre format → INSERT. */
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id || '');

    let result;
    if (isUUID) {
      result = await client.from('blog_articles').update(payload).eq('id', article.id).select().single();
    } else {
      result = await client.from('blog_articles')
        .insert([{ ...payload, created_at: now }])
        .select().single();
    }
    if (result.error) { console.error('saveArticle:', result.error); return null; }
    return result.data;
  }

  /* ── Supprimer un article ────────────────────────────────────────── */
  async function deleteArticle(id) {
    const client = await sb();
    const { error } = await client.from('blog_articles').delete().eq('id', id);
    if (error) { console.error('deleteArticle:', error); return false; }
    return true;
  }

  /* Alias pour compatibilité avec admin_dashboard.html */
  const loadAdminArticles  = getAllArticles;
  const saveAdminArticle   = saveArticle;
  const deleteAdminArticle = deleteArticle;

  return {
    getCategoryInfo, formatDate, readingTime,
    getAllArticles, getArticleById, saveArticle, deleteArticle,
    loadAdminArticles, saveAdminArticle, deleteAdminArticle
  };
})();

window.SLCM_blog = SLCM_blog;
