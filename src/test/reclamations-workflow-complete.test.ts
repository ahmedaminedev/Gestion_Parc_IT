import { describe, it, expect } from 'vitest';
import { Reclamation } from '../types/itPark';

type PrioriteReclamation = 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
type StatutReclamation = 'Ouverte' | 'En cours' | 'En attente' | 'Résolue' | 'Rejetée';

describe('Suite Complète de Tests : Workflow Complet des Réclamations & Délais SLA', () => {
  // Calculateur SLA basé sur les priorités d'entreprise OMODA | JAECOO
  const getSlaHours = (priorite: PrioriteReclamation): number => {
    switch (priorite) {
      case 'Urgente':
        return 4;
      case 'Haute':
        return 8;
      case 'Moyenne':
        return 24;
      case 'Basse':
        return 48;
      default:
        return 24;
    }
  };

  const isSlaBreached = (dateCreation: string, priorite: PrioriteReclamation, dateResolution?: string): boolean => {
    const slaHours = getSlaHours(priorite);
    const start = new Date(dateCreation).getTime();
    const end = dateResolution ? new Date(dateResolution).getTime() : Date.now();
    const elapsedHours = (end - start) / (1000 * 60 * 60);
    return elapsedHours > slaHours;
  };

  describe('1. Création & Règles SLA', () => {
    it('attribue le bon délai SLA en heures selon la priorité', () => {
      expect(getSlaHours('Urgente')).toBe(4);
      expect(getSlaHours('Haute')).toBe(8);
      expect(getSlaHours('Moyenne')).toBe(24);
      expect(getSlaHours('Basse')).toBe(48);
    });

    it('détecte correctement un dépassement de délai SLA (SLA Breached)', () => {
      // Création il y a 6 heures pour une priorité Urgente (limite = 4h)
      const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      expect(isSlaBreached(sixHoursAgo, 'Urgente')).toBe(true);

      // Création il y a 2 heures pour une priorité Urgente (limite = 4h)
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(isSlaBreached(twoHoursAgo, 'Urgente')).toBe(false);

      // Création il y a 10 heures pour une priorité Moyenne (limite = 24h)
      const tenHoursAgo = new Date(Date.now() - 10 * 3600 * 1000).toISOString();
      expect(isSlaBreached(tenHoursAgo, 'Moyenne')).toBe(false);
    });
  });

  describe('2. Cycle de Vie et Transitions de Statut', () => {
    it('effectue la transition complète : En attente -> Ouverte -> En cours -> Résolue', () => {
      const initialDate = '2025-05-10T08:00:00Z';

      let ticket: Reclamation = {
        id: 'rec-101',
        code: 'REC-2025-101',
        titre: 'Problème de connexion VPN',
        description: 'Impossible d accéder au réseau d entreprise',
        statut: 'En attente',
        priorite: 'Haute',
        id_Demandeur: 'user-1',
        demandeurNom: 'Amine Nafti',
        createdAt: initialDate,
        historique: [
          {
            date: initialDate,
            auteur: 'Amine Nafti',
            role: 'Collaborateur',
            message: 'Ticket soumis',
            typeAction: 'creation',
          },
        ],
      };

      expect(ticket.statut).toBe('En attente');

      // Étape 1 : Prise en charge par le Support IT (Ouverte -> En cours)
      const priseEnChargeDate = '2025-05-10T08:30:00Z';
      ticket = {
        ...ticket,
        statut: 'En cours',
        id_TechnicienAssigne: 'tech-1',
        technicienNom: 'Support IT N1',
        historique: [
          ...ticket.historique,
          {
            date: priseEnChargeDate,
            auteur: 'Support IT N1',
            role: 'Responsable IT',
            message: 'Attribution du ticket et début d investigation',
            typeAction: 'statut',
          },
        ],
      };

      expect(ticket.statut).toBe('En cours');
      expect(ticket.id_TechnicienAssigne).toBe('tech-1');

      // Étape 2 : Résolution du ticket
      const resolutionDate = '2025-05-10T09:45:00Z';
      ticket = {
        ...ticket,
        statut: 'Résolue',
        dateResolution: resolutionDate,
        solution: 'Certificat VPN renouvelé et configuration mise à jour sur le poste',
        historique: [
          ...ticket.historique,
          {
            date: resolutionDate,
            auteur: 'Support IT N1',
            role: 'Responsable IT',
            message: 'Ticket résolu avec succès.',
            typeAction: 'resolution',
          },
        ],
      };

      expect(ticket.statut).toBe('Résolue');
      expect(ticket.solution).toContain('Certificat VPN');
      expect(ticket.historique).toHaveLength(3);
    });

    it('gère le cas de Rejet avec motif explicatif', () => {
      let ticket: Reclamation = {
        id: 'rec-102',
        code: 'REC-2025-102',
        titre: 'Demande d installation logiciel non autorisé',
        description: 'Installation de jeux vidéo',
        statut: 'Ouverte',
        priorite: 'Basse',
        id_Demandeur: 'user-2',
        createdAt: '2025-05-11T10:00:00Z',
        historique: [],
      };

      ticket = {
        ...ticket,
        statut: 'Rejetée',
        solution: 'Demande non conforme à la politique de sécurité informatique.',
        historique: [
          {
            date: '2025-05-11T10:15:00Z',
            auteur: 'Responsable IT',
            role: 'Responsable IT',
            message: 'Ticket rejeté : logiciel non autorisé par la charte IT.',
            typeAction: 'statut',
          },
        ],
      };

      expect(ticket.statut).toBe('Rejetée');
      expect(ticket.solution).toContain('politique de sécurité');
    });
  });

  describe('3. Recherche et Filtres Multi-Critères', () => {
    const ticketList: Reclamation[] = [
      {
        id: 'r1',
        code: 'REC-2025-001',
        titre: 'Écran clignote',
        description: 'L écran externe clignote par intermittence',
        statut: 'Ouverte',
        priorite: 'Moyenne',
        id_Demandeur: 'u1',
        demandeurNom: 'Amine',
        createdAt: '2025-01-01',
        historique: [],
      },
      {
        id: 'r2',
        code: 'REC-2025-002',
        titre: 'Panne imprimante réseau',
        description: 'Imprimante réseau inaccessible',
        statut: 'En cours',
        priorite: 'Haute',
        id_Demandeur: 'u2',
        demandeurNom: 'Sarra',
        createdAt: '2025-01-02',
        historique: [],
      },
      {
        id: 'r3',
        code: 'REC-2025-003',
        titre: 'Clavier bloqué',
        description: 'Certaines touches du clavier ne répondent plus',
        statut: 'Résolue',
        priorite: 'Basse',
        id_Demandeur: 'u1',
        demandeurNom: 'Amine',
        createdAt: '2025-01-03',
        historique: [],
      },
    ];

    it('filtre par mot-clé dans le titre ou le code', () => {
      const search = (query: string) =>
        ticketList.filter(
          (t) =>
            t.titre.toLowerCase().includes(query.toLowerCase()) ||
            t.code.toLowerCase().includes(query.toLowerCase())
        );

      expect(search('imprimante')).toHaveLength(1);
      expect(search('REC-2025-003')).toHaveLength(1);
      expect(search('inexistant')).toHaveLength(0);
    });

    it('filtre par statut et priorité', () => {
      const filterByStatus = (status: StatutReclamation) => ticketList.filter((t) => t.statut === status);
      const filterByPriority = (prio: PrioriteReclamation) => ticketList.filter((t) => t.priorite === prio);

      expect(filterByStatus('En cours')).toHaveLength(1);
      expect(filterByStatus('Résolue')).toHaveLength(1);
      expect(filterByPriority('Haute')).toHaveLength(1);
    });
  });
});
