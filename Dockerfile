# escape=`
# ====================================================================
# Dockerfile pour Windows Server 2025
# Base officielle Microsoft : Windows Server Core LTSC 2025
# Node.js 22 installé directement dans le conteneur
# Application Full-Stack : React + Vite + Express
# ====================================================================

FROM mcr.microsoft.com/windows/servercore:ltsc2025

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# Version de Node.js
ARG NODE_VERSION=22.14.0
ENV NODE_VERSION=${NODE_VERSION}

# 1. Installer Node.js 22 dans le conteneur
RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; `
    $version = $env:NODE_VERSION; `
    Write-Host ("Telechargement de Node.js v{0} (Windows x64)..." -f $version); `
    Invoke-WebRequest -Uri ("https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip" -f $version) -OutFile "C:\node.zip"; `
    Write-Host "Extraction de archive..."; `
    Expand-Archive -Path "C:\node.zip" -DestinationPath "C:\"; `
    Rename-Item -Path ("C:\node-v{0}-win-x64" -f $version) -NewName "C:\nodejs"; `
    Remove-Item -Force "C:\node.zip"

# 2. Ajouter Node.js au PATH
ENV PATH="C:\nodejs;C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\"

# 3. Vérifier Node.js et npm
RUN node -v ; npm -v

# 4. Répertoire de l'application
WORKDIR C:\app

# 5. Copier package.json
COPY package.json ./

# 6. Installer les dépendances
RUN npm install --no-audit --no-fund

# 7. Copier le reste du projet
COPY . .

# 8. Construire l'application
RUN npm run build

# 9. Variables d'environnement de production
ENV NODE_ENV=production `
    PORT=3000

# 10. Port de l'application
EXPOSE 3000

# 11. Démarrer l'application
CMD ["node", "dist/server.cjs"]
