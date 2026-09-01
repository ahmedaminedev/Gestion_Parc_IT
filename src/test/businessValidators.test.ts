import { describe, it, expect, vi } from 'vitest';
import {
  normalizeString,
  escapeRegex,
  getExclusionFilter,
  isValidEmail,
  isValidPhone,
  validateGroupeEmplacementData,
  validateEmplacementData,
  validateFournisseurData,
  validateFactureData,
  validateGroupeMaterielData,
  validateMaterielData,
  validateUserData,
} from '../../Backend/validators/businessValidators';
import { Fournisseur } from '../../Backend/models/Fournisseur';
import { Materiel } from '../../Backend/models/Materiel';

describe('Backend Business Validators Unit Tests', () => {
  describe('String utility and format validators', () => {
    it('normalizeString should remove accents, extra whitespace and lowercase strings', () => {
      expect(normalizeString('  Élément   Informatique  ')).toBe('element informatique');
      expect(normalizeString('')).toBe('');
      expect(normalizeString(null as any)).toBe('');
    });

    it('escapeRegex should escape special regex characters', () => {
      expect(escapeRegex('item[1].*+')).toBe('item\\[1\\]\\.\\*\\+');
      expect(escapeRegex('')).toBe('');
    });

    it('getExclusionFilter returns correct exclusion structure', () => {
      expect(getExclusionFilter()).toEqual({});
      expect(getExclusionFilter('')).toEqual({});
      expect(getExclusionFilter('custom-id-123')).toEqual({ id: { $ne: 'custom-id-123' } });
    });

    it('isValidPhone validates optional standard phone numbers', () => {
      expect(isValidPhone('+216 71 123 456')).toBe(true);
      expect(isValidPhone('06 12 34 56 78')).toBe(true);
      expect(isValidPhone('12')).toBe(false);
      expect(isValidPhone('')).toBe(true);
    });

    it('isValidEmail validates standard email addresses', () => {
      expect(isValidEmail('test@omoda-jaecoo.tn')).toBe(true);
      expect(isValidEmail('admin.support@domain.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Model business validation functions', () => {
    it('validateGroupeEmplacementData validates required name', async () => {
      const res = await validateGroupeEmplacementData({ nom: '' });
      expect(res.isValid).toBe(false);
      expect(res.field).toBe('nom');
    });

    it('validateEmplacementData checks emplacement1 and emplacement2 presence', async () => {
      const res1 = await validateEmplacementData({ emplacement1: '', emplacement2: '' });
      expect(res1.isValid).toBe(false);
      expect(res1.field).toBe('emplacement1');

      const res2 = await validateEmplacementData({ emplacement1: 'Bureau 101', emplacement2: '', id_GroupeEmplacement: 'g1' });
      expect(res2.isValid).toBe(false);
      expect(res2.field).toBe('emplacement2');
    });

    it('validateFournisseurData checks nom, email and telephone validity', async () => {
      vi.spyOn(Fournisseur, 'find').mockResolvedValue([] as any);

      const res1 = await validateFournisseurData({ Fournisseur: '' });
      expect(res1.isValid).toBe(false);

      const res2 = await validateFournisseurData({ Fournisseur: 'Dell TN', email: 'invalid-email' });
      expect(res2.isValid).toBe(false);
      expect(res2.field).toBe('email');

      const res3 = await validateFournisseurData({ Fournisseur: 'Dell TN', telephone: '12' });
      expect(res3.isValid).toBe(false);
      expect(res3.field).toBe('telephone');
    });

    it('validateFactureData checks factureFrs and montant validity', async () => {
      const res1 = await validateFactureData({ factureFrs: '' });
      expect(res1.isValid).toBe(false);
      expect(res1.field).toBe('factureFrs');

      const res2 = await validateFactureData({ factureFrs: 'FACT-2026-001', id_Fournisseur: 'f1', montantHT: -50, dateAcquisition: '2026-01-01' });
      expect(res2.isValid).toBe(false);
      expect(res2.field).toBe('id_Fournisseur');
    });

    it('validateGroupeMaterielData checks nom', async () => {
      const res = await validateGroupeMaterielData({ nom: '' });
      expect(res.isValid).toBe(false);
      expect(res.field).toBe('nom');
    });

    it('validateMaterielData validates reference and designation', async () => {
      vi.spyOn(Materiel, 'findOne').mockResolvedValue(null);

      const res1 = await validateMaterielData({ reference: '' });
      expect(res1.isValid).toBe(false);
      expect(res1.field).toBe('reference');

      const res2 = await validateMaterielData({ reference: 'MAT-001', designation: '' });
      expect(res2.isValid).toBe(false);
      expect(res2.field).toBe('designation');
    });

    it('validateUserData validates beneficiary and email', async () => {
      const res1 = await validateUserData({ beneficiaire: '' });
      expect(res1.isValid).toBe(false);
      expect(res1.field).toBe('beneficiaire');

      const res2 = await validateUserData({ beneficiaire: 'Ali Ben', email: 'notanemail' });
      expect(res2.isValid).toBe(false);
      expect(res2.field).toBe('email');
    });
  });
});
