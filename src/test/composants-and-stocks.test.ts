import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateComposantData,
  isComposantEnStock
} from '../../Backend/validators/businessValidators';
import { Composant as ComposantModel } from '../../Backend/models/Composant';
import { Materiel as MaterielModel } from '../../Backend/models/Materiel';
import { itParkService } from '../services/itParkService';
import { Composant } from '../types/itPark';

describe('Composant & Stock Management Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ComposantModel, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(MaterielModel, 'findById').mockResolvedValue({ id: 'mat-test', _id: 'mat-test' } as any);
    vi.spyOn(MaterielModel, 'findOne').mockResolvedValue({ id: 'mat-test', _id: 'mat-test' } as any);
  });

  describe('1. Business Validators & Model Constraints', () => {
    it('isComposantEnStock: 0% must be en stock, any other utilisation is stock-1', () => {
      expect(isComposantEnStock('0%')).toBe(true);
      expect(isComposantEnStock('25%')).toBe(false);
      expect(isComposantEnStock('50%')).toBe(false);
      expect(isComposantEnStock('75%')).toBe(false);
      expect(isComposantEnStock('100%')).toBe(false);
      expect(isComposantEnStock('invalid' as any)).toBe(false);
    });

    it('requires REF_composant and trims whitespace', async () => {
      const result = await validateComposantData({
        REF_composant: '   ',
        nom: 'RAM DDR5',
        id_Materiel: 'mat-test',
        capaciteType: 'grammage',
        capaciteValeur: 500,
        capaciteUnite: 'g',
        utilisation: '0%'
      });

      expect(result.isValid).toBe(false);
      expect(result.field).toBe('REF_composant');
      expect(result.message).toContain('La référence du composant (REF_composant) est obligatoire');
    });

    it('rejects duplicate REF_composant', async () => {
      vi.spyOn(ComposantModel, 'findOne').mockResolvedValue({ id: 'comp-existing', REF_composant: 'COMP-DUPLICATE' } as any);

      const result = await validateComposantData({
        REF_composant: 'COMP-DUPLICATE',
        nom: 'RAM DDR5',
        id_Materiel: 'mat-test',
        capaciteType: 'grammage',
        capaciteValeur: 500,
        capaciteUnite: 'g',
        utilisation: '0%'
      });

      expect(result.isValid).toBe(false);
      expect(result.field).toBe('REF_composant');
      expect(result.message).toContain('existe déjà dans le système');
    });

    it('rejects invalid capaciteType', async () => {
      const result = await validateComposantData({
        REF_composant: 'COMP-001',
        nom: 'RAM DDR5',
        id_Materiel: 'mat-test',
        capaciteType: 'volume_invalide' as any,
        capaciteValeur: 500,
        capaciteUnite: 'g',
        utilisation: '0%'
      });

      expect(result.isValid).toBe(false);
      expect(result.field).toBe('capaciteType');
      expect(result.message).toContain('Le type de capacité doit être soit "grammage" soit "litrage"');
    });

    it('rejects negative capaciteValeur when provided', async () => {
      const resultNegative = await validateComposantData({
        REF_composant: 'COMP-001',
        nom: 'Liquide refroidissement',
        id_Materiel: 'mat-test',
        capaciteType: 'litrage',
        capaciteValeur: -2,
        capaciteUnite: 'l',
        utilisation: '0%'
      });
      expect(resultNegative.isValid).toBe(false);
      expect(resultNegative.field).toBe('capaciteValeur');
    });

    it('accepts composant without capacite fields (Volume and Unite are optional)', async () => {
      const resultNoCap = await validateComposantData({
        REF_composant: 'COMP-NOCAP',
        nom: 'Liquide d\'écriture Noir',
        id_Materiel: 'mat-test',
        utilisation: '0%'
      });
      expect(resultNoCap.isValid).toBe(true);
    });

    it('enforces unite matching: grammage allows only g and kg', async () => {
      // Valid grammage unit
      const validG = await validateComposantData({
        REF_composant: 'COMP-G',
        nom: 'Module RAM',
        id_Materiel: 'mat-test',
        capaciteType: 'grammage',
        capaciteValeur: 250,
        capaciteUnite: 'g',
        utilisation: '0%'
      });
      expect(validG.isValid).toBe(true);

      // Invalid grammage unit (e.g. 'l' or 'cl')
      const invalidG = await validateComposantData({
        REF_composant: 'COMP-INV-1',
        nom: 'Module RAM',
        id_Materiel: 'mat-test',
        capaciteType: 'grammage',
        capaciteValeur: 250,
        capaciteUnite: 'l' as any,
        utilisation: '0%'
      });
      expect(invalidG.isValid).toBe(false);
      expect(invalidG.field).toBe('capaciteUnite');
      expect(invalidG.message).toContain('Pour une capacité en grammage, l\'unité doit être obligatoirement "g"');
    });

    it('enforces unite matching: litrage allows only l and cl', async () => {
      // Valid litrage unit
      const validL = await validateComposantData({
        REF_composant: 'COMP-L',
        nom: 'Liquide',
        id_Materiel: 'mat-test',
        capaciteType: 'litrage',
        capaciteValeur: 1,
        capaciteUnite: 'l',
        utilisation: '0%'
      });
      expect(validL.isValid).toBe(true);

      // Invalid litrage unit (e.g. 'kg')
      const invalidL = await validateComposantData({
        REF_composant: 'COMP-INV-2',
        nom: 'Liquide',
        id_Materiel: 'mat-test',
        capaciteType: 'litrage',
        capaciteValeur: 1,
        capaciteUnite: 'kg' as any,
        utilisation: '0%'
      });
      expect(invalidL.isValid).toBe(false);
      expect(invalidL.field).toBe('capaciteUnite');
      expect(invalidL.message).toContain('Pour une capacité en litrage, l\'unité doit être obligatoirement "l"');
    });

    it('enforces utilisation to be in 0%, 25%, 50%, 75%, 100%', async () => {
      const invalidUtil = await validateComposantData({
        REF_composant: 'COMP-UTIL',
        nom: 'Composant test',
        id_Materiel: 'mat-test',
        capaciteType: 'grammage',
        capaciteValeur: 100,
        capaciteUnite: 'g',
        utilisation: '45%' as any
      });
      expect(invalidUtil.isValid).toBe(false);
      expect(invalidUtil.field).toBe('utilisation');
      expect(invalidUtil.message).toContain('Le niveau d\'utilisation doit être l\'une des valeurs exactes');
    });
  });

  describe('2. itParkService Composants State & Operations', () => {
    beforeEach(() => {
      // Initialize itParkService state with test dataset
      itParkService.setLocalForTesting({
        materiels: [
          {
            id: 'MAT-1',
            reference: 'PC-DEV-01',
            designation: 'Station HP ZBook 17',
            statut: 'En stock',
            id_GroupeMateriel: 'GRP-PC',
            valeurPlafond: 3500,
            qte: 1,
            codeSerie: 'SN-HP-001',
            id_Fournisseur: 'F1',
            id_Emplacement: 'EMP-SIEGE',
            id_Facture: 'FAC-1',
            dateMiseEnService: '2025-01-01',
            garantie: '2 ans'
          },
          {
            id: 'MAT-2',
            reference: 'SRV-PROD-01',
            designation: 'Serveur Dell PowerEdge',
            statut: 'En service',
            id_GroupeMateriel: 'GRP-SRV',
            valeurPlafond: 8000,
            qte: 1,
            codeSerie: 'SN-DELL-999',
            id_Beneficiaire: 'BEN-1',
            id_Fournisseur: 'F1',
            id_Emplacement: 'EMP-DATACENTER',
            id_Facture: 'FAC-2',
            dateMiseEnService: '2024-06-01',
            garantie: '3 ans'
          }
        ],
        groupes: [
          { id: 'GRP-PC', Groupe: 'PC Portables & Stations', codeSerieObligatoire: true },
          { id: 'GRP-SRV', Groupe: 'Serveurs & Baies', codeSerieObligatoire: true }
        ],
        composants: [
          {
            id: 'COMP-1',
            REF_composant: 'RAM-DDR5-32G',
            nom: 'Module RAM DDR5 32Go',
            id_Materiel: 'MAT-1',
            capaciteType: 'grammage',
            capaciteValeur: 45,
            capaciteUnite: 'g',
            utilisation: '0%'
          },
          {
            id: 'COMP-2',
            REF_composant: 'TH-PASTE-01',
            nom: 'Pâte Thermique Noctua NT-H1',
            id_Materiel: 'MAT-1',
            capaciteType: 'grammage',
            capaciteValeur: 10,
            capaciteUnite: 'g',
            utilisation: '50%'
          },
          {
            id: 'COMP-3',
            REF_composant: 'COOL-LIQ-01',
            nom: 'Liquide de Refroidissement Datacenter',
            id_Materiel: 'MAT-2',
            capaciteType: 'litrage',
            capaciteValeur: 2,
            capaciteUnite: 'l',
            utilisation: '25%'
          }
        ]
      });
    });

    it('getComposants and getComposantsByMateriel return expected subsets', () => {
      const all = itParkService.getComposants();
      expect(all.length).toBe(3);

      const mat1Comps = itParkService.getComposantsByMateriel('MAT-1');
      expect(mat1Comps.length).toBe(2);
      expect(mat1Comps.some(c => c.REF_composant === 'RAM-DDR5-32G')).toBe(true);

      const mat2Comps = itParkService.getComposantsByMateriel('MAT-2');
      expect(mat2Comps.length).toBe(1);
      expect(mat2Comps[0].REF_composant).toBe('COOL-LIQ-01');
    });

    it('isComposantEnStock service method properly flags 0% vs other usage', () => {
      expect(itParkService.isComposantEnStock('0%')).toBe(true);
      expect(itParkService.isComposantEnStock('25%')).toBe(false);
      expect(itParkService.isComposantEnStock('50%')).toBe(false);
      expect(itParkService.isComposantEnStock('75%')).toBe(false);
      expect(itParkService.isComposantEnStock('100%')).toBe(false);
    });

    it('saveComposant creates a new component when valid', async () => {
      const newComp: Partial<Composant> = {
        REF_composant: 'SSD-NVME-2TB',
        nom: 'Disque NVMe 2To Samsung 990',
        id_Materiel: 'MAT-1',
        capaciteType: 'grammage',
        capaciteValeur: 60,
        capaciteUnite: 'g',
        utilisation: '0%'
      };

      const res = await itParkService.saveComposant(newComp);
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.REF_composant).toBe('SSD-NVME-2TB');

      const all = itParkService.getComposants();
      expect(all.length).toBe(4);
    });

    it('saveComposant prevents duplicate REF_composant', async () => {
      const duplicateComp: Partial<Composant> = {
        REF_composant: 'ram-ddr5-32g', // Case-insensitive duplicate of COMP-1
        nom: 'Autre RAM',
        id_Materiel: 'MAT-2',
        capaciteType: 'grammage',
        capaciteValeur: 50,
        capaciteUnite: 'g',
        utilisation: '0%'
      };

      const res = await itParkService.saveComposant(duplicateComp);
      expect(res.success).toBe(false);
      expect(res.message).toContain('existe déjà');
    });

    it('deleteComposant removes component correctly', async () => {
      const delRes = await itParkService.deleteComposant('COMP-2');
      expect(delRes.success).toBe(true);

      const all = itParkService.getComposants();
      expect(all.length).toBe(2);
      expect(all.find(c => c.id === 'COMP-2')).toBeUndefined();
    });
  });

  describe('3. Dynamic Stock Calculations & Per-Group / Global Consolidation', () => {
    beforeEach(() => {
      itParkService.setLocalForTesting({
        materiels: [
          // GRP-PC: 2 in stock, 1 in service
          { id: 'M-1', reference: 'PC-1', designation: 'PC 1', statut: 'En stock', id_GroupeMateriel: 'GRP-PC', valeurPlafond: 1000, qte: 1, dateMiseEnService: '', garantie: '', codeSerie: 'SN1', id_Fournisseur: 'F1', id_Facture: 'FAC-1', id_Emplacement: 'EMP-1' },
          { id: 'M-2', reference: 'PC-2', designation: 'PC 2', statut: 'En stock', id_GroupeMateriel: 'GRP-PC', valeurPlafond: 1000, qte: 1, dateMiseEnService: '', garantie: '', codeSerie: 'SN2', id_Fournisseur: 'F1', id_Facture: 'FAC-1', id_Emplacement: 'EMP-1' },
          { id: 'M-3', reference: 'PC-3', designation: 'PC 3', statut: 'En service', id_GroupeMateriel: 'GRP-PC', id_Beneficiaire: 'B1', valeurPlafond: 1000, qte: 1, dateMiseEnService: '', garantie: '', codeSerie: 'SN3', id_Fournisseur: 'F1', id_Facture: 'FAC-1', id_Emplacement: 'EMP-1' },
          // GRP-SRV: 0 in stock, 1 in service, 1 en panne
          { id: 'M-4', reference: 'SRV-1', designation: 'SRV 1', statut: 'En service', id_GroupeMateriel: 'GRP-SRV', id_Beneficiaire: 'B2', valeurPlafond: 2000, qte: 1, dateMiseEnService: '', garantie: '', codeSerie: 'SN4', id_Fournisseur: 'F1', id_Facture: 'FAC-1', id_Emplacement: 'EMP-1' },
          { id: 'M-5', reference: 'SRV-2', designation: 'SRV 2', statut: 'En panne', id_GroupeMateriel: 'GRP-SRV', valeurPlafond: 2000, qte: 1, dateMiseEnService: '', garantie: '', codeSerie: 'SN5', id_Fournisseur: 'F1', id_Facture: 'FAC-1', id_Emplacement: 'EMP-1' },
        ],
        groupes: [
          { id: 'GRP-PC', Groupe: 'Ordinateurs' },
          { id: 'GRP-SRV', Groupe: 'Serveurs' }
        ],
        composants: [
          // GRP-PC components (linked to M-1 and M-2):
          // M-1: 1 at 0% (en stock)
          { id: 'C-1', REF_composant: 'REF-C1', nom: 'Composant 1', id_Materiel: 'M-1', capaciteType: 'grammage', capaciteValeur: 100, capaciteUnite: 'g', utilisation: '0%' },
          // M-2: 1 at 25% (stock - 1)
          { id: 'C-2', REF_composant: 'REF-C2', nom: 'Composant 2', id_Materiel: 'M-2', capaciteType: 'grammage', capaciteValeur: 200, capaciteUnite: 'g', utilisation: '25%' },
          // GRP-SRV components (linked to M-4):
          // M-4: 1 at 0% (en stock)
          { id: 'C-3', REF_composant: 'REF-C3', nom: 'Composant 3', id_Materiel: 'M-4', capaciteType: 'litrage', capaciteValeur: 5, capaciteUnite: 'l', utilisation: '0%' },
          // M-4: 1 at 100% (épuisé / stock - 1)
          { id: 'C-4', REF_composant: 'REF-C4', nom: 'Composant 4', id_Materiel: 'M-4', capaciteType: 'litrage', capaciteValeur: 50, capaciteUnite: 'cl', utilisation: '100%' },
        ]
      });
    });

    it('calculates accurate group stocks and component stocks', () => {
      const summary = itParkService.getStocksSummary();

      // Total Matériels = 5 (2 stock, 2 service, 1 panne)
      expect(summary.totalMateriels).toBe(5);
      expect(summary.materielsEnStock).toBe(2);
      expect(summary.materielsEnService).toBe(2);
      expect(summary.materielsEnPanne).toBe(1);

      // Total Composants = 4 (2 en stock à 0%, 2 consommés >0%)
      expect(summary.totalComposants).toBe(4);
      expect(summary.composantsEnStock).toBe(2);
      expect(summary.composantsSortisDuStock).toBe(2);

      // Consolidated Global Stock (calculated dynamically, not stored in DB)
      // Stock Global = Matériels en stock (2) + Composants en stock à 0% (2) = 4
      expect(summary.stockGlobalCalcule).toBe(4);

      // Availability Rate = (4 / 9) * 100 = 44.4%
      expect(summary.tauxDisponibiliteGlobal).toBe(44.4);

      // Per-group verification
      const pcGroup = summary.groupesStock.find(g => g.idGroupe === 'GRP-PC');
      expect(pcGroup).toBeDefined();
      expect(pcGroup?.totalMateriels).toBe(3);
      expect(pcGroup?.enStock).toBe(2);
      expect(pcGroup?.enService).toBe(1);
      expect(pcGroup?.composantsAssociesCount).toBe(2);
      expect(pcGroup?.composantsEnStock).toBe(1); // C-1 at 0%
      expect(pcGroup?.composantsEnService).toBe(1); // C-2 at 25%

      const srvGroup = summary.groupesStock.find(g => g.idGroupe === 'GRP-SRV');
      expect(srvGroup).toBeDefined();
      expect(srvGroup?.totalMateriels).toBe(2);
      expect(srvGroup?.enStock).toBe(0);
      expect(srvGroup?.enService).toBe(1);
      expect(srvGroup?.enPanne).toBe(1);
      expect(srvGroup?.composantsAssociesCount).toBe(2);
      expect(srvGroup?.composantsEnStock).toBe(1); // C-3 at 0%
      expect(srvGroup?.composantsEpuises).toBe(1); // C-4 at 100%
    });

    it('calculates metrics by capacity type (grammage vs litrage)', () => {
      const summary = itParkService.getStocksSummary();

      // Grammage: C-1 (0%) and C-2 (25%)
      expect(summary.composantsSummary.parType.grammage.total).toBe(2);
      expect(summary.composantsSummary.parType.grammage.enStock).toBe(1);
      expect(summary.composantsSummary.parType.grammage.enCours).toBe(1);

      // Litrage: C-3 (0%) and C-4 (100%)
      expect(summary.composantsSummary.parType.litrage.total).toBe(2);
      expect(summary.composantsSummary.parType.litrage.enStock).toBe(1);
      expect(summary.composantsSummary.parType.litrage.enCours).toBe(1);

      // Usage distribution matrix
      expect(summary.composantsSummary.parUtilisation['0%']).toBe(2);
      expect(summary.composantsSummary.parUtilisation['25%']).toBe(1);
      expect(summary.composantsSummary.parUtilisation['50%']).toBe(0);
      expect(summary.composantsSummary.parUtilisation['75%']).toBe(0);
      expect(summary.composantsSummary.parUtilisation['100%']).toBe(1);
    });

    it('handles materials with 0 components (plain equipment without consumables)', () => {
      // Material with no components attached
      const plainMat = {
        id: 'MAT-NO-COMP',
        reference: 'REF-MOUSE-01',
        designation: 'Souris Optique USB',
        codeSerie: 'SN-MOUSE-999',
        qte: 1,
        statut: 'En stock' as const,
        id_GroupeMateriel: 'GRP-PC'
      };

      const comps = itParkService.getComposantsByMateriel(plainMat.id);
      expect(comps).toHaveLength(0);
    });

    it('handles printer with writing liquid / ink (litrage control: cl, l and usage levels)', async () => {
      const printerId = 'MAT-PRINTER-EPSON';
      const printerMat = {
        id: printerId,
        reference: 'REF-PRINT-01',
        designation: 'Imprimante Multifonction Epson L3250',
        codeSerie: 'SN-EPSON-4411',
        qte: 1,
        statut: 'En service' as const,
        id_GroupeMateriel: 'GRP-PC'
      };
      await itParkService.saveMateriel(printerMat as any);

      // Associated ink liquid (250 cl, 50% consumed)
      const blackInk = {
        id: 'COMP-INK-BK',
        REF_composant: 'INK-BK-77',
        nom: "Liquide d'écriture Noir HP/Epson",
        capaciteType: 'litrage' as const,
        capaciteValeur: 250,
        capaciteUnite: 'cl' as const,
        utilisation: '50%' as const,
        id_Materiel: printerId
      };

      // Associated cyan ink liquid (1 l, 0% en stock)
      const cyanInk = {
        id: 'COMP-INK-CYAN',
        REF_composant: 'INK-CYAN-88',
        nom: "Bouteille encre Cyan 1L",
        capaciteType: 'litrage' as const,
        capaciteValeur: 1,
        capaciteUnite: 'l' as const,
        utilisation: '0%' as const,
        id_Materiel: printerId
      };

      await itParkService.saveComposant(blackInk);
      await itParkService.saveComposant(cyanInk);

      const printerComps = itParkService.getComposantsByMateriel(printerId);
      expect(printerComps).toHaveLength(2);

      const bk = printerComps.find(c => c.id === 'COMP-INK-BK');
      expect(bk?.capaciteType).toBe('litrage');
      expect(bk?.capaciteValeur).toBe(250);
      expect(bk?.capaciteUnite).toBe('cl');
      expect(bk?.utilisation).toBe('50%');
      expect(itParkService.isComposantEnStock(bk?.utilisation)).toBe(false); // 50% = in service/stock - 1

      const cyan = printerComps.find(c => c.id === 'COMP-INK-CYAN');
      expect(cyan?.capaciteType).toBe('litrage');
      expect(cyan?.capaciteValeur).toBe(1);
      expect(cyan?.capaciteUnite).toBe('l');
      expect(cyan?.utilisation).toBe('0%');
      expect(itParkService.isComposantEnStock(cyan?.utilisation)).toBe(true); // 0% = En stock
    });
  });
});
