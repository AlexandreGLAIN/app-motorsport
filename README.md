# Le Calendrier — sport auto

Application web publique qui regroupe, semaine par semaine, **toutes les sessions
de sport auto** : essais, qualifications, sprints et courses, avec leurs
**horaires réglés sur Paris** et **où les regarder** (chaîne, plateforme,
abonnement nécessaire ou non).

Le calendrier est **régénéré chaque jour** à partir de sources publiques. Le site
est entièrement statique : n'importe qui peut le consulter, depuis n'importe où,
sans compte et sans serveur à maintenir.

---

## Ce que fait l'application

L'app reprend point par point le calendrier hebdomadaire décrit dans la vidéo.

| Ce qui était annoncé | Ce qui est implémenté |
| --- | --- |
| Différentes catégories | 10 championnats, filtrables par pastilles (F1, F2, F3, F1 Academy, MotoGP, WEC, WRC, Formule E, IndyCar, IMSA) |
| Horaires de diffusion réglés sur Paris | `Europe/Paris` par défaut, avec sélecteur de fuseau (heure locale de l'appareil, UTC, New York, Tokyo…) |
| Course(s), qualifs, sprint | Toutes les sessions du week-end, avec un filtre `Tout` / `Qualifs & courses` / `Courses` |
| Plateformes / abonnements, selon les catégories | Diffuseur affiché sur chaque session, avec la mention `abo` ou `gratuit`, et un lien vers la chaîne |
| Objectif : toutes les infos au même endroit | Une page unique : bandeau « prochaine session » avec compte à rebours, repère « en direct », vue hebdomadaire complète |
| Objectif : donner envie de regarder d'autres catégories | Encart « À découvrir » qui met en avant une course d'une catégorie non suivie, avec un bouton pour l'ajouter |
| Infos les plus fraîches | Actualisation quotidienne automatique, date de dernière mise à jour et état des sources affichés en pied de page |

Deux détails qui comptent :

- **Les horaires inconnus sont annoncés comme tels.** Le WEC, le WRC et l'IMSA ne
  publient pas d'heure de départ dans leurs calendriers ouverts : ces sessions
  portent la mention « horaire à confirmer » au lieu d'une heure inventée.
- **Les droits TV sont datés.** Une diffusion non revalidée pour la saison en
  cours est marquée « à confirmer ». Les droits se renégocient tous les ans.

---

## Démarrer en local

```bash
npm install
```

```bash
npm run ingest
```

```bash
npm run dev
```

`npm run ingest` récupère les horaires et écrit `public/data/calendar.json`
(≈ 640 sessions, 10 catégories, moins d'une seconde). `npm run dev` ouvre le site
sur `http://localhost:5173`.

Autres commandes : `npm run typecheck`, `npm run build`, `npm run preview`.

---

## Architecture

Deux moitiés indépendantes, reliées par un seul fichier JSON.

```
scripts/ingest/          Pipeline Node/TypeScript, exécuté une fois par jour
  config/series.ts         Catalogue des catégories + diffuseurs (à éditer à la main)
  config/sources.ts        D'où viennent les horaires de chaque catégorie
  sources/sportstimes.ts   Adaptateur jeu de données ouvert (horaires précis)
  sources/ics.ts           Adaptateur iCalendar (WEC, WRC, IMSA)
  normalize.ts             Libellés FR, familles de session, durées, noms d'épreuve
  index.ts                 Orchestration, rapport par source, écriture du JSON
        │
        ▼
public/data/calendar.json  Le seul artefact de données
        │
        ▼
src/                     Interface React + TypeScript, 100 % statique
```

Conséquence pratique : le site n'a **pas de back-end**. Il lit un fichier JSON.
C'est ce qui permet de l'héberger gratuitement n'importe où et de le rendre
insensible aux pics de trafic.

### Robustesse de l'ingestion

Le pipeline est conçu pour tourner sans surveillance :

- les sources sont interrogées **en parallèle** et indépendamment ;
- une source en panne **ne fait pas échouer** la passe ;
- les sessions d'une source en panne sont **reprises du fichier de la veille**,
  pour qu'une indisponibilité passagère ne vide jamais le calendrier ;
- l'état de chaque source est écrit dans le JSON et **affiché en pied de page**,
  pour qu'une source silencieusement morte se remarque ;
- les identifiants de session sont déterministes : d'une passe à l'autre, le
  `git diff` ne montre que les vrais changements.

---

## Sources de données

| Catégories | Source | Horaires |
| --- | --- | --- |
| F1, F2, F3, F1 Academy, MotoGP, Formule E, IndyCar | [`sportstimes/f1`](https://github.com/sportstimes/f1) — jeu de données ouvert (MIT), JSON en UTC | À la minute |
| WEC, WRC, IMSA | Flux iCalendar publics | Date seule → « horaire à confirmer » |
| Diffuseurs (France) | `scripts/ingest/config/series.ts` — curation manuelle | Vérifié en début de saison |

### Pourquoi pas du scraping partout ?

L'objectif initial était de « scraper partout ». En pratique, sur ce domaine, le
scraping HTML est le **dernier** recours plutôt que le premier :

- les données existent déjà en **JSON et en iCalendar**, structurées et stables ;
  un scraper HTML sur les mêmes sites serait plus fragile pour un résultat
  identique, et casserait à la première refonte de page ;
- une tâche automatique quotidienne qui parcourt des dizaines de sites pose des
  questions de conditions d'utilisation ; les jeux de données ouverts et les flux
  iCalendar sont **publiés pour être consommés**.

Le pipeline reste ouvert : ajouter un adaptateur de scraping se fait en écrivant
un module dans `scripts/ingest/sources/` qui renvoie un `Session[]`, puis en le
déclarant dans `config/sources.ts`. Le reste de la chaîne ne bouge pas. C'est la
bonne porte d'entrée pour couvrir un championnat sans source structurée (DTM,
GT World Challenge, Super Formula…).

---

## Maintenance saisonnière

Une seule chose demande une intervention humaine, une fois par an : **les droits
de diffusion**.

Tout est dans `scripts/ingest/config/series.ts`. Chaque diffuseur porte un champ
`confidence` :

- `high` — droits confirmés pour la saison en cours, affiché tel quel ;
- `medium` / `unverified` — affiché avec la mention « à confirmer ».

En début de saison, vérifiez les diffuseurs et repassez-les en `high`. Les
catégories actuellement à confirmer : F2, F3, F1 Academy, Formule E, IndyCar,
IMSA.

### Ajouter une catégorie

1. Une entrée dans `SERIES` (`config/series.ts`) : identifiant, nom, couleur,
   diffuseurs.
2. Une entrée dans `SOURCES` (`config/sources.ts`) : où récupérer les horaires.
3. `npm run ingest`.

---

## Déploiement

Le site est un dossier de fichiers statiques : il fonctionne sur n'importe quel
hébergeur. Le chemin le plus simple, gratuit et complet est **GitHub Pages**,
parce qu'il fournit aussi la tâche quotidienne.

### GitHub Pages (recommandé)

Le workflow `.github/workflows/update-calendar.yml` est déjà écrit. Il récupère
les horaires, committe le calendrier s'il a changé, construit le site et le
publie — tous les jours à 04:00 UTC, et à chaque `push`.

> Sous **Windows PowerShell**, `&&` n'est pas un séparateur d'instruction : les
> commandes ci-dessous sont à lancer une par une.

```bash
git init -b main
```

```bash
git add .
```

Si Git n'a jamais été configuré sur la machine, indiquez une fois votre identité
(elle apparaîtra dans l'historique) :

```bash
git config --global user.name "Votre Nom"
```

```bash
git config --global user.email "vous@exemple.com"
```

```bash
git commit -m "Le Calendrier"
```

Créez ensuite un dépôt vide sur GitHub, puis :

```bash
git remote add origin https://github.com/VOTRE-COMPTE/app-motorsport.git
```

```bash
git push -u origin main
```

Puis dans le dépôt : **Settings → Pages → Source : GitHub Actions**. Le site sera
publié sur `https://VOTRE-COMPTE.github.io/app-motorsport/`.

> Le workflow passe `BASE_PATH=/<nom-du-dépôt>/` au build, ce dont Vite a besoin
> pour un site servi dans un sous-chemin. Sur un domaine dédié, laissez `BASE_PATH`
> vide.

### Vercel / Cloudflare Pages / Netlify

Commande de build `npm run ci` (ingestion + build), dossier de sortie `dist`.
Ces plateformes savent aussi déclencher un build quotidien (Vercel : *Cron Jobs*
ou *Deploy Hook* appelé par une tâche planifiée ; Cloudflare : *Scheduled
deployments*). Le workflow GitHub Actions reste utilisable en parallèle pour
n'actualiser que les données.

### Hébergeur statique quelconque

```bash
npm run ci
```

Envoyez le contenu de `dist/` sur l'hébergement. Rejouez la commande chaque jour
pour rafraîchir les données.

---

## Limites connues

- **WEC, WRC et IMSA n'ont que des dates**, pas des heures. Les sessions sont
  affichées le bon jour avec la mention « horaire à confirmer ». Les rendre
  précises demanderait un adaptateur dédié sur les sites officiels.
- **Le WEC ne remonte que les courses** (8 sessions), pas les essais ni les
  qualifications : c'est ce que contient le flux iCalendar utilisé.
- **Les durées de session sont estimées** par catégorie. Elles servent uniquement
  au repère « en direct », jamais à annoncer une heure de fin.
- **Les informations de diffusion concernent la France** et sont saisies à la
  main. Voir « Maintenance saisonnière ».
- Les noms d'épreuve commerciaux (IndyCar, IMSA, WRC) restent dans leur langue
  d'origine : ce sont des noms propres. Les pays (MotoGP) et les courses
  d'endurance sont francisés.
