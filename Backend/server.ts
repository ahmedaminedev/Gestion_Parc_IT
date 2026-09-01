import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDB } from './config/db';
import { seedInitialDatabase } from './controllers/authController';
import authRoutes from './routes/authRoutes';
import apiRoutes from './routes/apiRoutes';
import messageRoutes from './routes/messageRoutes';
import { setupSocketIO } from './services/socketService';

const app = express();
const server = http.createServer(app);
const PORT = env.PORT || 5000;

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

// Attach io to request
app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

// Static file serving for uploads (profile photos, attachments)
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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Backend Express API',
    socket: 'Active',
  });
});

// Root information endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Backend API Gestion de Parc IT (OMODA & JAECOO)',
    status: 'Running',
    port: PORT,
    endpoints: {
      auth: '/api/auth/login',
      users: '/api/users',
      materiels: '/api/materiels',
      emplacements: '/api/emplacements',
      factures: '/api/factures',
      fournisseurs: '/api/fournisseurs',
      dashboardStats: '/api/dashboard/stats',
      health: '/api/health',
    },
  });
});

async function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`✅ Serveur Backend démarré sur http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accès local: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });

  try {
    console.log('🚀 Initialisation de la base de données Backend...');
    // 1. Connecter à la base de données
    await connectDB();
    // 2. Créer et alimenter les données initiales
    await seedInitialDatabase();
  } catch (error) {
    console.warn('⚠️ Avertissement lors de la connexion initiale à la DB:', error);
  }
}

startServer();

export default app;
