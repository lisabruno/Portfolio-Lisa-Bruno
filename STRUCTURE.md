# Structure du Projet Portfolio

## 📁 Organisation des fichiers

### CSS
- **`style.css`** → Fichier maître qui importe tous les styles (utiliser celui-ci)
- `style.variables.css` → Variables de couleurs, typographie, etc.
- `style.header.css` → Topbar et header
- `style.navigation.css` → Menu de navigation
- `style.footer.css` → Footer
- `style.decorative.css` → Ornements et éléments visuels
- `style.index-tout.css` → Pages index et projets (timeline, layout)
- `style.articles.css` → Pages articles individuelles

### JavaScript
- **`script.nav.js`** → Gestion de la navigation et dropdowns (chargé en defer)
- **`script.js`** → Animations zigzag, intersection observer, événements globaux
- **`script.timeline.js`** → Génération dynamique des timelines (utilisé par index.html et projets.html)
- `script.projects.js` → Carrousels et animations spécifiques aux articles

### HTML pages principales
- **`index.html`** → Page d'accueil avec timeline des domaines
- **`projets.html`** → Listing détaillé des projets avec tri par catégorie
- `CV/cv.html` → CV en ligne

## 🔄 Flux d'import des ressources

### index.html et projets.html
```
1. style.css (maître CSS)
2. script.nav.js (defer – chargé en priorité)
3. script.js (chargé après DOM)
4. script.timeline.js (génère les timelines)
```

### Articles individuels
```
1. style.css (maître CSS)
2. script.nav.js (defer)
3. script.projects.js (carrousels et animations)
```

## 🎯 Principes de cette architecture

✅ **DRY (Don't Repeat Yourself)**
- Timeline generée une seule fois dans `script.timeline.js`
- CSS centralisés dans `style.css`
- Navigation gérée une seule fois

✅ **Modulaire**
- Chaque système (nav, timeline, articles) est indépendant
- Facile à ajouter/modifier une fonction

✅ **Performant**
- CSS unique import (évite les multiples fichiers)
- Scripts chargés en ordre optimal
- Code inline supprimé → fichiers cachables par le navigateur

## 📝 Ajouter une nouvelle page

1. Importer `style.css` (pas les fichiers individuels)
2. Importer `script.nav.js` en defer
3. Ajouter `script.js` si besoin d'animations globales
4. Ajouter `script.timeline.js` si page avec timeline
5. Ajouter `script.projects.js` si articles avec carrousels

## 🔧 Modifier la structure

### Ajouter une feuille CSS
1. Créer le fichier `style.nom.css`
2. L'importer dans `style.css` à l'endroit logique
3. Ne pas l'importer directement dans les HTML

### Ajouter une fonction JavaScript
1. L'ajouter dans le fichier thématique approprié
2. Ou créer `script.nom.js` si domaine nouveau
3. L'importer dans les HTML concernées uniquement
