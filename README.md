# OMODA & JAECOO — Système de Gestion de Parc Informatique & Support IT

Application d'entreprise full-stack dédiée à la gestion centralisée du parc matériel informatique, au suivi budgétaire et au helpdesk technique pour **OMODA & JAECOO**.

---

## 🌟 Fonctionnalités Principales

### 1. 📊 Tableau de Bord & Indicateurs DSI
- **Suivi financier** : Calcul de la valeur globale HT du parc en service.
- **Indicateurs de performance (KPIs)** : Taux de disponibilité opérationnelle, MTTR (*Mean Time To Resolution*).
- **Alertes préventives** : Notifications pour garanties expirant sous 60 jours, matériels en panne et tickets urgents.
- **Graphiques interactifs** : Répartition par groupe de matériel, score de fiabilité des fournisseurs, statut des factures.

### 2. 🎫 Gestion des Réclamations & Helpdesk IT
- **Déclaration simplifiée en 2 étapes** : Ciblage par équipement affecté ou catégorie générale, suivi du statut et priorité.
- **Workflow DSI complet** : Assignation à un technicien référent, suivi des engagements de service (SLA) avec date d'échéance.
- **Historique & Traçabilité** : Fil de discussion chronologique et journal d'audit complet de chaque intervention.

### 3. 💬 Messagerie Temps Réel & Visioconférence
- **Chat instantané (WebSockets / Socket.io)** : Échanges fluides, partage de captures d'écran, photos et fichiers joints.
- **Assistance à distance (WebRTC)** : Appels audio/vidéo avec capture d'écran intégrée pour diagnostic rapide.
- **Cloisonnement strict** : Les collaborateurs contactent directement le support informatique sans risque de pollution des canaux.

### 4. 💻 Gestion des Équipements & Inventaire
- **Fiches matériels détaillées** : Numéro de série unique, code-barres, référence ERP (`ref_immo`), caractéristiques techniques.
- **Contrôles d'intégrité métier** : Validation stricte des statuts (*En service*, *En stock*, *En réparation*, *Hors service*), prévention des doublons.
- **Gestion des départs** : Blocage de la désactivation d'un utilisateur tant que du matériel lui est attribué.

### 5. 💰 Factures, Fournisseurs & Emplacements
- **Gestion budgétaire** : Liaison directe matériel-facture-fournisseur avec suivi des montants HT/TTC et dates d'achat.
- **Gestion multi-sites** : Cartographie des bâtiments, étages et bureaux d'affectation.

---

## 🛠️ Stack Technologique

- **Frontend** : React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion
- **Backend** : Node.js, Express, Socket.io (Temps réel), WebRTC (Visio & Audio)
- **Base de Données & ORM** : MongoDB / Mongoose (avec fallback MongoDB Memory Server pour exécution instantanée)
- **Sécurité & Authentification** : JWT (JSON Web Tokens), Cookies HTTP-only, Hachage BCrypt, RBAC (*Role-Based Access Control*)
- **Notifications & Mail** : Nodemailer (Service SMTP sécurisé avec vérification en direct et codes OTP)

---

## 🚀 Installation & Lancement en Local

### Prérequis
- **Node.js** (version 18 ou supérieure)
- **npm** (ou yarn / bun)

### 1. Cloner le dépôt et installer les dépendances
```bash
# Installation des dépendances racine et client
npm install
```

### 2. Configuration des Variables d'Environnement
Créez un fichier `.env` à la racine ou dans le dossier `Backend` selon vos besoins (se référer aux modèles `.env.example`).

```bash
# Exemple de configuration standard
PORT=3000
MONGODB_URI=mongodb://localhost:27017/Gestion_Parc_IT_2
JWT_SECRET=votre_cle_secrete_jwt
```

### 3. Lancer l'Application en Mode Développement
```bash
npm run dev
```

L'application sera accessible sur : **`http://localhost:3000`**

### 4. Build de Production
```bash
npm run build
npm start
```

---

## 👥 Rôles & Comptes de Démonstration

| Identifiant | Rôle | Périmètre d'Accès |
| :--- | :--- | :--- |
| `admin@omoda-jaecoo.tn` | **Responsable IT / DSI** | Accès complet : Dashboard, Matériels, Utilisateurs, Factures, Fournisseurs, Helpdesk, Paramètres |
| `employe@omoda-jaecoo.tn` | **Collaborateur** | Espace Collaborateur : Mes Équipements, Déclaration d'Incident en 2 clics, Support direct |

---

## 📄 Licence
Propriété exclusive de **OMODA & JAECOO Tunisie**. Tous droits réservés.
