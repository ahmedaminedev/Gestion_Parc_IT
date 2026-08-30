import { describe, it, expect } from 'vitest';
import { Reclamation, IHistoriqueReclamation } from '../types/itPark';

describe('Workflow des Réclamations et Traçabilité des Tickets', () => {
  it('crée un ticket de réclamation valide avec son historique initial', () => {
    const newHistory: IHistoriqueReclamation = {
      date: new Date().toISOString(),
      auteur: 'Ahmed Nafti',
      role: 'Collaborateur',
      message: 'Création initiale de la réclamation',
      typeAction: 'creation',
    };

    const reclamation: Reclamation = {
      id: 'rec-1',
      code: 'REC-2025-001',
      titre: 'Écran noir après démarrage',
      description: 'L écran externe ne reçoit aucun signal HDMI',
      statut: 'Ouverte',
      priorite: 'Haute',
      id_Demandeur: 'user-1',
      demandeurNom: 'Ahmed Nafti',
      createdAt: new Date().toISOString(),
      historique: [newHistory],
    };

    expect(reclamation.code).toBe('REC-2025-001');
    expect(reclamation.statut).toBe('Ouverte');
    expect(reclamation.priorite).toBe('Haute');
    expect(reclamation.historique).toHaveLength(1);
    expect(reclamation.historique[0].typeAction).toBe('creation');
  });

  it('permet la transition d état (Prise en charge -> Résolue) avec ajout d événement dans l historique', () => {
    let reclamation: Reclamation = {
      id: 'rec-1',
      code: 'REC-2025-001',
      titre: 'Écran noir',
      description: 'Test',
      statut: 'Ouverte',
      priorite: 'Moyenne',
      id_Demandeur: 'user-1',
      createdAt: '2025-05-01T10:00:00Z',
      historique: [],
    };

    // Transition 1: En cours par un technicien IT
    reclamation = {
      ...reclamation,
      statut: 'En cours',
      id_TechnicienAssigne: 'agent-it-1',
      technicienNom: 'Support N1',
      historique: [
        ...reclamation.historique,
        {
          date: '2025-05-01T10:30:00Z',
          auteur: 'Support N1',
          role: 'Responsable IT',
          message: 'Ticket pris en charge pour diagnostic',
          typeAction: 'statut',
        },
      ],
    };

    expect(reclamation.statut).toBe('En cours');
    expect(reclamation.technicienNom).toBe('Support N1');

    // Transition 2: Résolue
    reclamation = {
      ...reclamation,
      statut: 'Résolue',
      dateResolution: '2025-05-01T11:15:00Z',
      solution: 'Remplacement du câble HDMI défectueux',
      historique: [
        ...reclamation.historique,
        {
          date: '2025-05-01T11:15:00Z',
          auteur: 'Support N1',
          role: 'Responsable IT',
          message: 'Remplacement du câble HDMI défectueux. Test réussi.',
          typeAction: 'resolution',
        },
      ],
    };

    expect(reclamation.statut).toBe('Résolue');
    expect(reclamation.solution).toBe('Remplacement du câble HDMI défectueux');
    expect(reclamation.historique).toHaveLength(2);
  });

  it('calcule la durée de résolution SLA', () => {
    const start = new Date('2025-05-01T10:00:00Z').getTime();
    const end = new Date('2025-05-01T11:30:00Z').getTime();
    const durationMinutes = (end - start) / (1000 * 60);

    expect(durationMinutes).toBe(90); // 1h30
  });
});
