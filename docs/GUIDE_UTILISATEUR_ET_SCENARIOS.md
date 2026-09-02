# 📖 Guide Utilisateur, Rôles & Scénarios Opérationnels

Ce guide présente en détail la matrice des rôles, l'utilité de chaque écran applicatif ainsi que la réalisation pas-à-pas de tous les scénarios métiers du projet **OMODA & JAECOO (Gestion de Parc IT)**.

---

## 📑 Sommaire
1. [Matrice des Rôles & Permissions](#1-matrice-des-rôles--permissions)
2. [Cartographie des Écrans & Utilité par Rôle](#2-cartographie-des-écrans--utilité-par-rôle)
3. [Scénario 1 : Arrivée d'un collaborateur & Affectation de matériel](#3-scénario-1--arrivée-dun-collaborateur--affectation-de-matériel)
4. [Scénario 2 : Déclaration & Traitement d'un ticket de support (SLA)](#4-scénario-2--déclaration--traitement-dun-ticket-de-support-sla)
5. [Scénario 3 : Réception d'une commande fournisseur & Enregistrement de facture](#5-scénario-3--réception-dune-commande-fournisseur--enregistrement-de-facture)
6. [Scénario 4 : Défaillance irréparable & Déclassement / Réforme de matériel](#6-scénario-4--défaillance-irréparable--déclassement--réforme-de-matériel)
7. [Scénario 5 : Dépannage à distance & Visioconférence WebRTC](#7-scénario-5--dépannage-à-distance--visioconférence-webrtc)
8. [Scénario 6 : Récupération de mot de passe par code de sécurité OTP](#8-scénario-6--récupération-de-mot-de-passe-par-code-de-sécurité-otp)
9. [Scénario 7 : Sécurité de session & Gestion de l'inactivité](#9-scénario-7--sécurité-de-session--gestion-de-linactivité)

---

## 1. Matrice des Rôles & Permissions

L'application intègre trois profils d'utilisateurs distincts :

| Fonctionnalité / Écran | `ADMIN` (Administrateur DSI) | `RESPONSABLE_IT` (Technicien IT) | `UTILISATEUR` (Collaborateur) |
| :--- | :---: | :---: | :---: |
| **Tableau de Bord & KPIs** | Lecture & Analyse complète | Lecture & Analyse complète | Masqué |
| **Inventaire Matériel (Lecture)** | ✅ Oui | ✅ Oui | ✅ Ses matériels uniquement |
| **Ajout / Édition / Déclassement Matériel** | ✅ Oui | ✅ Oui | ❌ Non |
| **Suppression définitive de Matériel** | ✅ Oui | ❌ Non | ❌ Non |
| **Création d'un Ticket / Réclamation** | ✅ Oui | ✅ Oui | ✅ Oui |
| **Prise en charge & Clôture de Ticket** | ✅ Oui | ✅ Oui | ❌ Non |
| **Factures & Fournisseurs** | ✅ Gestion complète | ✅ Gestion complète | ❌ Masqué |
| **Emplacements & Sites** | ✅ Gestion complète | ✅ Gestion complète | ❌ Masqué |
| **Administration des Utilisateurs** | ✅ Gestion complète | ❌ Non | ❌ Masqué |
| **Messagerie Temps Réel & Visio** | ✅ Oui (Tous contacts) | ✅ Oui (Tous contacts) | ✅ Oui (Support IT) |
| **Profil & Avatar personnel** | ✅ Oui | ✅ Oui | ✅ Oui |

---

## 2. Cartographie des Écrans & Utilité par Rôle

### 1. 📊 Tableau de Bord (`DashboardPage.tsx`)
- **Pour qui ?** `ADMIN` et `RESPONSABLE_IT`.
- **Utilité :** Vue panoramique sur l'état de santé du parc informatique.
- **Indicateurs affichés :**
  - Valorisation totale du parc actif en Dinars Tunisiens (TND).
  - Taux de disponibilité opérationnelle des machines (%).
  - Décompte des équipements par statut (*En service, En stock, En panne, Hors service*).
  - Compteur des réclamations ouvertes et urgentes.
  - Graphique de répartition par catégorie d'équipement.

---

### 2. 💻 Inventaire des Équipements (`MaterielsPage.tsx`)
- **Pour qui ?** `ADMIN`, `RESPONSABLE_IT` (Gestion complète), `UTILISATEUR` (Consultation de son matériel).
- **Utilité :** Fiche d'identité numérique de chaque actif technologique.
- **Actions possibles :**
  - Rechercher un équipement par numéro de série, référence, marque ou bénéficiaire.
  - Ajouter un équipement avec fiche technique complète (IP, MAC, RAM, CPU).
  - Affecter un matériel à un utilisateur ou modifier son emplacement physique.
  - Exporter l'inventaire au format CSV pour inventaire physique.

---

### 3. 🎫 Gestion des Réclamations & Support (`ReclamationsPage.tsx`)
- **Pour qui ?** Tous les rôles.
- **Utilité :** Gestionnaire de tickets d'assistance et de maintenance.
- **Actions possibles :**
  - Déclarer un dysfonctionnement en sélectionnant l'équipement concerné.
  - Définir le degré d'urgence (*Basse, Moyenne, Haute, Urgente*).
  - Pour les techniciens : s'assigner le ticket, passer l'état à *En cours*, ajouter des notes d'intervention et marquer le ticket comme *Résolu*.

---

### 4. 💰 Facturation & Fournisseurs (`FacturesPage.tsx`, `FournisseursPage.tsx`)
- **Pour qui ?** `ADMIN` et `RESPONSABLE_IT`.
- **Utilité :** Suivi des investissements informatiques et garanties.
- **Actions possibles :**
  - Enregistrer les factures d'achat avec montants HT, TVA et TTC.
  - Suivre les dates d'expiration de garantie constructeur.
  - Gérer le répertoire des fournisseurs avec coordonnées et interlocuteurs clés.

---

### 5. 📍 Emplacements & Agences (`EmplacementsPage.tsx`)
- **Pour qui ?** `ADMIN` et `RESPONSABLE_IT`.
- **Utilité :** Cartographie spatiale des équipements.
- **Actions possibles :**
  - Définir les sites principaux (Siège, Showroom, Ateliers).
  - Définir les bureaux, étages et pièces d'affectation.

---

### 6. 💬 Messagerie Instantanée & Appels (`MessagesPage.tsx`)
- **Pour qui ?** Tous les collaborateurs.
- **Utilité :** Canal de communication unifié pour le support et le travail d'équipe.
- **Actions possibles :**
  - Discuter par messagerie instantanée avec indicateur de présence live.
  - Envoyer des mémos vocaux enregistrés directement depuis le navigateur.
  - Lancer un appel audio ou vidéo WebRTC avec partage d'écran.
  - Joindre des captures d'écran et documents.

---

### 7. 👥 Administration des Utilisateurs (`UsersPage.tsx`)
- **Pour qui ?** `ADMIN` uniquement.
- **Utilité :** Gouvernance des comptes et des droits d'accès.
- **Actions possibles :**
  - Créer des comptes collaborateurs et définir leur rôle.
  - Activer ou désactiver l'accès d'un compte (blocage de connexion).
  - Réinitialiser le mot de passe d'un collaborateur.

---

# 3. Scénario 1 : Arrivée d'un collaborateur & Affectation de matériel

### Objectif
Accueillir un nouvel employé (ex: M. Ahmed Ben Ali, Commercial), lui créer un compte utilisateur et lui affecter un PC Portable en stock.

### Étapes Pas-à-Pas dans l'Application :
1. **Création du compte utilisateur :**
   - Se connecter avec un compte **`ADMIN`**.
   - Dans la barre latérale, cliquer sur **Utilisateurs**.
   - Cliquer sur le bouton **« + Nouvel Utilisateur »**.
   - Remplir le formulaire :
     - Nom : `Ben Ali` | Prénom : `Ahmed` | Email : `ahmed.benali@omoda-jaecoo.tn`
     - Rôle : `UTILISATEUR` | Statut : `Actif`
   - Cliquer sur **« Enregistrer »**.
2. **Attribution du matériel en stock :**
   - Se rendre sur la page **Matériels**.
   - Utiliser le filtre pour afficher les matériels ayant le statut **« En stock »**.
   - Sélectionner l'ordinateur portable disponible (ex: *Dell Latitude 5540 - SN: DL-884920*).
   - Cliquer sur le bouton **Modifier / Fiche**.
   - Dans le champ **Bénéficiaire**, sélectionner `Ahmed Ben Ali`.
   - Dans le champ **Statut**, basculer de `En stock` vers **`En service`**.
   - Renseigner la date d'affectation et le bureau (*Showroom - Bureau Commercial 2*).
   - Valider en cliquant sur **« Mettre à jour »**.
3. **Résultat :** Le collaborateur peut se connecter, son profil est opérationnel, et l'ordinateur apparaît immédiatement sur sa fiche de matériel attribué.

---

# 4. Scénario 2 : Déclaration & Traitement d'un ticket de support (SLA)

### Objectif
Un utilisateur rencontre un problème d'écran bleu. Il déclare un incident qui est pris en charge et résolu par le technicien IT.

### Étapes Pas-à-Pas dans l'Application :
1. **Déclaration par l'utilisateur :**
   - L'utilisateur se connecte avec ses identifiants.
   - Il se rend sur l'onglet **Réclamations** et clique sur **« + Nouvelle Réclamation »**.
   - Il sélectionne son PC portable dans la liste déroulante.
   - Titre : `Écran bleu au démarrage (BSOD)`.
   - Priorité : `Haute`.
   - Description : `L'ordinateur redémarre en boucle avec code d'erreur MEMORY_MANAGEMENT`.
   - Il clique sur **« Soumettre le ticket »**.
2. **Prise en charge par le Responsable IT :**
   - Le technicien se connecte et observe l'alerte sur son **Dashboard**.
   - Il ouvre la page **Réclamations**, filtre par statut `Ouverte`.
   - Il clique sur le ticket `BSOD` $\rightarrow$ clique sur **« Prendre en charge »**.
   - Le statut passe automatiquement à **`En cours`**, et le technicien est enregistré comme référent.
3. **Résolution de l'incident :**
   - Après remplacement de la barrette de RAM défectueuse, le technicien ouvre la modale de résolution.
   - Il saisit la note de clôture : `Remplacement barrette RAM 8Go DDR4. Tests mémoires validés avec succès`.
   - Il clique sur **« Clôturer comme Résolue »**.
4. **Résultat :** Le ticket passe à l'état **`Résolue`**, la date de fin est horodatée, le demandeur reçoit la notification et l'historique complet est archivé.

---

# 5. Scénario 3 : Réception d'une commande fournisseur & Enregistrement de facture

### Objectif
Enregistrer une livraison de 5 écrans 27 pouces reçus du fournisseur Dell Tunisie.

### Étapes Pas-à-Pas dans l'Application :
1. **Création de la facture d'achat :**
   - L'administrateur ou technicien ouvre la page **Factures**.
   - Il clique sur **« + Nouvelle Facture »**.
   - Numéro de facture : `FACT-DELL-2026-089`.
   - Fournisseur : Sélectionner `Dell Tunisie`.
   - Montant HT : `3 500 TND` | TVA : `19%` | Date d'acquisition : `Aujourd'hui`.
   - Garantie : `36 Mois`.
   - Cliquer sur **« Enregistrer »**.
2. **Ajout des équipements rattachés :**
   - Se rendre sur **Matériels** $\rightarrow$ **« + Nouveau Matériel »**.
   - Désignation : `Écran Dell UltraSharp 27" 4K`.
   - Catégorie : `Écran` | Statut : `En stock`.
   - Numéro de série : `SN-DELL-U27-001`.
   - Facture rattachée : Sélectionner `FACT-DELL-2026-089`.
   - Emplacement : `Magasin IT / Stock Central`.
   - Valider l'ajout.
3. **Résultat :** Le matériel est entré en stock, la valeur du parc est automatiquement recalculée dans le Tableau de Bord, et la garantie constructeur est surveillée.

---

# 6. Scénario 4 : Défaillance irréparable & Déclassement / Réforme de matériel

### Objectif
Mettre au rebut une imprimante réseau ancienne dont la carte mère est hors d'usage.

### Étapes Pas-à-Pas dans l'Application :
1. Se rendre sur la page **Matériels**.
2. Rechercher l'imprimante (ex: *HP LaserJet Pro M404n*).
3. Cliquer sur **Modifier**.
4. Passer le statut à **`Hors service`** (ou *Réformé*).
5. Retirer l'affectation utilisateur et basculer l'emplacement vers `Zone Rebut / Dépôt Recyclage`.
6. Ajouter un commentaire : `Carte mère grillée après surtension. Réparation économiquement non viable`.
7. Valider les modifications.
8. **Résultat :** L'équipement est retiré du taux de disponibilité opérationnelle sur le Dashboard, conservé dans l'historique d'audit, et libéré de toute responsabilité collaborateur.

---

# 7. Scénario 5 : Dépannage à distance & Visioconférence WebRTC

### Objectif
Assister en direct un utilisateur du Showroom ayant un problème d'imprimante thermique de facturation.

### Étapes Pas-à-Pas dans l'Application :
1. Le technicien IT ouvre la page **Messages**.
2. Dans la colonne de gauche, il sélectionne l'utilisateur concerné (qui affiche le voyant vert **« En ligne »**).
3. Il clique sur l'icône **Caméra / Visioconférence** en haut à droite du fil de discussion.
4. Une modale d'appel s'ouvre, émettant une notification sonore chez le collaborateur.
5. Le collaborateur clique sur **« Accepter l'appel »**.
6. Le flux vidéo et audio bidirectionnel s'établit instantanément via WebRTC.
7. L'utilisateur peut orienter sa caméra ou partager son écran pour montrer le message d'erreur.
8. Une fois le problème résolu, l'un des deux participants clique sur **« Raccrocher »**.

---

# 8. Scénario 6 : Récupération de mot de passe par code de sécurité OTP

### Objectif
Permettre à un collaborateur ayant oublié son mot de passe de réinitialiser son accès en toute autonomie.

### Étapes Pas-à-Pas :
1. Sur l'écran de connexion (`/`), cliquer sur le lien **« Mot de passe oublié ? »**.
2. Saisir l'adresse email professionnelle (ex: `user@omoda-jaecoo.tn`).
3. Cliquer sur **« Envoyer le code OTP »**.
4. Le système génère un code sécurisé à 6 chiffres valable 10 minutes et l'expédie par email (SMTP).
5. L'utilisateur consulte sa boîte de réception, relève le code (ex: `749201`).
6. Sur la page de vérification, il saisit le code OTP reçu ainsi que son nouveau mot de passe (respectant la politique de sécurité : 8+ caractères, majuscule, minuscule, chiffre, symbole).
7. Il clique sur **« Réinitialiser mon mot de passe »**.
8. **Résultat :** Le mot de passe est mis à jour en base sous forme de hash `bcrypt`, et l'utilisateur est redirigé vers l'écran de connexion.

---

# 9. Scénario 7 : Sécurité de session & Gestion de l'inactivité

### Objectif
Sécuriser les postes de travail non verrouillés par les utilisateurs dans les bureaux ou showrooms.

### Fonctionnement :
1. L'application écoute les interactions utilisateur (clics, frappes clavier, mouvements de souris).
2. Si aucune action n'est détectée pendant la durée configurée (ex: 15 minutes) :
   - Une **Modale d'avertissement d'expiration de session** s'affiche à l'écran avec un compte à rebours de 60 secondes.
3. Deux issues sont possibles :
   - **L'utilisateur est présent :** Il clique sur **« Prolonger la session »** $\rightarrow$ le token d'accès est rafraîchi via l'API, et l'interface reste active.
   - **L'utilisateur est absent :** À la fin du compte à rebours, la session est automatiquement révoquée côté serveur, le stockage local est purgé, et la modale **« Session expirée »** invite l'utilisateur à se ré-authentifier.
