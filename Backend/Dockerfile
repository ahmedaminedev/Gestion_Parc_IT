# ====================================================================
# Dockerfile Standalone Backend pour Windows Server 2025 (OSType: windows)
# API Express + Node.js + Mongoose + Socket.io
# ====================================================================

FROM node:22-windowsservercore-ltsc2022 AS runner

SHELL ["cmd", "/S", "/C"]

WORKDIR C:\app

ENV NODE_ENV=production \
    PORT=5000

# Copier les fichiers de dépendances du Backend
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm install --omit=dev --prefer-offline --no-audit

# Copier le code source du Backend
COPY . .

# Créer le répertoire de téléversement
RUN mkdir C:\app\uploads

EXPOSE 5000

CMD ["npx", "tsx", "server.ts"]
