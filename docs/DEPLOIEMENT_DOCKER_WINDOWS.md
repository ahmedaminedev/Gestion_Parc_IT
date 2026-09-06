# Guide de Déploiement Docker sur Windows Server 2025 (OSType: windows)

Ce guide décrit la procédure pas à pas pour construire et exécuter l'application **OMODA & JAECOO - Gestion de Parc Informatique & Support IT** sur un serveur **Windows Server 2025** utilisant des conteneurs Windows natifs (`OSType: windows`).

---

## 1. Architecture du Déploiement

- **Système d'exploitation hôte** : Windows Server 2025 (ou Windows Server 2022)
- **Moteur de conteneurs** : Docker Engine en mode Windows Containers (`OSType: windows`)
- **Image de base** : `node:22-windowsservercore-ltsc2022` (ou `node:20-windowsservercore-ltsc2022`)
- **Type d'application** : Application Full-Stack unifiée
  - **Frontend** : React 19 + Vite 6 + Tailwind CSS v4 (compilé dans `/dist`)
  - **Backend** : Node.js 22 + Express 4 + Socket.io + Mongoose (compilé dans `/dist/server.cjs`)
  - **Port exposé** : `3000` (sert à la fois l'API `/api`, les WebSockets `/socket.io`, les uploads `/uploads` et l'application React)

---

## 2. Fichiers Docker Créés

| Fichier | Emplacement | Rôle |
| :--- | :--- | :--- |
| **`Dockerfile`** | Racine `/Dockerfile` | Image multi-stage pour Windows Containers (`node:22-windowsservercore-ltsc2022`) compilant React + Express |
| **`docker-compose.yml`** | Racine `/docker-compose.yml` | Fichier d'orchestration Windows avec variables d'environnement et volumes persistants |
| **`.dockerignore`** | Racine `/.dockerignore` | Exclusion des dossiers volumineux (`node_modules`, `tests`, `coverage`) |
| **`Backend/Dockerfile`** | `/Backend/Dockerfile` | Dockerfile pour exécuter le backend de manière isolée si nécessaire (port 5000) |
| **`Backend/.dockerignore`** | `/Backend/.dockerignore` | Exclusion spécifique au backend |

---

## 3. Commandes de Déploiement sous PowerShell (Windows Server 2025)

### Option A : Déploiement avec Docker Compose (Recommandé)

1. Ouvrez **PowerShell en tant qu'Administrateur** sur votre serveur Windows Server 2025.
2. Placez-vous dans le répertoire du projet :
   ```powershell
   cd C:\Chemin\Vers\Gestion_Parc_IT
   ```
3. Construisez et démarrez le conteneur en arrière-plan :
   ```powershell
   docker compose up -d --build
   ```
4. Vérifiez que le conteneur fonctionne :
   ```powershell
   docker compose ps
   ```
5. Consultez les journaux d'exécution en temps réel :
   ```powershell
   docker compose logs -f
   ```

---

### Option B : Déploiement avec `docker build` et `docker run`

1. **Construire l'image Docker Windows** :
   ```powershell
   docker build -t omoda-jaecoo-parc-it:latest -f Dockerfile .
   ```

2. **Démarrer le conteneur** :
   ```powershell
   docker run -d `
     --name parc-it-app `
     --restart unless-stopped `
     -p 3000:3000 `
     -e NODE_ENV=production `
     -e PORT=3000 `
     -e MONGODB_URI="mongodb://host.docker.internal:27017/Gestion_Parc_IT_2" `
     -e JWT_SECRET="VotreCleSecreteJWT_Securisee_2025" `
     -v C:\docker_data\parc_it_uploads:C:\app\uploads `
     omoda-jaecoo-parc-it:latest
   ```

3. **Vérifier l'état du conteneur** :
   ```powershell
   docker ps
   ```

---

## 4. Accès à l'Application

Une fois le conteneur démarré :
- **Sur le serveur localement** : `http://localhost:3000`
- **Depuis les postes clients du réseau local** : `http://<IP_DU_SERVEUR_WINDOWS>:3000`
- **Vérification de santé de l'API** : `http://<IP_DU_SERVEUR_WINDOWS>:3000/api/health`

---

## 5. Configuration du Pare-feu Windows Server 2025

Pour autoriser les utilisateurs du réseau à accéder à l'application sur le port 3000, exécutez la commande PowerShell suivante :

```powershell
New-NetFirewallRule -DisplayName "OMODA JAECOO Parc IT (Port 3000)" `
  -Direction Inbound `
  -LocalPort 3000 `
  -Protocol TCP `
  -Action Allow
```
