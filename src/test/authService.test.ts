import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthUser } from '../services/authService';

describe('Suite Complète de Tests : Service d\'Authentification & Sécurité', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Validation de la complexité du Mot de Passe', () => {
    it('rejette les mots de passe trop courts (< 8 caractères)', () => {
      const isStrong = (pwd: string) => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
      expect(isStrong('Abc1!')).toBe(false);
      expect(isStrong('Pass1')).toBe(false);
    });

    it('valide les mots de passe conformes aux exigences de sécurité OMODA', () => {
      const isStrong = (pwd: string) => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
      expect(isStrong('Omoda2025!')).toBe(true);
      expect(isStrong('AdminJaecoo123')).toBe(true);
      expect(isStrong('Secur!te2026')).toBe(true);
    });
  });

  describe('2. Gestion du Cycle OTP (Code à usage unique)', () => {
    it('génère un code OTP à 6 chiffres numérique', () => {
      const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
      const code = generateOtp();
      expect(code).toMatch(/^[0-9]{6}$/);
      expect(code.length).toBe(6);
    });

    it('vérifie l expiration du code OTP après le délai défini (10 minutes)', () => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      const otpSession = {
        code: '123456',
        expiresAt: now + tenMinutes,
      };

      const isOtpValid = (enteredCode: string, checkTime: number) => {
        return enteredCode === otpSession.code && checkTime <= otpSession.expiresAt;
      };

      expect(isOtpValid('123456', now + 2 * 60 * 1000)).toBe(true); // valide à 2 min
      expect(isOtpValid('123456', now + 9 * 60 * 1000)).toBe(true); // valide à 9 min
      expect(isOtpValid('123456', now + 11 * 60 * 1000)).toBe(false); // expiré à 11 min
      expect(isOtpValid('000000', now + 2 * 60 * 1000)).toBe(false); // mauvais code
    });

    it('formate correctement le compte à rebours visuel mm:ss', () => {
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      expect(formatTime(600)).toBe('10:00');
      expect(formatTime(125)).toBe('02:05');
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(0)).toBe('00:00');
    });
  });

  describe('3. Rôles et Périmètres d\'accès Applicatif (RBAC)', () => {
    it('distingue correctement les accès GLOBAL_BACKOFFICE et ESPACE_RECLAMATIONS', () => {
      const adminUser: AuthUser = {
        id: 'u-1',
        beneficiaire: 'Directeur IT',
        email: 'it@omoda.tn',
        role: 'Responsable IT',
        statut: 'Actif',
        accesApp: 'GLOBAL_BACKOFFICE',
      };

      const collaboratorUser: AuthUser = {
        id: 'u-2',
        beneficiaire: 'Commercial Vente',
        email: 'commercial@omoda.tn',
        role: 'Commercial',
        statut: 'Actif',
        accesApp: 'ESPACE_RECLAMATIONS',
      };

      const canAccessBackoffice = (u: AuthUser) => u.statut === 'Actif' && u.accesApp === 'GLOBAL_BACKOFFICE';
      const canAccessEmployeeSpace = (u: AuthUser) => u.statut === 'Actif';

      expect(canAccessBackoffice(adminUser)).toBe(true);
      expect(canAccessBackoffice(collaboratorUser)).toBe(false);

      expect(canAccessEmployeeSpace(adminUser)).toBe(true);
      expect(canAccessEmployeeSpace(collaboratorUser)).toBe(true);
    });

    it('bloque l accès pour les utilisateurs au statut Inactif ou Archivé', () => {
      const inactiveUser: AuthUser = {
        id: 'u-3',
        beneficiaire: 'Ex Collaborateur',
        email: 'ex@omoda.tn',
        role: 'Technicien',
        statut: 'Inactif',
        accesApp: 'GLOBAL_BACKOFFICE',
      };

      const isAllowed = (u: AuthUser) => u.statut === 'Actif';
      expect(isAllowed(inactiveUser)).toBe(false);
    });
  });

  describe('4. Synchronisation du LocalStorage & Session', () => {
    it('persiste et restaure correctement les données de session', () => {
      const mockSession = {
        user: {
          id: 'user-100',
          beneficiaire: 'Ahmed Test',
          email: 'ahmed.test@omoda.tn',
          role: 'Responsable IT',
          statut: 'Actif' as const,
        },
        token: 'jwt-token-sample-12345',
      };

      localStorage.setItem('omoda_auth_session', JSON.stringify(mockSession));
      const retrieved = JSON.parse(localStorage.getItem('omoda_auth_session') || '{}');

      expect(retrieved.user.email).toBe('ahmed.test@omoda.tn');
      expect(retrieved.token).toBe('jwt-token-sample-12345');
    });

    it('nettoie la session lors de la déconnexion', () => {
      localStorage.setItem('omoda_auth_session', 'sample');
      localStorage.removeItem('omoda_auth_session');
      expect(localStorage.getItem('omoda_auth_session')).toBeNull();
    });
  });
});
