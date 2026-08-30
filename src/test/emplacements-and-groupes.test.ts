import { describe, it, expect, beforeEach } from 'vitest';
import { GroupeEmplacement, Emplacement, Materiel, Beneficiaire } from '../types/itPark';

describe('Suite Complète : Emplacements, Groupes de Bâtiments & Contrôles d\'Intégrité', () => {
  let mockGroupesEmplacement: GroupeEmplacement[];
  let mockEmplacements: Emplacement[];
  let mockMateriels: Materiel[];
  let mockUsers: Beneficiaire[];

  beforeEach(() => {
    mockGroupesEmplacement = [
      { id: 'ge-1', nom: 'Siège Social Tunis', couleur: 'blue', icon: 'building' },
      { id: 'ge-2', nom: 'Showroom & Agence Sousse', couleur: 'emerald', icon: 'warehouse' },
      { id: 'ge-3', nom: 'Agence Sfax', couleur: 'amber', icon: 'building' },
    ];

    mockEmplacements = [
      { id: 'emp-101', id_GroupeEmplacement: 'ge-1', emplacement1: 'Direction Générale', emplacement2: 'Bureau 101' },
      { id: 'emp-102', id_GroupeEmplacement: 'ge-1', emplacement1: 'Département IT & Support', emplacement2: 'Open Space IT' },
      { id: 'emp-201', id_GroupeEmplacement: 'ge-2', emplacement1: 'Showroom Commercial', emplacement2: 'Espace Ventes' },
    ];

    mockMateriels = [
      {
        id: 'mat-1',
        reference: 'MAT-2025-01',
        designation: 'PC Portable Dell',
        codeSerie: 'SN-001',
        qte: 1,
        id_GroupeMateriel: 'gm-1',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        id_Emplacement: 'emp-102',
        statut: 'En service',
        dateMiseEnService: '2025-01-01',
        garantie: '24 mois',
      },
    ];

    mockUsers = [
      {
        id: 'u-1',
        beneficiaire: 'Amine Nafti',
        email: 'amine@omoda.tn',
        role: 'Responsable IT',
        id_Role: 'r-admin',
        statut: 'Actif',
        id_Emplacement: 'emp-102',
        hasPassword: true,
      },
    ];
  });

  describe('1. Création & Validation des Groupes d\'Emplacement (Sites / Bâtiments)', () => {
    it('ajoute avec succès un nouveau site/bâtiment', () => {
      const newGroupe: GroupeEmplacement = {
        id: 'ge-4',
        nom: 'Entrepôt Logistique Bizerte',
        couleur: 'purple',
        icon: 'warehouse',
      };

      mockGroupesEmplacement.push(newGroupe);
      expect(mockGroupesEmplacement).toHaveLength(4);
      expect(mockGroupesEmplacement.find(g => g.id === 'ge-4')?.nom).toBe('Entrepôt Logistique Bizerte');
    });

    it('interdit la création d un groupe avec un nom vide ou trop court (< 2 caractères)', () => {
      const validateGroupe = (nom: string) => {
        if (!nom || nom.trim().length < 2) {
          return { isValid: false, message: 'Le nom du site doit comporter au moins 2 caractères.' };
        }
        return { isValid: true };
      };

      expect(validateGroupe('').isValid).toBe(false);
      expect(validateGroupe('A').isValid).toBe(false);
      expect(validateGroupe('Site Sud').isValid).toBe(true);
    });

    it('détecte les doublons de noms de site/bâtiment (insensible à la casse et aux espaces)', () => {
      const isDuplicate = (nom: string) => {
        const clean = nom.trim().toLowerCase();
        return mockGroupesEmplacement.some(g => g.nom.trim().toLowerCase() === clean);
      };

      expect(isDuplicate('siège social tunis')).toBe(true);
      expect(isDuplicate('  Siège Social Tunis  ')).toBe(true);
      expect(isDuplicate('Nouveau Centre Djerba')).toBe(false);
    });
  });

  describe('2. Création & Modification des Emplacements (Bureaux / Salles)', () => {
    it('ajoute un emplacement rattaché à un bâtiment existant', () => {
      const newEmp: Emplacement = {
        id: 'emp-103',
        id_GroupeEmplacement: 'ge-1',
        emplacement1: 'Salle Réunion Principale',
        emplacement2: 'Salle A',
      };

      mockEmplacements.push(newEmp);
      expect(mockEmplacements).toHaveLength(4);
      expect(mockEmplacements.find(e => e.id === 'emp-103')?.emplacement1).toBe('Salle Réunion Principale');
    });

    it('modifie les désignations d un emplacement', () => {
      const emp = mockEmplacements.find(e => e.id === 'emp-101')!;
      const updated: Emplacement = {
        ...emp,
        emplacement1: 'Direction Générale & Finance',
        emplacement2: 'Bureau 101 - Aile Nord',
      };

      const idx = mockEmplacements.findIndex(e => e.id === 'emp-101');
      mockEmplacements[idx] = updated;

      expect(mockEmplacements[idx].emplacement1).toBe('Direction Générale & Finance');
      expect(mockEmplacements[idx].emplacement2).toBe('Bureau 101 - Aile Nord');
    });
  });

  describe('3. Contrôles d\'Intégrité lors de la Suppression (Delete Guards)', () => {
    it('bloque la suppression d un emplacement contenant des matériels ou des utilisateurs', () => {
      const canDeleteEmplacement = (empId: string) => {
        const matCount = mockMateriels.filter(m => m.id_Emplacement === empId).length;
        const userCount = mockUsers.filter(u => u.id_Emplacement === empId).length;
        if (matCount > 0 || userCount > 0) {
          return {
            isValid: false,
            message: `Impossible de supprimer : ${matCount} matériel(s) et ${userCount} collaborateur(s) y sont localisés.`,
          };
        }
        return { isValid: true };
      };

      // emp-102 contient 1 matériel et 1 user -> suppression interdite
      const checkBlocked = canDeleteEmplacement('emp-102');
      expect(checkBlocked.isValid).toBe(false);
      expect(checkBlocked.message).toContain('1 matériel(s) et 1 collaborateur(s)');

      // emp-201 est vide -> suppression autorisée
      const checkEmpty = canDeleteEmplacement('emp-201');
      expect(checkEmpty.isValid).toBe(true);
    });

    it('bloque la suppression d un groupe d emplacement contenant des emplacements', () => {
      const canDeleteGroupe = (groupeId: string) => {
        const empCount = mockEmplacements.filter(e => e.id_GroupeEmplacement === groupeId).length;
        if (empCount > 0) {
          return {
            isValid: false,
            message: `Impossible de supprimer ce site car ${empCount} emplacement(s) y sont rattachés.`,
          };
        }
        return { isValid: true };
      };

      // ge-1 a 2 emplacements -> bloqué
      expect(canDeleteGroupe('ge-1').isValid).toBe(false);

      // ge-3 a 0 emplacement -> autorisé
      expect(canDeleteGroupe('ge-3').isValid).toBe(true);
    });
  });
});
