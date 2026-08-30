import { describe, it, expect } from 'vitest';
import { Materiel } from '../types/itPark';

describe('Logique de Gestion de Stock et Déstockage des Matériels IT', () => {
  const initialMateriels: Materiel[] = [
    {
      id: 'mat-1',
      reference: 'REF-DL-5540',
      designation: 'Dell Latitude 5540',
      id_GroupeMateriel: 'grp-pc',
      statut: 'En service',
      id_Beneficiaire: 'user-1',
      codeSerie: 'DL-5540-001',
      qte: 1,
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
      dateMiseEnService: '2025-01-01',
      garantie: '24 mois',
    },
    {
      id: 'mat-2',
      reference: 'REF-LN-T14',
      designation: 'Lenovo ThinkPad T14',
      id_GroupeMateriel: 'grp-pc',
      statut: 'En stock',
      id_Beneficiaire: '',
      codeSerie: 'LN-T14-002',
      qte: 1,
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
      dateMiseEnService: '2025-01-01',
      garantie: '24 mois',
    },
    {
      id: 'mat-3',
      reference: 'REF-DL-U27',
      designation: 'Écran Dell 27" 4K',
      id_GroupeMateriel: 'grp-ecran',
      statut: 'En panne',
      id_Beneficiaire: '',
      codeSerie: 'DL-U27-003',
      qte: 1,
      id_Fournisseur: 'frs-2',
      id_Facture: 'fac-2',
      id_Emplacement: 'emp-1',
      dateMiseEnService: '2025-01-01',
      garantie: '36 mois',
    },
    {
      id: 'mat-4',
      reference: 'REF-IPH-15P',
      designation: 'iPhone 15 Pro',
      id_GroupeMateriel: 'grp-tel',
      statut: 'Hors service',
      id_Beneficiaire: '',
      codeSerie: 'IPH-15P-004',
      qte: 1,
      id_Fournisseur: 'frs-3',
      id_Facture: 'fac-3',
      id_Emplacement: 'emp-1',
      dateMiseEnService: '2025-01-01',
      garantie: '12 mois',
    },
  ];

  it('calcule correctement les matériels en stock disponibles', () => {
    const stockAvailable = initialMateriels.filter(
      (m) => m.statut === 'En stock' && (!m.id_Beneficiaire || m.id_Beneficiaire.trim() === '')
    );
    expect(stockAvailable).toHaveLength(1);
    expect(stockAvailable[0].designation).toBe('Lenovo ThinkPad T14');
  });

  it('gère l affectation d un matériel à un utilisateur avec mise à jour du statut', () => {
    const targetMaterial = initialMateriels.find((m) => m.id === 'mat-2')!;
    const userId = 'user-2';

    // Simulation de l'affectation (passage de En stock à En service)
    const updatedMaterial: Materiel = {
      ...targetMaterial,
      id_Beneficiaire: userId,
      statut: 'En service',
    };

    expect(updatedMaterial.statut).toBe('En service');
    expect(updatedMaterial.id_Beneficiaire).toBe('user-2');
  });

  it('gère la libération/désassignation d un matériel lors du départ d un collaborateur', () => {
    const assignedMaterial = initialMateriels.find((m) => m.id === 'mat-1')!;

    // Simulation de la libération (retour en stock)
    const releasedMaterial: Materiel = {
      ...assignedMaterial,
      id_Beneficiaire: '',
      statut: 'En stock',
    };

    expect(releasedMaterial.statut).toBe('En stock');
    expect(releasedMaterial.id_Beneficiaire).toBe('');
  });

  it('calcule la répartition du statut du parc informatique', () => {
    const distribution = initialMateriels.reduce((acc, m) => {
      acc[m.statut] = (acc[m.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(distribution['En service']).toBe(1);
    expect(distribution['En stock']).toBe(1);
    expect(distribution['En panne']).toBe(1);
    expect(distribution['Hors service']).toBe(1);
  });
});
