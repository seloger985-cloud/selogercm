# 🛠️ Guide de Maintenance — SE LOGER CM

Guide pour les tâches récurrentes que tu peux effectuer **sans solliciter Claude**.

---

## 📋 Table des matières

1. [Ajouter un nouveau quartier](#1-ajouter-un-nouveau-quartier)
2. [Créer / modifier un bandeau](#2-créer--modifier-un-bandeau-sur-laccueil)
3. [Publier un article de blog](#3-publier-un-article-de-blog)
4. [Ajouter un témoignage](#4-ajouter-un-témoignage)
5. [Modifier le bandeau d'urgence](#5-modifier-le-bandeau-durgence-home)
6. [Changer une image hero](#6-changer-une-image-hero)
7. [Désactiver une annonce frauduleuse](#7-désactiver-une-annonce-frauduleuse)
8. [Marquer une annonce comme premium](#8-marquer-une-annonce-comme-premium)
9. [Reels Visites Express (vidéos homepage)](#9-reels-visites-express-vidéos-homepage)
10. [Partage social (Facebook, WhatsApp, LinkedIn)](#10-partage-social-facebook-whatsapp-linkedin)
11. [Slogan figé en anglais & Kicker bilingue](#11-slogan-figé-en-anglais--kicker-bilingue)
12. [Workflow de déploiement](#12-workflow-de-déploiement)
13. [En cas de panne](#13-en-cas-de-panne)

---

## 1. Ajouter un nouveau quartier

**Fichiers à modifier : 3**

### Fichier 1 — `assets/js/config.js`

**A. Liste des quartiers** (section `cities`) — ajoute en respectant l'ordre alphabétique :

```js
cities: {
  'Douala': [
    'Akwa', 'Bali', 'Béedi', ..., 'NouveauQuartier', ...
  ],
}
```

**B. Coordonnées GPS** (section `coords`) :

```js
coords: {
  ...
  'NouveauQuartier': [4.XXXX, 9.XXXX],
  ...
}
```

Pour obtenir les coordonnées :
1. Va sur [Google Maps](https://maps.google.com)
2. Clic droit sur le quartier → copie le premier chiffre affiché
3. Format : `[latitude, longitude]`

### Fichier 2 — `assets/js/chatbot.js`

Ligne qui commence par `Quartiers de Douala : ...` — ajoute le nom :

```
Quartiers de Douala : Akwa, Bali, Béedi, ..., NouveauQuartier.
```

### Fichier 3 — `publish.html`

Recherche la ligne (~386) qui commence par `'Douala':` et ajoute le nouveau quartier en respectant l'ordre alphabétique.

```js
'Douala': ['Akwa','Bali','Béedi',...,'NouveauQuartier'],
```

⚠️ **Attention** : ce fichier a sa liste en dur, il faut la synchroniser manuellement.

### ✅ Vérification après déploiement

1. Accueil → Barre de recherche → ville Douala → vérifier que le quartier apparaît
2. `/publier` → remplir ville Douala → vérifier que le quartier apparaît
3. Chatbot → taper "quartiers Douala" → vérifier que le nouveau est listé

---

## 2. Créer / modifier un bandeau sur l'accueil

Les bandeaux promotionnels se gèrent dans `assets/js/homepage-boost.js`.

### Ajouter un nouveau bandeau « Nouveauté de la semaine »

Ouvre `assets/js/homepage-boost.js` et ajoute une fonction dans la section INIT :

```js
function buildNewsBanner() {
  const hero = document.querySelector('.hero');
  if (!hero || document.getElementById('newsBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'newsBanner';
  banner.innerHTML = `
    <style>
      #newsBanner {
        background: linear-gradient(90deg, #1e40af, #3b82f6);
        color: #fff;
        padding: .9rem 1rem;
        text-align: center;
        font-weight: 700;
        font-size: .9rem;
      }
      #newsBanner a {
        color: #fff;
        text-decoration: underline;
        margin-left: .5rem;
      }
    </style>
    <div>
      ✨ <strong>Nouveau cette semaine :</strong> 12 annonces premium à Bonapriso
      <a href="/annonces?district=Bonapriso&premium=1">Voir →</a>
    </div>
  `;

  /* Insérer APRÈS le bandeau urgence (pas dans le hero) */
  const urgencyBanner = document.getElementById('urgencyBanner');
  if (urgencyBanner && urgencyBanner.parentNode) {
    urgencyBanner.parentNode.parentNode.insertBefore(banner, urgencyBanner.parentNode.nextSibling);
  } else {
    hero.parentNode.insertBefore(banner, hero.nextSibling);
  }
}
```

Puis dans la fonction `init()` (tout en bas du fichier), ajoute :

```js
function init() {
  buildUrgencyBanner();
  buildNewsBanner();   // ← nouveau
  buildPublishCTA();
  setupScrollAnimations();
}
```

### 🎨 Couleurs de bandeau prêtes à copier

| Type | Gradient CSS |
|---|---|
| 🔥 Urgence / Promo | `linear-gradient(90deg, #ff7a00, #ff9633)` (déjà utilisé) |
| ✨ Nouveauté / Info | `linear-gradient(90deg, #1e40af, #3b82f6)` (bleu) |
| 🎉 Célébration | `linear-gradient(90deg, #8b5cf6, #a78bfa)` (violet) |
| ✅ Succès / Validation | `linear-gradient(90deg, #16a34a, #22c55e)` (vert) |
| ⚠️ Important | `linear-gradient(90deg, #dc2626, #ef4444)` (rouge) |
| 🌍 Terrain / Nature | `linear-gradient(90deg, #15803d, #65a30d)` (vert terre) |

### Retirer un bandeau

Dans `homepage-boost.js`, commente (`//`) l'appel dans `init()` :

```js
function init() {
  buildUrgencyBanner();
  // buildNewsBanner();   // ← désactivé
  buildPublishCTA();
}
```

---

## 3. Publier un article de blog

Via le dashboard admin **sans toucher au code** :

1. Va sur `/admin` → connecte-toi (email + code MFA à 6 chiffres)
2. Section **Blog** → bouton **"Nouvel article"**
3. Remplis : titre, image de couverture, contenu (Markdown supporté)
4. **Publier** → l'article apparaît sur `/blog` immédiatement

### Bonnes pratiques éditoriales

- **Titre** : 50-70 caractères (SEO)
- **Image** : 1200x630px (optimale pour partage Facebook)
- **Premier paragraphe** : résume l'article (utilisé pour la meta description)
- **Longueur idéale** : 800-1500 mots
- **Mots-clés à viser** : "immobilier Douala", "location Cameroun", "acheter maison Douala"

---

## 4. Ajouter un témoignage

Via le dashboard admin :

1. `/admin` → section **Témoignages**
2. Bouton **"Nouveau témoignage"**
3. Remplis : nom, note (étoiles), texte, photo (optionnelle)
4. **Publier** → apparaît sur l'accueil

---

## 5. Modifier le bandeau d'urgence (home)

Le bandeau orange sous le hero avec les stats (86+ annonces vérifiées, etc.)

**Fichier : `assets/js/homepage-boost.js`**

### Changer les textes

Cherche la section `buildUrgencyBanner` → modifie les `<span class="ub-item">` :

```html
<span class="ub-item">🔥 <span class="ub-num" id="ubNew">…</span> nouvelles cette semaine</span>
<span class="ub-item">✅ <span class="ub-num" id="ubTotal">…</span> annonces vérifiées</span>
<span class="ub-item">🌍 Diaspora active</span>
<span class="ub-item">⚡ Publication en 3 minutes</span>
```

Tu peux ajouter / retirer des items à ta guise.

### Changer la couleur

Cherche `background: linear-gradient` et remplace avec une des couleurs du tableau ci-dessus.

---

## 6. Changer une image hero

**Accueil** : `assets/img/hero.jpg` → remplace le fichier dans GitHub (même nom)

**Blog, agent, etc.** : cherche dans le fichier HTML de la page le nom exact du fichier image dans `/assets/img/`.

⚠️ **Format recommandé** :
- **Desktop** : 1920x1080 px, JPG qualité 85, < 300 Ko
- **Utilise [tinypng.com](https://tinypng.com) pour compresser avant upload**

---

## 7. Désactiver une annonce frauduleuse

Via le dashboard admin :

1. `/admin` → section **Annonces**
2. Trouve l'annonce concernée
3. Clique sur **"Statut"** → change de `active` à `blocked` ou `pending`
4. L'annonce disparaît immédiatement du site public

**Alternatif direct dans Supabase** (cas d'urgence) :

```sql
UPDATE listings
SET status = 'blocked'
WHERE id = 'uuid-de-lannonce';
```

---

## 8. Marquer une annonce comme premium

Via le dashboard admin :

1. `/admin` → **Annonces** → trouve l'annonce
2. Toggle **"Premium"** → active
3. Elle apparaît automatiquement dans les sections premium de l'accueil

**Alternatif direct SQL :**

```sql
UPDATE listings
SET premium = true
WHERE id = 'uuid-de-lannonce';
```

⚠️ La rotation premium change **toutes les 30 minutes** — ne t'inquiète pas si l'annonce n'apparaît pas immédiatement à la première position.

---

## 9. Reels Visites Express (vidéos homepage)

Section vidéo verticale sur la homepage. Comportement :
- **Desktop** : carousel horizontal (6 reels max), vidéo centrale + 2 latérales en aperçu, flèches ‹ ›
- **Mobile** : bande compacte de vignettes (8 reels max avec quota éditorial) → le tap ouvre un viewer plein écran TikTok

### A. Ajouter une vidéo à une annonce

**Étape 1 — Préparer la vidéo**

| Critère | Valeur cible |
|---|---|
| Format | **MP4 codec H.264** (PAS H.265, sinon ne joue pas dans le navigateur) |
| Orientation | **Vertical 9:16** (720×1280 ou 1080×1920) |
| Durée | **20-25 secondes max** (au-delà l'attention décroche) |
| Poids | **5-10 Mo idéal**, 15 Mo max |
| Audio | AAC 128 kbps stéréo |
| Nom du fichier | minuscules, tirets, sans accent ni espace : `douala-quartier-type-001.mp4` |

**Outil de compression** : [HandBrake](https://handbrake.fr/) (gratuit). Preset "Social 9:16 Vertical 720p30" + RF 24 + codec H.264.

**Étape 2 — Upload sur Supabase Storage**

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Storage** → bucket **`listing-videos`**
2. **Drag & drop** la vidéo directement dans la liste de fichiers (PAS dans un dossier)
3. ⚠️ Si tu cliques sur "Create folder" puis drag&drop, l'upload échoue avec "file name is invalid"
4. Une fois uploadée, clique sur le fichier → **Copy URL** → garde l'URL en presse-papier

**Étape 3 — Lier la vidéo à une annonce**

1. `/admin` → trouver l'annonce concernée
2. Cliquer le bouton **🎬 Ajouter vidéo** (ou **🎬 Vidéo ✓** si une vidéo est déjà présente)
3. Coller l'URL Supabase → OK
4. Recharger la homepage → la vidéo apparaît dans "Visites Express"

**Alternative SQL directe** (si le bouton admin ne répond pas) :

```sql
UPDATE listings
SET video_url = 'https://hozlyddiqodvjguqywty.supabase.co/storage/v1/object/public/listing-videos/ma-video.mp4'
WHERE id = 'uuid-de-lannonce';
```

### B. Retirer une vidéo

`/admin` → bouton **🎬 Vidéo ✓** → vider le champ → OK. La vidéo disparaît de la section Reels mais reste dans le bucket Storage (à supprimer manuellement si besoin).

### C. Quota éditorial mobile

Sur mobile, sélection automatique de 8 reels selon ce quota :
- 5 locations non meublées (apparts, studios, maisons, villas, duplex)
- 2 locations meublées **OU** locaux commerciaux/entrepôts
- 1 vente

Si une catégorie n'a pas assez de reels, le quota est complété par les autres catégories pour atteindre 8.

Sur desktop, pas de quota : les 6 reels les plus prioritaires (premium d'abord, puis date de création).

### D. Limites système

| Paramètre | Valeur | Où la modifier |
|---|---|---|
| Limite desktop | 6 reels | `assets/js/reels.js` ligne ~22 (`DESKTOP_LIMIT`) |
| Limite mobile | 8 reels | `assets/js/reels.js` ligne ~23 (`MOBILE_LIMIT`) |
| Quota mobile | 5+2+1 | `assets/js/reels.js` ligne ~26 (`MOBILE_QUOTA`) |
| Pool de récupération | 20 reels | `assets/js/reels.js` ligne ~115 (`.limit(20)`) |

### E. Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| "file name is invalid" à l'upload | Espaces, accents, caractères spéciaux | Renommer en `minuscules-avec-tirets.mp4` |
| Upload "Failed to fetch" | Connexion réseau instable | Retry, ou tester en navigation privée, ou changer de réseau |
| Vidéo affichée mais ne joue pas | Codec H.265 incompatible | Réencoder en H.264 avec HandBrake |
| `MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check` | CSP `media-src` manquant | Vérifier que `_headers` contient `media-src 'self' https://*.supabase.co` |
| Section Reels invisible sur la homepage | `is-empty` activé : aucune vidéo en base | Vérifier qu'au moins 1 annonce a `video_url IS NOT NULL` et `status = 'active'` |
| `[reels] Supabase indisponible` dans la console | Race condition au démarrage | Le code attend déjà jusqu'à 5s ; si ça persiste, vérifier `SLCM_DB.client` |

### F. Architecture (à NE PAS toucher sans réfléchir)

- **Fichier `assets/js/reels.js`** : auto-injection dans `<section id="reelsSection">` de `index.html`
- **Bucket Supabase `listing-videos`** : public, avec policies de lecture publique
- **Colonne `listings.video_url`** : ajoutée par `video_url_migration.sql`
- **CSP `_headers`** : la directive `media-src 'self' https://*.supabase.co;` est **obligatoire**, sans elle les vidéos ne chargent pas

---

## 10. Partage social (Facebook, WhatsApp, LinkedIn)

Système de partage des annonces avec aperçu riche (image + titre + prix) sur Facebook, WhatsApp, LinkedIn et autres plateformes sociales.

### A. Architecture du partage

```
Bouton "Partager Facebook" sur listing_detail.html
      ↓
Pointe vers https://selogercm.com/share/:slug
      ↓
netlify.toml redirige /share/* vers la function og.js
      ↓
og.js détecte le User-Agent :
  - Crawler social (Facebook, WhatsApp, etc.) → page AVEC meta og:tags, SANS redirection
  - Humain → page AVEC meta refresh vers /annonce/:slug (UX fluide)
```

**Pourquoi cette architecture** : si on redirige TOUS les visiteurs (humains + robots) vers `/annonce/:slug`, les robots sociaux suivent la chaîne et finissent par scraper la homepage → aperçu cassé. La détection User-Agent règle ça.

### B. À NE JAMAIS toucher (zone sensible)

| Élément | Pourquoi c'est critique |
|---|---|
| `netlify/functions/og.js` ligne `CRAWLER_REGEX` | Liste des User-Agents des robots sociaux. Retirer Facebook ou WhatsApp casse l'aperçu sur ces plateformes |
| `og.js` condition `isCrawler ? '' : refreshTag` | Le meta refresh **conditionnel** est le cœur du fix. Si tu remets un meta refresh inconditionnel, les aperçus se cassent |
| `netlify.toml` redirection `/share/*` → `/.netlify/functions/og` | Sans cette règle, `/share/...` retourne 404 |
| `_headers` directive `media-src` | Si manquant, les vidéos Reels ne chargent pas |
| Les 4 boutons de partage dans `listing_detail.html` ligne ~993 doivent **tous** pointer vers `/share/` (pas `/annonce/`) | Sinon WhatsApp scrape `/annonce/...` qui n'a que des og:tags génériques (le JS ne tourne pas pour les crawlers) |

### C. Tester un partage avant publication

**Test Facebook** : [Facebook Debugger](https://developers.facebook.com/tools/debug/) → coller `https://selogercm.com/share/[slug]` → "Re-collecter" 2 fois → vérifier que **URL canonique = /share/...** (pas la homepage) et que l'aperçu montre l'annonce.

**Test WhatsApp** : envoyer le lien à un contact (ou à toi-même). ⚠️ WhatsApp a un cache agressif 24-48h. Pour un test propre, ajouter un suffixe unique : `/share/[slug]?t=1` puis `?t=2`, etc.

**Test LinkedIn** : [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

### D. Troubleshooting partage

| Symptôme | Cause | Solution |
|---|---|---|
| Aperçu Facebook = logo SE LOGER générique | Cache Facebook ou redirection involontaire | Re-collecter 2x dans le Debugger |
| WhatsApp affiche juste l'URL en texte brut | Bouton WhatsApp pointe vers `/annonce/` au lieu de `/share/` | Vérifier `listing_detail.html` ligne ~994 (`shareUrlWa = encodeURIComponent(listingShare)`) |
| Partage donne une page noire avec juste un lien | `og.js` plante (probablement `SB_KEY` manquant) | Vérifier les variables d'environnement Netlify : `SB_ANON_KEY` doit être définie |
| Image de partage cassée (icône brisée) | URL Supabase de l'image inaccessible (RLS, suppression) | Vérifier que l'annonce a bien des `images[0]` valides |
| Le Debugger Facebook montre "Chemin de redirection → homepage" | Meta refresh inconditionnel dans `og.js` | Vérifier que la condition `isCrawler ? '' : refreshTag` est bien en place |

### E. Configuration Netlify environnement

Variables requises dans Netlify → Site settings → Environment variables :

```
SB_ANON_KEY = <ta clé anon Supabase>
```

(Le code accepte aussi `SUPABASE_ANON_KEY` en fallback.)

⚠️ **Ne PAS nommer la variable `SUPABASE_ANON_KEY`** : Netlify Secrets Scanning peut la détecter et bloquer le build. Le nom court `SB_ANON_KEY` est volontaire.

---

## 11. Slogan figé en anglais & Kicker bilingue

Le hero de la homepage affiche 3 niveaux de message :

```
· AGENCE IMMOBILIÈRE & MARKETPLACE AU CAMEROUN ·   ← KICKER (orange, traduit)
Unique Solutions, Smart Living                     ← H1 (figé en anglais)
Que vous achetiez, publiiez ou louiez...           ← SOUS-TITRE (traduit)
```

### A. Pourquoi le H1 est figé en anglais

Le slogan "Unique Solutions, Smart Living" est l'**identité de marque SE LOGER CM**. Comme Apple ne traduit pas "Think Different", Nike garde "Just Do It" partout. **Ne le traduis JAMAIS en français** sous peine de diluer l'identité de marque.

### B. Les 3 endroits qui définissent le H1

Si on doit modifier le slogan un jour, il y a **3 fichiers à synchroniser** (sinon le slogan flickere au switch de langue) :

| Fichier | Ligne approximative | Rôle |
|---|---|---|
| `assets/js/i18n.js` | ~21 (`headline:`) | Valeur appliquée au chargement de la page et au switch de langue (clé `data-i18n="headline"`) |
| `index.html` | ~737 (script inline) | Réécrit le H1 lors du switch de langue avec spans `.line` (pour le saut de ligne CSS). **Cette logique écrase i18n.js**, c'est pour ça qu'il faut aussi la modifier |
| `index.html` (meta tags) | ~7, ~12, ~19 | Title, og:title, twitter:title — pour le SEO et le partage social |
| `index.html` (footer) | ~347 | Copyright " © SE LOGER CM — Unique Solutions, Smart Living" |

⚠️ **Si tu vois "Solutions Uniques, Vie Intelligente" apparaître brièvement au switch de langue**, c'est qu'un de ces 3 endroits a été modifié pour traduire. Refais la synchro pour figer en anglais partout.

### C. Modifier le kicker

Le kicker actuel est : "Agence immobilière & Marketplace au Cameroun" (FR) / "Real estate agency & Marketplace in Cameroon" (EN).

Pour le modifier : **`assets/js/i18n.js` ligne ~22** (clé `kicker:`).

```js
kicker: { fr: 'Nouveau texte FR', en: 'New EN text' },
```

### D. Style du kicker

CSS dans `assets/css/style.css` :
- Desktop : ligne ~119 (`.hero-kicker`)
- Mobile : ligne ~424 (média query)

Modifications possibles : couleur (`#ff7a00`), letter-spacing, font-size. **Ne pas changer** la classe `.hero-kicker` qui est référencée dans `index.html`.

### E. Bonnes pratiques pour le kicker

- **Court** : max 60 caractères, sinon ça déborde sur 2-3 lignes en mobile
- **Identité, pas services** : "Agence immobilière & Marketplace" décrit ce qu'on EST. Ne pas lister ce qu'on FAIT (location, vente, etc.) — la section "Nos services" est faite pour ça
- **Éviter "Investissement"** : connotation négative au Cameroun (arnaques ponzi, crypto-scams) → préférer marketplace, plateforme, agence

---

## 12. Workflow de déploiement

### Méthode recommandée : édition directe GitHub

Plus rapide que VS Code + Git, **économise des minutes Netlify** :

1. Va sur [github.com/seloger985-cloud/selogercm](https://github.com/seloger985-cloud/selogercm)
2. Clique sur le fichier à modifier
3. Icône ✏️ (crayon) → modifie en ligne
4. En bas : message de commit → **"Commit changes"**
5. Netlify déploie automatiquement en ~2 minutes

### Astuce crédits Netlify

**Groupe plusieurs modifications en 1 seul commit** :
- Modifie plusieurs fichiers un par un (sans commit entre deux)
- Ou bien utilise VS Code pour tout modifier puis `git commit` une seule fois
- 1 commit = 1 build Netlify = 1 crédit consommé
- 5 commits rapprochés = 5 crédits gaspillés

---

## 13. En cas de panne

### Le site ne charge plus

1. Check [Netlify → Deploys](https://app.netlify.com/projects/selogercm/deploys) → cherche un build en rouge
2. Si build failed → clique → lis l'erreur
3. **Rollback rapide** : Netlify → Deploys → dernier déploiement OK → bouton **"Publish deploy"**

### Une fonctionnalité casse après un push

1. Ouvre la console du navigateur (F12 → onglet Console)
2. Screenshot l'erreur
3. **Cmd/Ctrl+F5** pour vider le cache navigateur
4. Si ça persiste → rollback Netlify (voir ci-dessus)

### Les annonces ne s'affichent plus

Probable problème Supabase :
1. Va sur [Supabase → Logs](https://supabase.com/dashboard/project/hozlyddiqodvjguqywty/logs/explorer)
2. Cherche des erreurs RLS ou 401/403
3. Si RLS : `/admin` → vérifier que ton compte a bien le rôle admin

### Déploiement bloqué par « Secrets Scanning »

Netlify refuse le build en disant qu'il a trouvé un secret exposé (ex: `SUPABASE_ANON_KEY`).

**Solution rapide** : bouton **"Deploy without restrictions"** sur la page du build échoué.

**Solution durable** : renommer la variable d'environnement pour éviter les patterns détectés (ex: `SB_ANON_KEY` au lieu de `SUPABASE_ANON_KEY`).

---

## 📅 Checklist de maintenance mensuelle

À faire chaque début de mois (~30 min) :

- [ ] Vérifier Netlify → Deploys → pas de builds en échec la semaine passée
- [ ] Supabase → Database → Size : pas de dépassement gratuit (500 Mo)
- [ ] Supabase → Storage → bucket `listing-videos` : pas de dépassement (1 Go gratuit) ; supprimer les vidéos d'annonces désactivées/supprimées
- [ ] Vérifier `/admin` : modérer les annonces en `pending` depuis > 48h
- [ ] **Renouveler 1-2 vidéos Reels** : la section homepage perd en attractivité si elle reste statique. Filmer/uploader 1-2 nouvelles visites express par mois (cf. section 9)
- [ ] Tester le partage social : prendre une annonce avec une URL `/share/...` neuve, la partager sur WhatsApp à soi-même → vérifier l'aperçu (cf. section 10)
- [ ] Répondre aux RDV en attente dans `/admin` → Rendez-vous
- [ ] Tester 3 fiches annonces au hasard (ça charge ? les images ? le WhatsApp ?)
- [ ] Tester `/publier` (flux complet avec une annonce test puis la supprimer)
- [ ] Google Analytics → traffic du mois précédent

---

## 🆘 Quand contacter Claude

Solliciter Claude (et consommer des crédits Anthropic) uniquement pour :

- ✅ Nouvelles **fonctionnalités** (pas des modifications de contenu)
- ✅ **Bugs complexes** que tu n'arrives pas à résoudre
- ✅ **Refactoring** ou améliorations de performance
- ✅ Intégrations **API / MCP externes**
- ✅ Questions **sécurité** (RLS, Auth, nouvelles policies)

**Ne pas solliciter Claude pour :**

- ❌ Changer un texte / une image
- ❌ Ajouter un quartier (voir section 1)
- ❌ Publier un article de blog
- ❌ Désactiver une annonce
- ❌ Ajouter/retirer un bandeau existant

---

**Document vivant** — mets-le à jour quand tu apprends de nouvelles routines. 📝
