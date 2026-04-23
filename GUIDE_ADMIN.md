# Guide du Panneau Admin - Site Web Renouveau

## 🎯 Vue d'ensemble

Votre site fonctionne maintenant entièrement avec une **base de données JSON**. Plus besoin de modifier le code HTML pour ajouter, éditer ou supprimer des projets et articles !

### Accès au Panneau Admin

1. **Dans votre navigateur**, allez sur : `admin.html`
   - Ou cliquez sur le bouton **"Admin"** dans la barre de navigation du site
   - L'adresse sera : `[votre-site]/admin.html`

---

## 📝 Gestion des Articles

### Ajouter un nouvel article

1. Allez dans l'onglet **"Articles"** du panneau admin
2. Cliquez sur le bouton **"+ Article"**
3. Remplissez les champs :
   - **ID** : identifiant unique (ex: `article-mon-projet`)
   - **Chemin page** : chemin du dossier contenant l'article
   - **Titre** : titre de l'article
   - **Tag** : catégorie/domaine (ex: `Animation 2D/3D`)
   - **Date ISO** : date au format `YYYY-MM-DD` (ex: `2026-04-02`)
   - **Date affichée** : texte affiché pour la date (ex: `📅 2 avril, 2026`)
   - **Liens de navigation** : liens vers article précédent/suivant
   - **Contenu HTML** : le contenu complet de l'article (HTML accepté)

### Modifier un article

1. Sélectionnez l'article dans la liste déroulante
2. Modifiez les champs souhaités
3. Les modifications s'enregistrent **automatiquement**

### Dupliquer un article

1. Sélectionnez l'article à dupliquer
2. Cliquez **"Dupliquer"**
3. Un nouvel article sera créé avec un ID modifié

### Supprimer un article

1. Sélectionnez l'article
2. Cliquez **"Supprimer"**
3. Confirmez la suppression

---

## 🎨 Gestion des Domaines et Projets

### Structure des données

Vos projets sont organisés par **domaines** (ex: Animation, Communication, etc.), et chaque domaine contient plusieurs **projets**.

### Ajouter un nouveau domaine

1. Allez dans l'onglet **"Domaines & Projets"**
2. Cliquez sur **"+ Domaine"**
3. Remplissez les champs du domaine :
   - **ID domaine** : identifiant unique (ex: `anim-2d-3d`)
   - **Nom domaine** : nom du domaine (ex: `Motion design 2D/3D`)
   - **Icône** : emoji ou caractère (ex: `🎬`)
   - **Lien domaine** : chemin vers la page "TOUT" du domaine
   - **Image domaine** : image représentative
   - **Description courte** : description rapide du domaine

### Modifier un domaine

1. Sélectionnez le domaine dans la liste déroulante
2. Modifiez les informations
3. Les changements s'enregistrent automatiquement

### Ajouter un projet à un domaine

1. Allez dans l'onglet **"Domaines & Projets"**
2. Sélectionnez le domaine dans le menu déroulant des domaines
3. Cliquez **"+ Projet"** (section projets)
4. Remplissez les informations du projet :
   - **Titre projet** : nom du projet
   - **Lien projet** : chemin vers la page de l'article
   - **Image projet** : image du projet
   - **Date projet** : date ou période du projet
   - **Description courte** : brève description

### Éditer un projet

1. Sélectionnez le domaine, puis le projet
2. Modifiez les champs
3. Les modifications s'enregistrent automatiquement

### Supprimer un projet

1. Sélectionnez le domaine et le projet
2. Cliquez **"Supprimer projet"**
3. Confirmez

---

## 💾 Sauvegarde et Import/Export

### ⚠️ Important : Comment fonctionne la sauvegarde

Les modifications que vous faites dans le panneau admin sont **enregistrées localement dans votre navigateur** (localStorage). Cela signifie :

✅ Les changements sont imméddiats et visibles sur le site  
⚠️ Si vous videz le cache du navigateur, les modifications seront perdues  
✅ Pour **sauvegarder définitivement**, vous devez exporter les fichiers JSON

### Appliquer les modifications

1. Après chaque édition, cliquez sur **"Appliquer en local"**
2. Un message de confirmation s'affiche
3. **Rechargez les pages du site** pour voir les changements

### Exporter les données

Pour sauvegarder vos modifications de manière permanente :

1. Cliquez **"Exporter projects-data.json"** pour exporter les domaines et projets
2. Cliquez **"Exporter articles-data.json"** pour exporter les articles
3. Les fichiers se téléchargent sur votre ordinateur
4. **Remplacez les fichiers dans le dossier du site** par ces nouveaux fichiers

### Importer des données

1. Cliquez **"Importer un JSON"**
2. Sélectionnez un fichier JSON (projects-data.json ou articles-data.json)
3. Les données seront importées instantanément
4. Cliquez **"Appliquer en local"** pour confirmer

### Réinitialiser

1. Cliquez **"Réinitialiser local"**
2. Le cache local du navigateur sera vidé
3. Le site relira les fichiers JSON originaux du serveur

