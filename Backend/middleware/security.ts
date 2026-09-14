import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { CorsOptions } from 'cors';

/**
 * 1. CORS Sécurisé : restreint aux seules adresses internes, réseau local (LAN),
 * localhost et domaines autorisés de l'entreprise.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/\[::1\](:\d+)?$/,
  // Plages IP privées RFC 1918 (Réseaux locaux d'entreprise)
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  // Noms d'hôtes internes d'entreprise
  /^https?:\/\/[a-zA-Z0-9_-]+\.local(:\d+)?$/,
  /^https?:\/\/[a-zA-Z0-9_-]+\.lan(:\d+)?$/,
  /^https?:\/\/[a-zA-Z0-9_-]+\.corp(:\d+)?$/,
  /^https?:\/\/[a-zA-Z0-9_-]+\.internal(:\d+)?$/,
  /^https?:\/\/(.+\.)?omoda\.tn(:\d+)?$/,
  /^https?:\/\/(.+\.)?jaecoo\.tn(:\d+)?$/,
  // Domaines de prévisualisation Google Cloud Run / AI Studio (supporte les sous-domaines multi-niveaux régionaux ex: .europe-west2.run.app)
  /^https?:\/\/([a-zA-Z0-9_-]+\.)*run\.app(:\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9_-]+\.)*web\.app(:\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9_-]+\.)*firebaseapp\.com(:\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9_-]+\.)*google\.com(:\d+)?$/,
];

export const secureCorsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Autorise les requêtes sans origine (requêtes internes directes, outils système, curl, proxy inverse)
    if (!origin) {
      return callback(null, true);
    }

    // Vérifie les origines configurées explicitement via variables d'environnement
    const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    if (extraOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Vérifie les modèles d'adresses internes et locales autorisées
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[SECURITY 🛡️] Origine CORS non autorisée rejetée: ${origin}`);
    return callback(new Error(`Accès CORS refusé : l'origine "${origin}" n'est pas autorisée par la politique de sécurité interne.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400, // 24 heures de cache pré-vol CORS
};

/**
 * 2. Anti-Brute Force (Authentification) :
 * Limite à 5 tentatives de connexion infructueuses par tranche de 15 minutes par IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 tentatives échouées max
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Les connexions réussies ne sont pas pénalisées
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    error: "Trop de tentatives de connexion échouées. Par mesure de sécurité, l'accès depuis cette adresse est temporairement restreint pendant 15 minutes.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    retryAfterMinutes: 15,
  },
});

/**
 * 3. Limiteur Général API (Anti-DDoS applicatif) :
 * Limite à 300 requêtes par minute par IP pour l'ensemble des routes API.
 */
export const apiGeneralRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    error: "Trop de requêtes détectées depuis cette adresse. Veuillez patienter quelques instants.",
    code: "API_RATE_LIMIT_EXCEEDED",
  },
});

/**
 * 4. Filtre Anti-Injection NoSQL (Sanitizer récursif) :
 * Détecte et élimine automatiquement tous les opérateurs MongoDB commençant par '$'
 * ou contenant des '.' dans req.body, req.query et req.params.
 */
function sanitizeNoSqlData(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeNoSqlData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`[SECURITY 🛡️] Tentative d'injection NoSQL bloquée : clé "${key}" neutralisée.`);
      continue; // Supprime l'opérateur malveillant
    }
    sanitized[key] = sanitizeNoSqlData(value);
  }
  return sanitized;
}

export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSqlData(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSqlData(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSqlData(req.params);
  }
  next();
}

/**
 * 5. En-têtes HTTP de Sécurité Complète (Helmet standard OWASP)
 */
export const secureHelmet = helmet({
  contentSecurityPolicy: false, // Préserve le fonctionnement SPA Vite & styles dynamiques
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permet le chargement des pièces jointes et avatars
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  frameguard: false, // Permet l'affichage dans la console de gestion interne
  hidePoweredBy: true, // Masque le header X-Powered-By: Express
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 15552000, // 180 jours
    includeSubDomains: true,
  },
});
