import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    beneficiaire: string;
    photo?: string;
    isSuperAdmin?: boolean;
  };
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'NO_TOKEN', message: 'Accès non autorisé: Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: string;
      email: string;
      role: string;
      beneficiaire: string;
      photo?: string;
      isSuperAdmin?: boolean;
    };
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token d\'accès expiré' });
    }
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Token invalide ou altéré' });
  }
}
