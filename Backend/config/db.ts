import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';

let mongoMemoryServer: MongoMemoryServer | null = null;

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  const targetUri = env.MONGODB_URI.trim();

  if (targetUri) {
    try {
      console.log(`📡 Tentative de connexion à MongoDB depuis .env (${targetUri})...`);
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 3000,
      });
      console.log(`✅ Connecté avec succès à la base de données MongoDB: ${mongoose.connection.name || targetUri}`);
      return;
    } catch (err: any) {
      console.warn(`⚠️ Impossible de se connecter à l'URI MongoDB (${err?.message || err}).`);
      console.log(`🔄 Tentative d'initialisation du serveur MongoDB intégré en mémoire...`);
    }
  } else {
    console.warn(`⚠️ MONGODB_URI absent dans .env. Démarrage du serveur MongoDB en mémoire...`);
  }

  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri, {
      dbName: 'Gestion_Parc_IT_2',
    });
    console.log(`✅ Serveur MongoDB en mémoire opérationnel (${memoryUri})`);
  } catch (error: any) {
    console.warn('⚠️ Mode autonome sans MongoDB actif (mémoire locale). Les accès par défaut sont disponibles:', error?.message || error);
  }
}
