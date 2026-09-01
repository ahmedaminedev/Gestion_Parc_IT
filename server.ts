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

import { connectDB } from './Backend/config/db';
import { seedInitialDatabase } from './Backend/controllers/authController';
import authRoutes from './Backend/routes/authRoutes';
import apiRoutes from './Backend/routes/apiRoutes';
import messageRoutes from './Backend/routes/messageRoutes';
import { setupSocketIO } from './Backend/services/socketService';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Compression middleware (Gzip / Deflate for all API and static responses)
  app.use(compression({
    level: 6,
    threshold: 1024,
  }) as any);

  // Initialize Socket.io
  const io = setupSocketIO(server);

  // Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Security headers for Lighthouse & OWASP Best Practices
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Attach io to request for route handlers if needed
  app.use((req: any, _res, next) => {
    req.io = io;
    next();
  });

  // Static uploads directory serving (profile photos, attachments)
  const backendUploadsPath = path.join(process.cwd(), 'Backend', 'uploads');
  const rootUploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(backendUploadsPath)) {
    fs.mkdirSync(backendUploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(backendUploadsPath));
  app.use('/uploads', express.static(rootUploadsPath));

  // API Routes
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

  // Health check route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'Gestion_Parc_IT_2', port: PORT });
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

