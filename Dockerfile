# escape=`
# ====================================================================
# Dockerfile pour Windows Server 2025
# Base officielle Microsoft : Windows Server Core LTSC 2025
# Node.js 22 installé directement dans le conteneur
# Application Full-Stack : React + Vite + Express
# ====================================================================

FROM mcr.microsoft.com/windows/servercore:ltsc2025

SHELL ["powershell", "-ExecutionPolicy", "Bypass", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ARG NODE_VERSION=22.14.0
ENV NODE_VERSION=${NODE_VERSION}

# 1. Copier et exécuter le script d'installation de Node.js
COPY install-node.ps1 C:\install-node.ps1
RUN & C:\install-node.ps1 ; Remove-Item -Force C:\install-node.ps1

# 2. Configurer le PATH système pour Node.js et npm
ENV PATH="C:\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\"

# 3. Vérifier que Node.js et npm répondent
RUN node -v ; npm -v

# 4. Répertoire de travail
WORKDIR C:\app

# 5. Copier les définitions de dépendances
COPY package.json ./

# 6. Installer les dépendances
RUN npm install --no-audit --no-fund

# 7. Copier le reste du projet
COPY . .

# 8. Construire l'application de production
RUN npm run build

# 9. Variables d'environnement
ENV NODE_ENV=production `
    PORT=3000

EXPOSE 3000

# 10. Démarrer l'application Express compilée
CMD ["node", "dist/server.cjs"]
