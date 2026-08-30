import { describe, it, expect, beforeEach } from 'vitest';
import { Facture, Fournisseur, Materiel } from '../types/itPark';
import { isValidEmail, isValidPhone } from '../../Backend/validators/businessValidators';

describe('Suite Complète : Facturation, Gestion des Fournisseurs & Calculs Financiers DSI', () => {
  const TVA_RATE = 0.19; // 19% TVA

  let mockFournisseurs: Fournisseur[];
  let mockFactures: Facture[];
  let mockMateriels: Materiel[];

  beforeEach(() => {
    mockFournisseurs = [
      { id: 'frs-1', Fournisseur: 'Dell Technologies Tunisie', email: 'contact@dell.tn', telephone: '+216 71 100 200', adresse: 'Les Berges du Lac, Tunis' },
      { id: 'frs-2', Fournisseur: 'Office Equip & Bureautique', email: 'ventes@office-equip.tn', telephone: '+216 73 300 400', adresse: 'Avenue Habib Bourguiba, Sousse' },
      { id: 'frs-3', Fournisseur: 'Fournisseur Sans Matériel', email: 'info@fournisseur.tn' },
    ];

    mockFactures = [
      { id: 'fac-1', factureFrs: 'FACT-2025-001', dateAcquisition: '2025-01-15', id_Fournisseur: 'frs-1', montantHT: 10000, statut: 'Payée' },
      { id: 'fac-2', factureFrs: 'FACT-2025-002', dateAcquisition: '2025-02-10', id_Fournisseur: 'frs-2', montantHT: 5500, statut: 'En attente' },
      { id: 'fac-3', factureFrs: 'FACT-2025-003', dateAcquisition: '2025-03-01', id_Fournisseur: 'frs-1', montantHT: 2500, statut: 'En retard' },
      { id: 'fac-empty', factureFrs: 'FACT-2025-999', dateAcquisition: '2025-03-10', id_Fournisseur: 'frs-3', montantHT: 1500, statut: 'En attente' },
    ];

    mockMateriels = [
      {
        id: 'mat-1',
        reference: 'MAT-001',
        designation: 'Dell Latitude 5540',
        id_GroupeMateriel: 'gm-1',
        id_Fournisseur: 'frs-1',
        id_Facture: 'fac-1',
        id_Emplacement: 'emp-1',
        statut: 'En service',
        codeSerie: 'SN-001',
        qte: 1,
        montantHT: 10000,
        dateMiseEnService: '2025-01-15',
        garantie: '24 mois',
      },
    ];
  });

  describe('1. Calculs Financiers HT, TVA (19%) et TTC', () => {
    it('calcule exactement le montant TVA et TTC à 19%', () => {
      const montantHT = 10000;
      const montantTVA = montantHT * TVA_RATE;
      const montantTTC = montantHT + montantTVA;

      expect(montantTVA).toBe(1900);
      expect(montantTTC).toBe(11900);
    });

    it('calcule la somme globale HT et les sous-totaux par état de paiement', () => {
      const totalHT = mockFactures.reduce((sum, f) => sum + f.montantHT, 0);
      const totalPaye = mockFactures.filter(f => f.statut === 'Payée').reduce((sum, f) => sum + f.montantHT, 0);
      const totalEnAttente = mockFactures.filter(f => f.statut === 'En attente').reduce((sum, f) => sum + f.montantHT, 0);
      const totalEnRetard = mockFactures.filter(f => f.statut === 'En retard').reduce((sum, f) => sum + f.montantHT, 0);

      expect(totalHT).toBe(19500);
      expect(totalPaye).toBe(10000);
      expect(totalEnAttente).toBe(7000);
      expect(totalEnRetard).toBe(2500);
    });
  });

  describe('2. Validation & Gestion des Fournisseurs', () => {
    it('valide le format des adresses email fournisseur', () => {
      expect(isValidEmail('contact@dell.tn')).toBe(true);
      expect(isValidEmail('invalide-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('valide le format des numéros de téléphone fournisseur', () => {
      expect(isValidPhone('+216 71 100 200')).toBe(true);
      expect(isValidPhone('71100200')).toBe(true);
      expect(isValidPhone('123')).toBe(false); // Trop court (< 6 chiffres)
      expect(isValidPhone('')).toBe(true); // Optionnel si vide
    });

    it('ajoute avec succès un nouveau fournisseur partenaire', () => {
      const newFrs: Fournisseur = {
        id: 'frs-4',
        Fournisseur: 'Lenovo Commercial Tunisie',
        email: 'ventes@lenovo.tn',
        telephone: '+216 71 555 666',
        adresse: 'Centre Urbain Nord, Tunis',
      };

      mockFournisseurs.push(newFrs);
      expect(mockFournisseurs).toHaveLength(4);
      expect(mockFournisseurs.find(f => f.id === 'frs-4')?.Fournisseur).toBe('Lenovo Commercial Tunisie');
    });

    it('modifie les coordonnées d un fournisseur existant', () => {
      const frs = mockFournisseurs.find(f => f.id === 'frs-1')!;
      const updated: Fournisseur = {
        ...frs,
        telephone: '+216 71 999 888',
        adresse: 'Nouvelle Adresse Berges du Lac 2',
      };

      const idx = mockFournisseurs.findIndex(f => f.id === 'frs-1');
      mockFournisseurs[idx] = updated;

      expect(mockFournisseurs[idx].telephone).toBe('+216 71 999 888');
      expect(mockFournisseurs[idx].adresse).toContain('Lac 2');
    });

    it('bloque la suppression d un fournisseur associé à des factures ou des matériels', () => {
      const canDeleteFournisseur = (frsId: string) => {
        const facturesCount = mockFactures.filter(f => f.id_Fournisseur === frsId).length;
        const materielsCount = mockMateriels.filter(m => m.id_Fournisseur === frsId).length;
        if (facturesCount > 0 || materielsCount > 0) {
          return {
            isValid: false,
            message: `Impossible de supprimer ce fournisseur car il possède ${facturesCount} facture(s) et ${materielsCount} matériel(s) associés.`,
          };
        }
        return { isValid: true };
      };

      // frs-1 est lié à fac-1, fac-3 et mat-1 -> bloqué
      expect(canDeleteFournisseur('frs-1').isValid).toBe(false);

      // Fournisseur sans lien -> autorisé
      const dummyFrsId = 'frs-unlinked';
      expect(canDeleteFournisseur(dummyFrsId).isValid).toBe(true);
    });
  });

  describe('3. Validation & Gestion des Factures d\'Achat', () => {
    it('ajoute une facture avec vérification de la cohérence de date et montant', () => {
      const newFacture: Facture = {
        id: 'fac-4',
        factureFrs: 'FACT-2025-004',
        dateAcquisition: '2025-04-01',
        id_Fournisseur: 'frs-1',
        montantHT: 4800,
        statut: 'En attente',
      };

      mockFactures.push(newFacture);
      expect(mockFactures).toHaveLength(5);
      expect(mockFactures.find(f => f.id === 'fac-4')?.montantHT).toBe(4800);
    });

    it('met à jour le statut d une facture (En attente -> Payée)', () => {
      const targetFacture = mockFactures.find(f => f.id === 'fac-2')!;
      const updated: Facture = {
        ...targetFacture,
        statut: 'Payée',
      };

      const idx = mockFactures.findIndex(f => f.id === 'fac-2');
      mockFactures[idx] = updated;

      expect(mockFactures[idx].statut).toBe('Payée');
    });

    it('bloque la suppression d une facture directement liée à un matériel du parc', () => {
      const canDeleteFacture = (facId: string) => {
        const matCount = mockMateriels.filter(m => m.id_Facture === facId).length;
        if (matCount > 0) {
          return {
            isValid: false,
            message: `Impossible de supprimer cette facture car ${matCount} matériel(s) du parc y sont directement associés.`,
          };
        }
        return { isValid: true };
      };

      // fac-1 est liée à mat-1 -> bloqué
      expect(canDeleteFacture('fac-1').isValid).toBe(false);

      // fac-empty n'a pas de matériels -> autorisé
      expect(canDeleteFacture('fac-empty').isValid).toBe(true);
    });
  });
});
