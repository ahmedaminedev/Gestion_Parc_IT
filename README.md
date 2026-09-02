# 🚗 OMODA & JAECOO — Système de Gestion de Parc Informatique & Support IT

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-emerald?style=flat-square&logo=githubactions)](https://github.com)
[![Tests Passing](https://img.shields.io/badge/Tests-482%20passed-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)

Application d'entreprise **Full-Stack** dédiée à la gestion centralisée du parc matériel informatique, au suivi budgétaire, à la traçabilité des équipements et au helpdesk technique pour la filiale **OMODA & JAECOO**.

---

## 📚 Documentation Complète du Projet

Pour une immersion approfondie, deux guides détaillés sont disponibles dans le dossier `/docs` :

- 🏗️ **[Documentation Technique & Architecture Logicielles (`docs/ARCHITECTURE_ET_TECHNIQUE.md`)](./docs/ARCHITECTURE_ET_TECHNIQUE.md)** :
  - Technologies et stack complète (Front, Back, Sockets, Base de données).
  - Diagramme de classes UML & Schéma des modèles de données.
  - Détail complet de toutes les méthodes Backend (Contrôleurs, Services, Validateurs) et Frontend (Clients API, Hooks).
  - Référence exhaustive des endpoints REST et cycle de vie des jetons JWT.
  - Stratégie de tests unitaires et intégration continue CI/CD.

- 📖 **[Guide Utilisateur, Rôles & Scénarios Métiers (`docs/GUIDE_UTILISATEUR_ET_SCENARIOS.md`)](./docs/GUIDE_UTILISATEUR_ET_SCENARIOS.md)** :
  - Matrice des rôles (`ADMIN`, `RESPONSABLE_IT`, `UTILISATEUR`).
  - Cartographie de chaque écran, utilité métier et actions permises.
  - **7 Scénarios d'utilisation détaillés pas-à-pas** (Arrivée d'employé, Déclaration et résolution de panne SLA, Commande fournisseur, Déclassement de matériel, Dépannage en visioconférence WebRTC, Récupération de mot de passe par OTP, Sécurité d'inactivité de session).

---

## 🌟 Modules & Fonctionnalités Clés

### 1. 📊 Tableau de Bord & Indicateurs DSI (KPIs)
- **Valorisation du parc en temps réel** : Calcul automatique de la valeur active en Dinars Tunisiens (TND).
- **Indicateurs de santé** : Taux de disponibilité opérationnelle, équipements en panne, suivi du MTTR (*Mean Time To Resolution*).
- **Alertes préventives** : Surveillance des garanties constructeur expirant sous 60 jours et des tickets urgents.
- **Graphiques dynamiques** : Répartition par type de machine, localisation et statut.

### 2. 💻 Inventaire des Équipements & Cartographie Matérielle
- **Fiches matériels exhaustives** : Numéro de série unique, référence, marque, modèle, adresses IP / MAC, configuration (RAM, CPU, Stockage).
- **Cycle de vie complet** : États d'équipements normés (*En service, En stock, En panne, Hors service*).
- **Affectation nominative & géographique** : Attribution aux collaborateurs, rattachement aux sites, étages et bureaux.
- **Export standardisé** : Génération instantanée de l'inventaire complet au format CSV.

### 3. 🎫 Helpdesk & Gestion des Réclamations (Workflow SLA)
- **Déclaration simplifiée** : Sélection de l'équipement défaillant et qualification de la priorité (*Basse, Moyenne, Haute, Urgente*).
- **Cycle de résolution** : Prise en charge $\rightarrow$ Assignation technicien $\rightarrow$ En cours $\rightarrow$ Clôture avec note d'intervention.
- **Traçabilité totale** : Journal d'audit chronologique horodaté et notifications email automatiques.

### 4. 💬 Messagerie Temps Réel & Visioconférence WebRTC
- **Communication instantanée (Socket.io)** : Salons de discussion privés et de groupe avec présence en direct.
- **Mémos vocaux intégrés** : Enregistrement et lecture de messages audio directement dans le navigateur.
- **Assistance à distance (WebRTC)** : Appels vidéo et audio haute définition pour diagnostic immédiat.
- **Partage multimédia** : Transfert de documents, captures d'écran et photos webcam.

### 5. 💰 Factures, Fournisseurs & Finances
- **Suivi des investissements** : Enregistrement des factures d'achat, montants HT/TVA/TTC, dates d'acquisition et durées de garantie.
- **Répertoire Fournisseurs** : Base de données des prestataires IT avec contacts et contrats de maintenance.

### 6. 👥 Administration & Sécurité des Accès
- **Contrôle d'accès basé sur les rôles (RBAC)** : Cloisonnement strict des privilèges.
- **Cycle des jetons JWT (Dual-Token)** : Access Token (15 min) + Refresh Token (7 jours) avec révocation en base.
- **Protection par code OTP** : Récupération de mot de passe sécurisée par email transactionnel.
- **Détection d'inactivité** : Verrouillage automatique avec modale d'avertissement.

---

## 🛠️ Stack Technologique

| Couche | Technologies Utilisées |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide Icons, Recharts |
| **Backend** | Node.js 22 LTS, Express.js, Socket.io 4 (Temps réel), WebRTC |
| **Base de Données** | MongoDB 7 / ODM Mongoose (avec fallback MongoDB Memory Server) |
| **Sécurité & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` (Salage 10 rounds), RBAC |
| **Emails & Uploads** | Nodemailer (Transport SMTP), Multer, Stockage physique d'avatars PNG |
| **Tests & Qualité** | Vitest 2+, Testing Library, TypeScript Strict, SonarCloud |

---

## 🚀 Installation & Démarrage Rapide

### Prérequis
- **Node.js** (version 20+ ou 22 LTS recommandée)
- **npm** (ou bun / yarn)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Créez un fichier `.env` à la racine en vous basant sur le modèle fourni :
```bash
cp .env.example .env
```

### 3. Lancement en mode Développement
```bash
npm run dev
```
L'application démarre automatiquement sur **`http://localhost:3000`** avec rechargement à chaud (Vite + API Express).

---

## 🧪 Tests Automatisés & Intégration Continue (CI/CD)

Le projet intègre une suite exhaustive de **tests unitaires, d'intégration et de composants** :

```bash
# Lancer l'intégralité de la suite de tests
npm run test:run

# Lancer les tests en mode interactif / surveillance
npm run test

# Vérifier les types TypeScript sans compilation
npm run lint

# Compiler le livrable de production
npm run build
```

### Pipelines CI/CD Inclus
- **GitHub Actions (`.github/workflows/ci-tests.yml`)** : Exécute automatiquement à chaque push/PR les étapes `npm ci`, `test:run`, `lint` et `build`.
- **Jenkins (`Jenkinsfile`)** : Pipeline déclaratif multi-étapes prêt pour les serveurs d'intégration continue d'entreprise.

---

## 👥 Structure des Dossiers du Projet

```text
Gestion_Parc_IT/
├── 📁 .github/workflows/    # Pipelines d'intégration continue GitHub Actions
├── 📁 Backend/              # Serveur API Express, Contrôleurs, Modèles Mongoose, Services
├── 📁 docs/                 # Documentation technique approfondie et guide scénarios
│   ├── ARCHITECTURE_ET_TECHNIQUE.md
│   └── GUIDE_UTILISATEUR_ET_SCENARIOS.md
├── 📁 public/               # Actifs statiques et images
├── 📁 src/                  # Code source Client React 19 (Pages, Composants, Services, Tests)
│   ├── 📁 components/       # Vues Backoffice, Modales, Header, Sidebar, Chat
│   ├── 📁 services/         # Clients API REST, Socket.io et Authentification
│   ├── 📁 test/             # 482+ Tests unitaires et d'intégration Vitest
│   └── 📁 types/            # Définitions des interfaces TypeScript
├── Jenkinsfile              # Pipeline CI/CD Jenkins
├── README.md                # Présentation générale du projet
└── package.json             # Dépendances et scripts de build
```
