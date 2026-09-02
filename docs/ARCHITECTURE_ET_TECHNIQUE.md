# 🏗️ Architecture & Documentation Technique — OMODA & JAECOO (Parc IT)

Ce document présente l'architecture logicielle, les technologies employées, les diagrammes de classes, ainsi que l'ensemble des méthodes et services du projet **OMODA & JAECOO - Gestion de Parc Informatique & Support IT**.

---

## 📑 Sommaire
1. [Stack Technologique & Dépendances](#1-stack-technologique--dépendances)
2. [Architecture Système & Couches Logicielles](#2-architecture-système--couches-logicielles)
3. [Modèle de Données & Diagramme de Classes UML](#3-modèle-de-données--diagramme-de-classes-uml)
4. [Documentation Détaillée des Méthodes Backend](#4-documentation-détaillée-des-méthodes-backend)
5. [Documentation Détaillée des Méthodes Frontend](#5-documentation-détaillée-des-méthodes-frontend)
6. [Référentiel des Endpoints API REST](#6-référentiel-des-endpoints-api-rest)
7. [Sécurité, Authentification & Sessions](#7-sécurité-authentification--sessions)
8. [Qualité de Code, Tests & Intégration Continue (CI/CD)](#8-qualité-de-code-tests--intégration-continue-cicd)

---

## 1. Stack Technologique & Dépendances

### Frontend
- **Framework UI** : React 19 (Hooks, Context, Composants fonctionnels stricts)
- **Langage** : TypeScript 5.7+ (Mode strict sans `any` implicite)
- **Styling & Design System** : Tailwind CSS 4 & Lucide React (Bibliothèque d'icônes standardisée)
- **Animations & Transitions** : Motion (anciennement Framer Motion)
- **Data Visualization & KPIs** : Recharts & D3.js (Graphiques interactifs, camemberts, barres d'évolution)
- **WebSockets Client** : Socket.io-client (Communication bidirectionnelle temps réel)
- **Bundler & Build Tool** : Vite 6 (Serveur de développement ultra-rapide & compilation de production)

### Backend
- **Moteur d'exécution** : Node.js 22 LTS
- **Framework Web & API** : Express.js 4 (Routage REST modulaire, Middlewares de sécurité)
- **Serveur Temps Réel** : Socket.io 4 (Gestion des salons de discussion, statut de présence, signal WebRTC)
- **Authentification & Cryptographie** : JSON Web Tokens (`jsonwebtoken`), `bcryptjs` (Hash salé 10 rounds)
- **Upload & Gestion Médias** : Multer & Filesystem physique (Conversion et stockage sécurisé des avatars en PNG)
- **Notifications Email** : Nodemailer (Transport SMTP transactionnel avec gestion des templates HTML)

### Base de Données
- **Base Principale** : MongoDB 7+ (Modèles et Schémas typés via ODM **Mongoose**)
- **Base de Test & Fallback** : `mongodb-memory-server` (Démarrage automatique d'une instance MongoDB isolée en mémoire pour les tests unitaires et l'exécution sans dépendance externe)

### Testing & DevOps
- **Moteur de Test** : Vitest 2+ & `@testing-library/react` (482+ tests automatisés)
- **CI / CD Pipelines** : GitHub Actions (`.github/workflows/ci-tests.yml`) & Jenkins (`Jenkinsfile`)
- **Qualité de code** : TypeScript Compiler (`tsc --noEmit`), SonarCloud / SonarQube

---

## 2. Architecture Système & Couches Logicielles

L'application respecte les principes de l'architecture **N-Tiers (3-Tiers Modulaire)** :

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. COUCHE PRÉSENTATION (Frontend SPA - React 19 / TypeScript)               │
│    - Pages : Dashboard, Matériels, Réclamations, Chat, Factures, Users...   │
│    - Composants : Modales, FormAlert, Badges, Header, Sidebar...            │
│    - Services Clients : authService, itParkService, chatService             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Requêtes REST (JSON / Bearer JWT)
                                       │ Événements WebSockets (Socket.io)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. COUCHE CONTRÔLE & SÉCURITÉ (Backend Express Gateway)                     │
│    - verifyToken : Validation du jeton JWT et extraction de req.user        │
│    - requireRole : Contrôle d'accès RBAC (ADMIN, RESPONSABLE_IT, UTILISATEUR)│
│    - businessValidators : Règles d'intégrité, regex MAC/IP, sanitization    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Appels Contrôleurs & Services
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. COUCHE LOGIQUE MÉTIER (Controllers & Services)                           │
│    - authController : Sessions, Tokens, OTP, Profils                        │
│    - dashboardController : Agrégations, KPIs, Valeurs financières           │
│    - socketService : Salons chat, présence live, signal WebRTC              │
│    - mailService : Envoi d'alertes et réinitialisation de mot de passe      │
│    - uploadService : Décodage Base64, stockage disque des avatars           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Mongoose ODM / BSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. COUCHE DE PERSISTANCE (MongoDB & Memory Server)                          │
│    - Collections : Users, Sessions, Materiels, Factures, Reclamations...    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modèle de Données & Diagramme de Classes UML

### Diagramme de Classes Conceptuel (UML)

```text
┌─────────────────────────┐           1..* ┌─────────────────────────┐
│          User           │◄───────────────┤         Session         │
├─────────────────────────┤                ├─────────────────────────┤
│ - _id: ObjectId         │                │ - _id: ObjectId         │
│ - email: string         │                │ - userId: ObjectId (FK) │
│ - motDePasse: string    │                │ - token: string         │
│ - nom: string           │                │ - refreshToken: string  │
│ - prenom: string        │                │ - expireAt: Date        │
│ - role: string          │                │ - isRevoked: boolean    │
│ - statut: string        │                │ - derniereActivite: Date│
│ - beneficiaire: string  │                └─────────────────────────┘
│ - photo: string         │
│ - telephone: string     │
└───────────┬─────────────┘
            │ 1
            │
            │ 0..* (Possède / Gère)
            ▼
┌─────────────────────────┐ 0..*        1 ┌─────────────────────────┐
│        Materiel         ├──────────────►│     GroupeMateriel      │
├─────────────────────────┤               ├─────────────────────────┤
│ - _id: ObjectId         │               │ - _id: ObjectId         │
│ - reference: string     │               │ - nom: string           │
│ - designation: string   │               │ - code: string          │
│ - typeMateriel: string  │               └─────────────────────────┘
│ - numSerie: string      │
│ - marque: string        │               1 ┌─────────────────────────┐
│ - modele: string        ├──────────────►│       Emplacement       │
│ - adresseIp: string     │ 0..*          ├─────────────────────────┤
│ - adresseMac: string    │               │ - _id: ObjectId         │
│ - statut: string        │               │ - emplacement1: string  │
│ - id_Facture: ObjId(FK) │               │ - emplacement2: string  │
│ - id_Emplacement: ObjId ├─┐             │ - id_GroupeEmplac: (FK) │
│ - id_Beneficiaire: ObjId│ │             └───────────┬─────────────┘
└───────────┬─────────────┘ │                         │ 0..*
            │               │                         ▼ 1
            │ 0..*          │             ┌─────────────────────────┐
            ▼               │             │    GroupeEmplacement    │
┌─────────────────────────┐ │             ├─────────────────────────┤
│       Reclamation       │ │             │ - _id: ObjectId         │
├─────────────────────────┤ │             │ - nom: string           │
│ - _id: ObjectId         │ │             └─────────────────────────┘
│ - titre: string         │ │ 0..*      1
│ - description: string   │ └────────────►┌─────────────────────────┐
│ - priorite: string      │               │         Facture         │
│ - statut: string        │               ├─────────────────────────┤
│ - demandeurId: ObjId(FK)│               │ - _id: ObjectId         │
│ - technicienId: ObjId   │               │ - factureFrs: string    │
│ - dateResolution: Date  │               │ - montantHT: number     │
│ - historique: Array     │               │ - montantTVA: number    │
└─────────────────────────┘               │ - montantTTC: number    │
                                          │ - dateAcquisition: Date │
                                          │ - dateGarantie: Date    │
                                          │ - id_Fournisseur: (FK)  │
                                          └───────────┬─────────────┘
                                                      │ 0..*
                                                      ▼ 1
                                          ┌─────────────────────────┐
                                          │       Fournisseur       │
                                          ├─────────────────────────┤
                                          │ - _id: ObjectId         │
                                          │ - Fournisseur: string   │
                                          │ - email: string         │
                                          │ - telephone: string     │
                                          │ - adresse: string       │
                                          └─────────────────────────┘
```

---

## 4. Documentation Détaillée des Méthodes Backend

### A. Contrôleur d'Authentification (`Backend/controllers/authController.ts`)
- **`login(req: Request, res: Response)`** :
  - Reçoit `email` et `motDePasse`.
  - Normalise l'email et recherche l'utilisateur en base.
  - Vérifie la conformité du mot de passe avec `bcrypt.compare`.
  - Vérifie que le statut du compte est bien `ACTIF`.
  - Émet un **Access Token** (15 min) et un **Refresh Token** (7 jours).
  - Enregistre une entrée dans la collection `Session` pour traçabilité.
- **`refreshToken(req: Request, res: Response)`** :
  - Vérifie la validité cryptographique du `refreshToken`.
  - Contrôle en base que la session n'est pas marquée `isRevoked: true`.
  - Génère un nouvel Access Token sans obliger l'utilisateur à ressaisir son mot de passe.
- **`logout(req: Request, res: Response)`** :
  - Récupère le token de l'utilisateur connecté via `req.user`.
  - Marque la session comme révoquée (`isRevoked = true`) en base de données.
- **`getMe(req: Request, res: Response)`** :
  - Retourne les données de profil complètes (sans le hash du mot de passe) de l'utilisateur porteur du jeton.
- **`updateProfile(req: Request, res: Response)`** :
  - Permet la modification du nom, prénom, téléphone et photo de profil.
  - Fait appel à `uploadService.saveAvatarBase64` si une nouvelle image est soumise.
- **`changePassword(req: Request, res: Response)`** :
  - Contrôle l'ancien mot de passe, vérifie la complexité du nouveau et met à jour le hash `bcrypt`.
- **`requestPasswordReset(req: Request, res: Response)`** :
  - Génère un code OTP aléatoire à 6 chiffres avec expiration de 10 minutes.
  - Déclenche l'envoi de l'email via `mailService.sendOTPEmail`.
- **`verifyPasswordResetOTP(req: Request, res: Response)`** :
  - Valide le code OTP et applique le nouveau mot de passe sécurisé.

### B. Contrôleur Tableau de Bord (`Backend/controllers/dashboardController.ts`)
- **`getDashboardStats(req: Request, res: Response)`** :
  - Exécute des agrégations MongoDB pour fournir :
    - Nombre total d'équipements et décompte par statut (*En service, En stock, En panne, Hors service*).
    - Valorisation financière totale du parc (Somme des montants HT des factures associées aux matériels actifs).
    - Taux de disponibilité opérationnelle ($Taux = \frac{Matériels_{EnService}}{Total} \times 100$).
    - Décompte des réclamations par état et par priorité.
- **`getAlerts(req: Request, res: Response)`** :
  - Retourne les alertes critiques du parc : garanties arrivant à expiration sous 60 jours, matériels en panne prolongée, tickets non assignés.

### C. Validateurs Métier (`Backend/validators/businessValidators.ts`)
- `isValidEmail(email)` : Valide le format regex standard de l'adresse email.
- `isValidPhone(phone)` : Vérifie la structure des numéros de téléphone.
- `validatePasswordComplexity(password)` : Contrôle que le mot de passe comprend $\ge 8$ caractères avec majuscule, minuscule, chiffre et caractère spécial.
- `validateMacAddress(mac)` : Vérifie les formats valides d'adresses MAC matérielles.
- `validateIpAddress(ip)` : Vérifie la validité des adresses IPv4.
- `validatePrice(price)` : Contrôle la positivité et la validité numérique des montants.
- `sanitizeText(text)` : Nettoie les balises HTML et scripts suspects pour prévenir les attaques XSS.
- `validateMaterielData(data)` : Contrôle la non-vacuité de la référence, désignation et vérifie l'absence de doublons de numéro de série.
- `validateFactureData(data)` : Contrôle les montants, la date d'acquisition et l'existence du fournisseur.
- `validateEmplacementData(data)` : Vérifie la présence des désignations et le rattachement au groupe d'emplacement.

### D. Services Utilitaires Backend
- **`socketService.ts`** :
  - `initSocketServer(server)` : Attache Socket.io au serveur HTTP Express.
  - `handleUserConnection(socket)` : Authentifie le token JWT du socket, enregistre l'utilisateur dans le registre de présence et notifie le réseau.
  - `handleChatMessage(data)` : Sauvegarde le message en base (collection `Message`) et le diffuse en temps réel aux participants de la conversation.
  - `handleWebRTCSignaling(data)` : Relaye les offres, réponses SDP et candidats ICE pour la visioconférence directe.
- **`mailService.ts`** :
  - `sendMail(options)` : Envoie un email transactionnel avec support HTML et pièces jointes.
  - `sendTicketNotification(ticket, user)` : Notifie le demandeur et le technicien de l'évolution d'un ticket.
  - `sendOTPEmail(email, otp)` : Envoie le code de vérification à 6 chiffres.
- **`uploadService.ts`** :
  - `saveAvatarBase64(base64Data, userId)` : Extrait le buffer binaire, génère un nom de fichier unique et enregistre le fichier PNG dans `Backend/uploads/avatars`.
  - `deleteAvatarFile(filePath)` : Supprime l'ancien fichier avatar lors d'un remplacement.

---

## 5. Documentation Détaillée des Méthodes Frontend

### A. Client d'Authentification (`src/services/authService.ts`)
- `login(email, password)` : Exécute l'appel API `POST /api/auth/login`, stocke le jeton d'accès et les informations du profil dans le `localStorage`, et notifie tous les composants abonnés via le pattern Observateur.
- `logout()` : Révoque le jeton côté serveur, supprime les données locales et bascule l'état applicatif vers l'écran de verrouillage.
- `getUser()` : Retourne l'objet `AuthUser` connecté (nom, rôle, permissions, photo).
- `isAuthenticated()` : Vérifie la présence d'un token valide non expiré.
- `prolongSession()` : Rafraîchit le jeton JWT auprès de l'API et réinitialise le minuteur d'inactivité.
- `subscribe(listener)` : Permet aux composants React de s'abonner aux changements d'état d'authentification.

### B. Client de Gestion de Parc & Données (`src/services/itParkService.ts`)
- **Équipements** :
  - `getMateriels(filters)` : Récupère la liste des équipements avec filtres optionnels (statut, type, recherche texte).
  - `createMateriel(data)` : Envoie la requête de création avec validation préalable.
  - `updateMateriel(id, data)` : Met à jour les caractéristiques d'un équipement.
  - `deleteMateriel(id)` : Supprime ou archive un matériel (restreint aux administrateurs).
- **Réclamations** :
  - `getReclamations()` : Récupère les tickets avec historique et demandeur associé.
  - `createReclamation(data)` : Déclare un incident matériel ou logiciel.
  - `updateReclamationStatus(id, status, comment)` : Fait évoluer le statut (*En cours, Résolue, Rejetée*) en consignant un commentaire d'audit.
- **Finances & Fournisseurs** :
  - `getFactures()` : Récupère les factures avec calcul des montants TTC et durées de garantie.
  - `getFournisseurs()` : Récupère le carnet d'adresses et contrats des prestataires.
- **Exports** :
  - `exportMaterielsCSV()` : Génère un fichier CSV normé contenant l'inventaire matériel complet.

### C. Client Temps Réel & Chat (`src/services/chatService.ts`)
- `connectSocket(token)` : Initialise la connexion WebSocket avec en-tête d'authentification.
- `sendMessage(conversationId, text, attachments)` : Émet un message texte ou document.
- `sendVoiceMessage(conversationId, audioBlob)` : Transmet un mémo vocal compressé.
- `onNewMessage(callback)` : Reçoit les messages instantanés en direct.
- `onUserStatusChange(callback)` : Met à jour la liste des collaborateurs en ligne / hors ligne.

---

## 6. Référentiel des Endpoints API REST

| Méthode | Endpoint | Description | Rôles Autorisés |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authentification & émission des tokens | Public |
| `POST` | `/api/auth/refresh-token` | Renouvellement du token d'accès | Public |
| `POST` | `/api/auth/logout` | Révocation de la session active | Connecté |
| `GET` | `/api/auth/me` | Récupération du profil connecté | Connecté |
| `PUT` | `/api/auth/update-profile` | Mise à jour profil et photo avatar | Connecté |
| `POST` | `/api/auth/change-password` | Modification du mot de passe | Connecté |
| `POST` | `/api/auth/forgot-password` | Demande d'envoi de code OTP | Public |
| `POST` | `/api/auth/reset-password` | Validation OTP & nouveau mot de passe | Public |
| `GET` | `/api/dashboard/stats` | KPIs et indicateurs du parc | Connecté |
| `GET` | `/api/materiels` | Liste des matériels du parc | Connecté |
| `POST` | `/api/materiels` | Création d'un équipement | `ADMIN`, `RESPONSABLE_IT` |
| `PUT` | `/api/materiels/:id` | Modification d'un équipement | `ADMIN`, `RESPONSABLE_IT` |
| `DELETE`| `/api/materiels/:id` | Suppression d'un équipement | `ADMIN` |
| `GET` | `/api/reclamations` | Liste des tickets de réclamation | Connecté |
| `POST` | `/api/reclamations` | Création d'un ticket de support | Connecté |
| `PATCH`| `/api/reclamations/:id/status`| Mise à jour du statut d'un ticket | `ADMIN`, `RESPONSABLE_IT` |
| `GET` | `/api/factures` | Liste des factures d'achat | Connecté |
| `GET` | `/api/fournisseurs` | Répertoire des fournisseurs | Connecté |
| `GET` | `/api/emplacements` | Liste des sites et bureaux | Connecté |
| `GET` | `/api/users` | Gestion des utilisateurs | `ADMIN` |

---

## 7. Sécurité, Authentification & Sessions

1. **Architecture Double Token (Access / Refresh Token)** :
   - L'Access Token a une durée de vie courte (15 minutes), réduisant considérablement la fenêtre d'attaque en cas d'interception.
   - Le Refresh Token (7 jours) permet de réémettre des jetons de manière transparente tout en conservant la capacité de révoquer immédiatement un accès depuis la base de données.
2. **Contrôle d'Accès Basé sur les Rôles (RBAC)** :
   - Les routes sensibles (création de matériel, validation de tickets, gestion des utilisateurs) sont protégées par le middleware `requireRole(['ADMIN', 'RESPONSABLE_IT'])`.
3. **Chiffrement des Données Sensibles** :
   - Aucun mot de passe n'est stocké en clair. Le hachage est opéré via `bcryptjs` avec 10 tours de salage aléatoire.
4. **Gestion de l'Inactivité de Session** :
   - Des écouteurs d'événements surveillent l'activité de l'utilisateur (souris, clavier). En cas d'inactivité prolongée, une modale d'avertissement s'affiche avec compte à rebours avant déconnexion automatique et fermeture des accès.

---

## 8. Qualité de Code, Tests & Intégration Continue (CI/CD)

### Suite de Tests Automatisés (482+ Tests)
Le projet intègre une suite de tests unitaires et d'intégration garantissant la robustesse de chaque composant :
- **Validateurs & Métier** (`src/test/businessValidators.test.ts`, `src/test/stock-management.test.ts`)
- **Sécurité & Middleware** (`src/test/backend-services-auth.test.ts`, `src/test/session-auth-security.test.ts`)
- **Workflows Réclamations** (`src/test/reclamation-workflow.test.ts`, `src/test/reclamations-exhaustive.test.ts`)
- **Finances & Factures** (`src/test/finance-facturation.test.ts`)
- **Upload & Services** (`src/test/backend-socket-mail-upload.test.ts`)
- **Composants d'Interface UI** (`src/test/components-ui.test.tsx`)

### Exécution des Tests en Ligne de Commande
```bash
# Exécution de l'intégralité des tests unitaires
npm run test:run

# Lancement du linter de conformité TypeScript
npm run lint

# Vérification du build de production
npm run build
```

### Pipelines Automatisés
- **GitHub Actions (`.github/workflows/ci-tests.yml`)** : Exécute automatiquement à chaque push : `npm ci` $\rightarrow$ `npm run test:run` $\rightarrow$ `npm run lint` $\rightarrow$ `npm run build`.
- **Jenkins (`Jenkinsfile`)** : Pipeline déclaratif multi-étapes orchestrant le build, le packaging et les tests pour les déploiements d'entreprise.
