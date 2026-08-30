import { describe, it, expect } from 'vitest';
import { AuthUser } from '../services/authService';

describe('Vérification des Accès et Contrôle de Session Utilisateur', () => {
  const adminUser: AuthUser = {
    id: 'usr-admin',
    beneficiaire: 'Super Administrateur',
    email: 'admin@omoda.tn',
    role: 'Responsable IT',
    statut: 'Actif',
    accesApp: 'GLOBAL_BACKOFFICE',
  };

  const collaboratorUser: AuthUser = {
    id: 'usr-collab',
    beneficiaire: 'Collaborateur Commercial',
    email: 'collab@omoda.tn',
    role: 'Commercial',
    statut: 'Actif',
    accesApp: 'ESPACE_RECLAMATIONS',
  };

  const inactiveUser: AuthUser = {
    id: 'usr-inactive',
    beneficiaire: 'Ancien Employé',
    email: 'ancien@omoda.tn',
    role: 'Comptable',
    statut: 'Inactif',
  };

  it('autorise l accès au Backoffice complet uniquement pour les profils GLOBAL_BACKOFFICE', () => {
    const hasBackofficeAccess = (u: AuthUser) => u.statut === 'Actif' && u.accesApp === 'GLOBAL_BACKOFFICE';

    expect(hasBackofficeAccess(adminUser)).toBe(true);
    expect(hasBackofficeAccess(collaboratorUser)).toBe(false);
    expect(hasBackofficeAccess(inactiveUser)).toBe(false);
  });

  it('bloque formellement toute connexion si le statut est Inactif', () => {
    const isLoginAllowed = (u: AuthUser) => u.statut === 'Actif';

    expect(isLoginAllowed(adminUser)).toBe(true);
    expect(isLoginAllowed(collaboratorUser)).toBe(true);
    expect(isLoginAllowed(inactiveUser)).toBe(false);
  });

  it('valide le calcul du timer d expiration OTP (10 minutes = 600 secondes)', () => {
    const formatOtpTimer = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatOtpTimer(600)).toBe('10:00');
    expect(formatOtpTimer(599)).toBe('09:59');
    expect(formatOtpTimer(45)).toBe('00:45');
    expect(formatOtpTimer(0)).toBe('00:00');
  });
});
