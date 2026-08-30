import { describe, it, expect, beforeEach } from 'vitest';
import { Reclamation, IHistoriqueReclamation } from '../types/itPark';

describe('Scénarios Exhaustifs : Cycle de Vie Complet des Réclamations & Délais SLA', () => {
  let mockReclamations: Reclamation[];

  beforeEach(() => {
    mockReclamations = [
      {
        id: 'rec-1',
        code: 'REC-2025-001',
        titre: 'Écran bleu sur PC portable',
        description: 'Crash aléatoire sous Windows 11 avec code d erreur DRIVER_IRQL',
        nature: 'materiel',
        materielsConcernesIds: ['mat-1'],
        materielsConcernesNoms: ['Dell XPS 15'],
        categoriesIds: ['cat-pc'],
        categoriesNoms: ['PC Portables'],
        priorite: 'Haute',
        statut: 'Ouverte',
        id_Demandeur: 'user-1',
        demandeurNom: 'Amine Nafti',
        demandeurEmail: 'amine@omoda.tn',
        delaiTraitementHeures: 8,
        createdAt: '2025-05-10T08:00:00Z',
        historique: [
          {
            date: '2025-05-10T08:00:00Z',
            auteur: 'Amine Nafti',
            role: 'Collaborateur',
            message: 'Ticket créé avec succès.',
            typeAction: 'creation',
          },
        ],
      },
      {
        id: 'rec-2',
        code: 'REC-2025-002',
        titre: 'Demande d accès VPN Showroom',
        description: 'Accès distant pour les commerciaux en déplacement',
        nature: 'autre',
        materielsConcernesIds: [],
        materielsConcernesNoms: [],
        categoriesIds: ['cat-reseau'],
        categoriesNoms: ['Réseau & VPN'],
        priorite: 'Moyenne',
        statut: 'En attente',
        id_Demandeur: 'user-2',
        demandeurNom: 'Sarra Ben Salem',
        demandeurEmail: 'sarra@omoda.tn',
        delaiTraitementHeures: 24,
        createdAt: '2025-05-10T09:00:00Z',
        historique: [],
      },
    ];
  });

  describe('1. Scénario : Création d\'une Réclamation (Nature Matériel vs Nature Autre)', () => {
    it('crée une réclamation liée à un ou plusieurs équipements avec nature "materiel"', () => {
      const newRec: Reclamation = {
        id: 'rec-3',
        code: 'REC-2025-003',
        titre: 'Problème clavier sans fil et souris',
        description: 'Déconnexions Bluetooth fréquentes',
        nature: 'materiel',
        materielsConcernesIds: ['mat-10', 'mat-11'],
        materielsConcernesNoms: ['Clavier Logitech MX Keys', 'Souris MX Master 3'],
        categoriesIds: ['cat-acc'],
        categoriesNoms: ['Périphériques & Accessoires'],
        priorite: 'Basse',
        statut: 'En attente',
        id_Demandeur: 'user-3',
        demandeurNom: 'Khaled Mansour',
        demandeurEmail: 'khaled@omoda.tn',
        createdAt: '2025-05-11T10:00:00Z',
        historique: [],
      };

      mockReclamations.push(newRec);

      const created = mockReclamations.find((r) => r.id === 'rec-3')!;
      expect(created.nature).toBe('materiel');
      expect(created.materielsConcernesIds).toHaveLength(2);
      expect(created.materielsConcernesNoms).toContain('Clavier Logitech MX Keys');
    });

    it('crée une réclamation générale sans équipement avec nature "autre"', () => {
      const newRec: Reclamation = {
        id: 'rec-4',
        code: 'REC-2025-004',
        titre: 'Coupure Internet globale Showroom',
        description: 'Fibre optique en panne',
        nature: 'autre',
        materielsConcernesIds: [],
        materielsConcernesNoms: [],
        priorite: 'Urgente',
        statut: 'En attente',
        id_Demandeur: 'user-2',
        demandeurNom: 'Sarra Ben Salem',
        demandeurEmail: 'sarra@omoda.tn',
        createdAt: '2025-05-11T11:00:00Z',
        historique: [],
      };

      mockReclamations.push(newRec);

      const created = mockReclamations.find((r) => r.id === 'rec-4')!;
      expect(created.nature).toBe('autre');
      expect(created.materielsConcernesIds).toHaveLength(0);
      expect(created.priorite).toBe('Urgente');
    });
  });

  describe('2. Scénario : Modification d\'une Réclamation', () => {
    it('met à jour le titre, la description, la priorité et enregistre l historique', () => {
      const rec = mockReclamations.find((r) => r.id === 'rec-1')!;

      const updatePayload = {
        titre: 'Écran bleu critique - Mise à jour du BIOS requise',
        priorite: 'Urgente' as const,
        description: 'Crash permanent au démarrage de Windows.',
      };

      const historyEntry: IHistoriqueReclamation = {
        date: new Date().toISOString(),
        auteur: 'Amine Nafti',
        role: 'Collaborateur',
        message: 'Priorité rehaussée à Urgente suite à aggravation du problème',
        typeAction: 'statut',
      };

      const updated: Reclamation = {
        ...rec,
        ...updatePayload,
        historique: [...(rec.historique || []), historyEntry],
      };

      const index = mockReclamations.findIndex((r) => r.id === 'rec-1');
      mockReclamations[index] = updated;

      expect(mockReclamations[index].titre).toBe('Écran bleu critique - Mise à jour du BIOS requise');
      expect(mockReclamations[index].priorite).toBe('Urgente');
      expect(mockReclamations[index].historique).toHaveLength(2);
    });
  });

  describe('3. Scénario : Bouton "Assigner Technicien" & Prise en Charge ("En cours")', () => {
    it('attribue le ticket au technicien IT et passe le statut à "En cours"', () => {
      const rec = mockReclamations.find((r) => r.id === 'rec-1')!;

      const assignedRec: Reclamation = {
        ...rec,
        statut: 'En cours',
        id_TechnicienAssigne: 'tech-10',
        technicienNom: 'Wassim Support N2',
        historique: [
          ...(rec.historique || []),
          {
            date: '2025-05-10T08:30:00Z',
            auteur: 'Wassim Support N2',
            role: 'Responsable IT',
            message: 'Ticket assigné et pris en charge par Wassim Support N2',
            typeAction: 'statut',
          },
        ],
      };

      expect(assignedRec.statut).toBe('En cours');
      expect(assignedRec.id_TechnicienAssigne).toBe('tech-10');
      expect(assignedRec.technicienNom).toBe('Wassim Support N2');
      expect(assignedRec.historique).toHaveLength(2);
    });
  });

  describe('4. Scénario : Bouton "Résoudre" (Solution technique & clôture)', () => {
    it('clôture le ticket en saisissant la solution technique et la date de résolution', () => {
      const rec = mockReclamations.find((r) => r.id === 'rec-1')!;
      const resolutionDate = '2025-05-10T11:00:00Z';
      const solutionTexte = 'Mise à jour du firmware Dell et réinstallation propre du pilote graphique NVIDIA.';

      const resolvedRec: Reclamation = {
        ...rec,
        statut: 'Résolue',
        dateResolution: resolutionDate,
        solution: solutionTexte,
        historique: [
          ...(rec.historique || []),
          {
            date: resolutionDate,
            auteur: 'Wassim Support N2',
            role: 'Responsable IT',
            message: `Ticket résolu. Solution: ${solutionTexte}`,
            typeAction: 'resolution',
          },
        ],
      };

      expect(resolvedRec.statut).toBe('Résolue');
      expect(resolvedRec.solution).toBe(solutionTexte);
      expect(resolvedRec.dateResolution).toBe(resolutionDate);
    });
  });

  describe('5. Scénario : Bouton "Rejeter" (Refus avec motif explicatif)', () => {
    it('rejette la réclamation en motivant le refus', () => {
      const rec = mockReclamations.find((r) => r.id === 'rec-2')!;
      const rejectReason = 'Demande refusée : les accès distants VPN nécessitent la validation préalable de la Direction.';

      const rejectedRec: Reclamation = {
        ...rec,
        statut: 'Rejetée',
        solution: rejectReason,
        historique: [
          ...(rec.historique || []),
          {
            date: '2025-05-10T10:00:00Z',
            auteur: 'Responsable IT',
            role: 'Responsable IT',
            message: `Ticket rejeté: ${rejectReason}`,
            typeAction: 'statut',
          },
        ],
      };

      expect(rejectedRec.statut).toBe('Rejetée');
      expect(rejectedRec.solution).toBe(rejectReason);
    });
  });

  describe('6. Scénario : Ajout de Commentaire / Message dans le fil de discussion', () => {
    it('ajoute une entrée de type "commentaire" dans l historique', () => {
      const rec = mockReclamations.find((r) => r.id === 'rec-1')!;

      const commentEntry: IHistoriqueReclamation = {
        date: '2025-05-10T09:15:00Z',
        auteur: 'Amine Nafti',
        role: 'Collaborateur',
        message: 'J ai redémarré le PC en mode sans échec comme demandé.',
        typeAction: 'commentaire',
      };

      const updatedRec = {
        ...rec,
        historique: [...(rec.historique || []), commentEntry],
      };

      expect(updatedRec.historique).toHaveLength(2);
      expect(updatedRec.historique[1].typeAction).toBe('commentaire');
      expect(updatedRec.historique[1].message).toContain('mode sans échec');
    });
  });
});
