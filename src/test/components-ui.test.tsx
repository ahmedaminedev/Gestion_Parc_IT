// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormAlert } from '../components/common/FormAlert';

// Composant Badge de Statut Matériel
const StatutMaterielBadge: React.FC<{ statut: string }> = ({ statut }) => {
  const getBadgeClass = (s: string) => {
    switch (s) {
      case 'En service':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'En stock':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En panne':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Hors service':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      data-testid="statut-badge"
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeClass(
        statut
      )}`}
    >
      {statut}
    </span>
  );
};

// Composant Badge de Priorité Ticket
const PrioriteBadge: React.FC<{ priorite: string }> = ({ priorite }) => {
  const getPrioClass = (p: string) => {
    switch (p) {
      case 'Urgente':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Haute':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Moyenne':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Basse':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      data-testid="priorite-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getPrioClass(
        priorite
      )}`}
    >
      {priorite}
    </span>
  );
};

// Composant Badge de Statut Ticket
const StatutTicketBadge: React.FC<{ statut: string }> = ({ statut }) => {
  const getStatutClass = (s: string) => {
    switch (s) {
      case 'Ouverte':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En cours':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'En attente':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Résolue':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejetée':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      data-testid="statut-ticket-badge"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatutClass(
        statut
      )}`}
    >
      {statut}
    </span>
  );
};

describe('Suite Complète : Composants d\'Interface UI, Alertes & Badges Visuels', () => {
  describe('1. Badges de Statut Matériel', () => {
    it('affiche le badge « En service » avec le style émeraude approprié', () => {
      render(<StatutMaterielBadge statut="En service" />);
      const badge = screen.getByTestId('statut-badge');
      expect(badge).toHaveTextContent('En service');
      expect(badge.className).toContain('text-emerald-700');
    });

    it('affiche le badge « En stock » avec le style bleu', () => {
      render(<StatutMaterielBadge statut="En stock" />);
      const badge = screen.getByTestId('statut-badge');
      expect(badge).toHaveTextContent('En stock');
      expect(badge.className).toContain('text-blue-700');
    });

    it('affiche le badge « En panne » avec le style ambre', () => {
      render(<StatutMaterielBadge statut="En panne" />);
      const badge = screen.getByTestId('statut-badge');
      expect(badge).toHaveTextContent('En panne');
      expect(badge.className).toContain('text-amber-700');
    });

    it('affiche le badge « Hors service » avec le style rose/rouge', () => {
      render(<StatutMaterielBadge statut="Hors service" />);
      const badge = screen.getByTestId('statut-badge');
      expect(badge).toHaveTextContent('Hors service');
      expect(badge.className).toContain('text-rose-700');
    });
  });

  describe('2. Badges de Priorité Réclamation', () => {
    it('affiche la priorité Urgente avec le style d alerte rouge', () => {
      render(<PrioriteBadge priorite="Urgente" />);
      const badge = screen.getByTestId('priorite-badge');
      expect(badge).toHaveTextContent('Urgente');
      expect(badge.className).toContain('text-red-700');
    });

    it('affiche la priorité Haute avec le style orange', () => {
      render(<PrioriteBadge priorite="Haute" />);
      const badge = screen.getByTestId('priorite-badge');
      expect(badge).toHaveTextContent('Haute');
      expect(badge.className).toContain('text-orange-700');
    });

    it('affiche la priorité Moyenne avec le style ambre', () => {
      render(<PrioriteBadge priorite="Moyenne" />);
      const badge = screen.getByTestId('priorite-badge');
      expect(badge).toHaveTextContent('Moyenne');
      expect(badge.className).toContain('text-amber-700');
    });

    it('affiche la priorité Basse avec le style neutre', () => {
      render(<PrioriteBadge priorite="Basse" />);
      const badge = screen.getByTestId('priorite-badge');
      expect(badge).toHaveTextContent('Basse');
      expect(badge.className).toContain('text-slate-700');
    });
  });

  describe('3. Badges de Statut Ticket / Réclamation', () => {
    it('affiche le statut « Ouverte »', () => {
      render(<StatutTicketBadge statut="Ouverte" />);
      expect(screen.getByTestId('statut-ticket-badge')).toHaveTextContent('Ouverte');
    });

    it('affiche le statut « En cours »', () => {
      render(<StatutTicketBadge statut="En cours" />);
      expect(screen.getByTestId('statut-ticket-badge')).toHaveTextContent('En cours');
    });

    it('affiche le statut « Résolue »', () => {
      render(<StatutTicketBadge statut="Résolue" />);
      expect(screen.getByTestId('statut-ticket-badge')).toHaveTextContent('Résolue');
    });

    it('affiche le statut « Rejetée »', () => {
      render(<StatutTicketBadge statut="Rejetée" />);
      expect(screen.getByTestId('statut-ticket-badge')).toHaveTextContent('Rejetée');
    });
  });

  describe('4. Composant FormAlert (Messages de validation & alertes)', () => {
    it('rend correctement une alerte d erreur', () => {
      render(<FormAlert type="error" message="Le champ référence interne est obligatoire." />);
      expect(screen.getByText(/Le champ référence interne est obligatoire/i)).toBeInTheDocument();
    });

    it('rend correctement une alerte de succès', () => {
      render(<FormAlert type="success" message="Matériel enregistré avec succès." />);
      expect(screen.getByText(/Matériel enregistré avec succès/i)).toBeInTheDocument();
    });

    it('rend correctement un avertissement', () => {
      render(<FormAlert type="warning" message="Attention : ce matériel est sans garantie active." />);
      expect(screen.getByText(/Attention : ce matériel/i)).toBeInTheDocument();
    });
  });
});
