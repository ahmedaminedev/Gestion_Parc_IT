import { describe, it, expect } from 'vitest';

describe('Suite Complète de Tests : Moteur d\'Exportation et Génération de Rapports (CSV / Tableaux)', () => {
  // Helper de génération CSV standardisé
  const generateCsv = <T extends Record<string, any>>(data: T[], columns: { key: keyof T; label: string }[]) => {
    const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(';');
    const rows = data.map((item) =>
      columns
        .map((col) => {
          const val = item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(';')
    );
    return [headerRow, ...rows].join('\n');
  };

  const formatCurrencyTND = (amount: number) => {
    return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} TND`;
  };

  describe('1. Exportation CSV du Parc Matériel', () => {
    const mockMateriels = [
      {
        reference: 'MAT-001',
        designation: 'Dell Latitude 5540',
        statut: 'En service',
        codeSerie: 'DL-5540',
        montantHT: 3500,
      },
      {
        reference: 'MAT-002',
        designation: 'Écran 27" 4K',
        statut: 'En stock',
        codeSerie: 'DL-27-4K',
        montantHT: 1200,
      },
    ];

    it('génère un contenu CSV valide avec délimiteur point-virgule et guillemets échappés', () => {
      const columns = [
        { key: 'reference' as const, label: 'Référence' },
        { key: 'designation' as const, label: 'Désignation' },
        { key: 'statut' as const, label: 'Statut' },
        { key: 'montantHT' as const, label: 'Montant HT' },
      ];

      const csv = generateCsv(mockMateriels, columns);
      expect(csv).toContain('"Référence";"Désignation";"Statut";"Montant HT"');
      expect(csv).toContain('"MAT-001";"Dell Latitude 5540";"En service";"3500"');
      expect(csv).toContain('"MAT-002";"Écran 27"" 4K";"En stock";"1200"');
    });
  });

  describe('2. Exportation CSV des Factures & Calculs Financiers', () => {
    const mockFactures = [
      {
        factureFrs: 'FAC-2025-01',
        fournisseur: 'Dell Tunisie',
        montantHT: 10000,
        montantTTC: 11900,
        statut: 'Payée',
      },
    ];

    it('génère le tableau récapitulatif financier', () => {
      const columns = [
        { key: 'factureFrs' as const, label: 'N° Facture' },
        { key: 'fournisseur' as const, label: 'Fournisseur' },
        { key: 'montantHT' as const, label: 'Montant HT' },
        { key: 'montantTTC' as const, label: 'Montant TTC (19%)' },
        { key: 'statut' as const, label: 'État' },
      ];

      const csv = generateCsv(mockFactures, columns);
      expect(csv).toContain('"FAC-2025-01";"Dell Tunisie";"10000";"11900";"Payée"');
    });

    it('formate les montants financiers en devise TND', () => {
      expect(formatCurrencyTND(10000)).toBe('10 000.00 TND');
      expect(formatCurrencyTND(11900.5)).toBe('11 900.50 TND');
      expect(formatCurrencyTND(0)).toBe('0.00 TND');
    });
  });

  describe('3. Exportation des Réclamations & Traçabilité SLA', () => {
    const mockTickets = [
      {
        code: 'REC-2025-001',
        titre: 'Problème Wi-Fi',
        demandeur: 'Amine Nafti',
        priorite: 'Haute',
        slaHeures: '8h',
        statut: 'En cours',
      },
    ];

    it('génère le rapport d audit des réclamations', () => {
      const columns = [
        { key: 'code' as const, label: 'Code Ticket' },
        { key: 'titre' as const, label: 'Titre' },
        { key: 'demandeur' as const, label: 'Demandeur' },
        { key: 'priorite' as const, label: 'Priorité' },
        { key: 'slaHeures' as const, label: 'Délai SLA' },
        { key: 'statut' as const, label: 'Statut' },
      ];

      const csv = generateCsv(mockTickets, columns);
      expect(csv).toContain('"REC-2025-001";"Problème Wi-Fi";"Amine Nafti";"Haute";"8h";"En cours"');
    });
  });
});
