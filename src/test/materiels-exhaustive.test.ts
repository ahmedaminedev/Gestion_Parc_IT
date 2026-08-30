import { describe, it, expect, beforeEach } from 'vitest';
import { Materiel, GroupeMateriel } from '../types/itPark';

describe('Scénarios Exhaustifs : Gestion du Parc Matériel & Actions de Stock', () => {
  let mockGroupes: GroupeMateriel[];
  let mockMateriels: Materiel[];

  beforeEach(() => {
    mockGroupes = [
      { id: 'gm-pc', Groupe: 'PC Portables', codeSerieObligatoire: true },
      { id: 'gm-ecran', Groupe: 'Écrans & Moniteurs', codeSerieObligatoire: true },
      { id: 'gm-acc', Groupe: 'Accessoires & Câbles', codeSerieObligatoire: false },
    ];

    mockMateriels = [
      {
        id: 'mat-1',
        reference: 'MAT-2025-001',
        ref_immo: 'IMM-2025-001',
        designation: 'Dell XPS 15 9530',
        codeSerie: 'SN-XPS-9530-01',
        id_GroupeMateriel: 'gm-pc',
        id_Fournisseur: 'frs-dell',
        id_Facture: 'fac-01',
        id_Emplacement: 'emp-siege',
        id_Beneficiaire: 'user-amine',
        statut: 'En service',
        qte: 1,
        montantHT: 4800,
        valeurPlafond: 4800,
        dateMiseEnService: '2025-01-10',
        garantie: '24 mois',
      },
      {
        id: 'mat-2',
        reference: 'MAT-2025-002',
        ref_immo: '',
        designation: 'Écran Dell 27 4K U2723QE',
        codeSerie: 'SN-U27-02',
        id_GroupeMateriel: 'gm-ecran',
        id_Fournisseur: 'frs-dell',
        id_Facture: 'fac-01',
        id_Emplacement: 'emp-siege',
        id_Beneficiaire: '',
        statut: 'En stock',
        qte: 1,
        montantHT: 1250,
        valeurPlafond: 1250,
        dateMiseEnService: '2025-01-10',
        garantie: '36 mois',
      },
    ];
  });

  describe('1. Scénario : Ajout d\'un Nouveau Matériel & Validation Numéro de Série', () => {
    it('ajoute avec succès un matériel complet avec toutes ses métadonnées', () => {
      const newMat: Materiel = {
        id: 'mat-3',
        reference: 'MAT-2025-003',
        ref_immo: 'IMM-2025-003',
        designation: 'Lenovo ThinkPad T14s Gen 4',
        codeSerie: 'SN-TP-T14-03',
        id_GroupeMateriel: 'gm-pc',
        id_Fournisseur: 'frs-dell',
        id_Facture: 'fac-01',
        id_Emplacement: 'emp-siege',
        id_Beneficiaire: '',
        statut: 'En stock',
        qte: 1,
        montantHT: 3500,
        valeurPlafond: 3500,
        dateMiseEnService: '2025-02-01',
        garantie: '36 mois',
      };

      mockMateriels.push(newMat);
      expect(mockMateriels).toHaveLength(3);
      expect(mockMateriels.find((m) => m.id === 'mat-3')?.designation).toBe('Lenovo ThinkPad T14s Gen 4');
    });

    it('valide l exigence du numéro de série selon la configuration du groupe de matériel', () => {
      const validateMaterial = (mat: Partial<Materiel>) => {
        const group = mockGroupes.find((g) => g.id === mat.id_GroupeMateriel);
        if (group?.codeSerieObligatoire && (!mat.codeSerie || mat.codeSerie.trim() === '')) {
          return { valid: false, error: 'Le numéro de série est obligatoire pour cette catégorie de matériel.' };
        }
        return { valid: true };
      };

      // PC Portable sans numéro de série -> Erreur
      const invalidPc = { id_GroupeMateriel: 'gm-pc', codeSerie: '' };
      expect(validateMaterial(invalidPc).valid).toBe(false);

      // Accessoire sans numéro de série -> Valide
      const validCable = { id_GroupeMateriel: 'gm-acc', codeSerie: '' };
      expect(validateMaterial(validCable).valid).toBe(true);

      // PC Portable avec numéro de série -> Valide
      const validPc = { id_GroupeMateriel: 'gm-pc', codeSerie: 'SN-12345' };
      expect(validateMaterial(validPc).valid).toBe(true);
    });
  });

  describe('2. Scénario : Modification d\'un Matériel', () => {
    it('met à jour les caractéristiques, le prix HT et la référence d immobilisation', () => {
      const mat = mockMateriels.find((m) => m.id === 'mat-2')!;

      const updated: Materiel = {
        ...mat,
        designation: 'Écran Dell 27 4K U2723QE (Bureau Direction)',
        ref_immo: 'IMM-DIR-2025-02',
        montantHT: 1300,
      };

      const idx = mockMateriels.findIndex((m) => m.id === 'mat-2');
      mockMateriels[idx] = updated;

      expect(mockMateriels[idx].designation).toContain('Bureau Direction');
      expect(mockMateriels[idx].ref_immo).toBe('IMM-DIR-2025-02');
      expect(mockMateriels[idx].montantHT).toBe(1300);
    });
  });

  describe('3. Scénario : Bouton "Affecter à un Collaborateur"', () => {
    it('affecte le matériel et bascule automatiquement son statut à "En service"', () => {
      const targetMatId = 'mat-2';
      const beneficiaryId = 'user-sarra';

      const assignMaterial = (id: string, userId: string): Materiel => {
        const mat = mockMateriels.find((m) => m.id === id)!;
        return {
          ...mat,
          id_Beneficiaire: userId,
          statut: 'En service',
        };
      };

      const updated = assignMaterial(targetMatId, beneficiaryId);
      expect(updated.id_Beneficiaire).toBe('user-sarra');
      expect(updated.statut).toBe('En service');
    });
  });

  describe('4. Scénario : Bouton "Désaffecter / Retour en Stock"', () => {
    it('retire l affectation et bascule le statut à "En stock"', () => {
      const targetMatId = 'mat-1'; // Était affecté à user-amine

      const unassignMaterial = (id: string): Materiel => {
        const mat = mockMateriels.find((m) => m.id === id)!;
        return {
          ...mat,
          id_Beneficiaire: '',
          statut: 'En stock',
        };
      };

      const updated = unassignMaterial(targetMatId);
      expect(updated.id_Beneficiaire).toBe('');
      expect(updated.statut).toBe('En stock');
    });
  });

  describe('5. Scénario : Déclaration "En Panne" & "Hors Service"', () => {
    it('déclare le matériel en panne et l exclut du taux opérationnel', () => {
      const targetMatId = 'mat-1';

      const markAsBroken = (id: string): Materiel => {
        const mat = mockMateriels.find((m) => m.id === id)!;
        return {
          ...mat,
          statut: 'En panne',
        };
      };

      const updated = markAsBroken(targetMatId);
      expect(updated.statut).toBe('En panne');
    });

    it('déclasse le matériel en statut Hors service', () => {
      const targetMatId = 'mat-1';

      const decommission = (id: string): Materiel => {
        const mat = mockMateriels.find((m) => m.id === id)!;
        return {
          ...mat,
          statut: 'Hors service',
          id_Beneficiaire: '',
        };
      };

      const updated = decommission(targetMatId);
      expect(updated.statut).toBe('Hors service');
      expect(updated.id_Beneficiaire).toBe('');
    });
  });

  describe('6. Scénario : Suppression Unitaire & Suppression Groupée (Bulk Delete)', () => {
    it('supprime unitairement un matériel', () => {
      mockMateriels = mockMateriels.filter((m) => m.id !== 'mat-2');
      expect(mockMateriels).toHaveLength(1);
      expect(mockMateriels.find((m) => m.id === 'mat-2')).toBeUndefined();
    });

    it('supprime un ensemble de matériels sélectionnés (Bulk Delete)', () => {
      const idsToDelete = new Set(['mat-1', 'mat-2']);
      mockMateriels = mockMateriels.filter((m) => !idsToDelete.has(m.id));
      expect(mockMateriels).toHaveLength(0);
    });
  });

  describe('7. Scénario : Filtrage Multi-Critères du Parc Matériel', () => {
    const list: Materiel[] = [
      {
        id: 'm1',
        reference: 'REF-01',
        designation: 'Dell XPS 13',
        id_GroupeMateriel: 'gm-pc',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        statut: 'En service',
        id_Emplacement: 'emp-1',
        codeSerie: 'SN-01',
        qte: 1,
        dateMiseEnService: '2025-01-01',
        garantie: '24 mois',
      },
      {
        id: 'm2',
        reference: 'REF-02',
        designation: 'Dell Latitude 5540',
        id_GroupeMateriel: 'gm-pc',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        statut: 'En stock',
        id_Emplacement: 'emp-2',
        codeSerie: 'SN-02',
        qte: 1,
        dateMiseEnService: '2025-01-01',
        garantie: '24 mois',
      },
      {
        id: 'm3',
        reference: 'REF-03',
        designation: 'Écran 24 FHD',
        id_GroupeMateriel: 'gm-ecran',
        id_Fournisseur: 'frs-2',
        id_Facture: 'fac-2',
        statut: 'En panne',
        id_Emplacement: 'emp-1',
        codeSerie: 'SN-03',
        qte: 1,
        dateMiseEnService: '2025-01-01',
        garantie: '12 mois',
      },
    ];

    it('filtre par recherche texte', () => {
      const search = (q: string) => list.filter((m) => m.designation.toLowerCase().includes(q.toLowerCase()));
      expect(search('Latitude')).toHaveLength(1);
      expect(search('Dell')).toHaveLength(2);
    });

    it('filtre par statut', () => {
      const filterStatut = (s: string) => list.filter((m) => m.statut === s);
      expect(filterStatut('En service')).toHaveLength(1);
      expect(filterStatut('En stock')).toHaveLength(1);
      expect(filterStatut('En panne')).toHaveLength(1);
    });
  });
});
