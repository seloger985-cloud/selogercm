/**
 * chatbot.js — SE LOGER CM
 * Assistant IA "Trouver mon logement"
 * Utilise l'API Claude pour comprendre les besoins et filtrer les annonces
 */
(function () {

  /* ─── Styles ─── */
  const style = document.createElement('style');
  style.textContent = `
    :root { --orange: #ff7a00; }

    /* Bouton déclencheur */
    .chat-trigger {
      position: fixed; bottom: 90px; right: 24px; z-index: 998;
      background: var(--orange); color: #fff; border: none;
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; cursor: pointer;
      box-shadow: 0 4px 16px rgba(255,122,0,.45);
      transition: transform .2s, box-shadow .2s;
      animation: pulse-chat 2.5s ease-in-out infinite;
    }
    .chat-trigger:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(255,122,0,.6);
      animation: none;
    }
    .chat-trigger .badge {
      position: absolute; top: -4px; right: -4px;
      background: #e24b4a; color: #fff;
      width: 18px; height: 18px; border-radius: 50%;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    @keyframes pulse-chat {
      0%, 100% { box-shadow: 0 4px 16px rgba(255,122,0,.45); }
      50%       { box-shadow: 0 4px 28px rgba(255,122,0,.75); }
    }

    /* Fenêtre chat */
    .chat-window {
      position: fixed; bottom: 160px; right: 24px; z-index: 997;
      width: 360px; max-height: 520px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,.18);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: scale(.9) translateY(20px);
      opacity: 0; pointer-events: none;
      transition: transform .25s ease, opacity .25s ease;
    }
    .chat-window.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    /* Header chat */
    .chat-header {
      background: var(--orange); color: #fff;
      padding: 1rem 1.1rem;
      display: flex; align-items: center; gap: .75rem;
    }
    .chat-header-icon {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .chat-header-text h4 { font-size: .95rem; font-weight: 800; margin: 0; }
    .chat-header-text p  { font-size: .75rem; opacity: .85; margin: 0; }
    .chat-close {
      margin-left: auto; background: none; border: none;
      color: #fff; font-size: 1.2rem; cursor: pointer; opacity: .8;
      transition: opacity .2s;
    }
    .chat-close:hover { opacity: 1; }

    /* Corps messages */
    .chat-body {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: .75rem;
      scroll-behavior: smooth;
    }

    /* Bulles */
    .msg {
      max-width: 82%; font-size: .875rem; line-height: 1.5;
      padding: .65rem .9rem; border-radius: 16px; word-break: break-word;
    }
    .msg.bot {
      background: #f4f4f4; color: #111;
      align-self: flex-start; border-bottom-left-radius: 4px;
    }
    .msg.user {
      background: var(--orange); color: #fff;
      align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .msg.typing {
      background: #f4f4f4; align-self: flex-start;
      display: flex; align-items: center; gap: 4px; padding: .75rem 1rem;
    }
    .msg.typing span {
      width: 7px; height: 7px; background: #aaa; border-radius: 50%;
      animation: bounce-dot .9s ease-in-out infinite;
    }
    .msg.typing span:nth-child(2) { animation-delay: .15s; }
    .msg.typing span:nth-child(3) { animation-delay: .30s; }
    @keyframes bounce-dot {
      0%, 80%, 100% { transform: translateY(0); }
      40%           { transform: translateY(-6px); }
    }

    /* Suggestions rapides */
    .quick-btns {
      display: flex; flex-wrap: wrap; gap: .4rem;
      padding: 0 1rem .5rem;
    }
    .quick-btn {
      background: #fff4e8; color: var(--orange);
      border: 1px solid #ffd4a8; border-radius: 999px;
      padding: .3rem .75rem; font-size: .78rem; font-weight: 700;
      cursor: pointer; transition: background .15s;
      font-family: inherit;
    }
    .quick-btn:hover { background: #ffe8cc; }

    /* Résultats annonces dans le chat */
    .chat-results {
      display: flex; flex-direction: column; gap: .5rem;
      margin-top: .25rem;
    }
    .chat-result-card {
      background: #fff; border: 1px solid #eee; border-radius: 12px;
      padding: .7rem .9rem; cursor: pointer;
      transition: border-color .2s, box-shadow .2s;
      text-decoration: none; color: inherit; display: block;
    }
    .chat-result-card:hover { border-color: var(--orange); box-shadow: 0 2px 10px rgba(255,122,0,.15); }
    .chat-result-card .cr-title { font-size: .83rem; font-weight: 700; color: #111; margin-bottom: .2rem; }
    .chat-result-card .cr-meta  { font-size: .75rem; color: #888; display: flex; gap: .5rem; flex-wrap: wrap; }
    .chat-result-card .cr-price { font-size: .85rem; font-weight: 800; color: var(--orange); }

    /* Input */
    .chat-input-row {
      display: flex; gap: .5rem; padding: .75rem 1rem;
      border-top: 1px solid #f0f0f0;
    }
    .chat-input {
      flex: 1; border: 1.5px solid #e5e5e5; border-radius: 999px;
      padding: .55rem 1rem; font-family: inherit; font-size: .88rem;
      transition: border-color .2s; outline: none; background: #fafafa;
    }
    .chat-input:focus { border-color: var(--orange); background: #fff; }
    .chat-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--orange); color: #fff; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; font-size: .95rem;
      transition: opacity .2s, transform .2s;
    }
    .chat-send:hover { opacity: .88; transform: scale(1.05); }
    .chat-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }

    /* Tooltip label */
    .chat-trigger-label {
      position: fixed; bottom: 100px; right: 88px; z-index: 998;
      background: #111; color: #fff; font-size: .75rem; font-weight: 600;
      padding: .3rem .75rem; border-radius: 8px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .2s;
    }
    .chat-trigger:hover + .chat-trigger-label { opacity: 1; }

    @media (max-width: 480px) {
      .chat-window { width: calc(100vw - 24px); right: 12px; bottom: 140px; }
      .chat-trigger { bottom: 80px; right: 12px; }
    }
  `;
  document.head.appendChild(style);

  /* ─── Config ─── */
  const GREET = `Bonjour ! 👋 Je suis votre assistant immobilier SE LOGER CM.

Dites-moi ce que vous cherchez — budget, quartier, type de bien — et je vous trouve les meilleures annonces en quelques secondes !`;

  const QUICK_SUGGESTIONS = [
    '🏠 Appartement à Douala',
    '💰 Budget 150 000 FCFA',
    '📍 Bonamoussadi',
    '🛏 Studio meublé',
    '🔑 Villa à vendre',
  ];

  const SYSTEM_PROMPT = `Tu es un assistant immobilier expert pour SE LOGER CM, une agence immobilière à Douala, Cameroun.

Ton rôle : comprendre les besoins de l'utilisateur (budget, quartier, type de bien, location/vente, meublé ou non) et retourner des critères de filtre structurés au format JSON.

Format de réponse OBLIGATOIRE — tu dois TOUJOURS répondre avec ce JSON et rien d'autre :
{
  "message": "message convivial en français pour l'utilisateur (max 2 phrases)",
  "filters": {
    "mode": "rent" ou "sale" ou null,
    "type": "apartment" | "house" | "studio" | "villa" | "duplex" | "warehouse" | "commercial" | "plots-of-land" | null,
    "city": "Douala" | "Yaoundé" | "Bafoussam" | null,
    "district": "nom du quartier" ou null,
    "bedrooms": "1" | "2" | "3" | "4" | null,
    "maxPrice": nombre ou null,
    "minPrice": nombre ou null,
    "furnished": true | false | null
  },
  "needsMoreInfo": true si tu as besoin de plus d'infos, false sinon
}

Quartiers de Douala : Bonapriso, Akwa, Bali, Bonanjo, Deïdo, Bonamoussadi, Makepe, Kotto, Logpom, Ndogbong, PK8, Ndogpassi, Ndokoti, Yassa, Bonadiwoto, Bonaberi, Bessengue.
Quartiers de Yaoundé : Bastos, Nlongkak, Etoudi, Elig-Edzoa, Centre Ville, Melen.
Types commerciaux : warehouse (entrepôt), commercial (local commercial/boutique/bureau), plots-of-land (terrain).
Ne réponds JAMAIS en dehors du format JSON.`;

  /* ─── State ─── */
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];
  let currentFilters = {};

  /* ─── Charger les annonces depuis Supabase ─── */
  async function getListings() {
    try {
      let tries = 0;
      while ((!window.SLCM_DB || !window.SLCM_DB.client) && tries < 30) {
        await new Promise(r => setTimeout(r, 100)); tries++;
      }
      if (!window.SLCM_DB?.client) return [];
      const { data } = await window.SLCM_DB.client
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    } catch(e) { return []; }
  }

  /* ─── Filtrer les annonces selon les critères ─── */
  async function filterListings(filters) {
    const listings = await getListings();
    return listings.filter(ad => {
      /* rent_sale — Supabase retourne snake_case */
      if (filters.mode && ad.rent_sale !== filters.mode) return false;
      if (filters.type && ad.type !== filters.type) return false;
      if (filters.city && ad.city?.toLowerCase() !== filters.city?.toLowerCase()) return false;
      if (filters.district && ad.district?.toLowerCase() !== filters.district?.toLowerCase()) return false;
      /* bedrooms est stocké en text en DB — comparer en string */
      if (filters.bedrooms && String(ad.bedrooms) !== String(filters.bedrooms)) return false;
      if (filters.maxPrice && ad.price > filters.maxPrice) return false;
      if (filters.minPrice && ad.price < filters.minPrice) return false;
      if (filters.furnished !== null && filters.furnished !== undefined && ad.furnished !== filters.furnished) return false;
      return true;
    }).slice(0, 3);
  }

  /* ─── Construire le DOM ─── */
  function buildChatbot() {
    // Bouton déclencheur
    const trigger = document.createElement('button');
    trigger.className = 'chat-trigger';
    trigger.id = 'chatTrigger';
    trigger.setAttribute('aria-label', 'Ouvrir l\'assistant immobilier');
    trigger.innerHTML = `<i class="fas fa-robot"></i><span class="badge">IA</span>`;

    const label = document.createElement('div');
    label.className = 'chat-trigger-label';
    label.textContent = 'Assistant IA';

    // Fenêtre
    const win = document.createElement('div');
    win.className = 'chat-window';
    win.id = 'chatWindow';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Assistant immobilier IA');

    win.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-icon"><i class="fas fa-robot"></i></div>
        <div class="chat-header-text">
          <h4>Assistant SE LOGER CM</h4>
          <p>Propulsé par l'IA • Disponible 24h/24</p>
        </div>
        <button class="chat-close" id="chatClose" aria-label="Fermer">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <div class="quick-btns" id="quickBtns"></div>
      <div class="chat-input-row">
        <input class="chat-input" id="chatInput" type="text"
          placeholder="Décrivez votre logement idéal..."
          autocomplete="off" maxlength="300">
        <button class="chat-send" id="chatSend" aria-label="Envoyer">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(label);
    document.body.appendChild(win);

    // Événements
    trigger.addEventListener('click', toggleChat);
    document.getElementById('chatClose').addEventListener('click', toggleChat);
    document.getElementById('chatSend').addEventListener('click', handleSend);
    document.getElementById('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Suggestions rapides
    const qb = document.getElementById('quickBtns');
    QUICK_SUGGESTIONS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.textContent = s;
      btn.addEventListener('click', () => {
        document.getElementById('chatInput').value = s;
        handleSend();
      });
      qb.appendChild(btn);
    });

    // Message de bienvenue
    addMessage('bot', GREET);
  }

  /* ─── Toggle ─── */
  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('chatWindow').classList.toggle('open', isOpen);
    if (isOpen) {
      setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
      // Cacher le badge
      const badge = document.querySelector('.chat-trigger .badge');
      if (badge) badge.style.display = 'none';
    }
  }

  /* ─── Ajouter un message ─── */
  function addMessage(role, content) {
    const body = document.getElementById('chatBody');
    if (!body) return;

    const msg = document.createElement('div');
    msg.className = `msg ${role}`;

    if (typeof content === 'string') {
      msg.innerHTML = content.replace(/\n/g, '<br>');
    } else {
      msg.appendChild(content);
    }

    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  /* ─── Indicateur de frappe ─── */
  function showTyping() {
    const body = document.getElementById('chatBody');
    const msg = document.createElement('div');
    msg.className = 'msg typing';
    msg.id = 'typingIndicator';
    msg.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() {
    document.getElementById('typingIndicator')?.remove();
  }

  /* ─── Afficher les résultats ─── */
  function addResults(results, filters) {
    const body = document.getElementById('chatBody');

    if (results.length === 0) {
      addMessage('bot', `😔 Aucune annonce ne correspond exactement à vos critères pour le moment. Essayez d'élargir votre recherche ou <a href="/rendez-vous" style="color:var(--orange);font-weight:700;">prenez rendez-vous</a> avec notre équipe !`);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'msg bot';
    wrapper.style.maxWidth = '100%';
    wrapper.style.padding = '0';
    wrapper.style.background = 'transparent';

    const intro = document.createElement('div');
    intro.className = 'msg bot';
    intro.textContent = `🎯 J'ai trouvé ${results.length} annonce${results.length > 1 ? 's' : ''} pour vous :`;
    body.appendChild(intro);

    const cards = document.createElement('div');
    cards.className = 'chat-results';

    results.forEach(ad => {
      const title = ad.title_fr || ad.title_en || 'Annonce';
      const price = ad.price ? ad.price.toLocaleString('fr-FR') + ' FCFA' : 'Prix sur demande';
      const a = document.createElement('a');
      a.className = 'chat-result-card';
      a.href = `/annonce?id=${ad.id}`;
      a.innerHTML = `
        <div class="cr-title">${title}</div>
        <div class="cr-meta">
          <span>📍 ${ad.district || ''} ${ad.city || ''}</span>
          <span>🛏 ${ad.bedrooms || '?'} ch.</span>
          ${ad.furnished ? '<span>✅ Meublé</span>' : ''}
        </div>
        <div class="cr-price">${price}${ad.rentSale === 'rent' ? '/mois' : ''}</div>
      `;
      cards.appendChild(a);
    });

    body.appendChild(cards);

    // Lien "Voir toutes les annonces"
    const queryStr = buildQueryString(filters);
    const seeAll = document.createElement('div');
    seeAll.className = 'msg bot';
    seeAll.innerHTML = `<a href="/annonces${queryStr}" style="color:var(--orange);font-weight:700;">→ Voir toutes les annonces correspondantes</a>`;
    body.appendChild(seeAll);

    body.scrollTop = body.scrollHeight;
  }

  /* ─── Construire query string pour listings_v2 ─── */
  function buildQueryString(filters) {
    const params = new URLSearchParams();
    if (filters.mode)     params.set('mode', filters.mode);
    if (filters.city)     params.set('city', filters.city);
    if (filters.district) params.set('district', filters.district);
    if (filters.type)     params.set('type', filters.type);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    const str = params.toString();
    return str ? '?' + str : '';
  }

  /* ─── Appel API Claude via Netlify Function ─── */
  async function callClaude(userMessage) {
    conversationHistory.push({ role: 'user', content: userMessage });

    const response = await fetch('https://hozlyddiqodvjguqywty.supabase.co/functions/v1/smooth-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvemx5ZGRpcW9kdmpndXF5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NzQ5NzgsImV4cCI6MjA1OTI1MDk3OH0.nRbbqF9SpwxztK0LI2BWWZwk39phGdCnO9MgIbmcG68' },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) throw new Error('API error ' + response.status);

    const data = await response.json();
    const raw = data.content?.[0]?.text || '{}';

    // Parser le JSON
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Ajouter la réponse à l'historique
    conversationHistory.push({ role: 'assistant', content: raw });

    return parsed;
  }

  /* ─── Gérer l'envoi ─── */
  async function handleSend() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Cacher les suggestions rapides
    document.getElementById('quickBtns').style.display = 'none';

    // Afficher message utilisateur
    addMessage('user', text);
    input.value = '';

    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const result = await callClaude(text);
      hideTyping();

      // Fusionner les filtres
      if (result.filters) {
        currentFilters = { ...currentFilters };
        Object.entries(result.filters).forEach(([k, v]) => {
          if (v !== null && v !== undefined) currentFilters[k] = v;
        });
      }

      // Afficher le message de l'IA
      if (result.message) {
        addMessage('bot', result.message);
      }

      // Si suffisamment d'infos, chercher les annonces
      if (!result.needsMoreInfo && Object.keys(currentFilters).length > 0) {
        const matches = await filterListings(currentFilters);
        addResults(matches, currentFilters);
      }

    } catch (err) {
      hideTyping();
      console.error('Chatbot error:', err);
      addMessage('bot', `⚠️ Une erreur s'est produite. Veuillez réessayer ou <a href="/rendez-vous" style="color:var(--orange);font-weight:700;">contactez-nous directement</a>.`);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* ─── Init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildChatbot);
  } else {
    buildChatbot();
  }

})();
