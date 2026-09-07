# escape=`
# ====================================================================
# Dockerfile Ultra-Rapide pour Windows Server 2025
# L'application est déjà compilée à l'étape Jenkins (dist/ et node_modules)
# Aucune recompilation ni installation lourde dans le conteneur !
# ====================================================================

FROM mcr.microsoft.com/windows/servercore:ltsc2025

SHELL ["powershell", "-ExecutionPolicy", "Bypass", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ARG NODE_VERSION=22.14.0
ENV NODE_VERSION=${NODE_VERSION}

# 1. Copier et installer Node.js 22
COPY install-node.ps1 C:\install-node.ps1
RUN & C:\install-node.ps1 ; Remove-Item -Force C:\install-node.ps1

# 2. Configurer le PATH système
ENV PATH="C:\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\"

# 3. Répertoire de l'application
WORKDIR C:\app

# 4. Copier les fichiers de l'application (bundle dist/ + node_modules de production)
COPY package.json ./
COPY dist ./dist
COPY Backend ./Backend
COPY public ./public
COPY index.html ./
COPY node_modules ./node_modules

# 5. Variables d'environnement de production
ENV NODE_ENV=production `
    PORT=3000

EXPOSE 3000

# 6. Démarrage instantané
CMD ["node", "dist/server.cjs"]
