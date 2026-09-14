import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';

// Load backend environment variables
dotenv.config({ path: path.join(process.cwd(), 'Backend', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { connectDB, isDbConnected } from './Backend/config/db';
import mongoose from 'mongoose';
import { seedInitialDatabase } from './Backend/controllers/authController';
import authRoutes from './Backend/routes/authRoutes';
import apiRoutes from './Backend/routes/apiRoutes';
import messageRoutes from './Backend/routes/messageRoutes';
import { setupSocketIO } from './Backend/services/socketService';
import { 
  secureCorsOptions, 
  secureHelmet, 
  noSqlSanitizer, 
  apiGeneralRateLimiter 
} from './Backend/middleware/security';

async function startServer() {
  const app = express();
  // Active la reconnaissance des proxys inverses (Cloud Run, Nginx, Windows Server IIS)
  app.set('trust proxy', 1);

  const server = http.createServer(app);
  const PORT = 3000;

  // Compression middleware (Gzip / Deflate for all API and static responses)
  app.use(compression({
    level: 6,
    threshold: 1024,
  }) as any);

  // Initialize Socket.io
  const io = setupSocketIO(server);

  // 1. En-têtes HTTP de sécurité stricts (OWASP / Helmet)
  app.use(secureHelmet);

  // 2. CORS restreint aux adresses internes, LAN et domaines de l'entreprise
  app.use(cors(secureCorsOptions));

  // 3. Limitation de payload (protection anti-saturation mémoire)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // 4. Filtre Anti-Injection NoSQL récursif
  app.use(noSqlSanitizer);

  // Attach io to request for route handlers if needed
  app.use((req: any, _res, next) => {
    req.io = io;
    next();
  });

  // Static uploads directory serving (avec protection MIME anti-sniffing)
  const backendUploadsPath = path.join(process.cwd(), 'Backend', 'uploads');
  const rootUploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(backendUploadsPath)) {
    fs.mkdirSync(backendUploadsPath, { recursive: true });
  }
  const secureStaticHeaders = (_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  };
  app.use('/uploads', secureStaticHeaders, express.static(backendUploadsPath));
  app.use('/uploads', secureStaticHeaders, express.static(rootUploadsPath));

  // Health check route (exempt de rate limit pour monitoring de l'hyperviseur)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: 'Gestion_Parc_IT_2',
      port: PORT,
      dbConnected: isDbConnected(),
      mongooseState: mongoose.connection.readyState
    });
  });

  // 5. API Routes avec limitation de débit anti-DDoS applicatif
  app.use('/api', apiGeneralRateLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api', apiRoutes);

  // Database error fallback middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.name === 'MongooseError' || err?.name === 'MongoNetworkError' || err?.message?.includes('buffering timed out')) {
      console.warn('[Database] Database offline or buffering error — returning graceful response:', err?.message);
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
  });

  // Vite middleware in dev / static serve in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Long-term immutable caching for versioned assets
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));
    // Static assets in root dist
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 SERVEUR FULL-STACK OMODA & JAECOO DÉMARRÉ !`);
    console.log(`🌐 Frontend React (Vite): http://localhost:${PORT}`);
    console.log(`📡 API Backend Express:   http://localhost:${PORT}/api`);
    console.log(`💬 Socket.io Realtime:    Connecté & Actif`);
    console.log(`====================================================`);
  });

  // Connect Database & Seed initial users asynchronously (non-blocking)
  connectDB()
    .then(() => seedInitialDatabase())
    .catch((err) => {
      console.warn('⚠️ Avertissement lors de la connexion initiale à la DB:', err?.message || err);
    });
}

startServer();

