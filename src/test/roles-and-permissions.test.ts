import { describe, it, expect } from 'vitest';
import { normalizeRoleName } from '../types/itPark';

describe('Vérification de la Normalisation des Rôles et Permissions', () => {
  it('normalise correctement les rôles avec accents et espaces', () => {
    expect(normalizeRoleName('Responsable IT')).toBe('responsableit');
    expect(normalizeRoleName('Administrateur')).toBe('administrateur');
    expect(normalizeRoleName('Ingénieur Réseau & Télécom')).toBe('ingenieurreseautelecom');
    expect(normalizeRoleName('Technicien Support')).toBe('techniciensupport');
    expect(normalizeRoleName('Directeur Général')).toBe('directeurgeneral');
  });

  it('gère les chaînes vides et caractères spéciaux', () => {
    expect(normalizeRoleName('')).toBe('');
    expect(normalizeRoleName('   ')).toBe('');
    expect(normalizeRoleName('IT / Support - Niveau 1')).toBe('itsupportniveau1');
  });

  it('valide la détection du rôle Responsable IT insensible à la casse et aux accents', () => {
    const isIT = (role: string) => normalizeRoleName(role) === normalizeRoleName('Responsable IT');
    expect(isIT('Responsable IT')).toBe(true);
    expect(isIT('responsable it')).toBe(true);
    expect(isIT('RESPONSABLE IT')).toBe(true);
    expect(isIT('Collaborateur')).toBe(false);
    expect(isIT('Directeur')).toBe(false);
  });
});
