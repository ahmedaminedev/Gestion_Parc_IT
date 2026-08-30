import { describe, it, expect } from 'vitest';
import { Materiel, Facture, Reclamation, Fournisseur } from '../types/itPark';

describe('Suite Complète : Indicateurs Clés DSI, MTTR, Taux de Disponibilité & Tableaux de Bord', () => {
  const mockMateriels: Materiel[] = [
    {
      id: 'm1',
      reference: 'MAT-001',
      designation: 'Dell Latitude 5540',
      codeSerie: 'SN-001',
      qte: 1,
      montantHT: 3500,
      valeurPlafond: 3500,
      statut: 'En service',
      garantie: '24 mois',
      dateMiseEnService: '2025-01-01',
      id_GroupeMateriel: 'gm-pc',
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
    },
    {
      id: 'm2',
      reference: 'MAT-002',
      designation: 'Écran Dell 27 4K',
      codeSerie: 'SN-002',
      qte: 1,
      montantHT: 1200,
      valeurPlafond: 1200,
      statut: 'En stock',
      garantie: '36 mois',
      dateMiseEnService: '2025-01-01',
      id_GroupeMateriel: 'gm-ecran',
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
    },
    {
      id: 'm3',
      reference: 'MAT-003',
      designation: 'Imprimante HP Laser',
      codeSerie: 'SN-003',
      qte: 1,
      montantHT: 1800,
      valeurPlafond: 1800,
      statut: 'En panne',
      garantie: '12 mois',
      dateMiseEnService: '2024-01-01',
      id_GroupeMateriel: 'gm-imp',
      id_Fournisseur: 'frs-2',
      id_Facture: 'fac-2',
      id_Emplacement: 'emp-2',
    },
    {
      id: 'm4',
      reference: 'MAT-004',
      designation: 'Vieux PC Rebut',
      codeSerie: 'SN-004',
      qte: 1,
      montantHT: 800,
      valeurPlafond: 800,
      statut: 'Hors service',
      garantie: '0 mois',
      dateMiseEnService: '2020-01-01',
      id_GroupeMateriel: 'gm-pc',
      id_Fournisseur: 'frs-2',
      id_Facture: 'fac-2',
      id_Emplacement: 'emp-2',
    },
  ];

  const mockFactures: Facture[] = [
    { id: 'fac-1', factureFrs: 'FACT-2025-01', id_Fournisseur: 'frs-1', montantHT: 4700, statut: 'Payée', dateAcquisition: '2025-01-01' },
    { id: 'fac-2', factureFrs: 'FACT-2025-02', id_Fournisseur: 'frs-2', montantHT: 2600, statut: 'En attente', dateAcquisition: '2025-02-01' },
  ];

  const mockReclamations: Reclamation[] = [
    {
      id: 'rec-1',
      code: 'REC-001',
      titre: 'Panne écran',
      description: 'Écran noir',
      priorite: 'Haute',
      statut: 'Résolue',
      id_Demandeur: 'u1',
      createdAt: '2025-05-10T08:00:00Z',
      dateResolution: '2025-05-10T12:00:00Z', // 4 heures
      historique: [],
    },
    {
      id: 'rec-2',
      code: 'REC-002',
      titre: 'Problème Wi-Fi',
      description: 'Lenteur',
      priorite: 'Moyenne',
      statut: 'Résolue',
      id_Demandeur: 'u2',
      createdAt: '2025-05-11T09:00:00Z',
      dateResolution: '2025-05-11T17:00:00Z', // 8 heures
      historique: [],
    },
    {
      id: 'rec-3',
      code: 'REC-003',
      titre: 'Coupure serveur',
      description: 'Urgent',
      priorite: 'Urgente',
      statut: 'Ouverte',
      id_Demandeur: 'u1',
      createdAt: '2025-05-12T10:00:00Z',
      historique: [],
    },
  ];

  const mockFournisseurs: Fournisseur[] = [
    { id: 'frs-1', Fournisseur: 'Dell Technologies', email: 'support@dell.tn' },
    { id: 'frs-2', Fournisseur: 'HP Tunisie', email: 'contact@hp.tn' },
  ];

  describe('1. Calcul de la Valeur Totale du Parc Informatique (HT & TTC)', () => {
    it('calcule la somme exacte des valeurs d acquisition du parc matériel', () => {
      const totalHT = mockMateriels.reduce((sum, m) => sum + (m.montantHT || m.valeurPlafond || 0), 0);
      expect(totalHT).toBe(7300); // 3500 + 1200 + 1800 + 800
    });
  });

  describe('2. Calcul du Taux de Disponibilité Opérationnel (Fleet Availability)', () => {
    it('calcule le taux de disponibilité (En service / Total * 100)', () => {
      const total = mockMateriels.length;
      const enService = mockMateriels.filter(m => m.statut === 'En service').length;
      const tauxDisponibilite = (enService / total) * 100;

      expect(tauxDisponibilite).toBe(25); // 1 sur 4 = 25%
    });

    it('calcule le taux de matériels en stock et en panne', () => {
      const enStock = mockMateriels.filter(m => m.statut === 'En stock').length;
      const enPanne = mockMateriels.filter(m => m.statut === 'En panne').length;

      expect(enStock).toBe(1);
      expect(enPanne).toBe(1);
    });
  });

  describe('3. Calcul du MTTR (Mean Time to Resolution - Temps Moyen de Résolution)', () => {
    it('calcule le MTTR moyen en heures pour les tickets résolus', () => {
      const resolvedTickets = mockReclamations.filter(r => r.statut === 'Résolue' && r.dateResolution && r.createdAt);
      
      const totalHours = resolvedTickets.reduce((sum, r) => {
        const start = new Date(r.createdAt!).getTime();
        const end = new Date(r.dateResolution!).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0);

      const mttrMoyen = totalHours / resolvedTickets.length;
      expect(mttrMoyen).toBe(6); // (4h + 8h) / 2 = 6 heures
    });

    it('formate correctement le MTTR en texte lisible pour le dashboard', () => {
      const formatMttr = (hours: number) => {
        if (hours < 1) return `${Math.round(hours * 60)} min`;
        if (hours < 24) return `${hours.toFixed(1)} h`;
        const days = (hours / 24).toFixed(1);
        return `${days} j`;
      };

      expect(formatMttr(0.5)).toBe('30 min');
      expect(formatMttr(6)).toBe('6.0 h');
      expect(formatMttr(48)).toBe('2.0 j');
    });
  });

  describe('4. Score de Fiabilité et Taux de Panne Fournisseur', () => {
    it('calcule le taux de panne par fournisseur partenaire', () => {
      const stats = mockFournisseurs.map(frs => {
        const mats = mockMateriels.filter(m => m.id_Fournisseur === frs.id);
        const total = mats.length;
        const enPanne = mats.filter(m => m.statut === 'En panne').length;
        const tauxPanne = total > 0 ? (enPanne / total) * 100 : 0;
        const scoreFiabilite = Math.max(0, 100 - tauxPanne);

        return {
          id: frs.id,
          nom: frs.Fournisseur,
          total,
          enPanne,
          tauxPanne,
          scoreFiabilite,
        };
      });

      const dell = stats.find(s => s.id === 'frs-1')!;
      expect(dell.total).toBe(2);
      expect(dell.enPanne).toBe(0);
      expect(dell.scoreFiabilite).toBe(100);

      const hp = stats.find(s => s.id === 'frs-2')!;
      expect(hp.total).toBe(2);
      expect(hp.enPanne).toBe(1);
      expect(hp.tauxPanne).toBe(50);
      expect(hp.scoreFiabilite).toBe(50);
    });
  });

  describe('5. Répartition Financière des Factures par Statut', () => {
    it('agrège les montants et pourcentages par statut de facture', () => {
      const totalMontant = mockFactures.reduce((sum, f) => sum + f.montantHT, 0);
      const payees = mockFactures.filter(f => f.statut === 'Payée').reduce((sum, f) => sum + f.montantHT, 0);
      const enAttente = mockFactures.filter(f => f.statut === 'En attente').reduce((sum, f) => sum + f.montantHT, 0);

      expect(totalMontant).toBe(7300);
      expect(payees).toBe(4700);
      expect(enAttente).toBe(2600);

      const percentPayees = ((payees / totalMontant) * 100).toFixed(1);
      expect(percentPayees).toBe('64.4');
    });
  });
});
