import { describe, it, expect } from 'vitest';
import {
  Materiel,
  GroupeMateriel,
  Fournisseur,
  Facture,
  Emplacement,
  GroupeEmplacement,
  Beneficiaire,
  Role,
} from '../types/itPark';

describe('Suite Complète de Tests : Entités du Parc IT, Relations & KPIs', () => {
  // Mock dataset
  const mockRoles: Role[] = [
    { id: 'r-1', nom: 'Responsable IT', description: 'Admin IT', couleur: 'blue', isSystem: true },
    { id: 'r-2', nom: 'Commercial', description: 'Équipe Vente', couleur: 'emerald', isSystem: false },
  ];

  const mockGroupesMateriel: GroupeMateriel[] = [
    { id: 'gm-1', Groupe: 'PC Portables', description: 'Laptops' },
    { id: 'gm-2', Groupe: 'Écrans & Moniteurs', description: 'Écrans 4K/2K' },
  ];

  const mockFournisseurs: Fournisseur[] = [
    {
      id: 'frs-1',
      Fournisseur: 'Dell Technologies Tunisie',
      telephone: '+216 71 000 111',
      email: 'contact@dell.tn',
      adresse: 'Les Berges du Lac 2, Tunis',
    },
    {
      id: 'frs-2',
      Fournisseur: 'Tunisie Bureautique Pro',
      telephone: '+216 71 222 333',
      email: 'sales@tbureautique.tn',
      adresse: 'Ariana',
    },
  ];

  const mockFactures: Facture[] = [
    {
      id: 'fac-1',
      factureFrs: 'FAC-DELL-2025-01',
      dateAcquisition: '2025-01-10',
      id_Fournisseur: 'frs-1',
      montantHT: 15000,
      statut: 'Payée',
    },
    {
      id: 'fac-2',
      factureFrs: 'FAC-TB-2025-02',
      dateAcquisition: '2025-02-15',
      id_Fournisseur: 'frs-2',
      montantHT: 4500,
      statut: 'En attente',
    },
  ];

  const mockGroupesEmplacement: GroupeEmplacement[] = [
    { id: 'ge-1', nom: 'Siège Social - Tunis', couleur: 'blue', icon: 'building' },
    { id: 'ge-2', nom: 'Showroom La Charguia', couleur: 'emerald', icon: 'warehouse' },
  ];

  const mockEmplacements: Emplacement[] = [
    { id: 'emp-1', emplacement1: 'Bureau IT & Direction', emplacement2: '1er Étage', id_GroupeEmplacement: 'ge-1' },
    { id: 'emp-2', emplacement1: 'Open Space Commercial', emplacement2: 'RDC', id_GroupeEmplacement: 'ge-1' },
    { id: 'emp-3', emplacement1: 'Comptoir Accueil Showroom', emplacement2: 'Hall Principal', id_GroupeEmplacement: 'ge-2' },
  ];

  const mockBeneficiaires: Beneficiaire[] = [
    {
      id: 'ben-1',
      beneficiaire: 'Amine Nafti',
      email: 'amine@omoda.tn',
      role: 'Responsable IT',
      id_Role: 'r-1',
      statut: 'Actif',
      id_Emplacement: 'emp-1',
      hasPassword: true,
      isITUser: true,
    },
    {
      id: 'ben-2',
      beneficiaire: 'Sarra Ben Salem',
      email: 'sarra@omoda.tn',
      role: 'Commercial',
      id_Role: 'r-2',
      statut: 'Actif',
      id_Emplacement: 'emp-2',
      hasPassword: true,
      isITUser: false,
    },
    {
      id: 'ben-3',
      beneficiaire: 'Khaled Mansour',
      email: 'khaled@omoda.tn',
      role: 'Commercial',
      id_Role: 'r-2',
      statut: 'Inactif',
      id_Emplacement: '',
      hasPassword: false,
      isITUser: false,
    },
  ];

  const mockMateriels: Materiel[] = [
    {
      id: 'mat-1',
      reference: 'MAT-2025-001',
      designation: 'Dell XPS 15',
      id_GroupeMateriel: 'gm-1',
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
      id_Beneficiaire: 'ben-1',
      statut: 'En service',
      codeSerie: 'SN-XPS-9520',
      qte: 1,
      montantHT: 5000,
      dateMiseEnService: '2025-01-11',
      garantie: '24 mois',
    },
    {
      id: 'mat-2',
      reference: 'MAT-2025-002',
      designation: 'Dell Latitude 5540',
      id_GroupeMateriel: 'gm-1',
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-2',
      id_Beneficiaire: 'ben-2',
      statut: 'En service',
      codeSerie: 'SN-LAT-5540',
      qte: 1,
      montantHT: 3500,
      dateMiseEnService: '2025-01-12',
      garantie: '24 mois',
    },
    {
      id: 'mat-3',
      reference: 'MAT-2025-003',
      designation: 'Écran Dell 27 4K',
      id_GroupeMateriel: 'gm-2',
      id_Fournisseur: 'frs-1',
      id_Facture: 'fac-1',
      id_Emplacement: 'emp-1',
      id_Beneficiaire: '',
      statut: 'En stock',
      codeSerie: 'SN-SCR-4K-01',
      qte: 1,
      montantHT: 1200,
      dateMiseEnService: '2025-01-15',
      garantie: '36 mois',
    },
    {
      id: 'mat-4',
      reference: 'MAT-2025-004',
      designation: 'Écran Dell 24 FHD',
      id_GroupeMateriel: 'gm-2',
      id_Fournisseur: 'frs-2',
      id_Facture: 'fac-2',
      id_Emplacement: 'emp-3',
      id_Beneficiaire: '',
      statut: 'En panne',
      codeSerie: 'SN-SCR-FHD-02',
      qte: 1,
      montantHT: 600,
      dateMiseEnService: '2025-02-16',
      garantie: '12 mois',
    },
  ];

  describe('1. Calculs et Cohérence du Stock Matériel', () => {
    it('calcule exactement le total des matériels et la répartition par statut', () => {
      const totalMat = mockMateriels.length;
      const enService = mockMateriels.filter((m) => m.statut === 'En service').length;
      const enStock = mockMateriels.filter((m) => m.statut === 'En stock').length;
      const enPanne = mockMateriels.filter((m) => m.statut === 'En panne').length;

      expect(totalMat).toBe(4);
      expect(enService).toBe(2);
      expect(enStock).toBe(1);
      expect(enPanne).toBe(1);
    });

    it('calcule le taux d affectation matériel (En service / Total)', () => {
      const enService = mockMateriels.filter((m) => m.statut === 'En service').length;
      const taux = Math.round((enService / mockMateriels.length) * 100);
      expect(taux).toBe(50); // 2 sur 4 = 50%
    });

    it('calcule la valeur financière globale HT du parc matériel', () => {
      const totalValeurHT = mockMateriels.reduce((sum, m) => sum + (m.montantHT || 0), 0);
      expect(totalValeurHT).toBe(10300); // 5000 + 3500 + 1200 + 600
    });
  });

  describe('2. Relations et Jointures Inter-Entités', () => {
    it('retrouve les matériels affectés à un collaborateur donné', () => {
      const getMaterialsForUser = (userId: string) => mockMateriels.filter((m) => m.id_Beneficiaire === userId);

      const user1Materials = getMaterialsForUser('ben-1');
      expect(user1Materials).toHaveLength(1);
      expect(user1Materials[0].designation).toBe('Dell XPS 15');

      const user3Materials = getMaterialsForUser('ben-3');
      expect(user3Materials).toHaveLength(0);
    });

    it('compte les collaborateurs par emplacement physique', () => {
      const countUsersPerLocation = (locId: string) =>
        mockBeneficiaires.filter((b) => b.id_Emplacement === locId && b.statut === 'Actif').length;

      expect(countUsersPerLocation('emp-1')).toBe(1);
      expect(countUsersPerLocation('emp-2')).toBe(1);
      expect(countUsersPerLocation('emp-3')).toBe(0);
    });

    it('associe correctement les factures à leur fournisseur', () => {
      const getInvoicesForSupplier = (frsId: string) => mockFactures.filter((f) => f.id_Fournisseur === frsId);
      const dellInvoices = getInvoicesForSupplier('frs-1');
      expect(dellInvoices).toHaveLength(1);
      expect(dellInvoices[0].factureFrs).toBe('FAC-DELL-2025-01');
    });

    it('vérifie la correspondance des rôles et groupes de matériels', () => {
      expect(mockRoles).toHaveLength(2);
      expect(mockGroupesMateriel).toHaveLength(2);
      expect(mockGroupesEmplacement).toHaveLength(2);
      expect(mockEmplacements).toHaveLength(3);
      expect(mockFournisseurs).toHaveLength(2);
    });
  });
});
