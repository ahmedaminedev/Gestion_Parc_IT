import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Dynamic directory resolution compatible with both CommonJS (esbuild bundle) and ES modules
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// Look for .env in Backend directory, current directory, or parent directory
const possibleEnvPaths = [
  path.join(process.cwd(), 'Backend', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(currentDir, '..', '.env'),
  path.join(currentDir, '.env'),
];

let loadedPath = '';
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedPath = envPath;
    break;
  }
}
if (!loadedPath) {
  // Fallback default dotenv load
  dotenv.config();
}

/**
 * Magasin de clés cryptographiques interne (Internal Keystore)
 * Génère et stocke de façon sécurisée des clés de 512 bits à haute entropie
 * HORS du fichier d'environnement .env (non exposé en clair).
 */
function getOrGenerateInternalKey(keyName: 'JWT_SECRET' | 'REFRESH_TOKEN_SECRET'): string {
  // Si un coffre-fort de secrets d'entreprise (Vault/K8s/Cloud Secret Manager) fournit déjà la variable :
  if (process.env[keyName] && process.env[keyName]!.trim().length >= 32) {
    return process.env[keyName]!.trim();
  }

  const keystoreDir = path.join(process.cwd(), 'Backend', 'config');
  const keystoreFile = path.join(keystoreDir, '.security_keystore.json');

  try {
    if (fs.existsSync(keystoreFile)) {
      const content = fs.readFileSync(keystoreFile, 'utf8');
      const store = JSON.parse(content);
      if (store && store[keyName] && typeof store[keyName] === 'string' && store[keyName].length >= 32) {
        return store[keyName];
      }
    }
  } catch (_) {
    // Si lecture corrompue, régénération automatique
  }

  // Génération d'une clé cryptographique 512 bits ultra-sécurisée
  const generatedSecret = crypto.randomBytes(64).toString('hex');

  try {
    if (!fs.existsSync(keystoreDir)) {
      fs.mkdirSync(keystoreDir, { recursive: true });
    }
    let store: Record<string, string> = {};
    if (fs.existsSync(keystoreFile)) {
      try {
        store = JSON.parse(fs.readFileSync(keystoreFile, 'utf8')) || {};
      } catch (_) {}
    }
    store[keyName] = generatedSecret;
    fs.writeFileSync(keystoreFile, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch (err) {
    // En cas de système de fichier en lecture seule, la clé vit de manière sécurisée en mémoire
  }

  return generatedSecret;
}

// Initialisation des secrets cryptographiques sans dépendance au fichier .env
const resolvedJwtSecret = getOrGenerateInternalKey('JWT_SECRET');
const resolvedRefreshSecret = getOrGenerateInternalKey('REFRESH_TOKEN_SECRET');

// Helper: parse human-readable time strings like '15m', '7d', '2m', '30d', '60s' to milliseconds
export function parseDurationToMs(durationStr: string): number {
  if (!durationStr) return 0;
  const match = durationStr.trim().match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// Variables d'environnement applicatives
export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  JWT_SECRET: resolvedJwtSecret,
  REFRESH_TOKEN_SECRET: resolvedRefreshSecret,
  ACCESS_TOKEN_EXPIRY: (process.env.ACCESS_TOKEN_EXPIRY || '20m').trim(),
  REFRESH_BEFORE_EXPIRY: (process.env.REFRESH_BEFORE_EXPIRY || '1m').trim(),
  REFRESH_TOKEN_EXPIRY: (process.env.REFRESH_TOKEN_EXPIRY || '1d').trim(),
  SESSION_WARNING_BEFORE_EXPIRY: (process.env.SESSION_WARNING_BEFORE_EXPIRY || '1m').trim(),
  MAX_SESSION_DURATION: (process.env.MAX_SESSION_DURATION || '5d').trim(),
};

if (!env.MONGODB_URI) {
  console.warn('⚠️ [ENV] Attention: MONGODB_URI non configuré dans Backend/.env !');
}

// Millisecond values calculated directly from .env variables
export const ACCESS_EXPIRY_MS = parseDurationToMs(env.ACCESS_TOKEN_EXPIRY);
export const REFRESH_BEFORE_EXPIRY_MS = parseDurationToMs(env.REFRESH_BEFORE_EXPIRY);
export const REFRESH_EXPIRY_MS = parseDurationToMs(env.REFRESH_TOKEN_EXPIRY);
export const SESSION_WARNING_BEFORE_EXPIRY_MS = parseDurationToMs(env.SESSION_WARNING_BEFORE_EXPIRY);
export const MAX_SESSION_MS = parseDurationToMs(env.MAX_SESSION_DURATION);

