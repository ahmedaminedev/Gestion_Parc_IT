# ====================================================================
# Dockerfile pour Windows Server 2025 (OSType: windows)
# Application Full-Stack : React 19 + Express + Node.js (Vite 6 / esbuild)
# ====================================================================

# --------------------------------------------------------------------
# Étape 1 : Build du Frontend React et du Backend Express
# --------------------------------------------------------------------
FROM node:22-windowsservercore-ltsc2022 AS builder

SHELL ["cmd", "/S", "/C"]

WORKDIR C:\app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer toutes les dépendances (y compris les devDependencies pour le build)
RUN npm ci --prefer-offline --no-audit

# Copier le code source complet de l'application
COPY . .

# Compiler le Frontend React (Vite) et le Backend Express (esbuild -> dist/server.cjs)
RUN npm run build

# --------------------------------------------------------------------
# Étape 2 : Image d'exécution de production (Production Runtime)
# --------------------------------------------------------------------
FROM node:22-windowsservercore-ltsc2022 AS runner

SHELL ["cmd", "/S", "/C"]

WORKDIR C:\app

# Définir les variables d'environnement de production
ENV NODE_ENV=production \
    PORT=3000

# Copier les descripteurs de paquets
COPY package.json package-lock.json* ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copier les artefacts compilés depuis l'étape de build
COPY --from=builder C:\app\dist .\dist
COPY --from=builder C:\app\public .\public
COPY --from=builder C:\app\metadata.json .\metadata.json

# Créer les dossiers de stockage pour les téléversements (uploads)
RUN mkdir C:\app\uploads C:\app\Backend\uploads

# Exposer le port de l'application full-stack
EXPOSE 3000

# Commande de démarrage du serveur
CMD ["node", "dist/server.cjs"]
