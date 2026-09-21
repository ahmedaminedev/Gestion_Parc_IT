import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Percent,
  Printer,
  Info,
  Check,
  ArrowRight,
  ArrowLeft,
  Lock,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import {
  Composant,
  LiquideEcriture,
  Materiel,
  TauxUtilisationComposant,
  CouleurImprimante,
  COULEURS_IMPRIMANTE,
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';
import { CustomConfirmModal } from '../common/CustomConfirmModal';

interface ComposantsSectionProps {
  isDSIAdmin: boolean;
  materiels: Materiel[];
  composants: (Composant | LiquideEcriture)[];
  onRefresh: () => void;
}

export const ComposantsSection: React.FC<ComposantsSectionProps> = ({
  isDSIAdmin,
  materiels,
  composants,
  onRefresh,
}) => {
  // Alertes
  const [sectionAlert, setSectionAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterielFilter, setSelectedMaterielFilter] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');

  // Modal Ajout / Modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Composant | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modèles / Références internes uniques de matériels (toutes catégories)
  const modelesRefs = useMemo(() => {
    const map = new Map<string, { ref: string; designation: string; count: number; machines: Materiel[] }>();
    for (const m of materiels) {
      const r = (m.reference || '').trim().toUpperCase();
      if (!r) continue;
      const entry = map.get(r);
      if (entry) {
        entry.count++;
        entry.machines.push(m);
      } else {
        map.set(r, { ref: r, designation: m.designation, count: 1, machines: [m] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.ref.localeCompare(b.ref));
  }, [materiels]);

  // Liste des imprimantes éligibles pour l'association d'un liquide d'écriture :
  // Imprimantes du parc avec décompte de leurs liquides existants (limite 4)
  const imprimantesDisponibles = useMemo(() => {
    const allGroups = itParkService.getGroupesMateriel();
    const map = new Map<string, {
      ref: string;
      designation: string;
      count: number;
      machines: Materiel[];
      statutLiquide: string;
      liquidesCount: number;
      existingLiquides: Array<Composant | LiquideEcriture>;
      isFull: boolean;
    }>();

    for (const m of materiels) {
      const r = (m.reference || '').trim().toUpperCase();
      if (!r) continue;

      // 1. Critère Imprimante :
      const grp = allGroups.find(g => g.id === m.id_GroupeMateriel);
      const isGrpImprimante = !!grp && (
        (grp.Groupe || '').toLowerCase().includes('imprim') ||
        ((grp as any).nom || '').toLowerCase().includes('imprim')
      );
      const isDesigImprimante = (m.designation || '').toLowerCase().includes('imprim') ||
                                (m.designation || '').toLowerCase().includes('printer') ||
                                (m.designation || '').toLowerCase().includes('copieur');
      const isImprimante = m.isImprimante === true || isGrpImprimante || isDesigImprimante;

      if (!isImprimante) {
        continue;
      }

      // 2. Liquides existants pour cette imprimante (modèle partagé par ref)
      const linkedComps = composants.filter(c => {
        const cRef = (c.refMateriel || c.id_Materiel || '').trim().toUpperCase();
        return cRef === r || c.id_Materiel === m.id;
      });

      const count = linkedComps.length;
      const isFull = count >= 4;
      const statutLiquide = count === 0
        ? 'Sans liquide (0/4)'
        : isFull
        ? 'Plein (4/4 liquides)'
        : `${count}/4 liquide(s) (${4 - count} place${4 - count > 1 ? 's' : ''} libre${4 - count > 1 ? 's' : ''})`;

      const entry = map.get(r);
      if (entry) {
        entry.count++;
        entry.machines.push(m);
      } else {
        map.set(r, {
          ref: r,
          designation: m.designation,
          count: 1,
          machines: [m],
          statutLiquide,
          liquidesCount: count,
          existingLiquides: linkedComps,
          isFull,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.ref.localeCompare(b.ref));
  }, [materiels, composants]);

  interface ComposantFormState {
    REF_composant: string;
    nom: string;
    couleur: CouleurImprimante;
    refMateriel: string;
    utilisation: TauxUtilisationComposant;
    description: string;
  }

  interface FormLiquideItem {
    REF_composant: string;
    nom: string;
    couleur: CouleurImprimante;
    utilisation: TauxUtilisationComposant;
    description?: string;
  }

  const getNextAvailableColor = (used: (string | undefined)[]): { id: CouleurImprimante; prefix: string; label: string } => {
    const list: Array<{ id: CouleurImprimante; prefix: string; label: string }> = [
      { id: 'Noir', prefix: 'BK', label: 'Noir' },
      { id: 'Cyan', prefix: 'CY', label: 'Cyan' },
      { id: 'Magenta', prefix: 'MG', label: 'Magenta' },
      { id: 'Jaune', prefix: 'YL', label: 'Jaune' },
    ];
    return list.find(c => !used.includes(c.id)) || list[0];
  };

  // Form State : lier à la référence interne en majuscules (refMateriel)
  const [form, setForm] = useState<ComposantFormState>({
    REF_composant: '',
    nom: '',
    couleur: 'Noir',
    refMateriel: '',
    utilisation: '0%',
    description: '',
  });

  // Pour création multiple de liquides
  const [multiLiquides, setMultiLiquides] = useState<FormLiquideItem[]>([]);

  // Modal Suppression
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [compToDelete, setCompToDelete] = useState<Composant | null>(null);

  // Onglet pour le modal d'édition : Page 1 (Infos & Contrôle couleur) ou Page 2 (Imprimantes assignées & Nouvelles assignations)
  const [editModalTab, setEditModalTab] = useState<'page1_infos' | 'page2_assignations'>('page1_infos');
  const [selectedTargetPrinters, setSelectedTargetPrinters] = useState<string[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [colorConflictWarning, setColorConflictWarning] = useState<string | null>(null);

  // Informations sur l'imprimante actuellement sélectionnée dans le modal
  const selectedPrinterInfo = useMemo(() => {
    const r = (form.refMateriel || '').trim().toUpperCase();
    if (!r) return null;
    return imprimantesDisponibles.find(p => p.ref === r) || null;
  }, [form.refMateriel, imprimantesDisponibles]);

  // Autres composants/liquides déjà assignés à cette même imprimante (hors liquide en cours d'édition)
  const otherCompsOnPrinter = useMemo(() => {
    if (!editingComp) return [];
    const currentRef = (form.refMateriel || editingComp.refMateriel || editingComp.id_Materiel || '').trim().toUpperCase();
    return composants.filter(c => {
      if (c.id === editingComp.id) return false;
      const cRef = (c.refMateriel || c.id_Materiel || '').trim().toUpperCase();
      return cRef === currentRef;
    });
  }, [composants, editingComp, form.refMateriel]);

  // Vérifier si une couleur est déjà occupée par un autre liquide de cette même imprimante
  const getConflictingCompForColor = (colorId: string) => {
    return otherCompsOnPrinter.find(c => (c.couleur || '').toLowerCase() === colorId.toLowerCase());
  };

  // Liste des imprimantes candidates pour une assignation (Page 2)
  // Critères demandés : imprimantes vides (0/4) ou dont le liquide restant est à 0%
  const eligiblePrintersForAssignation = useMemo(() => {
    const currentRef = (form.refMateriel || '').trim().toUpperCase();
    const currentColor = form.couleur || 'Noir';

    return imprimantesDisponibles.filter(p => {
      // Exclure l'imprimante déjà assignée actuellement
      if (p.ref.toUpperCase() === currentRef) return false;

      // 1. Imprimante vide (aucun liquide)
      if (p.liquidesCount === 0) return true;

      // 2. Imprimante avec moins de 4 liquides et dont cette couleur n'est pas encore occupée
      const hasSameColor = p.existingLiquides.some(
        c => (c.couleur || '').toLowerCase() === currentColor.toLowerCase()
      );
      if (!hasSameColor && p.liquidesCount < 4) return true;

      // 3. Imprimante ayant un liquide pour cette couleur dont l'utilisation est à 0% (en réserve/stock)
      const sameColorComp = p.existingLiquides.find(
        c => (c.couleur || '').toLowerCase() === currentColor.toLowerCase()
      );
      if (sameColorComp && sameColorComp.utilisation === '0%') return true;

      // 4. Imprimante ayant au moins un liquide à 0% et une place restante
      const hasZeroPercentLiquid = p.existingLiquides.some(c => c.utilisation === '0%');
      if (hasZeroPercentLiquid && p.liquidesCount <= 4) return true;

      return false;
    });
  }, [imprimantesDisponibles, form.refMateriel, form.couleur]);

  // Ouvrir modal pour créer
  const handleOpenCreateModal = () => {
    setModalAlert(null);
    setEditingComp(null);
    const nonFullPrinter = imprimantesDisponibles.find(p => !p.isFull);
    const defaultPrinter = nonFullPrinter || imprimantesDisponibles[0];
    const defaultRef = defaultPrinter ? defaultPrinter.ref : '';

    const existing = composants.filter(c => (c.refMateriel || c.id_Materiel || '').toUpperCase() === defaultRef.toUpperCase());
    const nextCol = getNextAvailableColor(existing.map(c => c.couleur));

    setForm({
      REF_composant: `LIQ-${nextCol.prefix}-${Math.floor(100 + Math.random() * 900)}`,
      nom: `Liquide d'écriture ${nextCol.label}`,
      couleur: nextCol.id,
      refMateriel: defaultRef,
      utilisation: '0%',
      description: '',
    });

    if (existing.length < 4) {
      setMultiLiquides([
        {
          REF_composant: `LIQ-${nextCol.prefix}-${Math.floor(100 + Math.random() * 900)}`,
          nom: `Liquide d'écriture ${nextCol.label}`,
          couleur: nextCol.id,
          utilisation: '0%',
          description: '',
        }
      ]);
    } else {
      setMultiLiquides([]);
    }

    setIsModalOpen(true);
  };

  // Changement de matériel dans le modal de création
  const handleSelectPrinterChange = (newRef: string) => {
    const cleanRef = newRef.toUpperCase();
    setForm(prev => ({ ...prev, refMateriel: cleanRef }));

    const existing = composants.filter(c => (c.refMateriel || c.id_Materiel || '').toUpperCase() === cleanRef);
    if (existing.length >= 4) {
      setMultiLiquides([]);
      return;
    }

    const availableSlots = 4 - existing.length;
    const nextCol = getNextAvailableColor(existing.map(c => c.couleur));

    setMultiLiquides(prev => {
      if (prev.length === 0) {
        return [{
          REF_composant: `LIQ-${nextCol.prefix}-${Math.floor(100 + Math.random() * 900)}`,
          nom: `Liquide d'écriture ${nextCol.label}`,
          couleur: nextCol.id,
          utilisation: '0%',
          description: '',
        }];
      }
      return prev.slice(0, availableSlots);
    });
  };

  // Ajouter un liquide supplémentaire dans le formulaire
  const handleAddMultiLiquide = () => {
    const existing = composants.filter(c => (c.refMateriel || c.id_Materiel || '').toUpperCase() === form.refMateriel.toUpperCase());
    if (existing.length + multiLiquides.length >= 4) {
      return;
    }

    const used = [...existing.map(c => c.couleur), ...multiLiquides.map(c => c.couleur)];
    const nextCol = getNextAvailableColor(used);

    setMultiLiquides(prev => [
      ...prev,
      {
        REF_composant: `LIQ-${nextCol.prefix}-${Math.floor(100 + Math.random() * 900)}`,
        nom: `Liquide d'écriture ${nextCol.label}`,
        couleur: nextCol.id,
        utilisation: '0%',
        description: '',
      }
    ]);
  };

  // Supprimer un liquide du formulaire multiple
  const handleRemoveMultiLiquide = (index: number) => {
    setMultiLiquides(prev => prev.filter((_, i) => i !== index));
  };

  // Mettre à jour un liquide du formulaire multiple
  const handleUpdateMultiLiquide = (index: number, updates: Partial<FormLiquideItem>) => {
    setMultiLiquides(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  // Ouvrir modal pour éditer un liquide existant
  const handleOpenEditModal = (comp: Composant) => {
    setModalAlert(null);
    setColorConflictWarning(null);
    setEditModalTab('page1_infos');
    setSelectedTargetPrinters([]);
    setEditingComp(comp);
    const currentRef = (comp.refMateriel || comp.materielReference || comp.id_Materiel || '').trim().toUpperCase();
    setForm({
      REF_composant: comp.REF_composant,
      nom: comp.nom,
      couleur: (comp.couleur as any) || 'Noir',
      refMateriel: currentRef,
      utilisation: comp.utilisation,
      description: comp.description || '',
    });
    setMultiLiquides([]);
    setIsModalOpen(true);
  };

  // Sélection sécurisée de la couleur en mode édition (Contrôle strict Page 1)
  const handleSelectColorInEdit = (colorId: CouleurImprimante) => {
    const conflict = getConflictingCompForColor(colorId);
    if (conflict) {
      setColorConflictWarning(
        `Modification impossible : l'imprimante associée (${selectedPrinterInfo?.ref || form.refMateriel}) possède déjà un liquide d'écriture ${colorId} (Réf: ${conflict.REF_composant} - "${conflict.nom}"). Chaque imprimante ne peut comporter qu'un seul liquide par couleur.`
      );
      return;
    }
    setColorConflictWarning(null);
    setForm(prev => ({ ...prev, couleur: colorId }));
  };

  // Assigner ce liquide à une ou plusieurs imprimantes sélectionnées (Page 2)
  const handleAssignToSelectedPrinters = async () => {
    if (selectedTargetPrinters.length === 0) {
      setModalAlert({
        type: 'warning',
        message: "Veuillez cocher au moins une imprimante éligible pour effectuer l'assignation.",
      });
      return;
    }

    setAssigningLoading(true);
    setModalAlert(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const targetRef of selectedTargetPrinters) {
      const printer = imprimantesDisponibles.find(p => p.ref === targetRef);
      if (!printer) continue;

      // Vérifier si cette imprimante a déjà un liquide à 0% pour cette même couleur
      const existingSameColor = printer.existingLiquides.find(
        c => (c.couleur || '').toLowerCase() === (form.couleur || 'Noir').toLowerCase()
      );

      if (existingSameColor && existingSameColor.utilisation === '0%') {
        // Mettre à jour ce liquide existant à 0%
        const res = await itParkService.saveComposant({
          id: existingSameColor.id,
          REF_composant: existingSameColor.REF_composant,
          nom: form.nom,
          couleur: form.couleur,
          refMateriel: targetRef,
          utilisation: form.utilisation,
          description: form.description,
        });
        if (res.success) {
          successCount++;
        } else {
          errors.push(`${targetRef}: ${res.message || 'Erreur mise à jour'}`);
        }
      } else {
        // Créer une nouvelle affectation de liquide pour cette imprimante cible
        const colPrefix = COULEURS_IMPRIMANTE.find(c => c.id === form.couleur)?.prefix || 'LIQ';
        const candidateRef = `${form.REF_composant}-${targetRef}`;
        const finalRef = composants.some(c => c.REF_composant === candidateRef)
          ? `LIQ-${colPrefix}-${targetRef}-${Math.floor(100 + Math.random() * 900)}`
          : candidateRef;

        const res = await itParkService.saveComposant({
          REF_composant: finalRef,
          nom: form.nom,
          couleur: form.couleur,
          refMateriel: targetRef,
          utilisation: form.utilisation,
          description: form.description,
        });

        if (res.success) {
          successCount++;
        } else {
          errors.push(`${targetRef}: ${res.message || 'Erreur assignation'}`);
        }
      }
    }

    setAssigningLoading(false);

    if (successCount > 0) {
      setModalAlert({
        type: 'success',
        message: `Liquide d'écriture "${form.nom}" (${form.couleur}) assigné avec succès à ${successCount} imprimante(s) !`,
      });
      setSelectedTargetPrinters([]);
      onRefresh();
    } else if (errors.length > 0) {
      setModalAlert({
        type: 'error',
        message: `Échec de l'assignation : ${errors.join(', ')}`,
      });
    }
  };

  // Transférer l'imprimante principale vers une autre imprimante
  const handleTransferPrimaryPrinter = (targetRef: string) => {
    setForm(prev => ({ ...prev, refMateriel: targetRef }));
    setModalAlert({
      type: 'info',
      message: `Imprimante principale réaffectée à ${targetRef}. Cliquez sur "Mettre à jour" pour valider.`,
    });
  };

  // Sauvegarde (Création multiple ou Modification unique)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalAlert(null);

    const cleanRefUpper = form.refMateriel.trim().toUpperCase();
    if (!cleanRefUpper) {
      setModalAlert({
        type: 'error',
        message: 'Veuillez sélectionner une imprimante compatible.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingComp) {
        // Vérification de sécurité couleur : pas de doublon sur la même imprimante
        const conflict = getConflictingCompForColor(form.couleur);
        if (conflict) {
          setModalAlert({
            type: 'error',
            message: `Impossible d'enregistrer : l'imprimante ${cleanRefUpper} possède déjà un liquide d'écriture ${form.couleur} (Réf: ${conflict.REF_composant} - "${conflict.nom}"). Chaque imprimante ne peut comporter qu'un seul liquide par couleur.`,
          });
          setIsSaving(false);
          return;
        }

        // Modification d'un seul liquide
        if (!form.REF_composant.trim()) {
          setModalAlert({
            type: 'error',
            message: "La référence du liquide d'écriture est obligatoire.",
          });
          setIsSaving(false);
          return;
        }

        if (!form.nom.trim()) {
          setModalAlert({
            type: 'error',
            message: "Le nom / la désignation du liquide d'écriture est obligatoire.",
          });
          setIsSaving(false);
          return;
        }

        const payload: Partial<Composant> = {
          id: editingComp.id,
          REF_composant: form.REF_composant.trim().toUpperCase(),
          nom: form.nom.trim(),
          couleur: form.couleur || 'Noir',
          refMateriel: cleanRefUpper,
          id_Materiel: cleanRefUpper,
          utilisation: form.utilisation,
          description: form.description.trim(),
        };

        const result = await itParkService.saveComposant(payload);
        if (!result.success) {
          setModalAlert({
            type: 'error',
            message: result.message || "Erreur lors de l'enregistrement du liquide d'écriture.",
          });
          return;
        }

        setIsModalOpen(false);
        setSectionAlert({
          type: 'success',
          message: `Liquide d'écriture "${form.nom}" (Réf: ${form.REF_composant}) mis à jour avec succès.`,
        });
      } else {
        // Création de 1 ou plusieurs liquides pour l'imprimante
        const existing = composants.filter(c => (c.refMateriel || c.id_Materiel || '').toUpperCase() === cleanRefUpper);
        if (existing.length >= 4) {
          setModalAlert({
            type: 'error',
            message: "Cette imprimante a déjà atteint le maximum de 4 liquides. Impossible d'ajouter de nouveaux liquides.",
          });
          setIsSaving(false);
          return;
        }

        if (multiLiquides.length === 0) {
          setModalAlert({
            type: 'error',
            message: "Veuillez ajouter au moins un liquide d'écriture.",
          });
          setIsSaving(false);
          return;
        }

        if (existing.length + multiLiquides.length > 4) {
          setModalAlert({
            type: 'error',
            message: `Capacité dépassée : cette imprimante a déjà ${existing.length} liquide(s). Vous ne pouvez en ajouter que ${4 - existing.length} au maximum.`,
          });
          setIsSaving(false);
          return;
        }

        // Vérification de chaque liquide
        for (let i = 0; i < multiLiquides.length; i++) {
          const item = multiLiquides[i];
          if (!item.REF_composant.trim()) {
            setModalAlert({
              type: 'error',
              message: `La référence du liquide #${i + 1} est obligatoire.`,
            });
            setIsSaving(false);
            return;
          }
          if (!item.nom.trim()) {
            setModalAlert({
              type: 'error',
              message: `Le nom du liquide #${i + 1} est obligatoire.`,
            });
            setIsSaving(false);
            return;
          }
        }

        // Sauvegarder chaque liquide
        for (const item of multiLiquides) {
          const res = await itParkService.saveComposant({
            REF_composant: item.REF_composant.trim().toUpperCase(),
            nom: item.nom.trim(),
            couleur: item.couleur || 'Noir',
            refMateriel: cleanRefUpper,
            id_Materiel: cleanRefUpper,
            utilisation: item.utilisation,
            description: item.description?.trim() || '',
          });

          if (!res.success) {
            setModalAlert({
              type: 'error',
              message: res.message || `Erreur lors de l'enregistrement du liquide ${item.REF_composant}.`,
            });
            return;
          }
        }

        setIsModalOpen(false);
        setSectionAlert({
          type: 'success',
          message: `${multiLiquides.length} liquide(s) d'écriture associé(s) à l'imprimante ${cleanRefUpper} avec succès.`,
        });
      }

      onRefresh();
    } catch (err: any) {
      setModalAlert({
        type: 'error',
        message: err.message || 'Erreur inattendue lors de la sauvegarde.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Suppression
  const handleDelete = async () => {
    if (!compToDelete) return;
    try {
      const result = await itParkService.deleteComposant(compToDelete.id);
      if (!result.success) {
        setSectionAlert({
          type: 'error',
          message: result.message || "Impossible de supprimer ce liquide d'écriture.",
        });
      } else {
        setSectionAlert({
          type: 'success',
          message: `Liquide d'écriture "${compToDelete.nom}" supprimé avec succès.`,
        });
        onRefresh();
      }
    } catch (err: any) {
      setSectionAlert({
        type: 'error',
        message: err.message || 'Erreur inattendue lors de la suppression.',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setCompToDelete(null);
    }
  };

  // Filtrage des liquides d'écriture
  const filteredComposants = composants.filter((c) => {
    const cRefUpper = (c.refMateriel || c.materielReference || c.id_Materiel || '').trim().toUpperCase();

    // Recherche textuelle
    const matchesSearch =
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.REF_composant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cRefUpper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.materielDesignation && c.materielDesignation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtre Référence Matériel
    let matchesMateriel = true;
    if (selectedMaterielFilter !== 'all') {
      matchesMateriel = cRefUpper === selectedMaterielFilter.toUpperCase() || c.id_Materiel === selectedMaterielFilter;
    }

    // Filtre Stock
    let matchesStock = true;
    if (selectedStockFilter === 'en_stock') {
      matchesStock = c.utilisation === '0%';
    } else if (selectedStockFilter === 'utilise') {
      matchesStock = c.utilisation !== '0%';
    }

    return matchesSearch && matchesMateriel && matchesStock;
  });

  // Statistiques rapides
  const totalComposants = composants.length;
  const enStockCount = composants.filter((c) => c.utilisation === '0%').length;
  const enUtilisationCount = composants.filter((c) => ['25%', '50%', '75%'].includes(c.utilisation)).length;
  const epuisesCount = composants.filter((c) => c.utilisation === '100%').length;

  return (
    <div className="space-y-6" id="liquides-ecriture-section">
      {sectionAlert && (
        <FormAlert
          type={sectionAlert.type}
          message={sectionAlert.message}
          onClose={() => setSectionAlert(null)}
        />
      )}

      {/* Règle et Information Métier */}
      <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-sm text-blue-950">
            Liaison par Référence Interne de Matériel (Modèle Partagé)
          </p>
          <p className="mt-1">
            Les liquides d'écriture sont reliés à la <strong>référence interne</strong> du matériel (enregistrée en majuscules). Deux imprimantes (ou plus) du même modèle possèdent la même référence interne et utilisent ainsi le même liquide d'écriture, tout en conservant leur numéro de série propre et unique pour distinguer chaque machine.
          </p>
        </div>
      </div>

      {/* KPI Cards Liquides d'écriture & Règle Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Total Liquides d'écriture
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {totalComposants}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Inventoriés dans le parc
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                En Stock (Disponible)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                0%
              </span>
            </div>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {enStockCount}
            </span>
            <span className="text-xs text-emerald-600 mt-0.5 block">
              ✅ Appartient au stockage
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between bg-amber-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                En Utilisation
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                25% - 75%
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">
              {enUtilisationCount}
            </span>
            <span className="text-xs text-amber-600 mt-0.5 block">
              ⚠️ Sorti du stock (Stock -1)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs flex items-center justify-between bg-rose-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                Épuisés / Consommés
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                100%
              </span>
            </div>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">
              {epuisesCount}
            </span>
            <span className="text-xs text-rose-600 mt-0.5 block">
              ❌ Sorti du stock (Stock -1)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-liquides-input"
              placeholder="Rechercher par REF, nom, référence matériel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filtre Référence Modèle Matériel */}
          <select
            id="filter-materiel-ref"
            value={selectedMaterielFilter}
            onChange={(e) => setSelectedMaterielFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Toutes imprimantes / matériels</option>
            {modelesRefs.map((mod) => (
              <option key={mod.ref} value={mod.ref}>
                {mod.ref} — {mod.designation} ({mod.count} appareil{mod.count > 1 ? 's' : ''})
              </option>
            ))}
          </select>

          {/* Filtre Disponibilité Stock */}
          <select
            id="filter-stock-statut"
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous états de stock</option>
            <option value="en_stock">📦 En Stock disponible (0%)</option>
            <option value="utilise">📉 Sortis du stock (&gt; 0%)</option>
          </select>
        </div>

        {/* Bouton Ajouter Liquide d'écriture */}
        {isDSIAdmin && (
          <button
            id="btn-nouveau-liquide"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium text-sm rounded-lg hover:from-red-700 hover:to-red-800 shadow-xs shadow-red-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nouveau Liquide d'écriture
          </button>
        )}
      </div>

      {/* Tableau des Liquides d'écriture */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="table-liquides-ecriture">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">RÉF Liquide</th>
                <th className="py-3 px-4">Désignation</th>
                <th className="py-3 px-4">Couleur</th>
                <th className="py-3 px-4">Réf. Interne Matériel Lié</th>
                <th className="py-3 px-4">Imprimantes / Équipements Associés</th>
                <th className="py-3 px-4">Capacité</th>
                <th className="py-3 px-4">Taux d'Utilisation</th>
                <th className="py-3 px-4">Statut Stock</th>
                {isDSIAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredComposants.length === 0 ? (
                <tr>
                  <td colSpan={isDSIAdmin ? 9 : 8} className="py-12 text-center text-gray-500">
                    <Droplets className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-700">Aucun liquide d'écriture trouvé</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchTerm || selectedMaterielFilter !== 'all' || selectedStockFilter !== 'all'
                        ? 'Essayez de réinitialiser vos critères de recherche ou filtres.'
                        : "Enregistrez un nouveau liquide d'écriture lié à la référence interne de vos imprimantes."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredComposants.map((comp) => {
                  const isEnStock = comp.utilisation === '0%';
                  const refUpper = (comp.refMateriel || comp.materielReference || comp.id_Materiel || '').trim().toUpperCase();
                  
                  // Trouver tous les matériels qui partagent cette référence interne
                  const associatedMats = materiels.filter((m) => {
                    const mRef = (m.reference || '').trim().toUpperCase();
                    return mRef === refUpper || m.id === comp.id_Materiel;
                  });

                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* REF_composant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                            {comp.REF_composant}
                          </span>
                        </div>
                      </td>

                      {/* Désignation */}
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{comp.nom}</span>
                          {comp.description && (
                            <span className="text-xs text-gray-400 truncate max-w-xs">{comp.description}</span>
                          )}
                        </div>
                      </td>

                      {/* Couleur Principale d'Imprimante */}
                      <td className="py-3 px-4">
                        {comp.couleur ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                            comp.couleur === 'Cyan' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                            comp.couleur === 'Magenta' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                            comp.couleur === 'Jaune' ? 'bg-amber-50 text-amber-900 border border-amber-300' :
                            'bg-gray-100 text-gray-900 border border-gray-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              comp.couleur === 'Cyan' ? 'bg-cyan-500' :
                              comp.couleur === 'Magenta' ? 'bg-pink-600' :
                              comp.couleur === 'Jaune' ? 'bg-amber-400' : 'bg-gray-900'
                            }`} />
                            <span>{comp.couleur}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Référence Interne Matériel Lié */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-mono text-xs font-bold uppercase">
                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                            {refUpper || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Imprimantes / Équipements Associés */}
                      <td className="py-3 px-4 text-gray-700">
                        {associatedMats.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                associatedMats.length > 1
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                <Printer className="w-3 h-3 text-blue-600" />
                                <span>
                                  {associatedMats.length} {associatedMats.length > 1 ? 'imprimantes compatibles' : 'imprimante compatible'}
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono truncate max-w-xs" title={associatedMats.map(m => `${m.designation} (S/N: ${m.codeSerie})`).join(' | ')}>
                              {associatedMats.map(m => m.codeSerie).join(', ')}
                            </div>
                          </div>
                        ) : comp.materielDesignation ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-900">{comp.materielDesignation}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            En attente d'imprimante avec la réf {refUpper}
                          </span>
                        )}
                      </td>

                      {/* Capacité (si renseignée) */}
                      <td className="py-3 px-4">
                        {comp.capaciteValeur ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200/80">
                            <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                            <span>
                              {comp.capaciteValeur} {comp.capaciteUnite || 'cl'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Utilisation (0%, 25%, 50%, 75%, 100%) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{comp.utilisation}</span>
                            <span className="text-[10px] text-gray-500">
                              {comp.utilisation === '0%'
                                ? 'Neuf'
                                : comp.utilisation === '100%'
                                ? 'Épuisé'
                                : 'Partiel'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                comp.utilisation === '0%'
                                  ? 'bg-emerald-500 w-0'
                                  : comp.utilisation === '25%'
                                  ? 'bg-blue-500 w-1/4'
                                  : comp.utilisation === '50%'
                                  ? 'bg-amber-500 w-1/2'
                                  : comp.utilisation === '75%'
                                  ? 'bg-orange-500 w-3/4'
                                  : 'bg-rose-500 w-full'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Statut Stock (Règle Métier : 0% = En Stock, sinon Stock - 1) */}
                      <td className="py-3 px-4">
                        {isEnStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            En stock (0%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Stock - 1 ({comp.utilisation})
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {isDSIAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(comp)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Modifier ce liquide d'écriture"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCompToDelete(comp);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce liquide d'écriture"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION / MODIFICATION LIQUIDE D'ÉCRITURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingComp ? "Modifier le Liquide d'écriture" : "Nouveau(x) Liquide(s) d'écriture"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Lié à l'imprimante sélectionnée (maximum 4 liquides par imprimante : Noir, Cyan, Magenta, Jaune).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalAlert && (
              <div className="mt-4">
                <FormAlert
                  type={modalAlert.type}
                  message={modalAlert.message}
                  onClose={() => setModalAlert(null)}
                />
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-5">
              {/* Choix de l'Imprimante Liée */}
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-purple-700" />
                    <span>Imprimante Associée (Référence Modèle)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    {imprimantesDisponibles.length} imprimante{imprimantesDisponibles.length > 1 ? 's' : ''} répertoriée{imprimantesDisponibles.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <select
                    disabled={!!editingComp}
                    value={form.refMateriel}
                    onChange={(e) => handleSelectPrinterChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-600 cursor-pointer"
                  >
                    <option value="">-- Sélectionner une imprimante --</option>
                    {imprimantesDisponibles.map((mod) => (
                      <option key={mod.ref} value={mod.ref}>
                        {mod.ref} — {mod.designation} [{mod.statutLiquide}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message d'information sur la limite des 4 liquides */}
                {selectedPrinterInfo && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-purple-200/60">
                    <span className="text-purple-800 font-medium">
                      État actuel : <strong>{selectedPrinterInfo.liquidesCount}/4 liquides</strong> assignés
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      selectedPrinterInfo.isFull
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedPrinterInfo.isFull ? 'Capacité maximale atteinte' : `${4 - selectedPrinterInfo.liquidesCount} place(s) disponible(s)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Cas 1 : Modification d'un liquide existant (Formulaire à 2 pages : Page 1 Infos & Contrôle couleur / Page 2 Imprimantes & Assignations) */}
              {editingComp ? (
                <div className="space-y-4">
                  {/* Onglets de navigation Page 1 & Page 2 */}
                  <div className="flex border-b border-gray-200 bg-gray-50/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditModalTab('page1_infos')}
                      className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        editModalTab === 'page1_infos'
                          ? 'bg-white text-red-700 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                        editModalTab === 'page1_infos' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        1
                      </span>
                      <span>Page 1 : Informations du liquide</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditModalTab('page2_assignations')}
                      className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        editModalTab === 'page2_assignations'
                          ? 'bg-white text-purple-700 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                        editModalTab === 'page2_assignations' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        2
                      </span>
                      <span>Page 2 : Imprimantes & Assignations</span>
                      {eligiblePrintersForAssignation.length > 0 && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {eligiblePrintersForAssignation.length} dispo
                        </span>
                      )}
                    </button>
                  </div>

                  {/* ================= PAGE 1 : INFORMATIONS & CONTRÔLE COULEUR ================= */}
                  {editModalTab === 'page1_infos' && (
                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                      {/* Alerte si conflit de couleur détecté */}
                      {colorConflictWarning && (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs shadow-xs animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-bold">Modification de couleur interdite :</p>
                            <p className="text-[11px] text-rose-800 mt-0.5">{colorConflictWarning}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setColorConflictWarning(null)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Choix Couleur Principale avec Contrôle d'unicité par imprimante */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Couleur Principale de l'Imprimante <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-gray-500">
                            (Un seul liquide par couleur par imprimante)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {COULEURS_IMPRIMANTE.map((col) => {
                            const conflict = getConflictingCompForColor(col.id);
                            const isSelected = form.couleur === col.id;
                            const isBlocked = !!conflict && !isSelected;

                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => handleSelectColorInEdit(col.id)}
                                className={`relative flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? `${col.badgeBg} ${col.badgeText} border-gray-900 shadow-sm ring-2 ring-gray-900/15`
                                    : isBlocked
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 hover:border-rose-300 hover:bg-rose-50/50'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full shrink-0 border ${
                                      isBlocked ? 'opacity-40 border-gray-300' : 'border-black/20'
                                    }`}
                                    style={{ backgroundColor: col.colorHex }}
                                  />
                                  <span>{col.label}</span>
                                  {isBlocked && <Lock className="w-3 h-3 text-rose-500 ml-0.5" />}
                                </div>

                                {isBlocked && (
                                  <span className="text-[9px] text-rose-700 mt-1 font-medium bg-rose-100/70 px-1 py-0.5 rounded leading-none text-center">
                                    Déjà pris ({conflict.REF_composant})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* REF & Nom */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                            RÉF Liquide (Unique) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.REF_composant}
                            onChange={(e) => setForm({ ...form, REF_composant: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                            Nom / Désignation <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.nom}
                            onChange={(e) => setForm({ ...form, nom: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>

                      {/* Taux d'Utilisation */}
                      <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                            Taux d'Utilisation <span className="text-red-500">*</span>
                          </label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            form.utilisation === '0%'
                              ? 'bg-emerald-100 text-emerald-800'
                              : form.utilisation === '100%'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {form.utilisation === '0%' ? '✅ En Stock (0%)' : `Sorti du stock (${form.utilisation})`}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 pt-1">
                          {(['0%', '25%', '50%', '75%', '100%'] as TauxUtilisationComposant[]).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setForm({ ...form, utilisation: val })}
                              className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                form.utilisation === val
                                  ? val === '0%'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : val === '100%'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                          Description / Remarques (Optionnel)
                        </label>
                        <textarea
                          rows={2}
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      {/* Bouton pour passer à la Page 2 */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setEditModalTab('page2_assignations')}
                          className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>Passer à la Page 2 : Imprimantes & Assignations</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================= PAGE 2 : IMPRIMANTES ASSIGNÉES & NOUVELLES ASSIGNATIONS ================= */}
                  {editModalTab === 'page2_assignations' && (
                    <div className="space-y-4">
                      {/* Section 1 : Imprimante(s) actuellement assignée(s) & Pourcentage actuel */}
                      <div className="p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Printer className="w-4 h-4 text-purple-700" />
                            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                              Imprimante Associée & Pourcentage Actuel
                            </h4>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-200/70 text-purple-800">
                            Assignée
                          </span>
                        </div>

                        {/* Carte détaillée imprimante actuelle */}
                        <div className="bg-white p-3.5 rounded-lg border border-purple-200 space-y-3 text-xs">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {selectedPrinterInfo?.ref || form.refMateriel}
                                </span>
                                <span className="text-gray-500">
                                  — {selectedPrinterInfo?.designation || 'Imprimante'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {selectedPrinterInfo?.machines.length || 1} machine(s) physique(s) liée(s) à ce modèle
                              </p>
                            </div>
                            <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              Réf : {form.refMateriel}
                            </span>
                          </div>

                          {/* Jauge du Pourcentage Actuel du Liquide */}
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full border border-black/20"
                                  style={{
                                    backgroundColor:
                                      COULEURS_IMPRIMANTE.find(c => c.id === form.couleur)?.colorHex || '#111827'
                                  }}
                                />
                                Niveau d'encre ({form.couleur || 'Noir'}) :
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{form.utilisation} utilisé</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-bold text-purple-700">
                                  {100 - (parseInt(form.utilisation.replace('%', ''), 10) || 0)}% restant
                                </span>
                              </div>
                            </div>

                            {/* Barre de progression */}
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden p-0.5">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(5, 100 - (parseInt(form.utilisation.replace('%', ''), 10) || 0))}%`,
                                  backgroundColor:
                                    form.couleur === 'Cyan'
                                      ? '#06b6d4'
                                      : form.couleur === 'Magenta'
                                      ? '#db2777'
                                      : form.couleur === 'Jaune'
                                      ? '#eab308'
                                      : '#1f2937'
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                              <span>0% (Plein / En stock)</span>
                              <span>100% (Épuisé)</span>
                            </div>
                          </div>

                          {/* Machines physiques réelles */}
                          {selectedPrinterInfo && selectedPrinterInfo.machines.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                                Machines physiques en service :
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {selectedPrinterInfo.machines.map((m) => (
                                  <div key={m.id} className="p-2 bg-gray-50 rounded border border-gray-200 text-[11px]">
                                    <div className="font-mono font-bold text-gray-800">{m.codeSerie || m.reference || m.id}</div>
                                    <div className="text-gray-500 text-[10px]">
                                      {m.statut || 'En service'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2 : Possibilité d'assignation à un ou plusieurs imprimantes vides ou à 0% */}
                      <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-700" />
                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                              Assigner à d'autres imprimantes (Vides ou liquide 0%)
                            </h4>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {eligiblePrintersForAssignation.length} imprimante(s) éligible(s)
                          </span>
                        </div>

                        <p className="text-xs text-emerald-900 leading-relaxed">
                          Sélectionnez une ou plusieurs imprimantes disponibles du parc pour leur assigner également ce liquide d'écriture ({form.couleur}) :
                        </p>

                        {/* Liste des Imprimantes Éligibles avec sélection multiple */}
                        {eligiblePrintersForAssignation.length === 0 ? (
                          <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs text-gray-500 text-center">
                            Aucune autre imprimante éligible n'est actuellement disponible (toutes les imprimantes ont atteint 4 liquides ou possèdent déjà cette couleur active).
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Boutons Sélectionner Tout / Désélectionner */}
                            <div className="flex items-center justify-between text-xs pb-1">
                              <span className="text-gray-600 font-medium">
                                {selectedTargetPrinters.length} sélectionnée(s) sur {eligiblePrintersForAssignation.length}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTargetPrinters(eligiblePrintersForAssignation.map(p => p.ref))}
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                                >
                                  Tout sélectionner
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTargetPrinters([])}
                                  className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                  Effacer
                                </button>
                              </div>
                            </div>

                            {/* Liste défilable des imprimantes candidates */}
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {eligiblePrintersForAssignation.map((printer) => {
                                const isChecked = selectedTargetPrinters.includes(printer.ref);
                                const isZeroPercent = printer.existingLiquides.some(c => c.utilisation === '0%');
                                const isCompletelyEmpty = printer.liquidesCount === 0;

                                return (
                                  <div
                                    key={printer.ref}
                                    onClick={() => {
                                      setSelectedTargetPrinters(prev =>
                                        isChecked ? prev.filter(r => r !== printer.ref) : [...prev, printer.ref]
                                      );
                                    }}
                                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 font-semibold'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                        isChecked
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : 'bg-white border-gray-300'
                                      }`}>
                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-gray-900">{printer.ref}</span>
                                          <span className="text-gray-600">— {printer.designation}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                          {printer.machines.length} machine(s) physique(s)
                                        </div>
                                      </div>
                                    </div>

                                    {/* Statut d'éligibilité */}
                                    <div>
                                      {isCompletelyEmpty ? (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          ✨ Imprimante vide (0/4)
                                        </span>
                                      ) : isZeroPercent ? (
                                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          🔄 Liquide à 0% restant
                                        </span>
                                      ) : (
                                        <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                          {4 - printer.liquidesCount} place(s) libre(s)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Bouton d'action pour assigner aux imprimantes sélectionnées */}
                            <div className="pt-2 flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                disabled={selectedTargetPrinters.length === 0 || assigningLoading}
                                onClick={handleAssignToSelectedPrinters}
                                className="flex-1 py-2 px-3 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                              >
                                {assigningLoading ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Assignation en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Assigner à la sélection ({selectedTargetPrinters.length} imprimante{selectedTargetPrinters.length > 1 ? 's' : ''})</span>
                                  </>
                                )}
                              </button>

                              {selectedTargetPrinters.length === 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleTransferPrimaryPrinter(selectedTargetPrinters[0])}
                                  className="py-2 px-3 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                  title="Définir cette imprimante comme imprimante principale associée"
                                >
                                  Définir comme principale
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bouton de retour à la Page 1 */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setEditModalTab('page1_infos')}
                          className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Revenir à la Page 1 (Modifier les informations & couleur)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedPrinterInfo?.isFull ? (
                /* Cas 2 : Imprimante PLEINE (4 liquides atteints) - Message de complétion au lieu du bouton d'ajout */
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 text-amber-950 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Imprimante pleine (maximum de 4 liquides atteint)</span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium">
                    Cette imprimante a atteint le nombre maximum de 4 liquides d'écriture. Veuillez compléter le(s) liquide(s) de cette imprimante :
                  </p>
                  <div className="space-y-2 pt-1">
                    {selectedPrinterInfo.existingLiquides.map((liq, idx) => {
                      const valNum = parseInt(liq.utilisation.replace('%', ''), 10) || 0;
                      const restant = 100 - valNum;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full shrink-0 border border-black/10 ${
                              liq.couleur === 'Cyan' ? 'bg-cyan-500' :
                              liq.couleur === 'Magenta' ? 'bg-pink-600' :
                              liq.couleur === 'Jaune' ? 'bg-amber-400' : 'bg-gray-900'
                            }`} />
                            <span className="font-semibold text-gray-900">{liq.nom}</span>
                            {liq.couleur && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                                {liq.couleur}
                              </span>
                            )}
                            <span className="text-gray-400 font-mono text-[11px]">({liq.REF_composant})</span>
                          </div>
                          <span className="font-bold text-amber-900">
                            {restant > 0 ? (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                il reste <strong>{restant}%</strong> à utiliser
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                                Épuisé (0% restant)
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg">
                    💡 Pour ajouter un nouveau liquide, libérez un emplacement en complétant ou supprimant l'un des liquides actuels.
                  </div>
                </div>
              ) : (
                /* Cas 3 : Ajout multiple de liquides (avec couleur et ajout/suppression, jusqu'à 4) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Liquides à ajouter ({multiLiquides.length} liquide{multiLiquides.length > 1 ? 's' : ''})
                    </span>
                    {selectedPrinterInfo && (
                      <span className="text-xs text-purple-700 font-medium">
                        Total après ajout : <strong>{(selectedPrinterInfo.liquidesCount || 0) + multiLiquides.length} / 4</strong>
                      </span>
                    )}
                  </div>

                  {multiLiquides.map((liq, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-3.5 relative"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            Liquide d'écriture #{index + 1}
                          </span>
                        </div>
                        {multiLiquides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiLiquide(index)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 p-1 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer ce liquide</span>
                          </button>
                        )}
                      </div>

                      {/* Choix Couleur Principale */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                          Couleur Principale <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {COULEURS_IMPRIMANTE.map((col) => {
                            const isSelected = liq.couleur === col.id;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => {
                                  handleUpdateMultiLiquide(index, {
                                    couleur: col.id,
                                    nom: `Liquide d'écriture ${col.label}`,
                                    REF_composant: `LIQ-${col.prefix}-${Math.floor(100 + Math.random() * 900)}`,
                                  });
                                }}
                                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? `${col.badgeBg} ${col.badgeText} border-gray-900 shadow-xs ring-2 ring-gray-900/10`
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                                  style={{ backgroundColor: col.colorHex }}
                                />
                                <span>{col.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* REF & Nom */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                            RÉF Liquide <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={liq.REF_composant}
                            onChange={(e) => handleUpdateMultiLiquide(index, { REF_composant: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                            Nom / Désignation <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={liq.nom}
                            onChange={(e) => handleUpdateMultiLiquide(index, { nom: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>

                      {/* Taux d'Utilisation */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                            Taux d'Utilisation <span className="text-red-500">*</span>
                          </label>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            liq.utilisation === '0%'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {liq.utilisation === '0%' ? '✅ En Stock (0%)' : `Sorti du stock (${liq.utilisation})`}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {(['0%', '25%', '50%', '75%', '100%'] as TauxUtilisationComposant[]).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleUpdateMultiLiquide(index, { utilisation: val })}
                              className={`py-1.5 px-1 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                liq.utilisation === val
                                  ? val === '0%'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Bouton d'ajout d'un liquide supplémentaire (si limite 4 non atteinte) */}
                  {(selectedPrinterInfo?.liquidesCount || 0) + multiLiquides.length < 4 ? (
                    <button
                      type="button"
                      onClick={handleAddMultiLiquide}
                      className="w-full py-2.5 px-4 border-2 border-dashed border-red-300 text-red-700 font-semibold text-xs rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un autre liquide (reste {4 - (selectedPrinterInfo?.liquidesCount || 0) - multiLiquides.length} place(s))</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-gray-100 border border-gray-300 text-gray-600 text-xs text-center rounded-xl font-medium">
                      Maximum de 4 liquides atteint pour cette imprimante (il ne reste plus de place disponible).
                    </div>
                  )}
                </div>
              )}

              {/* Boutons d'Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Annuler
                </button>
                {/* Ne pas afficher le bouton de création si imprimante pleine */}
                {(!selectedPrinterInfo?.isFull || editingComp) && (
                  <button
                    type="submit"
                    disabled={isSaving || (!editingComp && multiLiquides.length === 0)}
                    className="px-5 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    {isSaving
                      ? 'Enregistrement...'
                      : editingComp
                      ? 'Mettre à jour'
                      : `Enregistrer (${multiLiquides.length} liquide${multiLiquides.length > 1 ? 's' : ''})`}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      <CustomConfirmModal
        isOpen={deleteConfirmOpen}
        title="Supprimer ce liquide d'écriture ?"
        message={
          compToDelete
            ? `Êtes-vous certain de vouloir supprimer le liquide d'écriture "${compToDelete.nom}" (Réf: ${compToDelete.REF_composant}) ? Cette action est irréversible.`
            : ''
        }
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        type="danger"
        itemsListTitle="Détails du liquide d'écriture à supprimer"
        itemsList={
          compToDelete
            ? [
                { label: 'Référence', sublabel: compToDelete.REF_composant },
                { label: 'Désignation', sublabel: compToDelete.nom },
                { label: 'Réf. Matériel Lié', sublabel: compToDelete.refMateriel || compToDelete.id_Materiel },
                { label: 'Capacité', sublabel: compToDelete.capaciteValeur ? `${compToDelete.capaciteValeur} ${compToDelete.capaciteUnite || 'cl'}` : '—' },
                { label: 'Utilisation', sublabel: compToDelete.utilisation },
              ]
            : []
        }
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCompToDelete(null);
        }}
      />
    </div>
  );
};

export const LiquidesEcritureSection = ComposantsSection;
