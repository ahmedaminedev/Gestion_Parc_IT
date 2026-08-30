import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

// Strictly extract all variables directly from process.env (as defined in Backend/.env)
export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  JWT_SECRET: (process.env.JWT_SECRET || 'Fv3CtZczgQrtSMgeXGdUyXSnwH6hkAGagMBXRpcsh5z6').trim(),
  REFRESH_TOKEN_SECRET: (process.env.REFRESH_TOKEN_SECRET || 'oDjVwE7MPouzPbGXOkJvAZC6t16BaIM11ZD0SrygOlP').trim(),
  ACCESS_TOKEN_EXPIRY: (process.env.ACCESS_TOKEN_EXPIRY || '20m').trim(),
  REFRESH_BEFORE_EXPIRY: (process.env.REFRESH_BEFORE_EXPIRY || '1m').trim(),
  REFRESH_TOKEN_EXPIRY: (process.env.REFRESH_TOKEN_EXPIRY || '1d').trim(),
  SESSION_WARNING_BEFORE_EXPIRY: (process.env.SESSION_WARNING_BEFORE_EXPIRY || '1m').trim(),
  MAX_SESSION_DURATION: (process.env.MAX_SESSION_DURATION || '5d').trim(),
};

// Validate that required variables exist in .env
if (!env.JWT_SECRET || !env.REFRESH_TOKEN_SECRET) {
  console.warn('⚠️ [ENV] Attention: JWT_SECRET ou REFRESH_TOKEN_SECRET non configuré dans Backend/.env !');
}

if (!env.MONGODB_URI) {
  console.warn('⚠️ [ENV] Attention: MONGODB_URI non configuré dans Backend/.env !');
}

// Millisecond values calculated directly from .env variables
export const ACCESS_EXPIRY_MS = parseDurationToMs(env.ACCESS_TOKEN_EXPIRY);
export const REFRESH_BEFORE_EXPIRY_MS = parseDurationToMs(env.REFRESH_BEFORE_EXPIRY);
export const REFRESH_EXPIRY_MS = parseDurationToMs(env.REFRESH_TOKEN_EXPIRY);
export const SESSION_WARNING_BEFORE_EXPIRY_MS = parseDurationToMs(env.SESSION_WARNING_BEFORE_EXPIRY);
export const MAX_SESSION_MS = parseDurationToMs(env.MAX_SESSION_DURATION);

