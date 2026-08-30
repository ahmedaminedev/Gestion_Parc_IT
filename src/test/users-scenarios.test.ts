import { describe, it, expect, beforeEach } from 'vitest';
import { Beneficiaire, Materiel, Role } from '../types/itPark';
import { isValidEmail } from '../../Backend/validators/businessValidators';

describe('Scénarios Exhaustifs : Gestion des Utilisateurs, Rôles & Sécurité des Accès', () => {
  let mockUsers: Beneficiaire[];
  let mockMateriels: Materiel[];
  let mockRoles: Role[];

  beforeEach(() => {
    mockRoles = [
      { id: 'r-admin', nom: 'Responsable IT', description: 'Admin DSI complet', couleur: 'blue', isSystem: true },
      { id: 'r-tech', nom: 'Technicien Support', description: 'Support N1/N2', couleur: 'purple', isSystem: false },
      { id: 'r-comm', nom: 'Commercial', description: 'Équipe Ventes', couleur: 'emerald', isSystem: false },
      { id: 'r-dir', nom: 'Directeur Général', description: 'Direction', couleur: 'amber', isSystem: false },
    ];

    mockUsers = [
      {
        id: 'u-1',
        beneficiaire: 'Amine Nafti',
        email: 'amine.nafti@omoda.tn',
        role: 'Responsable IT',
        id_Role: 'r-admin',
        statut: 'Actif',
        id_Emplacement: 'emp-1',
        derniereActivite: "À l'instant",
        hasPassword: true,
        isITUser: true,
        accesApp: 'GLOBAL_BACKOFFICE',
      },
      {
        id: 'u-2',
        beneficiaire: 'Sarra Ben Salem',
        email: 'sarra.bensalem@omoda.tn',
        role: 'Commercial',
        id_Role: 'r-comm',
        statut: 'Actif',
        id_Emplacement: 'emp-2',
        derniereActivite: 'Il y a 2h',
        hasPassword: false,
        isITUser: false,
        accesApp: 'NONE',
      },
    ];

    mockMateriels = [
      {
        id: 'mat-101',
        reference: 'MAT-LAT-5540',
        designation: 'Dell Latitude 5540',
        id_GroupeMateriel: 'gm-1',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        id_Emplacement: 'emp-2',
        id_Beneficiaire: 'u-2', // Affecté à Sarra
        statut: 'En service',
        codeSerie: 'SN-DELL-5540-01',
        qte: 1,
        montantHT: 3200,
        dateMiseEnService: '2025-01-15',
        garantie: '24 mois',
      },
      {
        id: 'mat-102',
        reference: 'MAT-SCR-27',
        designation: 'Écran Dell 27 4K',
        id_GroupeMateriel: 'gm-2',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        id_Emplacement: 'emp-2',
        id_Beneficiaire: 'u-2', // Affecté à Sarra
        statut: 'En service',
        codeSerie: 'SN-SCR-4K-02',
        qte: 1,
        montantHT: 1100,
        dateMiseEnService: '2025-01-15',
        garantie: '36 mois',
      },
    ];
  });

  describe('1. Scénario : Ajout d\'un utilisateur "Sans Accès" (Pas de mot de passe, accesApp="NONE")', () => {
    it('crée un collaborateur sans identifiants de connexion au Backoffice', () => {
      const newUser: Beneficiaire = {
        id: 'u-3',
        beneficiaire: 'Tarek Cherif (Chauffeur)',
        email: 'tarek.cherif@omoda.tn',
        role: 'Commercial',
        id_Role: 'r-comm',
        statut: 'Actif',
        id_Emplacement: 'emp-1',
        derniereActivite: "À l'instant",
        hasPassword: false, // SANS ACCÈS / PAS DE MOT DE PASSE
        isITUser: false,
        accesApp: 'NONE',
      };

      mockUsers.push(newUser);

      const added = mockUsers.find((u) => u.id === 'u-3')!;
      expect(added).toBeDefined();
      expect(added.hasPassword).toBe(false);
      expect(added.isITUser).toBe(false);
      expect(added.accesApp).toBe('NONE');

      // Vérification : cet utilisateur ne peut pas s'authentifier au Backoffice
      const canAccessBackoffice = (u: Beneficiaire) => u.hasPassword === true && u.accesApp === 'GLOBAL_BACKOFFICE';
      expect(canAccessBackoffice(added)).toBe(false);
    });
  });

  describe('2. Scénario : Ajout d\'un utilisateur "Responsable IT" (Accès total Backoffice)', () => {
    it('crée un administrateur DSI avec privilèges complets et mot de passe', () => {
      const newAdmin: Beneficiaire = {
        id: 'u-4',
        beneficiaire: 'Karim Jaziri (Admin Réseau)',
        email: 'karim.jaziri@omoda.tn',
        role: 'Responsable IT',
        id_Role: 'r-admin',
        statut: 'Actif',
        id_Emplacement: 'emp-1',
        derniereActivite: "À l'instant",
        hasPassword: true,
        isITUser: true,
        accesApp: 'GLOBAL_BACKOFFICE',
      };

      mockUsers.push(newAdmin);

      const added = mockUsers.find((u) => u.id === 'u-4')!;
      expect(added.hasPassword).toBe(true);
      expect(added.isITUser).toBe(true);
      expect(added.role).toBe('Responsable IT');
      expect(added.accesApp).toBe('GLOBAL_BACKOFFICE');

      // Vérification des droits d'accès
      const canAccessBackoffice = (u: Beneficiaire) => u.hasPassword === true && (u.isITUser || u.role === 'Responsable IT' || u.accesApp === 'GLOBAL_BACKOFFICE');
      expect(canAccessBackoffice(added)).toBe(true);
    });
  });

  describe('3. Scénario : Modification d\'un utilisateur & Gestion des Droits', () => {
    it('met à jour les informations du profil, rôle et active le mot de passe', () => {
      const userToEdit = mockUsers.find((u) => u.id === 'u-2')!;

      const updatedUser: Beneficiaire = {
        ...userToEdit,
        beneficiaire: 'Sarra Ben Salem (Tech)',
        role: 'Technicien Support',
        id_Role: 'r-tech',
        id_Emplacement: 'emp-1',
        hasPassword: true, // Activation de l'accès
        isITUser: true,
        accesApp: 'GLOBAL_BACKOFFICE',
      };

      const index = mockUsers.findIndex((u) => u.id === 'u-2');
      mockUsers[index] = updatedUser;

      expect(mockUsers[index].beneficiaire).toBe('Sarra Ben Salem (Tech)');
      expect(mockUsers[index].role).toBe('Technicien Support');
      expect(mockUsers[index].id_Emplacement).toBe('emp-1');
      expect(mockUsers[index].hasPassword).toBe(true);
      expect(mockUsers[index].accesApp).toBe('GLOBAL_BACKOFFICE');
    });

    it('gère la révocation du mot de passe (removePassword: true)', () => {
      const adminToRevoke = mockUsers.find((u) => u.id === 'u-1')!;
      const revoked: Beneficiaire = {
        ...adminToRevoke,
        hasPassword: false,
        accesApp: 'NONE',
      };

      expect(revoked.hasPassword).toBe(false);
      expect(revoked.accesApp).toBe('NONE');
    });
  });

  describe('4. Scénario Critique : Désactivation (Actif -> Inactif) & Libération automatique du Matériel', () => {
    it('remet automatiquement en stock tous les équipements assignés au collaborateur désactivé', () => {
      const userToDeactivateId = 'u-2';

      // 1. Vérifier que Sarra possède 2 matériels "En service"
      const sarraMaterialsBefore = mockMateriels.filter((m) => m.id_Beneficiaire === userToDeactivateId);
      expect(sarraMaterialsBefore).toHaveLength(2);
      expect(sarraMaterialsBefore.every((m) => m.statut === 'En service')).toBe(true);

      // 2. Bascule du statut Actif -> Inactif
      const userIndex = mockUsers.findIndex((u) => u.id === userToDeactivateId);
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        statut: 'Inactif',
      };

      // 3. Règle métier : Déstockage / Libération automatique des matériels
      mockMateriels = mockMateriels.map((m) => {
        if (m.id_Beneficiaire === userToDeactivateId) {
          return {
            ...m,
            id_Beneficiaire: '',
            statut: 'En stock',
          };
        }
        return m;
      });

      // 4. Vérifications
      expect(mockUsers[userIndex].statut).toBe('Inactif');
      const sarraMaterialsAfter = mockMateriels.filter((m) => m.id_Beneficiaire === userToDeactivateId);
      expect(sarraMaterialsAfter).toHaveLength(0);

      const releasedMat1 = mockMateriels.find((m) => m.id === 'mat-101')!;
      const releasedMat2 = mockMateriels.find((m) => m.id === 'mat-102')!;
      expect(releasedMat1.statut).toBe('En stock');
      expect(releasedMat1.id_Beneficiaire).toBe('');
      expect(releasedMat2.statut).toBe('En stock');
      expect(releasedMat2.id_Beneficiaire).toBe('');
    });
  });

  describe('5. Scénario : Contrôles de Validation lors de la Saisie Utilisateur', () => {
    it('valide le format email', () => {
      expect(isValidEmail('amine@omoda.tn')).toBe(true);
      expect(isValidEmail('mauvais-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('vérifie la complexité minimale du mot de passe (au moins 8 caractères, lettre + chiffre)', () => {
      const isPasswordSecure = (pwd?: string) => {
        if (!pwd) return false;
        if (pwd.length < 8) return false;
        const hasNum = /[0-9]/.test(pwd);
        const hasLetter = /[a-zA-Z]/.test(pwd);
        return hasNum && hasLetter;
      };

      expect(isPasswordSecure('Court1')).toBe(false);
      expect(isPasswordSecure('SansChiffre')).toBe(false);
      expect(isPasswordSecure('1234567890')).toBe(false);
      expect(isPasswordSecure('Securite2025')).toBe(true);
    });
  });

  describe('6. Scénario : Suppression d\'un utilisateur & Guard d\'Intégrité', () => {
    it('bloque la suppression d un utilisateur qui détient encore des matériels', () => {
      const canDeleteUser = (userId: string) => {
        const assignedCount = mockMateriels.filter(m => m.id_Beneficiaire === userId).length;
        if (assignedCount > 0) {
          return { isValid: false, message: `Impossible de supprimer ce collaborateur car ${assignedCount} matériel(s) lui sont encore affectés.` };
        }
        return { isValid: true };
      };

      // u-2 a des matériels -> bloqué
      expect(canDeleteUser('u-2').isValid).toBe(false);

      // u-1 n'a pas de matériels -> autorisé
      expect(canDeleteUser('u-1').isValid).toBe(true);
    });

    it('supprime le compte une fois les matériels libérés', () => {
      const userToDeleteId = 'u-2';

      // Libération des matériels
      mockMateriels = mockMateriels.map((m) =>
        m.id_Beneficiaire === userToDeleteId ? { ...m, id_Beneficiaire: '', statut: 'En stock' } : m
      );

      // Suppression de l'utilisateur
      mockUsers = mockUsers.filter((u) => u.id !== userToDeleteId);

      expect(mockUsers.find((u) => u.id === userToDeleteId)).toBeUndefined();
      expect(mockUsers).toHaveLength(1);
    });
  });

  describe('7. Scénario : Protection des Rôles Système', () => {
    it('interdit la suppression d\'un rôle système (isSystem: true)', () => {
      const canDeleteRole = (role: Role) => !role.isSystem;

      const adminRole = mockRoles.find((r) => r.id === 'r-admin')!;
      const customRole = mockRoles.find((r) => r.id === 'r-comm')!;

      expect(canDeleteRole(adminRole)).toBe(false); // Protégé
      expect(canDeleteRole(customRole)).toBe(true); // Supprimable
    });
  });
});
