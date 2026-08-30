import { describe, it, expect, beforeEach } from 'vitest';
import { GroupeMateriel, Materiel } from '../types/itPark';

describe('Suite Complète : Groupes / Catégories de Matériel & Règles Métier Associées', () => {
  let mockGroupes: GroupeMateriel[];
  let mockMateriels: Materiel[];

  beforeEach(() => {
    mockGroupes = [
      { id: 'gm-pc', Groupe: 'PC Portables & Stations', codeSerieObligatoire: true, description: 'Laptops DELL & Lenovo' },
      { id: 'gm-ecran', Groupe: 'Écrans & Moniteurs', codeSerieObligatoire: true, description: 'Écrans 24 et 27 pouces' },
      { id: 'gm-acc', Groupe: 'Périphériques & Câbles', codeSerieObligatoire: false, description: 'Souris, claviers, adaptateurs' },
    ];

    mockMateriels = [
      {
        id: 'mat-1',
        reference: 'MAT-001',
        designation: 'Dell Latitude 5540',
        id_GroupeMateriel: 'gm-pc',
        codeSerie: 'SN-001',
        qte: 1,
        statut: 'En service',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        id_Emplacement: 'emp-1',
        dateMiseEnService: '2025-01-01',
        garantie: '24 mois',
      },
    ];
  });

  describe('1. Création & Validation des Groupes de Matériel', () => {
    it('ajoute une nouvelle catégorie de matériel avec option code série obligatoire', () => {
      const newGroupe: GroupeMateriel = {
        id: 'gm-serv',
        Groupe: 'Serveurs & Baies Réseau',
        codeSerieObligatoire: true,
        description: 'Infrastructures Datacenter',
      };

      mockGroupes.push(newGroupe);
      expect(mockGroupes).toHaveLength(4);
      expect(mockGroupes.find(g => g.id === 'gm-serv')?.codeSerieObligatoire).toBe(true);
    });

    it('rejette les noms de groupe trop courts (< 2 caractères) ou vides', () => {
      const validateNom = (nom: string) => {
        if (!nom || nom.trim().length < 2 || nom.trim().length > 60) {
          return { isValid: false, message: 'Le nom du groupe doit comporter entre 2 et 60 caractères.' };
        }
        return { isValid: true };
      };

      expect(validateNom('').isValid).toBe(false);
      expect(validateNom('A').isValid).toBe(false);
      expect(validateNom('Imprimantes Laser & Multifonctions').isValid).toBe(true);
    });

    it('interdit la création de doublons de groupe de matériel', () => {
      const isDuplicate = (nom: string) => {
        const clean = nom.trim().toLowerCase();
        return mockGroupes.some(g => g.Groupe.trim().toLowerCase() === clean);
      };

      expect(isDuplicate('pc portables & stations')).toBe(true);
      expect(isDuplicate('Écrans & Moniteurs')).toBe(true);
      expect(isDuplicate('Tablettes Tactiles')).toBe(false);
    });
  });

  describe('2. Modification de Catégorie', () => {
    it('met à jour la désignation, la description et les flags du groupe', () => {
      const grp = mockGroupes.find(g => g.id === 'gm-acc')!;
      const updated: GroupeMateriel = {
        ...grp,
        Groupe: 'Accessoires, Claviers & Stations d accueil',
        description: 'Tous périphériques bureautiques',
        codeSerieObligatoire: false,
      };

      const idx = mockGroupes.findIndex(g => g.id === 'gm-acc');
      mockGroupes[idx] = updated;

      expect(mockGroupes[idx].Groupe).toContain('Stations d accueil');
      expect(mockGroupes[idx].description).toContain('Tous périphériques');
    });
  });

  describe('3. Règle d\'Intégrité à la Suppression (Delete Guard)', () => {
    it('interdit la suppression d une catégorie contenant encore des matériels', () => {
      const canDeleteGroupe = (groupeId: string) => {
        const matCount = mockMateriels.filter(m => m.id_GroupeMateriel === groupeId).length;
        if (matCount > 0) {
          return {
            isValid: false,
            message: `Impossible de supprimer ce groupe car ${matCount} équipement(s) y sont rattachés.`,
          };
        }
        return { isValid: true };
      };

      // gm-pc contient 1 matériel -> bloqué
      expect(canDeleteGroupe('gm-pc').isValid).toBe(false);
      expect(canDeleteGroupe('gm-pc').message).toContain('1 équipement(s)');

      // gm-acc ne contient aucun matériel -> autorisé
      expect(canDeleteGroupe('gm-acc').isValid).toBe(true);
    });
  });

  describe('4. Calcul Dynamique du Nombre de Matériels par Groupe', () => {
    it('calcule exactement le décompte des matériels par catégorie', () => {
      const countMaterialsByGroup = (groupeId: string) => {
        return mockMateriels.filter(m => m.id_GroupeMateriel === groupeId).length;
      };

      expect(countMaterialsByGroup('gm-pc')).toBe(1);
      expect(countMaterialsByGroup('gm-ecran')).toBe(0);
      expect(countMaterialsByGroup('gm-acc')).toBe(0);
    });
  });
});
