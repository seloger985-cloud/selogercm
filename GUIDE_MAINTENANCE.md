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
9. [Workflow de déploiement](#9-workflow-de-déploiement)
10. [En cas de panne](#10-en-cas-de-panne)

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

## 9. Workflow de déploiement

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

## 10. En cas de panne

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
- [ ] Vérifier `/admin` : modérer les annonces en `pending` depuis > 48h
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
