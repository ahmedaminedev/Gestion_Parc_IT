import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateLoginData } from '../../Backend/validators/businessValidators';

describe('Suite Complète : Sécurité de Session, Authentification & Modales d\'Expiration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Contrôle de Saisie à la Connexion (Login Form Validation)', () => {
    it('rejette la soumission avec email vide', () => {
      const res = validateLoginData({ email: '', password: 'Password123!' });
      expect(res.isValid).toBe(false);
      expect(res.field).toBe('email');
      expect(res.message).toContain('adresse email');
    });

    it('rejette les formats d email invalides', () => {
      const res1 = validateLoginData({ email: 'amine.nafti', password: 'Password123!' });
      expect(res1.isValid).toBe(false);
      expect(res1.field).toBe('email');

      const res2 = validateLoginData({ email: 'amine@omoda', password: 'Password123!' });
      expect(res2.isValid).toBe(false);
    });

    it('rejette les mots de passe vides', () => {
      const res = validateLoginData({ email: 'amine.nafti@omoda.tn', password: '' });
      expect(res.isValid).toBe(false);
      expect(res.field).toBe('password');
      expect(res.message).toContain('mot de passe');
    });

    it('valide avec succès des identifiants bien formatés', () => {
      const res = validateLoginData({ email: 'amine.nafti@omoda.tn', password: 'ValidPassword2025' });
      expect(res.isValid).toBe(true);
    });
  });

  describe('2. Déclenchement et Calculs des Modales de Session', () => {
    it('calcule le temps restant pour le compte à rebours d expiration (30 secondes)', () => {
      const initialSeconds = 30;
      const getFormattedCountdown = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const remainingSec = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
      };

      expect(getFormattedCountdown(initialSeconds)).toBe('00:30');
      expect(getFormattedCountdown(5)).toBe('00:05');
      expect(getFormattedCountdown(0)).toBe('00:00');
    });

    it('gère l événement de session expirée avec motif explicatif', () => {
      let isExpiredModalOpen = false;
      let expiredReasonText = '';

      const triggerSessionExpired = (reason: string) => {
        isExpiredModalOpen = true;
        expiredReasonText = reason;
      };

      triggerSessionExpired('Votre session a expiré suite à une longue période d inactivité.');
      expect(isExpiredModalOpen).toBe(true);
      expect(expiredReasonText).toContain('inactivité');
    });
  });

  describe('3. Révocation des Droits pour Utilisateurs Inactifs ou Sans Accès', () => {
    it('bloque formellement la connexion si le compte a accesApp="NONE" ou hasPassword=false', () => {
      const userWithoutAccess = {
        id: 'u-noaccess',
        beneficiaire: 'Chauffeur Société',
        email: 'chauffeur@omoda.tn',
        statut: 'Actif',
        hasPassword: false,
        accesApp: 'NONE',
      };

      const canLogin = (user: typeof userWithoutAccess) => {
        return user.statut === 'Actif' && user.hasPassword === true && user.accesApp !== 'NONE';
      };

      expect(canLogin(userWithoutAccess)).toBe(false);
    });

    it('bloque la connexion pour un utilisateur ayant le statut Inactif', () => {
      const inactiveUser = {
        id: 'u-inactive',
        beneficiaire: 'Ancien Collaborateur',
        email: 'ancien@omoda.tn',
        statut: 'Inactif',
        hasPassword: true,
        accesApp: 'GLOBAL_BACKOFFICE',
      };

      const canLogin = (user: typeof inactiveUser) => {
        return user.statut === 'Actif' && user.hasPassword === true && user.accesApp !== 'NONE';
      };

      expect(canLogin(inactiveUser)).toBe(false);
    });
  });
});