---

## 🔄 Workflow complet d'édition

### Exemple : Ajouter un nouveau projet

1. **Accédez au panneau admin** → `admin.html`
2. **Allez dans "Domaines & Projets"**
3. **Sélectionnez le domaine** où ajouter le projet
4. **Cliquez "+ Projet"**
5. **Remplissez les informations** (titre, lien, image, date, description)
6. **Cliquez "Appliquer en local"**
7. **Rechargez le site** (F5 ou Cmd+R)
8. **Vérifiez que le projet apparaît** sur la page d'accueil et la page projets
9. **Exportez projects-data.json** pour sauvegarder
10. **Replacez le fichier** dans votre dossier projet

---

## 📊 Structure des fichiers JSON

### projects-data.json

```json
{
  "projects": [
    {
      "id": "anim-2d-3d",
      "domaine": "Motion design 2d/3d",
      "icon": "🎬",
      "lien": "3D - Animation.../TOUT animation.html",
      "image": "3D - Animation.../image.png",
      "descriptionCourte": "Description rapide",
      "description": "Description détaillée",
      "date": "Domaine principal",
      "projets": [
        {
          "titre": "Titre du projet",
          "lien": "chemin/vers/article.html",
          "image": "chemin/vers/image.png",
          "descriptionCourte": "Description",
          "date": "Période du projet"
        }
      ]
    }
  ],
  "meta": {
    "totalDomaines": 5,
    "totalProjets": 13,
    "lastUpdate": "2026-04-02"
  }
}
```

### articles-data.json

```json
{
  "articles": [
    {
      "id": "article-telepatia",
      "path": "3D - Animation.../article-Telepatia.html",
      "title": "Telepatia - animation meme",
      "tag": "Animation 2D/3D",
      "date": {
        "iso": "2023-03-03",
        "label": "📅 3 mars, 2023"
      },
      "nav": {
        "prev": "../../chemin/vers/article-prev.html",
        "next": "../../chemin/vers/article-next.html"
      },
      "contentHtml": "<h2>Titre</h2><p>Contenu HTML...</p>"
    }
  ]
}
```

---

## 🐛 Dépannage

### Les modifications ne s'affichent pas

- ✅ Avez-vous cliqué sur **"Appliquer en local"** ?
- ✅ Avez-vous **rechargé la page** du site ?
- ✅ Avez-vous **vidé le cache** du navigateur (Ctrl+Shift+Del) ?

### La page affiche "Données locales invalides"

- Les données JSON du localStorage sont corrompues
- Cliquez **"Réinitialiser local"** pour repartir des fichiers JSON originaux

### Un projet n'apparaît pas sur le site

- Vérifiez que le **chemin du lien** est correct
- Vérifiez que le **domaine est sélectionné** correctement
- Vérifiez que le projet est bien dans la liste

### Les images ne s'affichent pas

- Vérifiez le **chemin de l'image** (relatif au dossier racine)
- Assurez-vous que le fichier image **existe vraiment**
- Vérifiez l'extension (`.png`, `.jpg`, etc.)

---

## 📱 Pages du site et où les données apparaissent

| Page | Source de données | Maintenant : |
|------|-------------------|--------------|
| **index.html** | projects-data.json | Affiche le dernier projet (vedette) |
| **projets.html** | projects-data.json | Affiche tous les domaines et projets en timeline |
| **admin.html** | localStorage + projects/articles-data.json | Panel d'édition complet |
| **TOUT [domaine].html** | projects-data.json | Affiche les projets du domaine sélectionné |
| **article-*.html** | articles-data.json | Affiche le contenu de l'article |

---

## ❓ Questions fréquentes

### Puis-je supprimer un domaine ?
Oui, après avoir cliqué "Supprimer domaine" et confirmé. Attention : cela supprimera aussi tous les projets du domaine !

### Puis-je changer les URLs des pages ?
Les fichiers HTML existent dans des dossiers fixes. Les données JSON qu'ils affichent peuvent être modifiées, mais pas les chemins des fichiers.

### Comment faire si je veux (réellement) supprimer un projet ?
- Supprimez-le du panel admin
- Cliquez "Appliquer en local"
- Exportez projects-data.json
- Replacez le fichier dans votre dossier projet
- Le projet sera supprimé partout sur le site

### Puis-je modifier l'ordre des projets dans un domaine ?
Pas directement dans l'interface admin. Le meilleur moyen est d'éditer le fichier JSON directement avec les détails fournis ci-dessus.

---

## 🚀 Résumé des best practices

1. ✅ **Sauvegardez régulièrement** en exportant vos fichiers JSON
2. ✅ **Appliquez les changements** après chaque modification
3. ✅ **Rechargez le site** pour voir tous les changements
4. ✅ **Testez les liens** pour vérifier qu'ils pointent vers les bonnes pages
5. ✅ **Gardez une copie** de vos fichiers JSON à jour

---

Pour toute question ou problème, consultez cette documentation ! 🎉
